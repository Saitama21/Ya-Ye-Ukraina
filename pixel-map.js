/* Pixel layer v1 — deterministic 90 m Web-Mercator cells.
   Cards remain on this device. A cell is NOT globally owned or purchased. */
(()=>{"use strict";
const $=s=>document.querySelector(s),SIZE=90,R=6378137,HALF=Math.PI*R;
const mapHost=$("#street-map"),wrap=$("#map-wrap"),canvas=$("#pixel-canvas");
const banner=$("#pixel-banner"),message=$("#pixel-instruction"),cancel=$("#pixel-cancel");
const mini=$("#pixel-preview"),miniName=$("#pixel-preview-name"),miniId=$("#pixel-preview-id"),miniOpen=$("#pixel-preview-open"),toggle=$("#mode-pixels");
if(!mapHost||!wrap||!canvas||!toggle)return;
let map=null,picking=false,onPick=null,selected=null,pickCell=null,pixelsOn=true,cards=[],operation=0;
let raf=0;
const PI=Math.PI,deg=180/PI;
const valid=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=85&&Math.abs(lng)<=180;
function pointToCell(lat,lng){
 if(!valid(lat,lng))return null;
 const x=R*lng*PI/180,y=R*Math.log(Math.tan(PI/4+lat*PI/360));
 const cx=Math.floor((x+HALF)/SIZE),cy=Math.floor((y+HALF)/SIZE);
 return cellFromXY(cx,cy);
}
function cellFromXY(cx,cy){
 const x=(cx+.5)*SIZE-HALF,y=(cy+.5)*SIZE-HALF;
 return {cellId:"UA90-"+cx+"-"+cy,cx,cy,lat:(2*Math.atan(Math.exp(y/R))-PI/2)*deg,lng:x/R*deg};
}
function cellBounds(cell){
 const x1=cell.cx*SIZE-HALF,y1=cell.cy*SIZE-HALF;
 const x2=x1+SIZE,y2=y1+SIZE;
 return {west:x1/R*deg,east:x2/R*deg,south:(2*Math.atan(Math.exp(y1/R))-PI/2)*deg,north:(2*Math.atan(Math.exp(y2/R))-PI/2)*deg};
}
function getPoint(c){
 if(!c||!Number.isFinite(c.lat)||!Number.isFinite(c.lng)||!c.cellId)return null;
 const p=pointToCell(c.lat,c.lng);
 return p&&p.cellId===c.cellId?p:null;
}
function occupied(id,except){
 return cards.find(c=>c.id!==except&&getPoint(c)?.cellId===id);
}
function setCards(next){
 cards=Array.isArray(next)?next.filter(x=>x&&typeof x==="object"):[];
 drawSoon();
}
function enabled(on){
 pixelsOn=!!on;
 toggle.classList.toggle("active",pixelsOn);
 toggle.setAttribute("aria-pressed",String(pixelsOn));
 canvas.hidden=!pixelsOn;
 if(pixelsOn)drawSoon();
}
function connect(instance){
 if(map===instance)return;
 map=instance;
 for(const type of ["move","zoom","resize","viewreset","moveend","zoomend"])map.on(type,drawSoon);
 drawSoon();
}
function drawSoon(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(render)}
function xyAt(lat,lng){return map.latLngToContainerPoint([lat,lng])}
function paintCell(ctx,cell,kind){
 const b=cellBounds(cell),nw=xyAt(b.north,b.west),se=xyAt(b.south,b.east);
 if(!Number.isFinite(nw.x+nw.y+se.x+se.y))return;
 const x=Math.round(nw.x),y=Math.round(nw.y),w=Math.max(1,se.x-nw.x),h=Math.max(1,se.y-nw.y);
 ctx.save();
 ctx.shadowColor=kind==="selected"?"#ffe17a":kind==="pick"?"#38a8ff":"#ffd452";
 ctx.shadowBlur=kind==="selected"?23:kind==="pick"?14:9;
 ctx.fillStyle=kind==="selected"?"rgba(255,212,82,.95)":kind==="pick"?"rgba(55,166,255,.80)":"rgba(255,210,74,.79)";
 if(Math.max(w,h)<5){ctx.fillRect(x-4,y-4,8,8)}
 else{
   ctx.fillRect(x+1,y+1,Math.max(3,w-2),Math.max(3,h-2));
   ctx.shadowBlur=0;ctx.lineWidth=kind==="selected"?2.7:1.5;
   ctx.strokeStyle=kind==="selected"?"#ffffff":"#ffedb4";
   ctx.strokeRect(x+.5,y+.5,w-1,h-1);
 }
 ctx.restore();
}
function render(){
 raf=0;
 if(!map||!pixelsOn||wrap.classList.contains("street-active")===false){canvas.hidden=true;return}
 canvas.hidden=false;
 const width=Math.round(mapHost.clientWidth),height=Math.round(mapHost.clientHeight);
 if(width<=0||height<=0)return;
 const ratio=Math.min(devicePixelRatio||1,2);
 const dw=Math.floor(width*ratio),dh=Math.floor(height*ratio);
 if(canvas.width!==dw||canvas.height!==dh){canvas.width=dw;canvas.height=dh}
 canvas.style.width=width+"px";canvas.style.height=height+"px";
 const ctx=canvas.getContext("2d");
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
 if(map.getZoom()>=16){
   const b=map.getBounds(),lo=pointToCell(Math.max(-84.9,b.getSouth()),Math.max(-179.9,b.getWest()));
   const hi=pointToCell(Math.min(84.9,b.getNorth()),Math.min(179.9,b.getEast()));
   if(lo&&hi){
     const n=(hi.cx-lo.cx+3)*(hi.cy-lo.cy+3);
     if(n<=3500){
       ctx.strokeStyle="rgba(63,151,246,.31)";ctx.lineWidth=.9;ctx.beginPath();
       // Individual cell edges create a deterministic square pixel grid in map coordinates.
       for(let x=lo.cx;x<=hi.cx+1;x++){
         const lng=(x*SIZE-HALF)/R*deg,p1=xyAt(b.getSouth(),lng),p2=xyAt(b.getNorth(),lng);
         ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);
       }
       for(let y=lo.cy;y<=hi.cy+1;y++){
         const lat=(2*Math.atan(Math.exp((y*SIZE-HALF)/R))-PI/2)*deg;
         const p1=xyAt(lat,b.getWest()),p2=xyAt(lat,b.getEast());
         ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);
       }
       ctx.stroke();
     }
   }
 }
 for(const c of cards){const cell=getPoint(c);if(cell)paintCell(ctx,cell,c.id===selected?.id?"selected":"owned")}
 if(pickCell)paintCell(ctx,pickCell,"pick");
}
function renderPreview(c){
 selected=c||null;
 if(c&&getPoint(c)){
   mini.hidden=false;
   miniName.textContent=c.name;
   miniId.textContent="№ "+c.id+" · "+c.place;
   miniOpen.onclick=()=>window.YE_OPEN_CARD_BY_ID?.(c.id);
 }else mini.hidden=true;
 drawSoon();
}
async function streetMap(selection,focusSelection=true){
 const control=window.YE_LIVE_MAP;
 if(!control?.ensureStreets)throw Error("Стріт-мапа не готова.");
 const instance=await control.ensureStreets(selection,focusSelection);
 if(!instance)throw Error("Не вдалося завантажити мапу вулиць. Перевір інтернет.");
 connect(instance);
 enabled(true);
 return instance;
}
function finishPick(){
 picking=false;pickCell=null;banner.hidden=true;
 if(map){map.getContainer().classList.remove("is-picking")}
 const done=onPick;onPick=null;drawSoon();return done;
}
function cancelPick(){
 operation++;
 finishPick();
}
async function beginPick({selection,onSelected,exceptId}={}){
 const ticket=++operation;
 finishPick();renderPreview(null);
 message.textContent="Наблизь карту та торкнись клітинки. Перший дотик на далекому масштабі лише наблизить місце.";
 banner.hidden=false;picking=true;onPick={callback:onSelected,exceptId};
 try{
   await streetMap(selection);
   if(ticket!==operation)return false;
   map.getContainer().classList.add("is-picking");
   document.getElementById("map").scrollIntoView({behavior:"smooth",block:"start"});
   return true;
 }catch(err){
   if(ticket===operation){cancelPick();alert(err.message)}
   return false;
 }
}
function onMapClick(e){
 if(!picking)return;
 if(map.getZoom()<16){
   map.setView(e.latlng,16,{animate:false});
   message.textContent="Ще один дотик — обери точну клітинку в сітці.";
   return;
 }
 const cell=pointToCell(e.latlng.lat,e.latlng.lng);
 if(!cell)return;
 if(occupied(cell.cellId,onPick?.exceptId)){
   message.textContent="Ця клітинка вже зайнята твоєю локальною карткою. Обери іншу.";
   return;
 }
 const task=onPick;
 pickCell=cell;drawSoon();
 finishPick();
 if(typeof task?.callback==="function")task.callback(cell);
}
async function show(card){
 if(!getPoint(card))return false;
 const ticket=++operation;finishPick();
 try{
   const m=await streetMap({kind:"country"},false);
   if(ticket!==operation)return false;
   renderPreview(card);
   m.setView([card.lat,card.lng],17,{animate:!window.matchMedia("(prefers-reduced-motion: reduce)").matches});
   document.getElementById("map").scrollIntoView({behavior:"smooth",block:"start"});
   setTimeout(drawSoon,220);
   return true;
 }catch(err){if(ticket===operation)alert(err.message);return false}
}
cancel.addEventListener("click",cancelPick);
toggle.addEventListener("click",async()=>{
 if(pixelsOn){enabled(false);return}
 try{await streetMap({kind:"country"},false);enabled(true)}
 catch(e){alert(e.message)}
});
const waitForMap=()=>{
 const ctrl=window.YE_LIVE_MAP;
 const instance=ctrl?.getMap?.();
 if(instance)connect(instance);
};
window.addEventListener("ye:cards-updated",()=>setCards(window.YE_GET_CARDS?.()||[]));
mapHost.addEventListener("click",()=>waitForMap(),{passive:true});
const actual=()=>{
 const m=window.YE_LIVE_MAP?.getMap?.();
 if(!m||m===map)return;
 connect(m);m.on("click",onMapClick);
};
window.addEventListener("ye:map-ready",actual);
window.YE_PIXELS={pointToCell,setCards,beginPick,cancelPick,show,renderPreview,getPoint,occupied,drawSoon,isPicking:()=>picking};
setCards(window.YE_GET_CARDS?.()||[]);
actual();
})();