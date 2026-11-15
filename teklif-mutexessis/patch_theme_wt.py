s=open("teklif-new4.html",encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70])
    s=s.replace(a,b)
rep("/* ============ təqdimat ============ */","""/* ============ bənövşəyi mövzu (yalnız meta.theme="wt" olan təkliflər) ============ */
html.th-wt{--ink:#130A38;--ink-2:#1A0E4A;--panel:#22125C;--paper:#F5F2FF;--muted:#A9A2D8;--lav:#2CE6F0;--lav-lo:#7B4BF0;--lav-hi:#FF9CF5;--red:#F06BDF;--red-hi:#FF9CF5;
  --wt-pink:#FF9CF5;--wt-grad:linear-gradient(90deg,#2CE6F0,#9FB8F6 50%,#FF9CF5);--line:rgba(245,242,255,.12);--line-2:rgba(245,242,255,.24)}
html.th-wt body{background:var(--ink)}
html.th-wt .nav.stuck{background:rgba(19,10,56,.82)}
html.th-wt .cta-btn,html.th-wt .pk.feat .pk-cta{background:var(--wt-grad);color:#130A38;border-color:transparent}
html.th-wt .head{background:linear-gradient(135deg,#5626D6 0%,#6A3BE4 45%,#8352F3 100%)}
html.th-wt .glowA,html.th-wt .glowB{position:absolute;border-radius:50%;pointer-events:none;aspect-ratio:1;filter:blur(.5px)}
html.th-wt .glowA{width:min(420px,60vw);top:-120px;right:-100px;background:radial-gradient(circle at 35% 35%,rgba(255,255,255,.75),rgba(255,156,245,.65) 22%,rgba(44,230,240,.55) 48%,rgba(123,75,240,0) 70%)}
html.th-wt .glowB{width:min(260px,44vw);top:auto;bottom:-90px;left:-80px;background:radial-gradient(circle at 60% 40%,rgba(255,255,255,.7),rgba(44,230,240,.6) 25%,rgba(255,156,245,.5) 50%,transparent 70%)}
html.th-wt .head .eyebrow{color:#fff}
html.th-wt .head .eyebrow::before{background:#fff}
html.th-wt .head .dek{color:rgba(255,255,255,.88)}
html.th-wt .head .meta{border-top-color:rgba(255,255,255,.25);color:rgba(255,255,255,.7)}
html.th-wt .head .meta b{color:#fff}
html.th-wt .lockup .x{color:rgba(255,255,255,.7)}
html.th-wt h1 .accent{background:var(--wt-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
html.th-wt .sec-label h2::before{background:var(--wt-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
html.th-wt .promise,html.th-wt .price-wrap{background:var(--ink-2)}
html.th-wt .amount .v,html.th-wt .pk-price .v,html.th-wt .stat.hot b,html.th-wt .k b,html.th-wt .pf-stats b{background:var(--wt-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
html.th-wt .pk.feat{border-color:rgba(255,156,245,.45);background:linear-gradient(160deg,rgba(44,230,240,.10),rgba(255,156,245,.10) 55%,transparent 85%)}
html.th-wt .pk.feat .pk-tag{background:var(--wt-grad);color:#130A38;border-color:transparent}
html.th-wt .pf-tab[aria-selected="true"]{background:var(--wt-grad);color:#130A38}
html.th-wt .xp-big{background:var(--wt-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
html.th-wt .dk-m{border-top-color:#FF9CF5}

/* ============ təqdimat ============ */""")
rep('''const M=p.meta||{};const D=M.deck||null;''','''const M=p.meta||{};const D=M.deck||null;if(M.theme==="wt")document.documentElement.classList.add("th-wt");''')
open("teklif-new5.html","w",encoding="utf-8").write(s)
