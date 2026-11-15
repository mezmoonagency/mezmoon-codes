import os
def sub(path,dst,pairs):
    s=open(path,encoding="utf-8").read()
    for a,b in pairs:
        assert s.count(a)==1,(s.count(a),a[:70])
        s=s.replace(a,b)
    open(dst,"w",encoding="utf-8").write(s)
sub("lead-research/index.ts","lead-research/index.ts",[
("Sən MezMoon reklam agentliyinin bazar analitikisən.","Sən MezMoon reklam agentliyinin marketinq analitikisən."),
("Veb axtarışla bu ardıcıllıqla araşdır: 1) məkanın/brendin özü, 2) həmin sahənin qlobal bazarı və trendləri, 3) Bakı/Azərbaycan bazarı və konkret rəqiblər. Sonra bu biznesə həqiqətən nəyin lazım olduğunu de.",
 "Məqsəd ümumi bazar icmalı yox, marketinq qərarlarıdır. Veb axtarışla bu ardıcıllıqla araşdır: 1) brendin özü və onun marketinqi, 2) bu sahədə dünyada işləyən marketinq trendləri və kampaniya nümunələri, 3) Bakı/Azərbaycan auditoriyası və kanalları, 4) konkret rəqiblərin kontenti, reklamı və təklifləri. Sonra bu biznesin marketinqinə nəyin lazım olduğunu de."),
('"global":["qlobal bazar və trendlər, 2-4 bənd"],"local":["Bakı bazarı, 2-4 bənd"],"competitors":["rəqib: nə ilə fərqlənir, 2-6 bənd"],"brand":["bu biznesin vəziyyəti, 2-4 bənd"],',
 '"global":["dünyada işləyən marketinq trendi və ya kampaniya nümunəsi, 2-4 bənd"],"local":["Bakıda kanallar və marketinq imkanları, 2-4 bənd"],"audience":["kimə satılır və onları nə cəlb edir, 2-4 bənd"],"competitors":["rəqib: kontenti, reklamı və təklifi, 2-6 bənd"],"brand":["bu biznesin marketinq vəziyyəti, 2-4 bənd"],"campaigns":["konkret kampaniya ideyası: nə, harada, necə ölçülür, 2-4 bənd"],'),
("global: strList(p.global, 5), local: strList(p.local, 5), competitors:","global: strList(p.global, 5), local: strList(p.local, 5), audience: strList(p.audience, 5), campaigns: strList(p.campaigns, 5), competitors:"),
("global: [], local: [], competitors: [],","global: [], local: [], audience: [], campaigns: [], competitors: [],"),
])
sub("index-2026.11.02d.html","index-2026.11.02e.html",[
('const APP_VERSION="2026.11.02d";','const APP_VERSION="2026.11.02e";'),
('''${sec("🌍 Qlobal bazar",r.global)}${sec("📍 Bakı bazarı",r.local)}${sec("⚔️ Rəqiblər",r.competitors)}${sec("🔎 Bu biznesin vəziyyəti",r.brand)}''',
 '''${sec("🌍 Dünyada işləyən marketinq",r.global)}${sec("📍 Bakıda kanallar və imkanlar",r.local)}${sec("👥 Auditoriya",r.audience)}${sec("⚔️ Rəqiblərin marketinqi",r.competitors)}${sec("🔎 Marketinq vəziyyəti",r.brand)}${sec("💡 Kampaniya ideyaları",r.campaigns)}'''),
("Hələ araşdırma yoxdur. Məkan, qlobal bazar, Bakı və rəqiblər veb axtarışla yoxlanılacaq.","Hələ araşdırma yoxdur. Brendin marketinqi, dünyada işləyən trendlər, Bakı auditoriyası və rəqiblərin marketinqi veb axtarışla yoxlanılacaq."),
("🌍 Bazar araşdırması · ${esc(l.name)}","🌍 Marketinq araşdırması · ${esc(l.name)}"),
('title="Bazar araşdırması" style="white-space:nowrap">🌍 Bazar</button>','title="Marketinq araşdırması" style="white-space:nowrap">🌍 Marketinq</button>'),
('<button class="mini" data-r>🌍 Bazar araşdırması</button>','<button class="mini" data-r>🌍 Marketinq araşdırması</button>'),
])
