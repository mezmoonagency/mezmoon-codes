# 10a -> 10b: Kontent bölməsinə ay filtri
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.10a"')==1
s=s.replace('APP_VERSION="2026.11.10a"','APP_VERSION="2026.11.10b"')

old='''function renderContent(){
  const wrap=el("div");const r=ROLES[role];'''
assert s.count(old)==1
new='''let contentMonth=null;
function contentMonthBar(){
  const has={};let noM=0;state.content.forEach(c=>{if(c.month)has[c.month]=(has[c.month]||0)+1;else noM++;});
  const cur=MONTHS_AZ[new Date().getMonth()];
  if(contentMonth===null)contentMonth=has[cur]?cur:"all";
  if(contentMonth!=="all"&&contentMonth!=="none"&&!has[contentMonth])contentMonth="all";
  const opts=[["all","Hamısı",state.content.length]].concat(MONTHS_AZ.filter(m=>has[m]).map(m=>[m,m,has[m]]));if(noM)opts.push(["none","Ay yoxdur",noM]);
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 16px";
  bar.appendChild(el("span","hint","Ay:"));
  const sg=el("div","seg");sg.style.cssText="margin-left:0;flex-wrap:wrap";
  sg.innerHTML=opts.map(([k,l,n])=>`<button type="button" data-cm="${esc(k)}" class="${contentMonth===k?"on":""}">${esc(l)} <span style="opacity:.6">${n}</span></button>`).join("");
  sg.querySelectorAll("[data-cm]").forEach(b=>b.onclick=()=>{contentMonth=b.dataset.cm;render();});
  bar.appendChild(sg);return bar;}
function contentInMonth(c){return contentMonth==="all"||!contentMonth?true:contentMonth==="none"?!c.month:c.month===contentMonth;}
function renderContent(){
  const wrap=el("div");const r=ROLES[role];'''
s=s.replace(old,new)

old2='''  wrap.appendChild(lg);
  const kan=el("div","kan");
  CONTENT_STAGES.forEach(st=>{
    const col=el("div","col");
    const items=state.content.filter(c=>c.status===st);'''
assert s.count(old2)==1
s=s.replace(old2,'''  wrap.appendChild(lg);
  wrap.appendChild(contentMonthBar());
  const kan=el("div","kan");
  CONTENT_STAGES.forEach(st=>{
    const col=el("div","col");
    const items=state.content.filter(c=>c.status===st&&contentInMonth(c));''')

old3='''function goFlash(v,sid){
  view=v;render();'''
assert s.count(old3)==1
s=s.replace(old3,'''function goFlash(v,sid){
  if(v==="content"&&String(sid).startsWith("content:")){const c=state.content.find(x=>"content:"+x.id===sid);if(c)contentMonth=c.month||"none";}
  view=v;render();''')
open(dst,"w").write(s);print("ok",len(s))
