// Server-created recording order governs background entries, not completion time.
export function entryTimestamp(entry) {
  const stamp = entry.processingMode === 'server-case-wide-v1' ? entry.effectiveAt : entry.createdAt;
  if (Number.isFinite(stamp?.seconds)) return [stamp.seconds, stamp.nanoseconds || 0];
  const ms = Date.parse(entry.recordedAt || '');
  if (!Number.isFinite(ms)) return [0, 0];
  return [Math.floor(ms / 1000), (ms % 1000) * 1e6];
}
export function compareEntries(a, b, aId = '', bId = '') {
  const at = entryTimestamp(a), bt = entryTimestamp(b);
  return at[0] - bt[0] || at[1] - bt[1]
    || String(a.recordedAt || '').localeCompare(String(b.recordedAt || '')) || aId.localeCompare(bId);
}
