// Zdroj dát: verejný slovenský meninový kalendár (viď NAVOD_V9.md).
// Dáta sa sťahujú iba pri práci s osobami v administrácii. Verejnej stránke
// nikdy netreba posielať zoznam členov ani ich dátumy narodenia.
const SOURCE='https://raw.githubusercontent.com/zoltancsontos/slovak-name-days-json/master/slovak-nameday-list.json';
let cached=null;
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sk-SK').trim();}
function valid(month,day){return Number.isInteger(month)&&Number.isInteger(day)&&month>=1&&month<=12&&day>=1&&day<=new Date(2024,month,0).getDate();}
function extractCalendar(data){
  if(!data || typeof data!=='object') throw new Error('Neplatný formát meninového kalendára.');
  const entries=new Map();
  // Dataset má mesiace číslované od nuly, dni od jednotky.
  for(let month=1;month<=12;month++){
    const days=data[String(month-1)]; if(!days) throw new Error('Meninový kalendár je neúplný.');
    for(const [dayText,list] of Object.entries(days)){
      const day=Number(dayText); if(!valid(month,day))continue;
      for(const label of String(list||'').split(/[,;/]/)){
        const name=normalize(label); if(!name||name.includes('sviatok')||name.includes('rok'))continue;
        if(!entries.has(name))entries.set(name,{month,day});
      }
    }
  }
  if(entries.size<250)throw new Error('Meninový kalendár má neúplné údaje.');
  return entries;
}
export async function lookupNameDay(firstName){
  if(!cached){
    const response=await fetch(SOURCE,{cache:'force-cache'});
    if(!response.ok)throw new Error('Nepodarilo sa načítať verejný kalendár menín.');
    cached=extractCalendar(await response.json());
  }
  return cached.get(normalize(firstName))||null;
}
export function validMonthDay(month,day){return valid(month,day);}
export function displayMonthDay(month,day){return valid(month,day)?`${day}. ${month}.`: 'Neznáme';}
