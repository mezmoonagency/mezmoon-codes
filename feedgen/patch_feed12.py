# 09h -> 09i: feed bazada (smm_feed) + təsdiq axını (account → PM/CEO)
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.09h"')==1
s=s.replace('APP_VERSION="2026.11.09h"','APP_VERSION="2026.11.09i"')

# R2: FEEDS blokunu bazaya bağla + təsdiq köməkçiləri
old=(
'let FEEDS=null, fDrag=null, feedMode="plan";\n'
'const FEEDLIVE={},FPALTRIED={},FEEDGRID={};\n'
'function feedLoad(){if(FEEDS)return;try{FEEDS=JSON.parse(localStorage.getItem("mm_feed")||"{}");}catch(e){FEEDS={};}}\n'
'function feedOf(cl){feedLoad();const f=FEEDS[cl]||(FEEDS[cl]={order:[],plan:{},pal:[],covers:{}});if(!f.covers)f.covers={};return f;}\n'
'function feedSave(){try{localStorage.setItem("mm_feed",JSON.stringify(FEEDS));}catch(e){}}')
assert s.count(old)==1
new=r'''let fDrag=null, feedMode="plan", feedActive=null, feedSaveTimer=null;
const FEEDLIVE={},FPALTRIED={},FEEDGRID={},FEEDS={},FEEDLOADED={},FEEDDIRTY={};
function feedBlank(){return {order:[],plan:{},covers:{},pal:[],extra:{},status:"draft",note:""};}
function feedOf(cl){if(!FEEDS[cl]){FEEDS[cl]=feedBlank();if(!FEEDLOADED[cl]){FEEDLOADED[cl]=1;feedLoadDB(cl);}}return FEEDS[cl];}
async function feedLoadDB(cl){try{const {data}=await sb.from("smm_feed").select("*").eq("client",cl).maybeSingle();
  if(FEEDDIRTY[cl])return;
  const it=(data&&data.items&&typeof data.items==="object")?data.items:{};
  FEEDS[cl]=Object.assign(feedBlank(),it,{status:data?(data.status||"draft"):"draft",note:data?(data.note||""):"",submitted_by:data?data.submitted_by:null,reviewed_by:data?data.reviewed_by:null});
  if(smmTab==="feed"&&feedActive===cl)render();
 }catch(e){}}
function feedSave(){if(!feedActive)return;FEEDDIRTY[feedActive]=1;clearTimeout(feedSaveTimer);const cl=feedActive;feedSaveTimer=setTimeout(()=>feedFlush(cl),800);}
async function feedFlush(cl){if(!FEEDDIRTY[cl])return;delete FEEDDIRTY[cl];const f=FEEDS[cl];if(!f)return;
  const items={order:f.order,plan:f.plan,covers:f.covers,pal:f.pal,extra:f.extra};
  try{await sb.from("smm_feed").upsert({client:cl,items,updated_by:me?me.id:null,updated_at:new Date().toISOString()},{onConflict:"client"});}catch(e){}}
function feedApprovers(){return state.profiles.filter(p=>p.role==="ceo"||p.role==="pm").map(p=>p.id);}
async function feedStatus(cl,status,note){const f=FEEDS[cl];if(!f)return;
  await feedFlush(cl);
  const items={order:f.order,plan:f.plan,covers:f.covers,pal:f.pal,extra:f.extra};
  const row={client:cl,items,status,updated_by:me?me.id:null,updated_at:new Date().toISOString()};
  if(status==="submitted"){row.submitted_by=me?me.id:null;row.submitted_at=new Date().toISOString();}
  if(status==="approved"||status==="rejected"){row.reviewed_by=me?me.id:null;row.reviewed_at=new Date().toISOString();}
  if(note!=null)row.note=note;
  try{const {error}=await sb.from("smm_feed").upsert(row,{onConflict:"client"});if(error)throw error;}catch(e){alert("Status yadda saxlanmadı: "+(e.message||e));return;}
  f.status=status;if(note!=null)f.note=note;if(status==="submitted")f.submitted_by=me?me.id:null;
  try{
    if(status==="submitted")abNotify(feedApprovers(),"🎨 Feed təsdiq gözləyir — "+cl,myName()+" "+cl+" məkanının feed-ini təsdiqə göndərdi. SMM Plan → 🎨 Feed-də baxıb təsdiqlə.");
    else if(status==="approved"&&f.submitted_by)abNotify([f.submitted_by],"✅ Feed təsdiqləndi — "+cl,cl+" feed-i təsdiqləndi.");
    else if(status==="rejected"&&f.submitted_by)abNotify([f.submitted_by],"❌ Feed düzəliş istədi — "+cl,cl+" feed-i rədd edildi."+(note?" Səbəb: "+note:""));
  }catch(e){}
  render();}
function feedApprovalBar(box,v,fd){
  const st=fd.status||"draft";const isMgr=role==="ceo"||role==="pm";const canEdit=smmMediaCanAdd();
  const LBL={draft:"Qaralama",submitted:"Təsdiq gözləyir",approved:"✅ Təsdiqlənib",rejected:"❌ Düzəliş istənilib"};
  const COL={draft:"var(--muted)",submitted:"#f1b44c",approved:"#34c38f",rejected:"#f46a6a"};
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2)";
  bar.innerHTML='<span style="font-size:12.5px;color:var(--muted)">Təsdiq:</span><b style="color:'+(COL[st]||"var(--muted)")+'">'+(LBL[st]||st)+'</b>'+(st==="rejected"&&fd.note?'<span class="hint" style="margin:0;flex-basis:100%">Səbəb: '+esc(fd.note)+'</span>':'');
  const btns=el("div");btns.style.cssText="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap";
  if(canEdit&&(st==="draft"||st==="rejected")){const b=el("button","btn sm","📤 Təsdiqə göndər");b.onclick=()=>{if(!(fd.order&&fd.order.length)){alert("Feed boşdur.");return;}if(confirm(v.client+" feed-ini təsdiqə göndər?"))feedStatus(v.client,"submitted");};btns.appendChild(b);}
  if(isMgr&&st==="submitted"){const a=el("button","btn sm","✅ Təsdiqlə");a.onclick=()=>feedStatus(v.client,"approved");const r=el("button","btn ghost sm","❌ Rədd et");r.onclick=()=>{const n=prompt("Rədd səbəbi (istəyə görə):","");if(n===null)return;feedStatus(v.client,"rejected",n||"");};btns.appendChild(a);btns.appendChild(r);}
  if(isMgr&&st==="approved"){const b=el("button","btn ghost sm","↩︎ Yenidən aç");b.onclick=()=>feedStatus(v.client,"draft");btns.appendChild(b);}
  bar.appendChild(btns);box.appendChild(bar);}'''
s=s.replace(old,new)

# R3a: smmFeedView-də feedActive təyin et
anchor1='const v=venues.find(x=>x.client===smmVenue)||venues[0];'
assert s.count(anchor1)>=1
s=s.replace(anchor1,anchor1+'feedActive=v.client;',1)

# R3b: təsdiq zolağını mode-dan əvvəl göstər
anchor2='if(feedMode==="live")feedLiveBody(box,v,acc,fd);'
assert s.count(anchor2)==1
s=s.replace(anchor2,'feedApprovalBar(box,v,fd);\n  if(feedMode==="live")feedLiveBody(box,v,acc,fd);')

# R4: köhnə "brauzerdə saxlanılır" qeydini yenilə
oldhint='box.appendChild(el("div","hint","Qeyt: planlanan feed, örtüklər və palitra hələ yalnız bu brauzerdə saxlanılır. Bütün komanda eyni görsün deyə bazaya sütun əlavə edə bilərik."));'
if s.count(oldhint)==0:
    oldhint='box.appendChild(el("div","hint","Qeyd: planlanan feed, örtüklər və palitra hələ yalnız bu brauzerdə saxlanılır. Bütün komanda eyni görsün deyə bazaya sütun əlavə edə bilərik."));'
if s.count(oldhint)==1:
    s=s.replace(oldhint,'box.appendChild(el("div","hint","Feed düzülüşü, örtüklər və palitra bazada saxlanılır — bütün komanda eyni görür."));')

open(dst,"w").write(s)
print("ok bytes:",len(s))
