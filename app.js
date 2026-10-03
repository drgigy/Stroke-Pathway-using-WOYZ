const stages = [
  {
    id: "registration",
    label: "Registration",
    description: "Temporary identity, demographics, presentation, first observations and core times.",
    fields: [
      ["patient.name", "Name or explicit unknown"],
      ["patient.uhid", "UHID"],
      ["patient.age", "Age"],
      ["patient.sex", "Sex"],
      ["patient.phone", "Patient phone"],
      ["patient.attendant", "Accompanying person"],
      ["registration.complaint", "Presenting complaint", "textarea", "wide"],
      ["registration.exam", "Examination and provisional diagnosis", "textarea", "wide"],
      ["times.lastSeenNormal", "Last seen normal"],
      ["times.symptomOnset", "Actual symptom onset"],
      ["times.symptomsNoticed", "Symptoms first noticed"],
      ["times.erArrival", "ER arrival"],
      ["times.codeActivation", "Code Stroke activation"],
      ["observations.initial", "BP, pulse, rhythm, SpO2, glucose", "textarea", "wide"],
      ["registration.riskFactors", "Risk factors and details", "textarea", "wide"],
      ["registration.swallow", "Dysphagia screen, result, assessor and time", "textarea", "wide"],
      ["registration.nihss", "NIHSS, item scores, assessor and time", "textarea", "wide"]
    ]
  },
  {
    id: "scan",
    label: "Scan",
    description: "Separate scan arrival, start, first image, finish, review and report events.",
    fields: [
      ["scan.modality", "Modality"],
      ["times.scanArrival", "Scan arrival"],
      ["times.scanStart", "Scan start"],
      ["times.firstImage", "First image acquisition"],
      ["times.scanFinish", "Scan finish"],
      ["times.imagingReview", "Imaging review time"],
      ["scan.radiology", "Radiologist opinion", "textarea", "wide"],
      ["scan.earlyChanges", "Early ischaemic changes", "textarea", "wide"],
      ["scan.angiogram", "CTA/MRA vessel, side and findings", "textarea", "wide"],
      ["scan.aspects", "ASPECTS score and regions"],
      ["scan.collateral", "Collateral score"]
    ]
  },
  {
    id: "decision",
    label: "Decision",
    description: "Consultant assessment, versioned checklist responses, rationale and counselling.",
    fields: [
      ["decision.consultant", "Consultant"],
      ["times.decision", "Decision time"],
      ["decision.selectedTreatment", "Selected treatment"],
      ["decision.rationale", "Rationale and reasons for withholding planned therapy", "textarea", "wide"],
      ["decision.counselling", "Counselling, surrogate, interpreter and consent evidence", "textarea", "wide"]
    ],
    checklist: true
  },
  {
    id: "ivt",
    label: "IVT",
    description: "Actual thrombolytic administration facts, not a dosage calculator.",
    fields: [
      ["ivt.given", "Treatment actually given"],
      ["ivt.drug", "Drug"],
      ["ivt.weight", "Measured/estimated weight and source"],
      ["ivt.prescribedDose", "Prescribed dose and units"],
      ["ivt.administeredDose", "Administered dose and units"],
      ["times.ivtBolus", "Bolus timestamp"],
      ["times.ivtInfusionStart", "Infusion start"],
      ["times.ivtInfusionEnd", "Infusion end"],
      ["ivt.staff", "Prescriber and administering clinician", "textarea", "wide"],
      ["ivt.complications", "Reactions, complications and escalation", "textarea", "wide"],
      ["ivt.notGivenReason", "Reason not given, if relevant", "textarea", "wide"]
    ]
  },
  {
    id: "mt",
    label: "Thrombectomy",
    description: "Combined IVT + MT is supported in one episode.",
    fields: [
      ["mt.target", "Target vessel and side"],
      ["times.cathlabArrival", "Cathlab arrival"],
      ["times.puncture", "Arterial puncture"],
      ["times.firstPass", "First device deployment/pass"],
      ["times.finalReperfusion", "Final reperfusion"],
      ["times.procedureComplete", "Procedure completion"],
      ["mt.operator", "Operator and team"],
      ["mt.passes", "Pass time, device, technique and result", "textarea", "wide"],
      ["mt.tici", "Final TICI"],
      ["mt.complications", "Complications, status and handover", "textarea", "wide"]
    ]
  },
  {
    id: "monitoring",
    label: "Monitoring",
    description: "Append observations. Prior observations are never overwritten.",
    monitoring: true
  },
  {
    id: "reviews",
    label: "24/48h Review",
    description: "Due-window tasks, actual assessment time, complications and rehabilitation review.",
    fields: [
      ["review24.time", "24-hour actual assessment time"],
      ["review24.reviewer", "24-hour reviewer"],
      ["review24.findings", "24-hour neuro changes, imaging and complications", "textarea", "wide"],
      ["review48.time", "48-hour actual assessment time"],
      ["review48.reviewer", "48-hour reviewer"],
      ["review48.findings", "48-hour swallow, rehab, DVT, falls, pressure injury", "textarea", "wide"]
    ]
  },
  {
    id: "discharge",
    label: "Discharge",
    description: "Final diagnosis and treatment-performed summary closes every completed case sheet.",
    fields: [
      ["discharge.status", "Discharge, transfer or death status"],
      ["times.discharge", "Discharge time"],
      ["discharge.destination", "Destination"],
      ["discharge.nihssMrs", "Discharge NIHSS, mRS and functional status"],
      ["discharge.medications", "Reconciled medications and advice", "textarea", "wide"],
      ["final.category", "Final category"],
      ["final.summary", "Final Diagnosis & Treatment Summary", "textarea", "wide"]
    ]
  },
  {
    id: "followup",
    label: "Follow-up",
    description: "Procedure-specific and 90-day outcome follow-up without inventing normal outcomes.",
    fields: [
      ["followup.dueDate", "Due date"],
      ["followup.actualDate", "Actual assessment date"],
      ["followup.method", "Contact method"],
      ["followup.respondent", "Respondent"],
      ["followup.outcome", "Outcome, mRS, vital status and interval events", "textarea", "wide"],
      ["followup.attempts", "Contact attempts and not-reached notes", "textarea", "wide"]
    ]
  },
  {
    id: "quality",
    label: "KPI/Stats",
    description: "Indicator registry and local cohort view. Unresolved rules remain provisional.",
    quality: true
  }
];

const kpis = [
  "First imaging time", "Timely IVT", "Post-IVT sICH", "Initial inpatient neurological assessment",
  "Initial swallow screen", "Timely rehabilitation", "90-day functional outcome", "Medication errors",
  "Seven-day inpatient mortality", "Carotid-procedure stroke/death", "Diagnostic-angiography stroke/death",
  "Hospital-acquired pressure injury", "Hospital-acquired DVT", "Imaging wait", "Thrombolytic stockouts",
  "Falls", "Timely EVT", "Post-EVT sICH", "Speech/swallow reassessment",
  "Intracranial-stenting stroke/death", "Post-EVD ventriculitis", "Final reperfusion grade",
  "Timely MT with reperfusion", "Puncture-to-reperfusion"
];

const checklist = [
  "Intracranial haemorrhage on baseline imaging",
  "Large established infarct or mass effect",
  "Recent major surgery or serious trauma",
  "Known bleeding diathesis or severe coagulopathy",
  "Current anticoagulant use requiring review",
  "Uncontrolled blood pressure requiring treatment",
  "Recent gastrointestinal or urinary tract bleeding",
  "Seizure at onset requiring diagnostic clarification",
  "Pregnancy or recent delivery requiring senior review",
  "Any other clinician-specified caution"
];

const defaultEpisodes = [
  {
    episodeId: "TMP-20261002-001",
    patientId: "P-TEMP-001",
    stage: "registration",
    patient: { name: "Unknown female", uhid: "", age: "68 estimated", sex: "Female", phone: "" },
    registration: { complaint: "Right-sided weakness and slurred speech.", riskFactors: "HTN; AF unknown." },
    times: { erArrival: "2026-10-02 09:42", codeActivation: "2026-10-02 09:49" },
    observations: { initial: "BP 168/92, pulse 94 irregular, SpO2 97%, glucose 128 mg/dL." },
    audit: [
      { time: "2026-10-02 09:49", text: "Temporary episode created for unregistered Code Stroke.", author: "ER nurse" },
      { time: "2026-10-02 09:52", text: "Initial observations recorded.", author: "ER nurse" }
    ],
    monitoring: []
  },
  {
    episodeId: "WOYZ-20261002-014",
    patientId: "P-33142",
    stage: "decision",
    patient: { name: "Ravi Menon", uhid: "UH779214", age: "61", sex: "Male", phone: "Not recorded" },
    times: { erArrival: "2026-10-02 11:04", codeActivation: "2026-10-02 11:08", scanStart: "2026-10-02 11:26", decision: "2026-10-02 11:54" },
    scan: { modality: "NCCT + CTA", radiology: "No haemorrhage in example record. CTA left M1 occlusion." },
    decision: { consultant: "Dr Sen", selectedTreatment: "IVT + MT", rationale: "Synthetic example awaiting checklist review." },
    audit: [
      { time: "2026-10-02 11:08", text: "Code Stroke activated.", author: "Stroke coordinator" },
      { time: "2026-10-02 11:26", text: "Scan started.", author: "Radiology" },
      { time: "2026-10-02 11:54", text: "Treatment decision drafted.", author: "Consultant" }
    ],
    checklistResponses: {},
    monitoring: []
  }
];

const storeKey = "woyz-stroke-local-v1";
let state = loadState();
let activeEpisodeId = state.activeEpisodeId || state.episodes[0].episodeId;
let activeStageId = state.activeStageId || "registration";
let mode = state.mode || "mobile";
let voice = "ready";
let woyzSeconds = 300;
let woyzInterval = null;
let woyzRecording = false;
let woyzTranscriptText = "";
let woyzRecognition = null;
let woyzAudioContext = null;
let woyzAnalyser = null;
let woyzAudioData = null;
let woyzMediaStream = null;
let woyzAnimationFrame = null;

const $ = (selector) => document.querySelector(selector);
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storeKey));
    if (parsed && Array.isArray(parsed.episodes)) return parsed;
  } catch {
    // Ignore corrupt local state and restore seed data.
  }
  return { episodes: structuredClone(defaultEpisodes), mode: "mobile" };
}

function saveState() {
  state.activeEpisodeId = activeEpisodeId;
  state.activeStageId = activeStageId;
  state.mode = mode;
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function getEpisode() {
  return state.episodes.find((episode) => episode.episodeId === activeEpisodeId) || state.episodes[0];
}

function getPathValue(object, path) {
  return path.split(".").reduce((current, part) => current?.[part], object) ?? "";
}

function setPathValue(object, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  let target = object;
  for (const part of parts) {
    target[part] = target[part] || {};
    target = target[part];
  }
  target[last] = value;
}

function addAudit(episode, text, author = mode === "desktop" ? "Desktop reviewer" : "Mobile clinician") {
  episode.audit = episode.audit || [];
  episode.audit.push({
    time: new Date().toLocaleString("sv-SE").slice(0, 16),
    text,
    author
  });
}

function updateMode(nextMode) {
  mode = nextMode;
  document.body.classList.toggle("mobile-mode", mode === "mobile");
  document.body.classList.toggle("desktop-mode", mode === "desktop");
  $("#mobileModeBtn").classList.toggle("active", mode === "mobile");
  $("#desktopModeBtn").classList.toggle("active", mode === "desktop");
  saveState();
}

function render() {
  const episode = getEpisode();
  const stage = stages.find((item) => item.id === activeStageId) || stages[0];
  renderEpisodes();
  renderStageNav();
  renderStage(stage, episode);
  renderSummary(episode);
  renderKpis(episode);
  $("#episodeContext").textContent = `${episode.episodeId} / ${episode.patientId}`;
  $("#episodeTitle").textContent = episode.patient?.name || "Unknown patient";
  updateStagePromptPreview();
  updateMode(mode);
  updateVoiceUi();
}

function renderEpisodes() {
  const search = $("#searchInput").value.toLowerCase();
  const list = $("#episodeList");
  list.innerHTML = "";
  state.episodes
    .filter((episode) => {
      const haystack = `${episode.episodeId} ${episode.patientId} ${episode.patient?.name || ""} ${episode.patient?.uhid || ""}`.toLowerCase();
      return haystack.includes(search);
    })
    .forEach((episode) => {
      const button = document.createElement("button");
      button.className = `episode-card ${episode.episodeId === activeEpisodeId ? "active" : ""}`;
      button.innerHTML = `
        <div class="episode-main">
          <h3>${escapeHtml(episode.patient?.name || "Unknown patient")}</h3>
          <span class="status-pill">${escapeHtml(stageLabel(episode.stage))}</span>
        </div>
        <div class="episode-meta">
          <span>${escapeHtml(episode.episodeId)}</span>
          <span>${escapeHtml(episode.patient?.uhid || "No UHID")}</span>
          <span>${escapeHtml(episode.patient?.age || "Age blank")}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        activeEpisodeId = episode.episodeId;
        activeStageId = episode.stage || "registration";
        saveState();
        render();
      });
      list.appendChild(button);
    });
}

function renderStageNav() {
  const nav = $("#stageNav");
  nav.innerHTML = "";
  stages.forEach((stage) => {
    const button = document.createElement("button");
    button.className = `stage-button ${stage.id === activeStageId ? "active" : ""}`;
    button.textContent = stage.label;
    button.addEventListener("click", () => {
      activeStageId = stage.id;
      getEpisode().stage = stage.id;
      saveState();
      render();
    });
    nav.appendChild(button);
  });
}

function renderStage(stage, episode) {
  const panel = $("#stagePanel");
  panel.innerHTML = "";
  const body = document.createElement("div");
  body.className = "stage-body";
  body.innerHTML = `
    <div class="stage-header">
      <div>
        <h2>${escapeHtml(stage.label)}</h2>
        <p>${escapeHtml(stage.description)}</p>
      </div>
      <span class="status-pill">${mode === "mobile" ? "Voice visible" : "Review typing"}</span>
    </div>
  `;

  if (stage.monitoring) {
    body.appendChild(renderMonitoring(episode));
  } else if (stage.quality) {
    body.appendChild(renderQuality());
  } else {
    const grid = document.createElement("div");
    grid.className = "form-grid";
    stage.fields.forEach(([path, label, type = "text", width = ""]) => {
      grid.appendChild(renderField(episode, path, label, type, width));
    });
    if (stage.checklist) grid.appendChild(renderChecklist(episode));
    if (stage.id === "discharge") grid.appendChild(renderPrintPreview(episode));
    body.appendChild(grid);
  }

  panel.appendChild(body);
}

function renderField(episode, path, label, type, width) {
  const wrapper = document.createElement("label");
  wrapper.className = `field ${width}`;
  const inputHtml = type === "textarea"
    ? `<textarea>${escapeHtml(getPathValue(episode, path))}</textarea>`
    : `<input type="text" value="${escapeAttribute(getPathValue(episode, path))}">`;
  wrapper.innerHTML = `<span>${escapeHtml(label)}</span>${inputHtml}`;
  const input = wrapper.querySelector(type === "textarea" ? "textarea" : "input");
  input.addEventListener("change", () => {
    setPathValue(episode, path, input.value);
    addAudit(episode, `${label} updated.`);
    saveState();
    renderEpisodes();
    renderSummary(episode);
  });
  return wrapper;
}

function renderChecklist(episode) {
  episode.checklistResponses = episode.checklistResponses || {};
  const wrapper = document.createElement("div");
  wrapper.className = "checklist";
  checklist.forEach((text, index) => {
    const key = String(index + 1);
    const value = episode.checklistResponses[key] || "unanswered";
    const row = document.createElement("div");
    row.className = "check-row";
    row.innerHTML = `
      <span class="check-number">${key}</span>
      <div>
        <strong>${escapeHtml(text)}</strong>
        <div class="episode-meta">Supports spoken commands such as "${key} no" and later correction.</div>
      </div>
      <div class="check-options">
        ${["no", "yes", "unknown", "n/a"].map((option) => `<button data-option="${option}" class="${value === option ? "active" : ""}">${option.toUpperCase()}</button>`).join("")}
      </div>
    `;
    row.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        episode.checklistResponses[key] = button.dataset.option;
        addAudit(episode, `Checklist item ${key} marked ${button.dataset.option}.`);
        saveState();
        render();
      });
    });
    wrapper.appendChild(row);
  });
  return wrapper;
}

function renderMonitoring(episode) {
  episode.monitoring = episode.monitoring || [];
  const wrapper = document.createElement("div");
  wrapper.className = "form-grid";
  const fields = [
    ["time", "Observation time"],
    ["bp", "BP"],
    ["pulse", "Pulse/rhythm"],
    ["spo2", "SpO2"],
    ["temp", "Temperature"],
    ["glucose", "Glucose"],
    ["neuro", "Neurological assessment/action"]
  ];
  fields.forEach(([key, label]) => {
    const field = document.createElement("label");
    field.className = key === "neuro" ? "field wide" : "field";
    field.innerHTML = `<span>${label}</span><input id="monitor-${key}" type="text">`;
    wrapper.appendChild(field);
  });
  const add = document.createElement("button");
  add.className = "primary";
  add.textContent = "Append observation";
  add.addEventListener("click", () => {
    const observation = {};
    fields.forEach(([key]) => observation[key] = $(`#monitor-${key}`).value);
    episode.monitoring.push(observation);
    addAudit(episode, "Monitoring observation appended.");
    saveState();
    render();
  });
  wrapper.appendChild(add);

  const table = document.createElement("div");
  table.className = "monitoring-table";
  table.innerHTML = `
    <table>
      <thead><tr><th>Time</th><th>BP</th><th>Pulse</th><th>SpO2</th><th>Temp</th><th>Glucose</th><th>Neuro/action</th></tr></thead>
      <tbody>${episode.monitoring.map((item) => `
        <tr><td>${escapeHtml(item.time)}</td><td>${escapeHtml(item.bp)}</td><td>${escapeHtml(item.pulse)}</td><td>${escapeHtml(item.spo2)}</td><td>${escapeHtml(item.temp)}</td><td>${escapeHtml(item.glucose)}</td><td>${escapeHtml(item.neuro)}</td></tr>
      `).join("") || `<tr><td colspan="7">No repeat observations yet.</td></tr>`}</tbody>
    </table>
  `;
  wrapper.appendChild(table);
  return wrapper;
}

function renderQuality() {
  const wrapper = document.createElement("div");
  wrapper.className = "form-grid";
  const registry = document.createElement("div");
  registry.className = "print-preview";
  registry.innerHTML = `
    <h3>Indicator registry</h3>
    <p>Each KPI needs a versioned definition before calculation: scope, eligibility, exclusions, reference events, required evidence, numerator, denominator, units, observation window, reporting period, target, source citation and reviewer.</p>
    <div class="kpi-list">${kpis.map((name, index) => `
      <div class="kpi-item">
        <strong>${index + 1}</strong>
        <span>${escapeHtml(name)}</span>
        <span class="kpi-state">${isKpiLocallySatisfied(index + 1, getEpisode()) ? "evidence" : "pending"}</span>
      </div>
    `).join("")}</div>
  `;
  wrapper.appendChild(registry);
  return wrapper;
}

function renderPrintPreview(episode) {
  const preview = document.createElement("div");
  preview.className = "print-preview";
  preview.innerHTML = `
    <h3>Print pathway preview</h3>
    <p>Production printing must map to the approved source revision. This local view previews source facts and exposes blanks rather than shrinking, clipping or inventing values.</p>
    <table>
      <tbody>
        ${[
          ["Stroke onset / wake-up / unknown", getPathValue(episode, "times.symptomOnset")],
          ["Last seen normal", getPathValue(episode, "times.lastSeenNormal")],
          ["Stroke noticed", getPathValue(episode, "times.symptomsNoticed")],
          ["ED arrival", getPathValue(episode, "times.erArrival")],
          ["Code activation", getPathValue(episode, "times.codeActivation")],
          ["Scan arrival", getPathValue(episode, "times.scanArrival")],
          ["Scan finished", getPathValue(episode, "times.scanFinish")],
          ["IVT started", getPathValue(episode, "times.ivtBolus")],
          ["Cathlab arrival", getPathValue(episode, "times.cathlabArrival")],
          ["Puncture", getPathValue(episode, "times.puncture")],
          ["Mechanical thrombectomy event", "Definition approval required"]
        ].map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || "Unrecorded")}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
  return preview;
}

function renderSummary(episode) {
  const summary = $("#caseSummary");
  if (!summary) return;
  const events = [...(episode.audit || [])].sort((a, b) => String(a.time).localeCompare(String(b.time)));
  summary.innerHTML = events.map((event) => `
    <article class="event">
      <time>${escapeHtml(event.time || "Pending time")} / ${escapeHtml(event.author || "Unknown author")}</time>
      <p>${escapeHtml(event.text)}</p>
    </article>
  `).join("") || `<p>No events recorded.</p>`;
}

function renderKpis(episode) {
  const list = $("#kpiList");
  if (!list) return;
  let count = 0;
  list.innerHTML = kpis.map((name, index) => {
    const satisfied = isKpiLocallySatisfied(index + 1, episode);
    if (satisfied) count += 1;
    return `
      <div class="kpi-item">
        <strong>${index + 1}</strong>
        <span>${escapeHtml(name)}</span>
        <span class="kpi-state">${satisfied ? "evidence" : "pending"}</span>
      </div>
    `;
  }).join("");
  $("#kpiScore").textContent = `${count}/24`;
}

function isKpiLocallySatisfied(number, episode) {
  const map = {
    1: "times.scanStart",
    2: "times.ivtBolus",
    4: "registration.nihss",
    5: "registration.swallow",
    7: "followup.outcome",
    17: "times.firstPass",
    22: "mt.tici",
    24: "times.finalReperfusion"
  };
  return Boolean(map[number] && getPathValue(episode, map[number]));
}

function updateVoiceUi() {
  const bar = $("#mobileVoiceBar");
  bar.classList.toggle("recording", voice === "recording");
  bar.classList.toggle("paused", voice === "paused");
  $("#voiceState").textContent = voice === "recording" ? "Listening" : voice === "paused" ? "Plugin open" : "Ready";
}

function setupWoyzPlugin() {
  $("#woyzLevel").innerHTML = Array.from({ length: 28 }, () => "<span></span>").join("");
  updateWoyzTimer();
  renderFlatWoyzLevel();
  updateStagePromptPreview();
}

function openWoyzDock() {
  const dock = $("#woyzDock");
  dock.classList.add("visible");
  voice = woyzRecording ? "recording" : "paused";
  if (!woyzInterval) {
    woyzInterval = setInterval(() => {
      if (woyzRecording && woyzSeconds > 0) woyzSeconds -= 1;
      updateWoyzTimer();
    }, 1000);
  }
  updateStagePromptPreview();
  $("#woyzStatus").textContent = SpeechRecognition
    ? "Press play to start browser transcription"
    : "Speech recognition is unavailable in this browser";
  updateVoiceUi();
}

function closeWoyzDock() {
  stopRecognitionOnly();
  $("#woyzDock").classList.remove("visible", "recording");
  woyzRecording = false;
  voice = "ready";
  clearInterval(woyzInterval);
  woyzInterval = null;
  stopAudioLevel();
  renderFlatWoyzLevel();
  updateVoiceUi();
}

function updateWoyzTimer() {
  const minutes = String(Math.floor(woyzSeconds / 60)).padStart(2, "0");
  const seconds = String(woyzSeconds % 60).padStart(2, "0");
  $("#woyzTimer").textContent = `${minutes}:${seconds}`;
}

function renderFlatWoyzLevel() {
  $("#woyzLevel").querySelectorAll("span").forEach((bar) => {
    bar.classList.remove("active", "live");
    bar.style.height = "";
  });
}

async function toggleWoyzRecording() {
  if (!$("#woyzDock").classList.contains("visible")) openWoyzDock();
  if (!woyzRecording) {
    woyzRecording = true;
    $("#woyzDock").classList.add("recording");
    const audioReady = await startAudioLevel();
    if (!audioReady) {
      $("#woyzStatus").textContent = "Microphone unavailable; plugin remains NIL until voice is captured";
    }
  } else {
    woyzRecording = false;
    $("#woyzDock").classList.remove("recording");
    stopAudioLevel();
  }
  voice = woyzRecording ? "recording" : "paused";
  $("#woyzStatus").textContent = woyzRecording ? "Recording in progress..." : "Recording paused";
  $("#woyzDockStartBtn").innerHTML = woyzRecording
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="5" width="4" height="14"/><rect x="13" y="5" width="4" height="14"/></svg>`
    : `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
  if (woyzRecording) startRecognition();
  else stopRecognitionOnly();
  addAudit(getEpisode(), woyzRecording ? "WOYZ plugin recording started/resumed." : "WOYZ plugin recording paused.", "System");
  saveState();
  renderSummary(getEpisode());
  updateVoiceUi();
}

async function startAudioLevel() {
  if (!navigator.mediaDevices?.getUserMedia) {
    renderFlatWoyzLevel();
    return false;
  }
  try {
    if (!woyzMediaStream) {
      woyzMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    if (!woyzAudioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      woyzAudioContext = new AudioContextClass();
      const source = woyzAudioContext.createMediaStreamSource(woyzMediaStream);
      woyzAnalyser = woyzAudioContext.createAnalyser();
      woyzAnalyser.fftSize = 256;
      woyzAnalyser.smoothingTimeConstant = 0.65;
      source.connect(woyzAnalyser);
      woyzAudioData = new Uint8Array(woyzAnalyser.frequencyBinCount);
    }
    if (woyzAudioContext.state === "suspended") await woyzAudioContext.resume();
    drawAudioLevel();
    return true;
  } catch {
    renderFlatWoyzLevel();
    return false;
  }
}

function drawAudioLevel() {
  if (!woyzRecording && !$("#woyzDock").classList.contains("recording")) {
    renderFlatWoyzLevel();
    return;
  }
  if (!woyzAnalyser || !woyzAudioData) {
    renderFlatWoyzLevel();
    return;
  }
  woyzAnalyser.getByteFrequencyData(woyzAudioData);
  const bars = [...$("#woyzLevel").querySelectorAll("span")];
  const bucketSize = Math.max(1, Math.floor(woyzAudioData.length / bars.length));
  bars.forEach((bar, index) => {
    const start = index * bucketSize;
    const bucket = woyzAudioData.slice(start, start + bucketSize);
    const average = bucket.reduce((sum, value) => sum + value, 0) / bucket.length;
    const normalized = average / 255;
    const hasVoice = normalized > 0.035;
    bar.classList.toggle("live", hasVoice);
    bar.classList.toggle("active", hasVoice);
    bar.style.height = hasVoice ? `${Math.max(4, Math.round(4 + normalized * 30))}px` : "4px";
  });
  woyzAnimationFrame = requestAnimationFrame(drawAudioLevel);
}

function stopAudioLevel() {
  if (woyzAnimationFrame) cancelAnimationFrame(woyzAnimationFrame);
  woyzAnimationFrame = null;
  if (woyzMediaStream) {
    woyzMediaStream.getTracks().forEach((track) => track.stop());
  }
  woyzMediaStream = null;
  if (woyzAudioContext) {
    woyzAudioContext.close().catch(() => {});
  }
  woyzAudioContext = null;
  woyzAnalyser = null;
  woyzAudioData = null;
  renderFlatWoyzLevel();
}

function startRecognition() {
  if (!SpeechRecognition) return;
  if (!woyzRecognition) {
    woyzRecognition = new SpeechRecognition();
    woyzRecognition.continuous = true;
    woyzRecognition.interimResults = true;
    woyzRecognition.lang = "en-IN";
    woyzRecognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += text;
        else interimText += text;
      }
      if (finalText) woyzTranscriptText = `${woyzTranscriptText} ${finalText}`.trim();
      $("#woyzTranscript").textContent = [woyzTranscriptText, interimText].filter(Boolean).join("\n");
      $("#woyzOutput").textContent = JSON.stringify(buildStageOutput(activeStageId, [woyzTranscriptText, interimText].filter(Boolean).join(" ")), null, 2);
    };
    woyzRecognition.onerror = (event) => {
      $("#woyzStatus").textContent = `Speech recognition ${event.error}`;
    };
    woyzRecognition.onend = () => {
      if (woyzRecording) {
        try {
          woyzRecognition.start();
        } catch {
          $("#woyzStatus").textContent = "Speech recognition paused by browser";
        }
      }
    };
  }
  try {
    woyzRecognition.start();
  } catch {
    $("#woyzStatus").textContent = "Speech recognition is already active";
  }
}

function stopRecognitionOnly() {
  if (!woyzRecognition) return;
  try {
    woyzRecognition.stop();
  } catch {
    // Browser recognition may already be stopped.
  }
}

function finishWoyzSegment() {
  if (!$("#woyzDock").classList.contains("visible")) return;
  stopRecognitionOnly();
  stopAudioLevel();
  woyzRecording = false;
  voice = "ready";
  $("#woyzDock").classList.remove("recording");
  $("#woyzStatus").textContent = "Voice segment saved for review";
  const episode = getEpisode();
  episode.voiceSegments = episode.voiceSegments || [];
  episode.voiceSegments.push({
    stage: activeStageId,
    time: new Date().toLocaleString("sv-SE").slice(0, 16),
    transcript: woyzTranscriptText || "",
    prompt: buildStagePrompt(activeStageId),
    structuredOutput: buildStageOutput(activeStageId, woyzTranscriptText)
  });
  addAudit(
    episode,
    woyzTranscriptText
      ? `WOYZ transcript saved for ${stageLabel(activeStageId)} review.`
      : `WOYZ voice segment ended for ${stageLabel(activeStageId)} with no transcript text.`,
    "System"
  );
  woyzTranscriptText = "";
  $("#woyzTranscript").textContent = "";
  $("#woyzOutput").textContent = JSON.stringify(buildStageOutput(activeStageId, ""), null, 2);
  saveState();
  renderSummary(episode);
  updateVoiceUi();
}

function updateStagePromptPreview() {
  $("#woyzPrompt").textContent = buildStagePrompt(activeStageId);
  $("#woyzOutput").textContent = JSON.stringify(buildStageOutput(activeStageId, ""), null, 2);
}

function buildStagePrompt(stageId) {
  const stage = stageLabel(stageId);
  const fieldList = fieldsForStage(stageId).map((field) => `- ${field.label}: ${field.path}`).join("\n");
  return [
    `You are the WOYZ Stroke ${stage} extraction assistant.`,
    "Use only the supplied transcript. Do not infer absent clinical facts. Preserve negation, uncertainty, temporality, units, laterality, medication names, event times and speaker attribution.",
    "Return one JSON object only. Every requested field must be present. Use the exact string NIL when the transcript does not clearly support a value. Use UNKNOWN only when the speaker explicitly says it is unknown. Use N/A only when explicitly stated as not applicable and include the reason when spoken.",
    "Do not calculate treatment eligibility, dosage or KPI success. Do not silently mark checklist items normal. Do not fabricate signatures, consent evidence, exact timestamps or delay reasons.",
    `Current pathway portion: ${stage}. Populate only these fields:`,
    fieldList || "- stageNote: free text relevant to this stage",
    "Also return: uncertainItems[], corrections[], reviewRequired, rawTranscript.",
    "If there is no voice or the transcript is empty, return NIL for every clinical field, uncertainItems as [], corrections as [], reviewRequired as true, and rawTranscript as NIL."
  ].join("\n");
}

function fieldsForStage(stageId) {
  const stage = stages.find((item) => item.id === stageId);
  if (!stage?.fields) {
    if (stageId === "monitoring") {
      return [
        { path: "monitoring.time", label: "Observation time" },
        { path: "monitoring.bp", label: "BP" },
        { path: "monitoring.pulse", label: "Pulse/rhythm" },
        { path: "monitoring.spo2", label: "SpO2" },
        { path: "monitoring.temperature", label: "Temperature" },
        { path: "monitoring.glucose", label: "Glucose" },
        { path: "monitoring.neuro", label: "Neurological assessment/action" }
      ];
    }
    return [{ path: `${stageId}.stageNote`, label: "Stage note" }];
  }
  return stage.fields.map(([path, label]) => ({ path, label }));
}

function buildStageOutput(stageId, transcript) {
  const hasVoice = Boolean(String(transcript || "").trim());
  const output = {};
  fieldsForStage(stageId).forEach(({ path }) => {
    output[path] = "NIL";
  });
  output.uncertainItems = [];
  output.corrections = [];
  output.reviewRequired = true;
  output.rawTranscript = hasVoice ? transcript.trim() : "NIL";
  return output;
}

function stageLabel(id) {
  return stages.find((stage) => stage.id === id)?.label || "Registration";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

$("#searchInput").addEventListener("input", renderEpisodes);
$("#mobileModeBtn").addEventListener("click", () => updateMode("mobile"));
$("#desktopModeBtn").addEventListener("click", () => updateMode("desktop"));

$("#newEpisodeBtn").addEventListener("click", () => {
  const suffix = String(state.episodes.length + 1).padStart(3, "0");
  const episode = {
    episodeId: `TMP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${suffix}`,
    patientId: `P-TEMP-${suffix}`,
    stage: "registration",
    patient: { name: "Unknown patient", uhid: "", age: "", sex: "" },
    audit: [{ time: new Date().toLocaleString("sv-SE").slice(0, 16), text: "Temporary episode created.", author: "System" }],
    monitoring: []
  };
  state.episodes.unshift(episode);
  activeEpisodeId = episode.episodeId;
  activeStageId = "registration";
  saveState();
  render();
});

$("#voiceLogoBtn").addEventListener("click", openWoyzDock);

$("#woyzCloseBtn").addEventListener("click", closeWoyzDock);
$("#woyzDockStartBtn").addEventListener("click", toggleWoyzRecording);
$("#woyzExtendBtn").addEventListener("click", () => {
  woyzSeconds += 300;
  updateWoyzTimer();
  $("#woyzStatus").textContent = "Recording extended by 5 minutes";
});
$("#woyzDockStopBtn").addEventListener("click", finishWoyzSegment);

$("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(getEpisode(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${getEpisode().episodeId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
});

$("#printBtn").addEventListener("click", () => window.print());

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

setupWoyzPlugin();
render();
