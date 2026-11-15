# -*- coding: utf-8 -*-
s=open("teklif-new12.html",encoding="utf-8").read()
a="  html.pdf footer{break-before:avoid;padding-block:12px}\n"
assert s.count(a)==1
s=s.replace(a,a+"""  html.pdf .fine,html.pdf .dk-note{break-before:avoid}
  html.pdf #paket .big{margin-block:4px 0}
  html.pdf #paket .sec-label{margin-bottom:6px}
  html.pdf .pk-grid{margin-top:10px}
  html.pdf .pk{padding:18px 22px}
  html.pdf .pk-hi{padding-block:8px;margin-block:8px}
  html.pdf .pk-price{margin-block:6px}
  html.pdf .valid{margin-top:8px}
""")
open("teklif-new12.html","w",encoding="utf-8").write(s)
