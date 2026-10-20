/* V1 adult nutrition estimates for the 113 built-in recipes.
 * Per-100-g profiles below are representative generic ingredient averages,
 * NOT laboratory analyses or an exact Frida dataset import.
 * Standard: 1 adult, water for water/milk alternatives, optional toppings omitted;
 * macronutrient-based estimate uses 4/4/9 kcal. Raw/dry weights where shown.
 * Three flexible leftover recipes must never receive invented fixed macros.
 */
(()=>{
'use strict';
const foods={
 // [protein g, available carbohydrate g, fat g] per 100 g or 100 ml.
 a38:[3.4,4.3,3.5],a38_cultura:[3.4,4.3,3.5],almond_butter:[21,12,55],
 almond_flour:[21,10,53],apple:[0.3,11.6,0.2],avocado:[2,2,15],
 avocado_mayo:[1,1,77],banana:[1.1,20,0.3],beef_shoulder:[20,0,11],
 berries:[0.8,9,0.3],blueberries:[0.7,12,0.3],bread:[9,48,3],
 broccoli:[2.8,4,0.4],butter:[0.6,0.6,82],cabbage_broccoli:[2.2,4,0.2],
 carrot:[0.8,7,0.2],cauliflower:[2,3,0.3],celeriac:[1.5,7,0.3],cheese:[25,1.5,27],cherry_tomato:[0.9,3.5,0.2],
 chia:[17,7.7,31],chicken:[24,0,4],chicken_thigh:[18,0,9],
 chickpeas:[7,18,2.5],chives:[2.7,1,0.5],cocoa_unsweetened:[20,12,21],
 coconut_flakes:[6,8,64],coconut_milk:[2,3,18],coconut_oil:[0,0,100],
 coconut_shredded:[6,8,64],cod:[18,0,0.8],cold_smoked_salmon:[20,0,12],
 cooking_cream:[2.5,3.5,15],cornstarch:[0,87,0],cottage_cheese:[12,3,4],
 cream_cheese:[6,4,24],cream:[2,3,38],whipping_cream:[2,3,38],
 cucumber:[0.7,2,0.1],dark_chocolate:[7,35,43],dill_dressing:[2,5,20],
 dill:[2,2,0.5],eggs:[12.5,0.4,10.5],fish_cakes:[13,12,9],
 frozen_berries:[0.8,9,0.3],garlic_bread:[7,47,14],garlic:[6,30,0.5],
 ginger:[1.8,15,0.8],glutenfree_bread:[4,48,4],
 greek_yogurt_10:[4.3,4.1,10],greek_yogurt:[8,4,2],
 ketchup:[1,24,0.1],kidney_beans:[8,15,0.5],kiwi:[1.1,11,0.5],
 leeks:[1.5,10,0.3],lemon:[1.1,7,0.3],lime:[0.7,7,0.2],
 mascarpone:[4,4,42],milk:[3.5,4.8,3.5],
 minced_beef:[19,0,12],minced_chicken:[19,0,8],minced_mixed:[17,0,17],
 mixed_berries:[0.8,9,0.3],mushrooms:[3,3,0.3],
 oats:[13,59,7],olive_oil:[0,0,100],onion:[1.1,8,0.1],
 parsnip:[1.3,12,0.3],passata:[1.4,5,0.2],
 pasta:[12,72,1.5],peanut_butter:[26,12,49],pear:[0.4,12,0.1],
 peas:[5.4,9,0.4],pepper:[1,5,0.3],pickled_cucumber:[0.5,3,0.1],
 pita:[9,50,2],potatoes:[2,17,0.1],protein_powder:[80,7,5],
 pumpkin:[1,6,0.1],raisins:[3,70,0.5],raspberries:[1.2,5,0.7],
 red_lentils:[24,52,1.5],red_pepper:[1,5,0.3],rice:[7,78,0.6],
 ryebread:[5.5,39,2],rye_bread:[5.5,39,2],salmon:[20,0,13],
 salmon_fillet:[20,0,13],skyr:[11,4,0.2],small_bun:[9,50,3],
 spinach:[2.9,1.5,0.4],sugarfree_dark_chocolate:[8,32,42],
 sweet_potato:[1.6,20,0.1],tahini:[17,7,54],tomato:[0.9,3.5,0.2],
 tortilla:[8,49,7],walnuts:[15,7,65],wheat_flour:[10,72,1],
 wholegrain_pasta:[13,63,2.5],wholegrain_tortilla:[9,43,8],
 yeast:[8,8,1],yogurt:[3.5,4.5,3.5],white_beans:[7,17,0.5]
};
const pieceGrams={
 apple:140,avocado:140,banana:110,bay_leaf:0,bouillon:0,carrot:80,
 chickpeas:240,eggs:55,fish_cakes:45,garlic_bread:40,garlic:4,
 kidney_beans:240,kiwi:75,leeks:190,lemon:50,lime:40,nutmeg:0,
 onion:110,parsley:0,pear:160,red_pepper:150,small_bun:60,
 pita:60,tortilla:45,wholegrain_tortilla:40,ryebread:40,rye_bread:40,bread:40,dill:0,
 chives:0
};
const zero=['baking_powder','bay_leaf','bouillon','nutmeg','vanilla','spice_cinnamon','spice_curry','spice_paprika','spice_thyme','parsley','dill','chives'];
// Complete overrides where shopping rows have no adult quantity.
const specials={
 'bornefavorit-1':{basis:'1 af ca. 14 små boller',rows:[['yeast',15/14,'g'],['eggs',1/14,'piece'],['yogurt',100/14,'g'],['butter',35/14,'g'],['oats',100/14,'g'],['wheat_flour',425/14,'g']]},
 'bornefavorit-2':{basis:'Ca. 30 g kiks (anslået 1/10 af portionen)',rows:[['wheat_flour',12.5,'g'],['oats',7.5,'g'],['butter',5,'g'],['eggs',0.1,'piece'],['sugar',1.75,'g']]},
 'bornefavorit-3':{basis:'4 af ca. 20 mini-pandekager',rows:[['banana',0.4,'piece'],['eggs',0.6,'piece'],['oats',20,'g'],['peanut_butter',6,'g'],['butter',2,'g']]},
 'aftensmad-kartoffel-porresuppe-hvide-boenner':{basis:'Anslået 1/3 af familieportionen, inkl. æg, rugbrød og dip',familyFactor:1/3},
 'mellemmaltid-banan-blaabaermuffins-mandelsmoer':{basis:'2 af ca. 12 små muffins; vand som standard',familyFactor:2/12,exclude:['milk']},
 'aftensmad-cremet-tomatpasta-mini-koedboller':{basis:'Anslået 1/3 af familieportionen inkl. hvidløgsbrød',familyFactor:1/3},
 'v417-5':{basis:'Anslået 1/3 af familieportionen',familyFactor:1/3},
 'v417-6':{basis:'Anslået 1/3 af familieportionen',familyFactor:1/3},
 'v417-7':{basis:'Anslået 1/3 af familieportionen',familyFactor:1/3},
 'v417-8':{basis:'Anslået 1/3 af familieportionen',familyFactor:1/3},
 'v417-9':{basis:'Anslået 1/3 af familieportionen',familyFactor:1/3},
 'v417-10':{basis:'Anslået 1/3 af familieportionen',familyFactor:1/3},
 'v417-11':{basis:'Anslået 1/3 af familieportionen',familyFactor:1/3},
 'morgenmad-surdejsbroed-avocado-aeg-tomat-feta-kiwi':{basis:'Voksenportion i tillægsopskriften, valgfri ekstra olie udeladt',rows:[['bread',75,'g'],['eggs',2,'piece'],['avocado',0.5,'piece'],['cherry_tomato',50,'g'],['feta',15,'g'],['kiwi',0.5,'piece'],['butter',5,'g']]},
 'aftensmad-kyllingebowl-soed-kartoffel-guacamole':{basis:'Voksenportion i tillægsopskriften; ca. 100 g peberfrugt, 22,5 g nachos og 12,5 ml olie',rows:[['sweet_potato',230,'g'],['pepper',100,'g'],['chicken_thigh',165,'g'],['avocado',2/3,'piece'],['creme_fraiche',55,'g'],['nachos',22.5,'g'],['olive_oil',12.5,'ml']]},
 'frokost-4':{basis:'50 g kylling som den valgfrie proteinrest; de øvrige voksenmængder fra indkøbsdata',extra:[['chicken',50,'g']]},
 'heidi-rugbroed-koldroeget-laks':{basis:'75 g rugbrød som specificeret i voksenportionen',replace:{ryebread:[['ryebread',75,'g']]}}
};
foods.sugar=[0,100,0];foods.feta=[14,4,21];foods.creme_fraiche=[2.5,3,18];
foods.nachos=[6,52,26];
const variable={
 'frokost-1':'Afhænger af de konkrete aftensmadsrester, frugt og dip.',
 'aftensmad-15':'Afhænger af valgte proteinrester, kartofler/pasta/ris og dip.',
 'mellemmaltid-10':'Afhænger af de konkrete rester og den valgte basisdip.'
};
function weight(row){
 const [id,amount,unit]=Array.isArray(row)?row:[row.id,row.amount,row.unit];
 if(!Number.isFinite(Number(amount)))throw Error('Invalid amount: '+id);
 if(unit==='g')return Number(amount);
 if(unit==='ml')return Number(amount)*(id==='olive_oil'?0.91:1);
 if(unit==='piece'||unit==='can'||unit==='slice'||unit==='bunch'){
   const grams=pieceGrams[id];if(grams===undefined)throw Error('Missing piece weight: '+id);
   return Number(amount)*grams;
 }
 if(unit==='tsp')return 0; // spices are a negligible amount in this reference estimate
 throw Error('Unknown unit '+unit+' for '+id);
}
function metrics(rows){
 const m={protein:0,carbs:0,fat:0};
 for(const row of rows){
   const id=Array.isArray(row)?row[0]:row.id;
   if(zero.includes(id))continue;
   const p=foods[id];if(!p)throw Error('Missing nutrient profile: '+id);
   const g=weight(row);
   m.protein+=p[0]*g/100;m.carbs+=p[1]*g/100;m.fat+=p[2]*g/100;
 }
 return m;
}
function estimate(recipe,shopping){
 if(!recipe||recipe.isCustom)return {status:'unavailable',note:'Ingen beregnede værdier for egne opskrifter endnu.'};
 if(variable[recipe.id])return {status:'variable',note:variable[recipe.id]};
 let base=shopping?.[recipe.id]||{},s=specials[recipe.id]||{},rows=s.rows||(s.familyFactor?base.family?.map(r=>({...r,amount:r.amount*s.familyFactor})):base.adult);
 if(!Array.isArray(rows)||!rows.length)return {status:'unavailable',note:'Voksenmængderne er ikke tilstrækkeligt angivet til beregning.'};
 rows=rows.map(r=>Array.isArray(r)?r:{...r});
 if(s.exclude)rows=rows.filter(r=>!s.exclude.includes(Array.isArray(r)?r[0]:r.id));
 if(s.replace)for(const [id,newRows] of Object.entries(s.replace)){rows=rows.filter(r=>(Array.isArray(r)?r[0]:r.id)!==id).concat(newRows)}
 if(s.extra)rows=rows.concat(s.extra);
 const n=metrics(rows),p=Math.round(n.protein*10)/10,c=Math.round(n.carbs*10)/10,f=Math.round(n.fat*10)/10;
 const pE=n.protein*4,cE=n.carbs*4,fE=n.fat*9,total=pE+cE+fE;
 if(total<=0)return {status:'unavailable',note:'Utilstrækkelige data.'};
 const pc=Math.round(pE/total*100),cc=Math.round(cE/total*100);
 return {status:'estimated',kcal:Math.round(total/5)*5,protein:p,carbs:c,fat:f,
  share:{protein:pc,carbs:cc,fat:100-pc-cc},
  basis:s.basis||'Ingredienser i opskriftens voksenportion',
  note:'Estimat for 1 voksen. Vand bruges ved vand/mælk-valg; valgfrie toppings indgår ikke. Konkrete varer og portioner kan afvige.'};
}
window.recipeAdultNutrition=estimate;
window.NUTRITION_ADULT_META={source:'Generiske referenceprofiler og Kostkompassets voksenmængder; ikke verificeret laboratorieanalyse',profileCount:Object.keys(foods).length,specialCount:Object.keys(specials).length};
})();
