// Derived display values only: saved event times remain the source of truth.
export const doorTimingEvents=Object.freeze({door_imaging:'scan_start',door_needle:'ivt_start',door_first_pass:'first_pass',door_recanalisation:'recanalisation'});
const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
export function parseProtocolTime(raw){
 if(typeof raw!=='string'||!raw.trim())return null;
 let s=raw.trim().toLowerCase().replace(/\b(?:ist)\b/g,'+05:30').replace(/\b(?:at|on)\b/g,' ').replace(/,/g,' ').replace(/\s+/g,' ').trim();
 let date=null,zone=null;
 const iso=s.match(/\b(\d{4})-(\d{2})-(\d{2})(?=t|\s|$)/),numeric=s.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/),named=s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})\b/);
 const found=iso||numeric||named;
 if(found){
  const y=Number(iso?found[1]:found[3]),m=iso?Number(found[2]):numeric?Number(found[2]):months.findIndex(month=>month===found[2]||month.slice(0,3)===found[2])+1,d=Number(iso?found[3]:found[1]);
  const check=new Date(Date.UTC(y,m-1,d));if(y<1900||m<1||m>12||check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d)return null;
  date={y,m,d};s=s.replace(found[0],' ').replace(/^\s*t/,' ').trim();
 }
 const zoneMatch=s.match(/(z|[+-]\d{2}:\d{2})$/i);if(zoneMatch){zone=zoneMatch[1];s=s.slice(0,zoneMatch.index).trim();if(!date)return null;}
 const clock=s.match(/^(\d{1,2})(?::(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?)?\s*(a\.?m\.?|p\.?m\.?)?(?:\s*(?:hours|hrs))?$/i);
 if(!clock)return null;
 let hours=Number(clock[1]),minutes=Number(clock[2]||0),seconds=Number(clock[3]||0);const meridiem=clock[4]?.replace(/\./g,'');
 if(minutes>59||seconds>59||(!meridiem&&hours>23)||(meridiem&&(hours<1||hours>12))||(!clock[2]&&!meridiem))return null;
 if(meridiem)hours=hours%12+(meridiem==='pm'?12:0);
 const time=(hours*60+minutes)*60+seconds;
 if(!date)return {seconds:time,dated:false};
 let offset=330;if(zone?.toLowerCase()==='z')offset=0;else if(zone){const sign=zone[0]==='-'?-1:1,h=Number(zone.slice(1,3)),m=Number(zone.slice(4));if(h>14||m>59||(h===14&&m!==0))return null;offset=sign*(h*60+m);}
 return {seconds:Date.UTC(date.y,date.m-1,date.d)/1000+time-offset*60,dated:true};
}
export function calculateDoorTimings(values){
 const value=id=>typeof values[id]==='string'?values[id]:values[id]?.value||'';
 const start=parseProtocolTime(value('er_arrival')),result={};
 for(const [id,event]of Object.entries(doorTimingEvents)){
  const end=parseProtocolTime(value(event));let reason='';
  if(!value('er_arrival')||!value(event))reason='Enter ER arrival and event time.';
  else if(!start||!end)reason='Use an unambiguous clock time and, where needed, a full date.';
  else if(start.dated!==end.dated)reason='Enter the date for both event times.';
  else if(end.seconds<start.seconds)reason='Event precedes ER arrival. Check the times; for midnight crossings enter both dates.';
  const duration=reason?null:end.seconds-start.seconds;
  result[id]={value:duration===null?'':`${Number((duration/60).toFixed(2))} min`,reason,seconds:duration};
 }
 return result;
}
