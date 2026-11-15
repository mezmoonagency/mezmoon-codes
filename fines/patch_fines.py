import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
old_v='APP_VERSION="2026.11.09x"';assert s.count(old_v)==1
s=s.replace(old_v,'APP_VERSION="2026.11.10a"')
def r(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:70]); s=s.replace(a,b)
# 1) hamının menyusuna
r('Object.values(ROLES).forEach(r=>{if(!r.nav.includes("todo"))r.nav.splice(1,0,"todo");});',
  'Object.values(ROLES).forEach(r=>{if(!r.nav.includes("todo"))r.nav.splice(1,0,"todo");});\n/* Cərimələr — hər kəs öz cərimələrini görür, CEO hamısını görür və yazır */\nObject.values(ROLES).forEach(r=>{if(!r.nav.includes("fines"))r.nav.push("fines");});')
# 2) VIEWS
r('  dash:{t:"İdarə paneli",',
  '  fines:{t:"Cərimələr",d:"Cərimələr aylıq hesablanır. Hər kəs yalnız öz cərimələrini görür; CEO hamısını görür və yazır — yazılan cərimə işçiyə bildiriş kimi gedir."},\n  dash:{t:"İdarə paneli",')
# 3) menyu qrupu
r('["İdarəetmə",["finance","team","attendance","audit"]]]','["İdarəetmə",["finance","team","attendance","fines","audit"]]]')
# 4) ikon
r('attendance:ICON.clock,audit:ICON.history,',
  'attendance:ICON.clock,fines:IC(\'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>\'),audit:ICON.history,')
# 5) render dispatch
r('  else if(view==="attendance")content=(role==="ceo"?renderAttendance():el("div"));',
  '  else if(view==="attendance")content=(role==="ceo"?renderAttendance():el("div"));\n  else if(view==="fines")content=renderFines();')
# 6) funksiyalar — renderAttendance-dan əvvəl
FN=r'''/* ---------- Cərimələr ---------- */
let fineY=new Date().getFullYear(),fineM=new Date().getMonth(),finesLoading=false;
const fineMonthKey=(y,m)=>y+"-"+String(m+1).padStart(2,"0");
const fineMon=f=>String(f.fine_date||f.created_at||"").slice(0,7);
async function loadFines(){if(finesLoading)return;finesLoading=true;try{const {data,error}=await sb.from('fines').select('*').order('fine_date',{ascending:false});state.fines=error?[]:(data||[]);if(error)toast("Cərimələr yüklənmədi: "+error.message);}finally{finesLoading=false;}if(view==="fines")render();}
function renderFines(){
  const wrap=el("div");
  if(!state.fines){wrap.appendChild(el("div","empty","Yüklənir…"));loadFines();return wrap;}
  const isCeo=role==="ceo";const mk=fineMonthKey(fineY,fineM);
  const mine=isCeo?state.fines:state.fines.filter(f=>me&&f.user_id===me.id);
  const inMonth=mine.filter(f=>fineMon(f)===mk);
  const sum=a=>a.reduce((x,f)=>x+Number(f.amount||0),0);
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px";
  bar.innerHTML=`<div class="calbar" style="margin:0"><button class="nav2" data-mv="-1">‹</button><h3>${MONTHS_AZ[fineM]} ${fineY}</h3><button class="nav2" data-mv="1">›</button></div>`+(isCeo?`<button class="btn" data-addfine style="margin-left:auto">+ Cərimə yaz</button>`:"");
  bar.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{fineM+=+b.dataset.mv;if(fineM<0){fineM=11;fineY--;}if(fineM>11){fineM=0;fineY++;}render();});
  const ab=bar.querySelector("[data-addfine]");if(ab)ab.onclick=()=>openFineForm();
  wrap.appendChild(bar);
  const people=new Set(inMonth.map(f=>f.user_id)).size;
  wrap.appendChild(el("div","tiles",tileC(isCeo?"Ayın cəmi":"Bu ay cərimən",money(sum(inMonth)),MONTHS_AZ[fineM],inMonth.length?"crit":"good")+tile("Cərimə sayı",inMonth.length,isCeo?people+" işçi":"")+tile(isCeo?"İl üzrə cəmi":"İl üzrə cəmin",money(sum(mine.filter(f=>fineMon(f).startsWith(fineY+"-")))),String(fineY))));
  // CEO: işçilər üzrə aylıq cəm
  if(isCeo){const byU={};inMonth.forEach(f=>{(byU[f.user_id]=byU[f.user_id]||[]).push(f);});
    const p=el("div","panel");p.style.marginTop="16px";p.appendChild(el("div","ph",`<h3>İşçilər üzrə — ${MONTHS_AZ[fineM]}</h3><span class="count">${Object.keys(byU).length}</span>`));
    const ids=Object.keys(byU).sort((a,b)=>sum(byU[b])-sum(byU[a]));
    if(!ids.length)p.appendChild(el("div","empty","Bu ay cərimə yoxdur"));
    ids.forEach(u=>p.appendChild(el("div","row",`<div class="main"><div class="t">${esc(personName(u))}</div><div class="m">${byU[u].length} cərimə</div></div><div class="r"><b style="color:#e5484d">${money(sum(byU[u]))}</b></div>`)));
    wrap.appendChild(p);}
  // siyahı
  const lp=el("div","panel");lp.style.marginTop="16px";lp.appendChild(el("div","ph",`<h3>${isCeo?"Bütün cərimələr":"Cərimələrim"} — ${MONTHS_AZ[fineM]}</h3><span class="count">${inMonth.length}</span>`));
  if(!inMonth.length)lp.appendChild(el("div","empty",isCeo?"Bu ay cərimə yazılmayıb":"Bu ay cəriməniz yoxdur 👍"));
  inMonth.forEach(f=>{const rw=el("div","row",`<div class="main"><div class="t">${isCeo?esc(personName(f.user_id))+" · ":""}${esc(f.reason||"Səbəb yazılmayıb")}</div><div class="m">${esc(String(f.fine_date||"").split("-").reverse().join("."))}${f.created_by&&isCeo?" · yazdı: "+esc(personName(f.created_by)):""}</div></div><div class="r" style="display:flex;align-items:center;gap:8px"><b style="color:#e5484d">${money(f.amount)}</b>${isCeo?`<button class="mini" data-fe="${f.id}">Düzəlt</button><button class="mini" data-fd="${f.id}" style="color:#e5484d">Sil</button>`:""}</div>`);lp.appendChild(rw);});
  lp.querySelectorAll("[data-fe]").forEach(b=>b.onclick=()=>openFineForm(state.fines.find(x=>x.id===b.dataset.fe)));
  lp.querySelectorAll("[data-fd]").forEach(b=>b.onclick=async()=>{const f=state.fines.find(x=>x.id===b.dataset.fd);if(!f||!confirm(personName(f.user_id)+" — "+money(f.amount)+" cəriməsi silinsin?"))return;const {error}=await sb.from('fines').delete().eq('id',f.id);if(error)return alert("Silinmədi: "+error.message);await loadFines();});
  wrap.appendChild(lp);
  // aylıq tarixçə (il üzrə)
  const hp=el("div","panel");hp.style.marginTop="16px";hp.appendChild(el("div","ph",`<h3>Aylar üzrə — ${fineY}</h3>`));
  const months=[...Array(12).keys()].map(m=>{const a=mine.filter(f=>fineMon(f)===fineMonthKey(fineY,m));return {m,n:a.length,t:sum(a)};}).filter(x=>x.n);
  if(!months.length)hp.appendChild(el("div","empty","Bu il cərimə yoxdur"));
  months.forEach(x=>{const rw=el("div","row",`<div class="main"><div class="t">${MONTHS_AZ[x.m]}</div><div class="m">${x.n} cərimə</div></div><div class="r"><b>${money(x.t)}</b></div>`);rw.style.cursor="pointer";rw.onclick=()=>{fineM=x.m;render();};hp.appendChild(rw);});
  wrap.appendChild(hp);
  return wrap;}
function openFineForm(f){
  if(role!=="ceo")return;const isEdit=!!f;
  const staff=state.profiles.filter(p=>p.role&&p.id!==(me&&me.id)).sort((a,b)=>String(a.full_name||a.username).localeCompare(String(b.full_name||b.username),"az"));
  const today=new Date(Date.now()+4*36e5).toISOString().slice(0,10);
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:440px"><div class="mh"><h3>${isEdit?"Cəriməni düzəlt":"Cərimə yaz"}</h3><button data-x>×</button></div><div class="mb">
    <div class="field"><label>İşçi</label><select id="fn-u">${staff.map(p=>`<option value="${p.id}"${f&&f.user_id===p.id?" selected":""}>${esc(p.full_name||p.username)} · ${esc((ROLES[p.role]||{}).label||p.role)}</option>`).join("")}</select></div>
    <div class="field"><label>Məbləğ (₼)</label><input id="fn-a" type="number" min="0.01" step="0.01" value="${f?esc(f.amount):""}" placeholder="məs. 20"></div>
    <div class="field"><label>Səbəb</label><textarea id="fn-r" rows="3" placeholder="məs. Çəkilişə 40 dəqiqə gecikmə">${f?esc(f.reason||""):""}</textarea></div>
    <div class="field"><label>Tarix</label><input id="fn-d" type="date" value="${f?esc(f.fine_date):today}"></div>
    ${isEdit?"":`<div class="hint" style="white-space:normal">Yadda saxlayanda işçiyə bildiriş gedəcək.</div>`}
  </div><div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" data-ok>${isEdit?"Yadda saxla":"Cərimə yaz"}</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();scrim.querySelectorAll("[data-x]").forEach(b=>b.onclick=close);scrim.onclick=e=>{if(e.target===scrim)close();};
  scrim.querySelector("[data-ok]").onclick=async(e)=>{
    const uid=scrim.querySelector("#fn-u").value,amount=Number(scrim.querySelector("#fn-a").value),reason=scrim.querySelector("#fn-r").value.trim(),fine_date=scrim.querySelector("#fn-d").value||today;
    if(!uid)return alert("İşçi seç");if(!(amount>0))return alert("Məbləğ düz deyil");if(!reason)return alert("Səbəbi yaz");
    e.target.disabled=true;
    const row={user_id:uid,amount,reason,fine_date};
    const res=isEdit?await sb.from('fines').update(row).eq('id',f.id):await sb.from('fines').insert({...row,created_by:me?me.id:null});
    if(res.error){e.target.disabled=false;return alert("Yadda saxlanmadı: "+res.error.message);}
    if(!isEdit){const mk=fine_date.slice(0,7);const monthSum=(state.fines||[]).filter(x=>x.user_id===uid&&fineMon(x)===mk).reduce((s,x)=>s+Number(x.amount||0),0)+amount;
      const mi=+mk.slice(5,7)-1;
      await abNotify([uid],"⚠️ Cərimə: "+money(amount),"Səbəb: "+reason+"\nTarix: "+fine_date.split("-").reverse().join(".")+"\n"+MONTHS_AZ[mi]+" ayı üzrə cəmi cərimən: "+money(monthSum)+"\n\nPanel → Cərimələr bölməsində bax.");}
    close();await loadFines();toast(isEdit?"✓ Cərimə yeniləndi":"✓ Cərimə yazıldı, işçiyə bildiriş getdi");
  };}
'''
r('function renderAttendance(){',FN+'function renderAttendance(){')
open(dst,"w").write(s);print("ok",len(s))
