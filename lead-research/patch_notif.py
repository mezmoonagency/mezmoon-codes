# -*- coding: utf-8 -*-
import re,sys
s=open("index-2026.11.03a.html",encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70])
    s=s.replace(a,b)
rep('const APP_VERSION="2026.11.03a";','const APP_VERSION="2026.11.03b";')
rep('function myNotifs(){return state.notifications.filter(notifForMe).slice()','function notifHidden(n){return !!me&&Array.isArray(n.hidden_by)&&n.hidden_by.includes(me.id);}\nfunction myNotifs(){return state.notifications.filter(n=>notifForMe(n)&&!notifHidden(n)).slice()')
rep('function openNotifs(){','''/* Bildirişi silmək: yalnız mənə aid olan sətir həqiqətən silinir, ortaq (rol / hamı) bildiriş isə yalnız məndə gizlənir */
async function notifRemove(list){
  if(!me||!list.length)return;
  const ids=new Set(list.map(n=>n.id));
  state.notifications=state.notifications.filter(n=>!ids.has(n.id));
  const mine=list.filter(n=>n.target_type==="user"&&n.target===me.id).map(n=>n.id);
  for(let i=0;i<mine.length;i+=200)await sb.from('notifications').delete().in('id',mine.slice(i,i+200));
  const shared=list.filter(n=>!(n.target_type==="user"&&n.target===me.id));
  for(let i=0;i<shared.length;i+=20)await Promise.all(shared.slice(i,i+20).map(n=>sb.from('notifications').update({hidden_by:[...(Array.isArray(n.hidden_by)?n.hidden_by:[]),me.id]}).eq('id',n.id)));
  render();
}
function openNotifs(){''')
rep('''<div class="hint" style="margin:12px 0 6px;font-weight:600">🔔 Mesajlar</div>''','''<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0 6px"><div class="hint" style="font-weight:600">🔔 Mesajlar</div>${notifs.length?`<button class="mini" id="nclear" style="color:var(--crit)">Hamısını sil</button>`:""}</div>''')
rep('''${tm?" · "+tm:""}</div></div>`));});''','''${tm?" · "+tm:""}</div></div><div class="r"><button class="ibtn danger" data-ndel="${n.id}" title="Bildirişi sil" aria-label="Bildirişi sil">×</button></div>`));});
  nl.querySelectorAll("[data-ndel]").forEach(b=>b.onclick=async()=>{const n=notifs.find(x=>String(x.id)===b.dataset.ndel);const row=b.closest(".row");if(row)row.remove();if(n)await notifRemove([n]);if(!nl.querySelector(".row")){nl.innerHTML="";nl.appendChild(el("div","empty","Bildiriş yoxdur"));}});
  const nc=scrim.querySelector("#nclear");if(nc)nc.onclick=async()=>{if(!confirm(`Bütün bildirişlər silinsin (${notifs.length})?`))return;nc.disabled=true;nl.innerHTML="";nl.appendChild(el("div","empty","Bildiriş yoxdur"));nc.remove();await notifRemove(notifs);};''')
open("index-2026.11.03b.html","w",encoding="utf-8").write(s)
open(sys.argv[1]+"/c_n.mjs","w",encoding="utf-8").write(max(re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>',s,flags=re.S),key=len))
