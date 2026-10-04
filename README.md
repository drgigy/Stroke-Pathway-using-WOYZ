# WOYZ Stroke shared prototype

Private Sites project with mobile (`/mobile`) and desktop (`/admin`) views.

## Shared records

Both views read and write the same D1 case for the signed-in user. This first implementation supports one shared case, ST-024, per account. The case starts empty. Use **Edit shared case details** and **Save to shared case**. Consultant, discharge and KPI draft save controls also persist to the same record. The other view refreshes every five seconds. Edits use optimistic version checks; conflicting drafts stay visible for comparison rather than overwriting another device's update. Offline drafts remain in the open page but are not durable after closing/reloading.

`app/api/case/route.ts` enforces identity, origin checks, allowed field names, length limits and version matching. Database triggers append every case revision to immutable history. No production sample records are seeded. Local test data is not packaged.

## Preserved previews

Both documents remain in sandboxed iframes with the original CSP; a source-checked postMessage bridge connects the allowed editor fields to the authenticated parent application. Shared values replace mock case content. OP/IP filtering is hidden. Statistics remain explicitly illustrative. Audio capture and transcription are simulated; final PDF printing and full proforma field mapping are not connected. Case notes are stage-organized entered text, not automatic AI-generated prose. Do not treat the prototype as a validated clinical system.

## Validation

Production build and TypeScript checks; local API checks for auth, origin, retry, version conflicts and field validation; browser verification of mobile-to-desktop name synchronization and desktop-to-mobile consultant-comment synchronization.
