// Read-only/offline verification: node tests/nutrition-adult.test.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const recipes=JSON.parse(read('recipes.json')),shop=JSON.parse(read('shopping-v4.json'));
const rules=JSON.parse(read('plan-recipe-rules-v1.js').match(/Object\.freeze\(([\s\S]*?)\);\s*$/)[1]);
const w={};vm.runInNewContext(read('nutrition-adult-v1.js'),{window:w},{filename:'nutrition-adult-v1.js'});
recipes.push({id:'morgenmad-surdejsbroed-avocado-aeg-tomat-feta-kiwi',name:'Surdejsbrød med avocado, æg, tomat, feta & kiwi'},
{id:'aftensmad-kyllingebowl-soed-kartoffel-guacamole',name:'Kyllingebowl med guacamole og nachos'});
const ids=new Set(recipes.map(r=>r.id));
assert.equal(recipes.length,113);assert.equal(ids.size,113);
assert(Object.keys(rules).every(id=>ids.has(id)));
const expectedVariable=new Set(['frokost-1','aftensmad-15','mellemmaltid-10']);
let estimated=0,variable=0;
for(const r of recipes){
 const n=w.recipeAdultNutrition(r,shop);
 if(expectedVariable.has(r.id)){assert.equal(n.status,'variable',r.id);variable++;continue}
 assert.equal(n.status,'estimated',r.id);
 estimated++;
 for(const key of ['kcal','protein','carbs','fat'])assert(Number.isFinite(n[key])&&n[key]>=0,r.id+' '+key);
 assert(n.kcal>0&&n.kcal<2500,r.id+' unreasonable energy');
 assert.equal(n.share.protein+n.share.carbs+n.share.fat,100,r.id+' shares');
 assert(Math.abs(n.kcal-(n.protein*4+n.carbs*4+n.fat*9))<=5,r.id+' energy inconsistent');
}
assert.equal(estimated,110);assert.equal(variable,3);
const child=w.recipeAdultNutrition({id:'v417-1'},shop);assert.equal(child.status,'estimated'); // adult recipe data, not child plan
assert.equal(w.recipeAdultNutrition({id:'custom',isCustom:true},shop).status,'unavailable');
const app=read('app.js'),html=read('index.html'),sw=read('sw.js'),css=read('styles.css');
assert(html.indexOf('src="nutrition-adult-v1.js')<html.indexOf('src="app.js"'));
assert(sw.includes("'./nutrition-adult-v1.js'"));assert(sw.includes('nutrition-adult-v1\\.js'));
assert(css.includes('.adult-macro-card'));assert(app.includes('adultNutritionHtml(r)'));
new vm.Script(app,{filename:'app.js'});
const fragment=app.slice(app.indexOf('function adultNutritionHtml(r){'),app.indexOf('function renderRecipe(id)'));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const view=new Function('window','shoppingV4','escapeHtml',fragment+'return adultNutritionHtml;')(w,shop,esc);
const sample=view({id:'morgenmad-1'});assert(sample.includes('kcal')&&sample.includes('Protein')&&sample.includes('Kulhydrat')&&sample.includes('Fedt')&&sample.includes('1 VOKSENPORTION'));
const leftover=view({id:'frokost-1'});assert(leftover.includes('afhænger af resterne')&&!leftover.includes('≈'));
console.log('PASS: 113 built-in IDs, 110 estimated, 3 variable, maths, UI and cache integration. No cloud access.');
