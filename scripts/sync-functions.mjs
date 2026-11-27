import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url),target=new URL('../functions/shared/',import.meta.url);
const config=JSON.parse(await fs.readFile(new URL('.firebaserc',root),'utf8'));
if(config.projects.default!=='minutes-woyz-3')throw new Error('Unexpected Firebase project');
await fs.mkdir(target,{recursive:true});
for(const file of ['protocol-kpi-values.js','protocol-timings.js','entry-order.js','protocol-fields.js','protocol-field-output.js','kpi-schema.js','kpi-data.js','dictation-request.js','case-wide-dictation.js','background-merge.js'])await fs.copyFile(new URL(file,root),new URL(file,target));
console.log('Synchronized blank form contracts and validators for minutes-woyz-3 worker.');
