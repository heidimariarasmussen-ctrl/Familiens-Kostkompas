# Familiens Kostkompas V2.2 – installérbar PWA

Denne version er gjort til en Progressive Web App (PWA).

## Nyt
- kan installeres på telefonens hjemmeskærm
- åbner i egen app-visning uden normal browserramme
- app-ikon med Kostkompas-identitet
- service worker og offline-cache
- favoritter, madplan og indkøbsflueben gemmes lokalt
- fungerer fortsat uden betalt backend

## Test lokalt
PWA-funktioner kræver http/https og virker ikke korrekt ved bare at dobbeltklikke på index.html.

Fra mappen:
python3 -m http.server 8000

Åbn:
http://localhost:8000

## Installation
### iPhone / iPad
Åbn den publicerede side i Safari → Del → Føj til hjemmeskærm.

### Android / Chrome
Åbn siden → browsermenu → Installer app / Føj til startskærm.

## Gratis publicering
Dette er et statisk site og kan gratis hostes på fx GitHub Pages, Cloudflare Pages eller Netlify.
Når siden ligger på HTTPS, virker PWA-installation og offline-cache korrekt.

## Begrænsning i denne version
Data gemmes lokalt på hver enhed. Det betyder, at favoritter og madplan ikke automatisk synkroniserer mellem to telefoner endnu.

Opdateret 1. september 2026
