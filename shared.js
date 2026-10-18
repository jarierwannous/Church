// Konfigurácia je v samostatnom config.js, ktorý sa načíta ešte pred týmto modulom.
// Ak sa config.js nenačíta (napr. chýba na GitHub Pages), zobrazíme konkrétnu príčinu.
const configFileLoaded = Object.prototype.hasOwnProperty.call(window, 'CHURCH_CONFIG');
const settings = window.CHURCH_CONFIG || {};
const projectUrl = String(settings.SUPABASE_URL || '').trim();
// Podpora novšieho publishable key aj staršieho anon key.
const publicKey = String(settings.SUPABASE_PUBLISHABLE_KEY || settings.SUPABASE_ANON_KEY || '').trim();
function isProjectUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) &&
      url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password;
  } catch { return false; }
}
function configurationProblem() {
  if (!configFileLoaded) return 'Prehliadač nenačítal súbor config.js. Skontrolujte jeho umiestnenie na serveri a názov súboru.';
  if (!projectUrl) return 'V súbore config.js chýba SUPABASE_URL. Doplňte URL projektu zo Supabase.';
  if (!publicKey) return 'V súbore config.js chýba SUPABASE_PUBLISHABLE_KEY (alebo SUPABASE_ANON_KEY).';
  if (!isProjectUrl(projectUrl)) return 'SUPABASE_URL nie je platná HTTPS adresa projektu. Použite Project URL, nie odkaz na Supabase Dashboard ani /rest/v1.';
  if (/^sb_secret_/i.test(publicKey)) return 'Do config.js ste vložili tajný kľúč. Okamžite ho zneplatnite v Supabase a použite publishable/anon key.';
  if (/VAS_PROJEKT|YOUR_PROJECT|example|tvoj-projekt/i.test(projectUrl) || /^sb_publishable_\.\.\.$/.test(publicKey)) return 'V config.js sú ešte vzorové hodnoty. Nahraďte ich údajmi vlastného projektu.';
  return '';
}
export const configProblem = configurationProblem();
export const configured = !configProblem;
export const APP_NAME = 'Kresťanský zbor Trenčín';
const demoKey = 'kzt-kalendar-demo-v2';
const besiedkaDemoKey = 'kzt-besiedka-demo-v1';
let pendingClient;
export async function getClient() {
  if (!configured) return null;
  if (!pendingClient) pendingClient = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(({createClient}) =>
    createClient(projectUrl.replace(/\/$/, ''), publicKey, {auth: {persistSession: true, autoRefreshToken: true}}));
  return pendingClient;
}
// Jednoduchá viditeľná diagnostika, bez zobrazovania kľúča.
export function showConfigProblem(bannerId) {
  if (configured) return;
  const banner = document.getElementById(bannerId);
  if (!banner) return;
  banner.hidden = false;
  const detail = document.createElement('div');
  detail.className = 'shell';
  detail.style.cssText = 'padding-top:0;padding-bottom:10px;font-size:0.9em;';
  detail.textContent = `Dôvod: ${configProblem}`;
  banner.append(detail);
  console.warn('Konfigurácia kalendára:', configProblem);
}
export function localDate(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function parseDate(iso) { const [y,m,d] = iso.split('-').map(Number); return new Date(y,m-1,d); }
export function addDays(date, delta) { const d = new Date(date); d.setDate(d.getDate()+delta); return d; }
export function formatDate(iso, options={weekday:'long',day:'numeric',month:'long',year:'numeric'}) { return new Intl.DateTimeFormat('sk-SK',options).format(parseDate(iso)); }
export function formatShortDate(iso) { return new Intl.DateTimeFormat('sk-SK',{day:'numeric',month:'short'}).format(parseDate(iso)); }
export function timeText(time) { return time ? time.slice(0,5) : ''; }
export function niceTitle(e) { return e.event_type === 'service' ? (e.is_cancelled ? 'Bohoslužba zrušená' : 'Nedeľná bohoslužba') : e.title; }
export function escapeHTML(text='') { return String(text ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function sortEvents(items) { return [...items].sort((a,b)=> `${a.event_date}T${a.start_time||'00:00'}`.localeCompare(`${b.event_date}T${b.start_time||'00:00'}`)); }
function demoSeeds() {
  const now = new Date();
  const sun = addDays(now,(7-now.getDay())%7);
  const mkService = (offset,index) => ({id:`demo-service-${index}`,event_type:'service',event_date:localDate(addDays(sun,offset)),start_time:'10:00',end_time:'',sermon_author:['Ukážkový rečník','Ukážková rečníčka','Hosť – ukážka'][index],sermon_title:['Nádej, ktorá nesklame','Spoločenstvo a povzbudenie','Viera v každodennom živote'][index],sermon_description:'Ilustračný opis hlavného slova. Po pripojení Supabase sa zobrazia skutočné údaje.',moderator_name:'Ukážkové meno',besiedka_leader:'Ukážková vedúca',worship_leader:'Ukážkový vedúci',title:'',description:'',responsible_person:'',is_published:true});
  return [mkService(0,0),mkService(7,1),mkService(14,2),{
    id:'demo-general-1',event_type:'general',event_date:localDate(addDays(now,3)),start_time:'18:00',end_time:'19:30',title:'Spoločné stretnutie – ukážka',responsible_person:'Ukážková osoba',description:'Toto je len ilustračná akcia na predstavenie vzhľadu kalendára.',is_published:true
  },{
    id:'demo-general-2',event_type:'general',event_date:localDate(addDays(now,10)),start_time:'16:30',end_time:'',title:'Stretnutie dobrovoľníkov – ukážka',responsible_person:'Ukážková osoba',description:'Príklad ďalšej pripravovanej aktivity.',is_published:true
  },{
    id:'demo-draft',event_type:'general',event_date:localDate(addDays(now,17)),start_time:'17:00',end_time:'',title:'Koncept udalosti – ukážka',responsible_person:'Ukážková osoba',description:'Tento koncept sa vo verejnom kalendári nezobrazuje.',is_published:false
  }];
}
function demoGet() {
  try { const stored = JSON.parse(localStorage.getItem(demoKey)); if (Array.isArray(stored)) return stored; } catch {}
  const seeds = demoSeeds(); localStorage.setItem(demoKey,JSON.stringify(seeds)); return seeds;
}
export async function fetchEvents(all=false) {
  if (!configured) return sortEvents(demoGet().filter(e=>all || e.is_published));
  const client = await getClient();
  let request = client.from('events').select('*').order('event_date', {ascending:true}).order('start_time', {ascending:true});
  if (!all) request = request.eq('is_published',true);
  const {data,error} = await request;
  if (error) throw error;
  return data || [];
}
export async function putEvent(entry,id=null) {
  if (!configured) {
    const list = demoGet();
    const item = {...entry,id:id||`demo-${Date.now()}`};
    const index = list.findIndex(x=>x.id === id);
    if (index >= 0) list[index] = item; else list.push(item);
    localStorage.setItem(demoKey,JSON.stringify(list)); return item;
  }
  const client = await getClient();
  const {data,error} = id
    ? await client.from('events').update(entry).eq('id',id).select().single()
    : await client.from('events').insert(entry).select().single();
  if (error) throw error;
  return data;
}
export async function removeEvent(id) {
  if (!configured) {
    localStorage.setItem(demoKey,JSON.stringify(demoGet().filter(e=>e.id!==id))); return;
  }
  const client = await getClient();
  const {error} = await client.from('events').delete().eq('id',id);
  if (error) throw error;
}
export function showToast(message,kind='success') {
  let el = document.getElementById('app-toast');
  if (!el) { el=document.createElement('div'); el.id='app-toast'; el.className='toast'; el.setAttribute('role','status'); document.body.appendChild(el); }
  el.textContent=message; el.className=`toast show ${kind}`;
  clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>el.classList.remove('show'),4100);
}

// Besiedka má vlastné záznamy aj oprávnenia; nezávisí od publikovania kázne.
function demoBesiedka() {
  try { const saved=JSON.parse(localStorage.getItem(besiedkaDemoKey)); if (Array.isArray(saved)) return saved; } catch {}
  const initial=demoGet().filter(e=>e.event_type==='service' && e.besiedka_leader).map(e=>({event_date:e.event_date,responsible_person:e.besiedka_leader}));
  localStorage.setItem(besiedkaDemoKey,JSON.stringify(initial));
  return initial;
}
export async function fetchBesiedka() {
  if (!configured) return demoBesiedka();
  const client=await getClient();
  const {data,error}=await client.from('besiedka_assignments').select('event_date,responsible_person,is_cancelled').order('event_date',{ascending:true});
  if(error) throw error;
  return data||[];
}
export async function putBesiedka(event_date,responsible_person,is_cancelled=false) {
  const person=String(responsible_person||'').trim();
  const cancelled=Boolean(is_cancelled);
  if(!configured) {
    const items=demoBesiedka().filter(e=>e.event_date!==event_date);
    if(person||cancelled)items.push({event_date,responsible_person:person,is_cancelled:cancelled});
    localStorage.setItem(besiedkaDemoKey,JSON.stringify(items));return;
  }
  const client=await getClient();
  if(!person&&!cancelled){const {error}=await client.from('besiedka_assignments').delete().eq('event_date',event_date);if(error)throw error;return;}
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user)throw new Error('Pre uloženie besiedky sa prihláste.');
  const {error}=await client.from('besiedka_assignments').upsert({event_date,responsible_person:person,is_cancelled:cancelled,updated_by:user.id},{onConflict:'event_date'});
  if(error)throw error;
}
export function combineWithSundays(rawEvents, besiedka, firstDate, lastDate) {
  const services=new Map(rawEvents.filter(e=>e.event_type==='service').map(e=>[e.event_date,e]));
  const assignments=new Map(besiedka.map(e=>[e.event_date,e]));
  const other=rawEvents.filter(e=>e.event_type!=='service');
  const cursor=parseDate(firstDate); const end=parseDate(lastDate);
  // Limitne kontrolovaný interval, bez generovania do nekonečna.
  while(cursor<=end){
    if(cursor.getDay()===0){
      const day=localDate(cursor);
      const base=services.get(day)||{id:`auto-service-${day}`,event_type:'service',event_date:day,start_time:'10:00',end_time:null,is_published:true,is_cancelled:false,sermon_author:'',sermon_title:'',sermon_description:'',moderator_name:'',worship_leader:''};
      const assigned=assignments.get(day);
      other.push({...base,start_time:'10:00',besiedka_leader:assigned?.is_cancelled?'':assigned?.responsible_person||'',besiedka_cancelled:Boolean(assigned?.is_cancelled)});
      services.delete(day);
    }
    cursor.setDate(cursor.getDate()+1);
  }
  for(const value of services.values()){const assigned=assignments.get(value.event_date);other.push({...value,start_time:'10:00',besiedka_leader:assigned?.is_cancelled?'':assigned?.responsible_person||'',besiedka_cancelled:Boolean(assigned?.is_cancelled)});}
  return sortEvents(other);
}
