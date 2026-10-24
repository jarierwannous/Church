import {nextYearICS} from './ics.js?v=9';
import {showConfigProblem,fetchTodaysCelebrations,fetchEvents,fetchBesiedka,combineWithSundays,parseDate,localDate,addDays,formatDate,timeText,niceTitle,escapeHTML,showToast,sortEvents} from './shared.js?v=9';
const $=sel=>document.querySelector(sel);
const state={raw:[],besiedka:[],events:[],year:new Date().getFullYear(),month:new Date().getMonth(),filter:'all',query:'',selectedDay:null};
const monthFormat=new Intl.DateTimeFormat('sk-SK',{month:'long',year:'numeric'});
const todayIso=localDate(new Date());
$('#year').textContent=new Date().getFullYear();
showConfigProblem('demo-banner');
function prepareEvents(){
  const now=new Date(); const monthBegin=new Date(state.year,state.month,1);
  // Dve krátke okná – nesmie vznikať obrovský interval pri prezeraní vzdialených rokov.
  const upcoming=combineWithSundays(state.raw,state.besiedka,localDate(addDays(now,-7)),localDate(addDays(now,85)));
  state.events=combineWithSundays(upcoming,state.besiedka,localDate(addDays(monthBegin,-14)),localDate(addDays(new Date(state.year,state.month+1,0),14)));
}
function matches(e){const q=state.query.toLocaleLowerCase('sk-SK');return (state.filter==='all'||e.event_type===state.filter)&&(!q||[niceTitle(e),e.title,e.description,e.responsible_person,e.sermon_author,e.sermon_title,e.sermon_description,e.moderator_name,e.besiedka_leader,e.worship_leader,e.is_cancelled?'zrušená':'',e.besiedka_cancelled?'besiedka zrušená':''].filter(Boolean).some(x=>String(x).toLocaleLowerCase('sk-SK').includes(q)));}
function eventDateTime(e){return `${e.event_date}T${timeText(e.start_time)||'00:00'}`;}
function readableDate(e){return `${formatDate(e.event_date)} · ${timeText(e.start_time)}${e.end_time?` – ${timeText(e.end_time)}`:''}`;}
function renderHero(){
  const now=new Date();
  const upcoming=sortEvents(state.events.filter(e=>e.event_type==='service'&&!e.is_cancelled&&new Date(eventDateTime(e))>=now))[0];
  const target=$('#hero-highlight');
  if(!upcoming){
    target.disabled=true;
    target.textContent='Zatiaľ nie je známa najbližšia bohoslužba.';
    target.onclick=null;
    return;
  }
  const date=formatDate(upcoming.event_date,{weekday:'long',day:'numeric',month:'long'});
  const sermon=upcoming.sermon_title?`„${escapeHTML(upcoming.sermon_title)}“`:'Program pripravujeme';
  const speaker=upcoming.sermon_author?`<span class="quick-speaker">${escapeHTML(upcoming.sermon_author)}</span>`:'';
  target.disabled=false;
  target.innerHTML=`<span class="quick-date">${escapeHTML(date)} · 10:00</span><span class="quick-topic">${sermon}</span>${speaker}<span class="quick-arrow" aria-hidden="true">→</span>`;
  target.setAttribute('aria-label',`Najbližšia bohoslužba: ${date} o 10:00. Otvoriť podrobnosti.`);
  target.onclick=()=>openModal(upcoming.id);
}
function renderCalendar(){
  const first=new Date(state.year,state.month,1);$('#month-title').textContent=monthFormat.format(first);
  const offset=(first.getDay()+6)%7;const days=new Date(state.year,state.month+1,0).getDate();const cells=Math.ceil((offset+days)/7)*7;const relevant=state.events.filter(matches);
  let count=0,html='';
  for(let n=0;n<cells;n++){
    const date=new Date(state.year,state.month,1-offset+n),dateIso=localDate(date),inside=date.getMonth()===state.month;
    const items=relevant.filter(e=>e.event_date===dateIso);if(inside)count+=items.length;
    html+=`<button type="button" class="calendar-day${inside?'':' outside'}${dateIso===todayIso?' today':''}${date.getDay()===0?' sunday':''}${dateIso===state.selectedDay?' selected':''}" data-date="${dateIso}" aria-label="${escapeHTML(formatDate(dateIso))}, ${items.length} udalostí"><span class="day-number">${date.getDate()}</span><span class="calendar-events">${items.slice(0,3).map(e=>`<span class="calendar-event ${e.event_type}${e.is_cancelled?' cancelled':''}" title="${escapeHTML(niceTitle(e))}">${escapeHTML(timeText(e.start_time))} ${escapeHTML(niceTitle(e))}</span>${e.event_type==='service'&&e.besiedka_cancelled&&!e.is_cancelled?'<span class="calendar-besiedka-alert">Besiedka zrušená</span>':''}`).join('')}${items.length>3?`<span class="more-events">+${items.length-3} ďalšie</span>`:''}</span></button>`;
  }
  $('#calendar-grid').innerHTML=html;$('#month-count').textContent=`${count} ${count===1?'udalosť':count>=2&&count<=4?'udalosti':'udalostí'} v mesiaci`;
}
function renderUpcoming(){
  const now=new Date();let selected=sortEvents(state.events.filter(matches)).filter(e=>new Date(eventDateTime(e))>=now).slice(0,5);
  if(state.selectedDay){selected=sortEvents(state.events.filter(e=>matches(e)&&e.event_date===state.selectedDay));}
  $('.aside-header h3').textContent=state.selectedDay?formatDate(state.selectedDay,{day:'numeric',month:'long'}):'Najbližšie udalosti';
  if(!selected.length){$('#upcoming-list').innerHTML='<div class="empty-state"><span>✳</span><strong>Žiadne udalosti</strong>Pre tento výber nie je udalosť.</div>';return;}
  $('#upcoming-list').innerHTML=selected.map(e=>{
    const date=parseDate(e.event_date),month=new Intl.DateTimeFormat('sk-SK',{month:'short'}).format(date);
    const title=e.event_type==='service'?(e.is_cancelled?'Bohoslužba zrušená':(e.sermon_title||'Nedeľná bohoslužba')):e.title;
    const meta=e.event_type==='service'?(e.is_cancelled?'Bohoslužba sa nekoná':(e.sermon_author||'Program sa pripravuje')+(e.besiedka_cancelled?' · Besiedka zrušená':'')):e.responsible_person;
    return `<button type="button" class="upcoming-item" data-id="${escapeHTML(e.id)}"><span class="date-tile ${e.event_type}${e.is_cancelled?' cancelled':''}"><span class="date-day">${date.getDate()}</span><span class="date-month">${escapeHTML(month)}</span></span><span><span class="item-tag ${e.event_type}">${e.event_type==='service'?'BOHOSLUŽBA':'AKCIA'}</span><span class="upcoming-title">${escapeHTML(title)}</span><span class="upcoming-meta">${escapeHTML(timeText(e.start_time))} · ${escapeHTML(meta)}</span></span></button>`;
  }).join('');
}
function render(){prepareEvents();renderHero();renderCalendar();renderUpcoming();}
function role(name,value){return `<div class="modal-role"><strong>${name}</strong><span>${escapeHTML(value||'Zatiaľ neuvedené')}</span></div>`;}
function serviceModal(e){
  if(e.is_cancelled)return '<section class="cancel-notice"><strong>Bohoslužba sa túto nedeľu nekoná.</strong><p>Prípadnú náhradnú zborovú akciu nájdete v kalendári medzi ostatnými udalosťami.</p></section>';
  return `${e.besiedka_cancelled?'<section class="besiedka-cancel-note" role="note"><strong>Besiedka je zrušená.</strong> Túto nedeľu sa besiedka nekoná.</section>':''}<section class="modal-section"><h3>Hlavné slovo</h3><div class="modal-sermon-title">${escapeHTML(e.sermon_title||'Program pripravujeme')}</div>${role('Rečník',e.sermon_author)}<p class="modal-copy">${escapeHTML(e.sermon_description||'Podrobnosti hlavného slova doplníme.')}</p></section><section class="modal-section"><h3>Služby a zodpovedné osoby</h3><div class="modal-roles">${role('Moderovanie',e.moderator_name)}${role('Besiedka',e.besiedka_cancelled?'Zrušená':e.besiedka_leader)}${e.worship_leader?role('Vedenie chvál',e.worship_leader):''}</div></section>`;
}
function generalModal(e){return `<section class="modal-section"><h3>O podujatí</h3><div class="modal-copy">${escapeHTML(e.description)}</div></section><section class="modal-section"><h3>Organizácia</h3>${role('Zodpovedná osoba',e.responsible_person)}</section>`;}
let previousFocus=null;
function openModal(id){const e=state.events.find(x=>String(x.id)===String(id));if(!e)return;previousFocus=document.activeElement;$('#modal-inner').innerHTML=`<span class="modal-tag ${e.event_type}">${e.event_type==='service'?'NEDEĽNÁ BOHOSLUŽBA':'ZBOROVÁ AKCIA'}</span><h2 id="modal-title">${escapeHTML(niceTitle(e))}</h2><div class="modal-date">${escapeHTML(readableDate(e))}</div>${e.event_type==='service'?serviceModal(e):generalModal(e)}`;$('#event-modal').hidden=false;document.body.style.overflow='hidden';$('#modal-close').focus();}
function closeModal(){$('#event-modal').hidden=true;document.body.style.overflow='';previousFocus?.focus();}
$('#prev-month').addEventListener('click',()=>{const d=new Date(state.year,state.month-1,1);state.year=d.getFullYear();state.month=d.getMonth();state.selectedDay=null;render();});
$('#next-month').addEventListener('click',()=>{const d=new Date(state.year,state.month+1,1);state.year=d.getFullYear();state.month=d.getMonth();state.selectedDay=null;render();});
$('#today-btn').addEventListener('click',()=>{state.year=new Date().getFullYear();state.month=new Date().getMonth();state.selectedDay=null;render();});
document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{state.filter=btn.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});renderCalendar();renderUpcoming();}));
$('#event-search').addEventListener('input',ev=>{state.query=ev.target.value.trim();renderCalendar();renderUpcoming();});
$('#calendar-grid').addEventListener('click',ev=>{const cell=ev.target.closest('[data-date]');if(!cell)return;const date=cell.dataset.date,target=parseDate(date);if(target.getMonth()!==state.month||target.getFullYear()!==state.year){state.year=target.getFullYear();state.month=target.getMonth();}state.selectedDay=date;render();const found=state.events.filter(e=>matches(e)&&e.event_date===date);if(found.length===1)openModal(found[0].id);else if(found.length>1&&window.matchMedia('(max-width:550px)').matches)$('#najblizsie').scrollIntoView({behavior:'smooth'});});
$('#upcoming-list').addEventListener('click',ev=>{const el=ev.target.closest('[data-id]');if(el)openModal(el.dataset.id);});
$('#modal-close').addEventListener('click',closeModal);$('#event-modal').addEventListener('click',ev=>{if(ev.target.id==='event-modal')closeModal();});
document.addEventListener('keydown',ev=>{if(!$('#event-modal').hidden&&ev.key==='Escape')closeModal();if(!$('#event-modal').hidden&&ev.key==='Tab'){const focusables=[...$('#event-modal').querySelectorAll('button,[href],input,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled);if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}}});
async function load(){try{[state.raw,state.besiedka]=await Promise.all([fetchEvents(),fetchBesiedka()]);render();}catch(error){console.error(error);showToast('Nepodarilo sa načítať udalosti. Skontrolujte Supabase a databázovú migráciu.','error');$('#calendar-grid').innerHTML='<p class="empty-state">Nepodarilo sa načítať kalendár.</p>';$('#upcoming-list').innerHTML='<p class="muted">Údaje nie sú dostupné.</p>';$('#hero-highlight').textContent='Kalendár momentálne nie je dostupný.';}}
load();


// Odber kalendára: verejná Edge Function vracia aktuálny súbor iCalendar.
// V prípade nenakonfigurovaného odberu zostáva dostupný jednorazový export.
const subscribeDialog=$('#subscribe-modal');
const subscribeClose=$('#subscribe-close');
const feedStatus=$('#feed-status');
const copyFeed=$('#copy-calendar-link');
const appleFeed=$('#apple-subscribe');
let feedAddress='';
let subscribePreviousFocus=null;
function openSubscribe(){
  subscribePreviousFocus=document.activeElement;
  subscribeDialog.hidden=false;
  document.body.style.overflow='hidden';
  subscribeClose.focus();
  void checkFeed();
}
function closeSubscribe(){
  subscribeDialog.hidden=true;
  document.body.style.overflow='';
  subscribePreviousFocus?.focus();
}
function currentFeedAddress(){
  const project=String(window.CHURCH_CONFIG?.SUPABASE_URL||'').replace(/\/$/,'');
  if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(project))return '';
  return project+'/functions/v1/kalendar-ics';
}
async function checkFeed(){
  feedAddress='';
  copyFeed.disabled=true;
  appleFeed.setAttribute('aria-disabled','true');
  appleFeed.removeAttribute('href');
  feedStatus.textContent='Overujem dostupnosť automatického odberu…';
  const url=currentFeedAddress();
  if(!url){feedStatus.textContent='Automatický odber nie je nastavený. Môžete si stiahnuť súbor .ics.';return;}
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    let response;
    try{response=await fetch(url,{method:'GET',signal:controller.signal,cache:'no-store'});}
    finally{clearTimeout(timeout);}
    if(!response.ok || !String(response.headers.get('content-type')||'').includes('text/calendar') || !(await response.text()).startsWith('BEGIN:VCALENDAR'))throw Error('Neplatná odpoveď kalendára');
    if(subscribeDialog.hidden)return;
    feedAddress=url;
    copyFeed.disabled=false;
    appleFeed.href=url.replace(/^https:/i,'webcal:');
    appleFeed.setAttribute('aria-disabled','false');
    feedStatus.textContent='Automatický odber je pripravený.';
    feedStatus.classList.add('ready');
  }catch(err){
    console.info('Odber ICS ešte nie je dostupný:',err);
    feedStatus.classList.remove('ready');
    feedStatus.textContent='Automatický odber ešte nie je aktivovaný v Supabase. Jednorazový export funguje aj bez neho.';
  }
}
$('#open-subscribe').addEventListener('click',openSubscribe);
subscribeClose.addEventListener('click',closeSubscribe);
subscribeDialog.addEventListener('click',event=>{if(event.target===subscribeDialog)closeSubscribe();});
document.addEventListener('keydown',event=>{
  if(subscribeDialog.hidden)return;
  if(event.key==='Escape'){event.preventDefault();closeSubscribe();}
  if(event.key==='Tab'){
    const els=[...subscribeDialog.querySelectorAll('button:not(:disabled), a[href]')];
    if(!els.length)return;
    if(event.shiftKey&&document.activeElement===els[0]){event.preventDefault();els[els.length-1].focus();}
    else if(!event.shiftKey&&document.activeElement===els[els.length-1]){event.preventDefault();els[0].focus();}
  }
});
copyFeed.addEventListener('click',async()=>{
  if(!feedAddress)return;
  try{await navigator.clipboard.writeText(feedAddress);showToast('Odkaz na kalendár bol skopírovaný.');}
  catch{window.prompt('Skopírujte odkaz na kalendár:',feedAddress);}
});
$('#download-ics').addEventListener('click',()=>{
  if(!state.events.length){showToast('Udalosti nie sú načítané. Skúste obnoviť stránku.','error');return;}
  const ics=nextYearICS(state.raw,state.besiedka);
  const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='kz-trencin-udalosti.ics';
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});


async function showTodaysCelebrations(){
  const names=$('#today-namedays'),births=$('#today-birthdays');
  if(!names||!births)return;
  try{
    const all=await fetchTodaysCelebrations();
    names.textContent=all.filter(x=>x.nameday_today).map(x=>x.full_name).join(', ')||'nikto z evidovaných';
    births.textContent=all.filter(x=>x.birthday_today).map(x=>x.full_name).join(', ')||'nikto z evidovaných';
  }catch(error){
    console.warn('Nepodarilo sa načítať dnešných oslávencov:',error);
    names.textContent='nedostupné';births.textContent='nedostupné';
  }
}
showTodaysCelebrations();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)showTodaysCelebrations();});
