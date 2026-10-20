# QA og frigivelsesblokering – 113 kategoriseringsvalg

Status: Arbejdsgren alene. Ingen merge, publicering eller Supabase-mutation.

## Kontroller udført
- Præcis 113 unikke regler; 111 fra recipes.json + to runtime-tilføjelser
- Ingen ukendte eller tomme måltidsplaceringer
- Præcis 13 regler med voksenbegrænsning
- Forventede valgmuligheder: fælles/børn 45 morgen, 87 frokost, 62 aften, 45+45 snacks; hver voksen 48/89/63/54/54
- Appen indlæser regelscriptet før app.js
- Begge fleksible vælgere, fælles manuel vælger og Planlæg i dag anvender slot-filter
- Eksisterende opskrifts-ID'er og gemmelogik er ikke ændret
- Service worker-cache versionsskift

## Skal være gennemført før merge
1. Eksportér aktiv Supabase plan_data, historik og egne opskrifter med autoriseret brugersession. Gem et særskilt genopretteligt backup. **Ikke udført.**
2. Kør browser/E2E-test på isoleret testinstans, inkl. eksisterende fælles/individuel plan, rester, portioner, indkøb, genindlæsning og mobilcache. **Ikke udført.**
3. [AFKLARET I TREDJE TESTFASE] Familieportioner og børneegnethed er nu opdateret for: alex-havregryn-maelk-rosiner, v417-1, v417-3, comfort-lun-bolle-smoer. De havde kun adult-portion før rettelsen; børne-/familieportioner og særskilte serveringsanvisninger er nu indført og datakontrolleret.
4. Kontrollér, at familiedelene af portionerne fra runtime-tilføjelserne bliver lagt på af addon-scripts før app.js indlæser data.
5. Funktionstest automatisk genereret plan: De oprindelige forslags-puljer er bevidst bevaret, og udvidet manuel synlighed må ikke ændre ernæringsfilteret.
6. Frigiv kun efter ny udtrykkelig brugeraccept.

Denne fil er QA-status og ændrer ikke brugerdata.

## Ekstra validering (anden testfase)
- 113 regler verificeret mod den godkendte rækkefølge; 13 voksenbegrænsede, ingen ukendte måltidsnøgler.
- Forventet synlighed: fælles/børn 45/87/62/45/45; pr. voksen 48/89/63/54/54.
- Fire tidligere voksenopskrifter har kun `adult` i `portions-v3.json`: `alex-havregryn-maelk-rosiner`, `v417-1`, `v417-3`, `comfort-lun-bolle-smoer`. Dette var en frigivelsesblokering; rettet og datakontrolleret i tredje testfase.
- `v417-1` (Apple Pie Chiagrød) indeholder proteinpulver og har udtrykkelig børneadvarsel; en særskilt børnevariant og tilsvarende indkøbsberegning er nu indført; browsertest udestår. `v417-3` har en fejlagtig børneadvarsel om proteinpulver, selvom ingredienslisten ikke har proteinpulver; dette skal gennemgås.
- Browser/E2E og autentificeret eksport af privat cloudplan er stadig ikke udført; ingen Supabase-forespørgsler er sendt.

## Tredje testfase – portions- og indkøbskonsistens
- Opdateret `portions-v3.json`, `shopping-v4.json` og børneanvisninger i `recipes.json` for alle fire tidligere voksenopskrifter.
- Automatisk datakontrol: `adult`, `kids2`, `family` findes for alle fire; alle strukturerede familieposter er summen af to voksne og to-børns-portion (repræsenteret ved `kids2`). Ingen differencer i de kontrollerede poster.
- Barnets Apple Pie-indkøb (`kids2`) har ingen `protein_powder`. Opskriftstrinene kræver opdeling før proteinpulver tilsættes til voksne. Børnenes æble er blødt/revet; ingen hele/hakkede nødder.
- Testet regelgrundlag: 113 regler, 111 baseret på `recipes.json` og to indlæst via runtime-addons. Ingen produktionsdata rørt.

## Sikker backup-procedure (skal udføres af autoriseret indlogget ejer, før merge)
1. Benyt en privat/autentificeret session eller Supabase-projektets dashboard; lav en eksport af den aktuelle `active_plan`-rækkes `plan_data` (id 1) og `updated_at` som JSON og noter eksporttid. Denne kan indeholde personlige data; opbevar den privat, ikke i GitHub eller en offentlig issue/PR.
2. Sammenhold eksporten med den aktive madplan på hjemmesiden, inkl. fleksible tildelinger, rester, `customRecipes`, `planHistory`, `shoppingChecks`, `pantryState` og `recipeFeedback`. Kontrollér at backupen kan parses og at felterne findes, hvor de forventes.
3. Eksportér eventuelt browserlokale data på den relevante enhed separat, især `kostkompas-current-plan`, egne opskrifter, favoritter og feedback (som ikke nødvendigvis er dækket af én cloud-eksport). Udlever aldrig adgangskoder, adgangstokens eller sessionsnøgler.
4. Test gendannelse på en isoleret testinstans eller ved offline-læsning af backupen, aldrig ved overskrivning af produktionsrækken. Tag en ny backup umiddelbart før enhver senere godkendt udrulning.
5. Stop udrulning hvis autentificeret sikkerhedskopi eller prøveindlæsning ikke kan verificeres.

## Resterende frigivelsesblokering
Fuld browser/E2E-test på isoleret instans med fixture for gammel fælles og fleksibel madplan, rester, indkøb og cache/mobil. Backend-eksport kræver autoriseret ejeradgang og er **ikke foretaget**. Der er ikke foretaget merge, deploy eller ændring af produktionsdata.

## Fjerde testfase – isolerede data-/kontrakttests
- 39 af 39 kontroller bestået på arbejdsgrenens filer (regelantal, målgrupper, hver af de fem slot-tællinger for fælles/Alex/Heidi/børn, portionsdata, indkøbs-summer, barnets chia uden proteinpulver, eksisterende fixture-ID'er og relevante kompatibilitetskontrakter i app.js).
- To syntetiske fixture-eksempler (gammel fælles og fleksibel plan) er kontrolleret for opskrifts-ID-opslag. Dette er **ikke** en fuld browserafvikling eller en test af rigtig privat plan_data.
- Forsøg på at hente den isolerede gren til lokal Chromium-test fejlede pga. netværksadgang i kørselsmiljøet. Den offentlige GitHub Pages-adresse peger på main og er ikke en egnet test af arbejdsgrenen. Browser/E2E er fortsat uafsluttet.
- Backup af produktionsdata er **ikke udført**. Den autoriserede ejer skal eksportere privat via Supabase dashboard og separat gennemgå relevante browserlokale data før merge; ingen tokens eller private data må lægges i GitHub.
- Fortsat **DO NOT MERGE / DO NOT DEPLOY** uden brugers særskilte godkendelse og afsluttet QA.
