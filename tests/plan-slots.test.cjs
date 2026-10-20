// Run locally: node tests/plan-slots.test.cjs
// Read-only: no browser session, credentials, network, Supabase or production writes.
const fs=require('node:fs'), assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const data=f=>JSON.parse(read(f));
const code=read('plan-recipe-rules-v1.js');
const rules=JSON.parse(code.match(/Object\.freeze\(([\s\S]*?)\);\s*$/)[1]);
const recipes=data('recipes.json'), portions=data('portions-v3.json'), shopping=data('shopping-v4.json');
const ids=Object.keys(rules), slots=['breakfast','lunch','dinner','snackMorning','snackAfternoon'];
const adultIds=['heidi-skyr-yoghurt-protein-chia','morgenmad-proteinrig-overnight-oats-chia','v417-2','heidi-rugbroed-koldroeget-laks','comfort-yoghurt-chokolademousse','comfort-lettere-yoghurt-chokolademousse','comfort-fudgy-brownie','comfort-brownie-valnoedder','comfort-chokoladekage-frosting','comfort-chokolade-kokos-bites','comfort-chokolade-crunch','comfort-graesk-yoghurt-kakao-baer','comfort-bolle-chokolade'];
assert.equal(ids.length,113);assert.equal(new Set(ids).size,113);
assert(recipes.every(r=>rules[r.id]),'All base recipe IDs must resolve');
assert.deepEqual(ids.filter(id=>rules[id].audience==='adults').sort(),adultIds.sort());
for(const r of Object.values(rules)){assert(r.slots.length);assert.equal(new Set(r.slots).size,r.slots.length);assert(r.slots.every(s=>slots.includes(s)))}
const expected={shared:[45,87,62,45,45],kids:[45,87,62,45,45],alex:[48,89,63,54,54],heidi:[48,89,63,54,54]};
for(const [target,numbers] of Object.entries(expected)){slots.forEach((slot,i)=>{const matches=Object.values(rules).filter(r=>r.slots.includes(slot)&&(r.audience==='family'||target!=='shared'&&(r.audience===target||r.audience==='adults'&&['alex','heidi'].includes(target))));assert.equal(matches.length,numbers[i],target+' '+slot)})}
for(const id of ['alex-havregryn-maelk-rosiner','v417-1','v417-3','comfort-lun-bolle-smoer']){
 for(const key of ['adult','kids2','family']){assert(portions[id]?.[key]?.length,id+' '+key+' portion');assert(shopping[id]?.[key]?.length,id+' '+key+' shopping')}
 for(const row of shopping[id].family){if(row.id==='spice_cinnamon')continue;const total=shopping[id].adult.filter(x=>x.id===row.id&&x.unit===row.unit).reduce((n,x)=>n+2*x.amount,0)+shopping[id].kids2.filter(x=>x.id===row.id&&x.unit===row.unit).reduce((n,x)=>n+x.amount,0);assert.equal(row.amount,total,id+' '+row.id)}
}
assert(!shopping['v417-1'].kids2.some(x=>x.id==='protein_powder'));
const app=read('app.js'), html=read('index.html'),sw=read('sw.js');
assert(html.indexOf('plan-recipe-rules-v1.js')<html.indexOf('src="app.js"'));
assert(app.includes('function recipeAllowedForPlanSlot(r,key,target)'));
assert(app.includes("if(id){const fresh=recipes.find(r=>r.id===id);if(fresh)return fresh}"));
assert(sw.includes("'./plan-recipe-rules-v1.js'"));
// Synthetic IDs from an old shared plan and an old flexible plan, checked without saving/migrating.
const oldShared={planType:'shared',items:[{breakfast:{id:'morgenmad-1'},lunch:{id:'frokost-1'},dinner:{id:'aftensmad-1'},snackMorning:{id:'mellemmaltid-1'},snackAfternoon:{id:'mellemmaltid-2'}}]};
const oldFlex={planType:'flex',items:[{flex:{breakfast:{mode:'individual',assignments:{alex:'alex-havregryn-maelk-rosiner',heidi:'heidi-skyr-yoghurt-protein-chia',kids:'morgenmad-1'}},lunch:{mode:'shared',sharedId:'frokost-1'},dinner:{mode:'shared',sharedId:'aftensmad-1'}}}]};
const referenced=[...Object.values(oldShared.items[0]).map(x=>x.id),...Object.values(oldFlex.items[0].flex.breakfast.assignments),oldFlex.items[0].flex.lunch.sharedId,oldFlex.items[0].flex.dinner.sharedId];
assert(referenced.every(id=>recipes.some(r=>r.id===id)));
console.log('PASS: 113 rules, target-slot counts, quantities, legacy-ID fixtures, asset loading. No production access.');
