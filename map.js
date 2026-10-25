(()=>{
'use strict';
const $=s=>document.querySelector(s),NS='http://www.w3.org/2000/svg';
const geo=window.UA_POLYGONS;
if(!Array.isArray(geo)||!geo.length){console.error('Відсутні геодані України');return}
const coords=geo.flat(2),minX=Math.min(...coords.map(p=>p[0])),maxX=Math.max(...coords.map(p=>p[0])),minY=Math.min(...coords.map(p=>p[1])),maxY=Math.max(...coords.map(p=>p[1]));
const SCALE=Math.min(700/((maxX-minX)*.66),425/(maxY-minY)),tx=x=>400+(x-(minX+maxX)/2)*SCALE*.66,ty=y=>240-(y-(minY+maxY)/2)*SCALE;
const shapes=geo.map(poly=>poly.map(r=>r.map(p=>[tx(p[0]),ty(p[1])])));
function ringHas(r,x,y){let q=false;for(let i=0,j=r.length-1;i<r.length;j=i++)if((r[i][1]>y)!==(r[j][1]>y)&&x<(r[j][0]-r[i][0])*(y-r[i][1])/(r[j][1]-r[i][1])+r[i][0])q=!q;return q}
function inside(x,y){return shapes.some(poly=>poly.length&&ringHas(poly[0],x,y)&&!poly.slice(1).some(r=>ringHas(r,x,y)))}
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs||{}))e.setAttribute(k,v);if(parent)parent.append(e);return e}
function drawBoundary(svg,hero){svg.replaceChildren();svg.setAttribute('viewBox','0 0 800 490');const g=el('g',{},svg);for(const poly of shapes){const d=poly.map(r=>r.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join('')+'Z').join(' ');el('path',{d,fill:hero?'#0a3974':'#0a2a53',stroke:hero?'#2564a8':'#297bc3','stroke-width':hero?'.5':'.7','fill-rule':'evenodd'},g)}return g}
const heroSvg=$('.glow svg'),svg=$('#interactive'),hero=drawBoundary(heroSvg,true),main=drawBoundary(svg,false);
const cells=[];let id=0;for(let y=18;y<472;y+=9)for(let x=22;x<779;x+=9){if(!inside(x+4,y+4))continue;id++;const obj={id,x,y};cells.push(obj);const color=id%11===0?'#f7c840':id%3===0?'#297fd7':'#1259ac';el('rect',{x,y,width:7.4,height:7.4,rx:1,fill:color,opacity:'.84'},hero);obj.elem=el('rect',{x,y,width:7.4,height:7.4,rx:1,fill:color,tabindex:0,role:'button','aria-label':'Місце '+id,class:'cell'},main);obj.elem.dataset.id=id;obj.elem.addEventListener('click',()=>select(id));obj.elem.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(id)}})}
let saved={};try{saved=JSON.parse(localStorage.getItem('yaye-demo-v2')||'{}')}catch{}if(!saved||Array.isArray(saved)||typeof saved!=='object')saved={};
let selected=null,filter='all',zoom=1;
function refresh(){for(const c of cells){const own=!!saved[c.id];c.elem.classList.toggle('owned',own);c.elem.classList.toggle('selected',selected===c.id);c.elem.style.opacity=filter==='mine'&&!own||filter==='free'&&own?'.09':'1'}$('#count').textContent=Object.keys(saved).length+' демоучасників у браузері'}
function select(id){selected=id;const d=saved[id];$('#number').textContent='№ '+id;$('#selectedTitle').textContent=d?d.name:'Вільне місце';$('#selectedInfo').textContent=d?(d.city||'Збережено локально'):'Створи безкоштовну демонстраційну картку';$('#claim').disabled=false;$('#claim').textContent=d?'Переглянути картку':'Створити демокартку';refresh()}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',b===x));refresh()});
$('#search').oninput=e=>{const q=e.target.value.trim().toLowerCase();if(!q)return;const found=/^\d+$/.test(q)?cells.find(x=>x.id===Number(q)):cells.find(x=>saved[x.id]?.name?.toLowerCase().includes(q));if(found)select(found.id)};
function setZoom(z){zoom=Math.max(.8,Math.min(1.6,z));svg.style.transform='scale('+zoom+')'}$('#plus').onclick=()=>setZoom(zoom+.15);$('#minus').onclick=()=>setZoom(zoom-.15);$('#reset').onclick=()=>setZoom(1);
function close(){$('#modal').classList.remove('open');$('#modal').setAttribute('aria-hidden','true')}
function open(){if(!selected)return;const d=saved[selected];$('#modal').classList.add('open');$('#modal').setAttribute('aria-hidden','false');$('#form').style.display=d?'none':'block';$('#share').style.display=d?'flex':'none';$('#modalTitle').textContent=d?d.name:'Місце № '+selected;$('#modalText').textContent=d?('№ '+selected+' · '+(d.city||'Україна')+' · '+(d.message||'Я — частина України')):'Це демо без оплати й публікації';if(!d)$('#name').focus()}
$('#claim').onclick=open;$('#close').onclick=close;$('#modal').onclick=e=>{if(e.target===$('#modal'))close()};document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
$('#form').onsubmit=e=>{e.preventDefault();if(!selected||saved[selected])return;const name=$('#name').value.trim();if(!name)return;const next={...saved,[selected]:{name,city:$('#city').value.trim(),message:$('#message').value.trim()}};try{localStorage.setItem('yaye-demo-v2',JSON.stringify(next))}catch{alert('Не вдалося зберегти');return}saved=next;select(selected);open()};
$('#share').onclick=async()=>{const d=saved[selected];if(!d)return;const s='Я Є. Україна 🇺🇦 — '+d.name+' · місце №'+selected+' (демокартка, не покупка)';try{if(navigator.share)await navigator.share({text:s});else{await navigator.clipboard.writeText(s);$('#share').textContent='Скопійовано ✓'}}catch(e){if(e.name!=='AbortError')alert(s)}};
refresh();console.info('Ukraine geographic map: '+shapes.length+' polygons, '+cells.length+' selectable cells');
})();