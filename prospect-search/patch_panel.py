# 10b -> 10c: Potensial tabı — sektorlar, IG analizi bayraqları, filtrlər, CSV
import sys,re
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.10b"')==1
s=s.replace('APP_VERSION="2026.11.10b"','APP_VERSION="2026.11.10c"')

a=s.index('function renderProspects(q){')
b=s.index('async function prospectToLead(x,withAudit,btn){')
NEW=r'''const PR_SECTORS={horeca:{n:"Restoran / kafe",q:"restaurant, cafe, lounge, coffee shop, bar"},otel:{n:"Otel",q:"hotel, boutique hotel"},gozellik:{n:"Gözəllik / klinika",q:"beauty salon, barbershop, aesthetic clinic, dental clinic, spa"},fitnes:{n:"Fitnes / idman",q:"gym, fitness center, pilates studio, yoga studio"},tehsil:{n:"Təhsil",q:"education center, language school, training center"},ticaret:{n:"Mağaza / butik",q:"clothing store, boutique, cosmetics store, furniture store, flower shop"},turizm:{n:"Turizm",q:"travel agency, tour operator"}};
const PR_FLAGS={few_videos:["🎬 Az video","warn"],stopped:["⏸ Paylaşımı dayandırıb","crit"],weak:["📉 Zəif marketinq","crit"],no_ig:["IG tapılmadı","mut"],private:["🔒 Bağlı profil","mut"]};
let prSector="all",prFlag="all";
function prK(n){n=Number(n||0);return n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,"")+"M":n>=1e3?(n/1e3).toFixed(1).replace(/\.0$/,"")+"K":String(n);}
function prFlagOk(x){const f=x.flags||[];if(prFlag==="all")return true;if(prFlag==="pending")return !!x.ig&&!x.ig_checked_at;if(prFlag==="any")return f.some(k=>k==="few_videos"||k==="stopped"||k==="weak");return f.includes(prFlag);}
function prCsv(rows){
  const cols=[["Ad",x=>x.name],["Sektor",x=>(PR_SECTORS[x.sector]||{}).n||x.sector],["Kateqoriya",x=>x.category],["Telefon (Maps)",x=>x.phone],["Telefon (IG)",x=>x.ig_phone],["Instagram",x=>x.ig?"https://www.instagram.com/"+x.ig+"/":""],["İzləyici",x=>(x.ig_stats||{}).followers],["30 gündə paylaşım",x=>(x.ig_stats||{}).posts_30d],["30 gündə video",x=>(x.ig_stats||{}).videos_30d],["Son paylaşım (gün)",x=>(x.ig_stats||{}).days_since_last],["Bal",x=>x.score],["Bayraqlar",x=>(x.flags||[]).map(k=>(PR_FLAGS[k]||[k])[0].replace(/^\S+\s/,"")).join("; ")],["Reytinq",x=>x.rating],["Rəy",x=>x.reviews],["Ünvan",x=>x.address],["Xəritə",x=>x.maps_url]];
  const q=v=>{v=v==null?"":String(v);return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const csv="﻿"+[cols.map(c=>c[0]).join(","),...rows.map(x=>cols.map(c=>q(c[1](x))).join(","))].join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="potensial-"+(prSector==="all"?"hamisi":prSector)+"-"+new Date().toISOString().slice(0,10)+".csv";document.body.appendChild(a);a.click();a.remove();}
function openProspectSearch(){
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:480px"><div class="mh"><h3>🔎 Yeni axtarış</h3><button data-x>×</button></div><div class="mb">
    <div class="field"><label>Sektor</label><select id="ps-s">${Object.entries(PR_SECTORS).map(([k,v])=>`<option value="${k}"${(prSector===k||(prSector==="all"&&k==="horeca"))?" selected":""}>${esc(v.n)}</option>`).join("")}</select></div>
    <div class="field"><label>Axtarış sözləri (vergüllə, ən çox 6)</label><input id="ps-q"></div>
    <div class="field"><label>Hər söz üçün məkan sayı</label><input id="ps-l" type="number" min="5" max="60" value="20"></div>
    <div class="field"><label>Ərazi</label><input id="ps-a" value="Baku, Azerbaijan"></div>
    <div class="hint" id="ps-e" style="white-space:normal"></div>
  </div><div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" data-ok>Axtarışa başla</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();scrim.querySelectorAll("[data-x]").forEach(b=>b.onclick=close);scrim.onclick=e=>{if(e.target===scrim)close();};
  const S=scrim.querySelector("#ps-s"),Q=scrim.querySelector("#ps-q"),L=scrim.querySelector("#ps-l"),E=scrim.querySelector("#ps-e");
  let used=null;
  const est=()=>{const n=Q.value.split(",").map(x=>x.trim()).filter(Boolean).slice(0,6).length;const pl=n*Math.min(60,Math.max(5,+L.value||20));
    E.innerHTML=`Təxminən <b>${pl}</b> məkan yoxlanacaq. Təxmini xərc: Google Maps + əlaqələr ≈ <b>${(pl*0.007).toFixed(2)}$</b>, Instagram analizi ≈ ${(pl*0.003).toFixed(2)}$. Hələ müştəri və ya lid olmayan, kifayət qədər rəyi olan məkanlar düşür; Instagram-ı tapılanlar avtomatik analiz olunur.${used!=null?`<br>Apify bu ay: <b>${used.toFixed(2)}$</b> (hədd 18$).`:""}`;};
  S.onchange=()=>{Q.value=PR_SECTORS[S.value].q;est();};Q.oninput=est;L.oninput=est;S.onchange();
  prospectCall({action:"usage"}).then(j=>{if(j&&j.ok&&j.used!=null){used=+j.used;est();}});
  scrim.querySelector("[data-ok]").onclick=async e=>{const btn=e.currentTarget;btn.disabled=true;btn.textContent="⏳";
    const j=await prospectCall({action:"start",sector:S.value,queries:Q.value.split(",").map(x=>x.trim()).filter(Boolean),limit:+L.value||20,area:scrim.querySelector("#ps-a").value});
    if(!j.ok){alert(j.error||"Alınmadı");btn.disabled=false;btn.textContent="Axtarışa başla";return;}
    close();prSector=S.value;toast("Axtarış başladı — 3–8 dəqiqəyə nəticələr burada görünəcək, bitəndə bildiriş gələcək.");await reload('prospect_runs');render();};
}
function renderProspects(q){
  const p=el("div","panel");
  const base=state.prospects.filter(x=>x.status==="new"&&(!q||fold([x.name,x.category,x.address,x.ig].join(" ")).includes(q)));
  const inSec=base.filter(x=>prSector==="all"||x.sector===prSector);
  const rows=inSec.filter(prFlagOk).sort((a,b)=>{const sa=a.score==null?999:a.score,sb2=b.score==null?999:b.score;return sa-sb2||(b.reviews||0)-(a.reviews||0);});
  const runs=state.prospect_runs.slice().sort((a,b)=>String(b.started_at).localeCompare(String(a.started_at)));
  const running=runs.filter(r=>!r.imported_at);const last=runs.find(r=>r.imported_at&&(r.kind||"maps")==="maps");
  const pendingIg=base.filter(x=>x.ig&&!x.ig_checked_at).length;const igRunning=running.some(r=>r.kind==="ig");
  const ph=el("div","ph");ph.style.flexWrap="wrap";ph.style.gap="8px";
  ph.innerHTML=`<h3>🔎 Potensial məkanlar</h3><span class="count">${rows.length} göstərilir${running.length?` · <span style="color:var(--warn)">⏳ ${running.some(r=>(r.kind||"maps")==="maps")?"axtarış":"Instagram analizi"} gedir…</span>`:last?` · son axtarış ${esc(fmtWhen(last.started_at))} (+${last.added||0})`:""}</span>
    <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">${running.length?`<button class="mini" data-pc>↻ Nəticəni yoxla</button>`:""}${pendingIg&&!igRunning?`<button class="mini" data-pe>📊 IG analizi (${pendingIg})</button>`:""}<button class="mini" data-csv title="Göstərilən siyahını Excel üçün endir">⬇ CSV</button><button class="mini" data-ps>Yeni axtarış</button></span>`;
  p.appendChild(ph);
  // sektor zolağı
  const cnt={};base.forEach(x=>{cnt[x.sector||"horeca"]=(cnt[x.sector||"horeca"]||0)+1;});
  const sbar=el("div");sbar.style.cssText="display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:0 16px 8px";
  const sg=el("div","seg");sg.style.cssText="margin-left:0;flex-wrap:wrap";
  sg.innerHTML=[["all","Hamısı",base.length]].concat(Object.keys(PR_SECTORS).filter(k=>cnt[k]||prSector===k).map(k=>[k,PR_SECTORS[k].n,cnt[k]||0])).map(([k,l,n])=>`<button type="button" data-sec="${k}" class="${prSector===k?"on":""}">${esc(l)} <span style="opacity:.6">${n}</span></button>`).join("");
  sg.querySelectorAll("[data-sec]").forEach(b=>b.onclick=()=>{prSector=b.dataset.sec;render();});
  sbar.appendChild(sg);p.appendChild(sbar);
  // bayraq zolağı
  const fc=k=>inSec.filter(x=>k==="pending"?(x.ig&&!x.ig_checked_at):k==="any"?(x.flags||[]).some(f=>f==="few_videos"||f==="stopped"||f==="weak"):(x.flags||[]).includes(k)).length;
  const fbar=el("div");fbar.style.cssText="display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:0 16px 10px";
  const fg=el("div","seg");fg.style.cssText="margin-left:0;flex-wrap:wrap";
  fg.innerHTML=[["all","Hamısı",inSec.length],["any","🎯 Hər hansı problem",fc("any")],["few_videos",PR_FLAGS.few_videos[0],fc("few_videos")],["stopped",PR_FLAGS.stopped[0],fc("stopped")],["weak",PR_FLAGS.weak[0],fc("weak")],["no_ig",PR_FLAGS.no_ig[0],fc("no_ig")],["pending","Analiz gözləyir",fc("pending")]].map(([k,l,n])=>`<button type="button" data-fl="${k}" class="${prFlag===k?"on":""}">${esc(l)} <span style="opacity:.6">${n}</span></button>`).join("");
  fg.querySelectorAll("[data-fl]").forEach(b=>b.onclick=()=>{prFlag=b.dataset.fl;render();});
  fbar.appendChild(fg);p.appendChild(fbar);
  p.appendChild(el("div","hint",`<div style="padding:0 16px 10px;white-space:normal">Sektor seç → «Yeni axtarış». Google Maps-dən məkanlar, telefonlar və Instagram tapılır, sonra Instagram avtomatik analiz olunur. 🎬 Az video: son 30 gündə 4-dən az video. ⏸ Paylaşımı dayandırıb: 50+ paylaşımı var, amma son paylaşım 30+ gün əvvəl. 📉 Zəif marketinq: audit balı 50-dən aşağı. Siyahı ən zəif baldan başlayır.</div>`));
  ph.querySelector("[data-ps]").onclick=openProspectSearch;
  ph.querySelector("[data-csv]").onclick=()=>{if(!rows.length){alert("Siyahı boşdur");return;}prCsv(rows);};
  const pc=ph.querySelector("[data-pc]");if(pc)pc.onclick=async()=>{pc.disabled=true;pc.textContent="⏳";const j=await prospectCall({action:"collect"});if(!j.ok)alert(j.error||"Alınmadı");await Promise.all([reload('prospect_runs'),reload('prospects')]);render();};
  const pe=ph.querySelector("[data-pe]");if(pe)pe.onclick=async()=>{if(!confirm(pendingIg+" məkanın Instagram-ı analiz olunsun? Təxmini xərc "+(pendingIg*0.003).toFixed(2)+"$."))return;pe.disabled=true;pe.textContent="⏳";const j=await prospectCall({action:"enrich"});if(!j.ok)alert(j.error||"Alınmadı");else toast("Instagram analizi başladı — bir neçə dəqiqəyə bayraqlar görünəcək.");await reload('prospect_runs');render();};
  if(!rows.length){p.appendChild(el("div","empty",running.length?"Axtarış gedir — bir neçə dəqiqəyə məkanlar burada görünəcək":"Bu filtrdə məkan yoxdur"));return p;}
  const pb=el("div","pb");
  rows.forEach(x=>{const row=el("div","row");row.style.flexWrap="wrap";const g=x.ig_stats||null;
    const phones=[x.phone,x.ig_phone&&fold(x.ig_phone)!==fold(x.phone||"")?x.ig_phone:""].filter(Boolean);
    const igLine=g?`<div class="m" style="margin-top:2px">👥 ${prK(g.followers)} · 30 gündə ${g.posts_30d} paylaşım / ${g.videos_30d} video · ${g.days_since_last==null?"paylaşım yoxdur":"son paylaşım "+g.days_since_last+" gün əvvəl"} · cəmi ${prK(g.posts_total)} paylaşım${x.score!=null?` · <b style="color:${x.score<50?"var(--crit, #f46a6a)":x.score<70?"var(--warn)":"var(--good, #34c38f)"}">bal ${x.score}</b>`:""}</div>`:(x.ig&&!x.ig_checked_at?`<div class="m" style="margin-top:2px;color:var(--muted)">Instagram analizi gözləyir</div>`:"");
    const chips=(x.flags||[]).filter(k=>PR_FLAGS[k]).map(k=>`<span class="chip c-${PR_FLAGS[k][1]}" style="font-size:10.5px">${esc(PR_FLAGS[k][0])}</span>`).join(" ");
    row.innerHTML=`<div class="main" style="min-width:220px"><div class="t">${esc(x.name)} <span class="chip c-${(x.rating||0)>=4.5?"good":(x.rating||0)>=4?"warn":"crit"}" style="font-size:10.5px">★ ${x.rating??"—"} · ${x.reviews||0} rəy</span> ${chips}</div>
      <div class="m">${esc((PR_SECTORS[x.sector]||{}).n||"")}${x.category?" · "+esc(x.category):""}${x.address?" · "+esc(x.address):""}</div>
      ${phones.length?`<div class="m">📞 ${phones.map(t=>`<a href="tel:${esc(String(t).replace(/[^\d+]/g,""))}" style="color:var(--accent-ink)">${esc(t)}</a>`).join(" · ")}</div>`:""}
      ${igLine}
      <div class="m" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:2px">${x.maps_url?`<a href="${esc(x.maps_url)}" target="_blank" rel="noopener" style="color:var(--accent-ink)">Xəritə ↗</a>`:""}${x.ig?`<a href="https://www.instagram.com/${esc(x.ig)}/" target="_blank" rel="noopener" style="color:var(--accent-ink)">@${esc(x.ig)}</a>`:""}${x.website?`<a href="${esc(x.website)}" target="_blank" rel="noopener" style="color:var(--accent-ink)">Sayt ↗</a>`:""}</div></div>
      <div class="r" style="display:flex;gap:6px;flex-wrap:wrap"><button class="mini" data-l>+ Lid</button>${x.ig?`<button class="mini" data-a>${ICON.search} Audit + lid</button>`:""}<button class="mini" data-h title="Siyahıdan gizlət" style="color:var(--muted)">Gizlət</button></div>`;
    row.querySelector("[data-l]").onclick=e=>prospectToLead(x,false,e.currentTarget);
    const ab=row.querySelector("[data-a]");if(ab)ab.onclick=e=>prospectToLead(x,true,e.currentTarget);
    row.querySelector("[data-h]").onclick=async()=>{await upd('prospects',x.id,{status:"ignored"});};
    pb.appendChild(row);});
  p.appendChild(pb);return p;
}
'''
s=s[:a]+NEW+s[b:]

old='''  const {data,error}=await sb.from('leads').insert({name:x.name,ig:x.ig||"",phone:x.phone||"",location:x.address||"",source:"maps",
    note:`Google Maps: ★ ${x.rating??"—"} (${x.reviews||0} rəy) · ${x.category||""}`,created_by_name:myName()}).select().single();'''
assert s.count(old)==1
s=s.replace(old,'''  const g=x.ig_stats||null;const fl=(x.flags||[]).filter(k=>PR_FLAGS[k]).map(k=>PR_FLAGS[k][0]).join(", ");
  const {data,error}=await sb.from('leads').insert({name:x.name,ig:x.ig||"",phone:x.phone||x.ig_phone||"",location:x.address||"",source:"maps",
    note:`Google Maps: ★ ${x.rating??"—"} (${x.reviews||0} rəy) · ${x.category||""}`+(x.ig_phone&&x.phone&&x.ig_phone!==x.phone?` · IG tel: ${x.ig_phone}`:"")+(g?`\\nInstagram: ${prK(g.followers)} izləyici, 30 gündə ${g.posts_30d} paylaşım / ${g.videos_30d} video, son paylaşım ${g.days_since_last??"—"} gün əvvəl, bal ${x.score??"—"}`:"")+(fl?`\\nBayraqlar: ${fl}`:""),created_by_name:myName()}).select().single();''')
open(dst,"w").write(s);print("ok",len(s))
