import sys
src,dst=sys.argv[1:3]
s=open(src,encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70])
    s=s.replace(a,b)
rep('const APP_VERSION="2026.11.02c";','const APP_VERSION="2026.11.02d";')
rep('const AUDIT_FUNC_URL=SB_URL+"/functions/v1/ig-audit";','const AUDIT_FUNC_URL=SB_URL+"/functions/v1/ig-audit";\nconst RESEARCH_FUNC_URL=SB_URL+"/functions/v1/lead-research";')
# lid kartı
rep('''<button class="mini" data-la title="Instagram audit">${ICON.search}</button><button class="mini" data-lp''','''<button class="mini" data-la title="Instagram audit">${ICON.search}</button><button class="mini" data-lr title="Bazar araşdırması" style="white-space:nowrap">🌍 Bazar</button><button class="mini" data-lp''')
rep('''card.querySelector("[data-la]").onclick=e=>auditLead(l,e.currentTarget);''','''card.querySelector("[data-la]").onclick=e=>auditLead(l,e.currentTarget);
  card.querySelector("[data-lr]").onclick=()=>openResearch(l);''')
# lid forması
rep('''<button class="mini" data-p>📄 Təklif hazırla</button>
      ${role==="ceo"''','''<button class="mini" data-r>🌍 Bazar araşdırması</button><button class="mini" data-p>📄 Təklif hazırla</button>
      ${role==="ceo"''')
rep('''    scrim.querySelector("[data-p]").onclick=()=>{close();openPropForm(state.leads.find(x=>x.id===e.id)||e);};''','''    scrim.querySelector("[data-r]").onclick=()=>{close();openResearch(state.leads.find(x=>x.id===e.id)||e);};
    scrim.querySelector("[data-p]").onclick=()=>{close();openPropForm(state.leads.find(x=>x.id===e.id)||e);};''')
# təklif: araşdırmanın tövsiyələri auditdən üstündür
rep('''const strat=isEdit?(e.strategy||[]):(a?(a.recs||[])''','''const rn=!isEdit&&lead&&lead.research&&lead.research.needs;
  const strat=isEdit?(e.strategy||[]):rn&&rn.length?rn.map(x=>({t:x.t||"",d:x.d})):(a?(a.recs||[])''')
# funksiyalar
rep('function auditHtml(a){','''function researchHtml(r){
  const sec=(t,arr)=>(arr||[]).length?`<div style="font-size:12px;font-weight:700;color:var(--accent-ink);margin-top:10px">${t}</div><ul style="margin:2px 0 6px;padding-left:18px;font-size:13px">${arr.map(x=>`<li style="margin:4px 0">${esc(x)}</li>`).join("")}</ul>`:"";
  const safeUrl=u=>/^https?:\\/\\//i.test(String(u||""))?u:"#";
  return `${r.summary?`<div style="font-size:14px;font-weight:600;line-height:1.45">${esc(r.summary)}</div>`:""}
    ${sec("🌍 Qlobal bazar",r.global)}${sec("📍 Bakı bazarı",r.local)}${sec("⚔️ Rəqiblər",r.competitors)}${sec("🔎 Bu biznesin vəziyyəti",r.brand)}
    ${(r.needs||[]).length?`<div style="font-size:12px;font-weight:700;color:var(--good);margin-top:10px">✅ Lazım olanlar (təklifə düşür)</div><ul style="margin:2px 0 6px;padding-left:18px;font-size:13px">${r.needs.map(n=>`<li style="margin:4px 0">${n.t?`<b>${esc(n.t)}:</b> `:""}${esc(n.d)}</li>`).join("")}</ul>`:""}
    ${sec("🔒 Yalnız daxili (müştəriyə göstərilmir)",r.internal)}
    ${r.raw?`<div style="white-space:pre-wrap;font-size:13px;margin-top:8px">${esc(r.raw)}</div>`:""}
    ${(r.sources||[]).length?`<div style="font-size:12px;font-weight:700;margin-top:10px">Mənbələr</div><div style="font-size:12px;display:flex;flex-direction:column;gap:3px">${r.sources.map(s=>`<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener" style="color:var(--accent-ink)">${esc(s.title)}</a>`).join("")}</div>`:""}
    <div class="hint" style="margin-top:10px;font-size:11px">${esc(fmtWhen(r.at))} · ${r.searches||0} axtarış · ~$${Number(r.cost_usd||0).toFixed(2)}</div>`;
}
function openResearch(l){
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:680px"><div class="mh"><h3>🌍 Bazar araşdırması · ${esc(l.name)}</h3><button data-x>×</button></div><div class="mb" data-b></div><div class="mf"><button class="btn ghost" data-run></button><button class="btn" data-prop>📄 Təklif hazırla</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const body=scrim.querySelector("[data-b]"),run=scrim.querySelector("[data-run]");
  let cur=l.research||null;
  const draw=()=>{body.innerHTML=cur?researchHtml(cur):`<div class="empty">Hələ araşdırma yoxdur. Məkan, qlobal bazar, Bakı və rəqiblər veb axtarışla yoxlanılacaq. Hər araşdırma Anthropic API balansından pul xərcləyir və 1–2 dəqiqə çəkir.</div>`;run.textContent=cur?"🔄 Yenidən araşdır":"🌍 Araşdırmanı başlat";};
  draw();
  scrim.querySelector("[data-prop]").onclick=()=>{close();openPropForm(state.leads.find(x=>x.id===l.id)||l);};
  run.onclick=async()=>{
    if(cur&&!confirm(`Yenidən araşdırma API-dən yenə pul xərcləyəcək (son dəfə ~$${Number(cur.cost_usd||0).toFixed(2)}). Davam edilsin?`))return;
    run.disabled=true;run.textContent="⏳ Araşdırılır, 1–2 dəqiqə…";
    try{const {data}=await sb.auth.getSession();const tok=data&&data.session?data.session.access_token:"";
      const r=await fetch(RESEARCH_FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+tok},body:JSON.stringify({lead_id:l.id})});
      const j=await r.json().catch(()=>({ok:false,error:"cavab yoxdur, yenidən cəhd edin"}));if(!j.ok)throw new Error(j.error||"alınmadı");
      cur=j.research;await reload('leads');}
    catch(e){alert("Araşdırma alınmadı: "+(e.message||e));}
    run.disabled=false;draw();};
}
function auditHtml(a){''')
open(dst,"w",encoding="utf-8").write(s)
