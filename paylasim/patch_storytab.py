import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80])
    s=s.replace(a,b)
rep('APP_VERSION="2026.11.06d"','APP_VERSION="2026.11.06e"')
rep('''s.innerHTML=[["plan","📅 Plan"],["media","🗂 Materiallar"]]''','''s.innerHTML=[["plan","📅 Plan"],["story","◎ Story"],["media","🗂 Materiallar"]]''')
# platform nişanları
rep('''function smmRow(p,acts){''','''/* Paylaşımın platformaları: IG / TT nişanı, story üçün ◎ */
function smmPlatBadges(p){const pl=Array.isArray(p.platforms)&&p.platforms.length?p.platforms:["instagram"];
  return `<span class="smm-pl">${pl.includes("instagram")?`<b class="ig" title="Instagram${p.as_story?" Story":""}">${p.as_story?"◎ ":""}IG</b>`:""}${pl.includes("tiktok")&&!p.as_story?'<b class="tt" title="TikTok">TT</b>':""}</span>`;}
function smmRow(p,acts){''')
rep('''<div class="t">${p.kind==="video"?"🎬":"📷"} ${esc(p.client)} <span style="color:var(--muted);font-weight:500">· ${esc(smmKind(p.kind).replace(/^\\S+ /,""))}</span></div>''','''<div class="t">${p.kind==="video"?"🎬":"📷"} ${esc(p.client)} <span style="color:var(--muted);font-weight:500">· ${esc(smmKind(p.kind).replace(/^\\S+ /,""))}</span> ${smmPlatBadges(p)}</div>''')
rep('''<div class="evt"><span class="op">${esc(p.post_time||"")}</span> ${p.kind==="video"?"🎬":"📷"} ${esc(p.client)}</div></div>`;''','''<div class="evt"><span class="op">${esc(p.post_time||"")}</span> ${p.kind==="video"?"🎬":"📷"} ${esc(p.client)} ${smmPlatBadges(p)}</div></div>`;''')
# plan vs story süzgəci
rep('''  const all=smmPosts().filter(p=>(!smmVenue||p.client===smmVenue)&&(!smmAcc||p.account_id===smmAcc));''','''  const isStoryTab=smmTab==="story";
  const all=smmPosts().filter(p=>(!smmVenue||p.client===smmVenue)&&(!smmAcc||p.account_id===smmAcc)&&(!!p.as_story===isStoryTab));''')
rep('''tile("Planlanıb",inMonth.length,MONTHS_AZ[smmM]+" · paylaşım")''','''tile("Planlanıb",inMonth.length,MONTHS_AZ[smmM]+(isStoryTab?" · story":" · paylaşım"))''')
# story tabında yeni forma Story ilə açılsın
rep('''  let dest=e.as_story?"story":"feed";''','''  let dest=isEdit?(e.as_story?"story":"feed"):(smmTab==="story"?"story":"feed");''')
css='''
.smm-pl{display:inline-flex;gap:3px;vertical-align:1px;margin-left:2px}
.smm-pl b{font-size:9.5px;font-weight:800;line-height:1;padding:2px 4px;border-radius:4px;letter-spacing:.02em}
.smm-pl b.ig{background:color-mix(in srgb,#E1306C 16%,transparent);color:#C13584}
.smm-pl b.tt{background:color-mix(in srgb,var(--ink) 12%,transparent);color:var(--ink)}
'''
k=s.index('</style>');s=s[:k]+css+s[k:]
open(dst,"w",encoding="utf-8").write(s);print("ok")
