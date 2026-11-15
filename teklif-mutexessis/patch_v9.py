import sys,re
S=sys.argv[1]
ht=open(S+"/wt/ht.html",encoding="utf-8").read()
m=re.search(r'<section id="portfolio">\s*(<div class="wrap">.*?)</section>\s*<!-- 05',ht,flags=re.S)
inner=m.group(1)
assert 'data-pane="smm"' in inner and "base64" not in inner and "</script" not in inner
n=inner.count('<article class="ac');print("hesab",n,"reel",inner.count('class="pc'))
inner=inner.replace('<span class="idx">/04</span>','<span class="idx" data-idx></span>')
css=re.search(r'(\.prod\{.*?)(?=\.smm\{)',ht,flags=re.S).group(1)
s=open("teklif-new8.html",encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70])
    s=s.replace(a,b)
# yalnız th-wt altında: mövcud .pc qaydalarına toxunmamaq üçün .prod və .pc.ph əlavə olunur
extra="\n".join(l for l in css.splitlines())
keep=re.findall(r'^\.prod\{.*?$',extra,flags=re.M)[0]
ph=re.search(r'\.pc\.ph\{.*?\.pc\.ph \.big-play svg\{[^}]*\}',extra,flags=re.S).group(0)
rep("/* müştərilərimiz */","/* WeTrend portfolio */\n"+keep+"\n"+ph+"\n/* müştərilərimiz */")
rep('<section id="portfolio" hidden>','<template id="wt-pf">'+inner+'</template>\n<section id="portfolio" hidden>')
a=s.index('      const tb=pf.querySelector(".pf-tabs");if(tb)tb.remove();')
b=s.index('      const one=r=>`<div>${r.map(n=>')
s=s[:a]+'''      const tp=$("#wt-pf");pf.innerHTML=tp.innerHTML;pf.querySelector("[data-idx]").textContent=pfIdx;
      const rows=[["Etçi Umut Baku","PLACE","Lupin","Yaban61 Beer & Grill","YABAN Bulvar"],["Yaban Sea Breeze","La Reine Beauty Center","Go Prime Fitness & Crossfit","Sonifer","Emiland"]];
'''+s[b:]
rep('''  if(p.show_portfolio!==false){pf.hidden=false;pf.querySelector("[data-idx]").textContent=nx();}else pf.remove();
  if(M.theme==="wt"){''','''  let pfIdx="";
  if(p.show_portfolio!==false){pf.hidden=false;pfIdx=nx();pf.querySelector("[data-idx]").textContent=pfIdx;}else pf.remove();
  if(M.theme==="wt"){''')
open("teklif-new9.html","w",encoding="utf-8").write(s)
