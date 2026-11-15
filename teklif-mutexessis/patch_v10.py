s=open("teklif-new9.html",encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70])
    s=s.replace(a,b)
rep("/* müştərilərimiz */","""/* ============ Mirror mövzusu (yalnız meta.theme="mr") ============ */
html.th-mr{--ink:#FFFFFF;--ink-2:#F3F3FA;--panel:#FFFFFF;--paper:#170C46;--muted:#5F5F7E;--lav:#2A2A70;--lav-lo:#5C60AB;--lav-hi:#5C60AB;--red:#5C60AB;--red-hi:#2A2A70;
  --wt-pink:#5C60AB;--wt-grad:linear-gradient(90deg,#5C60AB,#2A2A70 55%,#170C46);--line:rgba(23,12,70,.12);--line-2:rgba(23,12,70,.24)}
html.th-mr body{background:#fff;color:#170C46}
html.th-mr ::selection{background:#2A2A70;color:#fff}
html.th-mr .nav.stuck{background:rgba(255,255,255,.92)}
html.th-mr .nav-logo img{width:auto;height:50px}
html.th-mr .cta-btn,html.th-mr .pk.feat .pk-cta{background:#2A2A70;color:#fff;border-color:transparent}
html.th-mr .head{background:linear-gradient(135deg,#FFFFFF 0%,#F3F3FA 55%,#E4E4F4 100%);border-bottom:1px solid var(--line)}
html.th-mr .glowA,html.th-mr .glowB{display:none}
html.th-mr .head .eyebrow{color:#5C60AB}
html.th-mr .head .eyebrow::before{background:#5C60AB}
html.th-mr .head .dek{color:#3A3A5C}
html.th-mr .head .meta{border-top-color:var(--line-2);color:var(--muted)}
html.th-mr .head .meta b{color:#170C46}
html.th-mr .lockup img.mez{width:auto;height:clamp(120px,14vw,170px)}
html.th-mr .lockup .x{color:var(--muted)}
html.th-mr .lockup .venues{background:#170C46;border-radius:14px;padding:clamp(10px,1.4vw,16px) clamp(14px,2vw,24px)}
html.th-mr .lockup .venues b{color:#fff}
html.th-mr h1 .accent,html.th-mr .big .red{background:var(--wt-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
html.th-mr .sec-label h2::before{color:#5C60AB}
html.th-mr .promise,html.th-mr .price-wrap{background:#F3F3FA}
html.th-mr .reels{background:#170C46;--paper:#fff;--muted:#B9B9D6;--line:rgba(255,255,255,.16);--line-2:rgba(255,255,255,.3);--panel:#22155C;--ink-2:#22155C;color:#fff;border-block-color:transparent}
html.th-mr .reels .lead-p,html.th-mr .reels .rule p{color:#D8D8EA}
html.th-mr .reels .lead-p b,html.th-mr .reels .rule strong,html.th-mr .reels .big{color:#fff}
html.th-mr .reels .red{color:#A9ADEA}
html.th-mr .reels .rule{background:#22155C;border-color:rgba(255,255,255,.16)}
html.th-mr .reels .rule b{color:#A9ADEA}
html.th-mr .reels .vs-col{background:#22155C;border-color:rgba(255,255,255,.16)}
html.th-mr .reels .vs-col span,html.th-mr .reels .vs-col i{color:#B9B9D6}
html.th-mr .reels .vs-col.bad b{color:#8E8EB6}
html.th-mr .reels .vs-col.good b{color:#fff}
html.th-mr .reels .vs-col.good .vs-bar s{background:#A9ADEA}
html.th-mr .item p,html.th-mr .lead-p,html.th-mr .dk-m ul,html.th-mr .dk-post p{color:#3A3A5C}
html.th-mr .item p b,html.th-mr .lead-p b{color:#170C46}
html.th-mr .note{color:#170C46;background:#EDEDF8;border-left-color:#2A2A70}
html.th-mr .stat,html.th-mr .pr,html.th-mr .tr,html.th-mr .ph,html.th-mr .k,html.th-mr .dk-post{background:#fff;border-color:var(--line);box-shadow:0 8px 24px rgba(23,12,70,.05)}
html.th-mr .stat b,html.th-mr .k b,html.th-mr .ph h3,html.th-mr .tr h3,html.th-mr .pr h3{color:#170C46}
html.th-mr .stat.hot{background:#170C46;border-color:#170C46}
html.th-mr .stat.hot b{color:#fff;background:none;-webkit-text-fill-color:#fff}
html.th-mr .stat.hot span{color:#C9C9E2}
html.th-mr .pr p,html.th-mr .tr p,html.th-mr .ph li{color:#4A4A6A}
html.th-mr .tr-us{background:#EDEDF8;color:#170C46;border-color:transparent}
html.th-mr .tr-us b{color:#2A2A70}
html.th-mr .tbl-wrap{background:#fff}
html.th-mr .tbl td{color:#3A3A5C}
html.th-mr .tbl td b{color:#170C46}
html.th-mr .tbl td.up{color:#2A2A70;font-weight:600}
html.th-mr .tbl tr.me td{background:#EDEDF8}
html.th-mr .tbl tr.me td:first-child{box-shadow:inset 3px 0 0 #2A2A70}
html.th-mr .mix-bar span{color:#fff}
html.th-mr .pk.feat{background:#fff;border-color:rgba(42,42,112,.35);box-shadow:0 16px 44px rgba(23,12,70,.09)}
html.th-mr .pk.feat .pk-tag{background:#2A2A70;color:#fff;border-color:transparent}
html.th-mr .pk-price .v{background:var(--wt-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
html.th-mr .pk-list span{color:#3A3A5C}
html.th-mr .end{background:#170C46;--paper:#fff;--muted:#B9B9D6;--line:rgba(255,255,255,.16);color:#fff}
html.th-mr .end .cta-btn{background:#fff;color:#170C46}
html.th-mr footer{color:var(--muted)}
/* müştərilərimiz */""")
rep('''const WT=M.theme==="wt";const R=WT?M.ref||null:null;if(WT)document.documentElement.classList.add("th-wt");''','''const MR=M.theme==="mr";const WT=M.theme==="wt"||MR;const R=WT?M.ref||null:null;if(M.theme==="wt")document.documentElement.classList.add("th-wt");if(MR)document.documentElement.classList.add("th-mr");''')
rep('''<span>Hazırlayan · <b>${WT?"WeTrend":"MezMoon"}</b></span>''','''<span>Hazırlayan · <b>${MR?"Mirror":WT?"WeTrend":"MezMoon"}</b></span>''')
rep('''  if(WT)wtBrand(name);''','''  if(MR)mrBrand(name,M.brand||{});else if(WT)wtBrand(name);''')
rep('''function refSections(R,D,nx){''','''/* Mirror məlumatları: yalnız meta.theme="mr". Əlaqə məlumatı meta.brand-dan gəlir, uydurulmur */
function mrBrand(name,B){
  if(B.mail)WA="mailto:"+B.mail+"?subject="+encodeURIComponent(name+" — təklif");
  document.title="Marketing Plan for "+name+" | Mirror";
  const de=document.querySelector('meta[name="description"]');if(de)de.content="Mirror-dan "+name+" üçün hazırlanmış marketinq strategiyası.";
  const ic=document.querySelector('link[rel="icon"]');if(ic){ic.type="image/png";ic.href="mirror-mark.png";}
  const na=$(".nav-logo");if(na)na.setAttribute("aria-label","Mirror");
  const nl=$(".nav-logo img");if(nl){nl.src="mirror-mark.png";nl.alt="Mirror";}
  const hl=$(".lockup img.mez");if(hl){hl.src="mirror-logo.png";hl.alt="Mirror Outdoor Advertising";}
  const end=$("#elaqe");
  if(end){const c=end.querySelector(".cta-btn");if(c){if(B.mail){c.href=WA;c.removeAttribute("target");c.textContent="Bizə yazın";}else c.remove();}
    const k=end.querySelector(".contacts");if(k)k.innerHTML=(B.mail?`<a href="mailto:${esc(B.mail)}"><span>E-poçt</span>${esc(B.mail)}</a>`:"")+(B.phone?`<a href="tel:${esc(B.phone)}"><span>Telefon</span>${esc(B.phone)}</a>`:"")+(B.ig?`<a href="https://www.instagram.com/${esc(B.ig)}/" target="_blank" rel="noopener"><span>Instagram</span>@${esc(B.ig)}</a>`:"");}
  const ft=$("#ftn");if(ft){const f=ft.parentNode;f.firstElementChild.textContent="© 2026 MIRROR";f.lastElementChild.textContent="OUTDOOR ADVERTISING";}
}
function refSections(R,D,nx){''')
rep('''  if(p.show_portfolio!==false){pf.hidden=false;pfIdx=nx();''','''  if(p.show_portfolio!==false&&!MR){pf.hidden=false;pfIdx=nx();''')
open("teklif-new10.html","w",encoding="utf-8").write(s)
