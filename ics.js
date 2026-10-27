// Export verejných udalostí do štandardného kalendára iCalendar.
// Samostatný súbor prehliadača: neobsahuje kľúče ani interné účty.
import {combineWithSundays, localDate, addDays} from './shared.js?v=11';

const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escapeText = value => String(value ?? '').replace(/\r\n?/g, '\n').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const clock = value => String(value || '').replace(/[^0-9]/g, '').padEnd(6, '0').slice(0, 6);
const dt = (iso, time) => `${iso.replace(/-/g, '')}T${clock(time)}`;
function fold(line) {
  let parts=[''], bytes=0;
  const encoder = new TextEncoder();
  for (const symbol of line) {
    const size=encoder.encode(symbol).length;
    if (bytes + size > 75) {parts.push(' ');bytes=1;}
    parts[parts.length-1] += symbol;
    bytes += size;
  }
  return parts.join('\r\n');
}
export function buildICS(rawEvents, besiedka, firstDate, lastDate, timestamp=new Date()) {
  const combined=combineWithSundays(rawEvents.filter(e=>e.is_published),besiedka,firstDate,lastDate)
    .filter(e=>e.event_date>=firstDate&&e.event_date<=lastDate);
  const lines=[
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//KZ Trencin//Kalendar udalosti//SK',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+escapeText('KZ Trenčín – udalosti'),
    'X-WR-TIMEZONE:Europe/Bratislava',
    'BEGIN:VTIMEZONE','TZID:Europe/Bratislava','X-LIC-LOCATION:Europe/Bratislava',
    'BEGIN:DAYLIGHT','TZOFFSETFROM:+0100','TZOFFSETTO:+0200','TZNAME:CEST',
    'DTSTART:19700329T020000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU','END:DAYLIGHT',
    'BEGIN:STANDARD','TZOFFSETFROM:+0200','TZOFFSETTO:+0100','TZNAME:CET',
    'DTSTART:19701025T030000','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','END:STANDARD',
    'END:VTIMEZONE'
  ];
  for(const e of combined) {
    const sunday=e.event_type==='service';
    const uid=sunday?`bohosluzba-${e.event_date}@kz-trencin-kalendar`:`akcia-${e.id}@kz-trencin-kalendar`;
    const title=sunday?(e.is_cancelled?'Bohoslužba zrušená':`Bohoslužba${e.sermon_title?' – '+e.sermon_title:''}`):e.title;
    const category=sunday?'':(e.event_category==='Skupinka'&&e.event_group?`Skupinka – ${e.event_group}`:e.event_category||'Iná akcia');
    const desc=sunday?(e.is_cancelled?'Bohoslužba sa túto nedeľu nekoná.':[
      e.sermon_title&&`Hlavné slovo: ${e.sermon_title}`,
      e.sermon_author&&`Rečník: ${e.sermon_author}`,
      e.sermon_description,
      e.moderator_name&&`Moderovanie: ${e.moderator_name}`,
      e.besiedka_cancelled?'Besiedka: zrušená':e.besiedka_leader&&`Besiedka: ${e.besiedka_leader}`,
      e.worship_leader&&`Vedenie chvál: ${e.worship_leader}`
    ].filter(Boolean).join('\n')):[`Druh: ${category}`,e.description,e.responsible_person&&`Zodpovedná osoba: ${e.responsible_person}`].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+stamp(timestamp),
      'DTSTART;TZID=Europe/Bratislava:'+dt(e.event_date,sunday?'10:00':e.start_time),
      'SUMMARY:'+escapeText(sunday?title:`${category}: ${title}`),'DESCRIPTION:'+escapeText(desc));
    if(e.end_time)lines.push('DTEND;TZID=Europe/Bratislava:'+dt(e.event_date,e.end_time));
    if(e.is_cancelled)lines.push('STATUS:CANCELLED');
    else lines.push('STATUS:CONFIRMED');
    if(e.updated_at)lines.push('LAST-MODIFIED:'+stamp(new Date(e.updated_at)));
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n')+'\r\n';
}
export function nextYearICS(rawEvents,besiedka) {
  const today=new Date();
  return buildICS(rawEvents,besiedka,localDate(addDays(today,-31)),localDate(addDays(today,548)));
}
