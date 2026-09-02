
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  localStorage.setItem('kostkompas-install-available','1');
});
window.addEventListener('appinstalled',()=>{
  localStorage.setItem('kostkompas-installed','1');
  deferredInstallPrompt=null;
});
async function installApp(){
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    return;
  }
  alert('På iPhone/iPad: tryk Del → Føj til hjemmeskærm. På Android/Chrome: brug browsermenuen → Installer app.');
}

let recipes=[];let baseRecipes=[];let currentCategory=null;let scale=1;let currentPlan=null;let recipeFeedback={};let pantryState={};let shoppingChecks={};let customRecipes=[];let planHistory=[];
const feedbackKey='kostkompas-recipe-feedback';
const pantryKey='kostkompas-pantry';
const shoppingChecksKey='kostkompas-shop-checked';
const customRecipesKey='kostkompas-custom-recipes';
const planHistoryKey='kostkompas-plan-history';
const defaultPantryItems=[
  {id:'oliveoil',name:'Ekstra jomfruolivenolie',category:'Fedt & smag',keywords:['olivenolie','ekstra jomfruolivenolie']},
  {id:'butter',name:'Smør',category:'Køl',keywords:['smør']},
  {id:'spices',name:'Milde krydderier',category:'Fedt & smag',keywords:['paprika','karry','timian','oregano','kanel','spidskommen','krydderi']},
  {id:'oats',name:'Havregryn',category:'Kolonial',keywords:['havregryn']},
  {id:'rice',name:'Ris',category:'Kolonial',keywords:['ris']},
  {id:'pasta',name:'Pasta',category:'Kolonial',keywords:['pasta']},
  {id:'ryebread',name:'Rugbrød',category:'Brød',keywords:['rugbrød']},
  {id:'passata',name:'Passata / tomatprodukter',category:'Kolonial',keywords:['passata','hakkede tomater','tomatpuré','tomatprodukter']},
  {id:'nutbutter',name:'100 % nøddesmør / peanutbutter',category:'Kolonial',keywords:['nøddesmør','peanutbutter','mandelsmør']},
  {id:'yoghurt',name:'A38 / naturel yoghurt',category:'Køl',keywords:['a38','yoghurt']},
  {id:'flour',name:'Mel',category:'Kolonial',keywords:['mel']}
];
function loadHouseholdState(){
  try{pantryState=JSON.parse(localStorage.getItem(pantryKey)||'{}')||{}}catch(e){pantryState={}}
  try{shoppingChecks=JSON.parse(localStorage.getItem(shoppingChecksKey)||'{}')||{}}catch(e){shoppingChecks={}}
  try{customRecipes=JSON.parse(localStorage.getItem(customRecipesKey)||'[]')||[]}catch(e){customRecipes=[]}
  try{planHistory=JSON.parse(localStorage.getItem(planHistoryKey)||'[]')||[]}catch(e){planHistory=[]}
  if(!Array.isArray(pantryState.custom))pantryState.custom=[];
  if(!pantryState.items||typeof pantryState.items!=='object')pantryState.items={};
  if(!Array.isArray(customRecipes))customRecipes=[];
  if(!Array.isArray(planHistory))planHistory=[];
}
function rebuildRecipes(){recipes=[...baseRecipes,...customRecipes]}
function saveHouseholdStateLocal(){localStorage.setItem(pantryKey,JSON.stringify(pantryState));localStorage.setItem(shoppingChecksKey,JSON.stringify(shoppingChecks));localStorage.setItem(customRecipesKey,JSON.stringify(customRecipes));localStorage.setItem(planHistoryKey,JSON.stringify(planHistory))}
async function saveHouseholdStateCloud(){
  saveHouseholdStateLocal();
  try{
    const remote=await fetchCloudPlan()||{};
    remote.recipeFeedback=recipeFeedback;
    remote.pantryState=pantryState;
    remote.shoppingChecks=shoppingChecks;
    remote.customRecipes=customRecipes;
    remote.planHistory=planHistory;
    await saveCloudState(remote);
    if(currentPlan){currentPlan.pantryState=pantryState;currentPlan.shoppingChecks=shoppingChecks;currentPlan.customRecipes=customRecipes;currentPlan.planHistory=planHistory;localStorage.setItem('kostkompas-current-plan',JSON.stringify(currentPlan))}
  }catch(e){console.warn('Household cloud save failed',e)}
}
function allPantryItems(){return [...defaultPantryItems,...(pantryState.custom||[])]}
function pantryHas(id){return !!pantryState.items?.[id]}
function pantryMatches(name){
  const n=normName(name).toLowerCase();
  return allPantryItems().some(item=>pantryHas(item.id)&&(item.keywords||[item.name]).some(k=>n.includes(String(k).toLowerCase())));
}


// ----- V2.4: Fælles aktiv madplan via Supabase -----
const SUPABASE_URL='https://rjipiaghngxzaqgmcawr.supabase.co';
const SUPABASE_KEY='sb_publishable_ceyzhUI2V1kIKTpbQTZ0fQ_mJoT2NHI';
let cloudSession=null;
const sessionKey='kostkompas-supabase-session';
function loadCloudSession(){try{cloudSession=JSON.parse(localStorage.getItem(sessionKey)||'null')}catch(e){cloudSession=null}}
function saveCloudSession(s){cloudSession=s;if(s)localStorage.setItem(sessionKey,JSON.stringify(s));else localStorage.removeItem(sessionKey)}
function sessionValid(){return cloudSession?.access_token && (!cloudSession.expires_at || cloudSession.expires_at*1000>Date.now()+60000)}
async function refreshCloudSession(){
  if(sessionValid())return true;
  if(!cloudSession?.refresh_token)return false;
  try{
    const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:cloudSession.refresh_token})});
    if(!r.ok)throw new Error('refresh'); const d=await r.json(); d.expires_at=Math.floor(Date.now()/1000)+(d.expires_in||3600); saveCloudSession(d); return true;
  }catch(e){saveCloudSession(null);return false}
}
async function cloudLogin(email,password){
  const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  if(!r.ok){let d={};try{d=await r.json()}catch(e){};throw new Error(d.error_description||d.msg||'Login mislykkedes')}
  const d=await r.json();d.expires_at=Math.floor(Date.now()/1000)+(d.expires_in||3600);saveCloudSession(d);return d;
}
async function cloudLogout(){saveCloudSession(null);currentPlan=null;recipeFeedback={};pantryState={};shoppingChecks={};customRecipes=[];planHistory=[];localStorage.removeItem('kostkompas-current-plan');localStorage.removeItem(feedbackKey);localStorage.removeItem(pantryKey);localStorage.removeItem(shoppingChecksKey);localStorage.removeItem(customRecipesKey);localStorage.removeItem(planHistoryKey);rebuildRecipes();loginScreen('Du er logget ud.');}
async function cloudHeaders(){if(!await refreshCloudSession())return null;return {'apikey':SUPABASE_KEY,'Authorization':`Bearer ${cloudSession.access_token}`,'Content-Type':'application/json'};}
async function fetchCloudPlan(){
  const h=await cloudHeaders();if(!h)return null;
  const r=await fetch(`${SUPABASE_URL}/rest/v1/active_plan?id=eq.1&select=plan_data,updated_at`,{headers:h});
  if(!r.ok)throw new Error('Kunne ikke hente den fælles madplan');const rows=await r.json();return rows[0]?.plan_data||{};
}
async function saveCloudState(state){
  const h=await cloudHeaders();if(!h)return;
  const r=await fetch(`${SUPABASE_URL}/rest/v1/active_plan?id=eq.1`,{method:'PATCH',headers:{...h,'Prefer':'return=minimal'},body:JSON.stringify({plan_data:state||{},updated_at:new Date().toISOString()})});
  if(!r.ok)console.warn('Cloud save failed',await r.text());
}
async function saveCloudPlan(plan=currentPlan){
  if(!plan)return;
  plan.recipeFeedback=recipeFeedback;plan.pantryState=pantryState;plan.shoppingChecks=shoppingChecks;plan.customRecipes=customRecipes;plan.planHistory=planHistory;
  localStorage.setItem('kostkompas-current-plan',JSON.stringify(plan));
  await saveCloudState(plan);
}
function persistPlan(){if(!currentPlan)return;currentPlan.recipeFeedback=recipeFeedback;currentPlan.pantryState=pantryState;currentPlan.shoppingChecks=shoppingChecks;currentPlan.customRecipes=customRecipes;currentPlan.planHistory=planHistory;localStorage.setItem('kostkompas-current-plan',JSON.stringify(currentPlan));saveCloudPlan(currentPlan).catch(console.warn)}
function loadRecipeFeedback(){try{recipeFeedback=JSON.parse(localStorage.getItem(feedbackKey)||'{}')||{}}catch(e){recipeFeedback={}}}
function persistRecipeFeedbackLocal(){localStorage.setItem(feedbackKey,JSON.stringify(recipeFeedback))}
async function saveRecipeFeedbackCloud(){
  persistRecipeFeedbackLocal();
  if(currentPlan){currentPlan.recipeFeedback=recipeFeedback;persistPlan();return}
  try{const remote=await fetchCloudPlan()||{};remote.recipeFeedback=recipeFeedback;await saveCloudState(remote)}catch(e){console.warn('Feedback cloud save failed',e)}
}
function loginScreen(message=''){
  app.innerHTML=`<div class="login-shell"><section class="login-card"><div class="brand">Familiens Kostkompas</div><h1>Familielogin</h1><p>Log ind for at åbne den samme aktive madplan på computer og telefon.</p>${message?`<div class="login-message">${message}</div>`:''}<form onsubmit="submitFamilyLogin(event)"><label>E-mail</label><input id="login-email" type="email" autocomplete="username" required><label>Adgangskode</label><input id="login-password" type="password" autocomplete="current-password" required><button class="btn" type="submit">Log ind</button></form><button class="text-link" onclick="forgotPasswordScreen()">Glemt adgangskode?</button><p class="small muted">Brug den Supabase-bruger, du allerede har oprettet.</p></section></div>`;
}
async function submitFamilyLogin(e){
  e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Logger ind…';
  try{await cloudLogin(document.getElementById('login-email').value.trim(),document.getElementById('login-password').value);await syncAfterLogin();home()}catch(err){loginScreen('Login kunne ikke gennemføres. Kontrollér e-mail og adgangskode.')} 
}
function appBaseUrl(){return `${location.origin}${location.pathname}`}
function forgotPasswordScreen(message=''){
  app.innerHTML=`<div class="login-shell"><section class="login-card"><div class="brand">Familiens Kostkompas</div><h1>Nulstil adgangskode</h1><p>Skriv din e-mail. Så sender Supabase et link, der åbner Kostkompasset og lader dig vælge en ny adgangskode.</p>${message?`<div class="login-message ${message.startsWith('✓')?'success':''}">${message}</div>`:''}<form onsubmit="requestPasswordReset(event)"><label>E-mail</label><input id="reset-email" type="email" autocomplete="email" required><button class="btn" type="submit">Send reset-link</button></form><button class="text-link" onclick="loginScreen()">← Tilbage til login</button></section></div>`;
}
async function requestPasswordReset(e){
  e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Sender…';
  const email=document.getElementById('reset-email').value.trim();
  try{
    const redirectUrl='https://heidimariarasmussen-ctrl.github.io/Familiens-Kostkompas/';
    const r=await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectUrl)}`,{method:'POST',headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email})});
    if(!r.ok){let d={};try{d=await r.json()}catch(_e){};throw new Error(d.msg||d.error_description||'Kunne ikke sende mail')}
    forgotPasswordScreen('✓ Reset-link er sendt. Tjek din e-mail.');
  }catch(err){
    const msg=(err.message||'').toLowerCase().includes('rate')?'Der er sendt for mange mails på kort tid. Vent et øjeblik og prøv igen.':'Kunne ikke sende reset-mailen. Prøv igen om lidt.';
    forgotPasswordScreen(msg);
  }
}
function parseRecoveryHash(){
  const raw=location.hash.replace(/^#/,'');if(!raw)return null;
  const p=new URLSearchParams(raw);if(p.get('type')!=='recovery'||!p.get('access_token'))return null;
  const expiresIn=Number(p.get('expires_in')||3600);
  return {access_token:p.get('access_token'),refresh_token:p.get('refresh_token')||'',token_type:p.get('token_type')||'bearer',expires_in:expiresIn,expires_at:Math.floor(Date.now()/1000)+expiresIn,type:'recovery'};
}
function newPasswordScreen(message=''){
  app.innerHTML=`<div class="login-shell"><section class="login-card"><div class="brand">Familiens Kostkompas</div><h1>Vælg ny adgangskode</h1><p>Reset-linket er godkendt. Skriv din nye adgangskode to gange.</p>${message?`<div class="login-message">${message}</div>`:''}<form onsubmit="submitNewPassword(event)"><label>Ny adgangskode</label><input id="new-password" type="password" autocomplete="new-password" minlength="8" required><label>Gentag adgangskode</label><input id="new-password-2" type="password" autocomplete="new-password" minlength="8" required><button class="btn" type="submit">Gem ny adgangskode</button></form><p class="small muted">Brug mindst 8 tegn.</p></section></div>`;
}
async function submitNewPassword(e){
  e.preventDefault();const p1=document.getElementById('new-password').value,p2=document.getElementById('new-password-2').value;
  if(p1!==p2){newPasswordScreen('De to adgangskoder er ikke ens.');return}
  const btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Gemmer…';
  try{
    const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{method:'PUT',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${cloudSession.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({password:p1})});
    if(!r.ok){let d={};try{d=await r.json()}catch(_e){};throw new Error(d.msg||d.error_description||'Kunne ikke gemme adgangskoden')}
    const user=await r.json();cloudSession.user=user;saveCloudSession(cloudSession);history.replaceState({},document.title,appBaseUrl());
    await syncAfterLogin();home();
    setTimeout(()=>alert('Din nye adgangskode er gemt. Kostkompasset er nu logget ind.'),100);
  }catch(err){newPasswordScreen('Kunne ikke gemme den nye adgangskode. Bed om et nyt reset-link og prøv igen.')}
}
async function syncAfterLogin(){
  loadRecipeFeedback();loadHouseholdState();
  let local=null;try{local=JSON.parse(localStorage.getItem('kostkompas-current-plan')||'null')}catch(e){}
  const localHasPlan=local && Array.isArray(local.items) && local.items.length;
  const remote=await fetchCloudPlan()||{};
  const remoteHasPlan=Array.isArray(remote.items) && remote.items.length;
  const remoteFeedback=remote.recipeFeedback&&typeof remote.recipeFeedback==='object'?remote.recipeFeedback:{};
  if(Object.keys(remoteFeedback).length){recipeFeedback=remoteFeedback;persistRecipeFeedbackLocal()}
  else if(Object.keys(recipeFeedback).length){remote.recipeFeedback=recipeFeedback;await saveCloudState(remote)}
  const remotePantry=remote.pantryState&&typeof remote.pantryState==='object'?remote.pantryState:null;
  const remoteChecks=remote.shoppingChecks&&typeof remote.shoppingChecks==='object'?remote.shoppingChecks:null;
  const remoteCustom=Array.isArray(remote.customRecipes)?remote.customRecipes:null;
  const remoteHistory=Array.isArray(remote.planHistory)?remote.planHistory:null;
  if(remotePantry){pantryState=remotePantry;if(!Array.isArray(pantryState.custom))pantryState.custom=[];if(!pantryState.items)pantryState.items={}}
  else if(Object.keys(pantryState.items||{}).length||(pantryState.custom||[]).length)remote.pantryState=pantryState;
  if(remoteChecks)shoppingChecks=remoteChecks;else if(Object.keys(shoppingChecks).length)remote.shoppingChecks=shoppingChecks;
  if(remoteCustom){customRecipes=remoteCustom}else if(customRecipes.length)remote.customRecipes=customRecipes;
  if(remoteHistory){planHistory=remoteHistory}else if(planHistory.length)remote.planHistory=planHistory;
  rebuildRecipes();
  saveHouseholdStateLocal();
  if(remoteHasPlan){currentPlan=remote;currentPlan.recipeFeedback=recipeFeedback;currentPlan.pantryState=pantryState;currentPlan.shoppingChecks=shoppingChecks;currentPlan.customRecipes=customRecipes;currentPlan.planHistory=planHistory;localStorage.setItem('kostkompas-current-plan',JSON.stringify(currentPlan));}
  else if(localHasPlan){currentPlan=local;currentPlan.recipeFeedback=recipeFeedback;currentPlan.pantryState=pantryState;currentPlan.shoppingChecks=shoppingChecks;currentPlan.customRecipes=customRecipes;currentPlan.planHistory=planHistory;await saveCloudPlan(currentPlan);}
  else {currentPlan=null;if(!remotePantry||!remoteChecks){remote.pantryState=pantryState;remote.shoppingChecks=shoppingChecks;await saveCloudState(remote)}}
}
function cloudBadge(){return cloudSession?.user?.email?`<button class="sync-pill" onclick="cloudLogout()" title="Log ud">☁ Synkroniseret</button>`:''}
async function startApp(){
  loadRecipeFeedback();loadHouseholdState();
  loadCloudSession();
  const recovery=parseRecoveryHash();
  if(recovery){saveCloudSession(recovery);newPasswordScreen();return}
  if(await refreshCloudSession()){try{await syncAfterLogin();home()}catch(e){console.warn(e);restorePlan();home()}}else loginScreen();
}

const app=document.getElementById('app');
const emoji={"Morgenmad":"🥣","Frokost":"🥗","Aftensmad":"🍲","Mellemmåltider":"🍌","Børnefavoritter 2.0":"💛"};
const favs=()=>JSON.parse(localStorage.getItem('kostkompas-favs')||'[]');
const saveFavs=x=>localStorage.setItem('kostkompas-favs',JSON.stringify(x));
const nav=()=>`<nav class="bottomnav"><button onclick="home()">🏠<br>Hjem</button><button onclick="library()">📚<br>Opskrifter</button><button onclick="planner()">📅<br>Madplan</button><button onclick="pantry()">🏡<br>Basislager</button><button onclick="favorites()">♥<br>Favoritter</button><button onclick="knowledge()">🧭<br>Kompas</button></nav>`;
function recipeMedia(r,cls='photo'){return r.image?`<img class="${cls}" src="${r.image}" alt="${escapeHtml(r.name)}">`:`<div class="${cls} custom-recipe-placeholder"><span>🍽️</span><small>Familiens egen</small></div>`}
function card(r){return `<article class="card" onclick="showRecipe('${r.id}')">${recipeMedia(r)}<div class="card-body"><span class="badge">${r.category}</span>${r.isCustom?'<span class="custom-badge">Egen ret</span>':''}<h3>${escapeHtml(r.name)}</h3><div class="meta">${r.active||''} aktiv · ${r.total||''}</div></div></article>`}
function home(){app.innerHTML=`<div class="shell"><div class="topbar"><div><div class="brand">Familiens Kostkompas</div><div class="tag">Næringstæt · realistisk · børnevenlig familiemad</div></div>${cloudBadge()}</div><section class="hero"><div class="hero-copy"><h1>Hvad skal vi spise?</h1><p>80 familieopskrifter + jeres egne retter + Børnefavoritter 2.0. Find en ret nu, gem favoritter eller lad Kostkompasset lave en personlig madplan med rester og indkøbsliste.</p><div class="actions"><button class="btn quick-home-btn" onclick="quickNow()">⚡ Jeg skal bruge noget hurtigt nu</button><button class="btn" onclick="planner()">Lav madplan</button><button class="btn secondary" onclick="planToday()">Planlæg i dag</button><button class="btn secondary" onclick="library()">Se alle opskrifter</button><button class="btn secondary" onclick="pantry()">Basislager</button><button class="btn secondary" onclick="customRecipeEditor()">➕ Tilføj egen ret</button></div></div><div class="hero-art"><img src="familien-forside.png" alt="Familien samlet omkring spisebordet"></div></section><div class="grid">${["Morgenmad","Frokost","Aftensmad","Mellemmåltider"].map(c=>`<div class="cat" onclick="library('${c}')"><span>${emoji[c]}</span><h3>${c}</h3><div class="small">${recipes.filter(r=>r.category===c).length} opskrifter</div></div>`).join('')}</div><div class="section-title"><h2>Inspiration</h2><button class="btn secondary" onclick="library('Børnefavoritter 2.0')">Børnefavoritter 2.0</button></div><div class="cards">${pickInspiration().map(card).join('')}</div></div>${nav()}`}
function pickInspiration(){return ['aftensmad-1','morgenmad-4','frokost-15'].map(id=>recipes.find(r=>r.id===id)).filter(Boolean)}
function library(cat){currentCategory=cat||null;const rs=cat?recipes.filter(r=>r.category===cat):recipes;app.innerHTML=`<div class="shell"><div class="section-title"><h2>${cat||'Alle opskrifter'}</h2><div class="actions"><button class="btn secondary" onclick="customRecipeEditor()">➕ Egen ret</button><button class="btn secondary" onclick="home()">← Tilbage</button></div></div><input class="search" id="q" placeholder="Søg efter ret eller ingrediens…" oninput="filterList()"><div class="cards" id="cards">${rs.map(card).join('')}</div></div>${nav()}`}
function filterList(){const q=document.getElementById('q').value.toLowerCase();let rs=currentCategory?recipes.filter(r=>r.category===currentCategory):recipes;rs=rs.filter(r=>r.name.toLowerCase().includes(q)||r.ingredients.join(' ').toLowerCase().includes(q));document.getElementById('cards').innerHTML=rs.map(card).join('')||'<div class="empty">Ingen resultater.</div>'}
function showRecipe(id){scale=1;renderRecipe(id)}
function renderRecipe(id){const r=recipes.find(x=>x.id===id);if(!r){library();return}const is=favs().includes(id);app.innerHTML=`<div class="shell"><button class="btn secondary" onclick="library('${r.category}')">← ${r.category}</button><article class="recipe"><button class="heart" onclick="toggleFav('${id}')">${is?'♥':'♡'}</button>${r.isCustom?`<div class="recipe-custom-actions"><button class="btn secondary small" onclick="customRecipeEditor('${id}')">Redigér egen ret</button><button class="text-link danger" onclick="deleteCustomRecipe('${id}')">Slet</button></div>`:''}${recipeMedia(r,'recipe-hero')}<span class="badge">${r.category}</span>${r.isCustom?'<span class="custom-badge">Familiens egen</span>':''}<h1>${escapeHtml(r.name)}</h1><div class="info"><div><b>Portion</b><br>${r.portion}</div><div><b>Aktiv tid</b><br>${r.active}</div><div><b>Samlet tid</b><br>${r.total}</div></div><div class="portionbar"><button class="${scale===1?'active':''}" onclick="setScale('${id}',1)">Kun i dag</button><button class="${scale===2?'active':''}" onclick="setScale('${id}',2)">Dobbelt portion</button></div><h3>Ingredienser ${scale===2?'· dobbelt portion':''}</h3><ul>${r.ingredients.map(x=>`<li>${scaleIngredient(x,scale)}</li>`).join('')}</ul><h3>Sådan gør du</h3><ol>${r.steps.map(x=>`<li>${x}</li>`).join('')}</ol>${r.taste?`<div class="note"><b>Sovs / dip / smag</b><br>${r.taste}</div>`:''}${r.child?`<div class="note pink" style="margin-top:10px"><b>Til børn på ca. 15 måneder</b><br>${r.child}</div>`:''}${r.tip?`<div class="note" style="margin-top:10px"><b>Praktisk tip</b><br>${r.tip}</div>`:''}<h3>Hvorfor er den god for børnene?</h3><ul>${(r.why||[]).map(x=>`<li>${x}</li>`).join('')}</ul>${feedbackHtml(id)}</article></div>${nav()}`;initFeedbackSelection(id)}

const feedbackReactions=[
  {value:'loved',emoji:'😍',label:'Spiste godt'},
  {value:'tasted',emoji:'🙂',label:'Smagte / spiste lidt'},
  {value:'barely',emoji:'😐',label:'Næsten ikke'},
  {value:'refused',emoji:'🙅',label:'Ville ikke'}
];
function escapeHtml(v=''){return String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function feedbackReaction(value){return feedbackReactions.find(x=>x.value===value)||null}
function feedbackEntries(recipeId){return Array.isArray(recipeFeedback[recipeId])?recipeFeedback[recipeId]:[]}
function feedbackDate(iso){try{return new Intl.DateTimeFormat('da-DK',{day:'numeric',month:'short',year:'numeric'}).format(new Date(iso))}catch(e){return ''}}
function feedbackHtml(recipeId){
  const entries=feedbackEntries(recipeId).slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  return `<section class="feedback-card"><div class="feedback-title"><div><span class="eyebrow">Børnenes reaktion</span><h3>Hvordan gik retten?</h3><p>Gem en lille observation. Det gør det lettere at se, hvad børnene accepterer over tid.</p></div><span class="feedback-count">${entries.length?`${entries.length} ${entries.length===1?'note':'noter'}`:'Ny'}</span></div>
    <input type="hidden" id="feedback-reaction-${recipeId}" value="">
    <div class="reaction-grid">${feedbackReactions.map(x=>`<button type="button" class="reaction-btn" data-reaction="${x.value}" onclick="selectFeedbackReaction('${recipeId}','${x.value}')"><span>${x.emoji}</span><small>${x.label}</small></button>`).join('')}</div>
    <label class="feedback-label" for="feedback-note-${recipeId}">Note <span>valgfri</span></label>
    <textarea class="feedback-textarea" id="feedback-note-${recipeId}" maxlength="500" placeholder="Fx: Begge spiste laks og kartofler. Broccoli blev smagt, men ikke spist."></textarea>
    <div class="feedback-actions"><button class="btn" type="button" onclick="saveRecipeFeedback('${recipeId}')">Gem reaktion</button><span class="small muted">Gemmes med dato og synkroniseres mellem jeres enheder.</span></div>
    ${entries.length?`<div class="feedback-history"><h4>Tidligere reaktioner</h4>${entries.map(e=>{const r=feedbackReaction(e.reaction);return `<article class="feedback-entry"><div class="feedback-entry-head"><div><span class="feedback-emoji">${r?.emoji||'📝'}</span><strong>${r?.label||'Note'}</strong><time>${feedbackDate(e.createdAt)}</time></div><button class="feedback-delete" type="button" onclick="deleteRecipeFeedback('${recipeId}','${e.id}')" aria-label="Slet note">Slet</button></div>${e.note?`<p>${escapeHtml(e.note)}</p>`:''}</article>`}).join('')}</div>`:''}
  </section>`;
}
function initFeedbackSelection(recipeId){selectFeedbackReaction(recipeId,'',false)}
function selectFeedbackReaction(recipeId,value,update=true){
  const hidden=document.getElementById(`feedback-reaction-${recipeId}`);if(hidden)hidden.value=value;
  document.querySelectorAll('.reaction-btn').forEach(btn=>btn.classList.toggle('selected',btn.dataset.reaction===value));
}
async function saveRecipeFeedback(recipeId){
  const reaction=document.getElementById(`feedback-reaction-${recipeId}`)?.value||'';
  const note=(document.getElementById(`feedback-note-${recipeId}`)?.value||'').trim();
  if(!reaction&&!note){alert('Vælg en reaktion eller skriv en kort note først.');return}
  const entry={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,reaction,note,createdAt:new Date().toISOString()};
  recipeFeedback[recipeId]=[...(feedbackEntries(recipeId)),entry];
  await saveRecipeFeedbackCloud();
  renderRecipe(recipeId);
}
async function deleteRecipeFeedback(recipeId,entryId){
  recipeFeedback[recipeId]=feedbackEntries(recipeId).filter(x=>x.id!==entryId);
  if(!recipeFeedback[recipeId].length)delete recipeFeedback[recipeId];
  await saveRecipeFeedbackCloud();
  renderRecipe(recipeId);
}

function scaleIngredient(s,m){if(m===1)return s;return s.replace(/^(\d+(?:[.,]\d+)?)(\s*)/,(_,n,sp)=>String(parseFloat(n.replace(',','.'))*m).replace('.',',')+sp).replace(/^(\d+)\/(\d+)/,(_,a,b)=>`${Number(a)*m}/${b}`)}
function setScale(id,s){scale=s;renderRecipe(id)}
function toggleFav(id){let f=favs();f=f.includes(id)?f.filter(x=>x!==id):[...f,id];saveFavs(f);renderRecipe(id)}
function favorites(){const rs=recipes.filter(r=>favs().includes(r.id));app.innerHTML=`<div class="shell"><div class="section-title"><h2>Favoritter</h2><button class="btn secondary" onclick="home()">← Tilbage</button></div><div class="cards">${rs.length?rs.map(card).join(''):'<div class="empty">Tryk ♡ på en opskrift for at gemme den her.</div>'}</div></div>${nav()}`}
function quickNow(){
  const cats=[['Morgenmad','☀️'],['Frokost','🥪'],['Aftensmad','🍲'],['Mellemmåltider','🍎']];
  app.innerHTML=`<div class="shell"><div class="section-title"><div><span class="eyebrow">Hurtig hjælp</span><h2>Jeg skal bruge noget hurtigt nu</h2></div><button class="btn secondary" onclick="home()">← Tilbage</button></div><p class="muted">Hvilket måltid står du og mangler? Kostkompasset finder en af de hurtigste retter i jeres eget opskriftsbibliotek.</p><div class="quick-category-grid">${cats.map(([c,e])=>`<button class="quick-category" onclick="quickMeal('${c}')"><span>${e}</span><strong>${c==='Mellemmåltider'?'Mellemmåltid':c}</strong><small>Find noget hurtigt</small></button>`).join('')}</div></div>${nav()}`;
}
function quickMeal(category){
  const limits={Morgenmad:10,Frokost:15,Aftensmad:20,Mellemmåltider:10};
  let list=recipes.filter(r=>r.category===category).filter(r=>minutes(r.active)<=limits[category]);
  if(!list.length)list=recipes.filter(r=>r.category===category).sort((a,b)=>minutes(a.active)-minutes(b.active)).slice(0,6);
  else list=list.sort((a,b)=>minutes(a.active)-minutes(b.active)).slice(0,8);
  const r=list[Math.floor(Math.random()*Math.min(list.length,5))];
  if(!r){library(category);return}
  app.innerHTML=`<div class="shell"><div class="section-title"><div><span class="eyebrow">Hurtigt ${category==='Mellemmåltider'?'mellemmåltid':category.toLowerCase()}</span><h2>Prøv denne</h2></div><button class="btn secondary" onclick="quickNow()">← Vælg måltid</button></div><section class="quick-result">${recipeMedia(r,'quick-result-media')}<div><span class="quick-time">⚡ ${r.active||'Kort aktiv tid'}</span><h2>${r.name}</h2><p>${r.why?.[0]||'En hurtig ret fra familiens eget opskriftsbibliotek.'}</p><div class="actions"><button class="btn" onclick="showRecipe('${r.id}')">Se opskrift</button><button class="btn secondary" onclick="quickMeal('${category}')">↻ Foreslå en anden</button></div></div></section></div>${nav()}`;
}
function planToday(){const cats=["Morgenmad","Frokost","Aftensmad","Mellemmåltider"];app.innerHTML=`<div class="shell"><div class="section-title"><h2>Planlæg i dag</h2><button class="btn secondary" onclick="home()">← Tilbage</button></div><p class="muted">Vælg dagens fire måltider. Dine valg gemmes på denne enhed.</p><div class="plan-grid">${cats.map(c=>{const opts=recipes.filter(r=>r.category===c);return `<div class="plan-slot"><h3>${emoji[c]} ${c}</h3><select style="width:100%;padding:12px;border-radius:12px;border:1px solid #d9ddd6" onchange="localStorage.setItem('plan-${c}',this.value)"><option value="">Vælg ret…</option>${opts.map(r=>`<option ${localStorage.getItem('plan-'+c)===r.id?'selected':''} value="${r.id}">${r.name}</option>`).join('')}</select></div>`}).join('')}</div></div>${nav()}`}

// ----- V2: Kostsystemets madplansmotor -----
const dinnerPools={fatFish:[1,16],leanFish:[2,3,19],beef:[4,5,6,11,12,14,18],chicken:[7,8,9,13,17,20],egg:[10],leftover:[15]};
const patterns={3:['fatFish','beef','chicken'],4:['fatFish','beef','chicken','leanFish'],5:['fatFish','beef','chicken','leanFish','egg'],7:['fatFish','beef','chicken','leanFish','egg','beef','leftover']};
const breakfastByBusy={high:[3,11,17,1,10,5,2],normal:[1,2,3,4,10,6,5],low:[4,7,8,13,14,16,19]};
const firstLunchByBusy={high:[1,3,5,20,4],normal:[3,5,19,4,9],low:[6,10,11,18,19]};
const lunchMap={1:15,16:15,2:13,3:2,19:13,4:12,5:17,6:12,11:12,12:10,14:12,18:17,7:20,8:20,9:14,13:7,17:8,20:16,10:18,15:1};
function rBy(cat,n){return recipes.find(r=>r.category===cat && Number(r.number)===Number(n))}
function minutes(s){const m=(s||'').match(/(\d+)/);return m?Number(m[1]):99}

function recentRecipeIds(){
  const ids=[];(planHistory||[]).slice(-5).forEach(p=>(p.recipeIds||[]).forEach(id=>ids.push(id)));return ids;
}
function feedbackScore(recipeId){
  const entries=feedbackEntries(recipeId).slice(-6);let score=0;
  entries.forEach(e=>{if(e.reaction==='loved')score+=3;else if(e.reaction==='tasted')score+=1;else if(e.reaction==='barely')score-=0.5;else if(e.reaction==='refused')score-=1;});
  return Math.max(-3,Math.min(6,score));
}
function recipeAffinityScore(r){
  if(!r)return -999;let score=feedbackScore(r.id);
  const recent=recentRecipeIds();const occurrences=recent.filter(id=>id===r.id).length;score-=occurrences*2.5;
  if(favs().includes(r.id))score+=1;
  return score;
}
function pickPersonalized(candidates,used=new Set(),seed=0){
  let list=(candidates||[]).filter(Boolean);if(!list.length)return null;
  const unused=list.filter(r=>!used.has(r.id));if(unused.length)list=unused;
  const ranked=list.map((r,i)=>({r,score:recipeAffinityScore(r)+(((seed+i*7)%11)/100)})).sort((a,b)=>b.score-a.score);
  return ranked[0]?.r||list[seed%list.length];
}
function customDinnersForPool(pool){return customRecipes.filter(r=>r.category==='Aftensmad'&&r.planGroup===pool)}
function chooseDinner(pool,used,busy,seed){let ids=dinnerPools[pool]||[];let candidates=[...ids.map(n=>rBy('Aftensmad',n)).filter(Boolean),...customDinnersForPool(pool)];if(busy==='high'){const quick=candidates.filter(r=>minutes(r.active)<=20&&!/timer|2,5|3 timer/i.test(r.total||''));if(quick.length)candidates=quick}return pickPersonalized(candidates,used,seed)}
function pickSnack(dayMeals,index){const text=dayMeals.map(r=>r?.ingredients?.join(' ')||'').join(' ').toLowerCase();let ids=[];if(text.includes('bær'))ids.push(3,5,16);if(text.includes('banan'))ids.push(4,7);if(text.includes('avocado'))ids.push(2,9);if(text.includes('laks')||text.includes('fisk'))ids.push(8,20);if(text.includes('æg'))ids.push(1,15);ids.push(3,4,7,2,1);const ingredientMatches=ids.map(n=>rBy('Mellemmåltider',n)).filter(Boolean);const customs=customRecipes.filter(r=>r.category==='Mellemmåltider');return pickPersonalized([...ingredientMatches,...customs],new Set(),index)||rBy('Mellemmåltider',3)}
function planner(){const saved=JSON.parse(localStorage.getItem('kostkompas-plan-settings')||'{"days":4}');app.innerHTML=`<div class="shell"><div class="section-title"><h2>Lav madplan</h2><button class="btn secondary" onclick="home()">← Tilbage</button></div><p class="muted">Motoren følger Kostsystemets rækkefølge og bruger nu også børnenes tidligere reaktioner og de seneste madplaner. Favoritter får et lille løft, mens nyligt brugte retter nedprioriteres – uden at afviste retter forsvinder permanent.</p><div class="planner-controls"><div class="control"><label>Antal dage</label><select id="days"><option ${saved.days==3?'selected':''}>3</option><option ${saved.days==4?'selected':''}>4</option><option ${saved.days==5?'selected':''}>5</option><option ${saved.days==7?'selected':''}>7</option></select></div><div class="control"><label>Familie</label><select disabled><option>2 voksne + 2 små børn</option></select></div></div><div class="plan-actions"><button class="btn" onclick="generatePlan()">✨ Generér madplan</button>${currentPlan?'<button class="btn secondary" onclick="renderCurrentPlan()">Vis seneste plan</button>':''}</div><div class="engine-note"><b>Personlig motor er aktiv.</b> Børnenes reaktioner påvirker forslagene nænsomt, og tidligere retter hjælper med variation.<br><br><b>Rester er aktive.</b> Når næste dags frokost bygges af aftensmaden, markeres aftensmaden som “lav dobbelt”, og frokosten tælles ikke dobbelt i indkøbslisten.</div></div>${nav()}`}
function archiveCurrentPlan(){if(!currentPlan?.items?.length)return;const recipeIds=[];currentPlan.items.forEach(d=>['breakfast','lunch','dinner','snack'].forEach(k=>{if(d[k]?.id&&!recipeIds.includes(d[k].id))recipeIds.push(d[k].id)}));planHistory=[...(planHistory||[]),{created:currentPlan.created||Date.now(),recipeIds}].slice(-8);saveHouseholdStateLocal()}
function generatePlan(){
  archiveCurrentPlan();
  const days=Number(document.getElementById('days').value),busy='normal';
  localStorage.setItem('kostkompas-plan-settings',JSON.stringify({days}));
  const pattern=patterns[days];const used=new Set();const out=[];
  for(let i=0;i<days;i++){
    const dinner=chooseDinner(pattern[i],used,busy,i);used.add(dinner.id);
    let lunch,leftover=false;
    if(i===0){const ids=firstLunchByBusy[busy];const base=ids.map(n=>rBy('Frokost',n)).filter(Boolean);lunch=pickPersonalized([...base,...customRecipes.filter(r=>r.category==='Frokost')],new Set(),i)}
    else{const prev=out[i-1].dinner;if(prev.isCustom){lunch=prev}else{const ln=lunchMap[prev.number]||1;lunch=rBy('Frokost',ln)}leftover=true;out[i-1].makeDouble=true}
    const bIds=breakfastByBusy[busy];const breakfast=pickPersonalized([...bIds.map(n=>rBy('Morgenmad',n)).filter(Boolean),...customRecipes.filter(r=>r.category==='Morgenmad')],new Set(),i);
    const snack=pickSnack([breakfast,lunch,dinner],i);
    out.push({day:i+1,breakfast,lunch,dinner,snack,leftoverLunch:leftover,makeDouble:false,outMeals:{},manual:{}})
  }
  currentPlan={days,busy:'normal',items:out,created:Date.now()};
  persistPlan();renderCurrentPlan()
}
function restorePlan(){try{currentPlan=JSON.parse(localStorage.getItem('kostkompas-current-plan')||'null')}catch(e){currentPlan=null}}
function dayName(i){
  const d=new Date();
  d.setHours(12,0,0,0);
  d.setDate(d.getDate()+i-1);
  const weekday=d.toLocaleDateString('da-DK',{weekday:'long'});
  const date=d.toLocaleDateString('da-DK',{day:'numeric',month:'short'});
  return `${weekday.charAt(0).toUpperCase()+weekday.slice(1)} · ${date}`;
}
function mealRow(label,r,note='',dayIndex=null,key=null,extraTools=''){
  if(!r)return `<div class="meal-row"><div class="meal-label">${label}</div><div><div class="meal-name">Ikke planlagt</div>${note?`<div class="meal-note">${note}</div>`:''}</div></div>`;
  const manual=dayIndex!==null&&key&&currentPlan?.items?.[dayIndex]?.manual?.[key];
  return `<div class="meal-row">
    <div class="meal-label">${label}</div>
    <div>
      <div class="meal-name" onclick="showRecipe('${r.id}')">${r.name}</div>
      ${manual?`<span class="manual-badge">Valgt af dig</span>`:''}
      ${note?`<div class="meal-note">${note}</div>`:''}
    </div>
    <div class="meal-tools">
      <button class="mini-btn" onclick="showRecipe('${r.id}')">Opskrift</button>
      ${dayIndex!==null&&key?`<button class="mini-btn" onclick="swapMeal(${dayIndex},'${key}')">↻ Byt ret</button><button class="mini-btn choose-btn" onclick="openManualPicker(${dayIndex},'${key}')">☰ Vælg selv ret</button>`:''}
      ${extraTools||''}
    </div>
  </div>`;
}
function mealIsOut(d,key){return !!d?.outMeals?.[key]}
function mealOutButton(dayIndex,key){const d=currentPlan?.items?.[dayIndex];const out=mealIsOut(d,key);return `<button class="mini-btn meal-out-btn ${out?'active':''}" onclick="toggleMealOut(${dayIndex},'${key}')">${out?'↩ Spis hjemme':'🍽 Spiser ude'}</button>`}
function freshLunchForDay(dayIndex){const ids=firstLunchByBusy.normal;return rBy('Frokost',ids[dayIndex%ids.length])||rBy('Frokost',3)}
function unlinkNextLunch(dayIndex){
  const d=currentPlan.items[dayIndex];d.makeDouble=false;
  if(dayIndex<currentPlan.items.length-1){const next=currentPlan.items[dayIndex+1];if(!next.manual)next.manual={};if(!next.manual.lunch&&next.leftoverLunch){next.lunch=freshLunchForDay(dayIndex+1);next.leftoverLunch=false}}
}
function linkNextLunch(dayIndex){
  const d=currentPlan.items[dayIndex];if(dayIndex>=currentPlan.items.length-1||mealIsOut(d,'dinner'))return;
  const next=currentPlan.items[dayIndex+1];if(!next.manual)next.manual={};
  if(!next.manual.lunch&&!mealIsOut(next,'lunch')){if(d.dinner?.isCustom)next.lunch=d.dinner;else{const ln=lunchMap[d.dinner.number]||1;next.lunch=rBy('Frokost',ln)||rBy('Frokost',1)}next.leftoverLunch=true;d.makeDouble=true}
}
function toggleMealOut(dayIndex,key){
  if(!currentPlan)return;ensureManualFlags();const d=currentPlan.items[dayIndex];if(!d.outMeals)d.outMeals={};const next=!d.outMeals[key];d.outMeals[key]=next;
  if(key==='dinner'){
    if(next)unlinkNextLunch(dayIndex);else linkNextLunch(dayIndex);
  }
  if(key==='lunch'&&dayIndex>0&&d.leftoverLunch){
    const prev=currentPlan.items[dayIndex-1];
    if(next)prev.makeDouble=false;else if(!mealIsOut(prev,'dinner'))prev.makeDouble=true;
  }
  persistPlan();renderCurrentPlan();
}
function plannedMealRow(label,d,i,key,note=''){
  if(mealIsOut(d,key))return `<div class="meal-row special-meal meal-out"><div class="meal-label">${label}</div><div><div class="meal-name">🍽️ I spiser ude</div><div class="meal-note">Dette måltid tælles ikke med i indkøbslisten.</div></div><div class="meal-tools">${mealOutButton(i,key)}</div></div>`;
  const r=d[key];
  const extra=mealOutButton(i,key);
  return mealRow(label,r,note,i,key,extra);
}
function dinnerPlanRow(d,i){
  if(mealIsOut(d,'dinner'))return plannedMealRow('Aftensmad',d,i,'dinner');
  const notes=[];if(d.makeDouble)notes.push('Lav dobbelt: aftensmad i dag → frokost i morgen');
  return mealRow('Aftensmad',d.dinner,notes.join(' · '),i,'dinner',mealOutButton(i,'dinner'));
}
function categoryForPlanKey(key){return {breakfast:'Morgenmad',lunch:'Frokost',dinner:'Aftensmad',snack:'Mellemmåltider'}[key]}
function keyLabel(key){return {breakfast:'morgenmad',lunch:'frokost',dinner:'aftensmad',snack:'mellemmåltid'}[key]}
function openManualPicker(dayIndex,key){
  const category=categoryForPlanKey(key);
  const rs=recipes.filter(r=>r.category===category);
  closeManualPicker();
  const overlay=document.createElement('div');overlay.id='manual-picker';overlay.className='picker-overlay';
  overlay.innerHTML=`<div class="picker-panel">
    <div class="picker-head"><div><div class="eyebrow">${dayName(currentPlan?.items?.[dayIndex]?.day||dayIndex+1)}</div><h2>Vælg selv ${keyLabel(key)}</h2><p>Vælg frit fra de ${rs.length} retter i kategorien.</p></div><button class="picker-close" onclick="closeManualPicker()">×</button></div>
    <input class="search" id="manual-q" placeholder="Søg…" oninput="filterManualPicker(${dayIndex},'${key}')">
    <div class="picker-grid" id="manual-picker-grid">${rs.map(r=>manualPickCard(r,dayIndex,key)).join('')}</div>
  </div>`;
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeManualPicker()});
  document.body.appendChild(overlay);document.body.style.overflow='hidden';
}
function manualPickCard(r,dayIndex,key){
  const selected=currentPlan?.items?.[dayIndex]?.[key]?.id===r.id;
  return `<article class="picker-card ${selected?'selected':''}">${recipeMedia(r,'picker-media')}<div class="picker-card-body"><h3>${r.name}</h3><div class="meta">${r.active||''} aktiv · ${r.total||''}</div><button class="btn ${selected?'secondary':''}" onclick="chooseManualMeal(${dayIndex},'${key}','${r.id}')">${selected?'Valgt nu':'Vælg denne'}</button></div></article>`
}
function filterManualPicker(dayIndex,key){
  const q=(document.getElementById('manual-q')?.value||'').toLowerCase();const category=categoryForPlanKey(key);
  const rs=recipes.filter(r=>r.category===category&&(r.name.toLowerCase().includes(q)||r.ingredients.join(' ').toLowerCase().includes(q)));
  const grid=document.getElementById('manual-picker-grid');if(grid)grid.innerHTML=rs.map(r=>manualPickCard(r,dayIndex,key)).join('')||'<div class="empty">Ingen retter matcher søgningen.</div>';
}
function closeManualPicker(){const el=document.getElementById('manual-picker');if(el)el.remove();document.body.style.overflow=''}
function ensureManualFlags(){if(!currentPlan)return;currentPlan.items.forEach(d=>{if(!d.manual)d.manual={}})}
function chooseManualMeal(dayIndex,key,recipeId){
  if(!currentPlan)return;ensureManualFlags();
  const r=recipes.find(x=>x.id===recipeId);if(!r)return;
  const d=currentPlan.items[dayIndex];d[key]=r;d.manual[key]=true;
  if(key==='lunch'){d.leftoverLunch=false}
  if(key==='dinner'){
    if(dayIndex<currentPlan.items.length-1){
      const nextDay=currentPlan.items[dayIndex+1];if(!nextDay.manual)nextDay.manual={};
      if(!nextDay.manual.lunch){
        if(r.isCustom)nextDay.lunch=r;else{const ln=lunchMap[r.number]||1;nextDay.lunch=rBy('Frokost',ln)||rBy('Frokost',1)}nextDay.leftoverLunch=true;d.makeDouble=true;
      }else{
        d.makeDouble=false;
      }
    }else d.makeDouble=false;
  }
  // A manually chosen snack is never overwritten. Otherwise let snack continue to follow the day's ingredients.
  if((key==='breakfast'||key==='lunch'||key==='dinner')&&!d.manual.snack)d.snack=pickSnack([d.breakfast,d.lunch,d.dinner],dayIndex);
  persistPlan();closeManualPicker();renderCurrentPlan();
}

function randomOther(list,currentId){
  const choices=list.filter(r=>r && r.id!==currentId);
  if(!choices.length)return list.find(Boolean);
  return choices[Math.floor(Math.random()*choices.length)];
}
function candidatesForMeal(dayIndex,key){
  const d=currentPlan.items[dayIndex];
  if(key==='breakfast')return recipes.filter(r=>r.category==='Morgenmad');
  if(key==='snack')return recipes.filter(r=>r.category==='Mellemmåltider');
  if(key==='lunch')return recipes.filter(r=>r.category==='Frokost');
  if(key==='dinner'){
    const role=dinnerRole(d.dinner);
    let ids=dinnerPools[role]||[];
    let pool=ids.map(n=>rBy('Aftensmad',n)).filter(Boolean);
    if(pool.length<2)pool=recipes.filter(r=>r.category==='Aftensmad');
    return pool;
  }
  return [];
}
function swapMeal(dayIndex,key){
  if(!currentPlan)return;ensureManualFlags();
  const d=currentPlan.items[dayIndex];const current=d[key];const next=randomOther(candidatesForMeal(dayIndex,key),current?.id);if(!next)return;
  d[key]=next;delete d.manual[key];
  if(key==='lunch')d.leftoverLunch=false;
  if(key==='dinner'){
    if(dayIndex<currentPlan.items.length-1){
      const nextDay=currentPlan.items[dayIndex+1];if(!nextDay.manual)nextDay.manual={};
      if(!nextDay.manual.lunch){
        d.makeDouble=true;const ln=lunchMap[next.number]||1;nextDay.lunch=rBy('Frokost',ln)||rBy('Frokost',1);nextDay.leftoverLunch=true;
      }else d.makeDouble=false;
    }else d.makeDouble=false;
  }
  if((key==='breakfast'||key==='lunch'||key==='dinner')&&!d.manual.snack)d.snack=pickSnack([d.breakfast,d.lunch,d.dinner],dayIndex+Math.floor(Math.random()*5));
  persistPlan();renderCurrentPlan();
}
function renderCurrentPlan(){
  closeManualPicker();
  if(!currentPlan){planner();return}
  currentPlan.items.forEach(d=>{if(!d.outMeals||typeof d.outMeals!=='object')d.outMeals={};});
  const f=nutritionCheck(currentPlan),passed=f.filter(x=>x.ok).length;
  const keyFilter=f.filter(x=>['Jern hver dag','C-vitamin ved plantejern','Fisk og omega-3','Fedtvariation','Variation over ugen'].includes(x.label));
  app.innerHTML=`<div class="shell">
    <div class="section-title">
      <h2>${currentPlan.days}-dages madplan</h2>
      <button class="btn secondary" onclick="planner()">← Indstillinger</button>
    </div>
    <div class="plan-actions">
      <button class="btn" onclick="shoppingList()">🛒 Indkøbsliste</button>
      <button class="btn secondary" onclick="generatePlanFromStored()">↻ Lav en anden plan</button>
    </div>
    <section class="nutrition-summary"><div><span class="eyebrow">Ugens Ernæringsfilter</span><h3>${passed} af ${f.length} pejlemærker ser gode ud</h3><p>Et hurtigt overblik efter Kostkompasset – ikke kalorietælling eller en rigid sundhedsscore.</p></div><div class="nutrition-chips">${keyFilter.map(x=>`<span class="nutrition-chip ${x.ok?'ok':'attention'}">${x.ok?'✓':'•'} ${x.label}</span>`).join('')}</div></section>
    <div class="engine-note"><b>Planen er fleksibel.</b> Markér “Spiser ude” på det enkelte måltid, hvis I ikke spiser hjemme. Rester og indkøbsliste justeres automatisk.</div>
    <div class="week">
      ${currentPlan.items.map((d,i)=>`<section class="day-card ${Object.values(d.outMeals||{}).some(Boolean)?'day-adjusted':''}">
        <div class="day-head"><h3>${dayName(d.day)}</h3>${Object.values(d.outMeals||{}).some(Boolean)?'<span class="day-tag">Tilpasset</span>':''}</div>
        ${plannedMealRow('Morgenmad',d,i,'breakfast')}
        ${plannedMealRow('Frokost',d,i,'lunch',d.leftoverLunch?'Planlagt fra gårsdagens aftensmad · indkøb tælles via dobbelt aftensmad':'')}
        ${dinnerPlanRow(d,i)}
        ${plannedMealRow('Mellemmåltid',d,i,'snack')}
      </section>`).join('')}
    </div>
    <div class="section-title"><h2>Ernæringsfilter · detaljer</h2></div>
    <div class="filter-check">${f.map(x=>`<div class="check-card ${x.ok?'':'warn'}"><strong>${x.ok?'✓':'•'} ${x.label}</strong>${x.text}</div>`).join('')}</div>
  </div>${nav()}`;
}
function generatePlanFromStored(){const s=JSON.parse(localStorage.getItem('kostkompas-plan-settings')||'{"days":4}');planner();setTimeout(()=>{document.getElementById('days').value=s.days;generatePlan()},0)}
function nutritionCheck(plan){
  const activeDinners=plan.items.filter(d=>!mealIsOut(d,'dinner')).map(x=>x.dinner).filter(Boolean);
  const all=plan.items.flatMap(d=>[['breakfast',d.breakfast],['lunch',d.lunch],['dinner',d.dinner],['snack',d.snack]].filter(([k])=>!mealIsOut(d,k)).map(([,r])=>r)).filter(Boolean);
  const text=all.map(r=>(r.name+' '+r.ingredients.join(' ')+' '+(r.why||[]).join(' ')).toLowerCase()).join(' ');
  const fish=activeDinners.filter(r=>/laks|fisk|torsk|sej/.test(r.name.toLowerCase())).length;
  const fatFish=activeDinners.filter(r=>/laks/.test(r.name.toLowerCase())).length;
  const ironDays=plan.items.filter(d=>[['breakfast',d.breakfast],['lunch',d.lunch],['dinner',d.dinner],['snack',d.snack]].filter(([k])=>!mealIsOut(d,k)).map(([,r])=>r).filter(Boolean).some(r=>/oksekød|kød|æg|laks|fisk|havre|linser|bønner|rugbrød/i.test((r.name+' '+r.ingredients.join(' '))))).length;
  const roles=new Set(activeDinners.map(r=>dinnerRole(r)));
  const fishTarget=plan.days<5?1:2;
  return [
  {label:'Jern hver dag',ok:ironDays===plan.days,text:`Jernkilder optræder på ${ironDays} af ${plan.days} dage.`},
  {label:'C-vitamin ved plantejern',ok:/bær|kiwi|tomat|passata|peberfrugt|broccoli|clementin|appelsin/.test(text),text:'Planen indeholder frugt, bær eller grønt med C-vitamin sammen med ugens plantejernskilder.'},
  {label:'Fisk og omega-3',ok:fatFish>=1&&fish>=fishTarget,text:`${fish} planlagte fiskeaftener hjemme, heraf ${fatFish} med laks/fed fisk.${plan.items.some(d=>mealIsOut(d,'dinner'))?' Aftensmåltider ude vurderes ikke som fiskemåltid.':''}`},
  {label:'Energi nok',ok:/kartoffel|pasta|ris|havre|rugbrød|banan|tortilla|brød/.test(text),text:'Måltiderne indeholder gennemgående tydelige energikilder til både voksne og små børn.'},
  {label:'Fedtvariation',ok:/evoo|olivenolie/.test(text)&&/avocado|peanutbutter|tahin|laks|smør|æg|yoghurt/.test(text),text:'Olivenolie kombineres med andre fedtkilder som avocado, nøddesmør, fisk, æg, smør eller mejeri.'},
  {label:'Mejeri i balance',ok:true,text:'Mejeri indgår som del af måltiderne og er ikke planens eneste protein-/fedtkilde.'},
  {label:'Variation over ugen',ok:roles.size>=Math.min(3,Math.max(1,activeDinners.length)),text:`De ${activeDinners.length} planlagte hjemmeaftener varierer mellem ${roles.size} måltidsroller/proteintyper.`},
  {label:'Salt og forarbejdning',ok:true,text:'Planen er bygget af Kostkompas-opskrifter; børneportioner tilpasses fortsat for salt og færdigprodukter vælges efter Kostsystemet.'},
  {label:'Alderssikkerhed',ok:true,text:'Brug opskrifternes konkrete småbørnstilpasninger ved servering.'},
  {label:'D-vitaminrutine',ok:true,text:'Håndteres separat efter familiens faste rutine, ikke via madplanen.'}
  ]
}
function dinnerRole(r){const n=Number(r.number);for(const [k,a] of Object.entries(dinnerPools))if(a.includes(n))return k;return 'other'}

function parseFraction(s){if(/^\d+\/\d+$/.test(s)){const[a,b]=s.split('/').map(Number);return a/b}return Number(s.replace(',','.'))}
function normName(s){
  return s.toLowerCase()
    .replace(/arla cultura/gi,'')
    .replace(/øko naturel/gi,'')
    .replace(/chosen foods classic avocado oil mayo|chosen foods avocado-mayo|chosen foods classic|chosen foods/gi,'avocado-mayo')
    .replace(/heinz organic tomato ketchup/gi,'ketchup')
    .replace(/rømer tahin uden salt ø|rømer tahin/gi,'tahin')
    .replace(/ekstra jomfruolivenolie|\bevoo\b/gi,'olivenolie')
    .replace(/a38\s*3,5\s*%|a38\s*3\.5\s*%|a38/gi,'a38')
    .replace(/naturel yoghurt/gi,'yoghurt naturel')
    .replace(/100\s*%\s*smooth\s*peanutbutter|100\s*%\s*peanutbutter/gi,'peanutbutter')
    .replace(/100\s*%\s*mandelsmør/gi,'mandelsmør')
    .replace(/\bkogte kartofler\b|\bkartoflerne\b/gi,'kartofler')
    .replace(/\btilberedt laks\b/gi,'laks')
    .replace(/\btilberedt kylling\b/gi,'kylling')
    .replace(/\bmodne bananer\b|\bmoden banan\b/gi,'banan')
    .replace(/\bkiwier\b/gi,'kiwi')
    .replace(/\s+/g,' ')
    .trim();
}
function parseIngredient(s,m=1){
  let x=s.trim();
  let match=x.match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*(g|kg|ml|dl|l|spsk|tsk|stk\.?|dåse|dåser|små skiver|skiver)?\s*(.*)$/i);
  if(!match)return {name:normName(x),display:x,qty:null,unit:'',raw:x};

  let qty=parseFraction(match[1])*m;
  let unit=(match[2]||'stk').toLowerCase().replace('.','');
  let rest=(match[3]||'').trim();

  rest=rest.replace(/^(stor|store|lille|små|moden|modne|fintrevet|revet|kogt|kogte|tilberedt|meget mør|blødt|bløde)\s+/i,'');

  if(unit==='kg'){qty*=1000;unit='g'}
  if(unit==='l'){qty*=1000;unit='ml'}
  if(unit==='dl'){qty*=100;unit='ml'}
  if(unit==='dåse'||unit==='dåser')unit='dåse';

  return {name:normName(rest||x),qty,unit,raw:x};
}
function categoryFor(name){const n=name.toLowerCase();if(/laks|torsk|sej|fisk|kylling|oksekød|kalv|flæsk|kød/.test(n))return 'Fisk & kød';if(/æg|a38|yoghurt|ost|mascarpone|fløde|mælk|smør/.test(n))return 'Mejeri & æg';if(/kartof|broccoli|guler|avocado|kiwi|banan|bær|æble|pære|peber|tomat|citron|lime|løg|agurk|ærter|kål|dild|persille|purløg/.test(n))return 'Frugt & grønt';if(/havre|pasta|ris|rugbrød|brød|tortilla|pita|linser|bønner|kikærter|passata|tomater|kokosmælk|tahin|peanut|mandel|mel/.test(n))return 'Kolonial';return 'Andet'}
function buildShopping(plan){
  const map=new Map();
  const addIngredient=(raw,m=1)=>{const p=parseIngredient(raw,m);const key=p.name+'|'+p.unit;if(!map.has(key))map.set(key,{...p,qty:p.qty||0,count:p.qty?0:1});else{const o=map.get(key);if(p.qty)o.qty+=p.qty;else o.count+=1}};
  const addRecipe=(r,m=1)=>{if(!r)return;r.ingredients.forEach(s=>addIngredient(s,m))};
  plan.items.forEach((d,i)=>{
    if(!mealIsOut(d,'breakfast'))addRecipe(d.breakfast,1);
    if(!mealIsOut(d,'lunch')&&(i===0||!d.leftoverLunch))addRecipe(d.lunch,1);
    if(!mealIsOut(d,'dinner'))addRecipe(d.dinner,d.makeDouble?2:1)
    if(!mealIsOut(d,'snack'))addRecipe(d.snack,1)
  });
  const groups={};for(const v of map.values()){const c=categoryFor(v.name);(groups[c]??=[]).push(v)}return groups
}
function fmtItem(v){
  if(v.qty){
    let q=Math.round(v.qty*10)/10;
    let unit=v.unit;
    if(unit==='g'&&q>=1000){q=Math.round(q/100)/10;unit='kg'}
    if(unit==='ml'&&q>=1000){q=Math.round(q/100)/10;unit='l'}
    const pretty=v.name.charAt(0).toUpperCase()+v.name.slice(1);
    return `${String(q).replace('.',',')} ${unit} ${pretty}`;
  }
  return v.raw||v.name;
}

function shoppingPlanMeal(label,r,note=''){
  if(!r)return `<div class="shop-plan-meal no-photo"><div></div><div><span>${label}</span><strong>Ikke planlagt</strong>${note?`<small>${note}</small>`:''}</div></div>`;
  return `<div class="shop-plan-meal">${r.image?`<img src="${r.image}" alt="">`:`<div class="shop-plan-placeholder">🍽️</div>`}<div><span>${label}</span><strong>${r.name}</strong>${note?`<small>${note}</small>`:''}</div></div>`
}
function shoppingPlanOverview(){
  return `<section class="shopping-plan-section"><div class="shopping-plan-head"><div><span class="eyebrow">Overblik</span><h2>Madplanen du handler til</h2><p>Her kan du hurtigt se, hvilke måltider indkøbslisten dækker – inkl. jeres tilpassede dage.</p></div><button class="btn secondary" onclick="renderCurrentPlan()">Redigér madplan</button></div>
    <div class="shopping-days">${currentPlan.items.map((d,i)=>`<article class="shopping-day"><h3>${dayName(d.day)}</h3>${mealIsOut(d,'breakfast')?shoppingPlanMeal('Morgenmad',null,'Spiser ude · intet indkøb'):shoppingPlanMeal('Morgenmad',d.breakfast)}${mealIsOut(d,'lunch')?shoppingPlanMeal('Frokost',null,'Spiser ude · intet indkøb'):shoppingPlanMeal('Frokost',d.lunch,d.leftoverLunch?'Rester fra dagen før':'')}${mealIsOut(d,'dinner')?shoppingPlanMeal('Aftensmad',null,'Spiser ude · intet indkøb'):shoppingPlanMeal('Aftensmad',d.dinner,d.makeDouble?'Lav dobbelt → frokost i morgen':'')}${mealIsOut(d,'snack')?shoppingPlanMeal('Mellemmåltid',null,'Spiser ude · intet indkøb'):shoppingPlanMeal('Mellemmåltid',d.snack)}</article>`).join('')}</div>
  </section>`
}


function customRecipeEditor(id=''){
  const existing=id?customRecipes.find(r=>r.id===id):null;
  const category=existing?.category||'Aftensmad';
  const groups=[['fatFish','Fed fisk'],['leanFish','Mager fisk'],['beef','Oksekød / rødt kød'],['chicken','Kylling / fjerkræ'],['egg','Æg / bælgfrugter / vegetarisk']];
  app.innerHTML=`<div class="shell"><div class="section-title"><div><span class="eyebrow">Familiens egne retter</span><h2>${existing?'Redigér egen ret':'Tilføj jeres egen ret'}</h2></div><button class="btn secondary" onclick="library()">← Opskrifter</button></div>
  <p class="muted">Egne retter synkroniseres mellem jeres enheder og kan vælges i madplanen. Aftensmadsretter kan også bruges af den personlige madplansmotor, når du angiver rettens hovedtype.</p>
  <form class="custom-recipe-form" onsubmit="saveCustomRecipe(event,'${existing?.id||''}')">
    <div class="custom-form-grid"><label><span>Navn</span><input id="cr-name" required value="${escapeHtml(existing?.name||'')}" placeholder="Fx Mormors frikadeller"></label>
    <label><span>Kategori</span><select id="cr-category" onchange="toggleCustomPlanGroup()">${['Morgenmad','Frokost','Aftensmad','Mellemmåltider'].map(c=>`<option ${c===category?'selected':''}>${c}</option>`).join('')}</select></label>
    <label><span>Aktiv tid</span><input id="cr-active" value="${escapeHtml(existing?.active||'20 min')}" placeholder="Fx 20 min"></label>
    <label><span>Samlet tid</span><input id="cr-total" value="${escapeHtml(existing?.total||'30 min')}" placeholder="Fx 30 min"></label></div>
    <label id="cr-plan-group-wrap" class="custom-wide"><span>Hovedtype til madplansmotoren</span><select id="cr-plan-group">${groups.map(([v,l])=>`<option value="${v}" ${existing?.planGroup===v?'selected':''}>${l}</option>`).join('')}</select><small>Bruges kun, hvis retten er aftensmad.</small></label>
    <label class="custom-wide"><span>Ingredienser · én pr. linje</span><textarea id="cr-ingredients" required rows="8" placeholder="500 g hakket oksekød\n1 løg\n700 g kartofler">${escapeHtml((existing?.ingredients||[]).join('\n'))}</textarea></label>
    <label class="custom-wide"><span>Fremgangsmåde · ét trin pr. linje</span><textarea id="cr-steps" required rows="8" placeholder="Hak løget fint.\nSteg kødet.\nServer med ...">${escapeHtml((existing?.steps||[]).join('\n'))}</textarea></label>
    <label class="custom-wide"><span>Sovs / dip / smag <small>valgfrit</small></span><textarea id="cr-taste" rows="3">${escapeHtml(existing?.taste||'')}</textarea></label>
    <label class="custom-wide"><span>Småbørnstilpasning <small>valgfrit</small></span><textarea id="cr-child" rows="3">${escapeHtml(existing?.child||'')}</textarea></label>
    <label class="custom-wide"><span>Hvorfor passer retten i Kostkompasset? <small>én pointe pr. linje</small></span><textarea id="cr-why" rows="4">${escapeHtml((existing?.why||[]).join('\n'))}</textarea></label>
    <div class="custom-recipe-actions"><button class="btn" type="submit">${existing?'Gem ændringer':'Tilføj retten'}</button>${existing?`<button class="btn secondary" type="button" onclick="showRecipe('${existing.id}')">Annullér</button>`:''}</div>
  </form></div>${nav()}`;
  toggleCustomPlanGroup();
}
function toggleCustomPlanGroup(){const wrap=document.getElementById('cr-plan-group-wrap');if(wrap)wrap.style.display=document.getElementById('cr-category')?.value==='Aftensmad'?'grid':'none'}
function linesFrom(id){return (document.getElementById(id)?.value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean)}
async function saveCustomRecipe(e,id=''){
  e.preventDefault();const category=document.getElementById('cr-category').value;const existing=id?customRecipes.find(r=>r.id===id):null;
  const recipe={id:existing?.id||`egen-${Date.now()}`,name:document.getElementById('cr-name').value.trim(),category,number:null,portion:'2 voksne + 2 børn',active:document.getElementById('cr-active').value.trim()||'20 min',total:document.getElementById('cr-total').value.trim()||document.getElementById('cr-active').value.trim()||'20 min',ingredients:linesFrom('cr-ingredients'),steps:linesFrom('cr-steps'),taste:document.getElementById('cr-taste').value.trim(),child:document.getElementById('cr-child').value.trim(),tip:'',why:linesFrom('cr-why'),image:'',isCustom:true,planGroup:category==='Aftensmad'?document.getElementById('cr-plan-group').value:''};
  if(existing)customRecipes=customRecipes.map(r=>r.id===id?recipe:r);else customRecipes.push(recipe);
  if(currentPlan?.items?.length)currentPlan.items.forEach(d=>['breakfast','lunch','dinner','snack'].forEach(k=>{if(d[k]?.id===recipe.id)d[k]=recipe}));
  rebuildRecipes();saveHouseholdStateLocal();await saveHouseholdStateCloud();if(currentPlan)persistPlan();showRecipe(recipe.id);
}
async function deleteCustomRecipe(id){
  const r=customRecipes.find(x=>x.id===id);if(!r)return;const inPlan=currentPlan?.items?.some(d=>['breakfast','lunch','dinner','snack'].some(k=>d[k]?.id===id));if(inPlan){alert('Retten er med i den aktive madplan. Byt den først ud i madplanen, og slet den derefter.');return}if(!confirm(`Slet “${r.name}”?`))return;
  customRecipes=customRecipes.filter(x=>x.id!==id);delete recipeFeedback[id];let f=favs().filter(x=>x!==id);saveFavs(f);rebuildRecipes();saveHouseholdStateLocal();await saveHouseholdStateCloud();library();
}
function pantry(){
  loadHouseholdState();
  const items=allPantryItems();
  const cats=[...new Set(items.map(x=>x.category||'Andet'))];
  app.innerHTML=`<div class="shell"><div class="section-title"><div><span class="eyebrow">Det har vi hjemme</span><h2>Basislager</h2></div><button class="btn secondary" onclick="home()">← Tilbage</button></div>
  <p class="muted">Markér de varer, I normalt har hjemme lige nu. Når de er markeret, holder Kostkompasset dem ude af hovedindkøbslisten og viser dem i stedet som “har hjemme”. Status synkroniseres mellem computer og telefon.</p>
  <div class="pantry-summary"><div><strong>${items.filter(x=>pantryHas(x.id)).length}</strong><span>varer markeret hjemme</span></div><button class="btn secondary" onclick="setAllPantry(false)">Ryd markeringer</button></div>
  <div class="pantry-groups">${cats.map(cat=>`<section class="shop-card pantry-card"><h3>${cat}</h3><div class="basis-list">${items.filter(x=>(x.category||'Andet')===cat).map(x=>`<label class="pantry-item"><input type="checkbox" ${pantryHas(x.id)?'checked':''} onchange="togglePantry('${x.id}',this.checked)"><span>${escapeHtml(x.name)}</span>${String(x.id).startsWith('custom-')?`<button type="button" class="feedback-delete" onclick="event.preventDefault();event.stopPropagation();removeCustomPantry('${x.id}')">Slet</button>`:''}</label>`).join('')}</div></section>`).join('')}</div>
  <section class="shop-card add-pantry"><h3>Tilføj jeres egen basisvare</h3><div class="add-pantry-row"><input id="pantry-new" class="search" placeholder="Fx chiafrø eller kokosmælk"><button class="btn" onclick="addCustomPantry()">Tilføj</button></div><p class="small muted">Egne varer bliver også brugt til at sortere indkøbslisten, når navnet matcher en ingrediens.</p></section></div>${nav()}`;
}
function togglePantry(id,value){pantryState.items[id]=value;saveHouseholdStateCloud().catch(console.warn)}
function setAllPantry(value){allPantryItems().forEach(x=>pantryState.items[x.id]=value);saveHouseholdStateCloud().then(pantry).catch(()=>pantry())}
function addCustomPantry(){
  const input=document.getElementById('pantry-new');const name=(input?.value||'').trim();if(!name)return;
  const id='custom-'+Date.now();pantryState.custom.push({id,name,category:'Egne varer',keywords:[name.toLowerCase()]});pantryState.items[id]=true;
  saveHouseholdStateCloud().then(pantry).catch(()=>pantry());
}
function removeCustomPantry(id){pantryState.custom=(pantryState.custom||[]).filter(x=>x.id!==id);delete pantryState.items[id];saveHouseholdStateCloud().then(pantry).catch(()=>pantry())}
function splitShoppingByPantry(groups){
  const need={},home={};
  Object.entries(groups).forEach(([cat,vals])=>vals.forEach(v=>{const target=pantryMatches(v.name)?home:need;(target[cat]??=[]).push(v)}));
  return {need,home};
}
function shoppingList(){
  if(!currentPlan){planner();return}
  loadHouseholdState();
  const rawGroups=buildShopping(currentPlan);const split=splitShoppingByPantry(rawGroups);const groups=split.need,atHome=split.home;
  const order=['Frugt & grønt','Fisk & kød','Mejeri & æg','Kolonial','Andet'];
  const neededCount=Object.values(groups).reduce((n,a)=>n+a.length,0);const checkedCount=Object.keys(shoppingChecks).filter(k=>shoppingChecks[k]&&k.startsWith('shop:')).length;
  app.innerHTML=`<div class="shell">
    <div class="section-title"><h2>Indkøbsliste</h2><button class="btn secondary" onclick="renderCurrentPlan()">← Madplan</button></div>
    ${shoppingPlanOverview()}
    <div class="shopping-list-toolbar"><div><span class="eyebrow">Klar til butikken</span><h2>Det skal du handle</h2><p class="muted">${neededCount} varelinjer · ${Math.min(checkedCount,neededCount)} afkrydset</p></div><div class="actions"><button class="btn secondary" onclick="pantry()">🏡 Basislager</button><button class="btn secondary" onclick="clearShoppingChecks()">Nulstil flueben</button></div></div>
    <p class="muted">Samme ingrediens samles så vidt muligt på tværs af retterne. Planlagte restefrokoster tælles ikke dobbelt. Måltider markeret som “Spiser ude” fjernes automatisk. Flueben og basislager synkroniseres mellem jeres enheder.</p>
    <div class="shopping-wrap">
      <div class="shop-card">
        ${order.filter(c=>groups[c]?.length).map(c=>`<div class="shop-cat"><h4>${c}</h4>${groups[c].sort((a,b)=>a.name.localeCompare(b.name)).map(v=>{const key=`shop:${c}:${v.name}:${v.unit}`;return `<label class="shop-item"><input type="checkbox" ${shoppingChecks[key]?'checked':''} onchange="saveShoppingCheck('${encodeURIComponent(key)}',this.checked)"><span>${fmtItem(v)}</span></label>`}).join('')}</div>`).join('')||'<div class="empty">Alt på listen er enten afkrydset eller markeret som basislager.</div>'}
      </div>
      <aside class="shop-card"><div class="section-title compact"><h3>Har hjemme</h3><button class="text-link" onclick="pantry()">Redigér</button></div><div class="basis-list">${order.filter(c=>atHome[c]?.length).map(c=>atHome[c].sort((a,b)=>a.name.localeCompare(b.name)).map(v=>`<label class="home-item"><span>✓</span><span>${fmtItem(v)}</span></label>`).join('')).join('')||'<p class="muted small">Ingen ingredienser fra planen er markeret som basislager endnu.</p>'}</div><div class="engine-note" style="margin-top:18px"><b>Tjek før du handler:</b><br>Hvis en basisvare er ved at være tom, fjern markeringen i Basislager – så kommer den tilbage på hovedlisten.</div></aside>
    </div>
  </div>${nav()}`;
}
function saveShoppingCheck(encoded,checkedValue){
  const key=decodeURIComponent(encoded);shoppingChecks[key]=checkedValue;saveHouseholdStateLocal();saveHouseholdStateCloud().catch(console.warn);
}
function clearShoppingChecks(){shoppingChecks={};saveHouseholdStateLocal();saveHouseholdStateCloud().then(shoppingList).catch(()=>shoppingList())}
function knowledge(){app.innerHTML=`<div class="shell"><div class="section-title"><h2>Kostkompasset</h2><button class="btn secondary" onclick="home()">← Tilbage</button></div><p class="muted">Den korte hverdagsretning fra familiens Kostsystem.</p><div class="knowledge"><div class="note"><b>🌿 Rigtig mad først</b><br><br>Genkendelige, minimalt forarbejdede råvarer er fundamentet.</div><div class="note"><b>🍽️ Fire byggesten</b><br><br>Jern/protein + energi/stivelse + grønt/frugt + fedt.</div><div class="note"><b>🔄 Variation</b><br><br>Vurder dagen og især ugen frem for hvert enkelt måltid.</div><div class="note"><b>👨‍👩‍👧‍👦 Én grundmad</b><br><br>Børnene spiser familiens mad tilpasset salt, styrke, konsistens og størrelse.</div><div class="note"><b>🐟 Fisk fast i ugen</b><br><br>Variér fed og mager fisk; fed fisk regelmæssigt.</div><div class="note"><b>🥑 Fedtvariation</b><br><br>Fed fisk, olivenolie, avocado, nøddesmør, æg, smør og mejeri.</div><div class="note"><b>🩸 Jern hver dag</b><br><br>Tænk C-vitamin sammen med relevante plantejernskilder.</div><div class="note"><b>👶 Alderssikkerhed</b><br><br>Tilpas hårde/runde fødevarer, hele nødder og andre kvælningsrisici.</div></div></div>${nav()}`}
fetch('recipes.json').then(r=>r.json()).then(d=>{baseRecipes=d;loadHouseholdState();rebuildRecipes();startApp()}).catch(()=>loginScreen('Opskrifterne kunne ikke indlæses. Prøv at genindlæse siden.'));
