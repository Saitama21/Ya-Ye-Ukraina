/* Live streets layer. MapLibre GL JS 6, OpenFreeMap dark style, OSM geometry overlay.
   Falls back to local SVG overview if dynamic module or online tiles are unavailable. */
(()=>{
"use strict";
const data=window.YE_DATA, files=window.YE_BOUNDARY_FILES;
const $=s=>document.querySelector(s);
const scope=$("#map-wrap"), box=$("#street-map"), staticMap=$("#ukraine-map");
const overview=$("#mode-overview"), streets=$("#mode-streets"), status=$("#map-status");
const REMOTE="https://raw.githubusercontent.com/darmat1/ukraine-geo-data/main/geodata/";
const STYLE="https://tiles.openfreemap.org/styles/dark";
let map=null, mode="overview", requestId=0, starting=null, current={kind:"country"}, selectedData=null, statusText=null;
function tell(s){statusText=s;status.textContent=s;$("#map-data-hint").textContent=s}
function updateButtons(){overview.classList.toggle("active",mode==="overview");streets.classList.toggle("active",mode==="streets");overview.setAttribute("aria-pressed",String(mode==="overview"));streets.setAttribute("aria-pressed",String(mode==="streets"))}
function resetVisual(){mode="overview";scope.classList.remove("street-active");box.hidden=true;updateButtons()}
function getBounds(feature){
 const lo=[180,90,-180,-90];
 const scan=a=>{if(typeof a[0]==="number"){lo[0]=Math.min(lo[0],a[0]);lo[1]=Math.min(lo[1],a[1]);lo[2]=Math.max(lo[2],a[0]);lo[3]=Math.max(lo[3],a[1])}else for(const v of a)scan(v)};
 const go=f=>{if(!f)return;if(f.type==="FeatureCollection")f.features.forEach(go);else if(f.type==="Feature")go(f.geometry);else if(f.type==="GeometryCollection")f.geometries.forEach(go);else if(f.coordinates)scan(f.coordinates)};
 go(feature);return lo.every(Number.isFinite)&&lo[0]<=lo[2]&&lo[1]<=lo[3]?[ [lo[0],lo[1]],[lo[2],lo[3]] ]:null;
}
function toCollection(){
 return {type:"FeatureCollection",features:data.regions.map(o=>({type:"Feature",properties:{name:o.name},geometry:{type:"MultiPolygon",coordinates:o.parts}}))};
}
const regions=toCollection();
const fullBounds=getBounds(regions),cached=new Map();
const similar=n=>n?.toLowerCase().replace(/^автономна республіка /,"").replace(/ область$/,"")||"";
function matchingRegion(sel){
 if(!sel.oblast)return null;
 return data.regions.find(o=>similar(o.name)===similar(sel.oblast.name))||null;
}
function focusBounds(bounds,full=false){
 if(!map||!bounds)return;
 map.fitBounds(bounds,{padding:full?{top:40,bottom:38,left:35,right:35}:{top:64,bottom:68,left:42,right:42},duration:window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:1050,maxZoom:full?6:14});
}
function borderSelection(sel){
 if(!map||!map.getLayer("ye-highlight"))return;
 let name=matchingRegion(sel)?.name||"";
 map.setFilter("ye-highlight",["==",["get","name"],name]);
}
function removeFine(){
 if(!map||!map.getSource("ye-focus"))return;
 map.getSource("ye-focus").setData({type:"FeatureCollection",features:[]});
}
function cleanGeometry(payload){
 if(!payload||payload.type!=="FeatureCollection"||!Array.isArray(payload.features))return null;
 const good=payload.features.filter(f=>f?.geometry&&["Polygon","MultiPolygon"].includes(f.geometry.type));
 return good.length?{type:"FeatureCollection",features:good.map(f=>({type:"Feature",properties:{},geometry:f.geometry}))}:null;
}
async function loadBoundary(id,type,signal){
 const file=files?.[type]?.[id];if(!file)return null;
 if(cached.has(file))return cached.get(file);
 const resp=await fetch(REMOTE+encodeURIComponent(file),{signal,mode:"cors"});
 if(!resp.ok)throw new Error("HTTP "+resp.status);
 const geo=cleanGeometry(await resp.json());
 if(geo)cached.set(file,geo);
 return geo;
}
let abortController=null;
async function selectNow(sel){
 if(!map||!map.isStyleLoaded())return;
 const token=++requestId;
 if(abortController)abortController.abort();
 abortController=new AbortController();
 borderSelection(sel);removeFine();
 if(sel.kind==="country"){focusBounds(fullBounds,true);tell("Усі області України · наближай карту до вулиць");return}
 if(sel.kind==="city"){
  map.flyTo({center:[sel.city.lon,sel.city.lat],zoom:13.6,duration:window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:1100});
  tell("Місто "+sel.city.name+" · вулиці та дороги");return;
 }
 const region=matchingRegion(sel);
 if(!region){tell("Для цього міста точну геометрію ще не підключено");return}
 // The oblast geometry is always available, even with no fine boundaries online.
 const rg=getBounds({type:"MultiPolygon",coordinates:region.parts});
 if(sel.kind==="oblast"){focusBounds(rg);tell(sel.oblast.name+" область · живі вулиці");return}
 const id=sel.kind==="raion"?sel.raion?.id:sel.community?.id;
 const type=sel.kind==="raion"?"district":"community";
 // A missing community polygon never sends users to a made-up location.
 // Fall back to the real parent district geometry, if available.
 const hasExact=!!files?.[type]?.[id];
 const fallbackId=sel.kind==="community"?sel.raion?.id:null;
 const hasParent=!!files?.district?.[fallbackId];
 if(!hasExact&&!hasParent){
  focusBounds(rg);
  tell("Точні межі території відсутні. Показано область; вулиці можна наблизити вручну.");
  return;
 }
 tell("Завантажуємо межі території…");
 try{
  let feature=hasExact?await loadBoundary(id,type,abortController.signal):null;
  let usedParent=false;
  if(token!==requestId)return;
  if(!feature&&hasParent){
   feature=await loadBoundary(fallbackId,"district",abortController.signal);
   usedParent=true;
  }
  if(token!==requestId)return;
  const b=feature?getBounds(feature):null;
  if(!b){focusBounds(rg);tell("Геометрія території недоступна; показано область.");return}
  map.getSource("ye-focus")?.setData(feature);
  focusBounds(b);
  tell(usedParent?"Точні межі громади відсутні — показано її район. Можна наближати вулиці.":(sel.kind==="raion"?"Район":"Громада")+" · межі з OpenStreetMap · дороги та вулиці");
 }catch(err){
  if(token!==requestId||err.name==="AbortError")return;
  focusBounds(rg);tell("Не вдалося завантажити детальну межу — показано область.");
 }
}
function addLayers(){
 if(!map||map.getSource("ye-oblasts"))return;
 map.addSource("ye-oblasts",{type:"geojson",data:regions});
 map.addLayer({id:"ye-oblast-fill",type:"fill",source:"ye-oblasts",paint:{"fill-color":"#0c67c5","fill-opacity":["interpolate",["linear"],["zoom"],4,0.07,10,0.01]}});
 map.addLayer({id:"ye-oblast-line",type:"line",source:"ye-oblasts",paint:{"line-color":"#319bfa","line-width":["interpolate",["linear"],["zoom"],4,1.5,12,0.7],"line-opacity":0.87}});
 map.addLayer({id:"ye-highlight",type:"fill",source:"ye-oblasts",filter:["==",["get","name"],""],paint:{"fill-color":"#ffcf4e","fill-opacity":0.19}});
 map.addSource("ye-focus",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
 map.addLayer({id:"ye-focus-fill",type:"fill",source:"ye-focus",paint:{"fill-color":"#ffcb4a","fill-opacity":0.10}});
 map.addLayer({id:"ye-focus-line",type:"line",source:"ye-focus",paint:{"line-color":"#ffd15e","line-width":3,"line-opacity":0.96}});
 map.on("click","ye-oblast-fill",e=>{
  const name=e.features?.[0]?.properties?.name;
  if(name&&map.getZoom()<=7.8&&typeof window.YE_SELECT_OBLAST==="function")window.YE_SELECT_OBLAST(name);
 });
 map.on("mouseenter","ye-oblast-fill",()=>{map.getCanvas().style.cursor="pointer"});
 map.on("mouseleave","ye-oblast-fill",()=>{map.getCanvas().style.cursor=""});
}
async function init(){
 if(starting)return starting;
 starting=(async()=>{
  try{
   tell("Підключаємо карту з вулицями…");
   if(!document.getElementById("ye-maplibre-css")){const css=document.createElement("link");css.id="ye-maplibre-css";css.rel="stylesheet";css.href="https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.css";document.head.append(css)}
   const gl=await import("https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.mjs");
   if(!gl.supported()){throw Error("WebGL2 unavailable")}
   map=new gl.Map({container:box,style:STYLE,center:[31.2,48.7],zoom:5,attributionControl:true,cooperativeGestures:true,renderWorldCopies:false,maxZoom:19,minZoom:3,fadeDuration:200,locale:{"AttributionControl.ToggleAttribution":"Джерела карти"}});
   await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error("Map load timeout")),22000);
    map.once("load",()=>{clearTimeout(timeout);resolve()});
    map.on("error",e=>console.warn("Tile/style resource warning:",e.error?.message||e.error));
   });
   addLayers();
   return map;
  }catch(e){console.warn("Live map unavailable; SVG fallback active",e);if(map){try{map.remove()}catch(_){}map=null}
    throw e;
  }
 })();
 try{return await starting}catch(e){starting=null;throw e}
}
async function activate(sel,auto=false){
 current=sel||current;mode="streets";box.hidden=false;scope.classList.add("street-active");updateButtons();
 try{
  await init();
  if(mode!=="streets")return;
  map.resize();
  await selectNow(current);
 }catch(e){resetVisual();tell("Жива мапа недоступна без інтернету або WebGL. Залишено огляд.");}
}
function choose(sel){current=sel;if(sel.kind==="country"){if(mode==="streets"&&map)selectNow(sel);return}activate(sel,true)}
overview.addEventListener("click",()=>{++requestId;if(abortController)abortController.abort();resetVisual();tell("Оглядова мапа України — натисни на область")});
streets.addEventListener("click",()=>activate(current,false));
window.YE_LIVE_MAP={
 select:choose,
 zoomIn(){if(mode!=="streets"||!map)return false;map.zoomIn({duration:300});return true},
 zoomOut(){if(mode!=="streets"||!map)return false;map.zoomOut({duration:300});return true},
 zoomHome(){if(mode!=="streets"||!map)return false;selectNow(current);return true},
 isLive:()=>mode==="streets",
};
updateButtons();
})();
