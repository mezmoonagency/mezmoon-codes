import sys
src,dst,mod=sys.argv[1:4]
s=open(src,encoding='utf8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70])
    s=s.replace(a,b)
rep('const APP_VERSION="2026.11.01a";','const APP_VERSION="2026.11.02c";')
rep('const state={todos:[],','const state={smm_media:[],todos:[],')
rep("    sb.from('smm_posts').select('*').order('created_at').then(r=>state.smm_posts=r.data||[]),\n",
    "    sb.from('smm_posts').select('*').order('created_at').then(r=>state.smm_posts=r.data||[]),\n    sb.from('smm_media').select('*').order('created_at').then(r=>state.smm_media=r.data||[]),\n")
rep('"smm_venues","smm_posts","leads"','"smm_venues","smm_posts","smm_media","leads"')
# modul
rep('function renderSmm(){\n  const wrap=el("div");const venues=smmVenues();const accs=state.profiles.filter(p=>p.role==="account");\n',
    open(mod,encoding='utf8').read()+'\nfunction renderSmm(){\n  const wrap=el("div");const venues=smmVenues();const accs=state.profiles.filter(p=>p.role==="account");\n  wrap.appendChild(smmTabs());if(smmTab==="media"){wrap.appendChild(smmMediaView(venues));return wrap;}\n')
# vəziyyətlər
rep('function smmTone(p){if(p.status==="posted")','function smmTone(p){if(smmAutoBusy(p))return "mut";if(p.status==="posted")')
rep('function smmChip(p){const c=smmTone(p);','''function smmChip(p){if(p.status==="plan"&&p.publish_mode==="auto"){const st=p.publish_status;return st==="failed"?'<span class="chip c-crit" style="font-size:10.5px">⚠️ Avto alınmadı</span>':`<span class="chip c-accent" style="font-size:10.5px">🤖 ${st&&st!=="retry"?"Paylaşılır…":st==="retry"?"Təkrar cəhd":"Avtomatik"}</span>`;}
  const c=smmTone(p);''')
rep('function smmOverdue(){return smmPosts().filter(p=>p.status==="plan"&&Date.now()>=smmDue(p));}','function smmOverdue(){return smmPosts().filter(p=>p.status==="plan"&&!smmAutoBusy(p)&&Date.now()>=smmDue(p));}')
# məkan kartı
rep('''${esc(igHandle(v.ig_link))} ↗</a>`:""}`;vpb.appendChild(c);});''','''${esc(igHandle(v.ig_link))} ↗</a>`:""}${smmIgBadge(v)}`;vpb.appendChild(c);});''')
rep('''  wrap.querySelectorAll("[data-sp]").forEach(x=>x.onclick=e=>{e.stopPropagation();openSmmPost(''','''  wrap.querySelectorAll("[data-igp]").forEach(b=>b.onclick=()=>smmIgConnect(b.dataset.igp,b));
  wrap.querySelectorAll("[data-sp]").forEach(x=>x.onclick=e=>{e.stopPropagation();openSmmPost(''')
# sətir
rep('${acts&&smmCanAct(p)?`<button class="mini" data-sok','${acts&&smmCanAct(p)&&!smmAutoBusy(p)?`<button class="mini" data-sok')
# paylaşım pəncərəsi
rep('''    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${p.material?`<a class="btn ghost sm" href="${esc(p.material)}"''','''    ${p.caption?`<div class="field"><label>Instagram mətni</label><div style="white-space:pre-wrap;font-size:13.5px">${esc(p.caption)}</div></div>`:""}
    ${p.publish_mode&&p.publish_mode!=="manual"?`<div class="hint" style="white-space:normal;margin-bottom:12px">${esc((SMM_MODES.find(x=>x[0]===p.publish_mode)||["",""])[1])}${p.as_story?" · Story":""}</div>`:""}
    ${p.publish_status==="failed"&&p.publish_error?`<div class="field"><label>Avtomatik paylaşım xətası</label><div style="font-size:13.5px;color:var(--crit)">${esc(p.publish_error)}</div></div>`:""}
    ${can&&p.status==="plan"&&p.publish_status==="failed"?`<button class="btn ghost sm" data-retry style="margin-bottom:12px">🔁 Yenidən cəhd et</button>`:""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${p.material?`<a class="btn ghost sm" href="${esc(p.material)}"''')
rep('${can&&p.status==="plan"?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-ok>','${can&&p.status==="plan"&&!smmAutoBusy(p)?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-ok>')
rep('''await upd('smm_posts',p.id,{status:"plan",reason:"",post_url:"",done_at:null});};''','''await upd('smm_posts',p.id,{status:"plan",reason:"",post_url:"",done_at:null,...(p.publish_mode==="auto"?{publish_mode:"manual",publish_status:"",publish_error:"",ig_container:"",ig_media_id:""}:{})});};
  if(q("[data-retry]"))q("[data-retry]").onclick=async()=>{if(!confirm("Əvvəlcə Instagram hesabını yoxla: paylaşım artıq gedibsə, təkrar paylaşılacaq. Yenidən cəhd edilsin?"))return;close();await upd('smm_posts',p.id,{publish_status:"",publish_error:"",publish_attempts:0,ig_container:""});};''')
rep('''  if(q("[data-ed]"))q("[data-ed]").onclick=()=>{close();openSmmForm(p);};''','''  if(q("[data-ed]"))q("[data-ed]").onclick=()=>{if(["creating","processing","publishing"].includes(p.publish_status)&&p.status==="plan"){alert("Bu paylaşım hazırda Instagram-a göndərilir, indi dəyişmək olmaz.");return;}close();openSmmForm(p);};''')
# forma
rep('''<input id="s5" value="${esc(e.material||"")}" placeholder="Drive linki"></div>
''','''<input id="s5" value="${esc(e.material||"")}" placeholder="Drive linki"></div>
    <div class="field"><label>Kitabxanadan material</label><div id="s-pick"></div></div>
    <div class="field"><label>Instagram mətni (caption)</label><textarea id="s7" rows="3" maxlength="2200" placeholder="Paylaşımın altında gedəcək mətn">${esc(e.caption||"")}</textarea></div>
    <div class="field"><label>Paylaşma üsulu</label><div class="pchips" style="max-height:none">${SMM_MODES.map(([k,l])=>`<button type="button" class="pchip" data-pm="${k}">${l}</button>`).join("")}</div><div class="hint" id="s-pm" style="white-space:normal;margin-top:6px"></div></div>
    <label style="display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer;margin-bottom:10px"><input type="checkbox" id="s8"${e.as_story?" checked":""}> Story kimi paylaş</label>
''')
rep('''  q("#s1").onchange=syncTime;
''','''  let mediaId=e.media_id||null,pubMode=e.publish_mode||"manual";
  const curM=()=>state.smm_media.find(m=>m.id===mediaId)||null;
  const drawPub=()=>{const v=curV();const sel=curM();const K=[...kinds];
    const items=v?smmLibrary(v).filter(it=>it.folder_id?K.includes("foto"):K.includes(smmIsVideo(it)?"video":"foto")):[];
    if(sel&&v&&sel.venue_id!==v.id){mediaId=null;}
    q("#s-pick").innerHTML=items.length?`<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">${items.map(it=>`<button type="button" data-pk="${esc(it.key)}" title="${esc(it.name)}${it.ready?"":" · təsdiqsiz"}" style="flex:0 0 84px;height:84px;padding:0;border-radius:10px;overflow:hidden;position:relative;background:var(--surface-2);border:3px solid ${sel&&it.drive_id===sel.drive_id?"var(--accent)":"var(--border)"};font-size:26px;opacity:${it.ready?1:.6}">${it.folder_id?"📂":smmIsVideo(it)?"🎬":"🖼"}${it.folder_id?"":`<img loading="lazy" src="${smmThumb(it.drive_id,200)}" alt="" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`}</button>`).join("")}</div>${sel&&!items.some(it=>it.drive_id===sel.drive_id)?`<div class="hint" style="white-space:normal;margin-top:4px">Seçilib: ${esc(sel.name)}</div>`:""}`:`<div class="hint" style="white-space:normal">Bu məkan və növ üçün material yoxdur.</div>`;
    const choose=async it=>{const row=await smmRegister(it,curV());if(!row)return;mediaId=mediaId===row.id?null:row.id;const m=curM();if(m)q("#s5").value=smmMediaLink(m);drawPub();};
    q("#s-pick").querySelectorAll("[data-pk]").forEach(b=>b.onclick=()=>{const it=items.find(x=>x.key===b.dataset.pk);if(it.folder_id)smmFolderPick(it,choose);else choose(it);});
    scrim.querySelectorAll("[data-pm]").forEach(x=>x.classList.toggle("on",x.dataset.pm===pubMode));
    q("#s-pm").textContent=pubMode==="auto"?(smmAutoProblem(curM(),v)||"Vaxtı gələndə Instagram-a özü gedəcək."):pubMode==="remind"?"Vaxtı gələndə fayl linki və mətn Account-a bildiriş kimi gedəcək.":"";};
  scrim.querySelectorAll("[data-pm]").forEach(b=>b.onclick=()=>{pubMode=b.dataset.pm;drawPub();});
  q("#s1").onchange=()=>{syncTime();drawPub();};
''')
rep('''x.style.display=kinds.has(x.dataset.tk)?"flex":"none");syncTime();});
''','''x.style.display=kinds.has(x.dataset.tk)?"flex":"none");syncTime();drawPub();});
  drawPub();
''')
rep('''    if(!v)return;
    const common={venue_id:v.id,client:v.client,account_id:v.account_id||(me?me.id:null),note:q("#s4").value.trim(),material:q("#s5").value.trim()};
''','''    if(!v)return;
    const asStory=q("#s8").checked;
    if(pubMode==="auto"){const bad=smmAutoProblem(curM(),v,asStory);if(bad){alert(bad);return;}
      if(kinds.size>1){alert("Avtomatik paylaşım üçün yalnız bir növ seç.");return;}
      if(q("#s6")&&q("#s6").checked){alert("Avtomatik paylaşım təkrarlana bilməz: eyni fayl hər həftə gedərdi.");return;}
      const k0=[...kinds][0];if(k0!==(smmIsVideo(curM())?"video":"foto")){alert("Seçilən material paylaşım növünə uyğun deyil.");return;}
      const tm=scrim.querySelector(`[data-t="${k0}"]`).value||smmVenueTime(v,k0);if(smmDue({post_date:date,post_time:tm,kind:k0})<=Date.now()){alert("Avtomatik paylaşımın vaxtı gələcəkdə olmalıdır.");return;}}
    const common={venue_id:v.id,client:v.client,account_id:v.account_id||(me?me.id:null),note:q("#s4").value.trim(),material:q("#s5").value.trim(),media_id:mediaId,caption:q("#s7").value.trim(),publish_mode:pubMode,as_story:asStory,...(isEdit&&e.status==="plan"?{publish_status:"",publish_error:"",publish_attempts:0,ig_container:""}:{})};
''')
# audit: sahə seçimi
rep("""${a.category?" · "+esc(a.category):""}</a></div>""","""${a.category?" · "+esc(a.category):""}</a>${a.sector_name?`<div style="margin-top:3px"><span class="chip c-accent" style="font-size:10.5px">${esc(a.sector_name)}</span></div>`:""}</div>""")
rep("""<div class="mf">${lead?`<span class="hint" style="margin-right:auto;align-self:center">Lidə yazıldı: ${esc(lead.name)}</span>`""","""<div class="mf">${lead?`<span class="hint" style="margin-right:auto;align-self:center;display:flex;gap:8px;align-items:center;flex-wrap:wrap">Lidə yazıldı: ${esc(lead.name)}<select data-sec title="Sahə" style="font-size:12.5px;padding:5px 8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink)"><option value="">Sahə seç…</option>${AUDIT_SECTORS.map(([k,n])=>`<option value="${k}"${a.sector===k?" selected":""}>${n}</option>`).join("")}</select></span>`""")
rep("""  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const save=async()=>{const {data,error}=await sb.from('leads').insert({name:a.name||a.handle""","""  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const secSel=scrim.querySelector("[data-sec]");
  if(secSel)secSel.onchange=async()=>{if(!secSel.value)return;secSel.disabled=true;
    try{const {data}=await sb.auth.getSession();const tok=data&&data.session?data.session.access_token:"";
      const r=await fetch(AUDIT_FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+tok},body:JSON.stringify({action:"recs",audit:a,sector:secSel.value})});
      const j=await r.json().catch(()=>({ok:false,error:"cavab yoxdur"}));if(!j.ok)throw new Error(j.error||"alınmadı");
      Object.assign(a,j.audit);const {error}=await sb.from('leads').update({audit:a}).eq('id',lead.id);if(error)throw new Error(error.message);
      scrim.querySelector(".mb").innerHTML=auditHtml(a);await reload('leads');}
    catch(e){alert("Sahə dəyişmədi: "+(e.message||e));}
    secSel.disabled=false;};
  const save=async()=>{const {data,error}=await sb.from('leads').insert({name:a.name||a.handle""")
rep("""const AUDIT_FUNC_URL=SB_URL+"/functions/v1/ig-audit";""","""const AUDIT_FUNC_URL=SB_URL+"/functions/v1/ig-audit";
const AUDIT_SECTORS=[["turizm","Turizm"],["horeca","Restoran / məkan"],["tehsil","Təhsil"],["gozellik","Gözəllik / klinika"],["ticaret","Mağaza / brend"],["umumi","Digər"]];""")
open(dst,'w',encoding='utf8').write(s)
