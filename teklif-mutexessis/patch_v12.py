s=open("teklif-new11.html",encoding="utf-8").read()
a="  html.pdf .pk-cta{display:none}\n"
assert s.count(a)==1
s=s.replace(a,a+"""  /* Mirror: açıq mövzuda dekorativ ləkələr və keçidli mətn PDF-də ləkə verir */
  html.pdf.th-mr .glowA,html.pdf.th-mr .glowB{display:none!important}
  html.pdf.th-mr .head{background:#fff!important}
  html.pdf.th-mr h1 .accent,html.pdf.th-mr .big .red,html.pdf.th-mr .pk-price .v{background:none!important;-webkit-text-fill-color:#2A2A70!important;color:#2A2A70!important}
  html.pdf.th-mr .reels .big .red{-webkit-text-fill-color:#A9ADEA!important;color:#A9ADEA!important}
  /* Səhifə kəsimi: kartlar bölünmür, paket və xidmətlər yeni səhifədən başlayır */
  html.pdf .rule,html.pdf .pr,html.pdf .tr,html.pdf .ph,html.pdf .k,html.pdf .vs-col,html.pdf .mix,html.pdf .note,html.pdf .tbl tr,html.pdf .svc-grid .grp,html.pdf .dk-posts{break-inside:avoid}
  html.pdf .grp-head,html.pdf .fine{break-after:avoid}
  html.pdf #xidmetler,html.pdf #paket{break-before:page}
  html.pdf #paket{padding-block:22px}
  html.pdf .pk-list li{padding-block:2px;margin:0;line-height:1.35;font-size:13px}
  html.pdf .pk-top{margin-bottom:6px}
  html.pdf footer{break-before:avoid;padding-block:12px}
""")
open("teklif-new12.html","w",encoding="utf-8").write(s)
