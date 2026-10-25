/* Я Є. Україна — raster street map compatible with iPad Safari.
   Leaflet 1.9.4 (BSD-2-Clause); geographic data: OpenStreetMap.
   Offline SVG overview remains independent from this module. */
(()=>{
"use strict";
const data=window.YE_DATA,files=window.YE_BOUNDARY_FILES,$=s=>document.querySelector(s);
const root=$("#map-wrap"),target=$("#street-map"),overview=$("#mode-overview"),streets=$("#mode-streets");
if(!data||!files||!root||!target||!overview||!streets)return;
const GEOBASE="https://raw.githubusercontent.com/darmat1/ukraine-geo-data/main/geodata/";
const sources=[
"https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];
const cityCenters={"Київ":[50.4501,30.5234],"Севастополь":[44.6167,33.5254]};
const norm=name=>String(name||"").toLowerCase().replace(/^автономна республіка /,"").replace(/ область$/,"");
const regionJSON={type:"FeatureCollection",features:data.regions.map(o=>({
 type:"Feature",properties:{name:o.name},geometry:{type:"MultiPolygon",coordinates:o.parts}
}))};
let map=null,regionLayer=null,highlight=null,focusLayer=null,cityLayer=null,tiles=null,
 mode="overview",current={kind:"country"},startPromise=null,libPromise=null,
 seq=0,boundaryAbort=null,loadedTile=false;
const cache=new Map();
const reducedMotion=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function message(s){$("#map-status").textContent=s;$("#map-data-hint").textContent=s}
function toggleUI(){
 const live=mode==="streets";
 overview.classList.toggle("active",!live);streets.classList.toggle("active",live);
 overview.setAttribute("aria-pressed",String(!live));
 streets.setAttribute("aria-pressed",String(live));
 root.classList.toggle("street-active",live);
 target.hidden=!live;
 window.YE_STREET_ACTIVE=live;
 if(live&&map)requestAnimationFrame(()=>map.invalidateSize({pan:false}));
}
async function loadScript(url,timeoutMs){
 return new Promise((resolve,reject)=>{
  const sc=document.createElement("script");
  sc.src=url;sc.async=true;sc.crossOrigin="anonymous";
  const timer=setTimeout(()=>{sc.remove();reject(new Error("CDN timeout"))},timeoutMs);
  sc.onload=()=>{clearTimeout(timer);window.L?.map?resolve():reject(new Error("Leaflet not initialized"))};
  sc.onerror=()=>{clearTimeout(timer);sc.remove();reject(new Error("CDN unavailable"))};
  document.head.append(sc);
 });
}
async function library(){
 if(window.L?.map)return window.L;
 if(!libPromise)libPromise=(async()=>{
  const errors=[];
  for(const url of sources){
   try{await loadScript(url,14000);return window.L}catch(e){errors.push(e.message)}
  }
  throw Error(errors.join("; "));
 })();
 try{return await libPromise}catch(e){libPromise=null;throw e}
}
function pickRegion(s){
 return s.oblast?data.regions.find(o=>norm(o.name)===norm(s.oblast.name)):null;
}
function boundsOf(obj){
 if(!obj)return null;
 try{const bounds=window.L.geoJSON(obj).getBounds();return bounds.isValid()?bounds:null}catch(e){return null}
}
function flyBounds(b,z){
 if(!b||!map)return false;
 const pad=root.clientWidth<580?[18,18]:[36,36];
 const opts={padding:pad,maxZoom:z||14,animate:false};
 map.fitBounds(b,opts);
 requestAnimationFrame(()=>map?.invalidateSize({pan:false}));
 return true;
}
function clearFocus(){
 if(focusLayer)focusLayer.clearLayers();
 if(highlight)highlight.clearLayers();
 if(cityLayer)cityLayer.clearLayers();
}
async function getFine(type,id,signal){
 const file=files[type]?.[id];if(!file)return null;
 if(cache.has(file))return cache.get(file);
 const r=await fetch(GEOBASE+encodeURIComponent(file),{signal,mode:"cors"});
 if(!r.ok)throw Error("GeoJSON HTTP "+r.status);
 const json=await r.json();
 if(json.type!=="FeatureCollection"&&json.type!=="Feature")return null;
 const good=json.type==="FeatureCollection"?
 {type:"FeatureCollection",features:json.features.filter(x=>x.geometry&&["Polygon","MultiPolygon"].includes(x.geometry.type))}:json;
 if(good.type==="FeatureCollection"&&!good.features.length)return null;
 cache.set(file,good);if(cache.size>18)cache.delete(cache.keys().next().value);
 return good;
}
function selectedOutline(geo,color="#ffcf52"){
 if(!geo||!map)return null;
 const layer=window.L.geoJSON(geo,{interactive:false,style:{color,weight:2.6,opacity:.97,fillColor:"#ffcf52",fillOpacity:.09}});
 layer.addTo(focusLayer);
 const b=layer.getBounds();return b.isValid()?b:null;
}
function chooseCountry(){
 clearFocus();const b=regionLayer.getBounds();
 flyBounds(b,6.2);message("Жива карта України · наближай до доріг та вулиць");
}
function chooseCity(name,lat,lon){
 clearFocus();
 window.L.circleMarker([lat,lon],{radius:8,color:"#fff2bb",weight:2,fillColor:"#ffd452",fillOpacity:1})
   .bindTooltip(name,{direction:"top"}).addTo(cityLayer);
 map.setView([lat,lon],13.5,{animate:false});
 message("Місто "+name+" · вулиці та будинки");
}
function showRegion(s){
 const g=pickRegion(s);
 clearFocus();
 if(g){
  const b=selectedOutline({type:"MultiPolygon",coordinates:g.parts});
  flyBounds(b,9.2);
  return true;
 }
 const center=cityCenters[s.oblast?.name];
 if(center){map.setView(center,12,{animate:false});return true}
 return false;
}
async function navigate(s){
 current=s||{kind:"country"};
 if(mode!=="streets")return;
 const ticket=++seq;
 if(boundaryAbort)boundaryAbort.abort();
 boundaryAbort=new AbortController();
 try{
  await initialize();
  if(ticket!==seq||mode!=="streets")return;
  map.invalidateSize({pan:false});
  if(s.kind==="country"){chooseCountry();return}
  if(s.kind==="city"){chooseCity(s.city.name,s.city.lat,s.city.lon);return}
  if(s.kind==="oblast"){
   if(showRegion(s))message(s.oblast.name+" · збільшуй до реальних вулиць");
   else message("Геометрію області не знайдено");
   return;
  }
  // Show genuine parent boundary immediately; never guess a subregion's center.
  showRegion(s);
  const type=s.kind==="raion"?"district":"community";
  const id=s.kind==="raion"?s.raion?.id:s.community?.id;
  const parentId=s.raion?.id;
  const exact=!!files[type]?.[id],parent=s.kind==="community"&&!!files.district?.[parentId];
  if(!exact&&!parent){
    message("Точні межі не знайдено. Показано батьківську область.");
    return;
  }
  message("Завантажуємо точні межі території…");
  let geo=null,showingParent=false;
  try{
   if(exact)geo=await getFine(type,id,boundaryAbort.signal);
   if(ticket!==seq||mode!=="streets")return;
   if(!geo&&parent){geo=await getFine("district",parentId,boundaryAbort.signal);showingParent=true}
  }catch(e){
   if(e.name==="AbortError"||ticket!==seq)return;
   console.warn("Boundary unavailable",e);
  }
  if(ticket!==seq||mode!=="streets")return;
  if(!geo){message("Детальну межу не завантажено. Показано область.");return}
  clearFocus();
  const b=selectedOutline(geo);
  flyBounds(b,s.kind==="community"&&!showingParent?14:12);
  message(showingParent?"Контур громади відсутній: показано її район. Вулиці можна наближати вручну.":"Межа "+(s.kind==="raion"?"району":"громади")+" · вулиці, дороги й населені пункти");
 }catch(e){
  if(ticket!==seq)return;
  console.warn("Live map navigation error",e);
  if(!map){resetToOverview("Карта вулиць не завантажилась. Перевір CDN або спробуй оновити сторінку.");return}
  message("Не вдалося оновити геометрію. Вулиці залишаються доступними.");
 }
}
async function initialize(){
 if(startPromise)return startPromise;
 startPromise=(async()=>{
 const L=await library();
 if(!target.isConnected)throw Error("Map container missing");
 map=L.map(target,{zoomControl:false,attributionControl:true,scrollWheelZoom:true,preferCanvas:false,
  worldCopyJump:false,minZoom:3,maxZoom:19,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,
  tap:false,renderer:L.svg({padding:.5})});
 map.setView([48.5,31.4],5);
 tiles=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
  attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
  maxZoom:19,maxNativeZoom:19,minZoom:3,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,
  crossOrigin:false
 }).addTo(map);
 let tileErrors=0;
 tiles.on("tileload",()=>{loadedTile=true});
 tiles.on("tileerror",()=>{tileErrors++;if(!loadedTile&&tileErrors>4){message("Підкладка вулиць не завантажилась. Перевір мережу або онови сторінку.");}});
 regionLayer=L.geoJSON(regionJSON,{
  style:{color:"#3997e8",weight:1.0,opacity:.86,fillColor:"#0b67bb",fillOpacity:.04},
  onEachFeature(feature,layer){
   const name=feature.properties.name;
   layer.on("click",()=>{const o=data.hierarchy.find(a=>norm(a.name)===norm(name));
    if(o&&window.YE_SELECT_OBLAST)window.YE_SELECT_OBLAST(o.name);
   });
   layer.bindTooltip(name,{sticky:true,direction:"top",opacity:.94});
  }
 }).addTo(map);
 focusLayer=L.featureGroup().addTo(map);
 highlight=L.featureGroup().addTo(map);
 cityLayer=L.featureGroup().addTo(map);
 for(const [name,lat,lon] of [
  ["Київ",50.4501,30.5234],["Львів",49.8397,24.0297],["Одеса",46.4825,30.7233],
  ["Дніпро",48.4647,35.0462],["Харків",49.9935,36.2304]
 ]){
  L.circleMarker([lat,lon],{radius:4,color:"#ffdf7c",weight:1,fillColor:"#ffd452",fillOpacity:1})
  .bindTooltip(name,{permanent:false,direction:"right"})
  .addTo(highlight);
 }
 // Safari: compensate for deferred flex layout, visual tab transitions and iPad split view.
 const refresh=()=>{if(map&&mode==="streets"&&target.isConnected&&!target.hidden)
   map.invalidateSize({pan:false,debounceMoveend:true})};
 const observer=new ResizeObserver(()=>refresh());
 observer.observe(target);
 if(window.matchMedia("(pointer:coarse)").matches){
   document.addEventListener("visibilitychange",()=>{if(!document.hidden)requestAnimationFrame(refresh)});
   window.addEventListener("pageshow",refresh);
 }
 requestAnimationFrame(()=>requestAnimationFrame(refresh));
 setTimeout(refresh,220);setTimeout(refresh,800);
 return map;
 })();
 try{return await startPromise}catch(e){
  if(map){map.remove();map=null}
  startPromise=null;throw e;
 }
}
async function activate(s){
 current=s||current;
 mode="streets";toggleUI();
 message("Підключаємо живу карту вулиць…");
 try{
  await navigate(current);
 }catch(e){
  console.warn("Raster map unavailable",e);
  resetToOverview("Не вдалося завантажити Leaflet. Перевір підключення до CDN.");
 }
}
function resetToOverview(msg){
 ++seq;if(boundaryAbort)boundaryAbort.abort();
 mode="overview";toggleUI();
 message(msg||"Оглядова карта. Обери область.");
}
function select(s){
 current=s;
 if(!s||s.kind==="country"){if(mode==="streets")void navigate(s);return}
 if(mode!=="streets")void activate(s);
 else void navigate(s);
}
overview.addEventListener("click",()=>resetToOverview());
streets.addEventListener("click",()=>void activate(current));
window.YE_LIVE_MAP={
 select,
 isLive:()=>mode==="streets",
 zoomIn(){if(mode!=="streets"||!map)return false;map.zoomIn();return true},
 zoomOut(){if(mode!=="streets"||!map)return false;map.zoomOut();return true},
 zoomHome(){if(mode!=="streets"||!map)return false;void navigate(current);return true}
};
toggleUI();
})();