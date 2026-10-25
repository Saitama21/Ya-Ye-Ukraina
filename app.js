(()=>{"use strict";
const D=window.YE_DATA, $=q=>document.querySelector(q),NS="http://www.w3.org/2000/svg";
if(!D){document.body.textContent="Помилка завантаження довідника";return}
const areas=D.hierarchy, shapes=D.regions, urbanCities=window.YE_CITY_DISTRICTS||[];
const cityByName=new Map(urbanCities.map(x=>[x.city,x]));
const cities=[["Київ",50.4501,30.5234],["Львів",49.8397,24.0297],["Харків",49.9935,36.2304],["Дніпро",48.4647,35.0462],["Одеса",46.4825,30.7233],["Запоріжжя",47.8388,35.1396],["Полтава",49.5883,34.5514],["Вінниця",49.2331,28.4682],["Чернігів",51.4982,31.2893],["Черкаси",49.4444,32.0598],["Житомир",50.2547,28.6587],["Суми",50.9077,34.7981],["Херсон",46.6354,32.6169],["Миколаїв",46.9750,31.9946],["Ужгород",48.6208,22.2879],["Чернівці",48.2915,25.9403],["Рівне",50.6199,26.2516],["Тернопіль",49.5535,25.5948],["Івано-Франківськ",48.9226,24.7111],["Хмельницький",49.4229,26.9871],["Луцьк",50.7472,25.3254],["Донецьк",48.0159,37.8028],["Луганськ",48.574,39.3078],["Сімферополь",44.9521,34.1024],["Севастополь",44.6167,33.5254]];
const points=shapes.flatMap(a=>a.parts.flat(2)),minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
const S=Math.min(775/((maxX-minX)*.68),470/(maxY-minY)),X=v=>450+(v-(minX+maxX)/2)*S*.68,Y=v=>295-(v-(minY+maxY)/2)*S;
const sk=name=>String(name).toLowerCase().replace(/ область$/,"").replace(/^автономна республіка /,"");
const geom=shapes.map(a=>({name:a.name,polys:a.parts.map(poly=>poly.map(ring=>ring.map(p=>[X(p[0]),Y(p[1])])))}));
const countDistricts=areas.filter(o=>!["Київ","Севастополь"].includes(o.name)).reduce((s,o)=>s+o.raions.length,0),cityDistrictCount=urbanCities.reduce((s,c)=>s+c.districts.length,0),countHromadas=areas.reduce((s,o)=>s+o.raions.reduce((z,r)=>z+r.hromadas.length,0),0);
const n=(tag,cls,t)=>{let e=document.createElement(tag);e.className=cls||"";if(t!==undefined)e.textContent=t;return e};
const svg=(tag,attrs,parent)=>{let e=document.createElementNS(NS,tag);for(let k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.append(e);return e};
const pathOf=o=>o.polys.map(poly=>poly.map(ring=>ring.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+","+p[1].toFixed(1)).join("")+"Z").join("")).join("");
const regionPaths=new Map(),canvas=$("#ukraine-map"),regionLayer=$("#region-layer"),cityLayer=$("#city-layer");
let selection={kind:"country"},openedArea=null,openedDistrict=null,areaMode="oblast",districtMode="urban",expandedCities=new Set(["Київ","Харків"]),tab="map",view=[0,0,900,600],cards=[];
try{const s=JSON.parse(localStorage.getItem("ye-ukraina-cards-v3")||"[]");if(Array.isArray(s))cards=s.filter(x=>x&&typeof x.name==="string").slice(0,500)}catch(e){}
window.YE_GET_CARDS=()=>cards;
function saveCards(next){
 try{localStorage.setItem("ye-ukraina-cards-v3",JSON.stringify(next))}
 catch(e){alert("Не вдалося зберегти в цьому браузері.");return false}
 cards=next;renderTree();renderInfo();renderStats();
 window.dispatchEvent(new CustomEvent("ye:cards-updated"));
 return true;
}
function button(label,cls,fn,right,icon){
 const b=n("button",cls),i=n("span","",icon||"›"),txt=n("span","label",label);
 b.type="button";b.append(i,txt);if(right!==undefined)b.append(n("small","",String(right)));
 b.onclick=fn;return b;
}
function regionIdFor(g){return areas.find(o=>sk(o.name)===sk(g.name))}
for(const g of geom){
 const p=svg("path",{d:pathOf(g),class:"region",tabindex:0,role:"button","aria-label":g.name,fill:"#0c386b","fill-rule":"evenodd"},regionLayer);
 regionPaths.set(g.name,{path:p,geometry:g});
 const run=()=>{const o=regionIdFor(g);if(o)choose({kind:"oblast",oblast:o})};
 p.addEventListener("click",run);
 p.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();run()}});
 p.addEventListener("pointerenter",()=>{$("#map-status").textContent=g.name});
 p.addEventListener("pointerleave",()=>{$("#map-status").textContent="Клікни область або позначку міста"});
}
const labeled=new Set(["Київ","Львів","Харків","Дніпро","Одеса","Сімферополь"]);
for(const [name,lat,lon] of cities){
 const x=X(lon),y=Y(lat),g=svg("g",{role:"button",tabindex:0,"aria-label":"Місто "+name,style:"cursor:pointer"},cityLayer);
 svg("circle",{cx:x,cy:y,r:labeled.has(name)?6:3.4,class:labeled.has(name)?"city-dot":"city-dot secondary"},g);
 svg("circle",{cx:x,cy:y,r:14,fill:"transparent"},g);
 if(labeled.has(name)){svg("text",{x:x+10,y:y+4,class:"city-name"},g).textContent=name}
 const run=()=>choose({kind:"city",city:{name,lat,lon}});
 g.addEventListener("click",run);g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();run()}});
}
$("#oblast-total").textContent=areas.length;$("#raion-total").textContent="";$("#district-urban-count").textContent=cityDistrictCount;$("#district-land-count").textContent=countDistricts;$("#community-total").textContent=countHromadas;
$("#kpi-oblast").textContent=areas.length;$("#kpi-raion").textContent=countDistricts;$("#kpi-community").textContent=countHromadas;$("#kpi-city").textContent=cities.length;
function place(){const s=selection;return s.kind==="cityDistrict"?s.district.name+" район · "+s.city.name:s.kind==="country"?"Вся Україна":s.kind==="city"?s.city.name:s.kind==="oblast"?s.oblast.name+(["Київ","Севастополь"].includes(s.oblast.name)?"":" область"):s.kind==="raion"?s.raion.name+" район":s.community.name+" громада"}
function stack(){
 const s=selection;if(s.kind==="country")return ["Україна"];
 if(s.kind==="city")return ["Україна","Місто "+s.city.name];
 if(s.kind==="cityDistrict")return ["Україна","Місто "+s.city.name,s.district.name+" район"];
 return ["Україна",s.oblast.name,s.raion?.name,s.community?.name].filter(Boolean);
}
function navCrumb(label,active,callback){
 const b=n("button","crumb"+(active?" current":""),label);b.onclick=callback;return b;
}
function breadcrumbs(){
 const e=$("#crumbs");e.replaceChildren();
 e.append(navCrumb("⌂",false,()=>choose({kind:"country"})),n("span","chevron","›"));
 const chain=stack();
 chain.forEach((label,i)=>{
   if(i)e.append(n("span","chevron","›"));
   const s=selection;
   let dest={kind:"country"};
   if(i===1&&(s.kind==="city"||s.kind==="cityDistrict"))dest={kind:"city",city:s.city};
   if(i===2&&s.kind==="cityDistrict")dest={kind:"cityDistrict",city:s.city,district:s.district};
   if(i===1&&s.oblast)dest={kind:"oblast",oblast:s.oblast};
   if(i===2&&s.raion)dest={kind:"raion",oblast:s.oblast,raion:s.raion};
   if(i===3&&s.community)dest={kind:"community",oblast:s.oblast,raion:s.raion,community:s.community};
   e.append(navCrumb(label,i===chain.length-1,()=>choose(dest)));
 });
}
function zoom(x,y,w,h){
 w=Math.max(115,Math.min(900,w));h=Math.max(80,Math.min(600,h));
 if(w/h>1.5)h=w/1.5;else w=h*1.5;
 w=Math.min(900,w);h=Math.min(600,h);
 const xx=Math.max(0,Math.min(900-w,x-w/2)),yy=Math.max(0,Math.min(600-h,y-h/2));
 view=[xx,yy,w,h];canvas.setAttribute("viewBox",view.map(z=>z.toFixed(2)).join(" "));
}
function zoomSelection(){
 const s=selection;if(s.kind==="country"){zoom(450,300,900,600);return}
 if(s.kind==="city"||s.kind==="cityDistrict"){zoom(X(s.city.lon),Y(s.city.lat),265,177);return}
 const q=geom.find(x=>sk(x.name)===sk(s.oblast.name));if(!q){zoom(450,300,900,600);return}
 const a=q.polys.flat(2),xs=a.map(p=>p[0]),ys=a.map(p=>p[1]);
 const x1=Math.min(...xs),x2=Math.max(...xs),y1=Math.min(...ys),y2=Math.max(...ys);
 zoom((x1+x2)/2,(y1+y2)/2,Math.max(265,(x2-x1)*1.7),Math.max(176,(y2-y1)*1.7));
}
function mapState(){
 for(const [name,item] of regionPaths)item.path.classList.toggle("active",!!selection.oblast&&sk(name)===sk(selection.oblast.name));
 $("#map-selection").textContent=place();$("#map-status").textContent="Клікни область або позначку міста";zoomSelection();
}
function choose(v){
 selection={kind:"country",...v};
 if(selection.oblast)openedArea=selection.oblast.id;
 if(selection.raion)openedDistrict=selection.raion.id;
 breadcrumbs();mapState();renderTree();renderInfo();renderStats();
 window.YE_LIVE_MAP?.select(selection);
}
function urbanSelection(record,name){
 return {kind:"cityDistrict",city:{name:record.city,lat:record.lat,lon:record.lon},district:{name,id:"urban:"+record.city+":"+name}};
}
function renderUrbanDistricts(){
 tree.append(n("div","group-title","РАЙОНИ У МЕЖАХ МІСТ · "+cityDistrictCount));
 for(const city of urbanCities){
   const expanded=expandedCities.has(city.city);
   tree.append(button(city.city,"city-header",()=>{
     if(expanded)expandedCities.delete(city.city);else expandedCities.add(city.city);
     renderTree();
   },city.districts.length,expanded?"⌄":"›"));
   if(!expanded)continue;
   for(const name of city.districts){
     const active=selection.kind==="cityDistrict"&&selection.city.name===city.city&&selection.district.name===name;
     tree.append(button(name+" район","district urban-district"+(active?" active":""),()=>choose(urbanSelection(city,name)),undefined,"•"));
   }
 }
 tree.append(n("p","empty","Райони міста — не райони області. Для частини міст точні межі ще не перевірені, тому карта показує місто без вигаданого контуру."));
}
window.YE_SELECT_OBLAST=(name)=>{const o=areas.find(a=>sk(a.name)===sk(name));if(o)choose({kind:"oblast",oblast:o})};
const tree=$("#area-tree");
function renderTree(){
 tree.replaceChildren();
 const showKind=areaMode==="raion"&&tab!=="mine"&&!$("#place-search").value.trim();
 $("#district-kind-switch").hidden=!showKind;
 if(tab==="mine"){
  tree.append(n("div","group-title","МОЇ ДЕМОКАРТКИ"));
  if(!cards.length){tree.append(n("p","empty","Тут з'являться картки, збережені на цьому пристрої."));return}
  cards.slice().reverse().forEach(c=>tree.append(button(c.name+" · "+c.place,"community",()=>showCard(c),"№ "+c.id,"★")));
  return;
 }
 const query=$("#place-search").value.toLowerCase().trim();
 if(query){
  const found=[];
  for(const o of areas){
   if(o.name.toLowerCase().includes(query))found.push({title:o.name+" область",target:{kind:"oblast",oblast:o}});
   for(const r of (["Київ","Севастополь"].includes(o.name)?[]:o.raions)){
    if(r.name.toLowerCase().includes(query))found.push({title:r.name+" район · "+o.name,target:{kind:"raion",oblast:o,raion:r}});
    for(const h of r.hromadas)if(h.name.toLowerCase().includes(query))found.push({title:h.name+" громада · "+r.name,target:{kind:"community",oblast:o,raion:r,community:h}});
   }
  }
  for(const city of urbanCities)for(const name of city.districts){
   if(name.toLowerCase().includes(query)||city.city.toLowerCase().includes(query))
     found.push({title:name+" район · "+city.city,target:urbanSelection(city,name)});
  }
  for(const [name,lat,lon] of cities)if(name.toLowerCase().includes(query))found.unshift({title:"Місто "+name,target:{kind:"city",city:{name,lat,lon}}});
  tree.append(n("div","group-title","ЗНАЙДЕНО: "+found.length));
  found.slice(0,100).forEach(e=>tree.append(button(e.title,"search-result",()=>choose(e.target),undefined,"⌕")));
  if(!found.length)tree.append(n("p","empty","Нічого не знайдено. Перевір назву."));
  if(found.length>100)tree.append(n("p","empty","Перші 100 результатів. Уточни пошук."));
  return;
 }
 if(areaMode==="oblast"){
  for(const o of areas){
   const selected=selection.oblast?.id===o.id;
   tree.append(button(o.name+(["Київ","Севастополь"].includes(o.name)?"":" область"),"oblast"+(selected?" active":""),()=>{
    const previouslyOpened=openedArea===o.id;openedArea=previouslyOpened?null:o.id;
    choose({kind:"oblast",oblast:o});if(previouslyOpened){openedArea=null;renderTree()}
   },o.name==="Київ"?(cityByName.get("Київ")?.districts.length||0):o.name==="Севастополь"?0:o.raions.length,openedArea===o.id?"⌄":"›"));
   if(openedArea!==o.id)continue;
   if(o.name==="Київ"){
     const kyiv=cityByName.get("Київ");
     if(kyiv)for(const name of kyiv.districts)
       tree.append(button(name+" район","district urban-district",()=>choose(urbanSelection(kyiv,name)),undefined,"•"));
     continue;
   }
   if(o.name==="Севастополь"){
     tree.append(n("p","empty","Райони міста додаються після перевірки джерел."));
     continue;
   }
   for(const r of o.raions){
    tree.append(button(r.name+" район","district"+(selection.raion?.id===r.id?" active":""),()=>{
      const previouslyOpened=openedDistrict===r.id;openedDistrict=previouslyOpened?null:r.id;
      choose({kind:"raion",oblast:o,raion:r});if(previouslyOpened){openedDistrict=null;renderTree()}
    },r.hromadas.length,openedDistrict===r.id?"⌄":"›"));
    if(openedDistrict!==r.id)continue;
    for(const h of r.hromadas){
     tree.append(button(h.name+" громада","community"+(selection.community?.id===h.id?" active":""),()=>choose({kind:"community",oblast:o,raion:r,community:h}),undefined,"•"));
    }
   }
  }
 }else if(areaMode==="raion"){
  if(districtMode==="urban"){renderUrbanDistricts();return}
  tree.append(n("div","group-title","РАЙОНИ ОБЛАСТЕЙ · "+countDistricts));
  for(const o of areas.filter(x=>!["Київ","Севастополь"].includes(x.name))){
   tree.append(n("div","group-title",o.name));
   for(const r of o.raions)tree.append(button(r.name+" район","district",()=>choose({kind:"raion",oblast:o,raion:r}),r.hromadas.length));
  }
 }else{
  tree.append(n("p","empty","Пошук угорі працює по всіх громадах."));
  let shown=0;
  for(const o of areas)for(const r of o.raions)for(const h of r.hromadas){
   if(shown>=160)continue;
   tree.append(button(h.name+" · "+r.name,"community",()=>choose({kind:"community",oblast:o,raion:r,community:h}),undefined,"•"));
   shown++;
  }
  tree.append(n("p","empty","Показано 160 із "+countHromadas+". Для решти скористайся пошуком."));
 }
}
function matchingCard(c){
 const s=selection;if(s.kind==="country")return true;
 if(s.kind==="city")return c.place===s.city.name||c.cityDistrictCity===s.city.name;
 if(s.kind==="cityDistrict")return c.cityDistrictCity===s.city.name&&c.cityDistrictName===s.district.name;
 if(s.kind==="oblast")return c.region===s.oblast.id;
 if(s.kind==="raion")return c.raion===s.raion.id;
 if(s.kind==="community")return c.community===s.community.id;
 return false;
}
function renderInfo(){
 const s=selection,kind={country:"НАЦІОНАЛЬНА МАПА",oblast:"ОБЛАСТЬ / РЕГІОН",raion:"РАЙОН",community:"ТЕРИТОРІАЛЬНА ГРОМАДА",city:"МІСТО",cityDistrict:"РАЙОН У МІСТІ"};
 $("#selected-title").textContent=place();$("#selected-kind").textContent=kind[s.kind];
 $("#selected-location").textContent=stack().join(" › ");
 $("#info-subtitle").textContent=s.kind==="cityDistrict"?
   "Це район у межах міста, не однойменний район області. Точний контур поки не підтверджено; карту відкрито на рівні міста.":
   "Навігація за довідником адміністративних одиниць";
 const children=s.kind==="country"?areas.length:s.kind==="oblast"?(s.oblast.name==="Київ"?10:s.oblast.raions.length):s.kind==="raion"?s.raion.hromadas.length:0;
 $("#stat-children").textContent=children;$("#stat-children-label").textContent=s.kind==="country"?"Адміністративних одиниць":s.kind==="oblast"?"Районів":s.kind==="raion"?"Громад":"Підрозділів";
 $("#stat-local").textContent=cards.filter(matchingCard).length;$("#stat-total").textContent=cards.length;
 $("#stat-cities").textContent=s.kind==="country"?cities.length:(s.kind==="city"||s.kind==="cityDistrict")?1:0;
 $("#stat-local-label").textContent="Моїх демокарток тут";$("#stat-total-label").textContent="Моїх демокарток загалом";$("#stat-cities-label").textContent=s.kind==="country"?"Маркерів міст":"Обраних міст";
 const dir=$("#directory");dir.replaceChildren();
 let items=[],title="Оберіть область";
 if(s.kind==="country")items=areas.map(o=>({title:o.name,target:{kind:"oblast",oblast:o}}));
 if(s.kind==="oblast"){
  if(s.oblast.name==="Київ"){
   const ky=cityByName.get("Київ");
   title="Райони міста Київ";
   items=ky?ky.districts.map(name=>({title:name+" район",target:urbanSelection(ky,name)})):[];
  }else if(s.oblast.name==="Севастополь"){
   title="Райони міста — джерела перевіряються";
  }else {
   title="Райони області";items=s.oblast.raions.map(r=>({title:r.name+" район",target:{kind:"raion",oblast:s.oblast,raion:r}}))
  }
 }
 if(s.kind==="raion"){title="Громади району";items=s.raion.hromadas.map(h=>({title:h.name+" громада",target:{kind:"community",oblast:s.oblast,raion:s.raion,community:h}}))}
 if(s.kind==="city"&&cityByName.has(s.city.name)){
  const city=cityByName.get(s.city.name);
  title="Райони міста";
  items=city.districts.map(name=>({title:name+" район",target:urbanSelection(city,name)}));
 }
 if(s.kind==="community"||s.kind==="cityDistrict"||(s.kind==="city"&&!items.length))title="Створи своє місце";
 $("#directory-title").textContent=title;
 for(const item of items.slice(0,12)){
  const b=n("button");b.append(n("span","",item.title),n("small","","›"));b.onclick=()=>choose(item.target);dir.append(b);
 }
 if(items.length>12)dir.append(n("p","muted","Інші одиниці доступні ліворуч і через пошук."));
 if(!items.length)dir.append(n("p","muted","Тут можна створити локальну демонстраційну картку."));
}
function renderStats(){
 $("#kpi-cards").textContent=cards.length;$("#mini-cards").textContent=cards.length+" демо";
 $("#your-location").textContent=place();
}
$("#place-search").addEventListener("input",()=>{tab="map";document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab==="map"));renderTree()});
document.querySelectorAll("[data-level]").forEach(b=>b.onclick=()=>{
 areaMode=b.dataset.level;
 document.querySelectorAll("[data-level]").forEach(x=>x.classList.toggle("active",x===b));
 renderTree();
});
document.querySelectorAll("[data-district-type]").forEach(b=>b.onclick=()=>{
 districtMode=b.dataset.districtType;
 document.querySelectorAll("[data-district-type]").forEach(x=>x.classList.toggle("active",x===b));
 renderTree();
});
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{
 tab=b.dataset.tab;document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));
 if(tab==="search"){$("#place-search").focus();tab="map"}renderTree();
});
$("#reset-selection").onclick=()=>{openedArea=null;openedDistrict=null;$("#place-search").value="";choose({kind:"country"})};
$("#zoom-in").onclick=()=>{if(window.YE_LIVE_MAP?.zoomIn())return;zoom(view[0]+view[2]/2,view[1]+view[3]/2,view[2]*.78,view[3]*.78)};
$("#zoom-out").onclick=()=>{if(window.YE_LIVE_MAP?.zoomOut())return;zoom(view[0]+view[2]/2,view[1]+view[3]/2,view[2]*1.3,view[3]*1.3)};
$("#zoom-home").onclick=()=>{if(window.YE_LIVE_MAP?.zoomHome())return;zoomSelection()};
function modal(open){
 $("#dialog-layer").classList.toggle("open",open);
 $("#dialog-layer").setAttribute("aria-hidden",String(!open));
}
let activeCard=null,pendingPoint=null,pendingScope=null;
const hasPoint=c=>Boolean(window.YE_PIXELS?.getPoint(c));
function cardSelection(c){
 if(c.cityDistrictCity&&c.cityDistrictName){
   const city=cityByName.get(c.cityDistrictCity);
   if(city&&city.districts.includes(c.cityDistrictName))return urbanSelection(city,c.cityDistrictName);
 }
 const o=areas.find(a=>a.id===c.region);
 if(!o){
  const found=cities.find(x=>x[0]===c.place);
  return found?{kind:"city",city:{name:found[0],lat:found[1],lon:found[2]}}:{kind:"country"};
 }
 const r=o.raions.find(r=>r.id===c.raion),h=r?.hromadas.find(h=>h.id===c.community);
 if(h)return {kind:"community",oblast:o,raion:r,community:h};
 if(r)return {kind:"raion",oblast:o,raion:r};
 return {kind:"oblast",oblast:o};
}
function openCardDetails(c){
 activeCard=c;$("#card-form").hidden=true;$("#card-view").hidden=false;
 $("#modal-title").textContent="Моя демокартка";
 $("#view-name").textContent=c.name;$("#view-number").textContent="№ "+c.id;
 $("#view-place").textContent=c.place;
 $("#view-message").textContent=c.message||"Я — частина України 💙💛";
 $("#view-pixel-meta").textContent=hasPoint(c)?"▦ "+c.cellId+" · символічне місце":"▦ Місце на мапі ще не вибране";
 $("#view-map").textContent=hasPoint(c)?"▦ Показати піксель на мапі":"⌖ Прив’язати місце на мапі";
 $("#share-card").textContent="Поділитися текстом";
 modal(true);
}
function showCard(c){
 if(hasPoint(c)){
  modal(false);
  void window.YE_PIXELS.show(c);
 }else openCardDetails(c);
}
window.YE_OPEN_CARD_BY_ID=id=>{
 const c=cards.find(x=>String(x.id)===String(id));
 if(c)openCardDetails(c);
};
async function pickExisting(c){
 modal(false);
 const ready=await window.YE_PIXELS?.beginPick({
   selection:cardSelection(c),exceptId:c.id,
   onSelected(cell){
     const updated={...c,...cell,gridSize:90};
     const next=cards.map(v=>v.id===c.id?updated:v);
     if(!saveCards(next))return;
     void window.YE_PIXELS.show(updated);
   }
 });
 return Boolean(ready);
}
async function createCard(){
 if(!window.YE_PIXELS){
  alert("Піксельна мапа ще завантажується. Онови сторінку.");return;
 }
 pendingPoint=null;
 const scope=selection,pname=place();
 modal(false);
 await window.YE_PIXELS.beginPick({
   selection:scope,
   onSelected(cell){
     pendingPoint=cell;
     pendingScope={geo:scope,name:pname};
     activeCard=null;$("#card-form").reset();
     $("#card-form").hidden=false;$("#card-view").hidden=true;
     $("#modal-title").textContent="Мій піксель на мапі";
     $("#dialog-place").textContent=pname;
     $("#pixel-choice-info").textContent="▦ "+cell.cellId+" · 90 × 90 м · безкоштовне демо";
     modal(true);$("#card-name").focus();
   }
 });
}
$("#create-demo").onclick=()=>void createCard();
$("#view-map").onclick=()=>{
 if(!activeCard)return;
 if(hasPoint(activeCard)){
   modal(false);void window.YE_PIXELS.show(activeCard);
 }else void pickExisting(activeCard);
};
$("#close-dialog").onclick=()=>modal(false);
$("#dialog-layer").onclick=e=>{if(e.target===$("#dialog-layer"))modal(false)};
document.addEventListener("keydown",e=>{if(e.key==="Escape")modal(false)});
$("#card-form").onsubmit=e=>{
 e.preventDefault();
 if(!pendingPoint||!pendingScope){alert("Спочатку обери точну клітинку на мапі.");return}
 const name=$("#card-name").value.trim();if(!name)return;
 if(window.YE_PIXELS.occupied(pendingPoint.cellId)){
   alert("Ця клітинка вже має локальну картку. Обери іншу.");return;
 }
 const loc=pendingScope.geo;
 const card={
   id:Date.now().toString(36).toUpperCase(),name:name.slice(0,45),
   message:$("#card-message").value.trim().slice(0,140),
   place:pendingScope.name,
   region:loc.oblast?.id||null,raion:loc.raion?.id||null,
   community:loc.community?.id||null,
   cityDistrictCity:loc.kind==="cityDistrict"?loc.city.name:null,
   cityDistrictName:loc.kind==="cityDistrict"?loc.district.name:null,
   created:new Date().toISOString(),
   ...pendingPoint,gridSize:90
 };
 if(!saveCards([...cards,card]))return;
 pendingPoint=null;pendingScope=null;modal(false);
 void window.YE_PIXELS.show(card);
};
$("#share-card").onclick=async()=>{
 if(!activeCard)return;
 const c=activeCard;
 const txt="Я Є. Україна 🇺🇦\n"+c.name+"\n"+c.place+"\n"+(c.message||"")+
 (hasPoint(c)?"\nПіксель: "+c.cellId:"")+
 "\nЛокальна демокартка, не покупка.";
 try{
 if(navigator.share)await navigator.share({text:txt});
 else if(navigator.clipboard)await navigator.clipboard.writeText(txt);
 else throw new Error("copy unavailable");
 $("#share-card").textContent="Скопійовано ✓";
 }catch(e){if(e.name!=="AbortError")alert(txt)}
};
$("#delete-card").onclick=()=>{
 if(!activeCard||!confirm("Видалити цю локальну картку?"))return;
 if(!saveCards(cards.filter(c=>c.id!==activeCard.id)))return;
 window.YE_PIXELS?.renderPreview(null);
 modal(false);
};
$("#jump-map").onclick=()=>$("#map").scrollIntoView({behavior:"smooth"});
choose({kind:"country"});
})();