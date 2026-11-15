import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80])
    s=s.replace(a,b)
rep('APP_VERSION="2026.11.06e"','APP_VERSION="2026.11.06f"')
old_start=s.index('  // Mənim məkanlarım (Instagram linki və saatlar)')
old_end=s.index('  // Bu gün və gecikənlər',old_start)
new='''  // Hesablar: hər məkanın Instagram və TikTok qoşulması, yığcam cədvəl (açılıb-bağlanır)
  {const can=smmMediaCanAdd();let ig=0,tt=0;
    const rows=venues.map(v=>{const {client,acc}=smmIgOf(v.client);if(acc&&acc.publish_ok)ig++;const tth=String(v.tt_link||"").trim().replace(/^https?:\\/\\/(www\\.)?tiktok\\.com\\/@?/i,"").replace(/[/?#].*$/,"").replace(/^@/,"");if(tth)tt++;
      const igh=acc&&acc.username?"@"+acc.username:(v.ig_link?igHandle(v.ig_link):"");
      const igCell=acc&&acc.publish_ok?`<span class="sa-ok" title="Avtomatik paylaşım hazırdır">●</span><a href="${esc(smmIgUrl(acc.username))}" target="_blank" rel="noopener">${esc(igh)}</a>`
        :`<span class="${acc?"sa-warn":"sa-off"}" title="${acc?"Qoşulub, paylaşım icazəsi yoxdur":"Qoşulmayıb"}">●</span>${igh?`<span class="sa-h">${esc(igh)}</span>`:`<span class="sa-h sa-mute">—</span>`}${client&&can?`<button class="mini sa-btn" data-igp="${esc(client.id)}" title="Avtomatik paylaşım üçün qoş">Qoş</button>`:""}`;
      const ttCell=tth?`<span class="sa-off" title="TikTok API hələ qoşulmayıb">●</span><a href="https://www.tiktok.com/@${esc(tth)}" target="_blank" rel="noopener">@${esc(tth)}</a>`:`<span class="sa-h sa-mute">—</span>`;
      return `<div class="sa-row"><div class="sa-v"><b>${esc(v.client)}</b>${smmSeeAll()?`<span>${esc(v.account_id?personName(v.account_id):"təyin olunmayıb")}</span>`:""}</div><div class="sa-t">📷 ${esc(v.photo_time||"12:00")} · 🎬 ${esc(v.video_time||"20:00")}</div><div class="sa-c">${igCell}</div><div class="sa-c">${ttCell}</div></div>`;}).join("");
    const open=(()=>{try{const x=localStorage.getItem("mm_smm_acc");return x?x==="1":venues.length<=4;}catch(e){return venues.length<=4;}})();
    const vp=el("div","panel sa-panel");vp.style.marginBottom="16px";
    vp.innerHTML=`<button type="button" class="sa-head" aria-expanded="${open}"><svg class="sa-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg><h3>${smmSeeAll()?"Məkanlar və hesablar":"Mənim məkanlarım"}</h3><span class="count">${venues.length}</span>
      <span class="sa-sum"><span><i class="sa-ok">●</i> Instagram avto ${ig}/${venues.length}</span><span><i class="sa-off">●</i> TikTok ${tt}/${venues.length}</span></span></button>
      <div class="sa-body"${open?"":" hidden"}><div class="sa-row sa-hd"><div>Məkan</div><div>Saatlar</div><div>Instagram</div><div>TikTok</div></div>${rows}
      <div class="hint sa-note">● yaşıl: avtomatik paylaşım hazırdır · ● sarı: qoşulub, paylaşım icazəsi yoxdur · ● boz: qoşulmayıb. TikTok avtomatik paylaşımı API qoşulanda aktiv olacaq; hesab adını «Məkanları bölüşdür» bölməsində yazın.</div></div>`;
    const hb=vp.querySelector(".sa-head"),body=vp.querySelector(".sa-body");
    hb.onclick=()=>{const o=body.hidden;body.hidden=!o;hb.setAttribute("aria-expanded",String(o));try{localStorage.setItem("mm_smm_acc",o?"1":"0");}catch(e){}};
    wrap.appendChild(vp);}

'''
s=s[:old_start]+new+s[old_end:]
css='''
/* SMM: məkanlar və hesablar paneli */
.sa-panel{padding:0;overflow:hidden}
.sa-head{display:flex;align-items:center;gap:8px;width:100%;padding:12px 16px;background:none;border:0;text-align:left;cursor:pointer;color:var(--ink)}
.sa-head h3{margin:0;font-size:14px}
.sa-chev{transition:transform .15s;color:var(--muted)}
.sa-head[aria-expanded="true"] .sa-chev{transform:rotate(90deg)}
.sa-sum{margin-left:auto;display:flex;gap:12px;font-size:12px;color:var(--muted);flex-wrap:wrap;justify-content:flex-end}
.sa-sum i{font-style:normal}
.sa-body{border-top:1px solid var(--border);padding:4px 0 8px}
.sa-row{display:grid;grid-template-columns:minmax(140px,1.3fr) 130px minmax(150px,1.2fr) minmax(130px,1fr);gap:10px;align-items:center;padding:6px 16px;font-size:12.5px;border-bottom:1px solid var(--border)}
.sa-row:last-of-type{border-bottom:0}
.sa-hd{font-size:11px;font-weight:700;color:var(--muted);padding-top:8px;padding-bottom:6px}
.sa-v{min-width:0;display:flex;flex-direction:column}
.sa-v b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sa-v span{font-size:11px;color:var(--muted)}
.sa-t{color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.sa-c{display:flex;align-items:center;gap:6px;min-width:0}
.sa-c a,.sa-h{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--accent-ink);font-weight:600;text-decoration:none}
.sa-h{color:var(--ink-soft);font-weight:500}
.sa-mute{color:var(--muted)}
.sa-ok{color:var(--good)}.sa-warn{color:var(--warn)}.sa-off{color:var(--muted);opacity:.6}
.sa-btn{margin-left:auto;padding:3px 9px;font-size:11.5px}
.sa-note{padding:8px 16px 0;white-space:normal}
@media (max-width:700px){.sa-row{grid-template-columns:1fr 1fr;gap:4px 10px}.sa-hd{display:none}.sa-t{grid-column:2;text-align:right}.sa-sum{display:none}}
'''
k=s.index('</style>');s=s[:k]+css+s[k:]
open(dst,"w",encoding="utf-8").write(s);print("ok")
