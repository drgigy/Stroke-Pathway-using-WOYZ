import { doc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { kpiFields, kpiSections, hospitalFields, kpiSource, kpiSchemaVersion } from './kpi-schema.js';
import { identityFields } from './dictation-output.js';
import { protocolFieldSource, protocolFieldVersion } from './protocol-fields.js';
import { normalizeKpiFields } from './kpi-data.js';

let config;

export function configureKpiStore({ auth, db }) {
  if (!auth || !db) throw new Error('kpi-store-configuration-required');
  config = { auth, db };
}

function session() {
  if (!config) throw new Error('kpi-store-not-configured');
  const { auth, db } = config, user = auth.currentUser;
  if (!user?.uid) throw new Error('authentication-required');
  return { auth, db, uid: user.uid, email: user.email || 'Shared workspace' };
}

function checkUser(context) {
  if (context.auth.currentUser?.uid !== context.uid) throw new Error('access-changed');
}

// UI edits are string maps; extraction remains an array-only API. Convert only
// own enumerable entries, then apply the same ID, type and value validation.
function editFields(fields, definitions) {
  if (!Array.isArray(fields)) {
    if (fields === null || typeof fields !== 'object') throw new Error('invalid-kpi-fields');
    fields = Object.entries(fields).map(([id, value]) => ({ id, value }));
  }
  return normalizeKpiFields(fields, definitions, { allowEmpty: true });
}

function sameFields(a, b) {
  return a && typeof a === 'object' && !Array.isArray(a)
    && Object.keys(a).length === Object.keys(b).length
    && Object.entries(b).every(([key, value]) => Object.hasOwn(a, key) && a[key] === value);
}

function operation(context, target, values, sectionId, previous) {
  if (previous) {
    const { id, entry } = previous;
    if (!/^edit_[a-f0-9]{32}$/i.test(id || '') || !entry
      || entry.createdBy !== context.uid || entry.source !== kpiSource || entry.version !== kpiSchemaVersion
      || entry.kind !== 'manual-edit' || entry.text !== 'KPI field correction'
      || entry.sectionId !== sectionId || !entry.createdAt || !Number.isFinite(Date.parse(entry.recordedAt))
      || !sameFields(entry.fields, values)
      || previous.caseId !== target.caseId || previous.month !== target.month) throw new Error('invalid-kpi-retry');
    return Object.freeze({ ...target, id, entry: Object.freeze({ ...entry, fields: Object.freeze({ ...values }) }) });
  }
  return Object.freeze({ ...target,
    id: 'edit_' + crypto.randomUUID().replaceAll('-', ''),
    entry: Object.freeze({ fields: Object.freeze({ ...values }), source: kpiSource, version: kpiSchemaVersion,
      kind: 'manual-edit', text: 'KPI field correction', sectionId, createdBy: context.uid,
      createdAt: serverTimestamp(), recordedAt: new Date().toISOString() })
  });
}

function withOperation(error, pending) {
  if (!(error instanceof Error) || !Object.isExtensible(error)) {
    const wrapped = new Error(error?.message || 'kpi-save-failed', { cause: error });
    wrapped.operation = pending;
    return wrapped;
  }
  error.operation = pending;
  return error;
}

/** Retry with saveKpiEdit(caseId, fields, sectionId, error.operation).
 * A retry returns the existing matching entry without rewriting its timestamp.
 * Each transaction attempt checks the current case state and captured author.
 */
export async function saveKpiEdit(caseId, fields, sectionId, previous) {
  const context = session();
  if (typeof caseId !== 'string' || !caseId || caseId.length > 1500 || caseId.includes('/')
    || caseId === '.' || caseId === '..' || /^kpi-month-/.test(caseId)) throw new Error('invalid-kpi-case-id');
  const section = kpiSections.find(section => section.id === sectionId);
  if (!section?.fields.length) throw new Error('invalid-kpi-section');
  const values = editFields(fields, kpiFields);
  if (!Object.keys(values).length || Object.keys(values).some(id => !section.fields.some(field => field.id === id))) throw new Error('invalid-kpi-section-fields');
  const pending = operation(context, { caseId }, values, sectionId, previous);
  try {
    checkUser(context);
    const ref = doc(context.db, 'workspaces', 'stroke', 'notes', caseId);
    const entry = await runTransaction(context.db, async transaction => {
      checkUser(context);
      const snapshot = await transaction.get(ref);
      checkUser(context);
      if (!snapshot.exists()) throw new Error('kpi-case-unavailable');
      const data = snapshot.data();
      if (data.deleted || data.noteType !== 'code7') throw new Error('kpi-case-unavailable');
      if (Object.hasOwn(data.kpiEntries || {}, pending.id)) {
        const existing = data.kpiEntries[pending.id];
        if (!existing || existing.createdBy !== context.uid || existing.source !== kpiSource
          || existing.version !== kpiSchemaVersion || existing.kind !== pending.entry.kind
          || existing.text !== pending.entry.text || existing.sectionId !== pending.entry.sectionId
          || existing.recordedAt !== pending.entry.recordedAt || !sameFields(existing.fields, values)) throw new Error('kpi-entry-conflict');
        return existing;
      }
      const identity=identityFields(values),identityUpdate=Object.keys(identity).length?{['protocolDictations.page1.'+pending.id]:{kind:'manual-edit',text:pending.entry.text,fields:identity,pageNumber:1,pageTitle:'Stroke Protocol Form',fieldSource:protocolFieldSource,fieldVersion:protocolFieldVersion,recordedAt:pending.entry.recordedAt,createdBy:context.uid,createdAt:pending.entry.createdAt}}:{};
      transaction.update(ref, { ...identityUpdate,[`kpiEntries.${pending.id}`]: pending.entry,
        updatedBy: context.uid, updatedAt: serverTimestamp() });
      return pending.entry;
    });
    return { id: pending.id, entry };
  } catch (error) { throw withOperation(error, pending); }
}

/** Retry with saveKpiMonthly(month, fields, error.operation). No creator data
 * is overwritten when an existing note is updated or a create is retried.
 */
export async function saveKpiMonthly(month, fields, previous) {
  const context = session();
  if (typeof month !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('invalid-kpi-month');
  const values = editFields(fields, hospitalFields);
  if (!Object.keys(values).length) throw new Error('invalid-kpi-fields');
  const pending = operation(context, { month }, values, 'hospitalMonthly', previous);
  try {
    checkUser(context);
    const ref = doc(context.db, 'workspaces', 'stroke', 'notes', `kpi-month-${month}`);
    const entry = await runTransaction(context.db, async transaction => {
      checkUser(context);
      const snapshot = await transaction.get(ref);
      checkUser(context);
      if (snapshot.exists()) {
        const existing = snapshot.data().kpiMonthlyEntries?.[pending.id];
        if (existing) {
          if (existing.createdBy !== context.uid || existing.source !== kpiSource
            || existing.version !== kpiSchemaVersion || existing.kind !== 'manual-edit'
            || existing.text !== pending.entry.text || existing.sectionId !== pending.entry.sectionId
            || existing.recordedAt !== pending.entry.recordedAt || !sameFields(existing.fields, values)) throw new Error('kpi-entry-conflict');
          return existing;
        }
        transaction.update(ref, { [`kpiMonthlyEntries.${pending.id}`]: pending.entry,
          updatedBy: context.uid, updatedAt: serverTimestamp() });
      } else {
        transaction.set(ref, { noteType: 'kpi-monthly', transcription: '', visitDate: month + '-01',
          visitType: 'OP', isDraft: false, createdBy: context.uid, createdByName: context.email,
          createdAt: serverTimestamp(), updatedBy: context.uid, updatedAt: serverTimestamp(),
          kpiMonthlyEntries: { [pending.id]: pending.entry } });
      }
      return pending.entry;
    });
    return { id: pending.id, entry };
  } catch (error) { throw withOperation(error, pending); }
}
