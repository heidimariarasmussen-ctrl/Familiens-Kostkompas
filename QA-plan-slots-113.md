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
3. Revider familieportioner og børneegnethed for tidligere personlige voksenopskrifter, som nu er åbne for alle: alex-havregryn-maelk-rosiner, v417-1, v417-3, comfort-lun-bolle-smoer. De har kun adult-portion i portions-v3.json. Varm Apple Pie Chiagrød indeholder bl.a. proteinpulver og evt. valnødder; særskilt alderssikker børnevariation kræves.
4. Kontrollér, at familiedelene af portionerne fra runtime-tilføjelserne bliver lagt på af addon-scripts før app.js indlæser data.
5. Funktionstest automatisk genereret plan: De oprindelige forslags-puljer er bevidst bevaret, og udvidet manuel synlighed må ikke ændre ernæringsfilteret.
6. Frigiv kun efter ny udtrykkelig brugeraccept.

Denne fil er QA-status og ændrer ikke brugerdata.
