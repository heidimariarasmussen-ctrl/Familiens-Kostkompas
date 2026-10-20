# Makroberegning i Kostkompasset — én voksen (v1)

Dette er et **vejledende estimat**, ikke analyserede eller verificerede deklarationsværdier.

## Datagrundlag
- Kostkompassets egne opskrifter og portionsangivelser er styrende. Hvor der findes strukturerede `adult`-rækker, bruges mængderne i `shopping-v4.json`; de modsvarer voksenportioner i `portions-v3.json`.
- `nutrition-adult-v1.js` har en gennemsigtig liste med 107 **repræsentative, afrundede næringsprofiler**, ikke en eksakt eller automatisk import af DTU Frida. Produkternes aktuelle etiketter må have forrang ved senere finjustering. DTU beskriver den relevante danske reference: https://frida.fooddata.dk/
- Energi anslås til `4 × protein (g) + 4 × tilgængeligt kulhydrat (g) + 9 × fedt (g)`, afrundet til nærmeste 5 kcal. Makroerne afrundes til 0,1 gram. E% beregnes af uafrundede makroer og summerer til 100%.
- Kostfibre, ikke-nærende sødestoffer og polyoler er ikke særskilt energiopgjort i dette første estimat. Særligt sukkerfri chokolade, chiafrø og andre fiberrige produkter kan derfor afvige fra emballagens kcal.
- Tallene vises som en fast reference for **1 voksen** på opskriftssiden, uafhængigt af om planen er fælles, individuel eller opskriftens ingrediensvisning står på dobbelt portion. Der beregnes ikke børnebehov eller daglige kalorimål.

## Vigtige standardantagelser
- Mælk eller vand som alternativ: vand regnes som standard, når indkøbs-/voksenmængden ikke særskilt specificerer mælk. Valgt mælk ændrer tallet. Mælken i de to voksne Apple Pie-/proteingrødopskrifter indgår.
- Valgfrie toppings (f.eks. ekstra nøddesmør, ekstra olivenolie, ekstra chokolade, pynt og ekstra sauce) er ikke medtaget.
- Standardvægte, når mængden er angivet i stk./skive: fx æg 55 g spiseligt, banan 110 g, avocado 140 g spiselig del, kiwi 75 g, lille skive rugbrød 40 g. Det er antagelser og ikke vægten af hver faktisk vare.
- `frokost-4`: vælger 50 g tilberedt kylling som reference for valget 'rester af laks, kylling eller kød'. `heidi-rugbroed-koldroeget-laks`: voksenportionen specificerer 75 g rugbrød, og den vægt har forrang frem for generisk skivevægt.
- `bornefavorit-1`: 1 af ca. 14 små Bamseboller. `bornefavorit-2`: voksenreferenceservering ca. 30 g kiks, anslået 1/10 af dejen. `bornefavorit-3`: 4 af ca. 20 minipandekager.
- `mellemmaltid-banan-blaabaermuffins-mandelsmoer`: 2 af ca. 12 små muffins, med vand i varianten 'vand eller mælk'.
- De familieopskrifter, som endnu kun har en hel familieportion, regnes foreløbig som **1/3 af familieopskriften for én voksen** (de to børn deler anslået den sidste tredjedel). Herved fremgår antagelsen tydeligt i den enkelte opskrift. Ingredienser i alle tilbehør, som er angivet som en del af retten, indgår.
- Kyllingebowl og surdejsbrødsmad bruger deres specificerede voksenportioner i runtime-tillæggene og tydeligt deklarerede estimater for olien/nachos i bowlen.

## Tre opskrifter med variable tal
- `frokost-1` Restetallerkenen med dagens dip
- `aftensmad-15` Tøm-køleskabet-tallerken med passende basisdip
- `mellemmaltid-10` Mini-restetallerken med basisdip

De har **ikke** faste kcal eller makrotal, fordi indholdet afhænger af de faktiske rester. Værdier skal først beregnes fra de konkrete valgte rester, ikke opfindes ved at vælge et arbitrært standardmåltid.

## Kvalitetskontrol og release
- Sidecar-oversigt i `nutrition-adult-overview.csv` indeholder samtlige 113 opskrifts-ID'er, 110 estimerede og 3 variable.
- Offline-regressionstest: `node tests/nutrition-adult.test.cjs`.
- Hverken databasefelter, eksisterende madplaner, cloudsynkronisering eller børneportioner ændres af dette UI-tiltag.
- Ændringerne forbliver på `feature/adult-macros-113`, indtil brugeren godkender separat merge og offentliggørelse.
