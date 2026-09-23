const qs=s=>document.querySelector(s);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rooms=[2,3].flatMap(f=>FLOORS[f].rooms.map(r=>({...r,floor:f})));
const landmarks=Object.entries(LANDMARKS).map(([key,p])=>({id:`point:${key}`,name:p.name,floor:p.floor,position:p.position,kind:'landmark'}));
const places=[...rooms,...landmarks],byId=id=>places.find(p=>p.id===id),shortName=r=>r.short||r.name;
let source=null,target=null,floor=2,filter='all',zoom=window.innerWidth<760?3:1;
let choosing=true;

function labelFor(r){return r.id==='201'?`Окно 201 · ${r.name}`:r.id.startsWith('win-')||r.id.startsWith('wc-')||r.id==='wardrobe'||r.kind==='landmark'||r.name===`Кабинет ${r.id}`?r.name:`Кабинет ${r.id} · ${r.name}`}
function fillSourceOptions(){
  const options=[2,3].map(f=>`<optgroup label="${f} этаж — кабинеты и окна">${rooms.filter(r=>r.floor===f).map(r=>`<option value="${safe(r.id)}">${safe(labelFor(r))}</option>`).join('')}</optgroup><optgroup label="${f} этаж — ориентиры">${landmarks.filter(p=>p.floor===f).map(p=>`<option value="${safe(p.id)}">${safe(p.name)}</option>`).join('')}</optgroup>`).join('');
  qs('#from-select').innerHTML='<option value="">Выберите кабинет, окно или ориентир</option>'+options;
}
function marker(r){
  const wc=r.id.startsWith('wc-'),windowPlace=r.window||r.id==='wardrobe';
  let width=r.id.startsWith('203/')?52:r.id.startsWith('win-')?56:r.id.includes('/')?70:r.id==='wardrobe'?88:wc?48:windowPlace?78:64;
  let [x,y]=r.label,number=wc?'Т':r.id.startsWith('win-')?'№ '+r.id.slice(4):r.id==='wardrobe'?'Гардероб':r.id;
  return `${windowPlace?`<path class="window-leader" d="M${x} ${y} L${r.door[0]} ${r.door[1]}"/><circle class="service-point" cx="${r.door[0]}" cy="${r.door[1]}" r="5"/>`:''}<g class="plan-room ${wc?'wc':windowPlace?'window':'room'}${source?.id===r.id?' origin-room':''}${target?.id===r.id?' selected':''}" role="button" tabindex="0" data-id="${safe(r.id)}" aria-label="${safe(labelFor(r))}"><title>${safe(labelFor(r))}</title><rect x="${x-width/2}" y="${y-19}" width="${width}" height="38" rx="6"/><text x="${x}" y="${y+6}" text-anchor="middle" class="plan-number">${safe(number)}</text></g>`;
}
function serviceShapes(f){return (SERVICE_ZONES[f]||[]).map(([x,y,w,h])=>`<rect class="service-zone" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`).join('')}
function door(p){return p.kind==='landmark'?p.position:p.door}
function chain(p){const c=FLOORS[p.floor].corridorY,d=door(p);return p.kind==='landmark'?[[d[0],c]]:p.via?[...p.via,d]:[[d[0],c],d]}
function routePoints(){
  if(!source||!target||source.id===target.id)return null;
  let a=chain(source),b=chain(target),stair=FLOORS[floor].stair;
  if(source.floor===target.floor){if(floor!==source.floor)return null;return [...a.slice().reverse(),b[0],...b.slice(1)]}
  if(floor===source.floor)return [...a.slice().reverse(),stair];
  if(floor===target.floor)return [stair,b[0],...b.slice(1)];
  return null;
}
function routeMarkup(){const points=routePoints();if(!points)return '';const clean=points.filter((p,i)=>!i||p[0]!==points[i-1][0]||p[1]!==points[i-1][1]);if(clean.length<2)return '';let d=clean.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ');return `<path class="route-white" d="${d}"/><path class="route-color" d="${d}"/>`}
function map(){
  const d=FLOORS[floor],src=source?.floor===floor?door(source):source&&target?.floor===floor?d.stair:null;
  const dest=target?.floor===floor?door(target):null;
  const here=src?`<circle class="origin-halo" cx="${src[0]}" cy="${src[1]}" r="20"/><circle class="origin-center" cx="${src[0]}" cy="${src[1]}" r="11"/><text class="here-text" x="${Math.min(1120,Math.max(55,src[0]-70))}" y="${src[1]-30}">${source.floor===floor?'ВЫ СЕЙЧАС':'ОТ ЛЕСТНИЦЫ'}</text>`:'';
  const goal=dest?`<circle class="destination" cx="${dest[0]}" cy="${dest[1]}" r="10"/>`:'';
  qs('#map').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1328 ${d.height}" role="img" aria-label="План ${floor} этажа"><defs><pattern id="closed" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#fff1f0"/><path d="M0 0 V12" stroke="#f4d0cb" stroke-width="4"/></pattern></defs><rect width="1328" height="${d.height}" fill="#fbfcfb"/>${serviceShapes(floor)}<image href="/floor-${floor}-walls.svg" width="1328" height="${d.height}"/>${routeMarkup()}<text class="plan-stair" x="1208" y="${floor===2?183:260}" text-anchor="middle">ЛЕСТНИЦА</text>${floor===2?'<text class="closed-label" x="1040" y="494">СЛУЖЕБНЫЕ ЗОНЫ</text>':''}${d.rooms.map(marker).join('')}${goal}${here}</svg>`;
  qs('#map').querySelectorAll('[data-id]').forEach(el=>{
    const pick=()=>{let r=byId(el.dataset.id);if(!source)updateSource(r);else updateTarget(r)};
    el.addEventListener('click',pick);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick()}});
  });
  applyZoom();
  const anchor=source?.floor===floor?door(source):d.hall,scroller=qs('.map-scroll'),scale=qs('#map').getBoundingClientRect().width/1328;scroller.scrollLeft=Math.max(0,anchor[0]*scale-scroller.clientWidth/2);scroller.scrollTop=Math.max(0,anchor[1]*scale-scroller.clientHeight/2);
}
function renderLocation(){
  qs('#location').innerHTML=source?`<b>● Вы сейчас: ${safe(labelFor(source))}</b><button type="button" class="location-edit" id="from-shortcut">Изменить место ↗</button>`:
    `<b>○ Где вы сейчас?</b>Выберите кабинет, окно или ориентир рядом с вами.`;
  const shortcut=qs('#from-shortcut');if(shortcut)shortcut.onclick=focusSource;
}
function renderResults(){
  const enabled=Boolean(source),query=qs('#search').value.trim().toLocaleLowerCase('ru');
  qs('#search').disabled=!enabled;qs('#destination-step').classList.toggle('locked',!enabled);
  qs('#change-source').hidden=!enabled;
  qs('#destination-help').textContent=enabled?'Найдите кабинет, окно или туалет. Вы можете изменить своё положение выше.':'Сначала укажите, где вы находитесь.';
  document.querySelectorAll('[data-filter]').forEach(b=>{b.disabled=!enabled;b.classList.toggle('active',b.dataset.filter===filter);b.setAttribute('aria-pressed',b.dataset.filter===filter)});
  if(!enabled){qs('#results').innerHTML='<p class="aside-note">После выбора вашего места здесь появятся все доступные кабинеты и окна.</p>';return}
  const matches=rooms.filter(r=>(filter==='all'||String(r.floor)===filter)&&`${r.id} ${r.name}`.toLocaleLowerCase('ru').includes(query));
  qs('#results').innerHTML=matches.map(r=>`<button class="result-button${target?.id===r.id?' active':''}" type="button" data-result="${safe(r.id)}"><span class="num">${safe(r.id.startsWith('wc-')?'Т':r.id.startsWith('win-')?`№ ${r.id.replace('win-','')}`:r.id==='wardrobe'?'◯':r.id)}</span><span><b>${safe(shortName(r))}</b><small>${r.floor} этаж${r.id==='201'?' · через окно':''}</small></span></button>`).join('')||'<p class="aside-note">Не найдено. Уточните у администратора.</p>';
  qs('#results').querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>updateTarget(byId(b.dataset.result)));
}
function renderSummary(){
  let title,detail='',action='';
  if(!source)title='Шаг 1. Выберите, где вы сейчас';
  else if(!target){title='Шаг 2. Выберите, куда хотите пройти';detail=`Ваше положение: ${labelFor(source)}.`}
  else if(source.id===target.id){title='Вы уже в нужном месте';detail=labelFor(target)+queueHint(target)}
  else if(source.floor===target.floor){title=`Маршрут к ${labelFor(target)}`;detail=`${source.floor} этаж: от ${labelFor(source)} до ${labelFor(target)}. Следуйте по синей линии.`+queueHint(target)}
  else{
    const onSource=floor===source.floor;
    const atStair=source.kind==='landmark'&&source.position===FLOORS[source.floor].stair;
    title=onSource?(atStair?`${source.floor} этаж · вы уже у лестницы`:`${source.floor} этаж · пройдите к лестнице`):`${target.floor} этаж · от лестницы к ${labelFor(target)}`;
    detail=onSource?`${atStair?'':'Начало: '+labelFor(source)+'. '}Перейдите на ${target.floor} этаж.`:`Конец маршрута: ${labelFor(target)}.${queueHint(target)}`;
    action=`<button type="button" class="next-floor" data-switch-floor="${onSource?target.floor:source.floor}">${onSource?`Показать ${target.floor} этаж →`:`← Показать ${source.floor} этаж`}</button>`;
  }
  qs('#route-summary').innerHTML=`<strong>${safe(title)}</strong>${detail?`<span class="route-steps">${safe(detail)}</span>`:''}${action}`;
  qs('#route-summary').querySelector('[data-switch-floor]')?.addEventListener('click',e=>{floor=Number(e.currentTarget.dataset.switchFloor);render()});
}
function render(){
  document.body.classList.toggle('has-route',Boolean(target));document.body.classList.toggle('choosing',choosing);qs('#destination-toggle').hidden=!target;qs('#destination-toggle').textContent=target?'Назначение: '+labelFor(target)+' · Изменить':'';
  renderLocation();renderResults();renderSummary();
  document.querySelectorAll('[data-floor]').forEach(b=>{let active=Number(b.dataset.floor)===floor;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
  qs('#floor-title').textContent=`${floor} этаж`;map();
}
function focusSource(){qs('#from-select').scrollIntoView({behavior:'smooth',block:'center'});qs('#from-select').focus()}
function updateSource(place){source=place||null;qs('#from-select').value=source?.id||'';if(source)floor=source.floor;render();if(source&&!target)qs('#search').focus()}
function updateTarget(place){target=place||null;choosing=false;if(source){floor=source.floor;render();qs('#route-summary').scrollIntoView({behavior:'smooth',block:'nearest'})}}
fillSourceOptions();
qs('#from-select').addEventListener('change',e=>updateSource(byId(e.target.value)));
qs('#change-source').onclick=focusSource;
qs('#search').addEventListener('input',renderResults);
qs('#destination-toggle').onclick=()=>{choosing=!choosing;render();if(choosing)qs('#search').focus()};
document.querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>{floor=Number(b.dataset.floor);render()});
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderResults()});
function queueHint(place){
  if(place?.id==='20')return ' Кабинет 20: спирометрия — по электронной очереди, аудиометрия — зайдите сразу, вне очереди.';
  if(place?.id==='209')return ' Кабинет 209 принимает по живой очереди, без монитора.';
  return '';
}
qs('#queue-modal-close').onclick=()=>{
  document.body.classList.remove('queue-open');
  qs('#queue-modal').hidden=true;
};
function showView(view){
  const survey=view==='survey';
  document.body.classList.toggle('view-survey',survey);
  qs('#nav-view').hidden=survey;
  qs('#survey-view').hidden=!survey;
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  if(!survey){
    render();
    if(location.hash==='#queue')qs('#queue')?.scrollIntoView({behavior:'smooth'});
  }else{
    window.scrollTo({top:0,behavior:'smooth'});
  }
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{
  if(b.dataset.view==='nav')history.replaceState(null,'',location.pathname);
  showView(b.dataset.view);
});
qs('#queue-link').addEventListener('click',e=>{
  e.preventDefault();
  history.replaceState(null,'','#queue');
  showView('nav');
  qs('#queue')?.scrollIntoView({behavior:'smooth'});
});
fetch('/api/visit',{method:'POST',credentials:'include'}).catch(()=>{});
document.querySelectorAll('.score-grid input').forEach(input=>{
  input.addEventListener('change',()=>{
    document.querySelectorAll('.score-grid label').forEach(label=>label.classList.toggle('on',label.contains(input)&&input.checked));
  });
});
qs('#survey-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const status=qs('#survey-status'),btn=qs('#survey-submit');
  const age=Number(qs('#survey-age').value);
  const scoreEl=qs('#survey-form input[name="score"]:checked');
  if(!scoreEl){status.hidden=false;status.className='survey-status error';status.textContent='Выберите оценку от 1 до 10.';return}
  btn.disabled=true;
  status.hidden=false;
  status.className='survey-status';
  status.textContent='Отправляем…';
  try{
    const res=await fetch('/api/survey',{
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({age,score:Number(scoreEl.value),comment:qs('#survey-comment').value.trim()})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(typeof data.detail==='string'?data.detail:'Не удалось отправить');
    status.className='survey-status ok';
    status.textContent='Спасибо. Ответ отправлен.';
    qs('#survey-form').reset();
  }catch(err){
    status.className='survey-status error';
    status.textContent=err.message||'Не удалось отправить. Попробуйте ещё раз.';
    btn.disabled=false;
    return;
  }
  btn.disabled=false;
});
render();

function applyZoom(){const el=qs('#map');el.style.width=`${zoom*100}%`;el.style.minWidth='0'}
function setZoom(value){zoom=Math.max(1,Math.min(4,value));applyZoom()}
qs('#zoom-in').onclick=()=>setZoom(zoom+.5);
qs('#zoom-out').onclick=()=>setZoom(zoom-.5);
qs('#zoom-fit').onclick=()=>{setZoom(1);qs('.map-scroll').scrollLeft=0;qs('.map-scroll').scrollTop=0};
qs('#zoom-route').onclick=()=>{setZoom(window.innerWidth<760?3:2);const pt=source?.floor===floor?door(source):FLOORS[floor].hall;const el=qs('.map-scroll');el.scrollLeft=pt[0]/1328*qs('#map').getBoundingClientRect().width-el.clientWidth/2;el.scrollTop=pt[1]/1328*qs('#map').getBoundingClientRect().width-el.clientHeight/2};
