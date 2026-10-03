# WOYZ Stroke Local Prototype

This is a standalone local prototype generated from the supplied design review package and implementation brief.

It is not a clinical system. It does not validate treatment rules, calculate final NABH KPIs, capture microphone audio, authenticate users, generate a production PDF, or connect to an existing deployment.

## Open Locally

Start a local server from this directory:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Implemented Locally

- Temporary and registered episode examples.
- Mobile and desktop modes over the same episode data.
- Mobile WOYZ state controls with visible start, pause, resume and finish states.
- Floating black WOYZ voice dock adapted from the handover package, with equalizer bars, timer, `+5`, stop, and browser-local transcript capture where supported.
- Desktop-only chronological summary, KPI evidence view and print action.
- Structured registration, scan, decision, IVT, thrombectomy, monitoring, review, discharge and follow-up screens.
- Append-only monitoring observations.
- Numbered decision checklist with Yes/No/Unknown/N/A states.
- Local browser persistence via `localStorage`.
- JSON export for the selected episode.

## Deliberately Provisional

- The transplanted voice dock does not import the WOYZ Notes Firebase/Gemini backend, authorization-key storage, or production transcription workflow.
- Clinical contraindication rules.
- Dose logic.
- KPI numerators and denominators.
- Imaging and MT timing endpoints.
- Print form revision and coordinate mapping.
- Authentication, audit immutability, encryption, backups and deployment controls.
