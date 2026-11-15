s=open("teklif-new5.html",encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70])
    s=s.replace(a,b)
rep("/* ============ təqdimat ============ */","""html.th-wt .nav-logo img{width:118px}
html.th-wt .lockup img.mez{width:clamp(170px,20vw,250px)}
/* müştərilərimiz */
.mc-rows{display:flex;flex-direction:column;gap:clamp(10px,1.4vw,18px);margin-top:clamp(24px,3vw,38px)}
.mc-row{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
.mc-track{display:flex;width:max-content;animation:mcslide 46s linear infinite}
.mc-row:nth-child(2) .mc-track{animation-duration:56s;animation-direction:reverse}
.mc-track div{display:flex;gap:clamp(16px,2vw,26px);padding-right:clamp(16px,2vw,26px)}
.mc-track b{font-family:var(--display);font-weight:400;font-size:clamp(14px,1.35vw,19px);letter-spacing:-.01em;white-space:nowrap;color:var(--paper);border:1px solid var(--line-2);border-radius:999px;padding:11px 22px}
.mc-row:hover .mc-track{animation-play-state:paused}
@keyframes mcslide{to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.mc-track{animation:none}}
/* panel PDF rejimi: dizayn olduğu kimi çap olunur */
@media print{
  html.pdf,html.pdf *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html.pdf,html.pdf body{background:var(--ink);color:var(--paper)}
  html.pdf .rv{opacity:1!important;transform:none!important}
  html.pdf .glowA,html.pdf .glowB{display:block}
  html.pdf section{break-inside:auto;padding-block:34px}
  html.pdf .end{display:block!important}
  html.pdf .stat,html.pdf .pk,html.pdf .item,html.pdf .dk-post,html.pdf .dk-t,html.pdf .dk-m,html.pdf .vc,html.pdf .au-list>div{break-inside:avoid}
  html.pdf .big,html.pdf .sec-label{break-after:avoid}
  html.pdf .mc-row{-webkit-mask-image:none;mask-image:none;overflow:visible}
  html.pdf .mc-track{animation:none;width:auto}
  html.pdf .mc-track div{flex-wrap:wrap;padding:0}
  html.pdf .mc-track div+div{display:none}
  html.pdf .pk-cta{display:none}
}

/* ============ təqdimat ============ */""")
rep('''if(!/^[a-z0-9-]{4,80}$/.test(slug)){''','''const PDF=new URLSearchParams(location.search).get("pdf")==="1";
const PANEL_ORIGIN="https://panel.mezmoonagency.az";
if(!/^[a-z0-9-]{4,80}$/.test(slug)){''')
rep('''fetch(SB_URL+"/rest/v1/rpc/get_proposal",''','''if(PDF){
  // Panel datanı özü ötürür: get_proposal çağırılmır, baxış sayılmır, izləmə işləmir
  if(!window.opener)msg("PDF","Bu rejim paneldən açılır.");
  else{addEventListener("message",e=>{if(e.origin!==PANEL_ORIGIN||!e.data||e.data.type!=="mz-proposal"||!e.data.proposal)return;const q=e.data.proposal;if(q.include_audit===false)q.audit=null;draw(q);pdfFinish(q);});
    window.opener.postMessage({type:"mz-ready"},PANEL_ORIGIN);}
}else fetch(SB_URL+"/rest/v1/rpc/get_proposal",''')
rep('''function draw(p){''','''async function pdfFinish(p){
  document.documentElement.classList.add("pdf");
  document.title=(p.client_name||"Teklif")+" - Teklif";
  document.querySelectorAll(".rv").forEach(x=>x.classList.add("in"));
  const st=document.createElement("style");st.textContent="@page{size:A4;margin:0}";document.head.appendChild(st);
  document.querySelectorAll("video").forEach(v=>{const i=document.createElement("img");i.src=v.getAttribute("poster")||"";i.alt="";i.style.cssText="display:block;width:100%;aspect-ratio:"+(v.closest(".vh")?"16/9":"9/16")+";object-fit:cover";v.replaceWith(i);});
  const imgs=[...document.images];imgs.forEach(i=>{i.loading="eager";});
  await Promise.race([Promise.all(imgs.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r;}))),new Promise(r=>setTimeout(r,12000))]);
  try{await document.fonts.ready;}catch(e){}
  setTimeout(()=>print(),300);
}
function draw(p){''')
rep('''  // portfolio (statik blok)
  const pf=$("#portfolio");
  if(p.show_portfolio!==false){pf.hidden=false;pf.querySelector("[data-idx]").textContent=nx();}else pf.remove();''','''  // portfolio (statik blok)
  const pf=$("#portfolio");
  if(p.show_portfolio!==false){pf.hidden=false;pf.querySelector("[data-idx]").textContent=nx();}else pf.remove();
  if(M.theme==="wt"){
    const nl=$(".nav-logo img");if(nl){nl.src="wetrend-logo.png";nl.alt="WeTrend";}
    const hl=$(".lockup img.mez");if(hl){hl.src="wetrend-logo.png";hl.alt="WeTrend";}
    if(p.show_portfolio!==false){
      const tb=pf.querySelector(".pf-tabs");if(tb)tb.remove();
      const sm=pf.querySelector('[data-pane="smm"]');if(sm)sm.remove();
      const rows=[["Sherlock Sushi","Khan Baku Museum","Liman by Hollywood","Badam Lounge","Ruin","Mezze Taverna","Sea Breeze Arena","Park Wine"],["Burger Baku","The Gallery","Irish Pub","Evolution Lounge","Şəfa FK","Qarabağ Restoran","Sherlock Sahne"]];
      const one=r=>`<div>${r.map(n=>`<b>${esc(n)}</b>`).join("")}</div>`;
      pf.insertAdjacentHTML("afterend",`<section id="musterilerimiz"><div class="wrap"><div class="sec-label rv"><h2>Müştərilərimiz</h2><span class="idx">${nx()}</span></div></div>
        <div class="mc-rows rv">${rows.map(r=>`<div class="mc-row"><div class="mc-track">${one(r)}${one(r).replace("<div>",'<div aria-hidden="true">')}</div></div>`).join("")}</div></section>`);
    }
  }''')
rep('''  init();track();''','''  init();if(!PDF)track();''')
open("teklif-new6.html","w",encoding="utf-8").write(s)
p=open("../index-2026.11.02f.html",encoding="utf-8").read()
def rp(a,b):
    global p
    assert p.count(a)==1,(p.count(a),a[:70])
    p=p.replace(a,b)
rp('const APP_VERSION="2026.11.02f";','const APP_VERSION="2026.11.02g";')
rp('''<button class="mini" data-e>${ICON.edit}</button><button class="mini" data-d style="color:var(--crit)">${ICON.trash}</button></div>`;
    row.querySelector("[data-k]").onclick=()=>showPropLink(x);''','''<button class="mini" data-pdf title="Baxış sayını artırmadan PDF kimi saxla">📄 PDF</button><button class="mini" data-e>${ICON.edit}</button><button class="mini" data-d style="color:var(--crit)">${ICON.trash}</button></div>`;
    row.querySelector("[data-pdf]").onclick=()=>propPdf(x);
    row.querySelector("[data-k]").onclick=()=>showPropLink(x);''')
rp('''function showPropLink(p){''','''function propPdf(x){
  const o="https://mezmoonagency.az";
  const w=window.open(o+"/teklif.html?pdf=1&p="+encodeURIComponent(x.slug),"_blank");
  if(!w){alert("Pəncərə bloklandı. Brauzerdə bu sayt üçün pop-up icazəsi verin.");return;}
  const on=e=>{if(e.source!==w||e.origin!==o||!e.data||e.data.type!=="mz-ready")return;removeEventListener("message",on);w.postMessage({type:"mz-proposal",proposal:x},o);};
  addEventListener("message",on);
}
function showPropLink(p){''')
open("../index-2026.11.02g.html","w",encoding="utf-8").write(p)
