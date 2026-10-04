import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Content-Type':'application/json'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
const EPISODE='ST-024';
function unpack(row:any){return row?{data:JSON.parse(row.data),version:row.version,updatedAt:row.updated_at}:{data:{},version:0,updatedAt:null};}
export async function GET(){const user=await getChatGPTUser();if(!user)return reply({error:'Sign in required'},401);if(!env.DB)return reply({error:'Storage unavailable'},503);const row=await env.DB.prepare('SELECT * FROM cases WHERE owner=? AND episode=?').bind(user.userId,EPISODE).first();return reply(unpack(row));}
export async function PUT(req:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'Sign in required'},401);
 const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)return reply({error:'Origin rejected'},403);
 if(!req.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required'},415);
 const raw=await req.text();if(raw.length>25000)return reply({error:'Entry too large'},413);
 let input:any;try{input=JSON.parse(raw);}catch{return reply({error:'Invalid JSON'},400);}
 if(!input||!Number.isSafeInteger(input.version)||input.version<0||typeof input.key!=='string'||!(/^(name|uhid|age|sex|mobile|contact|diagnosis|consultant|discharge|tici|aspects|mrs|collateral|nihss|time_(onset|lastnormal|noted|arrival|code|ctarrival|firstimage|ctfinish|ivt|cathlab|puncture|bypass|mt|reperfusion)|stage_([0-9]|10|11)|kpi_([1-9]|1[0-9]|2[0-4]))$/).test(input.key)||typeof input.value!=='string'||input.value.length>12000||typeof input.mutationId!=='string'||!(/^[a-zA-Z0-9-]{12,80}$/).test(input.mutationId))return reply({error:'Invalid field or version'},400);
 if(!env.DB)return reply({error:'Storage unavailable'},503);
 const db=env.DB;let row:any=await db.prepare('SELECT * FROM cases WHERE owner=? AND episode=?').bind(user.userId,EPISODE).first();
 if(row?.mutation_id===input.mutationId)return reply(unpack(row));
 if((row?.version??0)!==input.version)return reply({error:'Another device saved changes. Your draft is retained; compare it with the latest value before saving again.',...unpack(row)},409);
 const data={...(row?JSON.parse(row.data):{}),[input.key]:input.value};const now=new Date().toISOString();let result;
 if(!row){result=await db.prepare('INSERT OR IGNORE INTO cases (owner,episode,data,version,updated_at,mutation_id) VALUES (?,?,?,1,?,?)').bind(user.userId,EPISODE,JSON.stringify(data),now,input.mutationId).run();}
 else{result=await db.prepare('UPDATE cases SET data=?,version=version+1,updated_at=?,mutation_id=? WHERE owner=? AND episode=? AND version=?').bind(JSON.stringify(data),now,input.mutationId,user.userId,EPISODE,input.version).run();}
 row=await db.prepare('SELECT * FROM cases WHERE owner=? AND episode=?').bind(user.userId,EPISODE).first();
 if(!result.meta.changes)return reply({error:'Save conflict. Draft retained; review the latest value.',...unpack(row)},409);
 return reply(unpack(row));
}
