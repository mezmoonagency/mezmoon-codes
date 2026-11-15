/* ---------- Paylaşım: media kitabxanası + avtomatik paylaşım (SMM Plan içində) ---------- */
const SMM_MEDIA_KINDS=[["foto","📷 Foto"],["video","🎬 Video"],["dizayn","🎨 Dizayn"],["story","📱 Story"]];
const SMM_MODES=[["manual","✋ Əl ilə"],["auto","🤖 Avtomatik"],["remind","🔔 Xatırlatma"]];
let smmTab="plan",smmMediaKind="";
const smmAutoBusy=p=>p.status==="plan"&&p.publish_mode==="auto"&&p.publish_status!=="failed";
const smmMediaCanAdd=()=>smmCanAdd()||role==="marketing";
const smmMediaLink=m=>"https://drive.google.com/file/d/"+m.drive_id+"/view";
const smmMediaOf=venueId=>state.smm_media.filter(m=>m.venue_id===venueId).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
const smmIsVideo=m=>String(m.mime||"").startsWith("video/");
function smmIgOf(client){const c=allClients().find(x=>x.name===client);if(!c)return {client:null,acc:null};
  const list=(ACC_RAW.ig_accounts||state.ig_accounts).filter(a=>a.client_id===c.id);return {client:c,acc:list.find(a=>a.publish_ok)||list[0]||null};}
function smmIgBadge(v){const {client,acc}=smmIgOf(v.client);
  const btn=client&&smmMediaCanAdd()?`<button class="mini" data-igp="${esc(client.id)}" style="margin-top:6px">📷 Avto-paylaşım üçün qoş</button>`:"";
  if(acc&&acc.publish_ok)return `<div style="margin-top:5px"><span class="chip c-good" style="font-size:10.5px">🤖 Avto hazır · @${esc(acc.username||"")}</span></div>`;
  return `<div style="margin-top:5px"><span class="chip c-mut" style="font-size:10.5px">${acc?"IG qoşulub, avto icazəsi yoxdur":"IG qoşulmayıb"}</span>${btn?"<br>"+btn:""}</div>`;}
async function smmIgConnect(clientId,b){
  if(!confirm("Instagram giriş səhifəsi açılacaq. Məkanın Instagram hesabı ilə daxil olub icazə ver."))return;
  b.disabled=true;const j=await igCall({action:"start",client_id:clientId,stats:true,publish:true});b.disabled=false;
  if(!j.ok){alert("Alınmadı: "+(j.error||""));return;}location.href=j.url;}
function smmAutoProblem(m,v,asStory){
  if(!m)return "Avtomatik üçün kitabxanadan material seç.";
  if(smmNotReady.has(m.drive_id)||(v&&(smmAutoItems(v.client).find(x=>x.drive_id===m.drive_id)||{ready:true}).ready===false))return "Bu material hələ təsdiqlənməyib. Əvvəl Çəkiliş Təhvilində təsdiqlə.";
  if(!v||!(smmIgOf(v.client).acc||{}).publish_ok)return "Bu məkanın Instagram-ı avtomatik paylaşım üçün qoşulmayıb.";
  if(smmIsVideo(m)){if(!/^video\/(mp4|quicktime)$/.test(m.mime))return "Video MP4 və ya MOV olmalıdır.";}
  else{if(m.mime!=="image/jpeg")return "Foto JPEG olmalıdır (Instagram API PNG qəbul etmir).";if(Number(m.size)>8*1048576)return "Foto 8 MB-dan böyük olmamalıdır.";}
  return "";}
/* Avtomatik kitabxana: çəkiliş videoları, foto qovluqları və hazır dizaynlar panelin öz məlumatından gəlir */
const smmNorm=s=>String(s||"").trim().toLocaleLowerCase("az");
const smmFileId=u=>{const m=String(u||"").match(/\/d\/([\w-]{10,})/)||String(u||"").match(/[?&]id=([\w-]{10,})/);return m?m[1]:"";};
const smmFolderId=u=>{const m=String(u||"").match(/\/folders\/([\w-]{10,})/);return m?m[1]:"";};
const smmThumb=(id,w)=>"https://drive.google.com/thumbnail?id="+encodeURIComponent(id)+"&sz=w"+w;
const smmNotReady=new Set();
const smmLinks=a=>(Array.isArray(a)?a:[]).map(x=>typeof x==="string"?x:(x&&(x.url||x.link))||"").filter(Boolean);
function smmAutoItems(client){const c=smmNorm(client),out=[];
  state.shoots.filter(s=>smmNorm(s.client)===c).forEach(s=>{const when=s.held_at||s.created_at||"",d=s.shoot_date||"";
    getVids(s).forEach((x,i)=>{const id=smmFileId(x.link);if(id)out.push({key:"v"+id,auto:true,kind:"video",name:"Video "+(i+1)+(d?" · "+d:""),drive_id:id,mime:"video/mp4",size:0,ready:x.stage>=4,at:when});});
    const ph=getPhotos(s),fid=smmFolderId(ph.link),one=fid?"":smmFileId(ph.link);
    if(fid)out.push({key:"f"+fid,auto:true,kind:"foto",name:"Foto qovluğu"+(d?" · "+d:""),folder_id:fid,count:ph.count||0,ready:ph.stage>=4,at:when});
    else if(one)out.push({key:"p"+one,auto:true,kind:"foto",name:"Foto"+(d?" · "+d:""),drive_id:one,mime:"image/jpeg",size:0,ready:ph.stage>=4,at:when});});
  state.briefs.filter(b=>smmNorm(b.client)===c&&b.status==="Hazır").forEach(b=>{const name=b.title||"Dizayn",when=b.done_at||b.created_at||"";
    const jpg=smmLinks(b.jpg_files);if(!jpg.length&&b.jpg_file)jpg.push(b.jpg_file);
    jpg.forEach((u,i)=>{const id=smmFileId(u);if(id)out.push({key:"d"+id,auto:true,kind:"dizayn",name:name+(jpg.length>1?" · "+(i+1):""),drive_id:id,mime:"image/jpeg",size:0,ready:true,at:when});});
    smmLinks(b.motion_files).forEach((u,i)=>{const id=smmFileId(u);if(id)out.push({key:"m"+id,auto:true,kind:"dizayn",name:name+" · motion"+(i?" "+(i+1):""),drive_id:id,mime:"video/mp4",size:0,ready:true,at:when});});});
  const seen=new Set();return out.filter(x=>{if(seen.has(x.key))return false;seen.add(x.key);return true;}).sort((a,b)=>String(b.at).localeCompare(String(a.at)));}
function smmLibrary(v){const auto=smmAutoItems(v.client);const ids=new Set(auto.map(x=>x.drive_id).filter(Boolean));
  const ups=smmMediaOf(v.id).filter(m=>!ids.has(m.drive_id)).map(m=>({...m,key:"u"+m.id,row:m,ready:true,at:m.created_at}));
  return [...ups,...auto];}
async function smmFolderFiles(id){if(!driveConnected())throw new Error("Qovluğun içini görmək üçün yuxarıdan «Drive-ı qoş» bas.");
  const token=await gToken();const q=encodeURIComponent("'"+id+"' in parents and trashed=false and mimeType contains 'image/'");
  const r=await fetch("https://www.googleapis.com/drive/v3/files?pageSize=200&orderBy=name&fields=files(id,name,mimeType,size)&supportsAllDrives=true&includeItemsFromAllDrives=true&q="+q,{headers:{Authorization:"Bearer "+token}});
  if(!r.ok)throw new Error("Qovluq oxunmadı ("+r.status+")");return (await r.json()).files||[];}
function smmFolderPick(it,onPick){const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:640px"><div class="mh"><h3>📂 ${esc(it.name)}</h3><button data-x>×</button></div><div class="mb"><div id="fl" class="hint" style="white-space:normal">Yüklənir…</div><a class="btn ghost sm" href="https://drive.google.com/drive/folders/${esc(it.folder_id)}" target="_blank" rel="noopener" style="margin-top:12px">Drive-da aç ↗</a></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const box=scrim.querySelector("#fl");
  smmFolderFiles(it.folder_id).then(files=>{if(!files.length){box.textContent="Qovluqda şəkil tapılmadı.";return;}
    box.className="";box.style.cssText="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;max-height:60vh;overflow:auto";
    box.innerHTML=files.map(f=>`<${onPick?"button type=\"button\"":"a target=\"_blank\" rel=\"noopener\" href=\"https://drive.google.com/file/d/"+esc(f.id)+"/view\""} data-ff="${esc(f.id)}" title="${esc(f.name)}" style="display:block;aspect-ratio:1;padding:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--surface-2)"><img loading="lazy" src="${smmThumb(f.id,200)}" alt="" style="width:100%;height:100%;object-fit:cover"></${onPick?"button":"a"}>`).join("");
    if(onPick)box.querySelectorAll("[data-ff]").forEach(b=>b.onclick=()=>{const f=files.find(x=>x.id===b.dataset.ff);close();if(!it.ready)smmNotReady.add(f.id);onPick({key:"x"+f.id,auto:true,kind:"foto",name:f.name,drive_id:f.id,mime:f.mimeType,size:Number(f.size)||0,ready:it.ready});});
  }).catch(e=>{box.textContent=e.message||String(e);});}
async function smmRegister(it,v){const have=state.smm_media.find(m=>m.venue_id===v.id&&m.drive_id===it.drive_id);if(have)return have;
  let name=it.name,mime=it.mime,size=it.size||0;
  if(driveConnected()&&!size){try{const token=await gToken();const r=await fetch("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(it.drive_id)+"?fields=name,mimeType,size&supportsAllDrives=true",{headers:{Authorization:"Bearer "+token}});
    if(r.ok){const j=await r.json();name=it.name||j.name;mime=j.mimeType||mime;size=Number(j.size)||0;}}catch(e){}}
  const {data,error}=await sb.from('smm_media').insert({venue_id:v.id,client:v.client,kind:it.kind,name,drive_id:it.drive_id,mime,size}).select().single();
  if(error){alert("Material seçilmədi: "+error.message);return null;}
  state.smm_media.push(data);return data;}
function smmTabs(){const s=el("div","seg");s.style.cssText="margin:0 0 14px";
  s.innerHTML=[["plan","📅 Plan"],["media","🗂 Materiallar"]].map(([k,l])=>`<button type="button" data-tab="${k}" class="${smmTab===k?"on":""}">${l}</button>`).join("");
  s.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{smmTab=b.dataset.tab;render();});return s;}
function smmMediaView(venues){
  const box=el("div");
  if(!venues.length){box.appendChild(el("div","empty","Sənə hələ məkan təyin olunmayıb."));return box;}
  const v=venues.find(x=>x.client===smmVenue)||venues[0];const all=smmLibrary(v);const list=all.filter(m=>!smmMediaKind||m.kind===smmMediaKind);
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px";
  bar.innerHTML=`<select data-mv style="font-size:13px;padding:8px 11px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--ink)">${venues.map(x=>`<option value="${esc(x.client)}"${x.id===v.id?" selected":""}>${esc(x.client)}</option>`).join("")}</select>
    <div class="pchips" style="max-height:none;flex:1">${[["","Hamısı"],...SMM_MEDIA_KINDS].map(([k,l])=>`<button type="button" class="pchip${smmMediaKind===k?" on":""}" data-mk="${k}">${l} <span style="opacity:.6">${k?all.filter(m=>m.kind===k).length:all.length}</span></button>`).join("")}</div>
    ${smmMediaCanAdd()?`<button class="btn sm" data-mup>☁️ Yüklə</button>`:""}`;
  bar.querySelector("[data-mv]").onchange=e=>{smmVenue=e.target.value;render();};
  bar.querySelectorAll("[data-mk]").forEach(b=>b.onclick=()=>{smmMediaKind=b.dataset.mk;render();});
  const up=bar.querySelector("[data-mup]");if(up)up.onclick=()=>smmMediaUpload(v);
  box.appendChild(bar);
  if(!list.length){box.appendChild(el("div","empty","Bu məkan üçün material yoxdur. Çəkiliş videoları, foto qovluqları və hazır dizaynlar burada özü görünür; əlavə fayl üçün «Yüklə» bas."));return box;}
  const grid=el("div");grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px";
  const can=SMM_MGR.includes(role);
  list.forEach(m=>{const c=el("div","panel");c.style.cssText="padding:0;overflow:hidden;margin:0";const isF=!!m.folder_id;
    const label=esc((SMM_MEDIA_KINDS.find(k=>k[0]===m.kind)||["",""])[1])+(isF?" · "+(m.count||0)+" fayl":Number(m.size)?" · "+(Number(m.size)/1048576).toFixed(1)+" MB":"");
    c.innerHTML=`<a ${isF?`data-mfo="${esc(m.key)}" href="#"`:`href="${esc(smmMediaLink(m))}" target="_blank" rel="noopener"`} style="display:flex;align-items:center;justify-content:center;aspect-ratio:1;background:var(--surface-2);font-size:40px;position:relative;overflow:hidden;text-decoration:none">${isF?"📂":smmIsVideo(m)?"🎬":"🖼"}${isF?"":`<img loading="lazy" src="${smmThumb(m.drive_id,400)}" alt="" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`}</a>
      <div style="padding:9px 11px"><div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(m.name)}">${esc(m.name)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:4px;flex-wrap:wrap"><span style="font-size:11px;color:var(--muted)">${label}</span>${m.ready?"":'<span class="chip c-warn" style="font-size:10px">Təsdiqsiz</span>'}${can&&m.row?`<button class="mini" data-mdel="${m.id}" title="Sil" style="color:var(--crit)">${ICON.trash}</button>`:""}</div></div>`;
    grid.appendChild(c);});
  grid.querySelectorAll("[data-mfo]").forEach(a=>a.onclick=e=>{e.preventDefault();smmFolderPick(list.find(x=>x.key===a.dataset.mfo),null);});
  grid.querySelectorAll("[data-mdel]").forEach(b=>b.onclick=()=>smmMediaDelete(state.smm_media.find(m=>m.id===b.dataset.mdel)));
  box.appendChild(grid);return box;}
async function smmMediaUpload(v){
  const files=await pickFiles("image/*,video/*");if(!files.length)return;
  const parent=await editDriveParent(v.client);
  const scrim=el("div","scrim");scrim.innerHTML=`<div class="modal" style="max-width:380px"><div class="mb"><div style="font-weight:600;margin-bottom:6px">☁️ Agentlik Drive-ına yüklənir…</div><div class="hint" id="mm" style="white-space:normal">Pəncərəni bağlama.</div></div></div>`;
  document.body.appendChild(scrim);const msg=scrim.querySelector("#mm");
  try{for(let i=0;i<files.length;i++){const f=files[i];
      if(f.size>1073741824){alert(f.name+" — 1 GB-dan böyükdür.");continue;}
      const isV=f.type.startsWith("video/");const kind=smmMediaKind==="dizayn"||smmMediaKind==="story"?smmMediaKind:isV?"video":"foto";
      const url=await driveOwnerUpload(f,f.name,parent,pc=>{msg.textContent=`${i+1}/${files.length} · ${f.name} · ${pc}%`;});
      const {error}=await sb.from('smm_media').insert({venue_id:v.id,client:v.client,kind,name:f.name,drive_id:driveId(url),mime:f.type||"",size:f.size});
      if(error)throw new Error(error.message);}
  }catch(e){alert("Yükləmə dayandı: "+(e.message||e));}
  finally{scrim.remove();await reload('smm_media');}}
async function smmMediaDelete(m){if(!m)return;
  if(smmAutoItems(m.client).some(x=>x.drive_id===m.drive_id)){alert("Bu fayl çəkiliş və ya dizayndan gəlir, buradan silinmir.");return;}
  const used=state.smm_posts.filter(p=>p.media_id===m.id&&p.status==="plan").length;
  if(!confirm("«"+m.name+"» silinsin?"+(used?"\n\nDiqqət: "+used+" planlanmış paylaşım bu materialdan istifadə edir.":"")+"\n\nFayl Drive-da zibil qutusuna atılacaq."))return;
  const j=await gdCall({action:"trash",id:m.drive_id}).catch(e=>({ok:false,error:e.message}));
  if(!j||!j.ok){alert("Drive-dan silinmədi"+(j&&j.error?": "+j.error:"")+". Material saxlanıldı.");return;}
  await del('smm_media',m.id);}
