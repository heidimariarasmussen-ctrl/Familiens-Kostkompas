(() => {
  const originalFetch = window.fetch.bind(window);
  const image = 'images/surdejsbroed-avocado-aeg-tomat-feta-kiwi.jpg';
  const common = {
    number: null,
    name: 'Surdejsbrød med avocado, æg, tomat, feta & kiwi',
    image,
    portion: '2 voksne + 2 små børn',
    active: 'ca. 15 min',
    total: 'ca. 15 min',
    freezer: 'Nej',
    tags: ['Næringstæt familieopskrift','surdejsbrød','avocado','æg','tomat','feta','kiwi','15 min'],
    description: 'Næringstæt familieopskrift med surdejsbrød, avocado, æg, tomat, feta og kiwi. Serveres dekonstrueret og alderssikkert til Sophia og Carlo.',
    ingredients: [
      '4 store skiver surdejsbrød, ca. 250–300 g',
      '5 æg',
      '2 modne avocadoer',
      '150 g cherrytomater',
      '40 g feta',
      '1 kiwi',
      '1–2 tsk frisk citronsaft',
      '10 g smør til stegning',
      'Frisk persille eller koriander, valgfrit',
      'Kun til de voksne: friskkværnet sort peber',
      'Kun til de voksne: chiliflager',
      'Kun til de voksne: evt. lidt ekstra jomfruolivenolie'
    ],
    steps: [
      'Avocado: Mos avocadoerne groft med citronsaft. Undlad salt.',
      'Tomat og kiwi: Halvér cherrytomaterne til de voksne. Skær børnenes tomater i små, alderssikre stykker. De kan eventuelt steges kort, så de bliver blødere. Skræl kiwi og skær den i små stykker til servering ved siden af.',
      'Æg: Steg æggene i smør ved middel-lav varme. Voksne får spejlæg med ønsket konsistens. Børnenes æg gennemtilberedes, men holdes bløde og saftige.',
      'Surdejsbrød: Rist voksenportionerne let sprøde. Børnenes brød serveres blødt eller kun ganske let ristet. Fjern meget hård skorpe efter behov.',
      'Avocado-æggecreme til børnene: Hak eller mos noget af det gennemtilberedte æg og bland med avocado til en blød creme.',
      'Voksenservering: Fordel avocado på surdejsbrødet. Top med cherrytomater, spejlæg, smuldret feta og persille/koriander. De voksne kan tilføje sort peber, chiliflager og eventuelt lidt ekstra jomfruolivenolie.'
    ],
    taste: 'De voksne kan afslutte med friskkværnet sort peber, chiliflager og eventuelt lidt ekstra jomfruolivenolie. Der tilsættes ikke ekstra salt.',
    child: 'Sophia og Carlo får retten dekonstrueret: blødt surdejsbrød i passende stykker, avocado-æggecreme, små stykker blød tomat, en lille mængde smuldret feta og kiwi ved siden af. Undgå chiliflager og ekstra salt. Børnenes æg gennemtilberedes, men holdes bløde og saftige.',
    tip: 'Børnenes brød kan serveres helt blødt eller kun ganske let ristet. Fjern meget hård skorpe efter behov.',
    why: [
      'Protein: Æg giver protein.',
      'Energi/stivelse: Surdejsbrød giver en tydelig energikilde.',
      'Fedt: Avocado og æg bidrager med fedt; de voksne kan eventuelt supplere med ekstra jomfruolivenolie.',
      'Frugt og grønt: Tomat, avocado og kiwi giver variation.',
      'C-vitamin: Især kiwi og tomat bidrager med C-vitamin.'
    ]
  };
  const breakfast = {...common, id:'morgenmad-surdejsbroed-avocado-aeg-tomat-feta-kiwi', category:'Morgenmad'};
  const lunch = {...common, id:'frokost-surdejsbroed-avocado-aeg-tomat-feta-kiwi', category:'Frokost'};
  const family = common.ingredients.slice();
  const adult = ['1 stor skive surdejsbrød, ca. 75 g','2 æg','1/2 moden avocado','50 g cherrytomater','15 g feta','1/2 kiwi','1/2–1 tsk frisk citronsaft','5 g smør til stegning','Frisk persille eller koriander, valgfrit','Friskkværnet sort peber','Chiliflager','Evt. lidt ekstra jomfruolivenolie'];
  const kids2 = ['2 mindre stykker blødt surdejsbrød, ca. 100–125 g i alt','1 æg','1 moden avocado','50 g cherrytomater','10 g feta','1/2 kiwi','1/2 tsk frisk citronsaft','5 g smør til stegning'];
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0] instanceof Request ? args[0].url : args[0]);
    if (url.includes('recipes.json')) {
      const data = await response.clone().json();
      if (!data.some(r => r.id === breakfast.id)) data.push(breakfast);
      if (!data.some(r => r.id === lunch.id)) data.push(lunch);
      return new Response(JSON.stringify(data), {status:response.status, statusText:response.statusText, headers:{'Content-Type':'application/json'}});
    }
    if (url.includes('portions-v3.json')) {
      const data = await response.clone().json();
      data[breakfast.id] = {name:common.name, adult, kids2, family};
      data[lunch.id] = {name:common.name, adult, kids2, family};
      return new Response(JSON.stringify(data), {status:response.status, statusText:response.statusText, headers:{'Content-Type':'application/json'}});
    }
    return response;
  };
})();