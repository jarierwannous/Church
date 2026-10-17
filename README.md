# Kresťanský zbor Trenčín – kalendár udalostí

Responzívny dvojstránkový kalendár (verejnosť + schválení editori). Bez frameworkov a build kroku, vhodný na **GitHub Pages** alebo bežný statický hosting. Supabase poskytuje databázu a prihlasovanie.

## Obsah

- `index.html` – verejný mesačný kalendár s filtrami, detailom udalostí a zoznamom najbližších akcií.
- `admin.html` – prihlasovanie, zoznam zverejnených udalostí a konceptov, pridávanie, úpravy a odstránenie.
- `config.js` – údaje o Supabase projekte, zámerne prázdne.
- `shared.js`, `public.js`, `admin.js`, `styles.css` – aplikácia a vzhľad.
- `schema.sql` – vytvorenie tabuliek, kontrol dát a databázové oprávnenia (RLS).

## 1. Pozrite si ukážku

Bez konfigurácie sa zobrazujú **výslovne označené ilustračné udalosti**. V administračnej ukážke môžete údaje pridať, meniť a mazať; uložia sa iba do `localStorage` vo vašom prehliadači. NIE JE to skutočná databáza ani zabezpečená produkčná administrácia.

Pre lokálnu ukážku spustite v tomto adresári:

```bash
python3 -m http.server 8000
```

V prehliadači otvorte `http://localhost:8000/` a `http://localhost:8000/admin.html`.

## 2. Vytvorte Supabase projekt

1. Založte projekt na <https://supabase.com>.
2. V **SQL Editor** spustite celý obsah `schema.sql` (v novom, prázdnom projekte).
3. V **Authentication → Users** založte osobné účty pre oprávnených editorov. Verejná registrácia sa na stránke neponúka. Odporúčame v nastavení Supabase zakázať samoobslužnú registráciu, ak ju projekt nepotrebuje, a používať silné heslá.
4. Skopírujte **UUID** konkrétneho používateľa. V **SQL Editor** spustite napríklad:

```sql
insert into public.editors (user_id, display_name)
values ('UUID-POUZIVATELA-Z-AUTH-USERS', 'Zodpovedná osoba');
```

   Potom analogicky pridajte každého ďalšieho editora. Na zablokovanie účtu v kalendári stačí `is_active=false` (alebo odstránenie z tabuľky `editors`). **Samotné prihlásenie do Supabase nedáva právo zapisovať udalosti**.

5. V **Project Settings / Connect / API Keys** nájdite **Project URL** a **publishable key** (prípadne starší `anon` public key). Vložte ich do `config.js`:

```js
window.CHURCH_CONFIG = {
  SUPABASE_URL: 'https://VAS_PROJEKT.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_...'
};
```

**Nikdy nevkladajte `service_role`, `sb_secret_...` ani iný tajný kľúč do HTML alebo `config.js`.** Publikovateľný kľúč môže byť vo verejnom kóde, pretože skutočnú autorizáciu vynucuje databázové Row Level Security.

## Keď stránka napriek nastaveniu zobrazuje ukážkový režim

Aktualizovaná verzia ukazuje **konkrétny dôvod** priamo pod horným oranžovým oznamom.
Ukážkový režim znamená, že klient nenačítal platnú konfiguráciu. Nie je spôsobený prázdnou databázou ani nesprávne vytvoreným editorom.

1. Na zverejnenom webe otvorte adresu `.../config.js` (v tom istom adresári ako `index.html`). Musíte vidieť **aktuálne** hodnoty z vášho projektu, nie dve prázdne úvodzovky. Ak nie, nahrajte/commitnite nový súbor `config.js` do správneho repozitára, vetvy a priečinka, z ktorého GitHub Pages publikuje.
2. Uistite sa, že názvy vlastností sú presne `SUPABASE_URL` a `SUPABASE_PUBLISHABLE_KEY`. Pre starší verejný anon kľúč možno použiť aj `SUPABASE_ANON_KEY`. Nepoužívajte `sb_secret_` ani `service_role`.
3. Obnovte stránku bez cache (**Ctrl + Shift + R**) alebo skúste anonymné okno.
4. V prehliadači otvorte **F12 → Console** a zadajte `window.CHURCH_CONFIG`. Ak sa objaví `undefined`, `config.js` sa nenačítal alebo má syntaktickú chybu. Ak sa objavia prázdne hodnoty, web číta starú verziu. **Nekopírujte kľúče ani celý výpis konzoly do verejného chatu.**
5. Ak oranžový oznam zmizne, ale kalendár sa nenačítava, konfigurácia už funguje: následne skontrolujte v **F12 → Console / Network** pripojenie Supabase, stav API a chyby RLS. Prázdna tabuľka udalostí má zobraziť prázdny kalendár, nie demo údaje.

> Pozor: zmeny v `config.js` nezmenia už vydaný web automaticky. Na GitHub Pages je potrebné nový súbor skutočne nahrať do publikačnej vetvy a počkať na dokončenie nasadenia. **Secret key nikdy nevkladajte do verejne prístupného súboru.**

## 3. Zverejnenie na GitHub Pages

Nahrajte súbory (bez zmeny adresárovej štruktúry) do repozitára a aktivujte **Settings → Pages → Deploy from a branch**, vetvu a adresár podľa uloženia súborov. Web je statický, serverovú časť poskytuje Supabase. `index.html` je verejný; `admin.html` sa dá navštíviť, ale **po pripojení Supabase** umožní prácu iba prihláseným a schváleným editorom.

GitHub Pages beží na HTTPS. Pri inom hostingu tiež používajte HTTPS. Názov domény ani odkaz na `admin.html` nie je ochrana: bezpečnosť stojí na Supabase Auth + RLS.

## 4. Čo môže editor robiť

- **Nedeľná bohoslužba:** vyberie nedeľu, zadá čas, rečníka, názov a opis kázne, moderátora, zodpovednú osobu za besiedku a zodpovednú osobu za vedenie chvál. Pre každý dátum môže byť práve jeden záznam bohoslužby. Inú udalosť však možno zapísať aj na nedeľu.
- **Iná akcia:** vyberie ľubovoľný dátum a čas, zadá názov, zodpovednú osobu a opis.
- Čas konca je nepovinný, ale ak je zadaný, musí byť po začiatku (jednodňové akcie).
- **Zverejniť udalosť:** keď je vypnuté, uloží sa koncept viditeľný iba editorom. Pri zapnutí sa zobrazuje verejne.
- Všetci schválení editori v tejto verzii môžu upravovať a mazať všetky udalosti.

## Súčasné limity

- Neobsahuje automatické opakovanie bohoslužieb, e-mailové notifikácie, rezervácie, prílohy ani kalendárovú synchronizáciu.
- Záznamy sú pre jeden dátum a miestny čas. Nie je tu evidované miesto konania – informáciu možno uviesť v opise inej akcie.
- Bez Supabase je len demo. Aplikácia **nie je** pripojená k žiadnemu existujúcemu projektu.
- `schema.sql` je pripravený na prvotnú inštaláciu do novej databázy, nie ako idempotentná migrácia.

## Bezpečnosť

Databáza používa RLS: návštevníci vidia len publikované záznamy, prihlásení nepoverení používatelia ich nevedia meniť a koncepty nevidia; pridať a upraviť môžu iba účty v `public.editors` s `is_active=true`. Prístupové údaje neprichádzajú do nášho servera, ale cez Supabase Auth. Žiadny `service_role` kľúč nie je potrebný v prehliadači. Po nasadení odporúčame otestovať anonymný prístup a nesprávne oprávnenia na čerstvom projekte.
