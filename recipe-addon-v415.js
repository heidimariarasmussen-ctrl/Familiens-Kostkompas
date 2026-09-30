// V4.15 · Ekstra kuraterede opskrifter uden særskilt UI-logik.
// Udvider de eksisterende recipes.json/portions-v3.json-responser, så resten af appen
// bruger præcis samme bibliotek, madplan, opskriftsvisning, portions- og indkøbslogik.
(()=>{
const recipe={
  id:'aftensmad-kyllingebowl-soed-kartoffel-guacamole',
  category:'Aftensmad',number:null,
  name:'Kyllingebowl med sød kartoffel, rød peberfrugt, guacamole, creme fraiche og nachos',
  image:'images/kyllingebowl-soed-kartoffel-guacamole.jpg',
  portion:'2 voksne + 2 små børn',active:'ca. 20 min',total:'ca. 30–35 min',
  freezer:'Delvist',
  tags:['Kylling','sød kartoffel','rød peberfrugt','guacamole','børnevenlig','bowl'],
  description:'Saftig mild kylling med blød sød kartoffel og rød peberfrugt, serveret med guacamole, creme fraiche og lidt nachos. En farverig, børnevenlig bowl med protein, energi, grønt og gode fedtkilder.',
  ingredients:[
    '700 g søde kartofler','2 røde peberfrugter, ca. 300 g','1½ spsk ekstra jomfruolivenolie til grøntsagerne','½ tsk mild paprika til grøntsagerne',
    '500 g kyllingelårfilet','1 spsk ekstra jomfruolivenolie til kyllingen','1 tsk mild paprika til kyllingen','½ tsk spidskommen','½ tsk hvidløgspulver','Lidt salt til de voksne efter servering',
    '2 modne avocadoer','1–2 tsk frisk limesaft','1 spsk creme fraiche til guacamolen','150 g creme fraiche til servering','50–75 g nachos/tortillachips','Evt. lime til de voksne'
  ],
  steps:[
    'Tænd ovnen på 210 °C varmluft. Skræl de søde kartofler og skær dem i ca. 2 cm tern. Vend dem med ca. 1 spsk ekstra jomfruolivenolie og ½ tsk mild paprika. Fordel dem på en bageplade og bag dem i 25–30 minutter.',
    'Skær peberfrugterne i mindre stykker og vend dem med den resterende ½ spsk olivenolie. Når kartoflerne har fået ca. 10 minutter, tilsættes peberfrugten til bagepladen. Bag videre i ca. 15–20 minutter, til både sød kartoffel og peberfrugt er helt møre.',
    'Mos avocadoerne med limesaft og 1 spsk creme fraiche. Tag gerne børnenes portion fra først. De voksnes guacamole kan derefter smages til med lidt salt og ekstra lime.',
    'Skær kyllingelårfileterne i små, tynde og mundrette stykker. Vend dem med 1 spsk ekstra jomfruolivenolie, 1 tsk mild paprika, spidskommen og hvidløgspulver.',
    'Steg kyllingen på en stor pande ved middelhøj varme i ca. 6–9 minutter, til den er gennemstegt, men stadig saftig og blød. Undgå at stege den så hårdt, at stykkerne bliver tørre eller får en hård skorpe.',
    'Fordel sød kartoffel, rød peberfrugt og kylling i skåle. Server med guacamole, creme fraiche og lidt nachos. De voksnes portion kan afsluttes med frisk lime.'
  ],
  taste:'Mild guacamole: 2 avocadoer + 1–2 tsk frisk limesaft + 1 spsk creme fraiche. Server ekstra creme fraiche som dip. Nachos bruges som en lille attraktiv og genkendelig komponent.',
  child:'Server gerne komponenterne hver for sig: bløde søde kartoffeltern, helt mør rød peberfrugt, små saftige og bløde kyllingestykker, guacamole og creme fraiche som dip samt 1–2 nachos i håndterbare stykker under opsyn. Hold børnenes portion mild og tilsæt eventuelt salt til de voksnes portion efterfølgende.',
  tip:'Kyllingelårfilet er valgt for en saftig og blød konsistens. Retten fungerer godt som komponentmåltid, så børnene selv kan vælge mellem de enkelte dele.',
  why:[
    'Kylling giver protein.','Sød kartoffel giver energi og stivelse.','Rød peberfrugt giver grøntsagsvariation og C-vitamin.','Avocado og ekstra jomfruolivenolie bidrager med fedt.','Guacamole og creme fraiche gør retten saftig og giver mulighed for dip.','Nachos fungerer som en lille attraktiv og genkendelig komponent, mens hovedparten af måltidet fortsat består af råvarer.'
  ]
};
const portions={
  name:recipe.name,
  adult:['230 g søde kartofler','1/2–1 rød peberfrugt','165 g kyllingelårfilet','2/3 avocado','50 g creme fraiche','20–25 g nachos/tortillachips','Ekstra jomfruolivenolie, mild paprika, spidskommen, hvidløgspulver og lime efter opskriften'],
  kids2:['240 g søde kartofler','1/2 rød peberfrugt','170 g kyllingelårfilet','2/3 avocado','50 g creme fraiche','15–25 g nachos/tortillachips','Ekstra jomfruolivenolie, milde krydderier og lime efter opskriften'],
  family:recipe.ingredients
};
const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  const res=await nativeFetch(input,init);let path='';try{path=new URL(typeof input==='string'?input:input.url,location.href).pathname}catch(_e){}
  if(path.endsWith('/recipes.json')){const data=await res.clone().json();if(Array.isArray(data)&&!data.some(r=>r.id===recipe.id)){data.push(recipe);return new Response(JSON.stringify(data),{status:res.status,statusText:res.statusText,headers:{'Content-Type':'application/json'}})}}
  if(path.endsWith('/portions-v3.json')){const data=await res.clone().json();if(data&&typeof data==='object'&&!data[recipe.id]){data[recipe.id]=portions;return new Response(JSON.stringify(data),{status:res.status,statusText:res.statusText,headers:{'Content-Type':'application/json'}})}}
  return res;
};
})();