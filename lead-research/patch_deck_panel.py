s=open("../index-2026.11.02e.html",encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70])
    s=s.replace(a,b)
rep('const APP_VERSION="2026.11.02e";','const APP_VERSION="2026.11.02f";')
rep('title="Marketinq araşdırması" style="white-space:nowrap">🌍 Marketinq</button>','title="Müştəri təqdimatı: Instagram analizi, bazar, vəd, plan" style="white-space:nowrap">📊 Təqdimat</button>')
rep('<button class="mini" data-r>🌍 Marketinq araşdırması</button>','<button class="mini" data-r>📊 Təqdimat hazırla</button>')
rep('🌍 Marketinq araşdırması · ${esc(l.name)}','📊 Təqdimat · ${esc(l.name)}')
# nəticə görünüşü
a=s.index('function researchHtml(r){');b=s.index('function openResearch(l){')
s=s[:a]+r'''function researchHtml(r){
  const head=(t,c)=>`<div style="font-size:12px;font-weight:700;color:var(--${c||"accent-ink"});margin-top:12px">${t}</div>`;
  const sec=(t,arr,c)=>(arr||[]).length?`${head(t,c)}<ul style="margin:2px 0 6px;padding-left:18px;font-size:13px">${arr.map(x=>`<li style="margin:4px 0">${esc(x)}</li>`).join("")}</ul>`:"";
  const td=(t,arr,c)=>(arr||[]).length?`${head(t,c)}<ul style="margin:2px 0 6px;padding-left:18px;font-size:13px">${arr.map(n=>`<li style="margin:4px 0">${n.t?`<b>${esc(n.t)}:</b> `:""}${esc(n.d)}</li>`).join("")}</ul>`:"";
  const safeUrl=u=>/^https?:\/\//i.test(String(u||""))?u:"#";
  const d=r.deck||{},m=r.market||{};
  const srcs=m.sources||r.sources||[];
  return `${(d.summary||r.summary)?`<div style="font-size:14px;font-weight:600;line-height:1.45">${esc(d.summary||r.summary)}</div>`:""}
    ${(r.notes||[]).length||r.posts_note?`<div class="chip c-warn" style="white-space:normal;margin-top:8px;font-size:11.5px">${esc([r.posts_note,...(r.notes||[])].filter(Boolean).join(" · "))}</div>`:""}
    ${td("📱 Instagram analizi",d.ig)}
    ${(d.posts||[]).length?`${head("🎞️ Paylaşımlar")}<div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">${d.posts.map(p=>`<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener" style="display:flex;gap:10px;align-items:flex-start;text-decoration:none;color:inherit;font-size:13px">${p.img?`<img src="${esc(p.img)}" alt="" style="width:52px;height:68px;object-fit:cover;border-radius:8px;flex:none">`:""}<span><b>${esc(p.verdict||"")}</b> ${esc(p.note)}</span></a>`).join("")}</div>`:""}
    ${sec("✅ Müsbət tərəflər",d.pros,"good")}${sec("⚠️ Mənfi tərəflər",d.cons,"crit")}
    ${td("🤝 Vədimiz",d.promises,"good")}
    ${(d.targets||[]).length?`${head("🎯 Hədəflər (zəmanət deyil, yoxlayın)","warn")}<ul style="margin:2px 0 6px;padding-left:18px;font-size:13px">${d.targets.map(t=>`<li style="margin:4px 0"><b>${esc(t.metric)}:</b> ${esc(t.now||"—")} → ${esc(t.goal)}${t.when?` · ${esc(t.when)}`:""}</li>`).join("")}</ul>`:""}
    ${(d.plan||[]).length?`${head("🗓️ Plan")}${d.plan.map(p=>`<div style="font-size:13px;margin:6px 0"><b>${esc(p.period)}${p.focus?`: ${esc(p.focus)}`:""}</b><ul style="margin:2px 0;padding-left:18px">${(p.items||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}`:""}
    ${td("🧭 Strategiya",d.needs||r.needs)}
    <details style="margin-top:10px;font-size:13px"><summary style="cursor:pointer;font-weight:600">Bazar araşdırması (daxili)</summary>
      ${sec("🌍 Dünyada işləyən marketinq",m.global||r.global)}${sec("📍 Bakı",m.local||r.local)}${sec("👥 Auditoriya",m.audience||r.audience)}${sec("⚔️ Rəqiblər",m.competitors||r.competitors)}${sec("🔎 Brend",m.brand||r.brand)}
      ${srcs.length?`${head("Mənbələr")}<div style="font-size:12px;display:flex;flex-direction:column;gap:3px">${srcs.map(x=>`<a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener" style="color:var(--accent-ink)">${esc(x.title)}</a>`).join("")}</div>`:""}
    </details>
    ${sec("🔒 Yalnız daxili (müştəriyə göstərilmir)",d.internal||r.internal)}
    ${r.raw?`<div style="white-space:pre-wrap;font-size:13px;margin-top:8px">${esc(r.raw)}</div>`:""}
    <div class="hint" style="margin-top:10px;font-size:11px">${esc(fmtWhen(r.at))} · ${r.searches||0} axtarış · ~$${Number(r.cost_usd||0).toFixed(2)}</div>`;
}
'''+s[b:]
rep('Hələ araşdırma yoxdur. Brendin marketinqi, dünyada işləyən trendlər, Bakı auditoriyası və rəqiblərin marketinqi veb axtarışla yoxlanılacaq. Hər araşdırma Anthropic API balansından pul xərcləyir və 1–2 dəqiqə çəkir.','Hələ təqdimat yoxdur. Son 12 paylaşım tək-tək oxunacaq, bazar və rəqiblər araşdırılacaq, sonra müsbət/mənfi tərəflər, vədimiz, hədəflər və plan yazılacaq. Apify və Anthropic balansından pul xərcləyir, 3–5 dəqiqə çəkir. Bu pəncərəni bağlamayın.')
rep('run.textContent=cur?"🔄 Yenidən araşdır":"🌍 Araşdırmanı başlat";','run.textContent=cur?"🔄 Yenidən hazırla":"📊 Təqdimatı hazırla";')
a=s.index('    if(cur&&!confirm(`Yenidən araşdırma API-dən');b=s.index('    run.disabled=false;draw();};')
s=s[:a]+r'''    if(cur&&!confirm(`Yenidən hazırlamaq yenə pul xərcləyəcək (son dəfə ~$${Number(cur.cost_usd||0).toFixed(2)}). Davam edilsin?`))return;
    run.disabled=true;
    try{const {data}=await sb.auth.getSession();const tok=data&&data.session?data.session.access_token:"";
      const pk=(leadProps(l)[0]||{}).packages;const packages=pk&&pk.length?pk:PROP_PRESETS.map(p=>p.pk);
      const call=async step=>{const r=await fetch(RESEARCH_FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+tok},body:JSON.stringify({lead_id:l.id,step,packages})});
        const j=await r.json().catch(()=>({ok:false,error:"cavab yoxdur (vaxt limiti ola bilər), yenidən cəhd edin"}));if(!j.ok)throw new Error(j.error||"alınmadı");return j.research;};
      for(const [step,txt] of [["posts","⏳ 1/3 Paylaşımlar oxunur…"],["market","⏳ 2/3 Bazar araşdırılır…"],["deck","⏳ 3/3 Təqdimat yazılır…"]]){run.textContent=txt;cur=await call(step);}
      await reload('leads');}
    catch(e){alert("Təqdimat alınmadı: "+(e.message||e));}
'''+s[b:]
# təklif forması
rep('''const rn=!isEdit&&lead&&lead.research&&lead.research.needs;''','''const rn=!isEdit&&lead&&lead.research&&lead.research.needs;
  const dk=isEdit?((e.meta||{}).deck||null):((lead&&lead.research&&lead.research.deck)||null);
  const dkTd=x=>(x||[]).map(n=>n.t?n.t+": "+n.d:n.d).join("\\n");
  const dkT=x=>(x||[]).map(t=>[t.metric,t.now,t.goal,t.when].join(" | ")).join("\\n");
  const dkP=x=>(x||[]).map(m=>`${m.period} | ${m.focus||""} | ${(m.items||[]).join("; ")}`).join("\\n");''')
rep('''    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
      ${a?`<label''','''    ${dk?`<details open style="border:1px solid var(--border);border-radius:12px;padding:10px 12px"><summary style="cursor:pointer;font-size:13px;font-weight:600">📊 Təqdimat: göndərməzdən əvvəl oxuyun və düzəldin</summary>
      <label style="display:flex;gap:6px;align-items:center;font-size:13px;margin-top:10px"><input type="checkbox" id="d0" ${dk.off?"":"checked"}> Təqdimat bölmələrini səhifədə göstər</label>
      <div class="field"><label>Qısa nəticə</label><textarea id="d1" rows="2">${esc(dk.summary||"")}</textarea></div>
      <div class="field"><label>Instagram analizi: hər sətir «Mövzu: mətn»</label><textarea id="d2" rows="6">${esc(dkTd(dk.ig))}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="field"><label>Müsbət tərəflər</label><textarea id="d3" rows="5">${esc((dk.pros||[]).join("\\n"))}</textarea></div>
      <div class="field"><label>Mənfi tərəflər</label><textarea id="d4" rows="5">${esc((dk.cons||[]).join("\\n"))}</textarea></div></div>
      <div class="field"><label>Vədimiz: hər sətir «Başlıq: mətn»</label><textarea id="d5" rows="4">${esc(dkTd(dk.promises))}</textarea></div>
      <div class="field"><label>Hədəflər (zəmanət deyil, rəqəmləri təsdiqləyin): Göstərici | İndi | Hədəf | Müddət</label><textarea id="d6" rows="4">${esc(dkT(dk.targets))}</textarea></div>
      <div class="field"><label>Plan: Dövr | Fokus | iş; iş; iş</label><textarea id="d7" rows="4">${esc(dkP(dk.plan))}</textarea></div></details>`:""}
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
      ${a?`<label''')
rep('''meta:{...(e.meta||{}),eyebrow:v("m1"),note_title:v("m2"),note_body:v("m3"),cta_text:v("m4"),cta_link:v("m5")}};''','''meta:{...(e.meta||{}),eyebrow:v("m1"),note_title:v("m2"),note_body:v("m3"),cta_text:v("m4"),cta_link:v("m5")}};
    if(dk){const ln=id=>v(id).split("\\n").map(x=>x.trim()).filter(Boolean);
      const tdp=r=>{const i=r.indexOf(":");return i>0&&i<60?{t:r.slice(0,i).trim(),d:r.slice(i+1).trim()}:{t:"",d:r};};
      row.meta.deck={off:!cb("d0"),summary:v("d1"),ig:ln("d2").map(tdp),pros:ln("d3"),cons:ln("d4"),promises:ln("d5").map(tdp),posts:dk.posts||[],
        targets:ln("d6").map(r=>{const [metric,now,goal,when]=r.split("|").map(x=>x.trim());return {metric:metric||"",now:now||"",goal:goal||"",when:when||""};}).filter(t=>t.metric&&t.goal),
        plan:ln("d7").map(r=>{const [period,focus,items]=r.split("|").map(x=>x.trim());return {period:period||"",focus:focus||"",items:(items||"").split(";").map(x=>x.trim()).filter(Boolean)};}).filter(m=>m.period)};}''')
open("../index-2026.11.02f.html","w",encoding="utf-8").write(s)
