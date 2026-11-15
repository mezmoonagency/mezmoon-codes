import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80])
    s=s.replace(a,b)
rep('APP_VERSION="2026.11.06f"','APP_VERSION="2026.11.06g"')
rep('''  ["address","Ünvan","text",""],''','''  ["address","Ünvan (açıqlamanın sonunda 📍)","text","məs. Nizami küç 62, Bakı, Azərbaycan"],
  ["phone","Telefon (açıqlamanın sonunda 📞)","text","məs. +994 (50) 404 04 07"],
  ["cap_langs","Açıqlama dilləri","select",["","Yalnız Azərbaycanca","Azərbaycanca + Rusca","Azərbaycanca + İngiliscə","Azərbaycanca + Rusca + İngiliscə"]],
  ["cap_example","Nümunə açıqlama","area","Bu məkanın tipik paylaşım mətnini yapışdır: AI eyni quruluşda yazacaq"],''')
rep('''<div class="hint" id="s-aih" style="white-space:normal;margin-bottom:6px">Materialı seç və ya mövzunu yaz: AI materiala baxıb hər platforma üçün ayrıca mətn hazırlayır. Sonra istədiyin kimi düzəlt.</div>''','''<div class="hint" id="s-aih" style="white-space:normal;margin-bottom:6px">Materialı seç və ya mövzunu yaz: AI materiala baxıb hər platforma üçün ayrıca mətn hazırlayır. Dillər, ünvan və telefon məkanın brend kitabçasından götürülür.</div>''')
rep('''h.textContent=(j.seen?"AI materialda gördü: "+j.seen+". ":j.image===false?"Material oxunmadı, mətn yalnız mövzuya görə yazıldı. ":"")+"Yoxla və lazım olsa düzəlt."''','''h.textContent=(j.seen?"AI materialda gördü: "+j.seen+". ":j.image===false?"Material oxunmadı, mətn yalnız mövzuya görə yazıldı. ":"")+(j.footer===false?"Brend kitabçasında ünvan və telefon yoxdur. ":"")+"Yoxla və lazım olsa düzəlt."''')
open(dst,"w",encoding="utf-8").write(s);print("ok")
