import {configured,showConfigProblem,getClient,fetchEvents,putEvent,removeEvent,fetchBesiedka,putBesiedka,localDate,addDays,formatDate,timeText,niceTitle,escapeHTML,showToast} from './shared.js?v=6';
const $=sel=>document.querySelector(sel),form=$('#event-form');
let events=[],besiedka=[],editingId=null,type='service',busy=false,signedInUser=null,permissions={can_manage_events:true,can_manage_besiedka:true};
$('#year').textContent=new Date().getFullYear();showConfigProblem('admin-demo-banner');
function nextSunday(week=0){const today=new Date();return localDate(addDays(today,(7-today.getDay())%7+7*week));}
function sundayDate(iso){return Boolean(iso)&&new Date(`${iso}T12:00:00`).getDay()===0;}
function value(id){return $(id).value.trim();}
function fullProgram(p){return [p.sermon_author,p.sermon_title,p.sermon_description,p.moderator_name].every(x=>String(x||'').trim());}
function updateRequirements(){const service=type==='service',published=$('#event-published').checked;['#sermon-author','#sermon-title','#sermon-desc','#moderator-name'].forEach(id=>$(id).required=service&&published);['#general-title','#general-responsible','#general-desc'].forEach(id=>$(id).required=!service&&published);$('#worship-leader').required=false;}
function setType(next){
  const before=type;type=next;const service=next==='service';
  $('#service-fields').hidden=!service;$('#general-fields').hidden=service;
  $('#service-time-hint').hidden=!service;$('#service-cancel-zone').hidden=!service;
  $('#event-time').readOnly=service;
  if(service){$('#event-time').value='10:00';if($('#event-date').value&&!sundayDate($('#event-date').value))$('#event-date').value=nextSunday();}
  else if(before==='service'&&!editingId)$('#event-time').value='18:00';
  updateRequirements();refreshCancellationButton();
}
function clearForm(){editingId=null;form.reset();$('#event-date').value=nextSunday();$('#event-time').value='10:00';$('#event-end').value='';$('#event-published').checked=true;$('#editor-title').textContent='Nová bohoslužba';$('#delete-event').hidden=true;$('#form-error').textContent='';setType('service');drawList();}
function fillForm(e){
  editingId=e.id;$('#editor-title').textContent=e.event_type==='service'?'Upraviť bohoslužbu':'Upraviť akciu';setType(e.event_type);
  $('#event-date').value=e.event_date;$('#event-time').value=e.event_type==='service'?'10:00':timeText(e.start_time);$('#event-end').value=timeText(e.end_time);
  $('#sermon-author').value=e.sermon_author||'';$('#sermon-title').value=e.sermon_title||'';$('#sermon-desc').value=e.sermon_description||'';
  $('#moderator-name').value=e.moderator_name||'';$('#worship-leader').value=e.worship_leader||'';
  $('#general-title').value=e.title||'';$('#general-responsible').value=e.responsible_person||'';$('#general-desc').value=e.description||'';
  $('#event-published').checked=Boolean(e.is_published);$('#delete-event').hidden=false;$('#form-error').textContent='';updateRequirements();refreshCancellationButton();drawList();
  showStage('editor');$('#editor-title').focus?.();
}
function payload(){const service=type==='service';return {
  event_type:type,event_date:value('#event-date'),start_time:service?'10:00':value('#event-time'),end_time:value('#event-end')||null,
  is_published:$('#event-published').checked,is_cancelled:false,
  title:service?null:value('#general-title'),description:service?null:value('#general-desc'),responsible_person:service?null:value('#general-responsible'),
  sermon_author:service?value('#sermon-author'):null,sermon_title:service?value('#sermon-title'):null,sermon_description:service?value('#sermon-desc'):null,
  moderator_name:service?value('#moderator-name'):null,worship_leader:service?value('#worship-leader'):null
};}
function validate(p){if(!form.checkValidity()){form.reportValidity();return 'Vyplňte povinné polia.';}if(p.event_type==='service'&&!sundayDate(p.event_date))return 'Bohoslužbu možno naplánovať iba na nedeľu.';if(p.event_type==='service'&&p.is_published&&!fullProgram(p))return 'Pred zverejnením bohoslužby doplňte rečníka, názov a opis slova a moderovanie.';if(p.end_time&&p.end_time<=p.start_time)return 'Čas konca musí byť neskôr ako začiatok.';return '';}
function friendlyError(error){console.error(error);if(error.code==='23505')return 'Na danú nedeľu už existuje bohoslužba. Vyhľadajte a upravte záznam.';if(error.code==='23514')return 'Údaje nezodpovedajú databázovým pravidlám. Skontrolujte povinné polia a migracia_v3_besiedka.sql.';if(error.code==='42703'||error.code==='PGRST204')return 'Databáza nemá nové pole pre zrušenie besiedky. Spustite migracia_v3_besiedka.sql.';if(error.code==='42501')return 'Tento účet nemá právo vykonať zmenu.';if(error.code==='42P01'||error.code==='PGRST205')return 'Chýba tabuľka z migrácie. Spustite súbor migracia_v2.sql v Supabase.';return error.message||'Nastala chyba pri ukladaní.';}
function drawList(){
  const q=$('#admin-search-input').value.toLocaleLowerCase('sk-SK'),today=localDate(new Date());
  const selected=events.filter(e=>!q||[niceTitle(e),e.sermon_title,e.sermon_author,e.responsible_person,e.moderator_name,e.worship_leader].filter(Boolean).some(x=>String(x).toLocaleLowerCase('sk-SK').includes(q)));
  selected.sort((a,b)=>{const aa=a.event_date>=today,bb=b.event_date>=today;if(aa!==bb)return aa?-1:1;const c=`${a.event_date}${a.start_time}`.localeCompare(`${b.event_date}${b.start_time}`);return aa?c:-c;});
  if(!selected.length){$('#admin-list').innerHTML='<div class="empty-state"><span>✳</span><strong>Žiadne uložené udalosti</strong>Pre nedeľné bohoslužby sa čas 10:00 zobrazí automaticky aj bez vytvoreného záznamu.</div>';return;}
  $('#admin-list').innerHTML=selected.map(e=>`<button type="button" class="admin-event ${editingId===e.id?'current':''}" data-edit="${escapeHTML(e.id)}"><span class="date-tile ${e.event_type}${e.is_cancelled?' cancelled':''}"><span class="date-day">${Number(e.event_date.slice(-2))}</span><span class="date-month">${escapeHTML(new Intl.DateTimeFormat('sk-SK',{month:'short'}).format(new Date(`${e.event_date}T12:00:00`)))}</span></span><span class="admin-event-body"><span class="item-tag ${e.event_type}">${e.event_type==='service'?'BOHOSLUŽBA':'AKCIA'}</span><span class="admin-event-title">${escapeHTML(e.event_type==='service'?(e.is_cancelled?'Bohoslužba zrušená':`Nedeľná bohoslužba · ${e.sermon_title||'Program sa pripravuje'}`):e.title||'Nepomenovaná akcia')}</span><span class="admin-event-meta">${escapeHTML(timeText(e.start_time))} · ${escapeHTML(e.event_type==='service'?e.sermon_author||'Bez rečníka':e.responsible_person||'Bez osoby')}</span></span><span class="status ${!e.is_published?'draft':e.is_cancelled?'cancelled':''}">${!e.is_published?'Koncept':e.is_cancelled?'Zrušené':'Zverejnené'}</span></button>`).join('');
}
async function reloadEvents(){events=await fetchEvents(true);drawList();refreshCancellationButton();}
async function reloadBesiedka(){besiedka=await fetchBesiedka();drawBesiedka();fillBesiedkaDate();}
function setBusy(val){busy=val;$('#save-event').disabled=val;$('#delete-event').disabled=val;$('#toggle-cancel-service').disabled=val;$('#save-event').textContent=val?'Ukladám…':'Uložiť udalosť →';}
function refreshCancellationButton(){
  const date=value('#event-date'),previous=events.find(e=>e.event_type==='service'&&e.event_date===date),btn=$('#toggle-cancel-service');
  btn.disabled=busy||!sundayDate(date);btn.textContent=previous?.is_cancelled?'Obnoviť bohoslužbu':'Zrušiť bohoslužbu';btn.classList.toggle('restoring',Boolean(previous?.is_cancelled));
}
form.addEventListener('submit',async ev=>{ev.preventDefault();if(busy||!permissions.can_manage_events)return;$('#form-error').textContent='';const entry=payload(),error=validate(entry);if(error){$('#form-error').textContent=error;return;}
  setBusy(true);try{const onDay=events.find(e=>e.event_type==='service'&&e.event_date===entry.event_date);const targetId=entry.event_type==='service'&&(editingId===null||!events.some(e=>e.id===editingId&&e.event_type==='service'))?onDay?.id||null:editingId;
    await putEvent(entry,targetId);await reloadEvents();clearForm();showStage('home');showToast(entry.is_published?'Udalosť je uložená a zverejnená.':'Koncept uložený.');
  }catch(err){const message=friendlyError(err);$('#form-error').textContent=message;showToast(message,'error');}finally{setBusy(false);refreshCancellationButton();}
});
$('#toggle-cancel-service').addEventListener('click',async()=>{
  if(type!=='service'||busy||!permissions.can_manage_events)return;
  const date=value('#event-date');if(!sundayDate(date)){$('#form-error').textContent='Vyberte platnú nedeľu.';return;}
  const existing=events.find(e=>e.event_type==='service'&&e.event_date===date),restore=existing?.is_cancelled;
  const question=restore?`Obnoviť bohoslužbu ${formatDate(date)} o 10:00?`:`Naozaj zrušiť bohoslužbu ${formatDate(date)} o 10:00?`;
  if(!window.confirm(question))return;setBusy(true);
  try{
    const update=restore?{is_cancelled:false,is_published:Boolean(fullProgram(existing)),start_time:'10:00',end_time:existing.end_time&&timeText(existing.end_time)>'10:00'?existing.end_time:null}:{is_cancelled:true,is_published:true,start_time:'10:00',end_time:null};
    const entry=existing?update:{event_type:'service',event_date:date,...update};
    await putEvent(entry,existing?.id||null);await reloadEvents();clearForm();showStage('home');showToast(restore?'Bohoslužba bola obnovená.':'Bohoslužba bola na túto nedeľu označená ako zrušená.');
  }catch(err){const message=friendlyError(err);$('#form-error').textContent=message;showToast(message,'error');}finally{setBusy(false);refreshCancellationButton();}
});
$('#delete-event').addEventListener('click',async()=>{if(!editingId||busy||!permissions.can_manage_events)return;const item=events.find(e=>e.id===editingId);if(!window.confirm(`Odstrániť „${niceTitle(item)}“ (${formatDate(item.event_date)})? Nedeľa sa potom opäť zobrazí ako bežná bohoslužba o 10:00.`))return;
  setBusy(true);try{await removeEvent(editingId);await reloadEvents();clearForm();showStage('home');showToast('Záznam bol odstránený.');}catch(err){showToast(friendlyError(err),'error');}finally{setBusy(false);}
});
// Trojkroková administrácia: úvod → typ udalosti → iba príslušný formulár.
const stages={home:'#admin-home',picker:'#admin-type-picker',editor:'#admin-editor-stage',besiedka:'#admin-besiedka-stage',list:'#admin-list-stage'};
function showStage(stage){
  for(const [name,selector] of Object.entries(stages))$(selector).hidden=name!==stage;
  window.scrollTo({top:0,behavior:'instant'});
}
function openNew(next){
  if(next==='besiedka'){
    if(!permissions.can_manage_besiedka)return;
    $('#besiedka-date').value=nextSunday();fillBesiedkaDate();$('#besiedka-error').textContent='';showStage('besiedka');$('#besiedka-date').focus();return;
  }
  if(!permissions.can_manage_events)return;
  clearForm();setType(next);$('#editor-title').textContent=next==='service'?'Nová bohoslužba':'Nová akcia';
  showStage('editor');$('#event-date').focus();
}
$('#add-action').addEventListener('click',()=>showStage('picker'));
$('#manage-events-btn').addEventListener('click',()=>{if(permissions.can_manage_events)showStage('list');});
$('#pick-service').addEventListener('click',()=>openNew('service'));
$('#pick-besiedka').addEventListener('click',()=>openNew('besiedka'));
$('#pick-general').addEventListener('click',()=>openNew('general'));
['#back-home-from-picker','#back-home-from-editor','#back-home-from-besiedka','#back-home-from-list'].forEach(id=>$(id).addEventListener('click',()=>{clearForm();showStage('home');}));
$('#event-published').addEventListener('change',updateRequirements);
$('#event-date').addEventListener('change',refreshCancellationButton);
$('#cancel-edit').addEventListener('click',()=>{clearForm();showStage('home');});
$('#admin-search-input').addEventListener('input',drawList);
$('#admin-list').addEventListener('click',ev=>{const item=ev.target.closest('[data-edit]');if(item){const selected=events.find(x=>String(x.id)===item.dataset.edit);if(selected)fillForm(selected);}});
// Samostatný editor besiedky - nevie meniť program bohoslužieb.
function drawBesiedka(){const html=Array.from({length:12},(_,i)=>nextSunday(i)).map(date=>{
  const assigned=besiedka.find(e=>e.event_date===date),chosen=$('#besiedka-date').value===date;
  return `<button type="button" class="besiedka-item${chosen?' active':''}${assigned?.is_cancelled?' is-cancelled':''}" data-sunday="${date}"><span>${escapeHTML(formatDate(date,{day:'numeric',month:'long'}))}</span><strong>${escapeHTML(assigned?.is_cancelled?'Besiedka zrušená':assigned?.responsible_person||'Nepridelené')}</strong></button>`;
});$('#besiedka-list').innerHTML=html;}
function syncBesiedkaFields(){const cancelled=$('#besiedka-cancelled').checked;$('#besiedka-person-group').hidden=cancelled;$('#besiedka-person').required=!cancelled;$('#besiedka-person').disabled=cancelled;}
function fillBesiedkaDate(){const date=value('#besiedka-date'),assigned=besiedka.find(e=>e.event_date===date);$('#besiedka-person').value=assigned?.responsible_person||'';$('#besiedka-cancelled').checked=Boolean(assigned?.is_cancelled);$('#besiedka-delete').hidden=!assigned;$('#besiedka-delete').textContent=assigned?.is_cancelled?'Odstrániť oznámenie o zrušení':'Odstrániť priradenie';$('#besiedka-error').textContent='';syncBesiedkaFields();drawBesiedka();}
$('#besiedka-date').addEventListener('change',fillBesiedkaDate);
$('#besiedka-cancelled').addEventListener('change',syncBesiedkaFields);
$('#besiedka-list').addEventListener('click',ev=>{const button=ev.target.closest('[data-sunday]');if(button){$('#besiedka-date').value=button.dataset.sunday;fillBesiedkaDate();}});
$('#besiedka-form').addEventListener('submit',async ev=>{ev.preventDefault();if(!permissions.can_manage_besiedka)return;$('#besiedka-error').textContent='';const date=value('#besiedka-date'),person=value('#besiedka-person'),cancelled=$('#besiedka-cancelled').checked;if(!sundayDate(date)){$('#besiedka-error').textContent='Besiedka sa zapisuje na nedeľu.';return;}if(!cancelled&&!person){$('#besiedka-error').textContent='Vyplňte zodpovednú osobu alebo označte zrušenie besiedky.';return;}
  $('#besiedka-save').disabled=true;
  try{await putBesiedka(date,person,cancelled);await reloadBesiedka();showToast(cancelled?'Zrušenie besiedky bolo zverejnené.':'Besiedka bola uložená a je viditeľná v kalendári.');}
  catch(err){$('#besiedka-error').textContent=friendlyError(err);showToast('Nepodarilo sa uložiť besiedku.','error');}
  finally{$('#besiedka-save').disabled=false;}
});
$('#besiedka-delete').addEventListener('click',async()=>{const date=value('#besiedka-date'),wasCancelled=Boolean(besiedka.find(e=>e.event_date===date)?.is_cancelled);if(!sundayDate(date)||!window.confirm(wasCancelled?`Odstrániť oznam o zrušení besiedky na ${formatDate(date)}?`:`Odstrániť pridelenie besiedky na ${formatDate(date)}?`))return;
  try{await putBesiedka(date,'');await reloadBesiedka();showToast(wasCancelled?'Oznam o zrušení besiedky bol odstránený.':'Pridelenie besiedky bolo odstránené.');}catch(err){$('#besiedka-error').textContent=friendlyError(err);}
});
function showLogin(message=''){$('#login-view').hidden=false;$('#admin-view').hidden=true;$('#login-error').textContent=message;}
async function showAdmin(account){
  $('#login-view').hidden=true;$('#admin-view').hidden=false;$('#signed-user').textContent=account?.email||'Ukážkový režim';$('#logout-btn').hidden=!configured;
  $('#pick-besiedka').hidden=!permissions.can_manage_besiedka;$('#pick-service').hidden=!permissions.can_manage_events;$('#pick-general').hidden=!permissions.can_manage_events;$('#manage-events-btn').hidden=!permissions.can_manage_events;
  clearForm();showStage('home');$('#besiedka-date').value=nextSunday();fillBesiedkaDate();
  if(permissions.can_manage_events)await reloadEvents();
  if(permissions.can_manage_besiedka)await reloadBesiedka();
}
async function authorizedUser(){
  const client=await getClient();const {data:{user},error}=await client.auth.getUser();if(error||!user)return null;
  const {data,error:accessError}=await client.from('editors').select('user_id,display_name,can_manage_events,can_manage_besiedka').eq('user_id',user.id).eq('is_active',true).maybeSingle();
  if(accessError)throw accessError;if(!data||(!data.can_manage_events&&!data.can_manage_besiedka))return null;
  return {user,permissions:{can_manage_events:data.can_manage_events,can_manage_besiedka:data.can_manage_besiedka}};
}
$('#login-form').addEventListener('submit',async ev=>{ev.preventDefault();const button=$('#login-button');button.disabled=true;$('#login-error').textContent='';try{
  const client=await getClient();const {error}=await client.auth.signInWithPassword({email:value('#login-email'),password:$('#login-password').value});if(error)throw error;
  const authorized=await authorizedUser();if(!authorized){await client.auth.signOut();showLogin('Účet nemá pridelené oprávnenia.');return;}
  signedInUser=authorized.user;permissions=authorized.permissions;await showAdmin(signedInUser);$('#login-password').value='';
}catch(err){console.error(err);showLogin('Prihlásenie alebo načítanie práv zlyhalo. Skontrolujte SQL migráciu, konfiguráciu a oprávnenia.');}finally{button.disabled=false;}});
$('#logout-btn').addEventListener('click',async()=>{try{const client=await getClient();await client.auth.signOut();signedInUser=null;events=[];besiedka=[];showLogin();showToast('Boli ste odhlásení.');}catch(err){showToast('Odhlásenie zlyhalo.','error');}});
async function init(){
  if(!configured){await showAdmin(null);return;}
  try{const authorized=await authorizedUser();if(!authorized){const client=await getClient();const {data:{session}}=await client.auth.getSession();if(session)await client.auth.signOut();showLogin();return;}
    signedInUser=authorized.user;permissions=authorized.permissions;await showAdmin(signedInUser);
  }catch(err){console.error(err);showLogin('Nedá sa overiť oprávnenie. Skontrolujte migráciu databázy a pripojenie Supabase.');}
}
init();
