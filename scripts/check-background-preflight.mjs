// Read-only. Never enables billing/APIs, creates resources, or changes IAM/rules.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),project='minutes-woyz-3';
const config=JSON.parse(await fs.readFile(new URL('.firebaserc',root),'utf8'));
assert.equal(config.projects.default,project);
const remote=execFileSync('git',['remote','get-url','origin'],{cwd:root,encoding:'utf8'}).trim();
assert(/^(?:https:\/\/github\.com\/|git@github\.com:)drgigy\/Stroke-Pathway-using-WOYZ(?:\.git)?$/.test(remote),'Unexpected repository');
const billing=JSON.parse(execFileSync('/opt/homebrew/bin/gcloud',['billing','projects','describe',project,'--format=json(billingEnabled)'],{encoding:'utf8'}));
console.log('Scope verified: '+project+' / drgigy/Stroke-Pathway-using-WOYZ. No cloud changes performed.');
if(!billing.billingEnabled){console.error('BLOCKED: Firebase Blaze billing must be enabled by the project owner before background Functions can be deployed. Frontend flag must remain disabled.');process.exitCode=2;}
else console.log('Billing prerequisite satisfied. Complete the scoped deployment and end-to-end checks in BACKGROUND-DICTATION.md before enabling the frontend flag.');
