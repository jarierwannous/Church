// V10: časovo ohraničené opakujúce sa akcie. Žiadne automatické výročia či osobné údaje.
const DAY_MS=86400000;
export const MAX_OCCURRENCES=160;
export const MAX_YEARS=2;
function isoUtc(day){const [y,m,d]=day.split('-').map(Number);return Date.UTC(y,m-1,d);}
function isoFromUtc(ms){return new Date(ms).toISOString().slice(0,10);}
export function generateDates(start,until,frequency){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(until)||isoFromUtc(isoUtc(start))!==start||isoFromUtc(isoUtc(until))!==until)throw new Error('Neplatný dátum opakovania.');
  if(until<start)throw new Error('Koniec opakovania musí byť v deň začiatku alebo neskôr.');
  const [year,month,day]=start.split('-').map(Number);
  const limit=Date.UTC(year+MAX_YEARS,month-1,day);
  if(isoUtc(until)>limit)throw new Error('Jedna séria môže byť naplánovaná najviac na 2 roky.');
  const result=[];let current=isoUtc(start),n=0;
  while(isoFromUtc(current)<=until){
    if(result.length>=MAX_OCCURRENCES)throw new Error('Príliš veľa termínov v jednej sérii (najviac 160).');
    result.push(isoFromUtc(current)); n++;
    if(frequency==='daily')current=isoUtc(start)+n*DAY_MS;
    else if(frequency==='weekly')current=isoUtc(start)+n*7*DAY_MS;
    else if(frequency==='biweekly')current=isoUtc(start)+n*14*DAY_MS;
    else if(frequency==='fourweekly')current=isoUtc(start)+n*28*DAY_MS;
    else if(frequency==='monthly'){
      const lastDay=new Date(Date.UTC(year,month+n,0)).getUTCDate();
      current=Date.UTC(year,month-1+n,Math.min(day,lastDay));
    } else throw new Error('Neznáme opakovanie.');
  }
  return result;
}
function moveDateTime(date,time,delta){
  const base=isoUtc(date);const [hour,minute]=time.slice(0,5).split(':').map(Number);
  const next=new Date(base+(hour*60+minute+delta)*60000);
  return {date:next.toISOString().slice(0,10),time:next.toISOString().slice(11,16)};
}
export function shiftSeriesLocally(items,selectedId,newData){
  const current=items.find(e=>e.id===selectedId);
  if(!current||!current.series_id)throw new Error('Akcia nie je súčasťou série.');
  const oldStamp=isoUtc(current.event_date)+Number(current.start_time.slice(0,2))*3600000+Number(current.start_time.slice(3,5))*60000;
  const newStamp=isoUtc(newData.event_date)+Number(newData.start_time.slice(0,2))*3600000+Number(newData.start_time.slice(3,5))*60000;
  const delta=Math.round((newStamp-oldStamp)/60000);
  const changes=items.map(e=>{
    if(e.series_id!==current.series_id||`${e.event_date}T${e.start_time}`<`${current.event_date}T${current.start_time}`)return {...e};
    const changed=moveDateTime(e.event_date,e.start_time,delta);
    const ended=e.end_time?moveDateTime(e.event_date,e.end_time,delta):null;
    if(ended && changed.date!==ended.date)throw new Error('Posun by spôsobil, že niektorá akcia končí až na ďalší deň. Zvoľte iný čas.');
    return {...e,event_date:changed.date,start_time:changed.time,end_time:ended?.time??null,
      ...(e.id===selectedId?{...newData,series_id:e.series_id}:{} )};
  });
  return changes;
}
