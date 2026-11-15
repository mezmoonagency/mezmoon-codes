
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SB_URL="https://tcdfhbtlqxcpwlycqhfv.supabase.co";
const SB_KEY="sb_publishable_niJ4BSB_V1LC1kKf5Fomqg_mJnvIY7E";
/* Parol yeniləmə linkindən gəlibsə (#...type=recovery) — supabase hash-i silməzdən əvvəl oxu */
const AUTH_HASH=new URLSearchParams(location.hash.slice(1));
let recovering=AUTH_HASH.get("type")==="recovery";
const AUTH_LINK_ERR=AUTH_HASH.get("error_code")?(AUTH_HASH.get("error_code")==="otp_expired"?"Linkin vaxtı bitib və ya artıq istifadə olunub — yenisini istə.":(AUTH_HASH.get("error_description")||"Link xətası").replace(/\+/g," ")):"";
if(AUTH_LINK_ERR)history.replaceState(null,"",location.pathname+location.search);
const sb=createClient(SB_URL, SB_KEY);
const GOOGLE_CLIENT_ID="1093789259212-1pgkqq656eqq46ovljck2dtgok26e0j8.apps.googleusercontent.com";
/* Telegram botunun istifadəçi adı (@ olmadan). BotFather-dən bot yaradıb adını bura yaz. */
const TELEGRAM_BOT="Mezmoon_bot";
/* Sayt versiyası — hər yeniləmədə dəyişir. Hostinger-dəki versiyanı yoxlamaq üçün sol menyunun altında görünür. */
const APP_VERSION="2026.11.08a";
const TG_FUNC_URL=SB_URL+"/functions/v1/telegram-bot";
async function pushTelegram(rec){try{await fetch(TG_FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY},body:JSON.stringify({type:"INSERT",table:"notifications",record:rec})});}catch(e){}}
const META_FUNC_URL=SB_URL+"/functions/v1/rapid-processor";
async function fetchMetaInsights(actId,preset){
  const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),30000);
  try{
    const r=await fetch(META_FUNC_URL,{method:"POST",signal:ctrl.signal,headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY},body:JSON.stringify({act_id:actId,preset})});
    let txt="";try{txt=await r.text();}catch(e){}
    let j=null;try{j=JSON.parse(txt);}catch(e){}
    if(!r.ok&&!j)return {ok:false,error:"Funksiya xətası (HTTP "+r.status+"). 'Verify JWT' söndürülüb və funksiya deploy olunubmu?"+(txt?" · "+txt.slice(0,120):"")};
    if(!j)return {ok:false,error:"Cavab oxunmadı (HTTP "+r.status+")"};
    return j;
  }catch(e){
    const m=(e&&e.name==="AbortError")?"Vaxt bitdi (30 san) — funksiya cavab vermir":(e&&e.message)||String(e);
    return {ok:false,error:"Funksiyaya çıxış yoxdur: "+m+". Edge Function deploy + 'Verify JWT' OFF yoxla."};
  }finally{clearTimeout(t);}
}
/* Paylaşılan mərkəzi qovluq: hər kəs öz Gmail-i ilə girib bu ORTAQ qovluğa yükləyir.
   CEO Drive-da bir qovluq yaradıb komandaya "Redaktə edən" icazəsi verir, sonra qovluğun
   linkindəki ID-ni bura yazır: drive.google.com/drive/folders/<BU_ID>.  Boş olsa, hər kəs öz Drive-ına yükləyər. */
const CENTRAL_ROOT_ID="1tnh-oe0j5-tvvX4nrQXeoqU2mDe5nU_0";
/* Ortaq qovluğa başqasının hesabından yazmaq üçün tam Drive icazəsi lazımdır (drive.file bunu edə bilmir). */
const DRIVE_SCOPE=CENTRAL_ROOT_ID?'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email':'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
/* Daimi qoşulma: hər istifadəçi Drive-ı BİR DƏFƏ qoşur (Google «authorization code» → google-drive funksiyası
   refresh token-i Supabase-də saxlayır). Sonra panel hər dəfə oradan təzə token alır — popup yoxdur. */
const GD_FUNC_URL=SB_URL+"/functions/v1/google-drive";
let gCodeClient=null,gReady=false,gAccessToken=null,gTokenExp=0,gEmail="",gLinked=null,gRefreshing=null,gTimer=null;
function driveConnected(){return !!gAccessToken&&Date.now()<gTokenExp-60000;}
function initGoogle(){try{gCodeClient=google.accounts.oauth2.initCodeClient({client_id:GOOGLE_CLIENT_ID,scope:DRIVE_SCOPE,ux_mode:'popup',callback:()=>{},error_callback:()=>{}});gReady=true;}catch(e){}}
function driveBtnHtml(){return ICON.cloud+`<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${driveConnected()?(gEmail?esc(gEmail):"Drive ✓"):gRefreshing?"Drive…":"Drive-ı qoş"}</span>`;}
/* Token brauzerdə də saxlanır (1 saatlıq) — səhifə yenilənəndə Drive dərhal qoşulu görünür, serveri gözləmir. */
const GTOK_KEY="mm_gtok";
function gSaveCache(){try{localStorage.setItem(GTOK_KEY,JSON.stringify({u:me?me.id:"",t:gAccessToken,e:gTokenExp,m:gEmail}));}catch(e){}}
function gClearCache(){try{localStorage.removeItem(GTOK_KEY);}catch(e){}}
function gLoadCache(uid){
  clearTimeout(gTimer);gAccessToken=null;gTokenExp=0;gEmail="";gLinked=null;
  try{const c=JSON.parse(localStorage.getItem(GTOK_KEY)||"null");
    if(c&&c.u===uid&&c.t&&Date.now()<c.e-60000){gAccessToken=c.t;gTokenExp=c.e;gEmail=c.m||"";gLinked=true;
      gTimer=setTimeout(()=>{if(gLinked){gTokenExp=0;driveReady();}},Math.max(60000,c.e-Date.now()-300000));}}catch(e){}
}
function updateDriveBtn(){const b=document.querySelector('#gdrive');if(b&&!b.disabled)b.innerHTML=driveBtnHtml();}
async function gdCall(body){
  const {data:{session}}=await sb.auth.getSession();
  const r=await fetch(GD_FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+(session?session.access_token:"")},body:JSON.stringify(body)});
  return r.json().catch(()=>({ok:false,error:"cavab yoxdur ("+r.status+")"}));
}
function setGTok(j){
  gAccessToken=j.access_token;gTokenExp=Date.now()+(+(j.expires_in||3600))*1000;if(j.email)gEmail=j.email;gLinked=true;gSaveCache();updateDriveBtn();
  /* panel açıq qaldıqca token bitməzdən 5 dəq əvvəl özü yenilənir */
  clearTimeout(gTimer);gTimer=setTimeout(()=>{if(gLinked){gTokenExp=0;driveReady();}},Math.max(60,(+(j.expires_in||3600))-300)*1000);
}
/* Popup-suz: keşdəki token, yoxdursa serverdən təzəsi. Qoşulmayıbsa false. */
function driveReady(){
  if(driveConnected())return Promise.resolve(true);
  if(gLinked===false)return Promise.resolve(false);
  if(!gRefreshing)gRefreshing=gdCall({action:"token"}).then(j=>{
      if(j&&j.access_token){setGTok(j);return true;}
      if(j&&j.ok&&!j.connected){gLinked=false;gAccessToken=null;gEmail="";gClearCache();}
      return false;}).catch(()=>false).finally(()=>{gRefreshing=null;updateDriveBtn();});
  updateDriveBtn();
  return gRefreshing;
}
/* İlk qoşulma — klikdən birbaşa çağırılmalıdır (popup açılsın). */
function connectDrive(){return new Promise((res,rej)=>{
  if(!gReady||!gCodeClient){rej(new Error("Google hazır deyil — səhifəni yenilə (accounts.google.com açıla bilməyib)."));return;}
  let done=false;const finish=fn=>{if(!done){done=true;fn();}};
  const wd=setTimeout(()=>finish(()=>rej(new Error("Google cavab vermədi (vaxt bitdi). Yenidən «Drive-ı qoş» bas — açılan pəncərədə İzin ver/Allow-a qədər davam et."))),300000);
  gCodeClient.callback=async r=>{clearTimeout(wd);if(done)return;
    if(!r||!r.code){finish(()=>rej(new Error(r&&r.error?("İcazə xətası: "+r.error):"İcazə verilmədi")));return;}
    let j;try{j=await gdCall({action:"exchange",code:r.code});}catch(e){j={error:e.message||String(e)};}
    finish(()=>{if(j&&j.access_token){setGTok(j);res(gAccessToken);}else rej(new Error((j&&j.error)||"Qoşulma alınmadı"));});};
  gCodeClient.error_callback=err=>{clearTimeout(wd);finish(()=>{const t=err&&err.type?err.type:"";rej(new Error(t==="popup_closed"?"İcazə pəncərəsi bağlandı — yenidən cəhd et.":t==="popup_failed_to_open"?"İcazə pəncərəsi açılmadı — brauzer pop-up-ı blokladı. Ünvan sətrindəki nişanla pop-up-lara icazə ver.":("Google icazə xətası"+(t?": "+t:""))));});};
  try{gCodeClient.requestCode();}catch(e){clearTimeout(wd);finish(()=>rej(e));}
});}
async function disconnectDrive(){try{await gdCall({action:"disconnect"});}catch(e){}clearTimeout(gTimer);gAccessToken=null;gTokenExp=0;gEmail="";gLinked=false;gClearCache();updateDriveBtn();}
function gToken(){
  return driveReady().then(ok=>{if(ok)return gAccessToken;throw new Error("Drive qoşulmayıb. Yuxarıdakı «☁️ Drive-ı qoş» düyməsinə bir dəfə bas — bundan sonra daimi qoşulu qalacaq.");});
}
/* Drive xətasını başa düşülən mesaja çevir. Tam icazə verilməyibsə (403 scope) — qoşulmanı sıfırla ki, yenidən qoşsun. */
async function driveErr(res,what){
  let reason="",msg="";try{const j=await res.json();const e=j&&j.error||{};msg=e.message||"";reason=(e.errors&&e.errors[0]&&e.errors[0].reason)||e.status||"";}catch(e){}
  if(res.status===401){gTokenExp=0;return new Error("Drive sessiyası bitib — yenidən cəhd et.");}
  if(res.status===403&&/insufficient|scope/i.test(reason+" "+msg)){await disconnectDrive();
    return new Error("Google Drive icazəsi tam verilməyib. Yuxarıdakı «☁️ Drive-ı qoş» düyməsinə bas və açılan Google pəncərəsində «Google Drive»-a aid qutunu MÜTLƏQ işarələ.");}
  if(res.status===403||res.status===404)return new Error("Ortaq Drive qovluğuna giriş yoxdur"+(gEmail?" ("+gEmail+")":"")+". CEO bu Gmail-i ortaq qovluğa «Redaktə edən» kimi əlavə etməlidir.");
  return new Error(what+" alınmadı ("+res.status+(msg?": "+msg:"")+")");
}
function driveUpload(file,onProgress,onStatus,parentId){return new Promise(async(resolve,reject)=>{
  if(onStatus)onStatus("auth");
  let token;try{token=await gToken();}catch(e){return reject(e);}
  if(onStatus)onStatus("upload");
  /* Fayl agentlik (CEO) hesabının adına yazılır — işçinin şəxsi 15 GB-ı dolmasın. Alınmasa, köhnə yolla (öz hesabı ilə) */
  let uploadUrl=null,viaOwner=false;
  if(parentId||CENTRAL_ROOT_ID){try{const j=await gdCall({action:"upload_session",name:file.name,mime:file.type||'application/octet-stream',size:file.size,parent:parentId||CENTRAL_ROOT_ID});if(j&&j.ok&&j.url){uploadUrl=j.url;viaOwner=true;}}catch(e){}}
  if(!uploadUrl){
    const meta={name:file.name};if(parentId)meta.parents=[parentId];
    let initRes;try{initRes=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':file.type||'application/octet-stream'},body:JSON.stringify(meta)});}catch(e){return reject(e);}
    if(!initRes.ok)return reject(await driveErr(initRes,"Drive yükləmə sessiyası"));
    uploadUrl=initRes.headers.get('Location');if(!uploadUrl)return reject(new Error("Upload URL yoxdur"));
  }
  const xhr=new XMLHttpRequest();xhr.open('PUT',uploadUrl,true);xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');
  xhr.upload.onprogress=e=>{if(e.lengthComputable&&onProgress)onProgress(Math.round(e.loaded/e.total*100));};
  xhr.onload=async()=>{if(xhr.status>=200&&xhr.status<300){let id;try{id=JSON.parse(xhr.responseText).id;}catch(e){}if(!id)return reject(new Error("Fayl ID yoxdur"));try{if(viaOwner)await gdCall({action:"share",id});else await fetch('https://www.googleapis.com/drive/v3/files/'+id+'/permissions',{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({role:'reader',type:'anyone'})});}catch(e){}resolve('https://drive.google.com/file/d/'+id+'/view');}
    else{let reason="";try{const e=JSON.parse(xhr.responseText).error||{};reason=(e.errors&&e.errors[0]&&e.errors[0].reason)||e.message||"";}catch(e){}
      if(/storageQuotaExceeded|quota/i.test(reason))reject(new Error("Google Drive yaddaşı doludur"+(viaOwner?" (agentlik hesabı)":gEmail?" ("+gEmail+")":"")+". Drive-da yer boşaldın və ya CEO-ya bildirin."));
      else reject(new Error("Yükləmə xətası ("+xhr.status+(reason?": "+reason:"")+")"));}};
  xhr.onerror=()=>reject(new Error("Şəbəkə xətası"));xhr.send(file);
});}
function askLink(cb){
  const url=prompt("Google Drive linkini yapışdır (fayl və ya qovluq). Fayllar avtomatik agentlik Drive-ına kopyalanacaq — Drive-da paylaşım «Linki olan hər kəs» olmalıdır:","");
  if(url===null)return;const u=url.trim();
  if(!/^https?:\/\//i.test(u)){alert("Düzgün link deyil. Link https:// ilə başlamalıdır.");return;}
  cb(u);
}
/* Link kimi verilən Drive faylı/qovluğu agentliyin ortaq Drive-ına kopyalanır; yeni link qaytarılır (alınmasa null) */
async function importLinkToDrive(link,opts){
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:380px"><div class="mb"><div style="font-weight:600;margin-bottom:6px">☁️ Agentlik Drive-ına köçürülür…</div><div class="hint" style="white-space:normal">Linkdəki fayllar şirkətin ortaq Drive-ına kopyalanır. Qovluq böyükdürsə, içindəki fayllar bir neçə dəqiqə ərzində tam görünəcək.</div></div></div>`;
  document.body.appendChild(scrim);
  try{
    const j=await gdCall({action:"import",link,client:(opts&&opts.client)||"",sub:(opts&&opts.sub)||"",cat:(opts&&opts.cat)||"",ref:(opts&&opts.ref)||""});
    if(j&&j.ok&&j.link)return j.link;
    alert((j&&j.error)||"Link köçürülmədi.");return null;
  }catch(e){alert("Link köçürülmədi: "+(e.message||e));return null;}
  finally{scrim.remove();}
}
function askLinkTo(opts,cb){askLink(async u=>{const nl=await importLinkToDrive(u,opts);if(nl)cb(nl);});}
/* ---------- Drive folder tree (client → month) ---------- */
const DRIVE_ROOT="MezMoon CRM";
const folderCache={};
function monthOfDate(str){const m=String(str||'').replace('~','').trim().match(/(\d{1,2})\.(\d{1,2})/);const mo=m?+m[2]:0;return (mo>=1&&mo<=12)?MONTHS_AZ[mo-1]:MONTHS_AZ[calM];}
function shootMonth(s){return (s&&s.month)?s.month:monthOfDate(s?s.shoot_date:"");}
async function driveFindFolder(name,parentId){
  const token=await gToken();
  const q=`mimeType='application/vnd.google-apps.folder' and trashed=false and name='${String(name).replace(/'/g,"\\'")}'`+(parentId?` and '${parentId}' in parents`:"");
  const res=await fetch('https://www.googleapis.com/drive/v3/files?spaces=drive&fields='+encodeURIComponent('files(id,name)')+'&q='+encodeURIComponent(q),{headers:{'Authorization':'Bearer '+token}});
  if(!res.ok)throw await driveErr(res,"Drive qovluq axtarışı");
  const j=await res.json();return (j.files&&j.files[0])?j.files[0].id:null;
}
async function ensureFolder(name,parentId){
  const key=(parentId||'root')+'/'+name;
  if(folderCache[key])return folderCache[key];
  let id=null;
  try{const {data}=await sb.from('drive_folders').select('folder_id').eq('key',key).maybeSingle();
    if(data&&data.folder_id){const token=await gToken();const r=await fetch('https://www.googleapis.com/drive/v3/files/'+data.folder_id+'?fields=trashed',{headers:{'Authorization':'Bearer '+token}});if(r.ok&&!(await r.json()).trashed)id=data.folder_id;}}catch(e){}
  if(!id)id=await driveFindFolder(name,parentId);
  if(!id){
    const token=await gToken();
    const body={name,mimeType:'application/vnd.google-apps.folder'};if(parentId)body.parents=[parentId];
    const res=await fetch('https://www.googleapis.com/drive/v3/files?fields=id',{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!res.ok)throw await driveErr(res,"Drive qovluğu yaradılması");
    id=(await res.json()).id;
  }
  folderCache[key]=id;
  try{await sb.from('drive_folders').upsert({key,folder_id:id});}catch(e){}
  return id;
}
function briefMonth(b){return MONTHS_AZ[new Date(b&&b.created_at?b.created_at:Date.now()).getMonth()];}
/* Videoqraf / fotoqraf material yükləyəndə — CEO, PM, Koordinator, Account Manager-lərə (şəxsi bildiriş) */
async function notifyUpload(s,what){
  const ids=state.profiles.filter(p=>["ceo","pm","coordinator","account"].includes(p.role)&&(!me||p.id!==me.id)).map(p=>p.id);
  if(!ids.length)return;
  const body=`${myName()} — ${s.client} — ${shootMonth(s)} çəkilişinin materialını yüklədi (${what}). Girib nəzərdən keçirə bilərsiniz!`;
  try{await sb.from('notifications').insert(ids.map(id=>({target_type:"user",target:id,title:"📤 Yeni material yükləndi",body,from_name:myName(),from_id:me?me.id:null,read_by:[]})));}catch(e){}
}
async function folderFor(client,sub,cat){
  const root=CENTRAL_ROOT_ID?CENTRAL_ROOT_ID:await ensureFolder(DRIVE_ROOT,null);
  const c=await ensureFolder(client&&client.trim()?client:"Ümumi",root);
  if(!sub)return c;
  const m=await ensureFolder(sub,c);
  return cat?await ensureFolder(cat,m):m;
}
async function buildDriveTree(){
  if(!(await driveReady())){alert("Əvvəlcə yuxarıdan «Drive-ı qoş» (bir dəfəlik).");return;}
  const clients=state.clients.map(c=>c.name);
  const months=MONTHS_AZ.slice(calM); // cari aydan ilin sonuna qədər
  if(!clients.length){alert("Klient siyahısı boşdur.");return;}
  const total=1+clients.length*(1+months.length);let done=0;
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:400px"><div class="mb"><div style="font-weight:600;margin-bottom:6px">Drive qovluqları qurulur…</div><div class="hint" id="bsub" style="white-space:normal">Başlanır…</div><div style="height:8px;background:var(--surface-2);border-radius:6px;margin-top:12px;overflow:hidden"><div id="bbar" style="height:100%;width:0;background:var(--accent);transition:width .2s"></div></div><div class="hint" id="bpct" style="margin-top:6px">0%</div></div></div>`;
  document.body.appendChild(scrim);
  const tick=(txt)=>{done++;const p=Math.round(done/total*100);const bb=scrim.querySelector("#bbar");if(bb)bb.style.width=p+"%";const bp=scrim.querySelector("#bpct");if(bp)bp.textContent=p+"%";const bs=scrim.querySelector("#bsub");if(bs&&txt)bs.textContent=txt;};
  try{
    const root=CENTRAL_ROOT_ID?CENTRAL_ROOT_ID:await ensureFolder(DRIVE_ROOT,null);tick(CENTRAL_ROOT_ID?"Ortaq qovluq":"Kök: "+DRIVE_ROOT);
    for(const name of clients){
      const cf=await ensureFolder(name,root);tick(name);
      for(const m of months){await ensureFolder(m,cf);tick(name+" · "+m);}
    }
    scrim.remove();alert("Hazırdır! "+clients.length+" müştəri, hər birində "+months.length+" aylıq qovluq quruldu ("+MONTHS_AZ[calM]+"–Dekabr).");
  }catch(e){scrim.remove();alert("Qovluq qurulması dayandı: "+(e.message||e));}
}
async function drivePickAndUpload(accept,cb,opts){
  if(!(await driveReady())){alert("Əvvəlcə Drive-ı qoş: yuxarı sağdakı «☁️ Drive-ı qoş» düyməsinə bir dəfə bas və Google hesabına icazə ver. Bu bir dəfəlikdir — sonra daimi qoşulu qalır.");return;}
  const file=await pickFileBlob(accept);if(!file)return;
  let parentId=null;
  if(opts&&opts.client){try{parentId=await folderFor(opts.client,opts.sub,opts.cat);}catch(e){if(!confirm("Qovluq hazırlana bilmədi ("+(e.message||e)+"). Fayl kök qovluğa yüklənsin?"))return;}}
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:380px"><div class="mb"><div id="dtitle" style="font-weight:600;margin-bottom:6px">☁️ Drive-a yüklənir…</div><div class="hint" id="dsub" style="white-space:normal">Fayl yüklənir, pəncərəni bağlama.</div><div class="hint" style="white-space:normal;margin-top:6px;opacity:.75">${esc(file.name)}</div><div style="height:8px;background:var(--surface-2);border-radius:6px;margin-top:12px;overflow:hidden"><div id="dbar" style="height:100%;width:0;background:var(--accent);transition:width .2s"></div></div><div class="hint" id="dpct" style="margin-top:6px">0%</div></div></div>`;
  document.body.appendChild(scrim);
  const setStatus=ph=>{};
  try{const link=await driveUpload(file,p=>{const b=scrim.querySelector("#dbar");if(b)b.style.width=p+"%";const t=scrim.querySelector("#dpct");if(t)t.textContent=p+"%";},setStatus,parentId);scrim.remove();cb(link);}
  catch(e){scrim.remove();alert("Drive yükləmə alınmadı: "+(e.message||e));}
}
/* Əvəzlənən faylı Drive zibil qutusuna at (30 gün bərpa olunur) */
async function driveTrash(url){const id=driveId(url);if(!id)return;let ok=false;try{const token=await gToken();const r=await fetch('https://www.googleapis.com/drive/v3/files/'+id,{method:'PATCH',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});ok=r.ok;}catch(e){}
  /* Agentlik hesabına yazılmış faylı işçi zibilə ata bilməz — server CEO adından atır */
  if(!ok){try{await gdCall({action:"trash",id});}catch(e){}}}
async function driveDelete(fileId){
  const token=await gToken();
  const res=await fetch('https://www.googleapis.com/drive/v3/files/'+fileId,{method:'DELETE',headers:{'Authorization':'Bearer '+token}});
  if(!(res.status===204||res.ok))throw new Error("status "+res.status);
}
/* Remove an uploaded file: Drive file → also delete from Drive; Supabase path → delete from bucket; then clear the field. */
async function removeFile(table,id,field,path,label){
  if(!path)return;
  const dId=driveId(path);
  if(!confirm((label||"Fayl")+" silinsin?"+(dId?" Google Drive-dan da silinəcək.":"")+" Geri qaytarıla bilməz."))return;
  if(dId){
    if(!(await driveReady())){if(!confirm("Drive qoşulmayıb — fayl Drive-da qalacaq, yalnız paneldən silinsin?"))return;}
    else try{await driveDelete(dId);}
    catch(e){if(!confirm("Drive-dan silinmədi ("+(e.message||e)+"). Yalnız paneldən silinsin?"))return;}
  }else if(!/^https?:\/\//.test(path)){
    try{await sb.storage.from('crm-files').remove([path]);}catch(e){}
  }
  await upd(table,id,{[field]:''});
}

/* ---------- Roles ---------- */
const ROLES={
  ceo:{label:"CEO",nav:["dash","clients","leads","content","briefs","posters","shoots","meetings","smm","delivery","videos","subs","adbriefs","ads","igstats","igmsg","reports","finance","team","attendance","audit"],scope:"Tam giriş. Kontent, dizayn və videonu CEO kimi təsdiqləyirsən.",approver:"ceo"},
  marketing:{label:"Marketinq Direktoru",nav:["dash","clients","leads","content","briefs","posters","shoots","delivery","videos","subs","smm","ads","igstats","reports"],scope:"Kontent, dizayn və videonu görür, təsdiq verirsən.",approver:"marketing"},
  pm:{label:"Project Manager",nav:["dash","clients","leads","content","briefs","posters","shoots","meetings","smm","delivery","videos","subs","adbriefs","ads","igstats","igmsg","reports"],scope:"Kontent, dizayn və videonu görür, təsdiq verirsən.",approver:"pm"},
  content:{label:"Kontent Menecer",nav:["dash","content","posters","shoots","delivery","subs","meetings"],scope:"Kontenti PDF hazırlayır, təsdiqə göndərirsən. Çəkiliş cədvəlini, çəkiliş təhvilini və iclasları görürsən.",maker:true},
  account:{label:"Account Manager",nav:["dash","clients","smm","delivery","igstats","briefs","adbriefs"],scope:"Yalnız öz məkanlarını görürsən: SMM planı, çəkiliş təhvili (videolar), dizayn və targeting brifləri, öz taskların və bütün Account-lara verilən tasklar.",briefMaker:true},
  designer:{label:"Dizayner",nav:["dash","briefs","posters"],scope:"Brifi özün götür, hazırla (PSD+JPG), təsdiqə göndər.",designer:true},
  motion:{label:"Motion Dizayner",nav:["dash","briefs"],scope:"Təsdiqlənmiş motion briflərini götür, hazırla, Drive-a yüklə.",motion:true},
  coordinator:{label:"Koordinator",nav:["dash","clients","content","shoots","delivery","videos"],scope:"Çəkilişləri planlayır və nəticəni qeyd edir.",coordinator:true},
  operator:{label:"Videoqraf/Fotoqraf",nav:["dash","shoots","delivery","videos"],scope:"Öz çəkilişlərin — montaja keçir, hazırdır et.",operator:true},
  editor:{label:"Montajçı",nav:["dash","content","delivery","videos","subs"],scope:"Montaj və təhvil növbəsi. Kontent planlarına baxa bilərsən."},
  responder:{label:"Cavabçı (SMM)",nav:["dash","igmsg"],scope:"Təyin olunmuş məkanların Instagram mesajlarına cavab ver: B.e.–Şənbə 25 dəqiqə, Bazar 4 saat ərzində (10:00–20:00)."},
  targeting:{label:"Targetoloq",nav:["dash","adbriefs","ads","videos"],scope:"Targeting briflərini götür, reklamın adına brif kodunu yaz (MZ-…)."}
};
/* Tasklar və Klientlər hər kəsə görünür (dash-dan sonra) */
/* İclas cədvəlini tam görən rollar; qalanları yalnız dəvət olunduqları ofis iclaslarını görür */
const MEET_FULL=new Set(Object.keys(ROLES).filter(k=>ROLES[k].nav.includes("meetings")));
const meetFull=()=>MEET_FULL.has(role);
Object.values(ROLES).forEach(r=>{if(!r.nav.includes("meetings"))r.nav.push("meetings");});
Object.values(ROLES).forEach(r=>{if(!r.nav.includes('tasks'))r.nav.splice(1,0,'tasks');if(!r.nav.includes('clients'))r.nav.splice(2,0,'clients');});
/* Ofis — rəhbərlik üçün */
/* Ofis hamıya açıqdır: hər əməkdaş komandanın vəziyyətini görür */
Object.values(ROLES).forEach(r=>{if(!r.nav.includes("ofis"))r.nav.splice(1,0,"ofis");});
/* İstirahət zonası — hamı üçün */
Object.values(ROLES).forEach(r=>{if(!r.nav.includes("lounge"))r.nav.push("lounge");});
/* To-do — hər kəsin şəxsi siyahısı (dash-dan sonra) */
Object.values(ROLES).forEach(r=>{if(!r.nav.includes("todo"))r.nav.splice(1,0,"todo");});
const TASK_MANAGERS=["ceo","pm","marketing"];
/* Yaradan öz yazısını silə bilir; created_by-dan əvvəlki köhnə yazılar üçün yaradıcı rol (oldRole) götürülür */
const isOwner=(x,oldRole)=>!!(me&&x&&(x.created_by?x.created_by===me.id:role===oldRole));
const TASK_STAGES=["Yeni","İcrada","Təsdiq gözləyir","Təsdiqləndi"];
const TASK_DONE=["Təsdiqləndi","Təhvil verildi"];
function taskDone(t){return TASK_DONE.includes(t.status);}
const VIEWS={
  lounge:{t:"İstirahət",d:"Fasilədə komanda ilə oyna: UNO, Şaşki, Nərd və Brend viktorinası (təkbaşına da oynanılır)."},
  ofis:{t:"Ofis",d:"Komanda hazırda nə üzərində işləyir — işçiyə bas, növbəsinə bax."},
  dash:{t:"İdarə paneli",d:"Sənin bugünkü növbən — ən vacibi yuxarıdadır."},
  todo:{t:"To-do",d:"Şəxsi iş siyahın — yalnız sən görürsən. PM-lər CEO-dan başqa hamının, CEO isə hamının siyahısını görür."},
  tasks:{t:"Tasklar",d:"Tapşırıqlar — CEO, PM və Marketinq yaradır; hər vəzifə öz taskını görür."},
  igstats:{t:"Hesab analitikası",d:"Məkanların Instagram statistikası: reach, profil baxışı, görüntülənmə, paylaşılan postlar və aylıq hesabat (PDF)."},
  videos:{t:"Video rəyləri",d:"Bütün videolar bir yerdə: saniyəyə bağlı montaj qeydləri və targetoloqun reklam rəyi (1–5 ulduz)."},
  leads:{t:"Yeni müştərilər",d:"Potensial müştərilər: Instagram auditi (Apify), satış mərhələləri və bir kliklə təklif səhifəsi. CEO, PM və Marketinq.",add:"+ Yeni lid"},
  clients:{t:"Klientlər",d:"Klient bazası, paketlər və status.",add:"+ Yeni klient"},
  content:{t:"Kontent",d:"Kontent menecer PDF hazırlayır; CEO, Marketinq və PM təsdiqləyir.",add:"+ Yeni kontent"},
  briefs:{t:"Dizayn Brifləri",d:"Account brif verir; dizayner hazırlayır; CEO, Marketinq, PM təsdiqləyir.",add:"+ Yeni brif"},
  shoots:{t:"Çəkiliş Cədvəli",d:"Koordinator planlayır və nəticəni qeyd edir.",add:"+ Yeni çəkiliş"},
  delivery:{t:"Çəkiliş Təhvili",d:"Video: Montaja keçir → Hazırdır → CEO·Marketinq·PM təsdiqi."},
  adbriefs:{t:"Targeting Brifləri",d:"Account, CEO və PM reklam materialını göndərir; targetoloq reklama qoyur — panel Meta-da kodla yoxlayır.",add:"+ Yeni brif"},
  igmsg:{t:"Instagram Mesajları",d:"Məkanların Instagram mesajları — gündəlik say, cavab müddəti və gecikmələr."},
  ads:{t:"Reklam Analizi",d:"Meta reklamlarının gündəlik nəticələri — hər müştəri üzrə."},
  smm:{t:"SMM Plan",d:"Account Managerlərin paylaşım planı. Vaxtı gələndə paylaşılmayıbsa Account-a, paylaşılmasa CEO və PM-ə bildiriş gedir.",add:"+ Paylaşım"},
  meetings:{t:"İclas Cədvəli",d:"Məkanlarla iclaslar, yeni məkan görüşləri və işçilər arası ofis iclasları — PM və CEO. Məkan iclasından sonra 3 gün ərzində hesabat verilməlidir.",add:"+ Yeni iclas"},
  reports:{t:"Aylıq Hesabat",d:"PM və Marketinq məkanlarla iclasdan sonra CEO-ya hesabat verir."},
  finance:{t:"Maliyyə",d:"Ödənişlər, xərclər və xalis gəlir."},
  team:{t:"Komanda / İstifadəçilər",d:"İstifadəçilər və vəzifələr — yalnız CEO təyin edir."},
  attendance:{t:"Giriş-çıxış",d:"Ofis Wi-Fi-ına görə gündəlik giriş və çıxış, həmçinin panelə kim nə vaxt girib-çıxıb — yalnız CEO görür. İş saatı 10:00–18:00."},
  subs:{t:"AI Subtitr",d:"Danışıqlı videolara avtomatik subtitr və animasiya — Gemini səsi tanıyır, Claude stil qaydalarına görə hazırlayır."},
  posters:{t:"Poster Studio",d:"Müğənni, lineup və xüsusi gün afişaları üçün yazısız AI şəkillər — yazını dizayner qoyur."},
  audit:{t:"Dəyişiklik tarixçəsi",d:"Kim nəyi yaratdı, dəyişdi və ya sildi — yalnız CEO görür."}
};
const CONTENT_KINDS=[["kontent","📋 Kontent"],["atmosfer","🎬 Atmosfer"],["dizayn","🎨 Dizayn"]];
const kindLabel=k=>(CONTENT_KINDS.find(x=>x[0]===(k||"kontent"))||CONTENT_KINDS[0])[1];
const CONTENT_STAGES=["Hazırlanır","Təsdiq gözləyir","Təsdiqləndi","Yerləşdirildi"];
const BRIEF_STAGES=["Açıq","İcrada","Təsdiq gözləyir","Motion","Hazır"];
/* Kanban sütunları: Motion mərhələsi üç sütuna bölünür (motion_stage-ə görə) */
const BRIEF_COLS=[{st:"Açıq"},{st:"İcrada"},{st:"Təsdiq gözləyir"},
  {st:"Motion",ms:"",lb:"Motion · Gözləyir"},{st:"Motion",ms:"İcrada",lb:"Motion · İcrada"},{st:"Motion",ms:"Təsdiq gözləyir",lb:"Motion · Təsdiq gözləyir"},{st:"Hazır"}];
const motionCol=b=>{const m=b.motion_stage||"";return m==="İcrada"||m==="Təsdiq gözləyir"?m:(b.motion_by?"İcrada":"");};
const SHOOT_STAGES=["Çəkildi","Montajda","Hazırdır","Təsdiqləndi"];
const APPROVERS=[["ceo","CEO"],["marketing","Marketinq"],["pm","PM"]];
const PAY_CYCLE=["Gözləyir","Faktura","Ödənildi","Gecikib"];
const MONTHS_AZ=["Yanvar","Fevral","Mart","Aprel","May","İyun","İyul","Avqust","Sentyabr","Oktyabr","Noyabr","Dekabr"];

/* ---------- State ---------- */
let me=null, role="", view="dash", loadedUid=null, rtSub=null, shootView=(typeof window!=="undefined"&&window.innerWidth<640?"tbl":"cal"), calY=new Date().getFullYear(), calM=new Date().getMonth(), taskFilter="", shootKind="kontent", deliveryKind="kontent";
let adsRange="today", adsData={}, adsTab="metrics", adsOnlyDown=false, adsClient="";
const state={ad_issues:[],smm_media:[],todos:[],todo_checks:[],annotations:[],meetings:[],clients:[],content:[],briefs:[],shoots:[],payments:[],expenses:[],tasks:[],comments:[],notifications:[],reports:[],profiles:[],ad_briefs:[],ig_accounts:[],smm_venues:[],smm_posts:[],leads:[],proposals:[],client_feedback:[],prospects:[],prospect_runs:[],proposal_visits:[],ads_alerts:[]};

/* ---------- Helpers ---------- */
const $=s=>document.querySelector(s);
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const money=n=>Number(n||0).toLocaleString("az-AZ")+" ₼";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const myName=()=> me?(me.full_name||me.username):"";
function statusChip(s){const m={"Aktiv":"c-good","Onboarding":"c-accent","Pauza":"c-warn","Lead":"c-mut","Ödənildi":"c-good","Faktura":"c-accent","Gözləyir":"c-warn","Gecikib":"c-crit"};return `<span class="chip dot ${m[s]||'c-mut'}">${esc(s)}</span>`;}
const apprCount=(r,pre)=>APPROVERS.filter(a=>r[pre+a[0]]).length;
const allAppr=(r,pre)=>APPROVERS.every(a=>r[pre+a[0]]);
// Tam təsdiq: CEO, Marketinq və ya PM-dən birinin təsdiqi kifayətdir
const fullAppr=(r,pre)=>APPROVERS.some(a=>!!r[(pre||"")+a[0]]);
function applyTheme(t){if(t)document.documentElement.setAttribute("data-theme",t);else document.documentElement.removeAttribute("data-theme");try{localStorage.setItem("mm_theme",t);}catch(e){}}
function curTheme(){try{return localStorage.getItem("mm_theme")||"";}catch(e){return"";}}

/* ---------- Data ---------- */
/* Account yalnız öz məkanlarını görür (SMM Plan-da ona təyin olunan məkanlar). RAW — süzülməmiş siyahı */
const ACC_SCOPE={clients:"name",briefs:"client",ad_briefs:"client",ad_issues:"client",content:"client",shoots:"client",meetings:"client",reports:"client"};
const ACC_RAW={};
function accVenues(){return new Set(state.smm_venues.filter(v=>me&&v.account_id===me.id).map(v=>String(v.client||"").trim().toLocaleLowerCase("az")));}
/* Project Manager da yalnız öz məkanlarını görür (CEO «PM bölgüsü»ndə təyin edir; təyin olunmayan məkanlar bütün PM-lərə görünür).
   Çəkiliş cədvəli (shoots) istisnadır — PM-lər bütün çəkilişləri görür; Çatdırılma və Videolar isə ayrıca süzülür. */
const PM_SCOPE={clients:"name",briefs:"client",ad_briefs:"client",ad_issues:"client",content:"client",meetings:"client",reports:"client"};
const scopeOf=()=>role==="account"?ACC_SCOPE:role==="pm"?PM_SCOPE:null;
/* Targetoloq yalnız özünə təyin olunmuş (və hələ heç kimə təyin olunmamış) məkanları görür (CEO «Targeting bölgüsü»ndə təyin edir) */
const TG_SCOPE={clients:"name",ad_briefs:"client",ad_issues:"client",shoots:"client"};
const allClients=()=>ACC_RAW.clients||state.clients;
function applyAccScope(){
  if(role==="targeting"&&me){
    Object.entries(TG_SCOPE).forEach(([t,k])=>{const rows=ACC_RAW[t]||state[t]||[];state[t]=rows.filter(r=>tgClientOk(r[k])||(r.created_by&&r.created_by===me.id)||(t==="ad_briefs"&&r.taken_by===me.id));});
    return;}
  if(role==="pm"&&me){
    Object.entries(PM_SCOPE).forEach(([t,k])=>{const rows=ACC_RAW[t]||state[t]||[];state[t]=rows.filter(r=>pmClientOk(r[k])||(r.created_by&&r.created_by===me.id));});
    const ids=new Set(state.clients.map(c=>c.id));state.ig_accounts=(ACC_RAW.ig_accounts||state.ig_accounts).filter(a=>!a.client_id||ids.has(a.client_id));
    return;}
  if(role!=="account"||!me)return;
  const mv=accVenues();const has=n=>mv.has(String(n||"").trim().toLocaleLowerCase("az"));
  Object.entries(ACC_SCOPE).forEach(([t,k])=>{const rows=ACC_RAW[t]||state[t]||[];state[t]=rows.filter(r=>has(r[k])||(r.created_by&&r.created_by===me.id)||(t==="meetings"&&r.kind==="office"));});
  const ids=new Set(state.clients.map(c=>c.id));
  state.ig_accounts=(ACC_RAW.ig_accounts||state.ig_accounts).filter(a=>ids.has(a.client_id));
}
/* Bildirişlər: yalnız mənə aid, son 60 gün, ən çox 500 (əvvəl bütün komandanın 5000+ bildirişi ~2.4 MB hər açılışda və hər yeni bildirişdə yüklənirdi) */
function notifQuery(){
  let q=sb.from('notifications').select('*').gte('created_at',new Date(Date.now()-60*864e5).toISOString());
  if(me&&role)q=q.or(`target_type.eq.all,and(target_type.eq.role,target.eq.${role}),and(target_type.eq.user,target.eq.${me.id})`);
  return q.order('created_at',{ascending:false}).limit(500);
}
const tableQuery=t=>t==='notifications'?notifQuery():sb.from(t).select('*').order('created_at',{ascending:true});
async function reload(t){
  const {data}=await tableQuery(t);
  state[t]=data||[];
  if(ACC_SCOPE[t]||t==="ig_accounts"){ACC_RAW[t]=state[t];applyAccScope();}else if(t==="smm_venues")applyAccScope();
  if(role) render();
  if(window._chatRefresh)try{window._chatRefresh();}catch(e){}
  if(window._annRefresh)try{window._annRefresh();}catch(e){}
}
async function reloadProfiles(){ const {data}=await sb.from('profiles').select('*').order('username'); state.profiles=data||[]; avAfterLoad(); }
async function loadAll(){
  await Promise.all([
    sb.from('clients').select('*').order('created_at').then(r=>state.clients=r.data||[]),
    sb.from('content').select('*').order('created_at').then(r=>state.content=r.data||[]),
    sb.from('briefs').select('*').order('created_at').then(r=>state.briefs=r.data||[]),
    sb.from('shoots').select('*').order('created_at').then(r=>state.shoots=r.data||[]),
    sb.from('shoot_drafts').select('*').order('created_at').then(r=>state.shoot_drafts=r.data||[]),
    sb.from('payments').select('*').order('created_at').then(r=>state.payments=r.data||[]),
    sb.from('expenses').select('*').order('created_at').then(r=>state.expenses=r.data||[]),
    sb.from('tasks').select('*').order('created_at').then(r=>state.tasks=r.data||[]),
    sb.from('todos').select('*').order('created_at').then(r=>state.todos=r.data||[]),
    sb.from('todo_checks').select('*').gte('day',todoDay(-60)).order('created_at').then(r=>state.todo_checks=r.data||[]),
    sb.from('comments').select('*').order('created_at').then(r=>state.comments=r.data||[]),
    notifQuery().then(r=>state.notifications=r.data||[]),
    sb.from('reports').select('*').order('created_at',{ascending:false}).then(r=>state.reports=r.data||[]),
    sb.from('meetings').select('*').order('created_at').then(r=>state.meetings=r.data||[]),
    sb.from('annotations').select('*').order('created_at').then(r=>state.annotations=r.data||[]),
    sb.from('ad_briefs').select('*').order('created_at').then(r=>state.ad_briefs=r.data||[]),
    sb.from('ad_issues').select('*').order('created_at').then(r=>state.ad_issues=r.data||[]),
    sb.from('ig_accounts').select('*').order('created_at').then(r=>state.ig_accounts=r.data||[]),
    sb.from('smm_venues').select('*').order('created_at').then(r=>state.smm_venues=r.data||[]),
    sb.from('smm_posts').select('*').order('created_at').then(r=>state.smm_posts=r.data||[]),
    sb.from('smm_media').select('*').order('created_at').then(r=>state.smm_media=r.data||[]),
    sb.from('leads').select('*').order('created_at').then(r=>state.leads=r.data||[]),
    sb.from('proposals').select('*').order('created_at').then(r=>state.proposals=r.data||[]),
    sb.from('client_feedback').select('*').order('created_at').then(r=>state.client_feedback=r.data||[]),
    sb.from('prospects').select('*').order('found_at').then(r=>state.prospects=r.data||[]),
    sb.from('prospect_runs').select('*').order('started_at').then(r=>state.prospect_runs=r.data||[]),
    sb.from('proposal_visits').select('*').order('started_at').then(r=>state.proposal_visits=r.data||[]),
    sb.from('game_rooms').select('id,game,status,players,host,invited,updated_at').in('status',['waiting','playing']).gte('updated_at',new Date(Date.now()-6*36e5).toISOString()).then(r=>state.game_live=r.data||[]),
    sb.from('ads_alerts').select('*').gte('created_at',new Date(Date.now()-30*864e5).toISOString()).order('created_at').then(r=>state.ads_alerts=r.data||[]),
    reloadProfiles()
  ]);
  [...Object.keys(ACC_SCOPE),"ig_accounts"].forEach(t=>{ACC_RAW[t]=state[t];});applyAccScope();
}
function subscribeRealtime(){
  if(rtSub)return;
  rtSub=sb.channel('crm-live').on('postgres_changes',{event:'*',schema:'public'},payload=>{
    const t=payload.table;
    if(t==='notifications'&&payload.eventType==='INSERT')maybeBrowserNotify(payload.new);
    if(t==='game_rooms'){gameEvt(payload);return;}
    if(t==='ig_waits'){igReload();return;}
    if(t==='profiles'||state[t]!==undefined)rtQueue(t);
  }).subscribe(st=>{rtStatus=st;updLive();});
}
/* Realtime dəyişiklikləri yığılır: bir neçə yüz ms ərzində gələnlər bir dəfə yüklənir və BİR dəfə çəkilir.
   Data dəyişməyibsə çəkilmir; istifadəçi scroll / klik / yazı edərkən və tab gizlidirkən çəkmə gözlədilir
   (smm-autocheck hər 10 dəq ~30 sətir yeniləyir — əvvəl hər biri ayrıca tam render edirdi → «donma»). */
const rtPend=new Set(),rtSig={};let rtT=0,rtLastAct=0,rtDirty=false;
["scroll","wheel","touchstart","touchmove","pointerdown","keydown"].forEach(ev=>addEventListener(ev,()=>{rtLastAct=Date.now();},{passive:true,capture:true}));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&(rtPend.size||rtDirty)&&!rtT)rtT=setTimeout(rtFlush,300);});
function rtQueue(t){rtPend.add(t);if(!rtT)rtT=setTimeout(rtFlush,500);}
async function rtFlush(){
  rtT=0;if(!rtPend.size)return;
  if(document.visibilityState!=="visible")return;
  if(Date.now()-rtLastAct<1200){rtT=setTimeout(rtFlush,600);return;}
  const ts=[...rtPend];rtPend.clear();let changed=false;
  await Promise.all(ts.map(async t=>{
    if(t==='profiles'){const before=JSON.stringify(state.profiles);await reloadProfiles();if(JSON.stringify(state.profiles)!==before)changed=true;return;}
    const {data,error}=await tableQuery(t);if(error)return;
    const sig=JSON.stringify(data||[]);if(rtSig[t]===sig)return;rtSig[t]=sig;
    state[t]=data||[];changed=true;
    if(ACC_SCOPE[t]||t==="ig_accounts"){ACC_RAW[t]=state[t];applyAccScope();}else if(t==="smm_venues")applyAccScope();
  }));
  if(changed)rtDirty=true;
  if(rtT)return;
  if(rtPend.size){rtT=setTimeout(rtFlush,500);return;}
  if(rtDirty)rtRender();
}
function rtRender(){rtT=0;if(document.visibilityState!=="visible")return;
  if(Date.now()-rtLastAct<1200){rtT=setTimeout(rtRender,600);return;}
  if(rtPend.size){rtFlush();return;}
  if(!rtDirty)return;rtDirty=false;
  if(role)render();
  if(window._chatRefresh)try{window._chatRefresh();}catch(e){}
  if(window._annRefresh)try{window._annRefresh();}catch(e){}
}
async function ins(t,row){const {error}=await sb.from(t).insert(row);if(error)alert("Xəta: "+error.message);await reload(t);}
async function upd(t,id,patch){const {error}=await sb.from(t).update(patch).eq('id',id);if(error)alert("Xəta: "+error.message);await reload(t);}
async function del(t,id){const {error}=await sb.from(t).delete().eq('id',id);if(error)alert("Xəta: "+error.message);await reload(t);}

/* ---------- Files ---------- */
function pickFileBlob(accept){return new Promise(res=>{const i=document.createElement('input');i.type='file';if(accept)i.accept=accept;i.onchange=()=>res(i.files&&i.files[0]||null);i.click();});}
function pickFiles(accept){return new Promise(res=>{const i=document.createElement('input');i.type='file';i.multiple=true;if(accept)i.accept=accept;i.onchange=()=>res(i.files?[...i.files]:[]);i.click();});}
function pickFolderFiles(){return new Promise(res=>{const i=document.createElement('input');i.type='file';i.multiple=true;try{i.webkitdirectory=true;i.setAttribute('webkitdirectory','');i.setAttribute('directory','');}catch(e){}i.onchange=()=>res(i.files?[...i.files]:[]);i.click();});}
function driveId(url){const s=String(url);const m=s.match(/\/d\/([^/]+)/)||s.match(/[?&]id=([^&]+)/);return m?m[1]:null;}
function openDriveVideo(url){
  const id=driveId(url);const src=id?("https://drive.google.com/file/d/"+id+"/preview"):url;
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:840px;width:94vw"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><strong style="display:inline-flex;align-items:center;gap:6px">${ICON.play} Video baxış</strong><a href="${esc(url)}" target="_blank" rel="noopener" class="chip c-accent" style="text-decoration:none">Drive-da aç ↗</a><button class="btn ghost" id="vx" style="margin-left:auto;padding:6px 12px">Bağla</button></div><div style="position:relative;padding-top:56.25%;background:#000;border-radius:10px;overflow:hidden"><iframe src="${esc(src)}" allow="autoplay; fullscreen" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div><div class="hint" style="white-space:normal;margin-top:8px">Oynamırsa, videonun Drive-da hazırlanması bir neçə dəqiqə çəkə bilər — «Drive-da aç» ilə birbaşa aç.</div></div>`;
  document.body.appendChild(scrim);
  const close=()=>scrim.remove();scrim.querySelector("#vx").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
}
function openMedia(url){ if(driveId(url))openDriveVideo(url); else window.open(url,'_blank'); }
async function uploadTo(prefix,file){
  const clean=file.name.replace(/[^\w.\-]+/g,'_');
  const path=prefix+"/"+Date.now()+"_"+clean;
  const {error}=await sb.storage.from('crm-files').upload(path,file,{upsert:true});
  if(error){alert("Yükləmə xətası: "+error.message);return null;}
  return path;
}
async function openFile(path){
  if(/^https?:\/\//.test(path)){window.open(path,'_blank');return;}
  const w=window.open('','_blank');  // klikdə dərhal aç — telefon brauzeri gecikmiş pop-up-ı bloklayır
  const {data,error}=await sb.storage.from('crm-files').createSignedUrl(path,3600);
  if(data&&data.signedUrl){if(w)w.location.href=data.signedUrl;else location.href=data.signedUrl;}
  else{if(w)w.close();alert("Fayl açılmadı: "+(error?error.message:''));}
}
function fileChip(path,label){ if(!path)return ""; const isUrl=/^https?:\/\//.test(path); const nm=isUrl?(label||"Fayl (Drive)"):path.split('/').pop().replace(/^\d+_/,''); const ic=isUrl?ICON.link:ICON.file; return `<a class="chip c-accent" style="font-size:10.5px;padding:3px 8px;cursor:pointer;text-decoration:none" data-file="${esc(path)}">${ic}${esc(label||nm)}</a>`; }
function wireFiles(root){root.querySelectorAll('[data-file]').forEach(a=>a.onclick=e=>{e.preventDefault();openFile(a.dataset.file);});root.querySelectorAll('[data-dl]').forEach(a=>a.onclick=e=>{e.preventDefault();downloadFile(a.dataset.dl);});}
/* Brif faylları: briefs.brief_file — JSON massiv (storage yolları); köhnə tək yol da oxunur */
function briefFiles(b){const v=b&&b.brief_file;if(!v)return [];if(String(v).trim().startsWith('[')){try{const a=JSON.parse(v);return Array.isArray(a)?a.filter(Boolean):[];}catch(e){return [];}}return [v];}
const fileName=path=>/^https?:\/\//.test(path)?"Fayl":String(path).split('/').pop().replace(/^\d+_/,'');
async function downloadFile(path){
  if(/^https?:\/\//.test(path)){window.open(path,'_blank');return;}
  const {data,error}=await sb.storage.from('crm-files').createSignedUrl(path,3600,{download:fileName(path)});
  if(data&&data.signedUrl){const a=document.createElement('a');a.href=data.signedUrl;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();}
  else alert("Fayl yüklənmədi: "+(error?error.message:''));
}

/* ---------- Icons (Lucide-style, currentColor) ---------- */
const MOON_IC=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7z"/></svg>`;
const IC=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON={
  replace:IC('<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 4v5h-5"/>'),
  edit:IC('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  trash:IC('<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>'),
  cloud:IC('<path d="M12 16.5V9m0 0-2.6 2.6M12 9l2.6 2.6"/><path d="M6.5 18A4 4 0 0 1 6 10a6 6 0 0 1 11.5-1.5A4.5 4.5 0 0 1 17.5 18Z"/>'),
  link:IC('<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>'),
  play:IC('<path d="M7 5.5v13a1 1 0 0 0 1.5.85l10.5-6.5a1 1 0 0 0 0-1.7L8.5 4.65A1 1 0 0 0 7 5.5Z"/>'),
  attach:IC('<path d="M21 8.5 12.3 17.2a4 4 0 0 1-5.7-5.7l8.1-8.1a2.6 2.6 0 0 1 3.7 3.7l-8.1 8.1a1.2 1.2 0 0 1-1.7-1.7l7.4-7.4"/>'),
  file:IC('<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/>'),
  arrow:IC('<path d="M5 12h13m0 0-5-5m5 5-5 5"/>'),
  check:IC('<path d="M4 12.5 9 17.5 20 6.5"/>'),
  camVideo:IC('<rect x="3" y="6.5" width="12" height="11" rx="2"/><path d="M15 10.5l6-3.5v10l-6-3.5"/>'),
  camPhoto:IC('<path d="M4.5 8h2.5l1.2-1.8h7.6L17 8h2.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-8A1.5 1.5 0 0 1 4.5 8Z"/><circle cx="12" cy="13" r="3"/>'),
  palette:IC('<path d="M12 21a9 9 0 1 1 9-9c0 2.2-1.8 3.5-3.5 3.5H16a1.6 1.6 0 0 0-1.2 2.7A1.7 1.7 0 0 1 12 21Z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="16.5" cy="11" r="1.1"/>'),
  dash:IC('<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>'),
  users:IC('<circle cx="9" cy="8" r="3.3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M18.5 20a5.6 5.6 0 0 0-3.2-5"/>'),
  layers:IC('<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="M3 13l9 5 9-5M3 17l9 5 9-5" opacity=".55"/>'),
  film:IC('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7.5 4v16M16.5 4v16M3 9h4.5m9 0H21M3 15h4.5m9 0H21"/>'),
  shield:IC('<path d="M12 3l7.5 3v5.2c0 4.7-3.2 8-7.5 9.3-4.3-1.3-7.5-4.6-7.5-9.3V6Z"/><path d="M9 12l2 2 4-4"/>'),
  sun:IC('<circle cx="12" cy="12" r="4"/><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>'),
  logout:IC('<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M16.5 12H10m6.5 0-3-3m3 3-3 3"/>'),
  x:IC('<path d="M6 6l12 12M18 6 6 18"/>'),
  folder:IC('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M12 11v5m-2.5-2.5L12 11l2.5 2.5" opacity=".9"/>'),
  tasks:IC('<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 12l2 2 4-4"/>'),
  plus:IC('<path d="M12 5v14M5 12h14"/>'),
  clock:IC('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>'),
  chat:IC('<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l.8-5.5A8 8 0 1 1 21 12Z"/><path d="M8.5 11h7M8.5 14h4" opacity=".85"/>'),
  bell:IC('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  megaphone:IC('<path d="M3 11v2a1 1 0 0 0 1 1h2l3.5 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M14 8a4 4 0 0 1 0 8M16.5 5a8 8 0 0 1 0 14"/>'),
  play2:IC('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5Z"/>'),
  search:IC('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  history:IC('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4v4h4"/><path d="M12 8v4.2l2.8 1.8"/>')
};
/* ---------- Auth screens ---------- */
const LOGO=`<svg width="44" height="28" viewBox="0 0 60 34" fill="none" aria-hidden="true"><path d="M30 17c-5-11-13-13-19-8s-4 17 4 17 10-9 15-9 7 9 15 9 10-12 4-17-14-3-19 8Z" stroke="var(--accent)" stroke-width="3.4" fill="none"/></svg>`;
function showAuth(reg,msg){
  const app=$("#app");
  const extra=reg?`<input id="au" class="linp" placeholder="İstifadəçi adı (görünən ad)" autocomplete="username">`:"";
  const confirm=reg?`<input id="ap2" class="linp" type="password" placeholder="Parolu təkrar yaz" autocomplete="new-password">`:"";
  const toggle=reg?`Hesabın var? <a id="tog">Daxil ol</a>`:`Hesabın yoxdur? <a id="tog">Qeydiyyatdan keç</a>`;
  app.innerHTML=`<div class="login"><div class="lcard">${LOGO}
    <h2>MezMoon CRM</h2><p>${reg?"Qeydiyyat — öz parolunu yarat":"Sistemə daxil ol"}</p>
    <div class="lroles">
      <input id="ae" class="linp" type="email" placeholder="Email" autocomplete="email" autocapitalize="off" spellcheck="false">
      ${extra}
      <input id="ap" class="linp" type="password" placeholder="Parol" autocomplete="${reg?'new-password':'current-password'}">
      ${confirm}
      <button class="btn" id="abtn" style="padding:12px">${reg?"Qeydiyyatdan keç":"Daxil ol"}</button>
      ${reg?"":`<div style="text-align:right;font-size:12.5px"><a id="forgot">Parolu unutmusan?</a></div>`}
      <div id="aerr" class="hint" style="color:var(--crit);min-height:16px"></div>
    </div>
    <div class="hint" style="margin-top:12px">${toggle}</div>
  </div></div>`;
  const err=m=>{$("#aerr").textContent=m;};
  if(msg)err(msg);
  $("#tog").onclick=()=>showAuth(!reg);
  if(!reg)$("#forgot").onclick=()=>showForgot($("#ae").value.trim());
  const submit=async()=>{
    const email=$("#ae").value.trim().toLowerCase(), pass=$("#ap").value;
    $("#abtn").disabled=true;
    try{
      if(reg){
        const uname=$("#au").value.trim();
        if(!email||!pass){err("Email və parol yaz.");return;}
        if(pass.length<6){err("Parol ən azı 6 simvol olsun.");return;}
        if(pass!==$("#ap2").value){err("Parollar eyni deyil.");return;}
        const {data,error}=await sb.auth.signUp({email,password:pass,options:{data:{username:uname||email.split('@')[0]}}});
        if(error){err(error.message);return;}
        if(!data.session){err("Qeydiyyat oldu ✓ Email təsdiqi tələb olunur — poçtunu yoxla, sonra daxil ol.");return;}
      }else{
        const {error}=await sb.auth.signInWithPassword({email,password:pass});
        if(error){err(/not confirmed/i.test(error.message)?"Email hələ təsdiqlənməyib — poçtunu yoxla.":"Yanlış email və ya parol. Emaili qeydiyyatdakı kimi yazdığına əmin ol, ya da «Parolu unutmusan?» ilə yenilə.");return;}
      }
    }finally{ $("#abtn").disabled=false; }
  };
  $("#abtn").onclick=submit;
  (reg?$("#ap2"):$("#ap")).addEventListener("keydown",e=>{if(e.key==="Enter")submit();});
  $("#ae").focus();
}
/* Parol yeniləmə: email-ə link göndərilir; link sayta qayıdanda showNewPassword açılır. */
function showForgot(prefill){
  const app=$("#app");
  app.innerHTML=`<div class="login"><div class="lcard">${LOGO}
    <h2>Parolu yenilə</h2><p>Emailini yaz — parol yeniləmə linki göndərək</p>
    <div class="lroles">
      <input id="fe" class="linp" type="email" placeholder="Email" autocomplete="email" autocapitalize="off" spellcheck="false">
      <button class="btn" id="fbtn" style="padding:12px">Link göndər</button>
      <div id="fmsg" class="hint" style="min-height:16px"></div>
    </div>
    <div class="hint" style="margin-top:12px"><a id="back">← Girişə qayıt</a></div>
  </div></div>`;
  const msg=(m,bad)=>{const d=$("#fmsg");d.textContent=m;d.style.color=bad?"var(--crit)":"var(--good)";};
  $("#fe").value=prefill||"";
  $("#back").onclick=()=>showAuth(false);
  const send=async()=>{
    const email=$("#fe").value.trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){msg("Düzgün email yaz.",true);return;}
    $("#fbtn").disabled=true;
    try{
      const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
      if(error){msg(/rate|seconds|too many/i.test(error.message)?"Çox tez-tez cəhd — bir az sonra yenidən yoxla.":"Xəta: "+error.message,true);return;}
      msg("✓ Bu email qeydiyyatdadırsa, link göndərildi. Poçtunu (və Spam qovluğunu) yoxla.");
    }finally{ $("#fbtn").disabled=false; }
  };
  $("#fbtn").onclick=send;
  $("#fe").addEventListener("keydown",e=>{if(e.key==="Enter")send();});
  $("#fe").focus();
}
function showNewPassword(){
  const app=$("#app");
  app.innerHTML=`<div class="login"><div class="lcard">${LOGO}
    <h2>Yeni parol</h2><p>Hesabın üçün yeni parol təyin et</p>
    <div class="lroles">
      <input id="np" class="linp" type="password" placeholder="Yeni parol (min. 6 simvol)" autocomplete="new-password">
      <input id="np2" class="linp" type="password" placeholder="Yeni parolu təkrar yaz" autocomplete="new-password">
      <button class="btn" id="nbtn" style="padding:12px">Parolu yadda saxla</button>
      <div id="nerr" class="hint" style="color:var(--crit);min-height:16px"></div>
    </div>
  </div></div>`;
  const err=m=>{$("#nerr").textContent=m;};
  const save=async()=>{
    const p=$("#np").value;
    if(p.length<6){err("Parol ən azı 6 simvol olsun.");return;}
    if(p!==$("#np2").value){err("Parollar eyni deyil.");return;}
    $("#nbtn").disabled=true;
    try{
      const {error}=await sb.auth.updateUser({password:p});
      if(error){err(/different from the old/i.test(error.message)?"Yeni parol köhnəsindən fərqli olmalıdır.":"Xəta: "+error.message);return;}
      recovering=false;
      const {data:{session}}=await sb.auth.getSession();
      handleSession(session);
    }finally{ const b=$("#nbtn");if(b)b.disabled=false; }
  };
  $("#nbtn").onclick=save;
  $("#np2").addEventListener("keydown",e=>{if(e.key==="Enter")save();});
  $("#np").focus();
}
function showLoadError(err){
  const app=$("#app");
  app.innerHTML=`<div class="login"><div class="lcard">${LOGO}
    <h2>Serverə qoşulmaq alınmadı</h2><p>Məlumat bazası hazırda cavab vermir. Bir azdan yenidən yoxla.</p>
    <div class="hint" style="font-size:12px;margin-bottom:16px;word-break:break-word">${esc(err&&(err.message||err.code)||"")}</div>
    <div style="display:flex;gap:8px;justify-content:center"><button class="btn" id="rt">Yenidən yoxla</button><button class="btn ghost" id="lo">Çıxış</button></div>
  </div></div>`;
  app.querySelector("#rt").onclick=()=>location.reload();app.querySelector("#lo").onclick=()=>sb.auth.signOut();
}
function showPending(){
  const app=$("#app");
  app.innerHTML=`<div class="login"><div class="lcard">${LOGO}
    <h2>MezMoon CRM</h2><p>Xoş gəldin, <strong>${esc(myName())}</strong>!</p>
    <div class="hint" style="font-size:13px;margin-bottom:16px;line-height:1.5">Hesabın yaradıldı ✓<br>Vəzifən (rolun) hələ təyin olunmayıb — CEO təyin edən kimi giriş avtomatik açılacaq.</div>
    <button class="btn ghost" id="lo" style="padding:11px">Çıxış</button>
  </div></div>`;
  $("#lo").onclick=()=>sb.auth.signOut();
}

/* ---------- Dashboard ---------- */
function tile(l,v,s,acc){return `<div class="tile ${acc?'accent':''}"><div class="lab">${l}</div><div class="val num">${v}</div>${s?`<div class="sub">${s}</div>`:""}</div>`;}
function tileC(l,v,s,col){return `<div class="tile" style="border-color:color-mix(in srgb,var(--${col}) 30%,var(--border))"><div class="lab">${l}</div><div class="val num" style="color:var(--${col})">${v}</div>${s?`<div class="sub">${s}</div>`:""}</div>`;}
function renderManagerBoard(){
  const wrap=el("div");wrap.style.marginBottom="16px";
  const open=state.tasks.filter(t=>!taskDone(t));
  const today=new Date();today.setHours(0,0,0,0);
  const daysOf=t=>{const d=parseDate(t.deadline);return d?Math.round((d-today)/86400000):null;};
  const who=t=>{const as=taskAssignees(t);return as.length?as.map(personName).join(", "):taskRoleLabel(t.role)+" · hamı";};
  const overdue=[],todayL=[],soon=[];
  open.forEach(t=>{const d=daysOf(t);if(d===null)return;if(d<0)overdue.push({t,d});else if(d===0)todayL.push({t,d});else if(d<=3)soon.push({t,d});});
  overdue.sort((a,b)=>a.d-b.d);soon.sort((a,b)=>a.d-b.d);
  // stat tiles
  const tiles=(overdue.length?tileC("Gecikən tasklar",overdue.length,"deadline keçib","crit"):tile("Gecikən tasklar",0,"deadline keçib"))
    +(todayL.length?tileC("Bu gün deadline",todayL.length,"","warn"):tile("Bu gün deadline",0,""))
    +tile("Yaxın 3 gün",soon.length,"")
    +tile("Açıq tasklar",open.length,"cəmi");
  wrap.appendChild(el("div","tiles",tiles));
  const mkRow=(t,chip)=>{const row=el("div","row");row.style.cursor="pointer";row.innerHTML=`<div class="main"><div class="t">${esc(t.title)}</div><div class="m"><span class="opcell">${ICON.users}${esc(who(t))}</span> · deadline ${fmtDate(t.deadline)}</div></div><div class="r">${chip}</div>`;row.onclick=()=>openTaskEdit(t);return row;};
  const gr=el("div","grid2");
  const op=el("div","panel");
  op.appendChild(el("div","ph",`<h3${overdue.length?' style="color:var(--crit)"':''}>⚠ Gecikən tasklar</h3><span class="count">${overdue.length}</span>`));
  const opb=el("div","pb");
  overdue.slice(0,8).forEach(({t,d})=>opb.appendChild(mkRow(t,`<span class="chip c-crit">${-d} gün gecikib</span>`)));
  if(!opb.children.length)opb.appendChild(el("div","empty","Gecikən task yoxdur 🎉"));
  op.appendChild(opb);gr.appendChild(op);
  const sp=el("div","panel");
  sp.appendChild(el("div","ph",`<h3>Bu gün / yaxın deadline</h3><span class="count">${todayL.length+soon.length}</span>`));
  const spb=el("div","pb");
  [...todayL,...soon].slice(0,8).forEach(({t,d})=>spb.appendChild(mkRow(t,d===0?`<span class="chip c-warn">Bu gün</span>`:`<span class="chip c-${d<=1?'warn':'good'}">${d} gün qalıb</span>`)));
  if(!spb.children.length)spb.appendChild(el("div","empty","Yaxın deadline yoxdur ✓"));
  sp.appendChild(spb);gr.appendChild(sp);
  wrap.appendChild(gr);
  // komanda yükü
  const roleOpen={},roleOver={};
  open.forEach(t=>{roleOpen[t.role]=(roleOpen[t.role]||0)+1;const d=daysOf(t);if(d!==null&&d<0)roleOver[t.role]=(roleOver[t.role]||0)+1;});
  const keys=Object.keys(roleOpen).sort((a,b)=>roleOpen[b]-roleOpen[a]);
  if(keys.length){
    const wp=el("div","panel");wp.style.marginTop="16px";
    wp.appendChild(el("div","ph",`<h3>Komanda yükü — açıq tasklar</h3><span class="count">${open.length}</span>`));
    const wb=el("div","pb");const max=Math.max(...keys.map(k=>roleOpen[k]),1);
    keys.forEach(k=>{const n=roleOpen[k],ov=roleOver[k]||0;const row=el("div","row");
      row.innerHTML=`<div class="main" style="max-width:170px;min-width:120px"><div class="t">${esc(taskRoleLabel(k))}</div></div><div style="flex:1;display:flex;align-items:center;gap:10px;min-width:0"><div style="flex:1;height:8px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="width:${Math.round(n/max*100)}%;height:100%;background:${ov?'var(--crit)':'var(--accent)'};opacity:.85"></div></div><span class="chip c-mut" style="font-size:11px;flex:none">${n} açıq${ov?` · <b style="color:var(--crit)">${ov} gecikən</b>`:""}</span></div>`;
      row.style.cursor="pointer";row.onclick=()=>{taskFilter=k;view="tasks";render();};wb.appendChild(row);});
    wp.appendChild(wb);wrap.appendChild(wp);
  }
  return wrap;
}
/* ---------- İdarə paneli: hər vəzifəyə öz «Növbəm» siyahısı (2026.10.24c) ---------- */
function dashWaiting(){
  const r=ROLES[role];const norm=(t,s2,cnt,mine,go)=>({t,s:s2,cnt,mine,go});
  const waitC=state.content.filter(c=>c.status==="Təsdiq gözləyir").map(c=>norm(c.title,esc(c.client)+" · Kontent",apprCount(c,'appr_'),r.approver?!c['appr_'+r.approver]:true,"content"));
  const waitB=state.briefs.filter(b=>b.status==="Təsdiq gözləyir").map(b=>norm(b.title,esc(b.client)+" · Dizayn",apprCount(b,'appr_'),r.approver?!b['appr_'+r.approver]:true,"briefs"));
  const waitV=[];state.shoots.filter(s=>s.held==="yes").forEach(s=>getVids(s).forEach((v,i)=>{if(v.stage===3)waitV.push(norm(s.client+" · Video "+(i+1),esc(s.client)+" · Video",APPROVERS.filter(a=>v[a[0]]).length,r.approver?!v[r.approver]:true,"delivery"));}));
  return [...waitC,...waitB,...waitV];
}
/* «21.10» → bu gündən neçə gün (keçmiş mənfi); il keçidi nəzərə alınır */
function ddDays(str){const sd=shootDate(str||"");if(!sd)return null;const t=new Date();t.setHours(0,0,0,0);let d=new Date(t.getFullYear(),sd.mo,sd.d);
  const diff=(d-t)/864e5;if(diff<-200)d=new Date(t.getFullYear()+1,sd.mo,sd.d);else if(diff>165)d=new Date(t.getFullYear()-1,sd.mo,sd.d);return Math.round((d-t)/864e5);}
const dayWord=n=>n===0?"bu gün":n===1?"sabah":n===-1?"dünən":n<0?(-n)+" gün əvvəl":n+" gün sonra";
const firstLine=x=>String(x||"").replace(/\r\n?/g,"\n").trim().split("\n")[0];
function dashQueue(){
  const pn=myName(),uid=me&&me.id,Q=[],T=[];const isMgr=TASK_MANAGERS.includes(role);
  const add=(pri,t,m,chip,go,act)=>Q.push({pri,t,m,chip,go,act});
  const M=bakuISO().slice(0,7);const inM=iso=>{const x=Date.parse(iso);return isFinite(x)&&bakuISO(x).slice(0,7)===M;};
  const today=new Date();today.setHours(0,0,0,0);
  const tDays=t=>{const d=parseDate(t.deadline);return d?Math.round((d-today)/864e5):null;};
  const bT=b=>firstLine(b.title)||"Brif";const bM=b=>esc(b.client||"—");
  /* Tasklar — rəhbərlər üçün yalnız şəxsən onlara verilən, digərləri üçün öz taskları */
  const myT=state.tasks.filter(t=>!taskDone(t)&&(isMgr?taskAssignees(t).includes(uid):taskIsMine(t)));
  myT.forEach(t=>{const d=tDays(t);const u=!!t.urgent;
    const [pri,chip]=d==null?[u?0:3,["mut","deadline yox"]]:d<0?[0,["crit",(-d)+" gün gecikib"]]:d===0?[u?0:1,["warn","bu gün"]]:[u?0:d<=2?1:2,["mut",fmtDate(t.deadline)]];
    add(pri,(u?"🔥 ":"")+t.title,"Task",chip,"tasks",()=>openTaskEdit(t));});
  switch(role){
    case "designer":{
      const open=state.briefs.filter(b=>b.status==="Açıq"),work=state.briefs.filter(b=>b.status==="İcrada"&&b.designer===pn),appr=state.briefs.filter(b=>b.status==="Təsdiq gözləyir"&&b.designer===pn);
      work.forEach(b=>add(b.urgent?0:1,(b.urgent?"🔥 ":"")+bT(b),bM(b)+" · icrandadır",["accent","İcrada"],"briefs"));
      open.forEach(b=>add(b.urgent?0:2,(b.urgent?"🔥 ":"")+bT(b),bM(b)+" · hələ heç kim götürməyib",["warn","Götür"],"briefs"));
      appr.forEach(b=>add(4,bT(b),bM(b)+" · təsdiq gözləyir",["mut","Təsdiqdə"],"briefs"));
      T.push(["Açıq brif",open.length,"götürülməyib",open.length?"warn":""],["İcramda",work.length,""],["Təsdiqdə",appr.length,""],["Bu ay hazır",state.briefs.filter(b=>b.designer===pn&&b.done_at&&inM(b.done_at)).length,""]);break;}
    case "motion":{
      const mo=state.briefs.filter(b=>b.status==="Motion");const wait=mo.filter(b=>!motionCol(b)),work=mo.filter(b=>motionCol(b)==="İcrada"&&b.motion_by===pn),appr=mo.filter(b=>motionCol(b)==="Təsdiq gözləyir"&&b.motion_by===pn);
      work.forEach(b=>add(b.urgent?0:1,(b.urgent?"🔥 ":"")+bT(b),bM(b)+" · motion icrandadır",["accent","İcrada"],"briefs"));
      wait.forEach(b=>add(b.urgent?0:2,(b.urgent?"🔥 ":"")+bT(b),bM(b)+" · dizayn hazırdır, motion gözləyir",["warn","Götür"],"briefs"));
      appr.forEach(b=>add(4,bT(b),bM(b),["mut","Təsdiqdə"],"briefs"));
      T.push(["Gözləyən motion",wait.length,"",wait.length?"warn":""],["İcramda",work.length,""],["Təsdiqdə",appr.length,""],["Bu ay hazır",state.briefs.filter(b=>b.motion_by===pn&&b.done_at&&inM(b.done_at)).length,""]);break;}
    case "account":{
      const od=smmOverdue(),td=smmPosts().filter(x=>x.status==="plan"&&x.post_date===bakuISO()&&Date.now()<smmDue(x));
      od.forEach(x=>add(0,(x.client||"—")+" · "+(x.kind==="video"?"Video":"Post"),"Paylaşım vaxtı keçib · "+smmDateAz(x.post_date),["crit","Gecikir"],"smm"));
      td.forEach(x=>add(1,(x.client||"—")+" · "+(x.kind==="video"?"Video":"Post"),"Bu gün · "+esc(x.post_time||smmVenueTime(null,x.kind)),["warn","Bu gün"],"smm"));
      const ba=state.briefs.filter(b=>b.status==="Təsdiq gözləyir"&&b.created_by===uid);
      ba.forEach(b=>add(1,bT(b),bM(b)+" · dizayn hazırdır",["accent","Təsdiqlə"],"briefs"));
      const ab=state.ad_briefs.filter(b=>b.created_by===uid);
      ab.filter(b=>b.status==="Problem").forEach(b=>add(0,firstLine(b.title||b.client)||"Targeting brifi",esc(b.client||"")+" · targetoloq problem qeyd edib",["crit","Problem"],"adbriefs"));
      T.push(["Gecikən paylaşım",od.length,"",od.length?"crit":""],["Bu gün paylaşım",td.length,""],["Təsdiqini gözləyir",ba.length,"dizayn",ba.length?"warn":""],["Açıq targeting",ab.filter(abOpen).length,""]);break;}
    case "content":{
      const mine=state.content.filter(c=>!c.created_by||c.created_by===uid);
      mine.filter(c=>c.status==="Hazırlanır").forEach(c=>add(2,c.title||"Kontent",esc(c.client||"")+" · hazırlanır",["accent","Hazırlanır"],"content"));
      mine.filter(c=>c.status==="Təsdiq gözləyir").forEach(c=>add(4,c.title||"Kontent",esc(c.client||"")+" · "+apprCount(c,'appr_')+"/3 təsdiq",["mut","Təsdiqdə"],"content"));
      const up=state.shoots.filter(x=>x.held===""&&(d=>d!=null&&d>=0&&d<=7)(ddDays(x.shoot_date)));
      up.forEach(x=>{const d=ddDays(x.shoot_date);add(d===0?1:3,(x.client||"Çəkiliş"),"Çəkiliş · "+dayWord(d)+(x.shoot_time?" · "+esc(x.shoot_time):""),[d===0?"warn":"mut",x.shoot_date],"shoots");});
      const mt=state.meetings.filter(m=>!m.held&&ddDays(m.meet_date)===0);
      mt.forEach(m=>add(1,(m.title||"İclas"),"İclas · bu gün"+(m.meet_time?" "+esc(m.meet_time):""),["warn","Bu gün"],"meetings"));
      T.push(["Hazırlanır",mine.filter(c=>c.status==="Hazırlanır").length,""],["Təsdiqdə",mine.filter(c=>c.status==="Təsdiq gözləyir").length,""],["7 gündə çəkiliş",up.length,""],["Bu ay yerləşdirilən",mine.filter(c=>c.status==="Yerləşdirildi"&&inM(c.created_at)).length,""]);break;}
    case "coordinator":{
      const pend=state.shoots.filter(x=>x.held===""&&(d=>d!=null&&d<0)(ddDays(x.shoot_date)));
      pend.forEach(x=>add(0,(x.client||"Çəkiliş"),"Çəkiliş "+dayWord(ddDays(x.shoot_date))+" idi — baş tutdumu?",["crit","Nəticəni yaz"],"shoots"));
      const up=state.shoots.filter(x=>x.held===""&&(d=>d!=null&&d>=0&&d<=7)(ddDays(x.shoot_date)));
      up.forEach(x=>{const d=ddDays(x.shoot_date);add(d===0?1:3,(x.client||"Çəkiliş"),dayWord(d)+(x.shoot_time?" · "+esc(x.shoot_time):"")+(x.video_op?" · "+esc(x.video_op):""),[d===0?"warn":"mut",x.shoot_date],"shoots");});
      const dl=state.shoots.filter(x=>x.held==="yes"&&shootOpenVids(x)>0);
      T.push(["Nəticə yazılmayıb",pend.length,"",pend.length?"crit":""],["7 gündə çəkiliş",up.length,""],["Təhvil gözləyir",dl.length,"çəkiliş"],["Bu ay planlanan",state.shoots.filter(x=>(d=>d&&d.mo===today.getMonth())(shootDate(x.shoot_date))).length,""]);break;}
    case "operator":{
      const mine=state.shoots.filter(x=>(Array.isArray(x.op_ids)&&x.op_ids.includes(uid))||x.video_op===pn||x.photo_op===pn);
      const up=mine.filter(x=>x.held===""&&(d=>d!=null&&d>=0&&d<=7)(ddDays(x.shoot_date)));
      up.forEach(x=>{const d=ddDays(x.shoot_date);add(d<=1?1:3,(x.client||"Çəkiliş"),"Çəkiliş · "+dayWord(d)+(x.shoot_time?" · "+esc(x.shoot_time):""),[d===0?"warn":"mut",x.shoot_date],"shoots");});
      const raw=mine.filter(x=>x.held==="yes"&&getVids(x).some(v=>v.stage===1));
      raw.forEach(x=>{const n=getVids(x).filter(v=>v.stage===1).length;add(1,(x.client||"Çəkiliş"),n+" video montaja ötürülməyib",["warn","Montaja ötür"],"delivery");});
      T.push(["7 gündə çəkiliş",up.length,""],["Montaja ötürülməyib",raw.length,"çəkiliş",raw.length?"warn":""],["Açıq video",mine.filter(x=>x.held==="yes").reduce((n,x)=>n+shootOpenVids(x),0),""]);break;}
    case "editor":{
      const L=[];state.shoots.filter(x=>x.held==="yes").forEach(x=>getVids(x).forEach((v,i)=>{if(v.stage===2)L.push({x,i});}));
      L.forEach(({x,i})=>add(1,(x.client||"")+" · Video "+(i+1),"Montajdadır",["accent","Montaj"],"delivery"));
      const openN=state.annotations.filter(a=>String(a.target).startsWith("vid:")&&!a.resolved&&a.kind!=="targeting").length;
      if(openN)add(0,"Düzəldilməmiş montaj qeydləri",openN+" qeyd video rəylərində gözləyir",["crit",String(openN)],"videos");
      T.push(["Montajda",L.length,"video"],["Açıq montaj qeydi",openN,"",openN?"warn":""],["Bu ay hazır",(()=>{let n=0;state.shoots.forEach(x=>getVids(x).forEach(v=>{if(v.ready_at&&inM(v.ready_at))n++;}));return n;})(),"komanda"]);break;}
    case "targeting":{
      const ab=state.ad_briefs;const nw=ab.filter(b=>b.status==="Göndərildi"),mine=ab.filter(b=>b.status==="Götürüldü"&&b.taken_by===uid),pr=ab.filter(b=>b.status==="Problem"&&b.taken_by===uid);
      pr.forEach(b=>add(0,firstLine(b.title||b.client)||"Brif",esc(b.client||"")+" · problem",["crit","Problem"],"adbriefs"));
      mine.forEach(b=>add(1,firstLine(b.title||b.client)||"Brif",esc(b.client||"")+" · reklama qoyulmalıdır",["accent","Reklama qoy"],"adbriefs"));
      nw.forEach(b=>add(2,firstLine(b.title||b.client)||"Brif",esc(b.client||"")+" · yeni brif",["warn","Götür"],"adbriefs"));
      let noTg=0;try{noTg=allVideos().filter(x=>x.v.stage>=3&&!x.tg.length).length;}catch(e){}
      if(noTg)add(3,"Rəy yazılmamış videolar",noTg+" video reklam rəyini gözləyir",["mut",String(noTg)],"videos");
      T.push(["Yeni brif",nw.length,"",nw.length?"warn":""],["Reklama qoyulmalı",mine.length,""],["Problemli",pr.length,"",pr.length?"crit":""],["Rəysiz video",noTg,""]);break;}
    default:{
      if(isMgr){
        dashWaiting().filter(w=>w.mine).forEach(w=>add(1,w.t,w.s,["warn",w.cnt+"/3 təsdiq"],w.go));
        if(AB_APPROVERS.includes(role))state.ad_briefs.filter(b=>b.status==="Təklif").forEach(b=>add(1,firstLine(b.title||b.client)||"Post təklifi",esc(b.client||"")+" · targetoloqun post təklifi",["warn","Təsdiqlə"],"adbriefs"));
        if(role==="ceo"||role==="pm"){const pend=state.shoots.filter(x=>x.held===""&&(d=>d!=null&&d<-1)(ddDays(x.shoot_date))).length;if(pend)add(2,"Nəticəsi yazılmamış çəkilişlər",pend+" çəkilişin tarixi keçib, baş tutub-tutmadığı qeyd olunmayıb",["warn",String(pend)],"shoots");}
      }
    }
  }
  Q.sort((a,b)=>a.pri-b.pri);
  /* Görünüş */
  const h=+new Date(Date.now()+4*36e5).toISOString().slice(11,13);const hi=h<5?"Gecən xeyrə qalsın":h<12?"Sabahın xeyir":h<18?"Günortan xeyir":"Axşamın xeyir";
  const act=Q.filter(q=>q.pri<4),urg=Q.filter(q=>q.pri===0).length;
  const wrap=el("div","dq");
  wrap.appendChild(el("div","dqhead",`<div><h2>${hi}, ${esc(String(pn||"").split(" ")[0])}</h2><p>${act.length?`Növbəndə <b>${act.length}</b> iş var${urg?` · <span class="dqurg">${urg} təcili / gecikən</span>`:""}`:"Növbən boşdur — hər şey qaydasındadır ✓"}</p></div>`));
  if(T.length&&!isMgr)wrap.appendChild(el("div","tiles dqtiles",T.map(([l,v,sub,c])=>c?tileC(l,v,sub,c):tile(l,v,sub)).join("")));
  if(Q.length){
    const p=el("div","panel");p.appendChild(el("div","ph",`<h3>Növbəm</h3><span class="count">${Q.length}</span>`));
    const pb=el("div","pb dqlist");const LIM=8;
    Q.slice(0,LIM).forEach(q=>{const r=el("button","dqrow p"+Math.min(q.pri,4));r.type="button";
      r.innerHTML=`<span class="dqbar"></span><span class="main"><span class="t">${esc(q.t)}</span><span class="m">${q.m}</span></span><span class="chip c-${q.chip[0]}">${esc(q.chip[1])}</span><svg class="dqgo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
      r.onclick=()=>{if(q.act)q.act();else goView(q.go,true);};pb.appendChild(r);});
    if(Q.length>LIM)pb.appendChild(el("div","hint dqmore",`+${Q.length-LIM} daha — müvafiq bölmədə`));
    p.appendChild(pb);wrap.appendChild(p);
  }
  return wrap;
}
function renderDash(){
  const wrap=el("div");
  wrap.appendChild(dashQueue());
  if(!TASK_MANAGERS.includes(role))return wrap;
  /* Rəhbərlik: komanda mənzərəsi */
  const active=state.clients.filter(c=>c.status==="Aktiv").length;
  const income=state.payments.filter(p=>p.status==="Ödənildi").reduce((a,b)=>a+Number(b.amount||0),0);
  const outstanding=state.payments.filter(p=>p.status!=="Ödənildi").reduce((a,b)=>a+Number(b.amount||0),0);
  const heldPending=state.shoots.filter(s=>s.held==="yes"&&shootOpenVids(s)>0).length;
  const waiting=dashWaiting();
  wrap.appendChild(renderManagerBoard());
  let tiles=tile("Aktiv klientlər",active,state.clients.length+" ümumi")
    +tile("Təsdiq gözləyən",waiting.length,"kontent · dizayn · video")
    +tile("Təhvil gözləyən",heldPending,"çəkiliş materialı");
  if(role==="ceo")tiles+=tile("Yığılan gəlir",money(income),"cari",true)+tile("Gözləyən ödəniş",money(outstanding),"");
  if(role==="ceo"||role==="pm"){const F=state.client_feedback.filter(f=>Date.now()-Date.parse(f.created_at)<90*864e5);const n=npsOf(F);
    tiles+=tile("Məmnuniyyət (NPS)",n==null?"—":(n>0?"+":"")+n,F.length?`${F.length} rəy · orta ${(F.reduce((s,x)=>s+x.score,0)/F.length).toFixed(1)}/10`:"Klient kartında «Rəy istə»");}
  wrap.appendChild(el("div","tiles",tiles));
  const p1=el("div","panel");
  p1.appendChild(el("div","ph",`<h3>Təhvil gözləyən materiallar</h3><span class="count">${heldPending}</span>`));
  const pb1=el("div","pb");
  state.shoots.filter(s=>s.held==="yes"&&shootOpenVids(s)>0).slice(0,6).forEach(s=>pb1.appendChild(el("div","row",`<div class="main"><div class="t">${esc(s.client)}</div><div class="m"><span class="opcell">${ICON.camVideo}${esc(s.video_op||"—")}</span>${s.photo_op?' · <span class="opcell">'+ICON.camPhoto+esc(s.photo_op)+'</span>':""} · ${esc(s.shoot_date)}</div></div><div class="r"><span class="chip c-warn">${shootOpenVids(s)} açıq video</span></div>`)));
  if(!pb1.children.length)pb1.appendChild(el("div","empty","Hamısı təhvil verilib 🎉"));
  p1.appendChild(pb1);wrap.appendChild(p1);
  return wrap;
}

/* ---------- Clients ---------- */
let clientQuery="",clientView="list",healthMonth=(new Date().getMonth()+1)%12,reportMonth=new Date().getMonth();
function renderClients(){
  const wrap=el("div");
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap";
  const seg=el("div","seg");seg.style.margin="0";
  [["list","Siyahı"],["health","💚 Sağlamlıq lövhəsi"]].forEach(([k,lbl])=>{const b=el("button",clientView===k?"on":"",lbl);b.onclick=()=>{if(clientView!==k){clientView=k;render();}};seg.appendChild(b);});
  bar.appendChild(seg);
  if(role==="ceo"||role==="coordinator"){const gbtn=el("button","mini",`${ICON.cloud} Drive qovluqlarını qur`);gbtn.style.marginLeft="auto";gbtn.onclick=()=>buildDriveTree();bar.appendChild(gbtn);}
  wrap.appendChild(bar);
  if(clientView==="health"){wrap.appendChild(renderClientHealth());return wrap;}
  const p=el("div","panel");
  const ph=el("div","ph",`<h3>Klientlər</h3><span class="count">${state.clients.length}</span>`);
  p.appendChild(ph);
  const isCeo=role==="ceo";
  const tw=el("div","tablewrap");
  const finTh=isCeo?`<th>Aylıq</th><th>Ödəniş günü</th>`:"";
  const rows=state.clients.filter(c=>c.name.toLowerCase().includes(clientQuery.toLowerCase())).map(c=>`
    <tr data-cli="${esc(c.name)}" style="cursor:pointer"><td><strong>${esc(c.name)}</strong><div class="m" style="color:var(--muted);font-size:12px">${esc(c.ig)}</div></td>
    <td>${esc(c.pkg)}</td>${isCeo?`<td class="num">${c.fee?money(c.fee):"—"}</td><td>${c.pay_day?c.pay_day+"-də":"—"}</td>`:""}
    <td>${esc(c.contact)}</td><td>${statusChip(c.status)} ${fbChip(c.name)} ${bbFilled(c)?`<span title="Brend kitabçası doldurulub">📘</span>`:""}</td><td class="r"><span class="hint">aç ›</span></td></tr>`).join("");
  const cols=isCeo?7:5;
  tw.innerHTML=`<table><thead><tr><th>Klient</th><th>Paket</th>${finTh}<th>Əlaqə</th><th>Status</th><th></th></tr></thead><tbody>${rows||`<tr><td colspan="${cols}"><div class="empty">Tapılmadı</div></td></tr>`}</tbody></table>`;
  p.appendChild(tw);wrap.appendChild(p);
  tw.querySelectorAll("[data-cli]").forEach(tr=>tr.onclick=()=>{const c=state.clients.find(x=>x.name===tr.dataset.cli);if(c)openClientDetail(c);});
  return wrap;
}
function clientStatus(name,mIdx){
  const m=(mIdx==null)?new Date().getMonth():((mIdx%12)+12)%12,mName=MONTHS_AZ[m];
  // Çəkilişlər KONTENT ayına (shootMonth) görə filtrlənir — biz bir ay əvvəldən çəkirik
  const shoots=state.shoots.filter(s=>s.client===name&&shootMonth(s)===mName);
  let vidReady=0,vidTotal=0,photoDone=false,photoPending=false,hasPhotoShoot=false,shootsPlanned=0,shootsHeld=0;
  shoots.forEach(s=>{shootsPlanned++;if(s.held==="yes")shootsHeld++;getVids(s).forEach(v=>{vidTotal++;if(v.stage>=4)vidReady++;});if((s.photo_op||"").trim()){hasPhotoShoot=true;const ph=getPhotos(s);if(ph.stage>=4)photoDone=true;else if(ph.link)photoPending=true;}});
  const contentReady=state.content.some(x=>x.client===name&&x.month===mName&&x.file&&(x.status==="Təsdiqləndi"||x.status==="Yerləşdirildi"));
  return {mName,vidReady,vidTotal,photoDone,photoPending,hasPhotoShoot,contentReady,shootsPlanned,shootsHeld};
}
function clientHealth(c,mIdx){
  const st=clientStatus(c.name,mIdx);
  const quota=+c.video_quota||0;const target=quota||st.vidTotal;
  const vidOk=target?st.vidReady>=target:(st.vidTotal>0&&st.vidReady===st.vidTotal);
  const photoNeed=st.hasPhotoShoot,photoOk=!photoNeed||st.photoDone,contentOk=st.contentReady;
  const shootOk=st.shootsPlanned>0&&st.shootsHeld>=st.shootsPlanned;
  let done=0,total=0;
  total++;if(st.shootsPlanned>0)done+=(shootOk?1:0.5);   // çəkiliş planı/çəkilib
  total++;if(vidOk)done++;
  total++;if(contentOk)done++;
  if(photoNeed){total++;if(photoOk)done++;}
  const frac=total?done/total:0;
  const nothing=(st.shootsPlanned===0)&&!contentOk;
  const color=frac>=1?"good":nothing?"crit":"warn";
  return {st,quota,target,vidOk,photoNeed,photoOk,contentOk,shootOk,frac,color};
}
function renderClientHealth(){
  const wrap=el("div");
  const nowM=new Date().getMonth();
  const isNext=healthMonth===(nowM+1)%12;
  // ay seçici + deadline
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px";
  const mseg=el("div","seg");mseg.style.margin="0";
  [[(nowM+1)%12,"Növbəti ay ("+MONTHS_AZ[(nowM+1)%12]+")"],[nowM,"Bu ay ("+MONTHS_AZ[nowM]+")"]].forEach(([idx,lbl])=>{const b=el("button",healthMonth===idx?"on":"",lbl);b.onclick=()=>{if(healthMonth!==idx){healthMonth=idx;render();}};mseg.appendChild(b);});
  bar.appendChild(mseg);
  if(isNext){
    const lastDay=new Date(new Date().getFullYear(),nowM+1,0).getDate();const daysLeft=lastDay-new Date().getDate();
    const dl=el("div");dl.style.cssText="font-size:12.5px;font-weight:600;padding:6px 12px;border-radius:8px;background:var(--"+(daysLeft<=7?'crit':daysLeft<=14?'warn':'good')+"-soft);color:var(--"+(daysLeft<=7?'crit':daysLeft<=14?'warn':'good')+")";
    dl.innerHTML=`⏳ ${MONTHS_AZ[healthMonth]} çəkilişləri ${MONTHS_AZ[nowM]} sonuna qədər — ${daysLeft} gün qalıb`;
    bar.appendChild(dl);
  }
  wrap.appendChild(bar);
  const list=state.clients.filter(c=>c.status!=="Lead").map(c=>({c,h:clientHealth(c,healthMonth)}));
  const rank={crit:0,warn:1,good:2};
  list.sort((a,b)=>{if(rank[a.h.color]!==rank[b.h.color])return rank[a.h.color]-rank[b.h.color];return a.h.frac-b.h.frac;});
  const cnt={good:0,warn:0,crit:0};list.forEach(x=>cnt[x.h.color]++);
  const mName=MONTHS_AZ[healthMonth];
  wrap.appendChild(el("div","tiles",
    tileC("Hazır (yaşıl)",cnt.good,mName,"good")+tileC("Yarımçıq (sarı)",cnt.warn,mName,"warn")+tileC("Geridə (qırmızı)",cnt.crit,mName,"crit")+tile("Cəmi məkan",list.length,"aktiv portfel")));
  const grid=el("div","cards3");
  list.forEach(({c,h})=>{
    const vs=h.target?`${h.st.vidReady}/${h.target}`:`${h.st.vidReady}`;
    const barCol=h.vidOk?"good":(h.st.vidReady?"warn":"crit");
    const pct=h.target?Math.min(100,Math.round(h.st.vidReady/h.target*100)):(h.st.vidReady?100:0);
    const chip=(ok,label)=>`<span class="chip c-${ok?'good':'mut'}" style="font-size:10.5px">${ok?'✓':'○'} ${label}</span>`;
    const shp=h.st.shootsPlanned;const shootChip=shp===0?`<span class="chip c-crit" style="font-size:10.5px">○ Çəkiliş təyin olunmayıb</span>`:(h.shootOk?`<span class="chip c-good" style="font-size:10.5px">✓ Çəkilib (${h.st.shootsHeld}/${shp})</span>`:`<span class="chip c-warn" style="font-size:10.5px">◐ Çəkiləcək (${h.st.shootsHeld}/${shp})</span>`);
    const card=el("div","panel");card.style.cssText="margin:0;padding:14px;cursor:pointer;border-left:4px solid var(--"+h.color+")";
    card.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:10px;height:10px;border-radius:50%;background:var(--${h.color});flex:none"></span><strong style="font-size:14px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</strong><span class="chip c-mut" style="font-size:10px">${esc(c.pkg||'—')}</span></div>
      <div style="margin-bottom:7px">${shootChip}</div>
      <div style="font-size:11.5px;color:var(--muted);margin-bottom:3px">Video: <b style="color:var(--ink)">${vs}</b></div>
      <div style="height:7px;background:var(--surface-2);border-radius:5px;overflow:hidden;margin-bottom:9px"><div style="width:${pct}%;height:100%;background:var(--${barCol})"></div></div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">${chip(h.contentOk,"Kontent planı")}${h.photoNeed?chip(h.photoOk,"Foto"):""}${(c.ad_account_id||'').trim()?'<span class="chip c-accent" style="font-size:10.5px">Reklam</span>':''}</div>`;
    card.onclick=()=>openClientDetail(c);
    grid.appendChild(card);
  });
  if(!list.length)grid.appendChild(el("div","empty","Məkan yoxdur"));
  wrap.appendChild(grid);
  return wrap;
}
/* Müştəri portalı: məkana gizli link — daxildə təsdiqlənmiş materiallara baxıb təsdiq / düzəliş verir */
const clientOkChip=(ok,note)=>ok==="ok"?`<span class="chip c-good" style="font-size:10px;padding:2px 7px" title="Müştəri təsdiqlədi">👤 Müştəri ✓</span>`:ok==="changes"?`<span class="chip c-warn" style="font-size:10px;padding:2px 7px" title="${esc(note||"")}">👤 Düzəliş: ${esc(String(note||"").slice(0,60))}</span>`:"";
async function portalBox(c,box){
  box.innerHTML=`<div class="ph" style="border:none;padding:14px 0 6px"><h3 style="font-size:14px">Müştəri portalı</h3></div><div class="hint">Yüklənir…</div>`;
  const {data}=await sb.from('client_portals').select('*').eq('client',c.name).eq('revoked',false).order('created_at',{ascending:false}).limit(1);
  const p=data&&data[0];const link=p?location.origin+"/portal.html?k="+p.token:"";
  box.innerHTML=`<div class="ph" style="border:none;padding:14px 0 6px"><h3 style="font-size:14px">Müştəri portalı</h3></div>
    <div class="hint" style="white-space:normal;margin-bottom:8px">Bu linki məkana göndər (WhatsApp və s.). Açan şəxs yalnız ${esc(c.name)} üçün daxildə təsdiqlənmiş kontent, video və dizaynları görür və təsdiq / düzəliş verir.${p&&p.last_seen?" Son baxış: "+new Date(p.last_seen).toLocaleString("az"):""}</div>
    ${p?`<input readonly value="${esc(link)}" style="width:100%;font-size:12px;margin-bottom:8px" onclick="this.select()">
    <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="mini" data-pcopy>${ICON.link} Linki kopyala</button><a class="mini" href="https://wa.me/?text=${encodeURIComponent("Salam! MezMoon materiallarına buradan baxıb təsdiq edə bilərsiniz: "+link)}" target="_blank" rel="noopener" style="text-decoration:none">WhatsApp-a göndər</a><button class="mini" data-prevoke style="color:var(--crit)">Linki ləğv et</button></div>`
    :`<button class="mini" data-pnew>${ICON.plus} Portal linki yarat</button>`}`;
  const nb=box.querySelector("[data-pnew]");if(nb)nb.onclick=async()=>{const {error}=await sb.from('client_portals').insert({client:c.name});if(error)alert("Xəta: "+error.message);portalBox(c,box);};
  const cb=box.querySelector("[data-pcopy]");if(cb)cb.onclick=async()=>{try{await navigator.clipboard.writeText(link);cb.textContent="Kopyalandı ✓";}catch(e){box.querySelector("input").select();}};
  const rb=box.querySelector("[data-prevoke]");if(rb)rb.onclick=async()=>{if(!confirm("Link ləğv olunsun? Müştəri köhnə linklə daha girə bilməyəcək."))return;await sb.from('client_portals').update({revoked:true}).eq('token',p.token);portalBox(c,box);};
}
function openClientDetail(c){
  const st=clientStatus(c.name);const isCeo=role==="ceo";const isMgr=TASK_MANAGERS.includes(role);
  const quota=+c.video_quota||0;
  const remaining=quota?Math.max(quota-st.vidReady,0):Math.max(st.vidTotal-st.vidReady,0);
  const cliTasks=state.tasks.filter(t=>t.client===c.name&&(isMgr||taskIsMine(t)));
  const tile=(label,val,col)=>`<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:11px 13px"><div class="hint" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em">${label}</div><div style="font-weight:600;margin-top:3px;color:var(--${col||'ink'})">${val}</div></div>`;
  const photoVal=!st.hasPhotoShoot?"—":st.photoDone?"✓ Verilib":st.photoPending?"Təhvildə":"Gözləyir";
  const photoCol=!st.hasPhotoShoot?"muted":st.photoDone?"good":st.photoPending?"accent":"warn";
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:600px"><div class="mh"><h3>${esc(c.name)}</h3><button>×</button></div>
    <div class="mb">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        <span class="chip c-accent" style="font-size:11px">${esc(c.pkg||"Paket qeyd olunmayıb")}</span>
        ${statusChip(c.status)}${isCeo&&c.fee?`<span class="chip c-good" style="font-size:11px">${money(c.fee)}/ay</span>`:""}${isCeo?`<span class="chip c-mut" style="font-size:11px">Ödəniş günü: ${c.pay_day?c.pay_day:"—"}</span>`:""}
      </div>
      <div class="hint" style="margin-bottom:8px">${esc(st.mName)} ayı üzrə vəziyyət</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px">
        ${tile("Video hazır", st.vidReady+(quota?` / ${quota}`:""), st.vidReady?"good":"warn")}
        ${tile("Video qalıb", remaining+(quota?"":" montajda"), remaining?"warn":"good")}
        ${tile("Kontent planı", st.contentReady?"✓ Hazır":"✗ Hazır deyil", st.contentReady?"good":"crit")}
        ${tile("Foto", photoVal, photoCol)}
      </div>
      ${isCeo?`<div class="ph" style="border:none;padding:14px 0 6px"><h3 style="font-size:14px">Ödənişlər</h3><button class="mini" data-addpay style="margin-left:auto">${ICON.plus} Summa əlavə et</button></div><div id="clipays"></div>`:""}
      <div class="ph" style="border:none;padding:14px 0 6px"><h3 style="font-size:14px">Bu müştərinin taskları</h3><span class="count">${cliTasks.length}</span></div>
      <div id="clitasks"></div>
      <div id="clifb"></div>
      <div id="cliportal"></div>
    </div>
    <div class="mf"><button class="btn ghost" data-bb="${esc(c.name)}" style="margin-right:auto">📘 Brend kitabçası</button>${isCeo?`<button class="btn ghost" data-edit>Redaktə</button>`:""}<button class="btn" data-x>Bağla</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  fbBox(c,scrim.querySelector("#clifb"));
  if(isCeo){const cp=scrim.querySelector("#clipays");const cliPays=state.payments.filter(p=>p.client===c.name);
    if(!cliPays.length)cp.appendChild(el("div","empty","Ödəniş qeydi yoxdur"));
    else cliPays.forEach(p=>cp.appendChild(el("div","row",`<div class="main"><div class="t">${money(p.amount)}</div><div class="m">${esc(p.month||"")}</div></div><div class="r">${statusChip(p.status)}</div>`)));
    scrim.querySelector("[data-addpay]").onclick=()=>{close();addClientPayment(c);};
  }
  if(["ceo","pm","account"].includes(role))portalBox(c,scrim.querySelector("#cliportal"));
  const ct=scrim.querySelector("#clitasks");
  if(!cliTasks.length)ct.appendChild(el("div","empty","Bu müştəriyə aid task yoxdur"));
  else cliTasks.forEach(t=>{const di=dlInfo(t.deadline,t.status);ct.appendChild(el("div","row",`<div class="main"><div class="t">${esc(t.title)}</div><div class="m">${esc(taskRoleLabel(t.role))} · ${esc(t.status)}</div></div><div class="r"><span class="chip c-${di.c}" style="font-size:10.5px">${esc(di.txt)}</span></div>`));});
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  const eb=scrim.querySelector("[data-edit]");if(eb)eb.onclick=()=>{close();openForm(c);};
}
function addClientPayment(c){
  const scrim=el("div","scrim");const mName=MONTHS_AZ[new Date().getMonth()];
  scrim.innerHTML=`<div class="modal" style="max-width:420px"><div class="mh"><h3>${esc(c.name)} — summa əlavə et</h3><button>×</button></div>
    <div class="mb">
      <div class="field"><label>Məbləğ (₼)</label><input id="pa" type="number" min="0" value="${c.fee||''}" placeholder="1200"></div>
      <div class="field"><label>Ay</label><select id="pm">${MONTHS_AZ.map(m=>`<option${m===mName?" selected":""}>${m}</option>`).join("")}</select></div>
      <div class="field"><label>Status</label><select id="ps"><option>Ödənildi</option><option>Gözləyir</option><option>Gecikib</option></select></div>
      <div class="hint" style="white-space:normal">Əlavə edilən summa avtomatik Maliyyə bölməsinə düşür.</div>
    </div>
    <div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" data-ok>Əlavə et</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  scrim.querySelector("[data-ok]").onclick=async()=>{const amt=+scrim.querySelector("#pa").value||0;if(!amt){alert("Məbləğ yaz.");return;}await ins('payments',{client:c.name,month:scrim.querySelector("#pm").value,amount:amt,status:scrim.querySelector("#ps").value});close();openClientDetail(state.clients.find(x=>x.id===c.id)||c);};
}

/* ---------- Dəqiq şərh: video (vaxta bağlı) və dizayn (şəkil üzərində nöqtə) ---------- */
const fmtT=sec=>{sec=Math.max(0,Math.floor(+sec||0));return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");};
const parseT=str=>{const m=String(str||"").trim().match(/^(\d+):(\d{1,2})$/);return m?(+m[1])*60+(+m[2]):(/^\d+$/.test(String(str).trim())?+str:null);};
const annFor=target=>state.annotations.filter(a=>a.target===target);
function annRow(a,label,onJump){
  const canDel=role==="ceo"||(me&&a.author===me.id);
  const row=el("div","row");row.style.cssText="align-items:flex-start;gap:10px"+(a.resolved?";opacity:.55":"");
  row.innerHTML=`<button class="mini" data-j style="font-family:var(--fmono);min-width:54px;justify-content:center">${esc(label)}</button>
    <div class="main" style="min-width:0"><div class="t" style="white-space:pre-wrap;font-weight:500;${a.resolved?"text-decoration:line-through":""}">${a.kind==="targeting"?`<span class="chip c-accent" style="font-size:10px;margin-right:4px">🎯 Targeting${a.rating?" "+"★".repeat(a.rating):""}</span>`:""}${esc(a.body)}</div><div class="m">${esc(a.author_name||"")}</div></div>
    <div class="r" style="display:flex;gap:4px"><button class="ibtn" data-ok title="${a.resolved?"Yenidən aç":"Düzəldildi"}">${ICON.check}</button>${canDel?`<button class="ibtn danger" data-del title="Sil">${ICON.trash}</button>`:""}</div>`;
  row.querySelector("[data-j]").onclick=onJump;
  row.querySelector("[data-ok]").onclick=()=>upd('annotations',a.id,{resolved:!a.resolved});
  const d=row.querySelector("[data-del]");if(d)d.onclick=async()=>{await sb.from('annotations').delete().eq('id',a.id);reload('annotations');};
  return row;
}
async function addAnn(rec){const {error}=await sb.from('annotations').insert({...rec,author:me?me.id:null,author_name:myName()});if(error){alert("Xəta: "+error.message);return false;}await reload('annotations');return true;}

function openVideoReview(s,i){
  const v=getVids(s)[i];if(!v||!v.link)return;
  const target="vid:"+s.id+":"+i;const id=driveId(v.link);
  const src=id?(driveConnected()?`https://www.googleapis.com/drive/v3/files/${id}?alt=media&access_token=${encodeURIComponent(gAccessToken)}`:`https://drive.google.com/uc?export=download&id=${id}`):v.link;
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:980px;width:96vw"><div class="mh"><h3>${esc(s.client)} · Video ${i+1} — rəy <span style="font-size:13px;font-weight:500;margin-left:6px">${bbLink(s.client,"Brend")}</span></h3><button data-x>×</button></div>
    <div class="mb" style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px" id="vrgrid">
      <div style="min-width:0" class="vstick"><div id="vbox" class="vbox"><video id="vv" controls playsinline preload="metadata" src="${esc(src)}"></video></div>
        <div class="vsteps" id="vsteps"><button class="mini" data-vs="-5" aria-label="5 saniyə geri">−5s</button><button class="mini" data-vs="-1" aria-label="1 saniyə geri">−1s</button><button class="mini" data-vs="0" aria-label="Oynat / dayandır">⏯</button><button class="mini" data-vs="1" aria-label="1 saniyə irəli">+1s</button><button class="mini" data-vs="5" aria-label="5 saniyə irəli">+5s</button></div>
        <div class="hint" id="vmode" style="margin-top:6px;white-space:normal">Videonu dayandır, rəyini yaz — rəy həmin saniyəyə bağlanacaq. Dəqiq saniyə üçün ±1s düymələrindən istifadə et.</div></div>
      <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
        <div class="pchips" id="vkind" style="max-height:none"><button type="button" class="pchip" data-vk="edit">✂️ Montaj qeydi</button><button type="button" class="pchip" data-vk="targeting">🎯 Targeting rəyi</button></div>
        <div id="vrate" style="display:none;font-size:12.5px">Reklam potensialı: <span id="vstars">${[1,2,3,4,5].map(n=>`<button type="button" class="mini" data-star="${n}" style="padding:3px 7px">☆</button>`).join("")}</span></div>
        <div class="field" style="margin:0"><label>Rəy <span id="vt" class="chip c-accent" style="font-family:var(--fmono);font-size:11px;padding:2px 8px">⏱ 0:00</span></label>
          <input id="vtm" placeholder="vaxt, məs. 0:12" style="display:none;margin-bottom:6px">
          <textarea id="vtx" placeholder="Məs. loqo kiçikdir, musiqi tez bitir…" style="min-height:70px"></textarea></div>
        <button class="btn" id="vadd">${ICON.plus} Rəyi əlavə et</button>
        <div id="vlist" style="display:grid;gap:2px;max-height:46vh;overflow:auto"></div>
      </div></div></div>`;
  document.body.appendChild(scrim);
  if(window.innerWidth<760)scrim.querySelector("#vrgrid").style.gridTemplateColumns="1fr";
  const close=()=>{window._annRefresh=null;scrim.remove();};
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const video=scrim.querySelector("#vv");const vt=scrim.querySelector("#vt");const tm=scrim.querySelector("#vtm");const tx=scrim.querySelector("#vtx");
  let manual=false;
  // Brauzer videonu birbaşa oynada bilmirsə — Drive pleyeri + vaxtı əl ilə yazmaq
  video.onerror=()=>{if(manual||!id)return;manual=true;
    const vb=scrim.querySelector("#vbox");vb.innerHTML=`<iframe src="https://drive.google.com/file/d/${id}/preview" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    /* Drive pleyerində ölçü bilinmir — reels əsasən şaquli olduğundan 9:16, düymə ilə dəyişmək olar */
    const fit=ar=>{vb.style.aspectRatio=ar;vb.style.maxWidth=ar==="9/16"?(window.innerWidth<760?"calc(44dvh * 9 / 16)":"calc(64dvh * 9 / 16)"):"";};fit("9/16");
    const st=scrim.querySelector("#vsteps");st.innerHTML=`<button class="mini" id="vorient">↔ Üfüqi video</button>`;
    st.querySelector("#vorient").onclick=e=>{const v=vb.style.aspectRatio==="9/16";fit(v?"16/9":"9/16");e.currentTarget.textContent=v?"↕ Şaquli video":"↔ Üfüqi video";};
    scrim.querySelector("#vmode").textContent=driveConnected()?"Video Drive pleyerində açıldı — vaxtı əl ilə yaz (məs. 0:12).":"Video Drive pleyerində açıldı — vaxtı əl ilə yaz (məs. 0:12). Yuxarıdan «Drive-ı qoş» bassan, saniyə avtomatik götürüləcək.";
    vt.style.display="none";tm.style.display="";};
  const tick=()=>{vt.textContent="⏱ "+fmtT(video.currentTime);};
  video.ontimeupdate=tick;video.onseeked=tick;
  /* Videonun real ölçüsünə uyğunlaşma — şaquli video tam görünür */
  video.onloadedmetadata=()=>{const w=video.videoWidth,h=video.videoHeight;if(!w||!h)return;const vb=scrim.querySelector("#vbox");
    vb.style.aspectRatio=w+"/"+h;vb.style.maxWidth=h>w?`calc(${window.innerWidth<760?44:64}dvh * ${w} / ${h})`:"";};
  scrim.querySelectorAll("[data-vs]").forEach(b=>b.onclick=()=>{const d=+b.dataset.vs;
    if(!d){if(video.paused)video.play();else video.pause();return;}
    video.pause();video.currentTime=Math.max(0,Math.min(video.duration||1e9,(video.currentTime||0)+d));});
  tx.onfocus=()=>{if(!manual&&!video.paused)video.pause();};
  const draw=()=>{const box=scrim.querySelector("#vlist");if(!box)return;box.innerHTML="";
    const L=annFor(target).sort((a,b)=>(+a.t||0)-(+b.t||0));
    if(!L.length)box.appendChild(el("div","empty","Hələ rəy yoxdur"));
    L.forEach(a=>box.appendChild(annRow(a,fmtT(a.t),()=>{if(!manual){video.currentTime=+a.t||0;video.pause();}})));};
  window._annRefresh=draw;draw();
  let vkind=role==="targeting"?"targeting":"edit",vrating=0;
  const showKind=()=>{scrim.querySelectorAll("[data-vk]").forEach(b=>b.classList.toggle("on",b.dataset.vk===vkind));scrim.querySelector("#vrate").style.display=vkind==="targeting"?"":"none";
    tx.placeholder=vkind==="targeting"?"Reklam üçün: hook güclüdürmü, ilk 3 saniyə, mətn, CTA… (məs. giriş zəifdir, 0:02-dən başlasın)":"Məs. loqo kiçikdir, musiqi tez bitir…";};
  scrim.querySelectorAll("[data-vk]").forEach(b=>b.onclick=()=>{vkind=b.dataset.vk;showKind();});
  scrim.querySelectorAll("[data-star]").forEach(b=>b.onclick=()=>{vrating=+b.dataset.star;scrim.querySelectorAll("[data-star]").forEach(x=>x.textContent=+x.dataset.star<=vrating?"★":"☆");});
  showKind();
  scrim.querySelector("#vadd").onclick=async()=>{
    const body=tx.value.trim();if(!body)return;
    const t=manual?parseT(tm.value):Math.floor(video.currentTime||0);
    if(manual&&t===null){alert("Vaxtı yaz: məs. 0:12");return;}
    const rec={target,t,body,kind:vkind};if(vkind==="targeting"&&vrating)rec.rating=vrating;
    if(await addAnn(rec)){tx.value="";tm.value="";draw();notifyChat('shoot:'+s.id+':v'+i,`${vkind==="targeting"?"🎯 Targeting"+(vrating?" "+"★".repeat(vrating):"")+" · ":""}⏱ ${fmtT(t)} — ${body}`);}
  };
}

/* Düzəliş istə: brif «İcrada»-ya qayıdır, qeyd kartda görünür, dizaynerə bildiriş gedir */
/* Dizayn / motion təsdiqə düşəndə: bütün CEO-lar, brifi yazan Account Manager və bütün PM-lər — brif detalları ilə */
async function notifyBriefApproval(b,motion){
  const ceos=state.profiles.filter(p=>p.role==="ceo").map(p=>p.id);
  const pms=state.profiles.filter(p=>p.role==="pm").map(p=>p.id);
  const acc=b.created_by?[b.created_by]:state.profiles.filter(p=>p.role==="account").map(p=>p.id);
  const to=new Set([...ceos,...pms,...acc]);if(me)to.delete(me.id);
  /* düzəlişdən sonra göndərilibsə — düzəlişi istəyən şəxsə «verdiyiniz düzəliş hazırdır» */
  const enote=motion?b.motion_edit_note:b.edit_note;
  const eby=motion?(b.motion_edit_by_id||state.profiles.find(p=>b.motion_edit_by&&(p.full_name===b.motion_edit_by||p.username===b.motion_edit_by))?.id)
                  :(b.edit_by_id||state.profiles.find(p=>b.edit_by&&(p.full_name===b.edit_by||p.username===b.edit_by))?.id);
  const ready=[];
  if(enote&&eby&&(!me||eby!==me.id)){
    to.delete(eby);
    const n=motion?(+b.motion_edit_count||0):(+b.edit_count||0);
    const f=motion?motionLines(b):(jpgLines(b)+psdLines(b));
    ready.push({target_type:"user",target:eby,title:motion?"✅ Motion-a verdiyiniz düzəliş hazırdır":"✅ Dizayna verdiyiniz düzəliş hazırdır",
      body:`${myName()} düzəlişi (#${n}) etdi və yenidən təsdiqə göndərdi — baxıb təsdiq edin və ya yenə düzəliş istəyin.\n\nMəkan: ${b.client}${f}\n\nSizin düzəlişiniz:\n${enote}\n\nBrif: ${String(b.title).split("\n")[0].slice(0,80)}`,
      from_name:myName(),from_id:me?me.id:null,read_by:[]});
  }
  if(!to.size&&!ready.length)return;
  const ec=motion?(+b.motion_edit_count||0):(+b.edit_count||0);
  const files=motion?motionLines(b):(jpgLines(b)+psdLines(b));
  const dl=motion?(b.motion_deadline||b.deadline):b.deadline;
  const head=`Məkan: ${b.client}\n${motion?"Motion dizayner":"Dizayner"}: ${myName()}\nDeadline: ${fmtDl(dl)}${ec?"\nDüzəlişdən sonra (#"+ec+")":""}${files}`;
  const rows=[...to].map(id=>{const isCeo=ceos.includes(id);
    return {target_type:"user",target:id,title:(b.urgent?"🔥 TƏCİLİ · ":"")+(motion?"🎞 Motion təsdiq gözləyir":"🎨 Dizayn təsdiq gözləyir"),
      body:`${isCeo?"Sizdən təsdiq gözləyir.":"Sizdən və CEO-dan təsdiq gözləyir."}\n\n${head}\n\nBrif detalları:\n${b.title}`,
      from_name:myName(),from_id:me?me.id:null,read_by:[],urgent:!!b.urgent};});
  try{await sb.from('notifications').insert([...ready,...rows]);}catch(e){}
}
/* Dizayn JPG variantları: briefs.jpg_files (massiv); jpg_file = 1-ci variant (köhnə kod üçün) */
function briefJpgs(b){const a=Array.isArray(b&&b.jpg_files)?b.jpg_files.filter(Boolean):[];return a.length?a:(b&&b.jpg_file?[b.jpg_file]:[]);}
function jpgTarget(b,u){return "img:"+b.id+":"+(driveId(u)||String(u).slice(-48));}
function briefOpenPins(b){return briefJpgs(b).reduce((n,u)=>n+annFor(jpgTarget(b,u)).filter(a=>!a.resolved).length,0);}
function setBriefJpgs(b,arr){return upd('briefs',b.id,{jpg_files:arr,jpg_file:arr[0]||null});}
/* Motion videoları: briefs.motion_files (massiv); motion_file = 1-ci video (köhnə kod üçün) */
function briefMotions(b){const a=Array.isArray(b&&b.motion_files)?b.motion_files.filter(Boolean):[];return a.length?a:(b&&b.motion_file?[b.motion_file]:[]);}
function setBriefMotions(b,arr){return upd('briefs',b.id,{motion_files:arr,motion_file:arr[0]||null});}
function motionLines(b){const L=briefMotions(b);return L.map((u,i)=>"\nMotion"+(L.length>1?" "+(i+1):"")+": "+u).join("");}
const isMotionOnly=b=>b&&b.kind==="motion_only";
/* Motion brifinin öz faylları (dizayn + motion brifində, motion dizayner üçün) — storage yolları */
const motionBriefFiles=b=>Array.isArray(b&&b.motion_brief_files)?b.motion_brief_files.filter(Boolean):[];
const briefFileChip=f=>`<span class="chip c-warn" style="font-size:10px;padding:2px 7px;gap:4px"><a style="cursor:pointer;text-decoration:none;color:inherit" data-file="${esc(f)}" title="Bax">${ICON.attach}${esc(fileName(f))}</a><a style="cursor:pointer;text-decoration:none;color:inherit" data-dl="${esc(f)}" title="Yüklə">⬇</a></span>`;
/* Dizayn PSD-ləri: briefs.psd_files (massiv); psd_file = 1-ci PSD (köhnə kod üçün) */
function briefPsds(b){const a=Array.isArray(b&&b.psd_files)?b.psd_files.filter(Boolean):[];return a.length?a:(b&&b.psd_file?[b.psd_file]:[]);}
function setBriefPsds(b,arr){return upd('briefs',b.id,{psd_files:arr,psd_file:arr[0]||null});}
function psdLines(b){const L=briefPsds(b);return L.map((u,i)=>"\nPSD"+(L.length>1?" "+(i+1):"")+": "+u).join("");}
function jpgLines(b){const L=briefJpgs(b);return L.map((u,i)=>"\nJPG"+(L.length>1?" "+(i+1):"")+": "+u).join("");}
/* Bir neçə faylı ardıcıl Drive-a yüklə (bir pəncərədə ümumi irəliləyiş) */
async function drivePickAndUploadMany(accept,cb,opts){
  if(!(await driveReady())){alert("Əvvəlcə Drive-ı qoş: yuxarı sağdakı «☁️ Drive-ı qoş» düyməsinə bir dəfə bas və Google hesabına icazə ver. Bu bir dəfəlikdir — sonra daimi qoşulu qalır.");return;}
  const files=await pickFiles(accept);if(!files.length)return;
  let parentId=null;
  if(opts&&opts.client){try{parentId=await folderFor(opts.client,opts.sub,opts.cat);}catch(e){if(!confirm("Qovluq hazırlana bilmədi ("+(e.message||e)+"). Fayllar kök qovluğa yüklənsin?"))return;}}
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:380px"><div class="mb"><div style="font-weight:600;margin-bottom:6px">☁️ Drive-a yüklənir…</div><div class="hint" id="dsub" style="white-space:normal"></div><div style="height:8px;background:var(--surface-2);border-radius:6px;margin-top:12px;overflow:hidden"><div id="dbar" style="height:100%;width:0;background:var(--accent);transition:width .2s"></div></div><div class="hint" id="dpct" style="margin-top:6px">0%</div></div></div>`;
  document.body.appendChild(scrim);
  const links=[];
  for(let k=0;k<files.length;k++){
    const f=files[k];scrim.querySelector("#dsub").textContent=`${k+1}/${files.length} · ${f.name}`;
    try{links.push(await driveUpload(f,p=>{const tot=Math.round((k+p/100)/files.length*100);scrim.querySelector("#dbar").style.width=tot+"%";scrim.querySelector("#dpct").textContent=tot+"%";},null,parentId));}
    catch(e){alert("«"+f.name+"» yüklənmədi: "+(e.message||e));}
  }
  scrim.remove();if(links.length)cb(links);
}
function briefDesignerIds(b){const ds=state.profiles.filter(p=>b.designer&&(p.full_name===b.designer||p.username===b.designer));return ds.map(p=>p.id);}
/* Düzəlişi yazan şəxs (və CEO) sonradan mətnini dəyişə bilər */
function canEditNote(b,motion){
  if(!me)return false;if(role==="ceo")return true;
  const id=motion?b.motion_edit_by_id:b.edit_by_id;const nm=motion?b.motion_edit_by:b.edit_by;
  return id?id===me.id:(!!nm&&nm===myName());
}
function openEditNoteChange(b,motion){
  if(!b)return;
  const cur=(motion?b.motion_edit_note:b.edit_note)||"";
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>✎ ${motion?"Motion düzəlişini":"Düzəlişi"} dəyiş</h3><button data-x>×</button></div><div class="mb">
    <div class="hint" style="margin-bottom:10px;white-space:normal">${esc(b.client)} · ${esc(String(b.title).split("\n")[0].slice(0,80))}</div>
    <div class="field"><label>Düzəliş mətni</label><textarea id="entx" rows="7" style="line-height:1.5"></textarea></div>
    <div class="hint" style="white-space:normal">Yadda saxlayanda ${motion?"motion dizaynerə":"dizaynerə"} «düzəliş yeniləndi» bildirişi gedəcək.</div>
  </div><div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" id="enok">Yadda saxla</button></div></div>`;
  document.body.appendChild(scrim);
  const tx=scrim.querySelector("#entx");tx.value=cur;tx.focus();
  const close=()=>scrim.remove();
  scrim.querySelectorAll("[data-x]").forEach(x=>x.onclick=close);scrim.onclick=e=>{if(e.target===scrim)close();};
  scrim.querySelector("#enok").onclick=async()=>{
    const note=tx.value.trim();
    if(!note){alert("Mətn boş ola bilməz.");return;}
    if(note===cur.trim()){close();return;}
    scrim.querySelector("#enok").disabled=true;
    await upd('briefs',b.id,motion?{motion_edit_note:note}:{edit_note:note});
    const n=motion?b.motion_edit_count:b.edit_count;
    const body=`Məkan: ${b.client}\n${motion?"Motion düzəlişi":"Düzəliş"}${n>1?" #"+n:""} yeniləndi — ${myName()}\n\n${note}\n\nBrif: ${String(b.title).split("\n")[0].slice(0,80)}`;
    const ids=(motion?state.profiles.filter(p=>b.motion_by&&(p.full_name===b.motion_by||p.username===b.motion_by)).map(p=>p.id):briefDesignerIds(b)).filter(id=>!me||id!==me.id);
    const title=motion?"✎ Motion düzəlişi yeniləndi":"✎ Dizayn düzəlişi yeniləndi";
    try{await sb.from('notifications').insert(ids.length?ids.map(id=>({target_type:"user",target:id,title,body,from_name:myName(),from_id:me?me.id:null,read_by:[]}))
      :[{target_type:"role",target:motion?"motion":"designer",title,body,from_name:myName(),from_id:me?me.id:null,read_by:[]}]);}catch(e){}
    close();
  };
}
/* Düzəlişə foto / video: Google Drive-a (agentlik hesabı ilə, məkanın qovluğuna) yüklənir — Supabase-də yer tutmur.
   briefs.edit_files / motion_edit_files: [{url,type,name}] · panelin içində önizləmə ilə açılır */
const EDIT_MAX=1024*1048576;
const editAttachHtml=()=>`<div class="field"><label>📎 Foto / video əlavə et <span style="font-weight:400;color:var(--muted)">(istəyə görə · Drive-a yüklənir)</span></label>
  <label class="btn ghost" style="width:100%;padding:9px;justify-content:center;cursor:pointer">📎 Fayl seç<input type="file" id="rvfile" multiple accept="image/*,video/*" style="display:none"></label>
  <div id="rvlist" style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px"></div></div>`;
function wireEditAttach(scrim){
  const files=[];const inp=scrim.querySelector("#rvfile"),list=scrim.querySelector("#rvlist");
  const draw=()=>{list.innerHTML=files.map((f,i)=>`<span class="chip c-accent" style="font-size:11px">${f.type.startsWith("video")?"🎬":"🖼"} ${esc(f.name.length>28?f.name.slice(0,26)+"…":f.name)} · ${(f.size/1048576).toFixed(1)} MB<a data-rm="${i}" title="Sil" style="cursor:pointer;margin-left:6px;font-weight:700">×</a></span>`).join("");
    list.querySelectorAll("[data-rm]").forEach(a=>a.onclick=()=>{files.splice(+a.dataset.rm,1);draw();});};
  inp.onchange=()=>{for(const f of inp.files){if(!/^(image|video)\//.test(f.type)){alert(f.name+" — yalnız foto və ya video əlavə etmək olar.");continue;}
    if(f.size>EDIT_MAX){alert(f.name+" — 1 GB-dan böyükdür.");continue;}files.push(f);}inp.value="";draw();};
  return files;
}
/* Məkanın Drive qovluğu (qovluq ağacı qurulubsa), yoxsa ortaq kök qovluq */
async function editDriveParent(client){
  try{const {data}=await sb.from('drive_folders').select('folder_id').eq('key',CENTRAL_ROOT_ID+"/"+client).maybeSingle();if(data&&data.folder_id)return data.folder_id;}catch(e){}
  return CENTRAL_ROOT_ID;
}
/* Agentlik hesabı adına yükləmə — işçinin Drive-ı qoşulu olmasa da işləyir */
function driveOwnerUpload(file,name,parent,onProgress){return new Promise(async(resolve,reject)=>{
  let j;try{j=await gdCall({action:"upload_session",name,mime:file.type||"application/octet-stream",size:file.size,parent});}catch(e){return reject(e);}
  if(!j||!j.ok||!j.url)return reject(new Error((j&&j.error)||"Drive yükləmə sessiyası açılmadı"));
  const xhr=new XMLHttpRequest();xhr.open('PUT',j.url,true);xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');
  xhr.upload.onprogress=e=>{if(e.lengthComputable&&onProgress)onProgress(Math.round(e.loaded/e.total*100));};
  xhr.onload=async()=>{if(xhr.status>=200&&xhr.status<300){let id;try{id=JSON.parse(xhr.responseText).id;}catch(e){}if(!id)return reject(new Error("Fayl ID yoxdur"));
      try{await gdCall({action:"share",id});}catch(e){}resolve('https://drive.google.com/file/d/'+id+'/view');}
    else reject(new Error("Drive yükləmə xətası ("+xhr.status+")"));};
  xhr.onerror=()=>reject(new Error("Şəbəkə xətası"));xhr.send(file);
});}
async function uploadEditFiles(files,b,btn){
  if(!files.length)return [];
  const parent=await editDriveParent(b.client);const out=[];
  for(let i=0;i<files.length;i++){
    const f=files[i],tag=`Yüklənir ${files.length>1?(i+1)+"/"+files.length+" · ":""}`;btn.textContent=tag+"0%";
    const name=`Düzəliş — ${b.client} — ${new Date().toISOString().slice(0,10)} — ${f.name}`;
    try{const url=await driveOwnerUpload(f,name,parent,pc=>{btn.textContent=tag+pc+"%";});out.push({url,type:f.type.startsWith("video")?"video":"foto",name:f.name});}
    catch(e){alert(f.name+" yüklənmədi: "+(e.message||e));return null;}
  }
  return out;
}
function editFilesHtml(list){const a=Array.isArray(list)?list:[];if(!a.length)return "";
  return `<div class="edfiles">${a.map(f=>{
    if(!f.url)return fileChip(f.path,(f.type==="video"?"🎬 ":"🖼 ")+f.name);
    const id=driveId(f.url);const v=f.type==="video";
    return `<a class="edthumb" data-edview="${esc(f.url)}" data-t="${v?"video":"foto"}" title="${esc(f.name)} — panelde bax">${id?`<img src="https://drive.google.com/thumbnail?id=${esc(id)}&sz=w200" alt="" loading="lazy" onerror="this.remove()">`:""}<span class="edic">${v?"▶":"🖼"}</span></a>`;}).join("")}</div>`;}
/* Drive faylını panelin içində aç (foto və ya video) */
function openDrivePreview(url,kind){
  const id=driveId(url);const src=id?"https://drive.google.com/file/d/"+id+"/preview":url;
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:900px;width:94vw"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><strong>${kind==="video"?"🎬 Video":"🖼 Foto"}</strong><a href="${esc(url)}" target="_blank" rel="noopener" class="chip c-accent" style="text-decoration:none">Drive-da aç ↗</a><button class="btn ghost" data-x style="margin-left:auto;padding:6px 12px">Bağla</button></div>
    <div style="height:min(74vh,720px);background:#000;border-radius:10px;overflow:hidden"><iframe src="${esc(src)}" allow="autoplay; fullscreen" allowfullscreen style="width:100%;height:100%;border:0"></iframe></div>
    ${kind==="video"?`<div class="hint" style="white-space:normal;margin-top:8px">Yeni yüklənən video Drive-da bir neçə dəqiqə hazırlanır — oynamırsa bir az sonra yenidən aç.</div>`:""}</div>`;
  document.body.appendChild(scrim);
  const close=()=>scrim.remove();scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
}
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("[data-edview]");if(!a)return;e.preventDefault();e.stopPropagation();openDrivePreview(a.dataset.edview,a.dataset.t);},true);
function openBriefRevision(b,motion){
  if(!b)return;
  if(motion)return openMotionRevision(b);
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>✏️ Düzəliş istə</h3><button data-x>×</button></div><div class="mb">
    <div class="hint" style="margin-bottom:10px;white-space:normal">${esc(b.client)} · ${esc(String(b.title).split("\n")[0].slice(0,80))}${b.designer?" — dizayner: <b>"+esc(b.designer)+"</b>":""}</div>
    <div class="field"><label>Nə düzəlməlidir?</label><textarea id="rvtx" rows="6" style="line-height:1.5" placeholder="Məs.&#10;• Başlıq daha qalın olsun&#10;• Endirim faizi qırmızı rəngdə&#10;• Ünvan aşağıda, kiçik şriftlə"></textarea></div>
    ${editAttachHtml()}
    ${briefJpgs(b).length?`<button type="button" class="btn ghost" id="rvpin" style="width:100%;padding:9px">📍 Şəklin üzərində nöqtə ilə göstər</button><div class="hint" style="margin-top:6px;white-space:normal">Nöqtələr dərhal dizaynerə gedir; sonra bu pəncərəyə qayıdıb «Göndər» bas.</div>`:""}
  </div><div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" id="rvok">Dizaynerə göndər</button></div></div>`;
  document.body.appendChild(scrim);
  const close=()=>scrim.remove();
  scrim.querySelectorAll("[data-x]").forEach(x=>x.onclick=close);scrim.onclick=e=>{if(e.target===scrim)close();};
  const pinBtn=scrim.querySelector("#rvpin");if(pinBtn)pinBtn.onclick=()=>openImageReview(b);
  const att=wireEditAttach(scrim);
  scrim.querySelector("#rvtx").focus();
  scrim.querySelector("#rvok").onclick=async()=>{
    const note=scrim.querySelector("#rvtx").value.trim();
    const pins=briefOpenPins(b);
    if(!note&&!pins&&!att.length){alert("Düzəlişi yaz, foto / video əlavə et və ya şəklin üzərində nöqtə ilə göstər.");return;}
    const ok=scrim.querySelector("#rvok");ok.disabled=true;
    const up=await uploadEditFiles(att,b,ok);if(!up){ok.disabled=false;ok.textContent="Dizaynerə göndər";return;}
    const n=(+b.edit_count||0)+1;
    await upd('briefs',b.id,{status:"İcrada",edit_note:note||(up.length?"Əlavə olunan foto / videoya bax.":"Şəklin üzərindəki 📍 nöqtələrə bax."),edit_files:up,edit_count:n,edit_src:null,edit_by:myName(),edit_by_id:me?me.id:null,edit_at:new Date().toISOString()});
    const body=`Məkan: ${b.client}\nDüzəliş #${n} — ${myName()}\n\n${note||(up.length?"Əlavə olunan foto / videoya bax.":"Şəklin üzərindəki nöqtələrə bax.")}${up.length?"\n\n📎 "+up.length+" fayl əlavə olunub — brif kartında.":""}${pins?"\n\n📍 Şəkil üzərində "+pins+" açıq qeyd var — «📍 Şəkildə rəy»-ə bax.":""}\n\nBrif: ${String(b.title).split("\n")[0].slice(0,80)}`;
    const ids=briefDesignerIds(b).filter(id=>!me||id!==me.id);
    try{await sb.from('notifications').insert(ids.length?ids.map(id=>({target_type:"user",target:id,title:"✏️ Dizayna düzəliş var",body,from_name:myName(),from_id:me?me.id:null,read_by:[]}))
      :[{target_type:"role",target:"designer",title:"✏️ Dizayna düzəliş var",body,from_name:myName(),from_id:me?me.id:null,read_by:[]}]);}catch(e){}
    close();
  };
}
/* Müştəri düzəlişi: «Hazır» brifə müştəri sonradan düzəliş verəndə — dizayn / motion / hər ikisi bir addımda yenidən açılır.
   Ayrıca sayılır (client_edit_count / client_motion_edit_count) — dizaynerin öz düzəliş göstəricisinə düşmür. */
function openClientRevision(b){
  if(!b)return;
  const hasD=!isMotionOnly(b),hasM=!!b.motion||isMotionOnly(b);
  const opts=hasD&&hasM?[["design","🎨 Dizayn"],["motion","🎞 Motion"],["both","🎨 + 🎞 Hər ikisi"]]:[[hasD?"design":"motion",""]];
  let scope=opts[0][0];
  const pre=b.client_ok==="changes"?String(b.client_note||""):"";
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>👤 Müştəri düzəlişi</h3><button data-x>×</button></div><div class="mb">
    <div class="hint" style="margin-bottom:10px;white-space:normal">${esc(b.client)} · ${esc(String(b.title).split("\n")[0].slice(0,80))}<br>Brif yenidən açılır. Bu düzəliş dizaynerin öz düzəliş göstəricisinə yazılmır.</div>
    ${opts.length>1?`<div class="field"><label>Müştəri nəyə düzəliş istəyir?</label><div style="display:flex;gap:6px;flex-wrap:wrap">${opts.map(o=>`<button type="button" class="mini" data-sc="${o[0]}">${o[1]}</button>`).join("")}</div></div>`:""}
    <div class="field" id="cfd"><label>🎨 Dizayna düzəliş${b.designer?" — "+esc(b.designer):""}</label><textarea id="cdtx" rows="5" style="line-height:1.5" placeholder="Məs.&#10;• Qiymət 25 ₼ yox, 29 ₼&#10;• Logonu böyüt"></textarea></div>
    <div class="field" id="cfm"><label>🎞 Motion-a düzəliş${b.motion_by?" — "+esc(b.motion_by):""} (vaxt göstər: məs. 0:05)</label><textarea id="cmtx" rows="5" style="line-height:1.5" placeholder="Məs.&#10;• 0:03 — yazı daha gec çıxsın&#10;• Musiqi dəyişsin"></textarea></div>
    ${editAttachHtml()}
    ${hasD&&briefJpgs(b).length?`<div id="rvpinw"><button type="button" class="btn ghost" id="rvpin" style="width:100%;padding:9px">📍 Şəklin üzərində nöqtə ilə göstər</button><div class="hint" style="margin-top:6px;white-space:normal">Nöqtələri qoyduqdan sonra bu pəncərəyə qayıdıb «Göndər» bas.</div></div>`:""}
  </div><div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" id="rvok">Göndər</button></div></div>`;
  document.body.appendChild(scrim);
  const close=()=>scrim.remove();
  scrim.querySelectorAll("[data-x]").forEach(x=>x.onclick=close);scrim.onclick=e=>{if(e.target===scrim)close();};
  const pinBtn=scrim.querySelector("#rvpin");if(pinBtn)pinBtn.onclick=()=>openImageReview(b);
  const att=wireEditAttach(scrim);
  const ok=scrim.querySelector("#rvok");
  const sync=()=>{
    scrim.querySelector("#cfd").style.display=scope!=="motion"?"":"none";
    scrim.querySelector("#cfm").style.display=scope!=="design"?"":"none";
    const pw=scrim.querySelector("#rvpinw");if(pw)pw.style.display=scope!=="motion"?"":"none";
    scrim.querySelectorAll("[data-sc]").forEach(x=>{const on=x.dataset.sc===scope;x.style.background=on?"var(--accent)":"";x.style.color=on?"#fff":"";x.style.borderColor=on?"var(--accent)":"";});
    ok.textContent=scope==="motion"?"Motion dizaynerə göndər":scope==="both"?"Dizayner və motiona göndər":"Dizaynerə göndər";
  };
  scrim.querySelectorAll("[data-sc]").forEach(x=>x.onclick=()=>{scope=x.dataset.sc;sync();});
  scrim.querySelector(hasD?"#cdtx":"#cmtx").value=pre;
  sync();scrim.querySelector(scope==="motion"?"#cmtx":"#cdtx").focus();
  ok.onclick=async()=>{
    const dn=scrim.querySelector("#cdtx").value.trim(),mn=scrim.querySelector("#cmtx").value.trim();
    const wantD=scope!=="motion",wantM=scope!=="design";
    const pins=wantD?briefOpenPins(b):0;
    if(wantD&&!dn&&!pins&&!att.length){alert("Dizayna düzəlişi yaz, foto / video əlavə et və ya şəklin üzərində nöqtə ilə göstər.");return;}
    if(wantM&&!mn&&!att.length){alert("Motion-a düzəlişi yaz və ya foto / video əlavə et.");return;}
    const lbl=ok.textContent;ok.disabled=true;
    const up=await uploadEditFiles(att,b,ok);if(!up){ok.disabled=false;ok.textContent=lbl;return;}
    const now=new Date().toISOString(),by=myName(),byId=me?me.id:null,ttl=String(b.title).split("\n")[0].slice(0,80);
    const dNote=dn||(up.length?"Əlavə olunan foto / videoya bax.":"Şəklin üzərindəki 📍 nöqtələrə bax."),mNote=mn||"Əlavə olunan foto / videoya bax.";
    const fl=up.length?"\n\n📎 "+up.length+" fayl əlavə olunub — brif kartında.":"";
    const patch={client_edit_scope:scope,client_ok:null,first_done_at:b.first_done_at||b.done_at||null};
    let dc=0,mc=0;
    if(wantD){dc=(+b.client_edit_count||0)+1;
      Object.assign(patch,{status:"İcrada",edit_note:dNote,edit_files:up,edit_count:(+b.edit_count||0)+1,client_edit_count:dc,edit_src:"client",edit_by:by,edit_by_id:byId,edit_at:now});}
    if(wantM){mc=(+b.client_motion_edit_count||0)+1;
      Object.assign(patch,{motion_edit_note:mNote,motion_edit_files:up,motion_edit_count:(+b.motion_edit_count||0)+1,client_motion_edit_count:mc,motion_edit_src:"client",motion_edit_by:by,motion_edit_by_id:byId,motion_edit_at:now});
      if(!wantD)Object.assign(patch,{status:"Motion",motion_stage:b.motion_by?"İcrada":""});}
    await upd('briefs',b.id,patch);
    const rows=[];
    const push=(all,role,title,body)=>{const ids=all.filter(id=>!me||id!==me.id);
      if(ids.length)ids.forEach(id=>rows.push({target_type:"user",target:id,title,body,from_name:by,from_id:byId,read_by:[]}));
      else if(!all.length)rows.push({target_type:"role",target:role,title,body,from_name:by,from_id:byId,read_by:[]});};
    if(wantD)push(briefDesignerIds(b),"designer","👤 Müştəri dizayna düzəliş istədi",
      `Məkan: ${b.client}\nMüştəri düzəlişi #${dc} — ${by} ötürdü\n\n${dNote}${fl}${pins?"\n\n📍 Şəkil üzərində "+pins+" açıq qeyd var — «📍 Rəy»-ə bax.":""}${wantM?"\n\n🎞 Motion-a da düzəliş var — dizayn təsdiqlənəndən sonra motion dizaynerə keçəcək.":""}\n\nBrif: ${ttl}`);
    if(wantM)push(state.profiles.filter(p=>b.motion_by&&(p.full_name===b.motion_by||p.username===b.motion_by)).map(p=>p.id),"motion","👤 Müştəri motion-a düzəliş istədi",
      `Məkan: ${b.client}\nMüştəri motion düzəlişi #${mc} — ${by} ötürdü\n\n${mNote}${fl}${wantD?"\n\n⏳ Əvvəlcə dizayn düzəldilir — dizayn təsdiqlənəndən sonra motion sizə qayıdacaq.":""}\n\nBrif: ${ttl}`);
    try{if(rows.length)await sb.from('notifications').insert(rows);}catch(e){}
    close();
  };
}
function openMotionRevision(b){
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>✏️ Motion-a düzəliş</h3><button data-x>×</button></div><div class="mb">
    <div class="hint" style="margin-bottom:10px;white-space:normal">${esc(b.client)} · ${esc(String(b.title).split("\n")[0].slice(0,80))}${b.motion_by?" — motion: <b>"+esc(b.motion_by)+"</b>":""}</div>
    ${briefMotions(b).length?`<div style="margin-bottom:10px;display:flex;gap:5px;flex-wrap:wrap">${briefMotions(b).map((u,i,L)=>fileChip(u,"🎞 Motion"+(L.length>1?" "+(i+1):""))).join("")}</div>`:""}
    <div class="field"><label>Nə düzəlməlidir? (vaxt göstər: məs. 0:05)</label><textarea id="rvtx" rows="6" style="line-height:1.5" placeholder="Məs.&#10;• 0:03 — yazı daha gec çıxsın&#10;• 0:08 — keçid daha yumşaq&#10;• Musiqi bir az aşağı"></textarea></div>
    ${editAttachHtml()}
  </div><div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" id="rvok">Motion dizaynerə göndər</button></div></div>`;
  document.body.appendChild(scrim);wireFiles(scrim);
  const close=()=>scrim.remove();
  scrim.querySelectorAll("[data-x]").forEach(x=>x.onclick=close);scrim.onclick=e=>{if(e.target===scrim)close();};
  const att=wireEditAttach(scrim);
  scrim.querySelector("#rvtx").focus();
  scrim.querySelector("#rvok").onclick=async()=>{
    let note=scrim.querySelector("#rvtx").value.trim();
    if(!note&&!att.length){alert("Düzəlişi yaz və ya foto / video əlavə et.");return;}
    const ok=scrim.querySelector("#rvok");ok.disabled=true;
    const up=await uploadEditFiles(att,b,ok);if(!up){ok.disabled=false;ok.textContent="Motion dizaynerə göndər";return;}
    if(!note)note="Əlavə olunan foto / videoya bax.";
    const n=(+b.motion_edit_count||0)+1;
    await upd('briefs',b.id,{motion_stage:"İcrada",motion_edit_note:note,motion_edit_files:up,motion_edit_count:n,motion_edit_src:null,motion_edit_by:myName(),motion_edit_by_id:me?me.id:null,motion_edit_at:new Date().toISOString()});
    const body=`Məkan: ${b.client}\nMotion düzəlişi #${n} — ${myName()}\n\n${note}${up.length?"\n\n📎 "+up.length+" fayl əlavə olunub — brif kartında.":""}\n\nBrif: ${String(b.title).split("\n")[0].slice(0,80)}`;
    const ids=state.profiles.filter(p=>b.motion_by&&(p.full_name===b.motion_by||p.username===b.motion_by)).map(p=>p.id).filter(id=>!me||id!==me.id);
    try{await sb.from('notifications').insert(ids.length?ids.map(id=>({target_type:"user",target:id,title:"✏️ Motion-a düzəliş var",body,from_name:myName(),from_id:me?me.id:null,read_by:[]}))
      :[{target_type:"role",target:"motion",title:"✏️ Motion-a düzəliş var",body,from_name:myName(),from_id:me?me.id:null,read_by:[]}]);}catch(e){}
    close();
  };
}
async function openImageReview(b,idx){
  const list=briefJpgs(b);if(!list.length)return;idx=Math.max(0,Math.min(+idx||0,list.length-1));
  const path=list[idx];const target=jpgTarget(b,path);const id=driveId(path);
  let src=path;
  if(id)src=`https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
  else if(!/^https?:\/\//.test(path)){const {data}=await sb.storage.from('crm-files').createSignedUrl(path,3600);src=data&&data.signedUrl||"";}
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:1080px;width:96vw"><div class="mh"><h3>${esc(b.client)} · ${esc(b.title).slice(0,60)} — rəy</h3><button data-x>×</button></div>
    <div class="mb" style="display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:16px" id="irgrid">
      <div style="min-width:0">${list.length>1?`<div class="seg" style="margin:0 0 10px;flex-wrap:wrap">${list.map((u,i)=>{const n=annFor(jpgTarget(b,u)).filter(a=>!a.resolved).length;return `<button type="button" data-vi="${i}" class="${i===idx?"on":""}">Variant ${i+1}${n?" · "+n:""}</button>`;}).join("")}</div>`:""}<div id="ibox" style="position:relative;cursor:crosshair;border-radius:10px;overflow:hidden;background:var(--surface-2)"><img id="iimg" src="${esc(src)}" alt="Dizayn" style="display:block;width:100%;height:auto;user-select:none" draggable="false"></div>
        <div class="hint" style="margin-top:6px;white-space:normal">Şəklin üzərində düzəliş lazım olan yerə toxun və rəyini yaz.</div></div>
      <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
        <div id="iform" style="display:none;flex-direction:column;gap:8px"><div class="field" style="margin:0"><label id="ilbl">📍 Yeni nöqtə</label><textarea id="itx" placeholder="Məs. başlıq daha qalın olsun…" style="min-height:70px"></textarea></div>
          <div style="display:flex;gap:6px"><button class="btn" id="iadd" style="flex:1">${ICON.plus} Əlavə et</button><button class="btn ghost" id="icancel">Ləğv</button></div></div>
        <div id="ilist" style="display:grid;gap:2px;max-height:56vh;overflow:auto"></div>
      </div></div></div>`;
  document.body.appendChild(scrim);
  if(window.innerWidth<760)scrim.querySelector("#irgrid").style.gridTemplateColumns="1fr";
  const close=()=>{window._annRefresh=null;scrim.remove();};
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  scrim.querySelectorAll("[data-vi]").forEach(x=>x.onclick=()=>{close();openImageReview(state.briefs.find(y=>y.id===b.id)||b,+x.dataset.vi);});
  const box=scrim.querySelector("#ibox"),img=scrim.querySelector("#iimg"),form=scrim.querySelector("#iform"),tx=scrim.querySelector("#itx");
  img.onerror=()=>{box.style.cursor="default";box.innerHTML=`<div class="empty" style="padding:40px 16px;white-space:normal">Şəkil açılmadı — JPG faylı Drive-da paylaşılmayıb və ya şəkil deyil.<br><a href="${esc(path)}" target="_blank" rel="noopener">Faylı aç ↗</a></div>`;};
  let pend=null;
  const pin=(n,x,y,cls)=>{const p=el("div",null,String(n));p.style.cssText=`position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:700 12px var(--fmono);color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);pointer-events:none;background:${cls}`;return p;};
  const draw=()=>{box.querySelectorAll(".annpin").forEach(x=>x.remove());const list=scrim.querySelector("#ilist");if(!list)return;list.innerHTML="";
    const L=annFor(target).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
    L.forEach((a,k)=>{const p=pin(k+1,a.x,a.y,a.resolved?"var(--good)":"var(--crit)");p.classList.add("annpin");box.appendChild(p);
      list.appendChild(annRow(a,"#"+(k+1),()=>{p.animate([{transform:"translate(-50%,-50%) scale(1.6)"},{transform:"translate(-50%,-50%) scale(1)"}],{duration:450});}));});
    if(pend){const p=pin(L.length+1,pend.x,pend.y,"var(--accent)");p.classList.add("annpin");box.appendChild(p);scrim.querySelector("#ilbl").textContent="📍 Nöqtə #"+(L.length+1);}
    if(!L.length&&!pend)list.appendChild(el("div","empty","Hələ rəy yoxdur — şəklə toxun"));};
  window._annRefresh=draw;
  box.onclick=e=>{if(e.target!==img)return;const r=img.getBoundingClientRect();pend={x:+((e.clientX-r.left)/r.width*100).toFixed(2),y:+((e.clientY-r.top)/r.height*100).toFixed(2)};form.style.display="flex";draw();tx.focus();};
  scrim.querySelector("#icancel").onclick=()=>{pend=null;form.style.display="none";tx.value="";draw();};
  scrim.querySelector("#iadd").onclick=async()=>{const body=tx.value.trim();if(!body||!pend)return;
    if(await addAnn({target,x:pend.x,y:pend.y,body})){pend=null;tx.value="";form.style.display="none";draw();
      const dz=state.profiles.find(p=>b.designer&&(p.full_name===b.designer||p.username===b.designer));
      if(dz&&(!me||dz.id!==me.id))try{await sb.from('notifications').insert({target_type:"user",target:dz.id,title:"📍 Dizayna rəy gəldi",body:`${b.client} · «${String(b.title).slice(0,60)}»${list.length>1?" · Variant "+(idx+1):""}: ${body} — ${myName()}`,from_name:myName(),from_id:me?me.id:null,read_by:[]});}catch(e){}}};
  draw();
}
/* ---------- Content ---------- */
/* Kontent PDF → Drive: Ortaq qovluq / Müştəri / Ay. replace=true köhnə faylı silir; təsdiqdən sonra əvəzlənərsə yenidən təsdiqə gedir. */
async function contentPdf(c,replace){
  if(!c)return;
  if(!(await driveReady())){try{await connectDrive();}catch(e){alert(e.message||e);return;}alert("Drive qoşuldu ✓ İndi yenidən bas və PDF-i seç.");return;}
  const reAppr=replace&&c.status!=="Hazırlanır";
  if(reAppr&&!confirm("Yeni PDF yenidən təsdiqə gedəcək (təsdiqlər sıfırlanır). Davam edək?"))return;
  const old=c.file;
  await drivePickAndUpload(".pdf",async link=>{
    const patch={file:link};
    if(reAppr){patch.status="Təsdiq gözləyir";APPROVERS.forEach(a=>patch['appr_'+a[0]]=false);}
    await upd('content',c.id,patch);
    if(replace&&old&&old!==link){const id=driveId(old);try{if(id)await driveDelete(id);else if(!/^https?:\/\//.test(old))await sb.storage.from('crm-files').remove([old]);}catch(e){}}
  },{client:c.client,sub:c.month||MONTHS_AZ[calM],cat:"Kontent"});
}
/* ---------- Kontent planı qurucusu → məkanın brendinə uyğun PDF → təsdiq axını ---------- */
const PLAN_TYPES=[["yumor","😂 Yumor","#E8A33D"],["trend","🔥 Trend","#E5484D"],["kontent","🎬 Kontent","#6E5AE6"]];
const planType=k=>PLAN_TYPES.find(x=>x[0]===k)||PLAN_TYPES[2];
const planBlank=()=>({type:"kontent",title:"",caption:"",links:[],note:""});
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("PDF kitabxanası yüklənmədi — interneti yoxla."));document.head.appendChild(s);});}
async function planLibs(){
  if(!window.html2canvas)await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  if(!(window.jspdf&&window.jspdf.jsPDF))await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
}
function linkInfo(u){
  let host="",seg=[];try{const x=new URL(u);host=x.hostname.replace(/^(www|m|vm|vt)\./,"");seg=x.pathname.split("/").filter(Boolean);}catch(e){return {platform:"Link",kind:"",handle:""};}
  if(/instagram\.com$/.test(host)){const k=seg[0]||"";const kind=/^reels?$/.test(k)?"Reels":k==="p"?"Post":k==="stories"?"Story":k==="tv"?"Video":"Profil";const h=k==="stories"?seg[1]:(["reel","reels","p","tv"].includes(k)?"":k);return {platform:"Instagram",kind,handle:h?"@"+h:""};}
  if(/tiktok\.com$/.test(host))return {platform:"TikTok",kind:"Video",handle:seg.find(s=>s.startsWith("@"))||""};
  if(/youtube\.com$|youtu\.be$/.test(host))return {platform:"YouTube",kind:seg[0]==="shorts"?"Shorts":"Video",handle:seg.find(s=>s.startsWith("@"))||""};
  if(/facebook\.com$|fb\.watch$/.test(host))return {platform:"Facebook",kind:seg.includes("reel")?"Reels":"Video",handle:""};
  if(/pinterest\./.test(host))return {platform:"Pinterest",kind:"Pin",handle:""};
  if(/drive\.google\.com$/.test(host))return {platform:"Google Drive",kind:"Fayl",handle:""};
  return {platform:host||"Link",kind:"",handle:""};
}
const LINK_THUMB_URL=SB_URL+"/functions/v1/link-thumb";const thumbMemo={};
function linkThumb(u){if(!thumbMemo[u])thumbMemo[u]=(async()=>{try{const {data:{session}}=await sb.auth.getSession();const r=await fetch(LINK_THUMB_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+(session?session.access_token:"")},body:JSON.stringify({url:u})});const j=await r.json();return j&&j.ok?j:null;}catch(e){return null;}})().then(j=>{if(!j)delete thumbMemo[u];return j;});return thumbMemo[u];}
const planOkChip=c=>{const L=(c.plan&&c.plan.items)||[];const ok=L.filter(x=>x.client_ok==="ok").length,ch=L.filter(x=>x.client_ok==="changes").length;if(!ok&&!ch)return "";
  return `<span class="chip ${ch?"c-warn":"c-good"}" style="font-size:10px;padding:2px 7px" title="${esc(L.map((x,i)=>x.client_ok==="changes"?`#${i+1}: ${x.client_note||""}`:"").filter(Boolean).join("\n"))}">👤 Videolar: ${ok}✓${ch?" · "+ch+"✏️":""} / ${L.length}</span>`;};
const planLinks=s=>String(s||"").split(/\s+/).map(x=>x.trim()).filter(x=>/^https?:\/\/\S+\.\S+/.test(x));
function hexes(s){return (String(s||"").match(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi)||[]).map(h=>h.length===4?"#"+h.slice(1).split("").map(x=>x+x).join(""):h);}
function onColor(hex){const n=parseInt(hex.slice(1),16);const r=n>>16&255,g=n>>8&255,b=n&255;return (0.299*r+0.587*g+0.114*b)>160?"#16131F":"#FFFFFF";}
async function planFont(fam){
  if(!fam)return false;const id="gf-"+fam.replace(/\W/g,"");
  const add=q=>new Promise(r=>{const l=document.createElement("link");l.id=id;l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family="+q+"&display=swap";l.onload=l.onerror=r;setTimeout(r,4000);document.head.appendChild(l);});
  const q=encodeURIComponent(fam).replace(/%20/g,"+");
  if(!document.getElementById(id))await add(q+":wght@400;600;700;800");
  try{await document.fonts.load(`700 20px "${fam}"`);if(document.fonts.check(`700 20px "${fam}"`))return true;await add(q);await document.fonts.load(`400 20px "${fam}"`);return document.fonts.check(`400 20px "${fam}"`);}catch(e){return false;}
}
async function planLogo(url){
  if(!url)return "";
  try{const id=driveId(url);let r;
    if(id){if(!(await driveReady()))return "";const t=await gToken();r=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`,{headers:{Authorization:"Bearer "+t}});}
    else r=await fetch(url);
    if(!r.ok)return "";const blob=await r.blob();if(!/^image\//.test(blob.type))return "";
    return await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>res("");fr.readAsDataURL(blob);});
  }catch(e){return "";}
}
/* A4 = 794×1123 px. Səhifələri özümüz yığırıq ki, kart iki səhifəyə bölünməsin; linklər PDF-də kliklənən qalır. */
async function planPdf(c,plan){
  await planLibs();
  const cl=state.clients.find(x=>x.name===c.client)||{};const br=cl.brand||{};
  const hx=hexes(br.colors);const P=hx[0]||"#1A1626",A=hx[1]||hx[0]||"#6E5AE6";const PI=onColor(P),AI=onColor(A);
  const fams=String(br.fonts||"").split(/[,/;]+/).map(s=>s.replace(/["']/g,"").trim()).filter(Boolean);
  const HF=(fams[0]&&await planFont(fams[0]))?fams[0]:((await planFont("Sora"))?"Sora":"sans-serif");
  const BF=(fams[1]&&await planFont(fams[1]))?fams[1]:((await planFont("Manrope"))?"Manrope":"sans-serif");
  const logo=await planLogo(br.logo);
  const items=plan.items;const cnt=k=>items.filter(x=>x.type===k).length;
  const now=new Date();const yr=now.getFullYear();
  const W=794,H=1123,PAD=48,HEAD=70,FOOT=46,AVAIL=H-HEAD-FOOT-24;
  const css=`<style>
    .pp{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:#fff;color:#1d1b26;font-family:"${BF}",sans-serif;box-sizing:border-box}
    .pp *{box-sizing:border-box}
    .cv{background:${P};color:${PI};padding:72px 64px;display:flex;flex-direction:column}
    .cv .lg{width:128px;height:128px;border-radius:24px;background:#fff;display:grid;place-items:center;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.18)}
    .cv .lg img{max-width:104px;max-height:104px;object-fit:contain}
    .cv .lg b{font:800 44px "${HF}";color:${P}}
    .cv .eb{margin-top:auto;font:700 15px "${BF}";letter-spacing:.24em;text-transform:uppercase;opacity:.75}
    .cv h1{font:800 76px/1.02 "${HF}";margin:14px 0 0;letter-spacing:-.02em}
    .cv .mo{font:600 30px "${HF}";margin-top:14px;opacity:.9}
    .cv .st{display:flex;gap:14px;margin-top:48px}
    .cv .st div{flex:1;border-radius:18px;padding:18px 20px;background:${PI==="#FFFFFF"?"rgba(255,255,255,.12)":"rgba(0,0,0,.06)"}}
    .cv .st b{display:block;font:800 40px "${HF}"}
    .cv .st span{font-size:14px;opacity:.85}
    .cv .ft{display:flex;justify-content:space-between;margin-top:56px;font-size:14px;opacity:.75;border-top:1px solid ${PI==="#FFFFFF"?"rgba(255,255,255,.25)":"rgba(0,0,0,.15)"};padding-top:18px}
    .hd{position:absolute;left:0;right:0;top:0;height:${HEAD}px;display:flex;align-items:center;gap:12px;padding:0 ${PAD}px;border-bottom:3px solid ${A}}
    .hd img{height:34px;max-width:90px;object-fit:contain}
    .hd b{font:700 16px "${HF}"}.hd span{margin-left:auto;font-size:13px;color:#77718c}
    .fo{position:absolute;left:0;right:0;bottom:0;height:${FOOT}px;display:flex;align-items:center;padding:0 ${PAD}px;font-size:12px;color:#8a849c}
    .fo span{margin-left:auto}
    .bd{position:absolute;left:${PAD}px;right:${PAD}px;top:${HEAD+24}px}
    .it{border:1px solid #e6e2ef;border-left:6px solid ${A};border-radius:16px;padding:20px 22px;margin-bottom:16px;background:#fff}
    .it .tp{display:flex;align-items:center;gap:12px}
    .it .n{font:800 30px "${HF}";color:${A};min-width:46px}
    .it .ty{font:700 12px "${BF}";padding:5px 11px;border-radius:999px;color:#fff;white-space:nowrap}
    .it h2{font:700 21px/1.25 "${HF}";margin:0;color:#1d1b26}
    .lb{font:700 11px "${BF}";letter-spacing:.12em;text-transform:uppercase;color:#8a849c;margin:16px 0 6px}
    .tx{font-size:14.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
    .cap{background:#f7f5fb;border-radius:12px;padding:12px 14px}
    .rf{display:flex;align-items:center;gap:14px;border:1px solid #e6e2ef;border-radius:12px;padding:11px 14px;margin-top:8px}
    .rf .pl{font:700 13px "${BF}";color:#1d1b26}.rf .pl i{font-style:normal;color:#8a849c;font-weight:600}
    .rf .u{font-size:11.5px;color:#77718c;word-break:break-all;margin-top:3px;text-decoration:none;display:block}
    .rf .th{width:68px;height:120px;object-fit:cover;border-radius:10px;display:block;background:#eee}
    .rf .rt{font-size:12.5px;line-height:1.45;color:#3d394a;margin-top:4px}
    .rf .go{margin-left:auto;flex:none;background:${A};color:${AI};font:700 12.5px "${BF}";padding:9px 14px;border-radius:10px;text-decoration:none;white-space:nowrap}
    .in{border-radius:16px;padding:20px 22px;margin-bottom:16px;background:${P};color:${PI}}
    .in .lb{color:inherit;opacity:.75;margin-top:0}
  </style>`;
  const logoTag=logo?`<img src="${logo}" alt="">`:"";
  const header=`<div class="hd">${logoTag}<b>${esc(c.client)}</b><span>Kontent planı · ${esc(c.month||"")} ${yr}</span></div>`;
  const cover=`<div class="pp cv"><div class="lg">${logo?`<img src="${logo}" alt="">`:`<b>${esc(String(c.client||"?").trim().charAt(0).toUpperCase())}</b>`}</div>
    <div class="eb">Kontent planı</div><h1>${esc(c.client)}</h1><div class="mo">${esc(c.month||"")} ${yr}${c.title?" · "+esc(c.title):""}</div>
    <div class="st"><div><b>${items.length}</b><span>video</span></div>${PLAN_TYPES.filter(t=>cnt(t[0])>0).map(t=>`<div><b>${cnt(t[0])}</b><span>${t[1]}</span></div>`).join("")}</div>
    <div class="ft"><span>Hazırladı: ${esc(myName())}</span><span>${String(now.getDate()).padStart(2,"0")}.${String(now.getMonth()+1).padStart(2,"0")}.${yr} · MezMoon Agency</span></div></div>`;
  const block=(x,i)=>{const t=planType(x.type);const T=th[i]||[];
    return `<div class="it"><div class="tp"><span class="n">${String(i+1).padStart(2,"0")}</span><span class="ty" style="background:${t[2]}">${t[1]}</span><h2>${esc(x.title)}</h2></div>
      ${x.caption?`<div class="lb">Açıqlama (caption)</div><div class="tx cap">${esc(x.caption)}</div>`:""}
      ${x.links.length?`<div class="lb">Referans video${x.links.length>1?"lar":""}</div>${x.links.map((u,j)=>{const li=linkInfo(u);const tb=T[j];return `<div class="rf">${tb&&tb.data?`<a href="${esc(u)}" style="flex:none"><img class="th" src="${tb.data}" alt=""></a>`:""}<div style="min-width:0"><div class="pl">${esc(li.platform)}${li.kind?` <i>· ${esc(li.kind)}</i>`:""}${li.handle?` <i>· ${esc(li.handle)}</i>`:""}</div>${tb&&tb.title?`<div class="rt">${esc(tb.title.length>140?tb.title.slice(0,140)+"…":tb.title)}</div>`:""}<a class="u" href="${esc(u)}">${esc(u)}</a></div><a class="go" href="${esc(u)}">Videoya bax ↗</a></div>`;}).join("")}`:""}
      ${x.note?`<div class="lb">Necə çəkiləcək / niyə bu referans</div><div class="tx">${esc(x.note)}</div>`:""}</div>`;};
  const th=await Promise.all(items.map(x=>Promise.all(x.links.map(u=>linkThumb(u)))));
  items.forEach((x,i)=>{x.thumbs=th[i].map(r=>r&&r.path||null);});
  const blocks=[];if(plan.intro)blocks.push(`<div class="in"><div class="lb">Ayın ideyası</div><div class="tx">${esc(plan.intro)}</div></div>`);
  items.forEach((x,i)=>blocks.push(block(x,i)));
  const host=el("div");host.style.cssText=`position:fixed;left:-20000px;top:0;width:${W}px;z-index:-1`;host.innerHTML=css;document.body.appendChild(host);
  try{
    /* hündürlükləri ölç və səhifələrə payla */
    const meas=document.createElement("div");meas.className="pp";meas.style.height="auto";meas.innerHTML=`<div style="width:${W-2*PAD}px">${blocks.join("")}</div>`;host.appendChild(meas);
    const hs=[...meas.firstChild.children].map(n=>n.offsetHeight+16);meas.remove();
    const pages=[];let cur=[],used=0;
    blocks.forEach((b,i)=>{if(cur.length&&used+hs[i]>AVAIL){pages.push(cur);cur=[];used=0;}cur.push(b);used+=hs[i];});if(cur.length)pages.push(cur);
    const total=pages.length+1;
    const htmls=[cover,...pages.map((p,i)=>`<div class="pp">${header}<div class="bd">${p.join("")}</div><div class="fo">MezMoon Agency · ${esc(c.client)}<span>${i+2} / ${total}</span></div></div>`)];
    const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:"mm",format:"a4",orientation:"portrait",compress:true});const k=210/W;
    for(let i=0;i<htmls.length;i++){
      const wrap=document.createElement("div");wrap.innerHTML=htmls[i];const pg=wrap.firstChild;host.appendChild(pg);
      await Promise.all([...pg.querySelectorAll("img")].map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r;})));
      const cv=await html2canvas(pg,{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false,windowWidth:W});
      if(i)pdf.addPage();pdf.addImage(cv.toDataURL("image/jpeg",0.9),"JPEG",0,0,210,297);
      const pr=pg.getBoundingClientRect();
      pg.querySelectorAll("a[href]").forEach(a=>{const r=a.getBoundingClientRect();pdf.link((r.left-pr.left)*k,(r.top-pr.top)*k,r.width*k,r.height*k,{url:a.getAttribute("href")});});
      pg.remove();
    }
    return pdf.output("blob");
  }finally{host.remove();}
}
/* ---------- Referans arxivi + bənzər video axtarışı (Apify, 7 gün keş) ---------- */
const REF_SIMILAR_URL=SB_URL+"/functions/v1/ref-similar";
const refNorm=u=>{try{const x=new URL(u);x.hash="";const h=x.hostname.replace(/^(www|m)\./,"");if(/youtube\.com$/.test(h)){const v=x.searchParams.get("v");x.search=v?"?v="+v:"";}else x.search="";return x.toString();}catch(e){return u;}};
const tagsOf=s=>[...new Set((String(s||"").match(/#[\p{L}\p{N}_]+/gu)||[]).map(t=>t.slice(1).toLowerCase()))];
const GENERIC_TAGS=new Set(["reels","reel","reelsinstagram","fyp","foryou","foryoupage","viral","viralreels","explore","explorepage","instagram","instagood","trending","trend","tiktok","video","love","like","follow","funny","baku","azerbaijan","azərbaycan","bakı"]);
/* Qlobal sektor hashtagları — bir kliklə dünya üzrə populyar Reels */
const SECTOR_TAGS=[["🍽 Restoran",["restaurantreels","foodreels","chefsofinstagram"]],["🍸 Lounge / Bar",["cocktailbar","mixology","loungebar"]],["☕ Kafe",["coffeeshop","cafevibes","baristalife"]],["🎶 Canlı musiqi",["livemusicnight","restaurantlivemusic","dinnerwithmusic"]],["😂 Restoran yumoru",["waiterlife","serverlife","restauranthumor"]],["🔥 Trend",["restauranttrend","foodtrend","viralfood"]],["🍰 Desert",["dessertreels","pastrychef","cakereels"]],["🏨 Otel",["luxuryhotel","hotelreels","hoteltour"]]];
const LOCAL_TAG=/bak[uı]|azerbaijan|azerbaycan|azərbaycan|баку|азербайджан/i;
const fmtNum=n=>n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,"")+"M":n>=1e3?Math.round(n/1e3)+"K":String(n||0);
async function refArchive(client,items,source){
  const rows=[];
  for(const x of items)for(let j=0;j<x.links.length;j++){const u=x.links[j];const t=await linkThumb(u);const li=linkInfo(u);
    rows.push({url:refNorm(u),platform:li.platform,client,type:x.type,title:t&&t.title||null,thumb:(x.thumbs&&x.thumbs[j])||(t&&t.path)||null,tags:tagsOf(t&&t.title),source:source||"plan",added_by_name:myName(),last_used:new Date().toISOString()});}
  if(rows.length)try{await sb.from('ref_library').upsert(rows,{onConflict:"url"});}catch(e){}
}
function refModal(title,inner){const s=el("div","scrim");s.innerHTML=`<div class="modal" style="max-width:860px;width:96vw"><div class="mh"><h3>${title}</h3><button>×</button></div><div class="mb" style="max-height:74vh;overflow:auto">${inner}</div></div>`;document.body.appendChild(s);s.querySelector(".mh button").onclick=()=>s.remove();s.onclick=e=>{if(e.target===s)s.remove();};return s;}
const refCard=(r,btns)=>`<div class="kcard" style="margin:0;display:flex;gap:10px;padding:10px">
  <a href="${esc(r.url)}" target="_blank" rel="noopener" style="flex:none;width:64px;height:112px;border-radius:8px;overflow:hidden;background:var(--surface-2);display:grid;place-items:center;font-size:20px;text-decoration:none">${r.img?`<img src="${esc(r.img)}" referrerpolicy="no-referrer" loading="lazy" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.remove()">`:"▶"}</a>
  <div style="min-width:0;flex:1;display:flex;flex-direction:column;gap:4px"><div style="font-weight:600;font-size:12.5px">${esc(r.head)}</div>
  <div class="hint" style="white-space:normal;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(r.text||"")}</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:auto"><a class="adv" href="${esc(r.url)}" target="_blank" rel="noopener" style="text-decoration:none">Videoya bax ↗</a>${btns}</div></div></div>`;
async function openRefArchive(o){
  const s=refModal("📚 Referans arxivi",`<div class="hint" style="white-space:normal">Bütün kontent planlarındakı referanslar burada toplanır. Məkanın konseptinə uyğun olanı seç və videoya əlavə et.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><select id="ra-c" style="width:auto"><option value="${esc(o.client||"")}">${esc(o.client||"—")}</option><option value="">Bütün məkanlar</option></select>
    <select id="ra-t" style="width:auto"><option value="">Bütün növlər</option>${PLAN_TYPES.map(t=>`<option value="${t[0]}"${o.type===t[0]?" selected":""}>${t[1]}</option>`).join("")}</select>
    <input id="ra-q" placeholder="Axtar: söz, hashtag, @hesab…" style="flex:1;min-width:160px"></div>
    <div id="ra-l" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px"><div class="hint">Yüklənir…</div></div>`);
  const {data,error}=await sb.from('ref_library').select('*').order('last_used',{ascending:false}).limit(500);
  if(error){s.querySelector("#ra-l").innerHTML=`<div class="hint">Xəta: ${esc(error.message)}</div>`;return;}
  const all=data||[];const paths=[...new Set(all.map(r=>r.thumb).filter(Boolean))];const signed={};
  if(paths.length){const {data:sg}=await sb.storage.from('crm-files').createSignedUrls(paths,3600);(sg||[]).forEach(x=>{if(x.signedUrl)signed[x.path]=x.signedUrl;});}
  const canDel=role==="ceo"||(ROLES[role]&&ROLES[role].maker);
  const draw=()=>{const c=s.querySelector("#ra-c").value,t=s.querySelector("#ra-t").value,q=s.querySelector("#ra-q").value.trim().toLowerCase();
    const L=all.filter(r=>(!c||r.client===c)&&(!t||r.type===t)&&(!q||[r.title,r.url,r.client,(r.tags||[]).join(" ")].join(" ").toLowerCase().includes(q.replace(/^#/,""))));
    s.querySelector("#ra-l").innerHTML=L.length?L.map(r=>refCard({url:r.url,img:signed[r.thumb]||"",head:`${planType(r.type)[1]} · ${r.platform||""}${r.client?" · "+r.client:""}`,text:r.title||r.url},
      `${o.onPick?`<button class="adv" data-pick="${r.id}">+ Əlavə et</button>`:""}${canDel?`<button class="ibtn danger" data-rdel="${r.id}" title="Arxivdən sil">${ICON.trash}</button>`:""}`)).join(""):`<div class="hint" style="white-space:normal">${all.length?"Bu filtrə uyğun referans yoxdur.":"Arxiv hələ boşdur — kontent planı PDF-ə çevriləndə referanslar avtomatik bura düşür."}</div>`;
    s.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{const r=all.find(x=>x.id==b.dataset.pick);o.onPick(r.url);b.textContent="Əlavə olundu ✓";b.disabled=true;});
    s.querySelectorAll("[data-rdel]").forEach(b=>b.onclick=async()=>{if(!confirm("Bu referans arxivdən silinsin?"))return;await sb.from('ref_library').delete().eq('id',b.dataset.rdel);const i=all.findIndex(x=>x.id==b.dataset.rdel);if(i>=0)all.splice(i,1);draw();});};
  ["#ra-c","#ra-t"].forEach(id=>s.querySelector(id).onchange=draw);s.querySelector("#ra-q").oninput=draw;draw();
}
const REF_ANALYZE_URL=SB_URL+"/functions/v1/ref-analyze";
async function fnCall(url,body){const {data:{session}}=await sb.auth.getSession();let r;try{r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+(session?session.access_token:"")},body:JSON.stringify(body)});}catch(e){return {ok:false,error:"Serverlə əlaqə kəsildi — internet və ya vaxt aşımı. Bir də yoxla."};}
  return r.json().catch(()=>({ok:false,error:r.status===546||r.status===504?"Server vaxtında cavab vermədi ("+r.status+") — bir də yoxla":"Cavab yoxdur ("+r.status+")"}));}
/* ---------- Animasiyalar: səhifə keçidi, kartların ardıcıl görünməsi, rəqəm sayma, zəng, kanban FLIP, konfetti.
   Yalnız transform/opacity; «hərəkəti azalt» seçilibsə hamısı söndürülür. ---------- */
const fxReduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
const fx={badge:null};
/* Kanban kartlarının yeri (render-dən əvvəl) — sütun dəyişəndə yumşaq köçmə üçün */
function fxSnap(){const m=new Map();if(fxReduced())return m;document.querySelectorAll(".kcard[data-sid]").forEach(c=>m.set(c.dataset.sid,c.getBoundingClientRect()));return m;}
function fxAfter(root,vChanged,prev){
  if(!fxReduced()){
    if(vChanged)fxCount(root);
    if(prev&&prev.size)document.querySelectorAll(".kcard[data-sid]").forEach(c=>{const a=prev.get(c.dataset.sid);if(!a)return;const b=c.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;
      if(Math.abs(dx)<2&&Math.abs(dy)<2)return;if(Math.abs(dx)>window.innerWidth||Math.abs(dy)>window.innerHeight)return;
      c.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"none"}],{duration:380,easing:"cubic-bezier(.2,.8,.2,1)"});});
  }
  const nb=typeof notifBadge==="function"?notifBadge():0;
  if(fx.badge!==null&&nb>fx.badge&&!fxReduced()){const b=$("#bell");if(b){b.classList.remove("fx-ring");void b.offsetWidth;b.classList.add("fx-ring");}}
  fx.badge=nb;
}
/* KPI rəqəmləri 0-dan sayılır (yalnız sadə tam ədədlər, format pozulmasın deyə) */
function fxCount(root){root.querySelectorAll(".tile .val").forEach(v=>{const m=String(v.textContent).match(/^(\d{1,7})(\D*)$/);if(!m)return;const end=+m[1];if(end<2)return;
  const t0=performance.now(),dur=650;const step=now=>{const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3);v.textContent=Math.round(end*e)+m[2];if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);});}
/* Uğur anı: yüngül konfetti (1.4 san, sonra özü silinir) */
function fxConfetti(){if(fxReduced())return;const cv=document.createElement("canvas");cv.className="fx-confetti";cv.width=innerWidth;cv.height=innerHeight;document.body.appendChild(cv);
  const cx=cv.getContext("2d"),cols=["#6E5AE6","#9A8BF2","#D4FF3A","#1F9D63","#F7B731"],P=Array.from({length:70},()=>({x:innerWidth/2+(Math.random()-.5)*200,y:innerHeight*.35,vx:(Math.random()-.5)*11,vy:-Math.random()*11-4,s:4+Math.random()*5,r:Math.random()*6,c:cols[Math.random()*cols.length|0]}));
  const t0=performance.now();const tick=now=>{const k=(now-t0)/1400;cx.clearRect(0,0,cv.width,cv.height);P.forEach(p=>{p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.r+=.15;cx.save();cx.globalAlpha=Math.max(0,1-k);cx.translate(p.x,p.y);cx.rotate(p.r);cx.fillStyle=p.c;cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);cx.restore();});
    if(k<1)requestAnimationFrame(tick);else cv.remove();};requestAnimationFrame(tick);}
/* Düymədə dalğa (ripple) — klik nöqtəsindən */
function fxRipple(e,btn){if(fxReduced()||!btn)return;const r=btn.getBoundingClientRect(),s=document.createElement("span");s.className="fx-ripple";const d=Math.max(r.width,r.height)*2;
  s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;btn.appendChild(s);setTimeout(()=>s.remove(),650);}
/* ---------- Poster Studio: müğənni / lineup / xüsusi gün afişaları üçün yazısız AI şəkillər ----------
   Gemini 6 konsept (ingiliscə prompt) verir, Higgsfield GPT Image 2.5 Flare müğənni şəkilləri ilə yaradır.
   Server: functions/poster-studio.ts. Üslub mənbəyi: posterin 1 referansı (posters.ref) və ya nümunə kitabxanası (crm-files/poster-styles/). */
const POSTER_FN=SB_URL+"/functions/v1/poster-studio",PST_MAX=8;   // posterdə ən çox nəfər (3+ olanda server iki/üç mərhələdə hazırlayır)
const PST_KINDS={solo:"Solo müğənni",lineup:"Lineup",special:"Xüsusi gün"};
const pst={rows:null,open:null,ideasBusy:false,urls:{},timer:0,pendSeen:new Set(),shown:new Set()};
/* Hazırlanan kartlarda keçən vaxt (hər saniyə yalnız mətn yenilənir, kart yenidən çəkilmir) */
/* Şəkil hazır olanda brauzer tabının başlığında qısa bildiriş */
function pstDone(){const t0=document.title;if(/^✓/.test(t0))return;document.title="✓ Şəkil hazırdır · "+t0;setTimeout(()=>{if(document.title.startsWith("✓ Şəkil hazırdır · "))document.title=t0;},document.hidden?15000:4000);}
const pstClock=s=>{s=Math.max(0,s|0);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");};
setInterval(()=>{if(view!=="posters")return;document.querySelectorAll(".pst-el[data-at]").forEach(x=>{x.textContent=pstClock((Date.now()-Date.parse(x.dataset.at))/1000);});},1000);
async function pstLoad(){const {data}=await sb.from('posters').select('*').order('created_at',{ascending:false}).limit(60);pst.rows=data||[];render();}
async function pstSign(paths){const miss=[...new Set(paths.filter(x=>x&&!pst.urls[x]))];if(!miss.length)return;const {data}=await sb.storage.from('crm-files').createSignedUrls(miss,3600);(data||[]).forEach(x=>{if(x.signedUrl)pst.urls[x.path]=x.signedUrl;});}
const pstFill=root=>root.querySelectorAll("img[data-p]").forEach(im=>{const u=pst.urls[im.dataset.p];if(u&&im.src!==u)im.src=u;});
function renderPosters(){
  const wrap=el("div");
  if(pst.rows===null){pstLoad();wrap.appendChild(el("div","hint","Yüklənir…"));return wrap;}
  if(pst.open){const p=pst.rows.find(r=>r.id===pst.open);if(p)return renderPosterDetail(p);pst.open=null;}
  const bar=el("div");bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px";
  const nb=el("button","btn","+ Yeni poster");nb.onclick=pstNew;
  const sbt=el("button","btn ghost","🖼 Nümunə kitabxanası");sbt.onclick=openPosterStyles;
  bar.append(nb,sbt);wrap.appendChild(bar);
  if(!pst.rows.length){wrap.appendChild(el("div","panel",`<div style="padding:22px;color:var(--muted)">Hələ poster yoxdur. «+ Yeni poster» bas, müğənni şəkillərini əlavə et və yarat.</div>`));return wrap;}
  const g=el("div","cards3");
  const thumbs=pst.rows.map(p=>{const d=(p.results||[]).filter(r=>r.path);return d.length?d[d.length-1].path:(p.photos||[])[0]||"";});
  pst.rows.forEach((p,i)=>{const done=(p.results||[]).filter(r=>r.status==="done").length,tp=thumbs[i];
    const c=el("div","panel");c.style.cursor="pointer";c.tabIndex=0;c.setAttribute("role","button");
    c.innerHTML=`<div style="aspect-ratio:3/4;background:var(--surface-2);overflow:hidden">${tp?`<img data-p="${esc(tp)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`:""}</div>
      <div style="padding:10px 12px"><div style="font-weight:700">${esc(p.title||PST_KINDS[p.kind]||"Poster")}</div><div class="hint" style="font-size:11.5px">${esc(PST_KINDS[p.kind]||p.kind)} · ${done} şəkil</div></div>`;
    const go=()=>{pst.open=p.id;render();};c.onclick=go;c.onkeydown=e=>{if(e.key==="Enter")go();};g.appendChild(c);});
  wrap.appendChild(g);pstFill(g);pstSign(thumbs).then(()=>pstFill(g));return wrap;
}
/* Yeni poster dərhal yaradılır (məkan seçimi yoxdur) və iş sahəsi açılır */
async function pstNew(){const {data,error}=await sb.from('posters').insert({kind:"solo",title:"Yeni poster"}).select().single();if(error){alert("Xəta: "+error.message);return;}pst.rows=[data,...(pst.rows||[])];pst.open=data.id;render();}
const PST_ASPECTS=["9:16","3:4","2:3","1:1","4:3","16:9"],PST_Q={high:"Yüksək",xhigh:"Çox yüksək",medium:"Orta"};
const pstC={};
/* 4+ nəfər: dar 9:16 kadrda kimsə «itməsin» deyə ölçü avtomatik 3:4-ə keçir (istifadəçi yenə dəyişə bilər) */
function pstWide(p,C){if((p.photos||[]).length>=4&&(C.aspect==="9:16"||C.aspect==="2:3")){C.aspect="3:4";toast("4+ nəfər üçün kadr genişləndi: 3:4","ok");}}   // hər posterin prompt pəncərəsi vəziyyəti
/* Higgsfield üslubunda iş sahəsi: yuxarıda nəticələr, konseptlər zolağı, aşağıda prompt pəncərəsi və ikonlu seçimlər */
/* Poster Studio ikonları (Lucide üslubu, xətti) */
const PI={back:IC('<path d="m15 18-6-6 6-6"/>'),lib:IC('<path d="m16 6 4 14M12 6v14M8 8v12M4 4v16"/>'),trash:IC('<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/>'),
  user:IC('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),singers:IC('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
  img:IC('<path d="M16 5h6M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/><circle cx="9" cy="9" r="2"/>'),
  bulb:IC('<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>'),
  note:IC('<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4M2 10h4M2 14h4M2 18h4"/><path d="M21.4 5.6a2.1 2.1 0 1 0-3-3L12 9l-1 4 4-1z"/>'),
  wand:IC('<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72M14 7l3 3M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9"/>'),
  ratio:IC('<rect x="6" y="2" width="12" height="20" rx="2"/>'),grid:IC('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  gauge:IC('<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'),spark:IC('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4"/>'),
  star:IC('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'),dl:IC('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  frame:IC('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>'),again:IC('<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>'),
  pen:IC('<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>'),crop:IC('<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/>'),
  cut:IC('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>'),x:IC('<path d="M18 6 6 18M6 6l12 12"/>'),
  expand:IC('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),copy:IC('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  next:IC('<path d="m9 18 6-6-6-6"/>'),
  hd:IC('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M7 9v6M7 12h3M10 9v6M14 9v6h1.5a3 3 0 0 0 0-6z"/>')};
/* Higgsfield üslubunda iş sahəsi: yuxarıda nəticələr, konseptlər zolağı, aşağıda prompt pəncərəsi və ikonlu seçimlər */
function renderPosterDetail(p){
  const C=pstC[p.id]||(pstC[p.id]={prompt:"",style:p.ref||"",title:"",aspect:(p.photos||[]).length>=4?"3:4":"9:16",q:"high",n:"1",notes:false});
  const save=async patch=>{const {error}=await sb.from('posters').update(patch).eq('id',p.id);if(error){alert("Xəta: "+error.message);return false;}Object.assign(p,patch);return true;};
  const w=el("div","pst");
  const canDel=role==="ceo"||p.created_by===me.id;
  const top=el("div","pst-top");
  top.innerHTML=`<button class="pst-ib" data-back aria-label="Bütün posterlər" title="Bütün posterlər">${PI.back}</button>
    <input class="pst-title" data-tt value="${esc(p.title||"")}" placeholder="Poster adı" aria-label="Poster adı">
    <div class="pst-seg" role="group" aria-label="Tədbir növü">${Object.entries(PST_KINDS).map(([k,l])=>`<button data-k="${k}" class="${p.kind===k?"on":""}" aria-pressed="${p.kind===k}">${l}</button>`).join("")}</div>
    <span style="flex:1"></span><button class="pst-chip" data-lib title="Üslub kitabxanası">${PI.lib}Kitabxana</button>${canDel?`<button class="pst-ib danger" data-del title="Posteri sil" aria-label="Posteri sil">${PI.trash}</button>`:""}`;
  top.querySelector("[data-back]").onclick=()=>{clearTimeout(pst.timer);pst.open=null;render();};
  top.querySelector("[data-tt]").onchange=e=>save({title:e.target.value.trim()});
  top.querySelectorAll("[data-k]").forEach(b=>b.onclick=async()=>{if(await save({kind:b.dataset.k}))render();});
  top.querySelector("[data-lib]").onclick=openPosterStyles;
  const dl=top.querySelector("[data-del]");if(dl)dl.onclick=async()=>{if(!confirm("Bu poster və nəticələri silinsin?"))return;const files=[...(p.photos||[]),p.ref,...(p.results||[]).map(r=>r.path)].filter(Boolean);
    const {error}=await sb.from('posters').delete().eq('id',p.id);if(error){alert("Xəta: "+error.message);return;}if(files.length)sb.storage.from('crm-files').remove(files).catch(()=>{});pst.rows=pst.rows.filter(r=>r.id!==p.id);pst.open=null;render();};
  w.appendChild(top);
  /* Nəticələr */
  const res=(p.results||[]).slice().reverse();
  const rg=el("div","pst-gal");
  if(!res.length)rg.appendChild(el("div","pst-empty",`${PI.img}<b>Hələ şəkil yoxdur</b><span>Aşağıda müğənni əlavə et, konsept seç və ya istədiyini yaz, sonra «Yarat».</span>`));
  res.forEach(r=>{const done=r.status==="done";
    const c=el("div","pst-card"+(r.fav?" fav":""));
    const el0=(Date.now()-Date.parse(r.at||Date.now()))/1000;if(r.status==="pending")pst.pendSeen.add(r.rid);
    const reveal=done&&pst.pendSeen.has(r.rid)&&!pst.shown.has(r.rid);if(reveal){pst.shown.add(r.rid);c.classList.add("pst-glow");pstDone();}
    c.innerHTML=`<div class="pst-media" style="aspect-ratio:${esc((r.aspect||"9:16").replace(":","/"))}">${done?`<img data-p="${esc(r.path)}" alt="${esc(r.title||"")}" loading="lazy"${reveal?' class="pst-reveal"':""}>
        <button class="pst-exp" data-open title="Böyüt və funksiyalar" aria-label="Böyüt">${PI.expand}</button>${r.fav?`<span class="pst-favdot" title="Uğurlu">${PI.star}</span>`:""}`
      :r.status==="pending"?`<div class="pst-gen" role="status" aria-label="Şəkil yaradılır"><div class="pst-sheen"></div><div class="pst-gen-t"><b>${String(r.rid).startsWith("tmp")?"Göndərilir":"Yaradılır"}</b><span class="pst-el" data-at="${esc(r.at)}">${pstClock(el0)}</span></div><div class="pst-prog"><i style="animation-delay:-${Math.min(el0,79).toFixed(1)}s"></i></div></div>`
      :`<span class="pst-err">${esc(r.error||"Alınmadı")}</span>`}</div>`;
    if(done){const op=()=>pstView(p,r.rid);c.querySelector("img").onclick=op;c.querySelector("[data-open]").onclick=op;}
    rg.appendChild(c);});
  w.appendChild(rg);
  /* Prompt pəncərəsi (yapışqan, aşağıda) + konseptlər zolağı */
  const lb=p.labels||[];
  const comp=el("div","pst-comp");
  comp.innerHTML=`${pst.ideasBusy?`<div class="pst-ideas" style="margin-bottom:8px" aria-label="Konseptlər hazırlanır">${Array.from({length:6},()=>`<div class="pst-idea pst-skel"><i class="pst-ai"></i><span><b></b><small></small><small></small></span></div>`).join("")}</div>`:(p.ideas||[]).length?`<div class="pst-ideas" style="margin-bottom:8px">${(p.ideas||[]).map((it,i)=>`<button class="pst-idea${C.prompt===it.prompt?" on":""}${pst.ideasNew?" pst-in":""}" style="--i:${i}" data-idea="${i}">${it.style_ref?`<img data-p="${esc(it.style_ref)}" alt="">`:`<i class="pst-ai" title="AI-ın öz kreativ üslubu">${PI.spark}</i>`}<span><b>${esc(it.title)}</b><small>${it.style_ref?"":"AI üslubu · "}${esc(it.idea)}</small></span></button>`).join("")}</div>`:""}
    <div class="pst-box">
    ${C.notes?`<div class="pst-notes"><textarea data-nt rows="3" aria-label="Rejissor qeydi" placeholder="Rejissor qeydi: konsept, kim harada dayanır, geyim, rekvizit… (AI bütün konseptlərdə buna əməl edir)">${esc(p.notes||"")}</textarea><button class="pst-chip" data-svn>Yadda saxla</button></div>`:""}
    <div class="pst-refs">${(p.photos||[]).map((x,i)=>`<div class="pst-ref"><img data-p="${esc(x)}" alt=""><input data-lb="${i}" value="${esc(lb[i]||"")}" placeholder="ad" aria-label="${i+1}-ci şəkildəki adam"><button data-rm="${i}" title="Şəkli çıxar" aria-label="Şəkli çıxar">${PI.x}</button></div>`).join("")}
      <label class="pst-add" title="Müğənni şəkli yüklə (6-ya qədər)">${PI.user}<input type="file" data-ph accept="image/*" multiple hidden></label>
      <button class="pst-add" data-sing title="Müğənni kitabxanası" aria-label="Müğənni kitabxanası">${PI.singers}</button>
      <span class="pst-sep"></span>
      ${C.style?`<div class="pst-ref" title="${C.style===p.ref?"Referans poster":"Kitabxana üslubu"}"><img data-p="${esc(C.style)}" alt=""><em>${C.style===p.ref?"Referans":"Üslub"}</em><button data-sx title="Üslubu çıxar" aria-label="Üslubu çıxar">${PI.x}</button></div>`:`<label class="pst-add" title="Referans poster: nəticə ona bənzəsin">${PI.img}<input type="file" data-rf accept="image/*" hidden></label>`}</div>
    <textarea data-pr rows="2" aria-label="Prompt" placeholder="Nə yaratmaq istəyirsən? Konsept seç və ya Azərbaycanca yaz — AI peşəkar prompta çevirəcək">${esc(C.prompt)}</textarea>
    <div class="pst-bar">
      <button class="pst-chip" data-ideas title="6 konsept">${PI.bulb}${pst.ideasBusy?"Düşünür…":"Konseptlər"}</button>
      <button class="pst-chip${C.notes||p.notes?" on":""}" data-notes title="Rejissor qeydi">${PI.note}Qeyd</button>
      <label class="pst-chip" title="Ölçü">${PI.ratio}<select data-a aria-label="Ölçü">${PST_ASPECTS.map(a=>`<option${a===C.aspect?" selected":""}>${a}</option>`).join("")}</select></label>
      <label class="pst-chip" title="Şəkil sayı">${PI.grid}<select data-n aria-label="Şəkil sayı">${["1","2","4"].map(n=>`<option value="${n}"${n===C.n?" selected":""}>${n}</option>`).join("")}</select></label>
      <label class="pst-chip" title="Keyfiyyət">${PI.gauge}<select data-q aria-label="Keyfiyyət">${Object.entries(PST_Q).map(([k,l])=>`<option value="${k}"${k===C.q?" selected":""}>${l}</option>`).join("")}</select></label>
      <button class="pst-chip" data-en title="Yazdığını peşəkar prompta çevir">${PI.wand}Təkmilləşdir</button>
      <span style="flex:1"></span>
      <button class="pst-go" data-go>${PI.spark}Yarat</button>
    </div></div>`;
  const q=x=>comp.querySelector(x);
  comp.querySelectorAll("[data-idea]").forEach(b=>b.onclick=()=>{const it=p.ideas[+b.dataset.idea];Object.assign(C,{prompt:it.prompt,style:it.style_ref||"",title:it.title});render();});
  q("[data-pr]").oninput=e=>{C.prompt=e.target.value;};
  q("[data-a]").onchange=e=>{C.aspect=e.target.value;};q("[data-q]").onchange=e=>{C.q=e.target.value;};q("[data-n]").onchange=e=>{C.n=e.target.value;};
  q("[data-notes]").onclick=()=>{C.notes=!C.notes;render();};
  if(q("[data-svn]"))q("[data-svn]").onclick=async()=>{if(await save({notes:q("[data-nt]").value.trim()})){C.notes=false;toast("✓ Qeyd saxlandı — yeni konseptlər buna əməl edəcək","ok");render();}};
  comp.querySelectorAll("[data-lb]").forEach(x=>x.onchange=()=>save({labels:[...comp.querySelectorAll("[data-lb]")].map(y=>y.value.trim())}));
  comp.querySelectorAll("[data-rm]").forEach(x=>x.onclick=async()=>{const i=+x.dataset.rm;const ph=(p.photos||[]).slice(),L=(p.labels||[]).slice();const gone=ph.splice(i,1);L.splice(i,1);if(await save({photos:ph,labels:L})){sb.storage.from('crm-files').remove(gone).catch(()=>{});render();}});
  q("[data-sing]").onclick=()=>openSingerLib(p);
  q("[data-ph]").onchange=async e=>{const fs=[...e.target.files].slice(0,PST_MAX-(p.photos||[]).length);e.target.value="";if(!fs.length){toast("Ən çox "+PST_MAX+" nəfər","err");return;}
    const add=[];for(const f of fs){const x=await uploadTo("posters/src",f);if(x)add.push(x);}
    if(add.length&&await save({photos:[...(p.photos||[]),...add],labels:[...(p.labels||[]),...add.map(()=>"")]})){pstWide(p,C);render();}};
  if(q("[data-rf]"))q("[data-rf]").onchange=async e=>{const f=e.target.files[0];if(!f)return;const x=await uploadTo("posters/ref",f);if(x&&await save({ref:x})){C.style=x;toast("✓ Referans əlavə olundu — nəticələr ona bənzəyəcək","ok");render();}};
  if(q("[data-sx]"))q("[data-sx]").onclick=async()=>{if(C.style===p.ref){const old=p.ref;if(!(await save({ref:null})))return;sb.storage.from('crm-files').remove([old]).catch(()=>{});}C.style="";render();};
  q("[data-ideas]").onclick=async()=>{if(pst.ideasBusy)return;if(!(p.photos||[]).length){toast("Əvvəlcə müğənni şəkli əlavə et","err");return;}
    pst.ideasBusy=true;render();const j=await fnCall(POSTER_FN,{action:"ideas",id:p.id});pst.ideasBusy=false;if(j.ok){p.ideas=j.ideas;pst.ideasNew=true;}else alert(j.error||"Alınmadı");render();pst.ideasNew=false;};
  /* Sərbəst mətn (və ya strukturlu prompt + göstəriş) → AI ilə peşəkar, strukturlu prompt */
  const enhance=async()=>{const t=q("[data-pr]").value.trim();if(!t){toast("Əvvəlcə nəsə yaz və ya konsept seç","err");return false;}
    const b=q("[data-en]");b.disabled=true;b.innerHTML=PI.wand+"AI yazır…";
    const j=await fnCall(POSTER_FN,{action:"enhance",id:p.id,prompt:t,styled:!!C.style,style_ref:C.style||""});
    b.disabled=false;b.innerHTML=PI.wand+"Təkmilləşdir";if(!j.ok){alert(j.error||"Alınmadı");return false;}
    C.prompt=j.prompt;q("[data-pr]").value=j.prompt;
    if(j.style_ref&&j.style_ref!==C.style){C.style=j.style_ref;toast("Kitabxanadan üslub seçildi","ok");pstSign([C.style]).then(()=>render());}return true;};
  q("[data-en]").onclick=enhance;
  q("[data-go]").onclick=async e=>{const b=e.currentTarget;fxRipple(e,b);
    if(!(p.photos||[]).length){toast("Əvvəlcə müğənni şəkli əlavə et","err");return;}
    /* Kartlar dərhal qalereyada görünür, sonra real sorğularla əvəz olunur */
    const now=new Date().toISOString(),tmp=Array.from({length:+C.n},(_,i)=>({rid:"tmp"+Date.now()+i,kind:"gen",status:"pending",aspect:C.aspect,title:C.title||p.title||"Şəkil",at:now}));
    b.disabled=true;p.results=[...(p.results||[]),...tmp];render();const mn=$("main");if(mn)mn.scrollTo({top:0,behavior:"smooth"});
    const drop=()=>{p.results=(p.results||[]).filter(r=>!String(r.rid).startsWith("tmp"));};
    if(!/Hard rules:/.test(C.prompt)&&!(await enhance())){drop();render();return;}
    const j=await fnCall(POSTER_FN,{action:"generate",id:p.id,prompt:C.prompt,title:C.title||p.title||"Şəkil",style_ref:C.style||"",aspect:C.aspect,quality:C.q,count:+C.n});
    drop();if(!j.ok){render();alert(j.error||"Alınmadı");return;}
    p.results=[...p.results,...(j.items||[])];render();pstPoll(p.id,true);};
  w.appendChild(comp);
  const paths=[...(p.photos||[]),C.style,...(p.ideas||[]).map(x=>x.style_ref),...res.filter(r=>r.path).map(r=>r.path)].filter(Boolean);
  pstFill(w);pstSign(paths).then(()=>pstFill(w));
  if(res.some(r=>r.status==="pending"))pstPoll(p.id);
  return w;
}
/* Nəticəyə baxış: tam ekran, sağda bütün funksiyalar bir paneldə (Higgsfield üslubu). ← → keçid, Esc bağlayır */
function pstView(p,rid){
  const list=()=>(p.results||[]).filter(r=>r.status==="done").slice().reverse();
  let i=list().findIndex(r=>r.rid===rid);if(i<0)return;
  const C=pstC[p.id];const ov=el("div","pstv");ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-label","Şəklə baxış");
  document.body.appendChild(ov);document.body.style.overflow="hidden";
  const close=()=>{ov.remove();document.body.style.overflow="";removeEventListener("keydown",key);};
  const go=d=>{const L=list();if(L.length<2)return;i=(i+d+L.length)%L.length;draw();};
  const key=e=>{if(e.key==="Escape")close();else if(e.key==="ArrowLeft")go(-1);else if(e.key==="ArrowRight")go(1);};addEventListener("keydown",key);
  const act=async(fn,msg)=>{const j=await fn();if(!j.ok){alert(j.error||"Alınmadı");return;}if(j.items)p.results=[...(p.results||[]),...j.items];toast(msg,"ok");close();render();pstPoll(p.id,true);};
  const draw=async()=>{const L=list(),r=L[i];if(!r){close();return;}const cut=r.kind==="cutout",gen=(r.kind||"gen")==="gen";
    await pstSign([r.path,r.style_ref].filter(Boolean));
    ov.innerHTML=`<div class="pstv-stage"><img src="${esc(pst.urls[r.path]||"")}" alt="${esc(r.title||"")}" class="${cut?"pstv-cut":""}">
        ${L.length>1?`<button class="pstv-nav prev" data-prev aria-label="Əvvəlki">${PI.back}</button><button class="pstv-nav next" data-next aria-label="Növbəti">${PI.next}</button>`:""}
        <span class="pstv-count">${i+1} / ${L.length}</span></div>
      <aside class="pstv-side">
        <div class="pstv-head"><div><b>${esc(r.title||"Şəkil")}</b><small>${esc(r.aspect||"")} · ${esc(PST_Q[r.quality]||r.quality||"")}${r.kind&&r.kind!=="gen"?" · "+({resize:"ölçü dəyişdi",upscale:"4K",cutout:"fonsuz"}[r.kind]||""):""}</small></div><button class="pst-ib" data-x aria-label="Bağla">${PI.x}</button></div>
        <div class="pstv-row"><button class="pst-go" data-dl>${PI.dl}${cut?"PNG yüklə":"Yüklə"}</button>${gen?`<button class="pst-ib${r.fav?" on":""}" data-fav aria-pressed="${r.fav?"true":"false"}" title="${r.fav?"Uğurlu — AI bundan öyrənir":"Uğurlu kimi işarələ"}">${PI.star}</button>`:""}</div>
        ${!cut?`<div class="pstv-sec"><span>Təkmilləşdir</span><div class="pstv-grid">
          ${r.kind!=="upscale"?`<button class="pstv-act" data-up>${PI.hd}<b>4K</b><small>Eyni şəkil, maksimum keyfiyyət</small></button>`:""}
          <button class="pstv-act" data-cut>${PI.cut}<b>Fonsuz</b><small>Müğənni şəffaf PNG</small></button></div></div>
        <div class="pstv-sec"><span>Başqa ölçü</span><div class="pstv-chips">${PST_ASPECTS.filter(a=>a!==r.aspect).map(a=>`<button class="pst-chip" data-sz="${a}">${PI.ratio}${a}</button>`).join("")}</div></div>`:""}
        ${gen?`<div class="pstv-sec"><span>Yenidən</span><div class="pstv-grid">
          <button class="pstv-act" data-re>${PI.again}<b>Yeni variant</b><small>Eyni promptla</small></button>
          <button class="pstv-act" data-use>${PI.pen}<b>Promptu redaktə et</b><small>Pəncərəyə yüklə</small></button></div></div>`:""}
        ${r.style_ref?`<div class="pstv-sec"><span>Üslub</span><img class="pstv-sty" src="${esc(pst.urls[r.style_ref]||"")}" alt="Üslub posteri"></div>`:""}
        ${r.prompt?`<div class="pstv-sec"><span>Prompt <button class="pstv-copy" data-copy title="Kopyala">${PI.copy}</button></span><div class="pstv-prompt">${esc(r.prompt)}</div></div>`:""}
      </aside>`;
    const q=x=>ov.querySelector(x);
    q("[data-x]").onclick=close;ov.querySelector(".pstv-stage").onclick=e=>{if(e.target.classList.contains("pstv-stage"))close();};
    if(q("[data-prev]")){q("[data-prev]").onclick=()=>go(-1);q("[data-next]").onclick=()=>go(1);}
    q("[data-dl]").onclick=()=>cut?pstCutoutPng(r):downloadFile(r.path);
    if(q("[data-fav]"))q("[data-fav]").onclick=async()=>{const fav=!r.fav;const j=await fnCall(POSTER_FN,{action:"rate",id:p.id,rid:r.rid,fav});if(!j.ok){alert(j.error||"Alınmadı");return;}r.fav=fav;if(fav)toast("★ Yadda saxlandı — AI bundan öyrənəcək","ok");draw();render();};
    const der=(type,aspect)=>act(()=>fnCall(POSTER_FN,{action:"derive",id:p.id,rid:r.rid,type,aspect}),"✓ Göndərildi — 1–2 dəqiqəyə hazır olur");
    if(q("[data-up]"))q("[data-up]").onclick=()=>der("upscale");
    if(q("[data-cut]"))q("[data-cut]").onclick=()=>der("cutout");
    ov.querySelectorAll("[data-sz]").forEach(b=>b.onclick=()=>der("resize",b.dataset.sz));
    if(q("[data-re]"))q("[data-re]").onclick=()=>act(()=>fnCall(POSTER_FN,{action:"generate",id:p.id,prompt:r.prompt,title:r.title,style_ref:r.style_ref||"",text_zone:r.text_zone,aspect:r.aspect,quality:r.quality}),"✓ Yeni variant göndərildi");
    if(q("[data-use]"))q("[data-use]").onclick=()=>{if(C)Object.assign(C,{prompt:r.prompt,style:r.style_ref||"",title:r.title||"",aspect:r.aspect||C.aspect});close();render();};
    if(q("[data-copy]"))q("[data-copy]").onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(r.prompt).then(()=>toast("Prompt kopyalandı","ok"));};
    q("[data-x]").focus();};
  draw();
}
/* Müğənni kitabxanası: şəkillər adla bir dəfə saxlanılır, posterə bir kliklə əlavə olunur */
function openSingerLib(p){
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:640px"><div class="mh"><h3>📚 Müğənni kitabxanası</h3><button data-x aria-label="Bağla">×</button></div>
    <div class="mb" style="max-height:70vh;overflow:auto">
      <div class="pst-new"><input data-nm placeholder="Müğənninin adı" aria-label="Müğənninin adı"><label class="btn ghost" style="cursor:pointer">Şəkillər seç<input type="file" data-fs accept="image/*" multiple hidden></label><button class="btn" data-sv>Saxla</button></div>
      <div class="hint" data-st style="margin:6px 0 12px"></div>
      <div data-g class="pst-sgrid"></div></div>
    <div class="mf"><button class="btn" data-x2>Bağla</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove(),q=x=>scrim.querySelector(x);
  q("[data-x]").onclick=close;q("[data-x2]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  let files=[];q("[data-fs]").onchange=e=>{files=[...e.target.files].slice(0,6);q("[data-st]").textContent=files.length?`${files.length} şəkil seçildi`:"";};
  const g=q("[data-g]");
  const load=async()=>{g.innerHTML='<span class="hint">Yüklənir…</span>';
    const {data,error}=await sb.from('singers').select('*').order('name');if(error){g.innerHTML=`<span class="hint">Xəta: ${esc(error.message)}</span>`;return;}
    const L=data||[];await pstSign(L.map(x=>(x.photos||[])[0]).filter(Boolean));
    g.innerHTML=L.length?"":'<span class="hint">Hələ müğənni yoxdur — yuxarıda adı yaz, şəkillərini seç və saxla.</span>';
    L.forEach(sg=>{const c=el("div","pst-sing");const ph=(sg.photos||[])[0];
      c.innerHTML=`${ph?`<img src="${esc(pst.urls[ph]||"")}" alt="">`:`<div class="pst-sing-ph">👤</div>`}<b>${esc(sg.name)}</b><small>${(sg.photos||[]).length} şəkil</small>
        <div style="display:flex;gap:4px">${p?`<button class="btn" data-add>Əlavə et</button>`:""}${role==="ceo"||sg.created_by===me.id?`<button class="ibtn danger" data-del title="Sil" aria-label="Sil">${ICON.trash}</button>`:""}</div>`;
      const ad=c.querySelector("[data-add]");if(ad)ad.onclick=async()=>{const free=PST_MAX-(p.photos||[]).length;if(free<=0){toast("Posterdə artıq "+PST_MAX+" nəfər var","err");return;}
        const add=(sg.photos||[]).slice(0,free);const {error}=await sb.from('posters').update({photos:[...(p.photos||[]),...add],labels:[...(p.labels||[]),...add.map(()=>sg.name)]}).eq('id',p.id);
        if(error){alert("Xəta: "+error.message);return;}p.photos=[...(p.photos||[]),...add];p.labels=[...(p.labels||[]),...add.map(()=>sg.name)];close();toast(`✓ ${sg.name} əlavə olundu`,"ok");if(pstC[p.id])pstWide(p,pstC[p.id]);render();};
      const dl=c.querySelector("[data-del]");if(dl)dl.onclick=async()=>{if(!confirm(`${sg.name} kitabxanadan silinsin? (Posterlərdəki şəkillər qalır)`))return;await sb.from('singers').delete().eq('id',sg.id);load();};
      g.appendChild(c);});};
  q("[data-sv]").onclick=async()=>{const nm=q("[data-nm]").value.trim();if(!nm){q("[data-st]").textContent="Adı yaz";return;}if(!files.length){q("[data-st]").textContent="Ən azı bir şəkil seç";return;}
    const b=q("[data-sv]");b.disabled=true;q("[data-st]").textContent="Yüklənir…";
    const photos=[];for(const f of files){const x=await uploadTo("singers",f);if(x)photos.push(x);}
    const {error}=await sb.from('singers').insert({name:nm,photos});b.disabled=false;
    if(error){q("[data-st]").textContent="Xəta: "+error.message;return;}
    q("[data-nm]").value="";files=[];q("[data-st]").textContent="✓ Saxlandı";load();};
  load();
}
function openPosterStyles(){
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:720px"><div class="mh"><h3>🖼 Nümunə kitabxanası</h3><button data-x>×</button></div>
    <div class="mb" style="max-height:70vh;overflow:auto"><div class="hint" style="margin-bottom:10px">AI konsept hazırlayanda üslubu YALNIZ buradakı posterlərdən götürür (hər dəfə təsadüfi 12-si). Nə qədər çox və müxtəlif nümunə olsa, konseptlər o qədər zəngin olur.</div>
    <input type="file" accept="image/*" multiple data-f aria-label="Nümunə poster yüklə"><div data-g style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:12px"></div></div>
    <div class="mf"><button class="btn" data-x2>Bağla</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.querySelector("[data-x2]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const g=scrim.querySelector("[data-g]");
  const load=async()=>{g.innerHTML='<span class="hint">Yüklənir…</span>';
    const {data}=await sb.storage.from('crm-files').list('poster-styles',{limit:500,sortBy:{column:'created_at',order:'desc'}});
    const L=(data||[]).filter(f=>f.name&&!f.name.startsWith(".")).map(f=>'poster-styles/'+f.name);await pstSign(L);
    g.innerHTML=L.length?"":'<span class="hint">Hələ nümunə yoxdur.</span>';
    L.forEach(path=>{const c=el("div");c.style.position="relative";
      c.innerHTML=`<img src="${esc(pst.urls[path]||"")}" alt="" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;display:block"><button class="ibtn danger" data-d title="Sil" style="position:absolute;top:4px;right:4px;background:var(--surface)">${ICON.trash}</button>`;
      c.querySelector("[data-d]").onclick=async()=>{if(!confirm("Bu nümunə silinsin?"))return;await sb.storage.from('crm-files').remove([path]);load();};g.appendChild(c);});};
  scrim.querySelector("[data-f]").onchange=async e=>{const fs=[...e.target.files];e.target.value="";g.innerHTML='<span class="hint">Yüklənir…</span>';for(const f of fs)await uploadTo("poster-styles",f);load();};
  load();
}
/* Fonsuz nəticə yaşıl fondadır: brauzerdə yaşılı şəffaflaşdırıb PNG kimi yüklə (server yüklənmir) */
async function pstCutoutPng(r){
  await pstSign([r.path]);const url=pst.urls[r.path];if(!url){alert("Fayl açılmadı");return;}
  const img=new Image();img.crossOrigin="anonymous";img.src=url;
  try{await img.decode();}catch(e){alert("Şəkil açılmadı");return;}
  const cv=document.createElement("canvas");cv.width=img.naturalWidth;cv.height=img.naturalHeight;const cx=cv.getContext("2d");cx.drawImage(img,0,0);
  const d=cx.getImageData(0,0,cv.width,cv.height),b=d.data;
  for(let i=0;i<b.length;i+=4){const g=b[i+1],m=Math.max(b[i],b[i+2]),k=g-m;
    if(k>60&&g>120)b[i+3]=0;else if(k>25){b[i+3]=Math.round(b[i+3]*(1-(k-25)/35));b[i+1]=m;}}
  cx.putImageData(d,0,0);
  cv.toBlob(bl=>{const a=document.createElement("a");a.href=URL.createObjectURL(bl);a.download=(r.title||"poster").replace(/[^\wəğıöüçşƏĞIÖÜÇŞ -]+/g,"").trim().replace(/\s+/g,"-")+"-fonsuz.png";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);},"image/png");
}
/* Gözləyən şəkilləri yoxla: status dəyişəndə yenidən çək, yoxsa 6 san sonra təkrar */
function pstPoll(id,soon){clearTimeout(pst.timer);pst.timer=setTimeout(async()=>{
  if(view!=="posters"||pst.open!==id)return;
  const j=await fnCall(POSTER_FN,{action:"poll",id});const p=(pst.rows||[]).find(r=>r.id===id);if(!j.ok||!p)return;
  const sig=L=>(L||[]).map(r=>r.rid+r.status).join();const before=sig(p.results);
  p.results=j.results.map(({url,...r})=>{if(url&&r.path)pst.urls[r.path]=url;return r;});
  if(sig(p.results)!==before)render();else if(p.results.some(r=>r.status==="pending"))pstPoll(id);
},soon?4000:6000);}
/* AI analiz kartı: format, məzmun, hook, səs, niyə işləyir; səhnələr və çəkiliş planı açılan blokda */
function refAnalysisHtml(a){const row=(l,v)=>v?`<div><b>${l}:</b> ${esc(v)}</div>`:"";
  return `<div class="kcard" style="margin:0;display:flex;flex-direction:column;gap:6px;font-size:13px;line-height:1.5">
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><b style="font-size:14px">🤖 AI analizi</b><span class="chip c-accent" style="font-size:10.5px;padding:2px 7px">${esc(a.format||"")}</span>${a.type?`<span class="chip c-mut" style="font-size:10.5px;padding:2px 7px">${planType(a.type)[1]}</span>`:""}${a.duration_sec?`<span class="hint">${a.duration_sec} san</span>`:""}${a.views?`<span class="hint">👁 ${fmtNum(a.views)} · ❤ ${fmtNum(a.likes)}</span>`:""}</div>
    ${row("Nə baş verir",a.summary)}${row("Hook (ilk 3 san)",a.hook)}${row("Səs",a.audio)}${row("Ekran yazısı",a.on_screen_text)}${row("Niyə işləyir",a.why_it_works)}
    <details><summary style="cursor:pointer;font-weight:600">Səhnələr, kamera, montaj</summary><div style="margin-top:6px;display:flex;flex-direction:column;gap:4px">${(a.scenes||[]).map(x=>`<div>• ${esc(x)}</div>`).join("")}${row("Kamera",a.camera)}${row("Montaj",a.editing)}${row("İştirakçılar",a.people)}</div></details>
    ${a.howto?`<details open><summary style="cursor:pointer;font-weight:600">🎬 Bizim məkan üçün çəkiliş planı</summary><div style="margin-top:6px;white-space:pre-wrap">${esc(a.howto)}</div></details>`:""}</div>`;}
async function openRefSimilar(o){
  const igLink=(o.links||[]).find(u=>/instagram\.com\/(reel|reels|p|tv)\//.test(u));
  const titles=await Promise.all((o.links||[]).map(u=>linkThumb(u).then(t=>t&&t.title||"")));
  let tags=[...new Set(titles.flatMap(tagsOf))].filter(t=>!GENERIC_TAGS.has(t)&&!LOCAL_TAG.test(t));
  if(!tags.length)tags=(o.type==="yumor"?SECTOR_TAGS[4]:o.type==="trend"?SECTOR_TAGS[5]:SECTOR_TAGS[0])[1].slice();
  let A=null;
  const s=refModal("🤖 AI: referans analizi və bənzər videolar",`
    <div id="rs-a">${igLink?`<div class="hint" style="white-space:normal">🤖 AI referans videonu tam izləyir (görüntü + səs)… 30–90 saniyə çəkə bilər.</div>`:`<div class="hint" style="white-space:normal">AI analizi üçün Instagram Reels linki lazımdır — bu videoda yoxdur. Aşağıda sektor şablonu və ya hashtagla axtara bilərsən.</div>`}</div>
    <div class="hint" style="white-space:normal">🌍 Bənzər videolar dünya üzrə axtarılır. AI ifadələri (adi söz) və ya #hashtag yaz, ya da sektor şablonu seç.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${SECTOR_TAGS.map((x,i)=>`<button type="button" class="chip c-mut" data-sec="${i}" style="cursor:pointer;border:0">${x[0]}</button>`).join("")}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="rs-h" value="${igLink?"":esc(tags.slice(0,3).map(t=>"#"+t).join(" "))}" placeholder="${igLink?"AI analizi bitəndə ifadələr burada görünəcək…":"#restaurantreels #foodreels"}" style="flex:1;min-width:200px"><button class="btn" id="rs-go">Axtar</button></div>
    <div id="rs-l" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px"></div>`);
  const draw=(box,L,note)=>{
    box.innerHTML=(note?`<div class="hint" style="grid-column:1/-1;white-space:normal">${note}</div>`:"")+(L.length?L.map((x,i)=>refCard({url:x.url,img:x.thumb,head:`${x.score!=null?`🎯 ${x.score}% · `:""}${x.owner||"Instagram"} · 👁 ${fmtNum(x.views)} · ❤ ${fmtNum(x.likes)}`,text:(x.reason?"🤖 "+x.reason+"\n":"")+x.caption},
      `${o.onPick?`<button class="adv" data-spick="${i}">+ Əlavə et</button>`:""}<button class="adv" data-sarch="${i}">📚 Arxivə</button>`)).join(""):`<div class="hint">Bənzər video tapılmadı — başqa ifadə və ya şablon yoxla.</div>`);
    const save=async x=>{await refArchive(o.client,[{type:o.type||"kontent",links:[x.url],thumbs:[]}],"similar");};
    box.querySelectorAll("[data-spick]").forEach(b=>b.onclick=()=>{const x=L[+b.dataset.spick];o.onPick(x.url);save(x);b.textContent="Əlavə olundu ✓";b.disabled=true;});
    box.querySelectorAll("[data-sarch]").forEach(b=>b.onclick=async()=>{b.disabled=true;await save(L[+b.dataset.sarch]);b.textContent="Arxivdə ✓";});};
  const go=async()=>{const raw=s.querySelector("#rs-h").value.trim();const box=s.querySelector("#rs-l");const btn=s.querySelector("#rs-go");
    if(!raw){alert("Axtarış üçün ifadə və ya hashtag yaz.");return;}
    const isTags=/^#/.test(raw);const body=isTags?{hashtags:tagsOf(raw.replace(/(^|\s)(?=[\p{L}\p{N}_])/gu,"$1#"))}:{queries:raw.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean)};
    btn.disabled=true;btn.textContent="Axtarılır… (1–2 dəq)";box.innerHTML=`<div class="hint" style="grid-column:1/-1">Instagram-dan videolar gətirilir…</div>`;
    try{const j=await fnCall(REF_SIMILAR_URL,body);
      if(!j.ok){box.innerHTML=`<div class="hint" style="white-space:normal">${esc(j.error||"Alınmadı")}</div>`;return;}
      const skip=new Set((o.links||[]).map(refNorm));const L=j.items.filter(x=>!skip.has(refNorm(x.url)));
      const cachedNote=j.cached?" Axtarış son 7 gündən götürüldü (Apify krediti işlənmədi).":"";
      draw(box,L,(A&&L.length?"🤖 AI indi bu videoları referansla müqayisə edir — bir az sonra ən bənzərlər önə çıxacaq…":"")+cachedNote);
      /* 2-ci addım: AI sıralaması ayrıca sorğu ilə (uzun çəksə də nəticələr artıq görünür) */
      if(A&&L.length){const rj=await fnCall(REF_SIMILAR_URL,{rank:true,items:L.slice(0,12),ref:{format:A.format,summary:A.summary,why_it_works:A.why_it_works}});
        if(!s.isConnected)return;
        if(rj.ok){const R=rj.items.filter(x=>x.score>=30);draw(box,R.concat(L.slice(12)),`🎯 AI referansa ən çox bənzəyənləri önə çıxardı (zəif uyğunlar gizlədildi).${cachedNote}`);}
        else draw(box,L,`AI sıralaması alınmadı (${esc(rj.error||"")}) — populyarlığa görə göstərilir.${cachedNote}`);}
    }catch(e){box.innerHTML=`<div class="hint">Xəta: ${esc(e.message||e)}</div>`;}finally{btn.disabled=false;btn.textContent="Axtar";}};
  s.querySelectorAll("[data-sec]").forEach(b=>b.onclick=()=>{s.querySelector("#rs-h").value=SECTOR_TAGS[+b.dataset.sec][1].map(t=>"#"+t).join(" ");go();});
  s.querySelector("#rs-go").onclick=go;s.querySelector("#rs-h").onkeydown=e=>{if(e.key==="Enter")go();};
  if(igLink){const j=await fnCall(REF_ANALYZE_URL,{url:igLink});const box=s.querySelector("#rs-a");if(!box)return;
    if(!j.ok){box.innerHTML=`<div class="hint" style="white-space:normal">AI analizi alınmadı: ${esc(j.error||"")}. Hashtag və ya sektor şablonu ilə axtara bilərsən.</div>`;if(!s.querySelector("#rs-h").value)s.querySelector("#rs-h").value=tags.slice(0,3).map(t=>"#"+t).join(" ");return;}
    A=j.analysis;box.innerHTML=refAnalysisHtml(A)+(o.onHowto&&A.howto?`<div style="display:flex;gap:6px;margin-top:8px"><button class="adv" id="rs-how">📋 Çəkiliş planını «Necə çəkiləcək»-ə yaz</button></div>`:"");
    const hb=s.querySelector("#rs-how");if(hb)hb.onclick=()=>{o.onHowto(A);hb.textContent="Yazıldı ✓";hb.disabled=true;};
    const q=s.querySelector("#rs-h");q.value=(A.search_queries||[]).slice(0,3).join(", ");q.placeholder="AI ifadələri — dəyişə bilərsən";
    if(q.value)go();}
}
function openPlanBuilder(c){
  if(!c)return;
  const plan=c.plan&&Array.isArray(c.plan.items)?JSON.parse(JSON.stringify(c.plan)):{intro:"",items:[]};
  if(!plan.items.length)plan.items.push(planBlank());
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:780px;width:96vw"><div class="mh"><h3>📝 Kontent planı — ${esc(c.client)}${c.month?" · "+esc(c.month):""}</h3><button>×</button></div>
    <div class="mb" style="max-height:70vh;overflow:auto">
      <div class="hint" style="white-space:normal">Hər video üçün başlıq, açıqlama və referans linkləri yaz. PDF məkanın <b>Brend kitabçasındakı</b> rəng, şrift və loqo ilə avtomatik hazırlanır.</div>
      <div class="field"><label>Ayın ideyası / ümumi qeyd (istəyə bağlı)</label><textarea id="pintro" rows="2" placeholder="məs. Bu ay payız menyusu və canlı musiqi gecələrini önə çıxarırıq">${esc(plan.intro||"")}</textarea></div>
      <div class="field"><label>Video sayı — rəqəm yaz, o qədər xana açılır</label><div style="display:flex;gap:10px;flex-wrap:wrap">${PLAN_TYPES.map(t=>`<label style="display:flex;align-items:center;gap:6px;text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink);margin:0">${t[1]}<input type="number" min="0" max="40" data-cnt="${t[0]}" style="width:70px"></label>`).join("")}</div></div>
      <div id="psum" class="chip c-accent" style="align-self:flex-start"></div>
      <div id="prows" style="display:flex;flex-direction:column;gap:12px"></div>
      <button class="btn ghost" id="padd" type="button">+ Video əlavə et</button>
    </div>
    <div class="mf" style="flex-wrap:wrap"><button class="btn ghost" data-x>Bağla</button><button class="btn ghost" id="psave">Yadda saxla</button><button class="btn ghost" id="pprev">Önizlə</button><button class="btn" id="pgen">PDF yarat və təsdiqə göndər</button></div></div>`;
  document.body.appendChild(scrim);
  const rows=scrim.querySelector("#prows");
  const sync=()=>{plan.intro=scrim.querySelector("#pintro").value.trim();rows.querySelectorAll("[data-i]").forEach(r=>{const x=plan.items[+r.dataset.i];const g=k=>r.querySelector(`[data-k="${k}"]`).value;x.type=g("type");x.title=g("title").trim();x.caption=g("caption").trim();x.links=planLinks(g("links"));x.note=g("note").trim();});};
  const isEmpty=x=>!x.title&&!x.caption&&!x.links.length&&!x.note;
  const setCount=(k,n)=>{sync();n=Math.max(0,Math.min(40,n|0));if(n>0&&plan.items.length===1&&isEmpty(plan.items[0])&&plan.items[0].type!==k)plan.items=[];let have=plan.items.filter(x=>x.type===k).length;
    while(have<n){plan.items.push({...planBlank(),type:k});have++;}
    for(let i=plan.items.length-1;i>=0&&have>n;i--)if(plan.items[i].type===k&&isEmpty(plan.items[i])){plan.items.splice(i,1);have--;}
    if(have>n)alert(`${planType(k)[1]}: ${have-n} xana doludur, ona görə silinmədi. Lazımsızdırsa, 🗑 ilə əl ilə sil.`);
    if(!plan.items.length)plan.items.push(planBlank());draw();};
  const sum=()=>{const n=plan.items.length;scrim.querySelectorAll("[data-cnt]").forEach(i=>{if(document.activeElement!==i)i.value=plan.items.filter(x=>x.type===i.dataset.cnt).length;});scrim.querySelector("#psum").textContent=`Cəmi ${n} video · `+PLAN_TYPES.map(t=>`${t[1]} ${plan.items.filter(x=>x.type===t[0]).length}`).join(" · ");};
  const lp=r=>{const v=r.querySelector('[data-k="links"]').value;const ls=planLinks(v);const box=r.querySelector("[data-lp]");box._v=v;
    box.innerHTML=ls.map((u,j)=>{const li=linkInfo(u);return `<span class="chip c-mut" data-th="${j}" style="font-size:10.5px;padding:2px 7px;display:inline-flex;align-items:center;gap:6px">${esc(li.platform)}${li.kind?" · "+esc(li.kind):""}${li.handle?" · "+esc(li.handle):""}</span>`;}).join(" ");
    ls.forEach((u,j)=>linkThumb(u).then(t=>{if(box._v!==v||!t||!t.data)return;const ch=box.querySelector(`[data-th="${j}"]`);if(ch)ch.insertAdjacentHTML("afterbegin",`<img src="${t.data}" alt="" style="width:30px;height:52px;object-fit:cover;border-radius:5px">`);}));};
  const draw=()=>{
    rows.innerHTML=plan.items.map((x,i)=>`<div class="kcard" data-i="${i}" style="margin:0;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;gap:8px;align-items:center"><b style="min-width:28px">#${i+1}</b>${x.client_ok==="ok"?`<span class="chip c-good" style="font-size:10px;padding:2px 7px">👤 Müştəri ✓</span>`:x.client_ok==="changes"?`<span class="chip c-warn" style="font-size:10px;padding:2px 7px">👤 Düzəliş istəyir</span>`:""}<select data-k="type" style="width:auto">${PLAN_TYPES.map(t=>`<option value="${t[0]}"${x.type===t[0]?" selected":""}>${t[1]}</option>`).join("")}</select>
        <span style="margin-left:auto;display:flex;gap:3px"><button class="ibtn" data-up title="Yuxarı" type="button"${i?"":" disabled"}>↑</button><button class="ibtn" data-dn title="Aşağı" type="button"${i<plan.items.length-1?"":" disabled"}>↓</button><button class="ibtn danger" data-rm title="Sil" type="button">${ICON.trash}</button></span></div>
      ${x.client_ok==="changes"&&x.client_note?`<div class="hint" style="white-space:pre-wrap;background:var(--surface-2);border-radius:8px;padding:8px 10px">👤 Müştəri: ${esc(x.client_note)}</div>`:""}
      <div class="field"><label>Başlıq</label><input data-k="title" placeholder="məs. Ofisiant vs müştəri — yumor skeç" value="${esc(x.title)}"></div>
      <div class="field"><label>Açıqlama (caption)</label><textarea data-k="caption" rows="3" placeholder="Paylaşımın mətni, hashtaglar…">${esc(x.caption)}</textarea></div>
      <div class="field"><label>Referans linklər — hər sətirdə bir link</label><textarea data-k="links" rows="2" placeholder="https://www.instagram.com/reel/…">${esc(x.links.join("\n"))}</textarea><div data-lp style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px"></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="adv" type="button" data-arch>📚 Arxivdən seç</button><button class="adv" type="button" data-sim>🤖 AI analiz + bənzər</button></div></div>
      <div class="field"><label>Necə çəkiləcək / niyə bu referans</label><textarea data-k="note" rows="2" placeholder="Kadrlar, səhnə, aktyor, musiqi, referansdan nə götürürük…">${esc(x.note)}</textarea></div></div>`).join("");
    rows.querySelectorAll("[data-i]").forEach(r=>{const i=+r.dataset.i;lp(r);
      r.querySelector('[data-k="links"]').onchange=()=>lp(r);
      const addLink=u=>{const ta=r.querySelector('[data-k="links"]');if(planLinks(ta.value).map(refNorm).includes(refNorm(u)))return;ta.value=(ta.value.trim()?ta.value.trim()+"\n":"")+u;sync();lp(r);};
      r.querySelector("[data-arch]").onclick=()=>{sync();openRefArchive({client:c.client||"",type:plan.items[i].type,onPick:addLink});};
      r.querySelector("[data-sim]").onclick=()=>{sync();const x=plan.items[i];if(!x.links.length&&!confirm("Bu videoda referans link yoxdur. Məkanın hashtagları ilə axtaraq?"))return;openRefSimilar({client:c.client||"",type:x.type,links:x.links,onPick:addLink,onHowto:a=>{const ta=r.querySelector('[data-k="note"]');const t=`${a.format?"Format: "+a.format+"\n":""}${a.howto||""}${a.audio?"\nSəs: "+a.audio:""}`;ta.value=ta.value.trim()?ta.value.trim()+"\n\n"+t:t;sync();}});};r.querySelector('[data-k="type"]').onchange=()=>{sync();sum();};
      r.querySelector("[data-rm]").onclick=()=>{sync();if((plan.items[i].title||plan.items[i].links.length)&&!confirm(`#${i+1} videonu silək?`))return;plan.items.splice(i,1);if(!plan.items.length)plan.items.push(planBlank());draw();};
      r.querySelector("[data-up]").onclick=()=>{sync();[plan.items[i-1],plan.items[i]]=[plan.items[i],plan.items[i-1]];draw();};
      r.querySelector("[data-dn]").onclick=()=>{sync();[plan.items[i+1],plan.items[i]]=[plan.items[i],plan.items[i+1]];draw();};});
    sum();};
  draw();
  scrim.querySelectorAll("[data-cnt]").forEach(i=>i.onchange=()=>setCount(i.dataset.cnt,+i.value));
  const close=()=>scrim.remove();
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;
  scrim.querySelector("#padd").onclick=()=>{sync();plan.items.push(planBlank());draw();rows.lastElementChild.querySelector('[data-k="title"]').focus();};
  const btns=[...scrim.querySelectorAll(".mf button")];const busy=(b,t)=>{btns.forEach(x=>x.disabled=!!t);if(t){b._t=b._t||b.textContent;b.textContent=t;}else if(b._t)b.textContent=b._t;};
  const clean=()=>{sync();return {intro:plan.intro,items:plan.items.filter(x=>x.title||x.caption||x.links.length||x.note),updated_at:new Date().toISOString(),by:myName()};};
  const check=p=>{if(!p.items.length){alert("Ən azı bir video əlavə et.");return false;}const nt=p.items.findIndex(x=>!x.title);if(nt>=0){alert(`#${nt+1} videonun başlığı yoxdur.`);return false;}
    const nl=p.items.map((x,i)=>x.links.length?0:i+1).filter(Boolean);if(nl.length&&!confirm(`Bu videolarda referans link yoxdur: #${nl.join(", #")}. Yenə də davam edək?`))return false;return true;};
  scrim.querySelector("#psave").onclick=async e=>{const b=e.currentTarget;busy(b,"Saxlanır…");await upd('content',c.id,{plan:clean()});busy(b);b.textContent="Saxlanıldı ✓";setTimeout(()=>{b.textContent=b._t;},1500);};
  scrim.querySelector("#pprev").onclick=async e=>{const b=e.currentTarget;const p=clean();if(!check(p))return;const w=window.open("","_blank");busy(b,"Hazırlanır…");
    try{const blob=await planPdf(c,p);const u=URL.createObjectURL(blob);if(w)w.location.href=u;else location.href=u;}catch(err){if(w)w.close();alert("PDF yaradılmadı: "+(err.message||err));}finally{busy(b);}};
  scrim.querySelector("#pgen").onclick=async e=>{const b=e.currentTarget;const p=clean();if(!check(p))return;
    const reAppr=c.status!=="Hazırlanır";if(reAppr&&!confirm("Yeni PDF yenidən təsdiqə gedəcək (təsdiqlər sıfırlanır). Davam edək?"))return;
    busy(b,"PDF hazırlanır…");
    try{
      const blob=await planPdf(c,p);
      const name=`${c.client}_${c.month||""}_kontent-plani.pdf`.replace(/[\\/:*?"<>|\s]+/g,"_");
      const file=new File([blob],name,{type:"application/pdf"});
      b.textContent="Yüklənir…";let link=null;
      if(await driveReady()){let parent=null;try{parent=await folderFor(c.client,c.month||MONTHS_AZ[calM],"Kontent");}catch(_){}try{link=await driveUpload(file,()=>{},()=>{},parent);}catch(_){link=null;}}
      if(!link)link=await uploadTo("content",file);
      if(!link){busy(b);return;}
      const old=c.file;const patch={plan:p,file:link,status:"Təsdiq gözləyir"};APPROVERS.forEach(a=>patch['appr_'+a[0]]=false);
      await upd('content',c.id,patch);
      refArchive(c.client,p.items,"plan");
      if(old&&old!==link){const id=driveId(old);try{if(id)await driveDelete(id);else if(!/^https?:\/\//.test(old))await sb.storage.from('crm-files').remove([old]);}catch(_){}}
      close();render();alert("PDF hazırlandı və təsdiqə göndərildi ✓");
    }catch(err){busy(b);alert("PDF yaradılmadı: "+(err.message||err));}
  };
}
/* Təsdiqlənmiş dizayn kontenti → Account Manager-lərə task + bildiriş */
async function designTask(c){
  const title="🎨 Dizayn: "+c.title;
  if(state.tasks.some(t=>t.title===title&&t.client===c.client))return;
  await ins('tasks',{title,role:"account",client:c.client,status:"Yeni",note:"Təsdiqlənmiş dizayn kontenti"+(c.month?" ("+c.month+")":"")+" — dizayn brifinə çevir."});
  try{await sb.from('notifications').insert({target_type:"role",target:"account",title:"📌 Yeni task (Dizayn)",body:c.client+" · "+c.title,from_name:myName(),from_id:me?me.id:null,read_by:[]});}catch(e){}
}
function renderContent(){
  const wrap=el("div");const r=ROLES[role];
  const lg=el("div","panel");lg.style.marginBottom="16px";
  lg.appendChild(el("div","ph",`<h3>İş axını</h3><span class="count">Kontent menecer → CEO · Marketinq · PM təsdiqi</span>`));
  wrap.appendChild(lg);
  const kan=el("div","kan");
  CONTENT_STAGES.forEach(st=>{
    const col=el("div","col");
    const items=state.content.filter(c=>c.status===st);
    col.appendChild(el("div","ch",`${st}<span class="n">${items.length}</span>`));
    items.forEach(c=>{
      const card=el("div","kcard");card.dataset.sid="content:"+c.id;
      const chips=APPROVERS.map(a=>`<span class="chip ${c['appr_'+a[0]]?'c-good':'c-mut'}" style="font-size:10.5px;padding:2px 7px">${c['appr_'+a[0]]?'✓':'○'} ${a[1]}</span>`).join(" ");
      const canFile=(r.maker||role==="ceo");
      const fc=c.file?`<span class="filerow">${fileChip(c.file)}${canFile?`<button class="ibtn" data-crep="${c.id}" title="PDF-i əvəzlə" aria-label="PDF-i əvəzlə">${ICON.replace}</button><button class="ibtn danger" data-cfdel="${c.id}" title="PDF-i sil" aria-label="PDF-i sil">${ICON.trash}</button>`:""}</span>`:`<span class="chip c-crit" style="font-size:10.5px;padding:2px 7px">PDF yoxdur</span>`;
      let act="";
      if((r.maker||role==="ceo")&&st==="Hazırlanır")act=`${c.file?"":`<button class="adv" data-cdrive="${c.id}">${ICON.cloud} PDF yüklə</button>`}<button class="adv" data-clink="${c.id}">${ICON.link} Link</button><button class="adv" data-send="${c.id}">Göndər ${ICON.arrow}</button>`;
      else if(r.approver&&st==="Təsdiq gözləyir"&&!c['appr_'+r.approver])act=`<button class="adv" data-appr="${c.id}">${ICON.check} Təsdiq et</button>`;
      else if(r.approver&&st==="Təsdiq gözləyir"&&c['appr_'+r.approver])act=`<span class="chip c-good" style="font-size:10.5px">Sən təsdiqlədin</span>`;
      else if((r.maker||role==="ceo")&&st==="Təsdiqləndi")act=`<button class="adv" data-pub="${c.id}">Yerləşdir ${ICON.arrow}</button>`;
      const mng=(r.approver||isOwner(c,"content"))?`<span style="margin-left:auto;display:flex;gap:3px"><button class="ibtn" data-cedit="${c.id}" title="Düzəliş">${ICON.edit}</button><button class="ibtn danger" data-cdel="${c.id}" title="Sil">${ICON.trash}</button></span>`:"";
      card.innerHTML=`<div class="kt" style="display:flex;align-items:center;gap:6px">${esc(c.title)}${mng}</div><div class="km">${esc(c.client)} · ${esc(c.platform)}${c.month?" · "+esc(c.month):""}${c.week?" · "+c.week+"-ci həftə":""} · ${kindLabel(c.kind)}</div>
        <div style="margin-top:8px">${fc} ${clientOkChip(c.client_ok,c.client_note)} ${planOkChip(c)}${canFile&&st!=="Yerləşdirildi"?` <button class="planbtn" type="button" data-cplan="${c.id}" title="Videolar, açıqlamalar və referans linklərlə brendə uyğun PDF hazırla">${ICON.file}${c.plan&&c.plan.items&&c.plan.items.length?`Planı aç <span class="pbn">${c.plan.items.length}</span>`:"Plan qur · PDF"}</button>`:""}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">${chips}</div>
        <div class="kf">${chatBtn('content:'+c.id,c.title,c.client+" · Kontent")}<span class="hint" style="margin-left:8px">${apprCount(c,'appr_')}/3</span><span style="margin-left:auto">${act}</span></div>`;
      col.appendChild(card);
    });
    if(!items.length)col.appendChild(el("div","hint",`<div style="padding:8px 4px">boş</div>`));
    kan.appendChild(col);
  });
  wrap.appendChild(kanWrap(kan));
  kan.querySelectorAll("[data-cplan]").forEach(b=>b.onclick=()=>openPlanBuilder(state.content.find(x=>x.id==b.dataset.cplan)));
  kan.querySelectorAll("[data-cdrive]").forEach(b=>b.onclick=()=>contentPdf(state.content.find(x=>x.id==b.dataset.cdrive),false));
  kan.querySelectorAll("[data-crep]").forEach(b=>b.onclick=()=>contentPdf(state.content.find(x=>x.id==b.dataset.crep),true));
  kan.querySelectorAll("[data-clink]").forEach(b=>b.onclick=()=>(()=>{const c=state.content.find(x=>x.id==b.dataset.clink)||{};askLinkTo({client:c.client,sub:c.month||MONTHS_AZ[calM],cat:"Kontent",ref:"content:"+b.dataset.clink},link=>upd('content',b.dataset.clink,{file:link}));})());
  kan.querySelectorAll("[data-send]").forEach(b=>b.onclick=()=>{const c=state.content.find(x=>x.id==b.dataset.send);if(!c.file){alert("Əvvəlcə PDF əlavə et.");return;}upd('content',c.id,{status:"Təsdiq gözləyir"});});
  kan.querySelectorAll("[data-appr]").forEach(b=>b.onclick=()=>{const c=state.content.find(x=>x.id==b.dataset.appr);const patch={['appr_'+r.approver]:true};const nx={...c,...patch};if(fullAppr(nx,'appr_'))patch.status="Təsdiqləndi";upd('content',c.id,patch).then(()=>{if(patch.status==="Təsdiqləndi"&&c.kind==="dizayn")designTask(c);});});
  kan.querySelectorAll("[data-pub]").forEach(b=>b.onclick=()=>upd('content',b.dataset.pub,{status:"Yerləşdirildi"}));
  kan.querySelectorAll("[data-cedit]").forEach(b=>b.onclick=()=>openForm(state.content.find(x=>x.id==b.dataset.cedit)));
  kan.querySelectorAll("[data-cdel]").forEach(b=>b.onclick=()=>{const c=state.content.find(x=>x.id==b.dataset.cdel);confirmDel('content',c.id,"«"+c.title+"» kontenti");});
  kan.querySelectorAll("[data-cfdel]").forEach(b=>b.onclick=()=>{const c=state.content.find(x=>x.id==b.dataset.cfdel);removeFile('content',c.id,'file',c.file,"PDF faylı");});
  wireFiles(kan);wireChat(kan);
  return wrap;
}

/* ---------- Briefs ---------- */
/* Kanban sığmayanda: kənarda ‹ › oxları və kölgə — gizli sütun olduğunu göstərir */
/* Telefonda (≤640px) hər ekranda BİR sütun: yuxarıda ‹ Sütun adı · say › + nöqtələr, sürüşdürmək də olur */
const kanMobile=()=>window.matchMedia("(max-width:640px)").matches;
const kanPos={};
function kanWrap(kan){
  const w=el("div","kanwrap");
  const nav=el("div","kannav");
  nav.innerHTML=`<button type="button" class="kn-btn" data-kp aria-label="Əvvəlki sütun">‹</button><div class="kn-mid"><div class="kn-t"></div><div class="kn-dots"></div></div><button type="button" class="kn-btn" data-kn aria-label="Növbəti sütun">›</button>`;
  w.append(nav,kan);
  const l=el("button","kanarrow l","‹"),r=el("button","kanarrow r","›");l.title="Sola";r.title="Sağa — digər sütunlar";w.append(l,r);
  const cols=()=>[...kan.querySelectorAll(":scope > .col")];
  const key=cols().map(c=>{const h=c.querySelector(".ch");return h&&h.firstChild?h.firstChild.textContent:"";}).join("|");
  const idx=()=>Math.max(0,Math.min(cols().length-1,Math.round(kan.scrollLeft/Math.max(1,kan.clientWidth))));
  const go=i=>{const c=cols();if(!c.length)return;i=Math.max(0,Math.min(c.length-1,i));kan.scrollTo({left:c[i].offsetLeft-kan.offsetLeft,behavior:"smooth"});};
  const drawNav=()=>{const c=cols();if(!c.length)return;const i=idx();kanPos[key]=i;
    const h=c[i].querySelector(".ch");const name=h&&h.firstChild?h.firstChild.textContent:"";const n=h&&h.querySelector(".n")?h.querySelector(".n").textContent:"";
    nav.querySelector(".kn-t").innerHTML=`${esc(name)}${n!==""?` <span class="kn-n">${esc(n)}</span>`:""}`;
    nav.querySelector(".kn-dots").innerHTML=c.map((x,j)=>`<i class="${j===i?"on":""}" data-kd="${j}"></i>`).join("");
    nav.querySelector("[data-kp]").disabled=i===0;nav.querySelector("[data-kn]").disabled=i===c.length-1;
    nav.querySelectorAll("[data-kd]").forEach(d=>d.onclick=()=>go(+d.dataset.kd));};
  const upd=()=>{w.classList.toggle("can-l",kan.scrollLeft>4);w.classList.toggle("can-r",kan.scrollLeft+kan.clientWidth<kan.scrollWidth-4);if(kanMobile())drawNav();};
  kan.addEventListener("scroll",upd,{passive:true});
  nav.querySelector("[data-kp]").onclick=()=>go(idx()-1);nav.querySelector("[data-kn]").onclick=()=>go(idx()+1);
  const stepW=()=>{const c=kan.querySelector(":scope > .col");return c?c.offsetWidth+14:280;};l.onclick=()=>kan.scrollBy({left:-stepW(),behavior:"smooth"});r.onclick=()=>kan.scrollBy({left:stepW(),behavior:"smooth"});
  try{new ResizeObserver(upd).observe(kan);}catch(e){}
  /* yenidən çəkiləndə (realtime) eyni sütunda qal */
  requestAnimationFrame(()=>{if(kanMobile()&&kanPos[key]){const c=cols()[kanPos[key]];if(c)kan.scrollLeft=c.offsetLeft-kan.offsetLeft;}upd();});
  return w;
}
/* Brif filtri: məkan və dizayner siyahıdan seçilir (əllə yazılmır) */
let briefF={cl:"",dz:""};
function kanFilter(kan,f){
  const q=!!(f.cl||f.dz);
  kan.querySelectorAll(".col").forEach(col=>{let n=0;col.querySelectorAll(".kcard").forEach(c=>{const ok=(!f.cl||c.dataset.cl===f.cl)&&(!f.dz||c.dataset.dz===f.dz);c.style.display=ok?"":"none";if(ok)n++;});const ne=col.querySelector(".ch .n");if(ne)ne.textContent=q?n+"/"+col.querySelectorAll(".kcard").length:col.querySelectorAll(".kcard").length;});
}
/* ---------- Brif faylları növə görə qruplaşır: kartda «🖼 JPG · 8», basanda siyahı/qalereya ---------- */
const FG={brief:{ic:"📎",lb:"Brif faylı",get:b=>briefFiles(b)},psd:{ic:"🎨",lb:"PSD",get:b=>briefPsds(b),set:(b,a)=>setBriefPsds(b,a)},
  jpg:{ic:"🖼",lb:"JPG",get:b=>briefJpgs(b),set:(b,a)=>setBriefJpgs(b,a)},motion:{ic:"🎞",lb:"Motion",get:b=>briefMotions(b),set:(b,a)=>setBriefMotions(b,a)}};
const fgDl=u=>{const id=/^https?:\/\//.test(u)?driveId(u):null;return id?"https://drive.google.com/uc?export=download&id="+id:null;};
const fgThumb=(u,w)=>{const id=driveId(u);return id?`https://drive.google.com/thumbnail?id=${id}&sz=w${w||400}`:"";};
function fgChip(b,k,rm){
  const g=FG[k],L=g.get(b);if(!L.length)return "";
  if(L.length===1&&!rm&&k!=="jpg")return k==="brief"?`<span class="chip c-warn" style="font-size:10px;padding:2px 7px;gap:4px"><a style="cursor:pointer;text-decoration:none;color:inherit" data-file="${esc(L[0])}" title="Bax">${ICON.attach}${esc(fileName(L[0]))}</a><a style="cursor:pointer;text-decoration:none;color:inherit" data-dl="${esc(L[0])}" title="Yüklə">⬇</a></span>`:fileChip(L[0],g.lb);
  return `<button type="button" class="chip ${k==="brief"?"c-warn":"c-accent"} fgbtn" data-fg="${k}" data-fgb="${b.id}" data-fgrm="${rm?1:""}" title="${esc(g.lb)} — ${L.length} fayl, bax / yüklə${rm?" / sil":""}">${g.ic} ${esc(g.lb)}${L.length>1?` <b>· ${L.length}</b>`:""}</button>`;
}
function wireFileGroups(root){root.querySelectorAll("[data-fg]").forEach(x=>x.onclick=e=>{e.preventDefault();e.stopPropagation();openFileGroup(x.dataset.fgb,x.dataset.fg,!!x.dataset.fgrm);});}
function fgDownloadAll(L){
  L.forEach((u,i)=>setTimeout(()=>{const d=fgDl(u);
    if(d){const f=document.createElement("iframe");f.style.display="none";f.src=d;document.body.appendChild(f);setTimeout(()=>f.remove(),120000);}
    else downloadFile(u);},i*700));
}
function openFileGroup(bid,k,rm){
  const b=state.briefs.find(y=>y.id==bid);if(!b)return;
  const g=FG[k],L=g.get(b);if(!L.length)return;
  const isImg=k==="jpg";
  const scrim=el("div","scrim");
  const item=(u,i)=>{const lb=g.lb+(L.length>1?" "+(i+1):"");const nw=L.length>1&&i===L.length-1?`<span class="chip c-good" style="font-size:9.5px;padding:1px 6px">ən son</span>`:"";
    const btns=`<a class="mini" data-file="${esc(u)}" style="cursor:pointer;text-decoration:none">Bax</a><a class="mini" data-fgdl="${i}" style="cursor:pointer;text-decoration:none">⬇</a>${rm?`<a class="mini" data-fgrm="${i}" style="cursor:pointer;text-decoration:none;color:var(--bad,#c33)" title="Sil">✕</a>`:""}`;
    if(isImg)return `<div class="fgcell"><img loading="lazy" data-fgv="${i}" src="${esc(fgThumb(u,400))}" alt="${esc(lb)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'fgnoimg',textContent:'${esc(lb)}'}))"><div class="fgcap"><b>${esc(lb)}</b>${nw}</div><div class="fgacts">${btns}</div></div>`;
    return `<div class="fgrow"><span><b>${esc(lb)}</b> ${/^https?:\/\//.test(u)?"":`<span class="hint">${esc(fileName(u))}</span>`} ${nw}</span><span style="display:flex;gap:4px">${btns}</span></div>`;};
  scrim.innerHTML=`<div class="modal" style="max-width:${isImg?720:480}px"><div class="mh"><h3>${g.ic} ${esc(g.lb)} · ${L.length}</h3><button data-x>×</button></div><div class="mb">
    <div class="hint" style="margin-bottom:10px;white-space:normal">${esc(b.client)} · ${esc(String(b.title).split("\n")[0].slice(0,80))}</div>
    <div class="${isImg?"fggrid":"fglist"}">${L.map(item).join("")}</div>
  </div><div class="mf">${L.length>1?`<button class="btn ghost" data-fgall>⬇ Hamısını yüklə</button>`:""}<button class="btn" data-x>Bağla</button></div></div>`;
  document.body.appendChild(scrim);
  const close=()=>scrim.remove();
  scrim.querySelectorAll("[data-x]").forEach(x=>x.onclick=close);scrim.onclick=e=>{if(e.target===scrim)close();};
  wireFiles(scrim);
  scrim.querySelectorAll("[data-fgdl]").forEach(x=>x.onclick=e=>{e.preventDefault();fgDownloadAll([L[+x.dataset.fgdl]]);});
  const all=scrim.querySelector("[data-fgall]");if(all)all.onclick=()=>fgDownloadAll(L);
  scrim.querySelectorAll("[data-fgv]").forEach(x=>x.onclick=()=>fgLightbox(L,+x.dataset.fgv,g.lb));
  scrim.querySelectorAll("[data-fgrm]").forEach(x=>x.onclick=async e=>{e.preventDefault();const i=+x.dataset.fgrm;const u=L[i];
    if(!confirm(g.lb+(L.length>1?" "+(i+1):"")+" silinsin?"+(driveId(u)?" Drive-da zibil qutusuna gedəcək (30 gün bərpa olunur).":"")))return;
    const cur=g.get(state.briefs.find(y=>y.id==bid)||b).slice();const j=cur.indexOf(u);if(j<0)return;cur.splice(j,1);
    await g.set(b,cur);if(driveId(u))driveTrash(u);close();if(cur.length)setTimeout(()=>openFileGroup(bid,k,rm),300);});
}
function fgLightbox(L,i,lb){
  const box=el("div","scrim");box.style.zIndex="10001";
  const draw=()=>{box.innerHTML=`<div class="fglb"><button class="fgnav" data-p ${L.length<2?"hidden":""}>‹</button><figure><img src="${esc(fgThumb(L[i],1600))}" alt=""><figcaption>${esc(lb)} ${i+1} / ${L.length} · <a data-file="${esc(L[i])}" style="cursor:pointer;color:inherit">Orijinalı aç ↗</a></figcaption></figure><button class="fgnav" data-n ${L.length<2?"hidden":""}>›</button><button class="fgclose" data-x>×</button></div>`;
    wireFiles(box);box.querySelector("[data-x]").onclick=()=>{box.remove();document.removeEventListener("keydown",key);};
    const p=box.querySelector("[data-p]"),n=box.querySelector("[data-n]");if(p)p.onclick=e=>{e.stopPropagation();i=(i-1+L.length)%L.length;draw();};if(n)n.onclick=e=>{e.stopPropagation();i=(i+1)%L.length;draw();};};
  const key=e=>{if(e.key==="Escape"){box.remove();document.removeEventListener("keydown",key);}else if(e.key==="ArrowLeft"){i=(i-1+L.length)%L.length;draw();}else if(e.key==="ArrowRight"){i=(i+1)%L.length;draw();}};
  document.addEventListener("keydown",key);box.onclick=e=>{if(e.target===box||e.target.classList.contains("fglb")){box.remove();document.removeEventListener("keydown",key);}};
  draw();document.body.appendChild(box);
}
const BRIEF_ARCHIVE_DAYS=3;
function briefDone(b){return b.status==="Hazır"||b.status==="Təsdiqləndi";}
function briefArchived(b){if(!briefDone(b))return false;const t=Date.parse(b.done_at||b.created_at||"");return !isNaN(t)&&Date.now()-t>BRIEF_ARCHIVE_DAYS*864e5;}
let bhClient="",bhSort="new",bhQ="",bhMore=30,bhOpen=(()=>{try{return localStorage.getItem("mm_bh_open")==="1";}catch(e){return false;}})();
/* Hazır dizayn keçmişi — yığcam, açılıb-bağlanan siyahı (default bağlı, seçim yadda qalır) */
function renderBriefHistory(){
  const box=el("div","panel bh"+(bhOpen?" open":""));box.style.marginTop="18px";
  const all=state.briefs.filter(briefArchived);
  const clients=[...new Set(all.map(b=>String(b.client||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"az"));
  if(bhClient&&!clients.includes(bhClient))bhClient="";
  const head=el("button","ph bhhead",`<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg><h3>Hazır dizayn keçmişi</h3><span class="count">${all.length}</span>`);
  head.type="button";head.title=`Hazır olandan ${BRIEF_ARCHIVE_DAYS} gün sonra kartlar bura keçir`;head.setAttribute("aria-expanded",bhOpen?"true":"false");
  box.appendChild(head);
  const body=el("div","bhbody");body.hidden=!bhOpen;box.appendChild(body);
  head.onclick=()=>{bhOpen=!bhOpen;try{localStorage.setItem("mm_bh_open",bhOpen?"1":"0");}catch(e){}box.classList.toggle("open",bhOpen);body.hidden=!bhOpen;head.setAttribute("aria-expanded",bhOpen?"true":"false");if(bhOpen&&!body.firstChild)build();};
  const fd=d=>isNaN(d)?"—":String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0")+"."+String(d.getFullYear()).slice(2);
  function build(){
    const bar=el("div","kanq bhbar");
    const sel=el("select");sel.setAttribute("aria-label","Məkan");
    sel.innerHTML=`<option value="">Bütün məkanlar</option>`+clients.map(c=>`<option value="${esc(c)}"${c===bhClient?" selected":""}>${esc(c)} (${all.filter(b=>String(b.client||"").trim()===c).length})</option>`).join("");
    const so=el("select");so.setAttribute("aria-label","Sıralama");
    so.innerHTML=[["new","Ən yeni"],["old","Ən köhnə"],["client","Məkan A–Z"],["designer","Dizayner A–Z"]].map(([v,t])=>`<option value="${v}"${v===bhSort?" selected":""}>${t}</option>`).join("");
    const qi=el("input");qi.type="search";qi.placeholder="Axtar — məkan, mətn, dizayner…";qi.value=bhQ;
    bar.append(sel,so,qi);body.appendChild(bar);
    const list=el("div","bhlist");body.appendChild(list);
    const draw=()=>{
      const q=bhQ.trim().toLocaleLowerCase("az");
      let L=all.filter(b=>(!bhClient||String(b.client||"").trim()===bhClient)&&(!q||(String(b.client||"")+" "+String(b.title||"")+" "+String(b.designer||"")+" "+String(b.motion_by||"")).toLocaleLowerCase("az").includes(q)));
      const dt=b=>String(b.done_at||b.created_at||"");
      L.sort((a,b)=>bhSort==="old"?dt(a).localeCompare(dt(b)):bhSort==="client"?String(a.client||"").localeCompare(String(b.client||""),"az")||dt(b).localeCompare(dt(a)):bhSort==="designer"?String(a.designer||"").localeCompare(String(b.designer||""),"az")||dt(b).localeCompare(dt(a)):dt(b).localeCompare(dt(a)));
      list.innerHTML="";
      if(!L.length){list.appendChild(el("div","empty",all.length?"Bu filtrə uyğun dizayn yoxdur":"Hələ keçmişə düşən dizayn yoxdur"));return;}
      L.slice(0,bhMore).forEach(b=>{
        const t=String(b.title||"").replace(/\r\n?/g,"\n").trim();const first=t.split("\n")[0];const rest=t.slice(first.length).trim();
        const files=[fgChip(b,"psd",false),fgChip(b,"jpg",false),fgChip(b,"motion",false)];
        if(b.deliver_file)files.push(fileChip(b.deliver_file));
        const who=[b.designer,b.motion_by].filter(Boolean).map(esc).join(" · ");
        const cr=new Date(b.created_at||"");
        const row=el("div","bhrow");
        row.innerHTML=`<span class="bhd num" title="Hazır olub">${fd(new Date(b.done_at||b.created_at))}</span><span class="bhc">${esc(b.client||"—")}</span>
          <span class="bht${rest?" has":""}"${rest?' role="button" tabindex="0" aria-expanded="false"':""} title="${esc(first)}">${esc(first)||"—"}${rest?' <i class="bhmore">›</i>':""}</span>
          <span class="bhw">${who}</span><span class="bhf">${files.filter(Boolean).join("")}</span>
          ${rest?`<div class="bhx" hidden>${esc(rest)}${isNaN(cr)?"":`<div class="bhxm">Yaradılıb: ${fd(cr)} ${String(cr.getHours()).padStart(2,"0")}:${String(cr.getMinutes()).padStart(2,"0")}</div>`}</div>`:""}`;
        const tg=row.querySelector(".bht.has");
        if(tg){const x=row.querySelector(".bhx");const f=()=>{x.hidden=!x.hidden;tg.setAttribute("aria-expanded",x.hidden?"false":"true");row.classList.toggle("on",!x.hidden);};tg.onclick=f;tg.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();f();}};}
        list.appendChild(row);
      });
      if(L.length>bhMore){const m=el("button","mini bhmorebtn",`Daha çox göstər (${L.length-bhMore})`);m.onclick=()=>{bhMore+=30;draw();};list.appendChild(m);}
      wireFiles(list);wireFileGroups(list);
    };
    sel.onchange=()=>{bhClient=sel.value;bhMore=30;draw();};
    so.onchange=()=>{bhSort=so.value;draw();};
    qi.oninput=()=>{bhQ=qi.value;bhMore=30;draw();};
    draw();
  }
  if(bhOpen)build();
  return box;
}
function renderBriefs(){
  actEnsure();
  const wrap=el("div");const r=ROLES[role];
  const isAccount=role==="account"||role==="ceo";
  const isDesigner=role==="designer"||role==="ceo";
  const isMotion=role==="motion"||role==="ceo";
  const lg=el("div","panel");lg.style.marginBottom="16px";
  lg.appendChild(el("div","ph",`<h3>İş axını</h3><span class="count">Account brif → Dizayner götürür (PSD+JPG) → Account təsdiqi → Motion (varsa) → Hazır</span>`));
  wrap.appendChild(lg);
  const kan=el("div","kan kan-wide");
  BRIEF_COLS.forEach(bc=>{
    const st=bc.st;
    const col=el("div","col");
    let items=state.briefs.filter(b=>pmClientOk(b.client)).filter(b=>{const s=b.status||"Açıq";return s===st||(st==="Açıq"&&s==="Brif verildi")||(st==="İcrada"&&s==="Dizaynda")||(st==="Hazır"&&s==="Təsdiqləndi");});
    if(st==="Motion")items=items.filter(b=>motionCol(b)===bc.ms);
    if(st==="Hazır")items=items.filter(b=>!briefArchived(b));
    items.sort((a,b)=>st==="Hazır"?String(b.done_at||b.created_at||"").localeCompare(String(a.done_at||a.created_at||"")):(b.urgent?1:0)-(a.urgent?1:0));
    col.appendChild(el("div","ch",`${bc.lb||st}<span class="n">${items.length}</span>`));
    items.forEach(b=>{
      const mine=b.designer&&b.designer===myName();
      const mmine=b.motion_by&&b.motion_by===myName();
      const ms=b.motion_stage||"";  // "", "İcrada", "Təsdiq gözləyir"
      const card=el("div","kcard");card.dataset.sid="brief:"+b.id;card.dataset.cl=String(b.client||"");card.dataset.dz=String(b.designer||"");const burg=b.urgent&&st!=="Hazır";if(burg)card.classList.add("urgent");
      let act="",sub="";
      if(st==="Açıq"){
        if(isDesigner)act=`<button class="adv" data-claim="${b.id}">${ICON.play2} Mən götürürəm</button>`;
        else act=`<span class="chip c-mut" style="font-size:10.5px">Dizayner gözlənilir</span>`;
      }else if(st==="İcrada"){
        if(mine||role==="ceo")act=`<button class="adv" data-psd="${b.id}" title="PSD yüklə — bir neçə fayl seçmək olar">${ICON.cloud} ${briefPsds(b).length?"PSD +":"PSD"}</button><button class="adv" data-jpg="${b.id}" title="JPG yüklə — bir neçə variant seçmək olar">${ICON.cloud} ${briefJpgs(b).length?"JPG +":"JPG"}</button><button class="adv" data-blink="${b.id}">${ICON.link} Link</button><button class="adv" data-bsend="${b.id}">Təsdiqə göndər ${ICON.arrow}</button>`;
        else act=`<span class="chip c-accent" style="font-size:10.5px">${esc(b.designer||"?")}${actTagName(b.designer)} hazırlayır</span>`;
      }else if(st==="Təsdiq gözləyir"){
        const canEdit=isAccount||role==="pm"||role==="marketing";
        if(canEdit)act=`<button class="adv" data-brevise="${b.id}" style="color:var(--warn)">✏️ Düzəliş istə</button>${isAccount?`<button class="adv" data-bappr="${b.id}">${ICON.check} Təsdiq et</button>`:""}`;
        else act=`<span class="chip c-warn" style="font-size:10.5px">Account təsdiqi gözlənilir</span>`;
        if(mine)act=`<button class="adv" data-bback="${b.id}" title="Təsdiqdən geri götür — üzərinə əlavə et / dəyiş">↩ Geri götür</button>`+act;
      }else if(st==="Motion"){
        sub="";
        if(ms==="Təsdiq gözləyir"){
          if(isAccount||role==="pm"||role==="marketing")act=`<button class="adv" data-mrevise="${b.id}" style="color:var(--warn)">✏️ Düzəliş istə</button>${isAccount?`<button class="adv" data-mappr="${b.id}">${ICON.check} Təsdiq et → Bitir</button>`:""}`;
          else act=`<span class="chip c-warn" style="font-size:10.5px">Account təsdiqi gözlənilir</span>`;
        }else if(!b.motion_by){
          if(isMotion)act=`<button class="adv" data-mclaim="${b.id}">${ICON.play2} Motionu götürürəm</button>`;
          else act=`<span class="chip c-mut" style="font-size:10.5px">Motion dizayner gözlənilir</span>`;
        }else if(mmine||role==="ceo"){
          act=`<button class="adv" data-mdrive="${b.id}" title="Motion videosu yüklə — bir neçəsini birdən seçmək olar">${ICON.cloud} ${briefMotions(b).length?"Motion +":"Motion (Drive)"}</button><button class="adv" data-mlink="${b.id}">${ICON.link} Link</button><button class="adv" data-msend="${b.id}">Təsdiqə göndər ${ICON.arrow}</button>`;
        }else act=`<span class="chip c-accent" style="font-size:10.5px">${esc(b.motion_by)}${actTagName(b.motion_by)} hazırlayır</span>`;
      }else if(st==="Hazır"){act=(isAccount||role==="pm"||role==="marketing"?`<button class="adv" data-bclient="${b.id}" style="color:var(--warn)" title="Müştəri təsdiqdən sonra düzəliş istədi — brif yenidən açılır">👤 Müştəri düzəlişi</button>`:"")+`<span class="chip c-good" style="font-size:10.5px">${ICON.check} Bitdi</span>`;}
      if(role==="ceo"&&st!=="Açıq"&&!(st==="Təsdiq gözləyir"&&mine))act=`<button class="adv" data-bundo="${b.id}" title="Kartı bir mərhələ geri çək" style="color:var(--warn)">↩ Geri çək</button>`+act;
      const mng=(isAccount||isOwner(b,"account"))?`<span style="margin-left:auto;display:flex;gap:3px"><button class="ibtn" data-bedit="${b.id}" title="Düzəliş">${ICON.edit}</button><button class="ibtn danger" data-bdel="${b.id}" title="Sil">${ICON.trash}</button></span>`:"";
      const meta=[];
      {const bl=bbLink(b.client,"Brend");if(bl)meta.push(bl);}
      if(b.designer)meta.push(`<span style="display:inline-flex;align-items:center;gap:3px;color:var(--accent-ink)" title="Brifi götürən dizayner">${ICON.palette}Dizayner: ${esc(b.designer)}${actTagName(b.designer)}</span>`);
      {const gp=b.created_by&&state.profiles.find(p=>p.id===b.created_by);if(gp)meta.push(`<span title="Brifi verən">✍ Verən: ${esc(gp.full_name||gp.username)}</span>`);}
      if(b.created_at){const d=new Date(b.created_at);if(!isNaN(d))meta.push(`<span title="Brifin yaradılma tarixi">📅 ${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}</span>`);}
      if(b.deadline){const di=dlInfo(b.deadline,b.status==="Hazır"?"Təsdiqləndi":b.status);meta.push(`<span class="chip c-${di.c}" style="font-size:9.5px;padding:1px 6px">${ICON.clock}${esc(di.txt)}</span>`);}
      if(b.client_edit_count||b.client_motion_edit_count)meta.push(`<span class="chip c-warn" style="font-size:9.5px;padding:1px 6px" title="Təsdiqdən sonra müştərinin istədiyi düzəlişlər">👤 Müştəri: ${[b.client_edit_count?"dizayn ×"+b.client_edit_count:"",b.client_motion_edit_count?"motion ×"+b.client_motion_edit_count:""].filter(Boolean).join(", ")}</span>`);
      if(b.motion)meta.push(`<span class="chip c-accent" style="font-size:9.5px;padding:1px 6px">🎞 Motion${b.motion_by?" · "+esc(b.motion_by)+actTagName(b.motion_by):""}${b.motion_deadline?" · "+fmtDate(b.motion_deadline):""}</span>`);
      const files=[];
      if(b.ref_link)files.push(`<a class="chip c-mut" style="font-size:10px;padding:2px 7px;text-decoration:none" href="${esc(b.ref_link)}" target="_blank" rel="noopener">${ICON.link} Referans</a>`);
      {const rmPJ=st==="İcrada"&&(mine||role==="ceo");const rmM=st==="Motion"&&ms==="İcrada"&&(mmine||role==="ceo");
       files.push(fgChip(b,"brief",false),fgChip(b,"psd",rmPJ),fgChip(b,"jpg",rmPJ));
       if(briefJpgs(b).length){const open=briefOpenPins(b);files.push(`<button class="mini" data-brev="${b.id}" title="Dizayn üzərində nöqtə ilə rəy" style="font-size:10.5px;padding:3px 8px">📍 Rəy${open?" · "+open:""}</button>`);}
       if(b.deliver_file)files.push(fileChip(b.deliver_file));
       files.push(fgChip(b,"motion",rmM));}
      if(b.client_ok)files.push(clientOkChip(b.client_ok,b.client_note));
      const btxt=String(b.title||"").replace(/\r\n?/g,"\n").replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
      const blong=btxt.split("\n").length>6||btxt.length>260;
      const mbf=motionBriefFiles(b);
      const mBrief=(b.motion_brief||mbf.length)&&st==="Motion"&&!isMotionOnly(b)?`<div class="mbrief"><div class="mbrief-h">🎞 Motion brifi</div>${b.motion_brief?esc(b.motion_brief):""}${mbf.length?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;white-space:normal">${mbf.map(briefFileChip).join("")}</div>`:""}</div>`:"";
      card.innerHTML=`${burg?`<div class="urgbadge">🔥 TƏCİLİ</div>`:""}${isMotionOnly(b)?`<div class="motonly">🎞 Yalnız motion</div>`:""}<div style="display:flex;align-items:flex-start;gap:6px"><div class="kt btext${blong?" clamp":""}">${(()=>{const i=btxt.indexOf("\n");return i<0?`<b>${esc(btxt)}</b>`:`<b>${esc(btxt.slice(0,i))}</b>${esc(btxt.slice(i))}`;})()}</div>${mng}</div>
        ${blong?`<a class="bmore" data-bmore>Tam oxu ▾</a>`:""}
        ${mBrief}
        ${b.motion_edit_note&&((st==="Motion"&&ms!=="Hazır")||(b.client_edit_scope==="both"&&st!=="Hazır"))?`<div class="bedit"><div class="bedit-h">${b.motion_edit_src==="client"?"👤 Müştəri motion düzəlişi"+(b.client_motion_edit_count>1?" #"+b.client_motion_edit_count:"")+(st!=="Motion"?" (dizayndan sonra)":""):"✏️ Motion düzəlişi"+(b.motion_edit_count>1?" #"+b.motion_edit_count:"")}${b.motion_edit_by?" — "+esc(b.motion_edit_by):""}${b.motion_edit_at?" · "+fmtDate(b.motion_edit_at):""}${canEditNote(b,true)?`<a class="bedit-x" data-enote="${b.id}" data-em="1" title="Düzəliş mətnini dəyiş">✎ dəyiş</a>`:""}</div>${esc(b.motion_edit_note)}${editFilesHtml(b.motion_edit_files)}</div>`:""}
        ${b.edit_note&&(st==="İcrada"||st==="Təsdiq gözləyir")?`<div class="bedit"><div class="bedit-h">${b.edit_src==="client"?"👤 Müştəri düzəlişi"+(b.client_edit_count>1?" #"+b.client_edit_count:""):"✏️ Düzəliş"+(b.edit_count>1?" #"+b.edit_count:"")}${b.edit_by?" — "+esc(b.edit_by):""}${b.edit_at?" · "+fmtDate(b.edit_at):""}${canEditNote(b,false)?`<a class="bedit-x" data-enote="${b.id}" title="Düzəliş mətnini dəyiş">✎ dəyiş</a>`:""}</div>${esc(b.edit_note)}${editFilesHtml(b.edit_files)}</div>`:""}
        <div class="km" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${esc(b.client)}${meta.length?" · "+meta.join(" · "):""}</div>
        ${(files.some(Boolean)||sub)?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">${sub}${files.filter(Boolean).join(" ")}</div>`:""}
        <div class="kf">${chatBtn('brief:'+b.id,b.title,b.client+" · Dizayn")}<span style="margin-left:auto">${act}</span></div>`;
      col.appendChild(card);
    });
    if(!items.length)col.appendChild(el("div","hint",`<div style="padding:8px 4px">boş</div>`));
    kan.appendChild(col);
  });
  {const qb=el("div","kanq");qb.style.flexWrap="wrap";
   const act=state.briefs.filter(b=>!briefArchived(b));
   const uniq=k=>[...new Set(act.map(b=>String(b[k]||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"az"));
   const mk=(k,all,list)=>{if(briefF[k]&&!list.includes(briefF[k]))briefF[k]="";const se=el("select");se.innerHTML=`<option value="">${all}</option>`+list.map(v=>`<option value="${esc(v)}"${v===briefF[k]?" selected":""}>${esc(v)}</option>`).join("");
     se.onchange=()=>{briefF[k]=se.value;kanFilter(kan,briefF);clr.style.display=briefF.cl||briefF.dz?"":"none";};return se;};
   const clr=el("button","mini","✕ Sıfırla");clr.style.display=briefF.cl||briefF.dz?"":"none";
   const s1=mk("cl","📍 Bütün məkanlar",uniq("client")),s2=mk("dz","🎨 Bütün dizaynerlər",uniq("designer"));
   clr.onclick=()=>{briefF={cl:"",dz:""};s1.value="";s2.value="";kanFilter(kan,briefF);clr.style.display="none";};
   qb.append(s1,s2,clr);wrap.appendChild(qb);if(briefF.cl||briefF.dz)setTimeout(()=>kanFilter(kan,briefF),0);}
  wrap.appendChild(kanWrap(kan));
  wrap.appendChild(renderBriefHistory());
  kan.querySelectorAll("[data-claim]").forEach(x=>x.onclick=()=>upd('briefs',x.dataset.claim,{designer:myName(),status:"İcrada"}));
  kan.querySelectorAll("[data-psd]").forEach(x=>x.onclick=()=>{const b=state.briefs.find(y=>y.id==x.dataset.psd);drivePickAndUploadMany("",links=>{const cur=briefPsds(state.briefs.find(y=>y.id===b.id)||b);setBriefPsds(b,cur.concat(links));},{client:b.client,sub:briefMonth(b),cat:"Dizayn"});});
  kan.querySelectorAll("[data-prm]").forEach(x=>x.onclick=async e=>{e.preventDefault();const b=state.briefs.find(y=>y.id==x.dataset.prm);const L=briefPsds(b).slice();const i=+x.dataset.pi;const u=L[i];if(!u)return;
    if(!confirm("PSD"+(L.length>1?" "+(i+1):"")+" silinsin?"+(driveId(u)?" Drive-da zibil qutusuna gedəcək (30 gün bərpa olunur).":"")))return;
    L.splice(i,1);await setBriefPsds(b,L);driveTrash(u);});
  kan.querySelectorAll("[data-brev]").forEach(x=>x.onclick=()=>openImageReview(state.briefs.find(y=>y.id==x.dataset.brev)));
  wireFileGroups(kan);
  kan.querySelectorAll("[data-jpg]").forEach(x=>x.onclick=()=>{const b=state.briefs.find(y=>y.id==x.dataset.jpg);drivePickAndUploadMany("image/*",links=>{const cur=briefJpgs(state.briefs.find(y=>y.id===b.id)||b);setBriefJpgs(b,cur.concat(links));},{client:b.client,sub:briefMonth(b),cat:"Dizayn"});});
  kan.querySelectorAll("[data-blink]").forEach(x=>x.onclick=()=>{const b=state.briefs.find(y=>y.id==x.dataset.blink);askLinkTo({client:b.client,sub:briefMonth(b),cat:"Dizayn",ref:"briefs:"+b.id},link=>setBriefJpgs(b,briefJpgs(state.briefs.find(y=>y.id===b.id)||b).concat(link)));});
  kan.querySelectorAll("[data-jrm]").forEach(x=>x.onclick=async e=>{e.preventDefault();const b=state.briefs.find(y=>y.id==x.dataset.jrm);const L=briefJpgs(b).slice();const i=+x.dataset.ji;const u=L[i];if(!u)return;
    if(!confirm("JPG"+(L.length>1?" "+(i+1):"")+" silinsin?"+(driveId(u)?" Drive-da zibil qutusuna gedəcək (30 gün bərpa olunur).":"")))return;
    L.splice(i,1);await setBriefJpgs(b,L);driveTrash(u);});
  kan.querySelectorAll("[data-bback]").forEach(x=>x.onclick=async()=>{const b=state.briefs.find(y=>y.id==x.dataset.bback);
    if(!confirm("Dizaynı təsdiqdən geri götürürsən — «İcrada»-ya qayıdacaq, fayl əlavə edib yenidən təsdiqə göndərə biləcəksən. Davam?"))return;
    await upd('briefs',b.id,{status:"İcrada"});});
  kan.querySelectorAll("[data-bsend]").forEach(x=>x.onclick=async()=>{const b=state.briefs.find(y=>y.id==x.dataset.bsend);if(!briefPsds(b).length&&!briefJpgs(b).length&&!b.deliver_file){alert("Əvvəlcə PSD və ya JPG əlavə et.");return;}await upd('briefs',b.id,{status:"Təsdiq gözləyir"});notifyBriefApproval(b,false);});
  kan.querySelectorAll("[data-enote]").forEach(x=>x.onclick=e=>{e.preventDefault();openEditNoteChange(state.briefs.find(y=>y.id==x.dataset.enote),!!x.dataset.em);});
  kan.querySelectorAll("[data-brevise]").forEach(x=>x.onclick=()=>openBriefRevision(state.briefs.find(y=>y.id==x.dataset.brevise)));
  kan.querySelectorAll("[data-bclient]").forEach(x=>x.onclick=()=>openClientRevision(state.briefs.find(y=>y.id==x.dataset.bclient)));
  kan.querySelectorAll("[data-mrevise]").forEach(x=>x.onclick=()=>openBriefRevision(state.briefs.find(y=>y.id==x.dataset.mrevise),true));
  kan.querySelectorAll("[data-bappr]").forEach(x=>x.onclick=async()=>{const b=state.briefs.find(y=>y.id==x.dataset.bappr);
    /* müştəri yalnız dizayna düzəliş istəyibsə motion-a yenidən keçmir; «hər ikisi»-dirsə motion birbaşa düzəlişə gedir */
    const cs=b.client_edit_scope,toM=b.motion&&cs!=="design",mBack=toM&&cs==="both"&&!!b.motion_by;
    await upd('briefs',b.id,toM?{status:"Motion",motion_stage:mBack?"İcrada":"",edit_note:null,edit_src:null,client_edit_scope:null}:{status:"Hazır",edit_note:null,edit_src:null,client_edit_scope:null});
    if(mBack){const ids=state.profiles.filter(p=>p.full_name===b.motion_by||p.username===b.motion_by).map(p=>p.id).filter(id=>!me||id!==me.id);
      const body=`Məkan: ${b.client}\nDizayn düzəlişi təsdiqləndi: ${myName()}${jpgLines(b)}\n\n👤 Müştərinin motion düzəlişi:\n${b.motion_edit_note||""}\n\nBrif: ${String(b.title).split("\n")[0].slice(0,80)}`;
      try{if(ids.length)await sb.from('notifications').insert(ids.map(id=>({target_type:"user",target:id,title:"👤 Motion düzəlişi sizdədir",body,from_name:myName(),from_id:me?me.id:null,read_by:[]})));}catch(er){}}
    else if(toM){const gp=b.created_by&&state.profiles.find(p=>p.id===b.created_by);
      const body=`Məkan: ${b.client}\nDizayn təsdiqləndi: ${myName()}${b.designer?"\nDizayner: "+b.designer:""}${gp?"\nBrifi verən: "+(gp.full_name||gp.username):""}\nMotion deadline: ${fmtDl(b.motion_deadline||b.deadline)}${jpgLines(b)}${b.motion_brief?"\n\n🎞 Motion brifi:\n"+b.motion_brief:""}${motionBriefFiles(b).length?"\nMotion faylları: "+motionBriefFiles(b).map(fileName).join(", ")+" (paneldə kartda)":""}\n\nDizayn brifi:\n${b.title}`;
      try{await sb.from('notifications').insert({target_type:"role",target:"motion",title:"🎞 Sizin yeni brifiniz sizi gözləyir",body,from_name:myName(),from_id:me?me.id:null,read_by:[]});}catch(er){}}});
  kan.querySelectorAll("[data-bundo]").forEach(x=>x.onclick=async()=>{const b=state.briefs.find(y=>y.id==x.dataset.bundo);if(!b)return;
    const s0=b.status||"Açıq";let to,patch;
    if(s0==="İcrada"||s0==="Dizaynda"){to="Açıq";patch={status:"Açıq",designer:null};}
    else if(s0==="Təsdiq gözləyir"){to="İcrada";patch={status:"İcrada"};}
    else if(s0==="Motion"){to="Təsdiq gözləyir";patch={status:"Təsdiq gözləyir",motion_stage:""};}
    else if((s0==="Hazır"||s0==="Təsdiqləndi")&&b.motion){to="Motion → təsdiq gözləyir";patch={status:"Motion",motion_stage:"Təsdiq gözləyir"};}
    else if(s0==="Hazır"||s0==="Təsdiqləndi"){to="Təsdiq gözləyir";patch={status:"Təsdiq gözləyir"};}
    else return;
    if(!confirm("Kart «"+to+"» mərhələsinə geri çəkilsin?"+(to==="Açıq"?" Dizayner kartdan çıxarılacaq, yüklənmiş fayllar qalır.":"")))return;
    await upd('briefs',b.id,patch);});
  kan.querySelectorAll("[data-mclaim]").forEach(x=>x.onclick=()=>upd('briefs',x.dataset.mclaim,{motion_by:myName(),motion_stage:"İcrada"}));
  kan.querySelectorAll("[data-mdrive]").forEach(x=>x.onclick=()=>{const b=state.briefs.find(y=>y.id==x.dataset.mdrive);drivePickAndUploadMany("",links=>{const cur=briefMotions(state.briefs.find(y=>y.id===b.id)||b);setBriefMotions(b,cur.concat(links));},{client:b.client,sub:briefMonth(b),cat:"Dizayn"});});
  kan.querySelectorAll("[data-mrm]").forEach(x=>x.onclick=async e=>{e.preventDefault();const b=state.briefs.find(y=>y.id==x.dataset.mrm);const L=briefMotions(b).slice();const i=+x.dataset.mi;const u=L[i];if(!u)return;
    if(!confirm("Motion"+(L.length>1?" "+(i+1):"")+" silinsin?"+(driveId(u)?" Drive-da zibil qutusuna gedəcək (30 gün bərpa olunur).":"")))return;
    L.splice(i,1);await setBriefMotions(b,L);driveTrash(u);});
  kan.querySelectorAll("[data-mlink]").forEach(x=>x.onclick=()=>{const b=state.briefs.find(y=>y.id==x.dataset.mlink);const old=b.motion_file;askLinkTo({client:b.client,sub:briefMonth(b),cat:"Dizayn",ref:"briefs:"+b.id},link=>setBriefMotions(b,briefMotions(state.briefs.find(y=>y.id===b.id)||b).concat(link)));});
  kan.querySelectorAll("[data-msend]").forEach(x=>x.onclick=async()=>{const b=state.briefs.find(y=>y.id==x.dataset.msend);if(!briefMotions(b).length){alert("Əvvəlcə motion videosunu Drive-a yüklə.");return;}await upd('briefs',b.id,{motion_stage:"Təsdiq gözləyir"});notifyBriefApproval(b,true);});
  kan.querySelectorAll("[data-mappr]").forEach(x=>x.onclick=()=>upd('briefs',x.dataset.mappr,{status:"Hazır",motion_stage:"Hazır",motion_edit_note:null,motion_edit_src:null,client_edit_scope:null}));
  kan.querySelectorAll("[data-bmore]").forEach(x=>x.onclick=()=>{const t=x.parentElement.querySelector(".btext");const c=t.classList.toggle("clamp");x.textContent=c?"Tam oxu ▾":"Gizlət ▴";});
  kan.querySelectorAll("[data-bedit]").forEach(x=>x.onclick=()=>openForm(state.briefs.find(y=>y.id==x.dataset.bedit)));
  kan.querySelectorAll("[data-bdel]").forEach(x=>x.onclick=()=>{const b=state.briefs.find(y=>y.id==x.dataset.bdel);confirmDel('briefs',b.id,"«"+b.title+"» brifi");});
  wireFiles(kan);wireChat(kan);
  return wrap;
}

/* ---------- Shoots (calendar + table) ---------- */
function shootDate(str){const m=String(str).replace("~","").trim().match(/(\d{1,2})\.(\d{1,2})/);return m?{d:+m[1],mo:+m[2]-1}:null;}
function ddmmToISO(s){const m=String(s||'').match(/(\d{1,2})\.(\d{1,2})/);if(!m)return"";return calY+"-"+String(+m[2]).padStart(2,'0')+"-"+String(+m[1]).padStart(2,'0');}
function isoToDDMM(s){const p=String(s||'').slice(0,10).split('-');if(p.length<3)return"";return String(+p[2]).padStart(2,'0')+"."+String(+p[1]).padStart(2,'0');}
function stageColor(st){return st>=4?"good":st>=2?"accent":"warn";}
function shootsKind(){return state.shoots.filter(s=>((s.kind||"kontent")===shootKind));}
/* Çəkiliş cədvəli: məkanın Project Manager-i — «PM: Ad» */
function pmTag(name){
  const c=allClients().find(x=>x.name===name);const p=c&&c.pm_id&&state.profiles.find(x=>x.id===c.pm_id);
  if(!p)return `<span class="pmtag none" title="Bu məkana PM təyin olunmayıb">PM: —</span>`;
  const nm=String(p.full_name||p.username||"");
  return `<span class="pmtag" title="Project Manager: ${esc(nm)}">PM: ${esc(nm.split(" ")[0])}</span>`;
}
/* Draft çəkilişlər: tarixi hələ dəqiq olmayan çəkilişlər. Bütün PM-lər bir-birininkini görür;
   tarix dəqiqləşəndə «Təsdiqlə» çəkiliş formasını açır, yadda saxlananda draft cədvələ keçir və silinir. */
const draftsKind=()=>(state.shoot_drafts||[]).filter(d=>(d.kind||"kontent")===shootKind);
function renderShootDrafts(){
  const mng=canManageShoots();
  const L=draftsKind();
  const p=el("div","panel");p.style.marginBottom="16px";
  p.appendChild(el("div","ph",`<h3>📝 Draft çəkilişlər</h3><span class="count">${L.length}</span>${mng?`<button class="mini" data-dnew style="margin-left:auto">${ICON.plus} Draft əlavə et</button>`:""}`));
  const b=el("div","pb");
  L.forEach(d=>{const by=state.profiles.find(x=>x.id===d.created_by);
    b.appendChild(el("div","row",`<div class="main"><div class="t">${esc(d.client)} ${pmTag(d.client)} ${d.month?`<span class="chip c-accent" style="font-size:9.5px;padding:1px 7px">${esc(d.month)}</span>`:""}</div><div class="m">🗓 ${d.approx_date?"~"+esc(d.approx_date)+" · ":""}${esc(d.approx||(d.approx_date?"":"Tarix dəqiq deyil"))}${d.notes?" · "+esc(d.notes):""}${by?" · ✍ "+esc(by.full_name||by.username):""}</div></div>${mng?`<div class="r" style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end"><button class="mini" data-dok="${d.id}">${ICON.check} Təsdiqlə → cədvələ sal</button><button class="mini" data-ded="${d.id}" title="Redaktə et">${ICON.edit}</button><button class="mini" data-dx="${d.id}" title="Sil" style="color:var(--crit)">${ICON.trash}</button></div>`:""}`));});
  if(!L.length)b.appendChild(el("div","empty","Draft yoxdur — tarixi hələ dəqiq olmayan çəkilişi buraya əlavə et"));
  p.appendChild(b);
  const find=id=>L.find(x=>x.id==id);
  const nb=p.querySelector("[data-dnew]");if(nb)nb.onclick=()=>openDraftForm(null);
  p.querySelectorAll("[data-ded]").forEach(x=>x.onclick=()=>openDraftForm(find(x.dataset.ded)));
  p.querySelectorAll("[data-dx]").forEach(x=>x.onclick=()=>{const d=find(x.dataset.dx);confirmDel('shoot_drafts',d.id,"«"+d.client+"» draft çəkilişi");});
  p.querySelectorAll("[data-dok]").forEach(x=>x.onclick=()=>{const d=find(x.dataset.dok);openForm(null,{client:d.client,month:d.month,shoot_date:d.approx_date||"",_draft:d.id});});
  return p;
}
function openDraftForm(d){
  const e=d||{};const scrim=el("div","scrim");const apd=e.approx_date?shootDate(e.approx_date):null;
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>${d?"Draft — düzəliş":"Yeni draft çəkiliş"}</h3><button>×</button></div><div class="mb">
    <div class="field"><label>Müştəri</label><select id="d1">${selOpts(allClients().map(c=>c.name),e.client)}</select></div>
    <div class="field"><label>Hansı ayın çəkilişi?</label><select id="d2">${MONTHS_AZ.map((m,i)=>`<option${(e.month?m===e.month:i===calM)?" selected":""}>${m}</option>`).join("")}</select></div>
    <div class="field"><label>Təxmini gün (kalendarda göstərilir, boş qoymaq olar)</label><div style="display:flex;gap:8px">
      <select id="d5d" style="flex:1"><option value="">—</option>${Array.from({length:31},(_,i)=>i+1).map(dv=>`<option${apd&&apd.d===dv?" selected":""}>${dv}</option>`).join("")}</select>
      <select id="d5m" style="flex:2">${MONTHS_AZ.map((m,i)=>`<option value="${i+1}"${(apd?apd.mo===i:i===calM)?" selected":""}>${m}</option>`).join("")}</select></div></div>
    <div class="field"><label>Təxmini tarix (sözlə)</label><input id="d3" placeholder="məs. Noyabrın 2-ci həftəsi / 10–15 noyabr" value="${esc(e.approx||"")}"></div>
    <div class="field"><label>Qeyd</label><textarea id="d4" placeholder="məs. Müştəri menyunu dəqiqləşdirəndən sonra">${esc(e.notes||"")}</textarea></div>
  </div><div class="mf"><button class="btn ghost" data-x>Bağla</button><button class="btn" data-ok>${d?"Yadda saxla":"Əlavə et"}</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  const v=id=>scrim.querySelector("#"+id).value.trim();
  scrim.querySelector("[data-ok]").onclick=async()=>{if(!v("d1"))return;const row={client:v("d1"),month:v("d2"),approx:v("d3"),notes:v("d4"),approx_date:v("d5d")?String(v("d5d")).padStart(2,"0")+"."+String(v("d5m")).padStart(2,"0"):null};close();
    if(d)await upd('shoot_drafts',d.id,row);else await ins('shoot_drafts',{...row,kind:shootKind});};
}
function renderShoots(){
  const wrap=el("div");
  const kseg=el("div","seg");kseg.style.marginBottom="14px";
  kseg.innerHTML=`<button class="${shootKind==='kontent'?'on':''}" data-sk="kontent">📋 Kontent çəkilişləri</button><button class="${shootKind==='atmosfer'?'on':''}" data-sk="atmosfer">🎬 Atmosfer çəkilişləri</button>`;
  wrap.appendChild(kseg);
  wrap.appendChild(renderShootDrafts());
  const seg=el("div","seg");
  seg.innerHTML=`<button class="${shootView==='cal'?'on':''}" data-sv="cal">Kalendar</button><button class="${shootView==='tbl'?'on':''}" data-sv="tbl">Cədvəl</button>`;
  const bar=el("div","calbar");
  if(shootView==="cal"){
    bar.innerHTML=`<button class="nav2" data-mv="-1">‹</button><h3>${MONTHS_AZ[calM]} ${calY}</h3><button class="nav2" data-mv="1">›</button>`;
    bar.appendChild(seg);wrap.appendChild(bar);
    wrap.appendChild(renderCalendar());
    wrap.appendChild(el("div","hint callegend",`<div style="margin-top:11px;display:flex;gap:14px;flex-wrap:wrap"><span><span class="dotc" style="background:var(--warn)"></span>Çəkilib/montaj</span><span><span class="dotc" style="background:var(--accent)"></span>Prosesdə</span><span><span class="dotc" style="background:var(--good)"></span>Təhvil verilib</span><span><span class="dotc" style="background:var(--ink-soft)"></span>Planlı</span><span style="color:var(--muted)">· klik = qeyd${canManageShoots()?" · sürüklə = tarixi dəyiş · × = sil":""}</span></div>`));
    if(shootKind==="kontent"){
      // Bu ayın kalendarındakı çəkilişlər hansı ayın kontenti üçündürsə, həmin ayın təsdiqlənmiş planı göstərilir
      // (məs. sentyabrda çəkilən «Oktyabr» çəkilişi → Oktyabr planı)
      const groups={};
      shootsKind().forEach(s=>{const dt=shootDate(s.shoot_date);if(!dt||dt.mo!==calM)return;const k=s.client+"|"+shootMonth(s);(groups[k]=groups[k]||{client:s.client,month:shootMonth(s),dates:[]}).dates.push(s.shoot_date);});
      const gl=Object.values(groups).sort((a,b)=>a.client.localeCompare(b.client,"az"));
      const approved=c=>(c.status==="Təsdiqləndi"||c.status==="Yerləşdirildi")&&c.file&&(c.kind||"kontent")==="kontent";
      const nPlans=gl.filter(g=>state.content.some(c=>c.client===g.client&&c.month===g.month&&approved(c))).length;
      const pp=el("div","panel");pp.style.marginTop="16px";
      pp.appendChild(el("div","ph",`<h3>Təsdiqlənmiş kontent planları — ${MONTHS_AZ[calM]} çəkilişləri</h3><span class="count">${nPlans}/${gl.length} planı var</span>`));
      const ppb=el("div","pb");
      gl.forEach(g=>{
        const plans=state.content.filter(c=>c.client===g.client&&c.month===g.month&&approved(c));
        const right=plans.length?plans.map(c=>fileChip(c.file)).join(" "):`<span class="chip c-warn" style="font-size:10.5px">Təsdiqlənmiş plan yoxdur</span>`;
        ppb.appendChild(el("div","row",`<div class="main"><div class="t">${esc(g.client)} ${pmTag(g.client)} <span class="chip c-accent" style="font-size:9.5px;padding:1px 7px">${esc(g.month)}</span></div><div class="m">Çəkiliş: ${esc(g.dates.join(", "))}${plans.length?" · "+esc(plans.map(c=>c.title).join(", ")):""}</div></div><div class="r">${right}</div>`));
      });
      if(!gl.length)ppb.appendChild(el("div","empty",MONTHS_AZ[calM]+" kalendarında kontent çəkilişi yoxdur"));
      pp.appendChild(ppb);wrap.appendChild(pp);wireFiles(pp);
    }else{
      // Atmosfer: bu ayın hazır (təsdiqlənmiş) atmosfer kontentləri, həftələrə görə
      const ready=state.content.filter(c=>c.kind==="atmosfer"&&c.month===MONTHS_AZ[calM]&&c.file&&(c.status==="Təsdiqləndi"||c.status==="Yerləşdirildi"));
      const pp=el("div","panel");pp.style.marginTop="16px";
      pp.appendChild(el("div","ph",`<h3>Hazır atmosfer kontentləri — ${MONTHS_AZ[calM]}</h3><span class="count">${ready.length}</span>`));
      const ppb=el("div","pb");
      [1,2,3,4,5,0].forEach(w=>{const L=ready.filter(c=>(+c.week||0)===w);if(!L.length)return;
        ppb.appendChild(el("div","hint",`<div style="font-weight:700;margin:8px 4px 4px">${w?w+"-ci həftə":"Həftə qeyd olunmayıb"}</div>`));
        L.sort((a,b)=>a.client.localeCompare(b.client,"az")).forEach(c=>ppb.appendChild(el("div","row",`<div class="main"><div class="t">${esc(c.client)}</div><div class="m">${esc(c.title)}</div></div><div class="r">${fileChip(c.file)}</div>`)));});
      if(!ready.length)ppb.appendChild(el("div","empty",MONTHS_AZ[calM]+" üçün hazır atmosfer kontenti yoxdur"));
      pp.appendChild(ppb);wrap.appendChild(pp);wireFiles(pp);
    }
    bar.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{calM+=+b.dataset.mv;if(calM<0){calM=11;calY--;}if(calM>11){calM=0;calY++;}render();});
  }else{
    bar.innerHTML=`<h3 style="min-width:auto;text-align:left">Bütün çəkilişlər</h3>`;bar.appendChild(seg);
    wrap.appendChild(bar);wrap.appendChild(renderShootTable());
  }
  wrap.querySelectorAll("[data-sv]").forEach(b=>b.onclick=()=>{shootView=b.dataset.sv;render();});
  wrap.querySelectorAll("[data-sk]").forEach(b=>b.onclick=()=>{shootKind=b.dataset.sk;render();});
  return wrap;
}
function renderCalAgenda(){
  const wrap=el("div");const mng=canManageShoots();const days={};
  shootsKind().forEach(s=>{const dt=shootDate(s.shoot_date);if(dt&&dt.mo===calM){(days[dt.d]=days[dt.d]||[]).push(s);}});
  draftsKind().forEach(x=>{const dt=x.approx_date&&shootDate(x.approx_date);if(dt&&dt.mo===calM){(days[dt.d]=days[dt.d]||[]).push({...x,_dr:true});}});
  const keys=Object.keys(days).map(Number).sort((a,b)=>a-b);
  if(!keys.length){const p=el("div","panel");p.appendChild(el("div","empty",MONTHS_AZ[calM]+" üçün çəkiliş yoxdur"));wrap.appendChild(p);return wrap;}
  const DOWN=["Bazar","Bazar ertəsi","Çərşənbə axşamı","Çərşənbə","Cümə axşamı","Cümə","Şənbə"];
  const tn=new Date();
  keys.forEach(d=>{
    const isToday=(tn.getFullYear()===calY&&tn.getMonth()===calM&&tn.getDate()===d);
    const hd=el("div");hd.style.cssText="display:flex;align-items:baseline;gap:8px;margin:16px 2px 8px";
    hd.innerHTML=`<span style="font-size:20px;font-weight:800;${isToday?'color:var(--accent-ink)':''}">${d}</span><span style="font-size:13px;color:var(--muted);font-weight:600">${DOWN[new Date(calY,calM,d).getDay()]}${isToday?' · Bu gün':''}</span>`;
    wrap.appendChild(hd);
    days[d].sort((a,b)=>String(a.shoot_time||"").localeCompare(String(b.shoot_time||""))).forEach(s=>{
      if(s._dr){const card=el("div","panel");card.style.cssText="margin:0 0 10px;padding:12px 14px;border:1px dashed var(--muted)";
        card.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><strong style="font-size:15px;flex:1">📝 ${esc(s.client)} ${pmTag(s.client)}</strong><span class="chip c-mut" style="font-size:10.5px">Draft</span></div><div class="hint" style="font-size:12.5px">${esc(s.approx||"Təxmini tarix")}${s.notes?" · "+esc(s.notes):""}</div>`;
        if(mng)card.onclick=()=>openDraftForm(state.shoot_drafts.find(x=>x.id===s.id));wrap.appendChild(card);return;}
      const col=s.held==="no"?"crit":s.held===""?"mut":stageColor(s.stage);
      const stTxt=s.held==="no"?"Baş tutmadı":s.held===""?"Planlı":SHOOT_STAGES[(s.stage||1)-1];
      const acts=(role!=="content"?`<button class="mini" data-e="${s.id}">${ICON.check} Qeyd</button>`:"")+(mng?`<button class="mini" data-sedit="${s.id}">${ICON.edit}</button><button class="mini" data-sdel="${s.id}" style="color:var(--crit)">${ICON.trash}</button>`:"");
      const card=el("div","panel");card.style.cssText="margin:0 0 10px;padding:12px 14px;border-left:4px solid var(--"+col+")";
      card.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px"><strong style="font-size:15px;flex:1">${esc(s.client)} ${pmTag(s.client)}</strong>${s.shoot_time?`<span class="chip c-accent" style="font-size:11px">${esc(s.shoot_time)}</span>`:""}<span class="chip c-${col}" style="font-size:10.5px">${esc(stTxt)}</span></div>
        <div class="hint" style="display:flex;gap:10px;flex-wrap:wrap;font-size:12.5px;margin-bottom:9px"><span class="opcell">${ICON.camVideo}${esc(s.video_op||"—")}</span>${s.photo_op?`<span class="opcell">${ICON.camPhoto}${esc(s.photo_op)}</span>`:""}${s.model_name?`<span class="opcell">${ICON.users}${esc(s.model_name)}</span>`:""}<span class="chip c-mut" style="font-size:10px">${esc(shootMonth(s))}</span></div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">${acts}</div>`;
      wrap.appendChild(card);
    });
  });
  wrap.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>openShoot(b.dataset.e));
  wrap.querySelectorAll("[data-sedit]").forEach(b=>b.onclick=()=>openForm(state.shoots.find(x=>x.id==b.dataset.sedit)));
  wrap.querySelectorAll("[data-sdel]").forEach(b=>b.onclick=()=>{const s=state.shoots.find(x=>x.id==b.dataset.sdel);confirmDel('shoots',s.id,"«"+s.client+"» çəkilişi");});
  return wrap;
}
function renderCalendar(){
  if(typeof window!=="undefined"&&window.innerWidth<640)return renderCalAgenda();
  const cal=el("div","cal");
  const dow=el("div","dow");["B.e","Ç.a","Ç","C.a","C","Ş","B"].forEach(d=>dow.appendChild(el("div",null,d)));cal.appendChild(dow);
  const grid=el("div","grid7");
  const startDow=(new Date(calY,calM,1).getDay()+6)%7, daysIn=new Date(calY,calM+1,0).getDate(), prevDays=new Date(calY,calM,0).getDate();
  const today=new Date();
  for(let i=0;i<startDow;i++){const c=el("div","cell out");c.appendChild(el("div","dn",String(prevDays-startDow+i+1)));grid.appendChild(c);}
  const isMgr=canManageShoots();
  for(let d=1;d<=daysIn;d++){
    const c=el("div","cell");
    if(today.getFullYear()===calY&&today.getMonth()===calM&&today.getDate()===d)c.classList.add("today");
    c.appendChild(el("div","dn",String(d)));
    if(isMgr){
      c.ondragover=e=>{e.preventDefault();c.classList.add("dragover");};
      c.ondragleave=()=>c.classList.remove("dragover");
      c.ondrop=e=>{e.preventDefault();c.classList.remove("dragover");const id=e.dataTransfer.getData("text/plain");if(id){const dd=String(d).padStart(2,"0")+"."+String(calM+1).padStart(2,"0");if(id.startsWith("d:"))upd('shoot_drafts',id.slice(2),{approx_date:dd});else upd('shoots',id,{shoot_date:dd});}};
    }
    shootsKind().filter(s=>{const dt=shootDate(s.shoot_date);return dt&&dt.mo===calM&&dt.d===d;}).forEach(s=>{
      const col=s.held==="no"?"crit":s.held===""?"mut":stageColor(s.stage);
      const ev=el("div","ev ev-"+col+(isMgr?" has-acts":""));
      ev.title=`${s.client} · ${s.shoot_time} · Video: ${s.video_op||"—"}${s.photo_op?" · Foto: "+s.photo_op:""}${s.model_name?" · Model: "+s.model_name:""}`;
      const ops=`<span>${ICON.camVideo}${esc(s.video_op||"—")}</span>`+(s.photo_op?`<span>${ICON.camPhoto}${esc(s.photo_op)}</span>`:"")+(s.model_name?`<span>${ICON.users}${esc(s.model_name)}</span>`:"");
      ev.innerHTML=`${isMgr?`<span class="eve" data-ed title="Redaktə et">${ICON.edit}</span><span class="evx" data-x title="Sil">×</span>`:""}<div class="evt">${s.shoot_time?`<span class="op">${esc(s.shoot_time)}</span> `:""}${esc(s.client)}</div><div style="margin:2px 0">${pmTag(s.client)}</div><div class="evops">${ops}</div>`;
      if(isMgr){ev.draggable=true;ev.ondragstart=e=>{e.dataTransfer.setData("text/plain",String(s.id));e.dataTransfer.effectAllowed="move";};}
      ev.onclick=e=>{if(e.target.closest("[data-x]")||e.target.closest("[data-ed]"))return;openShoot(s.id);};
      const eb=ev.querySelector("[data-ed]");if(eb)eb.onclick=e=>{e.stopPropagation();openForm(s);};
      const xb=ev.querySelector("[data-x]");if(xb)xb.onclick=e=>{e.stopPropagation();confirmDel('shoots',s.id,"«"+s.client+"» çəkilişi");};
      c.appendChild(ev);
    });
    draftsKind().filter(x=>{const dt=x.approx_date&&shootDate(x.approx_date);return dt&&dt.mo===calM&&dt.d===d;}).forEach(x=>{
      const ev=el("div","ev ev-draft");ev.title=`Draft · ${x.client}${x.approx?" · "+x.approx:""}${x.notes?" · "+x.notes:""}`;
      ev.innerHTML=`<div class="evt">📝 Draft · ${esc(x.client)}</div><div style="margin:2px 0">${pmTag(x.client)}</div>`;
      if(isMgr){ev.draggable=true;ev.ondragstart=e=>{e.dataTransfer.setData("text/plain","d:"+x.id);e.dataTransfer.effectAllowed="move";};ev.onclick=()=>openDraftForm(x);}
      c.appendChild(ev);
    });
    grid.appendChild(c);
  }
  const trail=(7-(startDow+daysIn)%7)%7;
  for(let i=1;i<=trail;i++){const c=el("div","cell out");c.appendChild(el("div","dn",String(i)));grid.appendChild(c);}
  cal.appendChild(grid);return cal;
}
function canManageShoots(){return role==="coordinator"||role==="ceo"||role==="marketing"||role==="pm";}
function renderShootTable(){
  const p=el("div","panel");const mng=canManageShoots();const rows=shootsKind();
  p.appendChild(el("div","ph",`<h3>${shootKind==="atmosfer"?"Atmosfer":"Kontent"} çəkilişləri</h3><span class="count">${rows.length}${draftsKind().length?" + "+draftsKind().length+" draft":""}</span>`));
  const tw=el("div","tablewrap shoottbl");const tb=el("tbody");
  rows.forEach(s=>{
    const tr=el("tr");let dots="";for(let i=1;i<=4;i++)dots+=`<span class="step ${i<s.stage?'on':i===s.stage?'cur':''}"></span>`;
    const st=s.held==="no"?'<span class="chip c-crit">Baş tutmadı</span>':s.held===""?'<span class="chip c-mut">Planlı</span>':`<span style="display:inline-flex;align-items:center;gap:6px"><span class="steps">${dots}</span><span class="hint">${SHOOT_STAGES[s.stage-1]}</span></span>`;
    const acts=(role!=="content"?`<button class="mini" data-e="${s.id}" title="Vəziyyət / qeyd">${ICON.check} Qeyd</button>`:"")+(mng?`<button class="mini" data-sedit="${s.id}" title="Redaktə et">${ICON.edit}</button><button class="mini" data-sdel="${s.id}" title="Sil" style="color:var(--crit);border-color:color-mix(in srgb,var(--crit) 35%,transparent)">${ICON.trash}</button>`:"");
    tr.innerHTML=`<td data-label="Müştəri"><strong>${esc(s.client)}</strong> ${pmTag(s.client)}</td><td class="num" data-label="Tarix">${esc(s.shoot_date)}</td><td class="num" data-label="Saat">${esc(s.shoot_time||"—")}</td><td data-label="Ay"><span class="chip c-accent" style="font-size:10.5px">${esc(shootMonth(s))}</span></td><td data-label="Video op"><span class="opcell">${ICON.camVideo}${esc(s.video_op||"—")}</span></td><td data-label="Foto op">${s.photo_op?'<span class="opcell">'+ICON.camPhoto+esc(s.photo_op)+'</span>':'<span class="hint">—</span>'}</td><td data-label="Model">${s.model_name?'<span class="opcell">'+ICON.users+esc(s.model_name)+'</span>':'<span class="hint">—</span>'}</td><td data-label="Vəziyyət">${st}</td><td class="r" data-label=""><div style="display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap">${acts}</div></td>`;
    tb.appendChild(tr);
  });
  draftsKind().forEach(x=>{const tr=el("tr");tr.style.opacity=".8";
    tr.innerHTML=`<td data-label="Müştəri"><strong>📝 ${esc(x.client)}</strong> ${pmTag(x.client)}</td><td class="num" data-label="Tarix">${x.approx_date?"~"+esc(x.approx_date):"—"}</td><td class="num" data-label="Saat">—</td><td data-label="Ay">${x.month?`<span class="chip c-accent" style="font-size:10.5px">${esc(x.month)}</span>`:""}</td><td data-label="Video op" colspan="3"><span class="hint">${esc([x.approx,x.notes].filter(Boolean).join(" · ")||"Tarix dəqiq deyil")}</span></td><td data-label="Vəziyyət"><span class="chip c-mut" style="border:1px dashed var(--muted)">Draft</span></td><td class="r" data-label="">${mng?`<button class="mini" data-dtok="${x.id}">${ICON.check} Təsdiqlə</button>`:""}</td>`;
    const b=tr.querySelector("[data-dtok]");if(b)b.onclick=()=>openForm(null,{client:x.client,month:x.month,shoot_date:x.approx_date||"",_draft:x.id});
    tb.appendChild(tr);});
  const table=el("table");table.innerHTML=`<thead><tr><th>Müştəri</th><th>Tarix</th><th>Saat</th><th>Ay</th><th>Video op</th><th>Foto op</th><th>Model</th><th>Vəziyyət</th><th></th></tr></thead>`;
  table.appendChild(tb);tw.appendChild(table);p.appendChild(tw);
  tw.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>openShoot(b.dataset.e));
  tw.querySelectorAll("[data-sedit]").forEach(b=>b.onclick=()=>openForm(state.shoots.find(x=>x.id==b.dataset.sedit)));
  tw.querySelectorAll("[data-sdel]").forEach(b=>b.onclick=()=>{const s=state.shoots.find(x=>x.id==b.dataset.sdel);confirmDel('shoots',s.id,"«"+s.client+"» çəkilişi");});
  return p;
}
function openShoot(id){
  if(role==="content")return; /* content manager cədvələ yalnız baxır */
  const s=state.shoots.find(x=>x.id==id);if(!s)return;
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>${esc(s.client)} — ${esc(s.shoot_date)} ${esc(s.shoot_time)}</h3><button>×</button></div>
    <div class="mb">
      <div class="hint" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="opcell">${ICON.camVideo}Video: ${esc(s.video_op||"—")}</span><span class="opcell">${ICON.camPhoto}Foto: ${esc(s.photo_op||"yoxdur")}</span>${s.model_name?`<span class="opcell">${ICON.users}Model: ${esc(s.model_name)}</span>`:""}</div>
      <div class="field"><label>Çəkiliş baş tutdu?</label><div class="seg" style="margin:0;width:100%">
        <button type="button" data-h="yes" class="${s.held==='yes'?'on':''}" style="flex:1">Baş tutdu</button>
        <button type="button" data-h="no" class="${s.held==='no'?'on':''}" style="flex:1">Baş tutmadı</button>
        <button type="button" data-h="" class="${s.held===''?'on':''}" style="flex:1">Planlı</button></div></div>
      <div class="field"><label>Neçə ədəd video çəkildi</label><input id="vv" type="number" min="0" value="${s.videos||0}"></div>
      <div class="field"><label>Əlavə qeyd</label><textarea id="nn">${esc(s.notes||"")}</textarea></div>
    </div>
    <div class="mf"><button class="btn ghost" data-x>Bağla</button><button class="btn" data-ok>Yadda saxla</button></div></div>`;
  document.body.appendChild(scrim);
  let held=s.held;const close=()=>scrim.remove();
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  scrim.querySelectorAll("[data-h]").forEach(b=>b.onclick=()=>{held=b.dataset.h;scrim.querySelectorAll("[data-h]").forEach(x=>x.classList.toggle("on",x.dataset.h===held));});
  scrim.querySelector("[data-ok]").onclick=()=>{const patch={held,videos:+scrim.querySelector("#vv").value||0,notes:scrim.querySelector("#nn").value.trim()};if(held==="yes"&&s.stage<1)patch.stage=1;close();upd('shoots',s.id,patch);};
}

/* ---------- Delivery (per-video) ---------- */
const deliveryOpen=new Set();
function getVids(s){const n=Math.max(s.videos||0,(Array.isArray(s.vids)?s.vids.length:0));const arr=Array.isArray(s.vids)?s.vids:[];const out=[];for(let i=0;i<n;i++)out.push(Object.assign({link:"",stage:1,ceo:false,marketing:false,pm:false},arr[i]||{}));return out;}
function shootOpenVids(s){return getVids(s).filter(v=>v.stage<4).length;}
/* Video deadline: «Baş tutdu» qeyd olunandan (held_at) 3 gün; bütün videolar təsdiqlənəndə bitir. 6-cı gün cərimə. */
function shootDeadline(s){
  if(s.held!=="yes"||!s.held_at)return null;
  const vids=getVids(s);if(vids.length&&vids.every(v=>v.stage>=4))return null;
  const h=(Date.now()-Date.parse(s.held_at))/36e5;if(!isFinite(h))return null;
  if(h<72){const left=Math.ceil((72-h)/24);return {c:left<=1?"warn":"good",txt:`Deadline: ${left} gün qalıb`};}
  const late=Math.floor((h-72)/24)+1;
  return {c:"crit",txt:`${late} gün gecikib${h>=120?" · cərimə":""}`};
}
/* Həmişə bazadakı ən son vəziyyətin üzərinə yazılır — köhnə ekran nüsxəsi başqasının yüklədiyi linki silməsin */
async function freshShoot(s){try{const {data}=await sb.from('shoots').select('*').eq('id',s.id).maybeSingle();return data||s;}catch(e){return s;}}
async function setVid(s,i,patch){if(patch.stage===3)patch={...patch,ready_at:new Date().toISOString()};const f=await freshShoot(s);const vids=getVids(f);vids[i]=Object.assign({},vids[i],patch);await upd('shoots',s.id,{vids});}
function getPhotos(s){return Object.assign({link:"",count:0,stage:1,ceo:false,marketing:false,pm:false},(s.photos&&typeof s.photos==='object')?s.photos:{});}
async function setPhotos(s,patch){const f=await freshShoot(s);await upd('shoots',s.id,{photos:Object.assign({},getPhotos(f),patch)});}
async function driveFolderShare(folderId){const token=await gToken();try{await fetch('https://www.googleapis.com/drive/v3/files/'+folderId+'/permissions',{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({role:'reader',type:'anyone'})});}catch(e){}}
async function drivePhotosUpload(s){
  if(!(await driveReady())){alert("Əvvəlcə yuxarıdan «Drive-ı qoş» (bir dəfəlik).");return;}
  let files=await pickFolderFiles();
  files=files.filter(f=>/^image\//.test(f.type||"")||/\.(jpe?g|png|gif|webp|heic|heif|tiff?|bmp|raw|cr2|nef|arw|dng)$/i.test(f.name));
  if(!files.length){alert("Qovluqda şəkil tapılmadı. Şəkilləri olan qovluğu seç.");return;}
  const picked=(files[0].webkitRelativePath||"").split('/')[0]||"";
  const folderName=picked?("Foto — "+picked):("Foto "+(s.shoot_date||"")+(s.shoot_time?" "+s.shoot_time:""));
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:400px"><div class="mb"><div id="ptitle" style="font-weight:600;margin-bottom:6px">${ICON.camPhoto} Foto qovluğu yüklənir…</div><div class="hint" id="psub" style="white-space:normal">Drive qovluğu yaradılır…</div><div style="height:8px;background:var(--surface-2);border-radius:6px;margin-top:12px;overflow:hidden"><div id="pbar" style="height:100%;width:0;background:var(--accent);transition:width .2s"></div></div><div class="hint" id="ppct" style="margin-top:6px">0%</div></div></div>`;
  document.body.appendChild(scrim);
  const setP=(txt,pct)=>{const t=scrim.querySelector("#psub");if(t&&txt)t.textContent=txt;const b=scrim.querySelector("#pbar");if(b&&pct!=null)b.style.width=pct+"%";const pc=scrim.querySelector("#ppct");if(pc&&pct!=null)pc.textContent=pct+"%";};
  try{
    const monthFolder=await folderFor(s.client, shootMonth(s), "Foto");
    const photoFolder=await ensureFolder(folderName, monthFolder);
    await driveFolderShare(photoFolder);
    for(let k=0;k<files.length;k++){
      setP((k+1)+"/"+files.length+" şəkil yüklənir…",Math.round(k/files.length*100));
      await new Promise((res,rej)=>driveUpload(files[k],()=>{},()=>{},photoFolder).then(res).catch(rej));
    }
    setP("Tamamlandı",100);scrim.remove();
    await setPhotos(s,{link:"https://drive.google.com/drive/folders/"+photoFolder,count:files.length,stage:2});
    notifyUpload(s,"Foto ("+files.length+" şəkil)");
  }catch(e){scrim.remove();alert("Foto yükləmə alınmadı: "+(e.message||e));}
}
function photoCard(s,r){
  const isMgr=TASK_MANAGERS.includes(role);
  const canOp=r.operator||role==="coordinator"||role==="editor"||isMgr;
  const ph=getPhotos(s);
  const appr=`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">`+APPROVERS.map(a=>`<span class="chip ${ph[a[0]]?'c-good':'c-mut'}" style="font-size:10px;padding:2px 6px">${ph[a[0]]?'✓':'○'} ${a[1]}</span>`).join(" ")+`</div>`;
  let ctr="";
  if(!ph.link){
    ctr = canOp?`<button class="mini" data-pup="${s.id}">${ICON.folder} Qovluğu yüklə</button><button class="mini" data-plink="${s.id}">${ICON.link} Qovluq linki</button>`:`<span class="chip c-mut" style="font-size:10.5px">Foto yüklənməyib</span>`;
  }else{
    ctr = `<button class="mini" data-popen="${s.id}">${ICON.camPhoto} Qovluğu aç</button>`;
    if(ph.stage>=3&&r.approver){ ctr += ph[r.approver]?`<span class="chip c-good" style="font-size:10.5px">Sən təsdiqlədin</span>`:`<button class="mini" data-pappr="${s.id}">${ICON.check} Təsdiq et</button>`; }
    else if(ph.stage===2&&canOp){ ctr += `<button class="mini" data-pready="${s.id}">${ICON.check} Təhvilə göndər</button>`; }
    if(canOp)ctr+=`<button class="mini" data-pdel="${s.id}" title="Foto qovluğunu sil" style="color:var(--crit);border-color:color-mix(in srgb,var(--crit) 35%,transparent)">${ICON.trash}</button>`;
  }
  const stName=ph.stage>=4?"Təsdiqləndi":ph.link?(ph.stage>=3?"Təhvildə":"Yükləndi"):"Gözləyir";
  const stCol=ph.stage>=4?"good":ph.link?"accent":"warn";
  return `<div class="kcard" style="border-left:3px solid var(--${stCol})">
    <div class="kt" style="display:flex;align-items:center;gap:8px">${ICON.camPhoto} Foto təhvili${ph.count?` <span class="hint">(${ph.count} şəkil)</span>`:""}<span class="chip c-${stCol}" style="margin-left:auto;font-size:10px;padding:2px 7px">${esc(stName)}</span></div>
    ${ph.stage>=3?appr:""}
    <div class="kf" style="flex-wrap:wrap;gap:6px">${ctr}${chatBtn('shoot:'+s.id+':photo',s.client+" · Foto",s.shoot_date)}</div>
  </div>`;
}
function videoCard(s,i,v,r){
  const isMgr=TASK_MANAGERS.includes(role);
  const canOp=r.operator||role==="coordinator"||role==="editor"||isMgr;
  const num=i+1;
  let dots="";for(let k=1;k<=4;k++)dots+=`<span class="step ${k<v.stage?'on':k===v.stage?'cur':''}"></span>`;
  const appr=`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">`+APPROVERS.map(a=>`<span class="chip ${v[a[0]]?'c-good':'c-mut'}" style="font-size:10px;padding:2px 6px">${v[a[0]]?'✓':'○'} ${a[1]}</span>`).join(" ")+`</div>`;
  let ctr="";
  if(!v.link){
    ctr = canOp?`<button class="mini" data-vupload="${s.id}:${i}">${ICON.cloud} Yüklə</button><button class="mini" data-vlink2="${s.id}:${i}">${ICON.link} Link</button>`:`<span class="chip c-mut" style="font-size:10.5px">Yüklənməyib</span>`;
  }else{
    ctr = `<button class="mini" data-vopen2="${s.id}:${i}">${ICON.play} Aç</button>`;
    {const open=annFor("vid:"+s.id+":"+i).filter(a=>!a.resolved).length;ctr+=`<button class="mini" data-vrev="${s.id}:${i}" title="Videonun dəqiq saniyəsinə rəy">⏱ Vaxtla rəy${open?" · "+open:""}</button>`;}
    if(canOp&&v.stage<4){
      if(v.stage===1)ctr+=`<button class="mini" data-vmv="${s.id}:${i}:2">Montaja keçir ${ICON.arrow}</button>`;
      else if(v.stage===2)ctr+=`<button class="mini" data-vmv="${s.id}:${i}:3">${ICON.check} Hazırdır et</button>`;
    }
    if(canOp)ctr+=`<button class="mini" data-vdel2="${s.id}:${i}" title="Videonu sil" style="color:var(--crit);border-color:color-mix(in srgb,var(--crit) 35%,transparent)">${ICON.trash}</button>`;
  }
  if(v.stage>=3&&r.approver){ ctr += v[r.approver]?`<span class="chip c-good" style="font-size:10.5px">Sən təsdiqlədin</span>`:`<button class="mini" data-vappr="${s.id}:${i}">${ICON.check} Təsdiq et</button>`; }
  if(isMgr){ ctr += `<span style="display:inline-flex;gap:3px;margin-left:auto"><select class="mini vstage" data-vstage="${s.id}:${i}" style="padding:4px 6px" title="Mərhələni dəyiş">`+SHOOT_STAGES.map((n,k)=>`<option value="${k+1}"${v.stage===k+1?" selected":""}>${esc(n)}</option>`).join("")+`</select></span>`; }
  const stName = v.stage>=4?"Təsdiqləndi":SHOOT_STAGES[v.stage-1];
  const stCol = v.stage>=4?"good":v.stage>=2?"accent":"warn";
  return `<div class="kcard" style="border-left:3px solid var(--${stCol})">
    <div class="kt" style="display:flex;align-items:center;gap:8px">${ICON.camVideo} Video ${num}<span class="chip c-${stCol}" style="margin-left:auto;font-size:10px;padding:2px 7px">${esc(stName)}</span></div>
    <div class="steps" style="margin-top:8px">${dots}</div>
    ${v.stage>=3?appr:""}${v.client_ok?`<div style="margin-top:6px">${clientOkChip(v.client_ok,v.client_note)}</div>`:""}
    <div class="kf" style="flex-wrap:wrap;gap:6px">${ctr}${chatBtn('shoot:'+s.id+':v'+i,s.client+" · Video "+num,s.shoot_date)}</div>
  </div>`;
}
/* Çəkiliş arxivi: «baş tutdu»dan 20 gün keçən çəkilişlər təhvil siyahısından arxivə keçir (hazır dizayn keçmişi kimi, default bağlı) */
const DELIV_ARCHIVE_DAYS=20;
const shootArchived=s=>{const t=Date.parse(s.held_at||s.created_at||"");return isFinite(t)&&Date.now()-t>DELIV_ARCHIVE_DAYS*864e5;};
let daOpen=(()=>{try{return localStorage.getItem("mm_da_open")==="1";}catch(e){return false;}})(),daClient="",daQ="",daMore=30,daMonth="",daKind="";
/* Arxivdə ay adı: köhnə ingiliscə qeyd eyni aya düşsün */
const daMonthOf=s=>{const m=shootMonth(s);return m==="October"?"Oktyabr":m;};
function renderDelivery(){
  const wrap=el("div");const r=ROLES[role];const isMgr=TASK_MANAGERS.includes(role);
  const canManageCount=role==="coordinator"||r.operator||isMgr;
  const lg=el("div","panel");lg.style.marginBottom="16px";
  lg.appendChild(el("div","ph",`<h3>İş axını</h3><span class="count">Hər video ayrı: Yüklə → Montaja keçir → Hazırdır → CEO·Marketinq·PM təsdiqi</span>`));
  wrap.appendChild(lg);
  const dseg=el("div","seg");dseg.style.marginBottom="14px";
  dseg.innerHTML=`<button class="${deliveryKind==='kontent'?'on':''}" data-dk="kontent">📋 Kontent çəkilişləri</button><button class="${deliveryKind==='atmosfer'?'on':''}" data-dk="atmosfer">🎬 Atmosfer çəkilişləri</button>`;
  dseg.querySelectorAll("[data-dk]").forEach(b=>b.onclick=()=>{deliveryKind=b.dataset.dk;render();});
  wrap.appendChild(dseg);
  const allDone=state.shoots.filter(s=>s.held==="yes"&&(s.kind||"kontent")===deliveryKind&&pmClientOk(s.client));
  let list=allDone.filter(s=>!shootArchived(s));const arch=state.shoots.filter(s=>s.held==="yes"&&pmClientOk(s.client));
  let openCount=0;list.forEach(s=>openCount+=shootOpenVids(s));
  const p=el("div","panel");
  p.appendChild(el("div","ph",`<h3>Çəkiliş Təhvili</h3><span class="count">${openCount} açıq video</span>`));
  const body=el("div");body.style.padding="8px";
  if(!list.length)body.appendChild(el("div","empty",arch.length?"Son "+DELIV_ARCHIVE_DAYS+" gündə baş tutan çəkiliş yoxdur — köhnələr aşağıdakı arxivdədir":"Baş tutan çəkiliş yoxdur"));
  const detFor=s=>{const vids=getVids(s);const det=el("div");det.style.cssText="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin:0 2px 10px";
    if(!vids.length)det.innerHTML=`<div class="hint" style="padding:8px">Koordinator «Qeyd»-dən video sayını təyin etməlidir.</div>`;
    else vids.forEach((v,i)=>{const d=el("div");d.innerHTML=videoCard(s,i,v,r);det.appendChild(d.firstElementChild);});
    const out=el("div");out.appendChild(det);
    if((s.photo_op||"").trim()){const pw=el("div");pw.style.cssText="margin:0 2px 14px;max-width:420px";pw.innerHTML=photoCard(s,r);out.appendChild(pw);}
    return out;};
  list.forEach(s=>{
    const vids=getVids(s);const n=vids.length;const approved=vids.filter(v=>v.stage>=4).length;
    const open=deliveryOpen.has(String(s.id));
    const head=el("div");head.style.cssText="display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface);margin-bottom:8px;cursor:pointer";
    const stateChip = n===0?`<span class="chip c-warn" style="font-size:10.5px">Video sayı qeyd olunmayıb</span>`:approved===n?`<span class="chip c-good" style="font-size:10.5px">${ICON.check} Hamısı təsdiqləndi</span>`:`<span class="chip c-accent" style="font-size:10.5px">${approved}/${n} təsdiqləndi</span>`;
    head.innerHTML=`<span style="transform:rotate(${open?90:0}deg);transition:transform .15s;color:var(--muted);display:inline-flex">${ICON.arrow}</span>
      <div style="min-width:0"><div style="font-weight:600;display:flex;align-items:center;gap:6px">${esc(s.client)}<span class="chip c-accent" style="font-size:9.5px;padding:1px 7px">${esc(shootMonth(s))}</span></div><div class="hint" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px"><span>${esc(s.shoot_date)}</span><span class="opcell">${ICON.camVideo}${esc(s.video_op||"—")}</span>${s.photo_op?'<span class="opcell">'+ICON.camPhoto+esc(s.photo_op)+'</span>':""}${s.model_name?'<span class="opcell">'+ICON.users+esc(s.model_name)+'</span>':""}</div></div>
      <span style="margin-left:auto;display:flex;align-items:center;gap:8px">${(dl=>dl?`<span class="chip c-${dl.c}" style="font-size:10.5px">${ICON.clock}${esc(dl.txt)}</span>`:"")(shootDeadline(s))}<span class="chip c-mut" style="font-size:10.5px">${n} video</span>${stateChip}${canManageCount?`<button class="mini" data-dqeyd="${s.id}" title="Video sayı / qeyd">${ICON.edit}</button>`:""}${isMgr?`<button class="mini" data-ddel="${s.id}" title="Çəkilişi sil" style="color:var(--crit);border-color:color-mix(in srgb,var(--crit) 35%,transparent)">${ICON.trash}</button>`:""}</span>`;
    head.setAttribute("data-dtoggle",String(s.id));
    body.appendChild(head);
    if(open)body.appendChild(detFor(s));
  });
  if(arch.length){
    const box=el("div","bh"+(daOpen?" open":""));box.style.cssText="margin-top:14px;border:1px solid var(--border);border-radius:var(--r-sm)";
    const head=el("button","ph bhhead",`<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg><h3>Çəkiliş arxivi</h3><span class="count">${arch.length}</span>`);
    head.type="button";head.title="Baş tutan bütün çəkilişlər: kontent və atmosfer";head.setAttribute("aria-expanded",daOpen?"true":"false");
    const ab=el("div","bhbody");ab.hidden=!daOpen;box.append(head,ab);
    head.onclick=()=>{daOpen=!daOpen;try{localStorage.setItem("mm_da_open",daOpen?"1":"0");}catch(e){}box.classList.toggle("open",daOpen);ab.hidden=!daOpen;head.setAttribute("aria-expanded",daOpen?"true":"false");};
    const clients=[...new Set(arch.map(s=>s.client).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"az"));if(daClient&&!clients.includes(daClient))daClient="";
    const bar=el("div","kanq bhbar");const sel=el("select");sel.setAttribute("aria-label","Məkan");
    sel.innerHTML=`<option value="">Bütün məkanlar</option>`+clients.map(c=>`<option value="${esc(c)}"${c===daClient?" selected":""}>${esc(c)} (${arch.filter(s=>s.client===c).length})</option>`).join("");
    const lastAt=m=>Math.max(...arch.filter(s=>daMonthOf(s)===m).map(s=>Date.parse(s.held_at||s.created_at||"")||0));
    const months=[...new Set(arch.map(daMonthOf).filter(Boolean))].sort((a,b)=>lastAt(b)-lastAt(a));if(daMonth&&!months.includes(daMonth))daMonth="";
    const msel=el("select");msel.setAttribute("aria-label","Çəkiliş ayı");
    msel.innerHTML=`<option value="">Bütün aylar</option>`+months.map(m=>`<option value="${esc(m)}"${m===daMonth?" selected":""}>${esc(m)} (${arch.filter(s=>daMonthOf(s)===m).length})</option>`).join("");
    const ksel=el("select");ksel.setAttribute("aria-label","Çəkiliş növü");
    ksel.innerHTML=[["","Bütün növlər"],["kontent","Kontent"],["atmosfer","Atmosfer"]].map(([v,t])=>`<option value="${v}"${v===daKind?" selected":""}>${t}</option>`).join("");
    const qi=el("input");qi.type="search";qi.placeholder="Axtar — məkan, operator, ay…";qi.value=daQ;bar.append(msel,sel,ksel,qi);ab.appendChild(bar);
    const q=daQ.trim().toLocaleLowerCase("az");
    const L=arch.filter(s=>(!daClient||s.client===daClient)&&(!daMonth||daMonthOf(s)===daMonth)&&(!daKind||(s.kind||"kontent")===daKind)&&(!q||[s.client,s.video_op,s.photo_op,s.model_name,shootMonth(s),s.shoot_date].join(" ").toLocaleLowerCase("az").includes(q)))
      .sort((a,b)=>String(b.held_at||b.created_at||"").localeCompare(String(a.held_at||a.created_at||"")));
    const lst=el("div","bhlist");ab.appendChild(lst);
    if(!L.length)lst.appendChild(el("div","empty","Bu filtrə uyğun çəkiliş yoxdur"));
    L.slice(0,daMore).forEach(s=>{const vids=getVids(s);const ok=vids.filter(v=>v.stage>=4).length;const ph=getPhotos(s);const id=String(s.id);
      const links=vids.map((v,i)=>v.link?`<button class="mini" data-vopen2="${s.id}:${i}" title="Video ${i+1}">${ICON.play}${i+1}</button>`:"").join("")+(ph.link?`<button class="mini" data-popen="${s.id}" title="Foto qovluğu">${ICON.camPhoto}</button>`:"");
      const row=el("div","bhrow"+(deliveryOpen.has(id)?" on":""));
      row.innerHTML=`<span class="bhd num" title="Çəkiliş tarixi">${esc(s.shoot_date||"—")}</span><span class="bhc">${esc(s.client)}</span><span class="bht has" role="button" tabindex="0" data-dtoggle="${id}" title="Videoları aç">${(s.kind||"kontent")==="atmosfer"?"Atmosfer":"Kontent"} · ${esc(daMonthOf(s))} · ${vids.length} video${vids.length?` · ${ok}/${vids.length} təsdiq`:""} <i class="bhmore">›</i></span><span class="bhw">${esc(s.video_op||"")}</span><span class="bhf" style="display:flex;gap:4px;flex-wrap:wrap">${links}</span>`;
      lst.appendChild(row);
      if(deliveryOpen.has(id))lst.appendChild(detFor(s));
    });
    if(L.length>daMore){const m=el("button","mini bhmorebtn",`Daha çox göstər (${L.length-daMore})`);m.onclick=()=>{daMore+=30;render();};lst.appendChild(m);}
    sel.onchange=()=>{daClient=sel.value;daMore=30;render();};
    msel.onchange=()=>{daMonth=msel.value;daMore=30;render();};
    ksel.onchange=()=>{daKind=ksel.value;daMore=30;render();};
    let qt=0;qi.oninput=()=>{daQ=qi.value;clearTimeout(qt);qt=setTimeout(()=>{daMore=30;render();setTimeout(()=>{const x=document.querySelector('.bh input[type=search][placeholder^="Axtar — məkan, operator"]');if(x){x.focus();x.setSelectionRange(x.value.length,x.value.length);}},0);},350);};
    body.appendChild(box);
  }
  p.appendChild(body);wrap.appendChild(p);
  const parse=v=>v.split(':');
  body.querySelectorAll("[data-dtoggle]").forEach(h=>h.onclick=e=>{if(e.target.closest("[data-dqeyd]"))return;const id=h.getAttribute("data-dtoggle");if(deliveryOpen.has(id))deliveryOpen.delete(id);else deliveryOpen.add(id);render();});
  body.querySelectorAll("[data-dqeyd]").forEach(b=>b.onclick=e=>{e.stopPropagation();openShoot(b.dataset.dqeyd);});
  body.querySelectorAll("[data-ddel]").forEach(b=>b.onclick=e=>{e.stopPropagation();const s=state.shoots.find(x=>x.id==b.dataset.ddel);confirmDel('shoots',s.id,"«"+s.client+"» çəkilişi (bütün videolar)");});
  body.querySelectorAll("[data-vstage]").forEach(sel=>sel.onclick=e=>e.stopPropagation());
  body.querySelectorAll("[data-vstage]").forEach(sel=>sel.onchange=()=>{const[id,i]=parse(sel.dataset.vstage);const s=state.shoots.find(x=>x.id==id);setVid(s,+i,{stage:+sel.value});});
  body.querySelectorAll("[data-vupload]").forEach(b=>b.onclick=()=>{const[id,i]=parse(b.dataset.vupload);const s=state.shoots.find(x=>x.id==id);drivePickAndUpload("video/*",async link=>{await setVid(s,+i,{link});notifyUpload(s,"Video "+(+i+1));},{client:s.client,sub:shootMonth(s),cat:"Video"});});
  body.querySelectorAll("[data-vlink2]").forEach(b=>b.onclick=()=>{const[id,i]=parse(b.dataset.vlink2);const s=state.shoots.find(x=>x.id==id);askLinkTo({client:s.client,sub:shootMonth(s),cat:"Video",ref:"shoots:"+s.id},async link=>{await setVid(s,+i,{link});notifyUpload(s,"Video "+(+i+1));});});
  body.querySelectorAll("[data-vrev]").forEach(b=>b.onclick=e=>{e.stopPropagation();const[id,i]=parse(b.dataset.vrev);openVideoReview(state.shoots.find(x=>x.id==id),+i);});
  body.querySelectorAll("[data-vopen2]").forEach(b=>b.onclick=()=>{const[id,i]=parse(b.dataset.vopen2);const s=state.shoots.find(x=>x.id==id);const v=getVids(s)[+i];if(v&&v.link)openDriveVideo(v.link);});
  body.querySelectorAll("[data-vmv]").forEach(b=>b.onclick=()=>{const[id,i,to]=parse(b.dataset.vmv);const s=state.shoots.find(x=>x.id==id);setVid(s,+i,{stage:+to});});
  body.querySelectorAll("[data-vappr]").forEach(b=>b.onclick=()=>{const[id,i]=parse(b.dataset.vappr);const s=state.shoots.find(x=>x.id==id);const v=getVids(s)[+i];const patch={[r.approver]:true};const nx=Object.assign({},v,patch);if(fullAppr(nx,''))patch.stage=4;setVid(s,+i,patch);});
  body.querySelectorAll("[data-vdel2]").forEach(b=>b.onclick=async()=>{const[id,i]=parse(b.dataset.vdel2);const s=state.shoots.find(x=>x.id==id);const v=getVids(s)[+i];if(!v||!v.link)return;if(!confirm("Video "+(+i+1)+" silinsin? Drive-dakı fayl da silinəcək."))return;const dId=driveId(v.link);if(dId&&(await driveReady())){try{await driveDelete(dId);}catch(e){if(!confirm("Drive-dan silinmədi. Yalnız paneldən silinsin?"))return;}}await setVid(s,+i,{link:"",stage:1,ceo:false,marketing:false,pm:false});});
  body.querySelectorAll("[data-pup]").forEach(b=>b.onclick=()=>{const s=state.shoots.find(x=>x.id==b.dataset.pup);drivePhotosUpload(s);});
  body.querySelectorAll("[data-plink]").forEach(b=>b.onclick=()=>{const s=state.shoots.find(x=>x.id==b.dataset.plink);askLinkTo({client:s.client,sub:shootMonth(s),cat:"Foto",ref:"shoots:"+s.id},async link=>{await setPhotos(s,{link,stage:2});notifyUpload(s,"Foto");});});
  body.querySelectorAll("[data-popen]").forEach(b=>b.onclick=()=>{const s=state.shoots.find(x=>x.id==b.dataset.popen);const ph=getPhotos(s);if(ph.link)window.open(ph.link,'_blank');});
  body.querySelectorAll("[data-pready]").forEach(b=>b.onclick=()=>{const s=state.shoots.find(x=>x.id==b.dataset.pready);setPhotos(s,{stage:3});});
  body.querySelectorAll("[data-pappr]").forEach(b=>b.onclick=()=>{const s=state.shoots.find(x=>x.id==b.dataset.pappr);const ph=getPhotos(s);const patch={[r.approver]:true};const nx=Object.assign({},ph,patch);if(fullAppr(nx,''))patch.stage=4;setPhotos(s,patch);});
  body.querySelectorAll("[data-pdel]").forEach(b=>b.onclick=async()=>{const s=state.shoots.find(x=>x.id==b.dataset.pdel);const ph=getPhotos(s);if(!ph.link)return;if(!confirm("Foto qovluğu silinsin? (Drive-dakı qovluq qalır, yalnız paneldən silinir.)"))return;await setPhotos(s,{link:"",count:0,stage:1,ceo:false,marketing:false,pm:false});});
  wireChat(body);
  return wrap;
}

/* ---------- Finance ---------- */
/* ---------- SMM Plan (Account Manager) ----------
   CEO/PM hər Account Managerə məkan təyin edir (Instagram linki, foto/video paylaşım saatı).
   Account Manager təqvimdə paylaşım planlayır; vaxtı gələndə paylaşılmayıbsa ona bildiriş,
   «Paylaşılmadı» (səbəblə) qeyd edəndə və ya 1 saat qeyd olunmayanda CEO və PM-ə bildiriş gedir (telegram-bot ?cron=smm). */
const SMM_KINDS=[["foto","📷 Foto"],["video","🎬 Video"]];
const SMM_MGR=["ceo","pm"];
const SMM_REASONS=["Əlimdə foto yoxdur","Video hazır deyil","Müştəri təsdiqi gözlənilir","Müştəri paylaşmamağı istədi","Material gec gəldi"];
let smmY=new Date().getFullYear(),smmM=new Date().getMonth(),smmVenue="",smmAcc="";
const smmSeeAll=()=>SMM_MGR.includes(role)||role==="marketing";
const smmKind=k=>(SMM_KINDS.find(x=>x[0]===k)||SMM_KINDS[0])[1];
function smmVenues(){const all=state.smm_venues.slice().sort((a,b)=>String(a.client).localeCompare(String(b.client),"az"));return smmSeeAll()?all:all.filter(v=>me&&v.account_id===me.id);}
function smmPosts(){return smmSeeAll()?state.smm_posts.filter(p=>pmClientOk(p.client)):state.smm_posts.filter(p=>me&&p.account_id===me.id);}
function smmCanAct(p){return SMM_MGR.includes(role)||(me&&p.account_id===me.id);}
const smmToday=()=>new Date(Date.now()+4*36e5).toISOString().slice(0,10);   // Bakı tarixi
const smmDateAz=d=>{const x=String(d||"").split("-");return x.length===3?x[2]+"."+x[1]+"."+x[0]:String(d||"");};
function smmDue(p){const [y,mo,d]=String(p.post_date).split("-").map(Number);const t=String(p.post_time||"").match(/(\d{1,2}):(\d{2})/);
  return Date.UTC(y,mo-1,d,t?+t[1]:(p.kind==="video"?20:12),t?+t[2]:0)-4*36e5;}
function smmTone(p){if(smmAutoBusy(p))return "mut";if(p.status==="posted")return "good";if(p.status==="missed")return "crit";return Date.now()>=smmDue(p)?"warn":"mut";}
function smmChip(p){if(p.status==="plan"&&p.publish_mode==="auto"){const st=p.publish_status;return st==="failed"?'<span class="chip c-crit" style="font-size:10.5px">⚠️ Avto alınmadı</span>':`<span class="chip c-accent" style="font-size:10.5px">🤖 ${st&&st!=="retry"?"Paylaşılır…":st==="retry"?"Təkrar cəhd":"Avtomatik"}</span>`;}
  const c=smmTone(p);const t=p.status==="posted"?(p.auto?"🤖 ":"")+ICON.check+" Paylaşıldı":p.status==="missed"?"✗ Paylaşılmadı":c==="warn"?"⏰ Vaxtı keçib":"Planlanıb";return `<span class="chip c-${c}" style="font-size:10.5px">${t}</span>`;}
function smmVenueTime(v,kind){return v?(kind==="video"?v.video_time||"20:00":v.photo_time||"12:00"):(kind==="video"?"20:00":"12:00");}
function smmIgUrl(l){return igUrl(l);}
function smmOverdue(){return smmPosts().filter(p=>p.status==="plan"&&!smmAutoBusy(p)&&Date.now()>=smmDue(p));}

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
  s.innerHTML=[["plan","📅 Plan"],["story","◎ Story"],["media","🗂 Materiallar"]].map(([k,l])=>`<button type="button" data-tab="${k}" class="${smmTab===k?"on":""}">${l}</button>`).join("");
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

function renderSmm(){
  const wrap=el("div");const venues=smmVenues();const accs=state.profiles.filter(p=>p.role==="account");
  wrap.appendChild(smmTabs());if(smmTab==="media"){wrap.appendChild(smmMediaView(venues));return wrap;}
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px";
  const sel=(id,opts,cur)=>`<select data-f="${id}" style="font-size:13px;padding:8px 11px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--ink)">${opts.map(([v,l])=>`<option value="${esc(v)}"${v===cur?" selected":""}>${esc(l)}</option>`).join("")}</select>`;
  bar.innerHTML=`<div class="calbar" style="margin:0"><button class="nav2" data-mv="-1">‹</button><h3>${MONTHS_AZ[smmM]} ${smmY}</h3><button class="nav2" data-mv="1">›</button></div>`
    +sel("venue",[["","Bütün məkanlar"],...venues.map(v=>[v.client,v.client])],smmVenue)
    +(smmSeeAll()?sel("acc",[["","Bütün Account-lar"],...accs.map(p=>[p.id,p.full_name||p.username])],smmAcc):"")
    +(SMM_MGR.includes(role)?`<button class="btn ghost sm" data-venues style="margin-left:auto">${ICON.users} Məkanları bölüşdür</button>`:"");
  bar.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{smmM+=+b.dataset.mv;if(smmM<0){smmM=11;smmY--;}if(smmM>11){smmM=0;smmY++;}render();});
  bar.querySelectorAll("[data-f]").forEach(s=>s.onchange=()=>{if(s.dataset.f==="venue")smmVenue=s.value;else smmAcc=s.value;render();});
  const vb=bar.querySelector("[data-venues]");if(vb)vb.onclick=()=>openSmmVenues();
  wrap.appendChild(bar);
  if(!venues.length){wrap.appendChild(el("div","empty",smmSeeAll()?"Hələ məkan təyin olunmayıb — «Məkanları bölüşdür» ilə Account Managerlərə məkan təyin et və ya «+ Paylaşım» ilə istədiyin klientə plan yaz.":"Sənə hələ məkan təyin olunmayıb — CEO və ya PM təyin edəcək."));return wrap;}

  const isStoryTab=smmTab==="story";
  const all=smmPosts().filter(p=>(!smmVenue||p.client===smmVenue)&&(!smmAcc||p.account_id===smmAcc)&&(!!p.as_story===isStoryTab));
  const ym=smmY+"-"+String(smmM+1).padStart(2,"0");
  const inMonth=all.filter(p=>String(p.post_date).startsWith(ym));
  const posted=inMonth.filter(p=>p.status==="posted").length,missed=inMonth.filter(p=>p.status==="missed").length,late=inMonth.filter(p=>smmTone(p)==="warn").length;
  wrap.appendChild(el("div","tiles",tile("Planlanıb",inMonth.length,MONTHS_AZ[smmM]+(isStoryTab?" · story":" · paylaşım"))+tileC("Paylaşıldı",posted,"vaxtında qeyd olunub","good")
    +(missed?tileC("Paylaşılmadı",missed,"səbəb yazılıb","crit"):tile("Paylaşılmadı",0,""))+(late?tileC("Vaxtı keçib",late,"qeyd olunmayıb","warn"):tile("Vaxtı keçib",0,""))));

  // Hesablar: hər məkanın Instagram və TikTok qoşulması, yığcam cədvəl (açılıb-bağlanır)
  {const can=smmMediaCanAdd();let ig=0,tt=0;
    const rows=venues.map(v=>{const {client,acc}=smmIgOf(v.client);if(acc&&acc.publish_ok)ig++;const tth=String(v.tt_link||"").trim().replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i,"").replace(/[/?#].*$/,"").replace(/^@/,"");if(tth)tt++;
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

  // Bu gün və gecikənlər
  const today=smmToday();
  const now=all.filter(p=>p.status==="plan"&&(p.post_date===today||Date.now()>=smmDue(p))).sort((a,b)=>smmDue(a)-smmDue(b));
  if(now.length){const tp=el("div","panel");tp.style.marginBottom="16px";
    tp.appendChild(el("div","ph",`<h3>Bu gün və gecikənlər</h3><span class="count">${now.length}</span>`));
    const tpb=el("div","pb");now.forEach(p=>tpb.appendChild(smmRow(p,true)));tp.appendChild(tpb);wrap.appendChild(tp);}

  // Təqvim
  const evHtml=p=>`<div class="ev ev-${smmTone(p)}" data-sp="${p.id}" title="${esc(p.client+" · "+smmKind(p.kind)+" · "+(p.post_time||""))}"><div class="evt"><span class="op">${esc(p.post_time||"")}</span> ${p.kind==="video"?"🎬":"📷"} ${esc(p.client)} ${smmPlatBadges(p)}</div></div>`;
  if(window.innerWidth>=640){
    const cal=el("div","cal");const dow=el("div","dow");["B.e","Ç.a","Ç","C.a","C","Ş","B"].forEach(d=>dow.appendChild(el("div",null,d)));cal.appendChild(dow);
    const grid=el("div","grid7");const startDow=(new Date(smmY,smmM,1).getDay()+6)%7,daysIn=new Date(smmY,smmM+1,0).getDate();
    for(let i=0;i<startDow;i++)grid.appendChild(el("div","cell out"));
    for(let d=1;d<=daysIn;d++){const key=ym+"-"+String(d).padStart(2,"0");const c=el("div","cell");if(key===today)c.classList.add("today");c.dataset.day=key;
      c.innerHTML=`<div class="dn">${d}</div>`+inMonth.filter(p=>p.post_date===key).sort((a,b)=>String(a.post_time).localeCompare(String(b.post_time))).map(evHtml).join("");
      if(smmCanAdd()){c.style.cursor="copy";c.title="Bu günə paylaşım əlavə et";}grid.appendChild(c);}
    for(let i=0;i<(7-(startDow+daysIn)%7)%7;i++)grid.appendChild(el("div","cell out"));
    cal.appendChild(grid);wrap.appendChild(cal);
  }
  // Ayın siyahısı
  const lp=el("div","panel");lp.style.marginTop="16px";
  lp.appendChild(el("div","ph",`<h3>${MONTHS_AZ[smmM]} planı</h3><span class="count">${inMonth.length}</span>`));
  const lpb=el("div","pb");inMonth.slice().sort((a,b)=>smmDue(a)-smmDue(b)).forEach(p=>lpb.appendChild(smmRow(p,false)));
  if(!inMonth.length)lpb.appendChild(el("div","empty",MONTHS_AZ[smmM]+" üçün plan yoxdur — «+ Paylaşım» ilə və ya təqvimdə günə klikləyib əlavə et."));
  lp.appendChild(lpb);wrap.appendChild(lp);

  wrap.querySelectorAll("[data-igp]").forEach(b=>b.onclick=()=>smmIgConnect(b.dataset.igp,b));
  wrap.querySelectorAll("[data-sp]").forEach(x=>x.onclick=e=>{e.stopPropagation();openSmmPost(state.smm_posts.find(p=>p.id===x.dataset.sp));});
  wrap.querySelectorAll(".cell[data-day]").forEach(c=>c.onclick=()=>{if(smmCanAdd())openSmmForm(null,c.dataset.day);});
  wrap.querySelectorAll("[data-sok]").forEach(b=>b.onclick=e=>{e.stopPropagation();smmMarkPosted(state.smm_posts.find(p=>p.id===b.dataset.sok));});
  wrap.querySelectorAll("[data-sno]").forEach(b=>b.onclick=e=>{e.stopPropagation();smmMarkMissed(state.smm_posts.find(p=>p.id===b.dataset.sno));});
  return wrap;
}
function smmCanAdd(){return role==="account"||SMM_MGR.includes(role);}
/* Paylaşımın platformaları: IG / TT nişanı, story üçün ◎ */
function smmPlatBadges(p){const pl=Array.isArray(p.platforms)&&p.platforms.length?p.platforms:["instagram"];
  return `<span class="smm-pl">${pl.includes("instagram")?`<b class="ig" title="Instagram${p.as_story?" Story":""}">${p.as_story?"◎ ":""}IG</b>`:""}${pl.includes("tiktok")&&!p.as_story?'<b class="tt" title="TikTok">TT</b>':""}</span>`;}
function smmRow(p,acts){
  const row=el("div","row");row.style.cursor="pointer";row.dataset.sp=p.id;
  row.innerHTML=`<div class="main"><div class="t">${p.kind==="video"?"🎬":"📷"} ${esc(p.client)} <span style="color:var(--muted);font-weight:500">· ${esc(smmKind(p.kind).replace(/^\S+ /,""))}</span> ${smmPlatBadges(p)}</div><div class="m">${esc(smmDateAz(p.post_date))} · saat ${esc(p.post_time||"")}${smmSeeAll()&&p.account_id?" · 👤 "+esc(personName(p.account_id)):""}${p.note?" · "+esc(p.note):""}${p.status==="missed"&&p.reason?" · Səbəb: "+esc(p.reason):""}</div></div>
    <div class="r" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${acts&&smmCanAct(p)&&!smmAutoBusy(p)?`<button class="mini" data-sok="${p.id}">${ICON.check} Paylaşıldı</button><button class="mini" data-sno="${p.id}" style="color:var(--crit)">✗ Paylaşılmadı</button>`:smmChip(p)}</div>`;
  return row;
}
function openSmmPost(p){
  if(!p)return;const v=state.smm_venues.find(x=>x.id===p.venue_id);const can=smmCanAct(p);
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:440px"><div class="mh"><h3>${p.kind==="video"?"🎬":"📷"} ${esc(p.client)}</h3><button data-x>×</button></div><div class="mb">
    <div class="hint" style="white-space:normal;margin-bottom:12px">${esc(smmDateAz(p.post_date))} · saat ${esc(p.post_time||"")} · ${esc(smmKind(p.kind))}${p.account_id?"<br>Account: "+esc(personName(p.account_id)):""}</div>
    <div style="margin-bottom:12px">${smmChip(p)}</div>
    ${p.note?`<div class="field"><label>Paylaşım</label><div style="white-space:pre-wrap;font-size:13.5px">${esc(p.note)}</div></div>`:""}
    ${p.status==="missed"&&p.reason?`<div class="field"><label>Səbəb</label><div style="font-size:13.5px;color:var(--crit)">${esc(p.reason)}</div></div>`:""}
    ${Array.isArray(p.platforms)&&p.platforms.length?`<div class="hint" style="margin-bottom:10px">Platformalar: ${p.platforms.map(x=>x==="tiktok"?"TikTok":"Instagram").join(", ")}</div>`:""}
    ${p.caption?`<div class="field"><label>Instagram mətni</label><div style="white-space:pre-wrap;font-size:13.5px">${esc(p.caption)}</div></div>`:""}
    ${p.caption_tt?`<div class="field"><label>TikTok mətni</label><div style="white-space:pre-wrap;font-size:13.5px">${esc(p.caption_tt)}</div></div>`:""}
    ${p.publish_mode&&p.publish_mode!=="manual"?`<div class="hint" style="white-space:normal;margin-bottom:12px">${esc((SMM_MODES.find(x=>x[0]===p.publish_mode)||["",""])[1])}${p.as_story?" · Story":""}</div>`:""}
    ${p.publish_status==="failed"&&p.publish_error?`<div class="field"><label>Avtomatik paylaşım xətası</label><div style="font-size:13.5px;color:var(--crit)">${esc(p.publish_error)}</div></div>`:""}
    ${can&&p.status==="plan"&&p.publish_status==="failed"?`<button class="btn ghost sm" data-retry style="margin-bottom:12px">🔁 Yenidən cəhd et</button>`:""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${p.material?`<a class="btn ghost sm" href="${esc(p.material)}" target="_blank" rel="noopener">${ICON.link} Material</a>`:""}${v&&v.ig_link?`<a class="btn ghost sm" href="${esc(smmIgUrl(v.ig_link))}" target="_blank" rel="noopener">📷 ${esc(igHandle(v.ig_link))}</a>`:""}${p.post_url?`<a class="btn ghost sm" href="${esc(p.post_url)}" target="_blank" rel="noopener">${ICON.check} Paylaşım</a>`:""}</div>
    ${can&&p.status==="plan"&&!smmAutoBusy(p)?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-ok>${ICON.check} Paylaşıldı</button><button class="btn ghost" data-no style="color:var(--crit)">✗ Paylaşılmadı</button></div>`:""}
    ${can&&p.status!=="plan"?`<button class="btn ghost sm" data-reset>Sıfırla</button>`:""}
  </div>${can?`<div class="mf"><button class="btn ghost" data-del style="color:var(--crit)">${ICON.trash} Sil</button><button class="btn ghost" data-ed>${ICON.edit} Redaktə</button></div>`:""}</div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const q=s=>scrim.querySelector(s);
  if(q("[data-ok]"))q("[data-ok]").onclick=()=>{close();smmMarkPosted(p);};
  if(q("[data-no]"))q("[data-no]").onclick=()=>{close();smmMarkMissed(p);};
  if(q("[data-reset]"))q("[data-reset]").onclick=async()=>{close();await upd('smm_posts',p.id,{status:"plan",reason:"",post_url:"",done_at:null,...(p.publish_mode==="auto"?{publish_mode:"manual",publish_status:"",publish_error:"",ig_container:"",ig_media_id:""}:{})});};
  if(q("[data-retry]"))q("[data-retry]").onclick=async()=>{if(!confirm("Əvvəlcə Instagram hesabını yoxla: paylaşım artıq gedibsə, təkrar paylaşılacaq. Yenidən cəhd edilsin?"))return;close();await upd('smm_posts',p.id,{publish_status:"",publish_error:"",publish_attempts:0,ig_container:""});};
  if(q("[data-ed]"))q("[data-ed]").onclick=()=>{if(["creating","processing","publishing"].includes(p.publish_status)&&p.status==="plan"){alert("Bu paylaşım hazırda Instagram-a göndərilir, indi dəyişmək olmaz.");return;}close();openSmmForm(p);};
  if(q("[data-del]"))q("[data-del]").onclick=()=>{close();confirmDel('smm_posts',p.id,"«"+p.client+"» "+smmDateAz(p.post_date)+" paylaşımı");};
}
function smmMarkPosted(p){
  if(!p)return;const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:420px"><div class="mh"><h3>${ICON.check} Paylaşıldı — ${esc(p.client)}</h3><button data-x>×</button></div><div class="mb">
    <div class="field"><label>Paylaşımın linki (istəyə bağlı)</label><input id="su" placeholder="https://www.instagram.com/p/..."></div></div>
    <div class="mf"><button class="btn ghost" data-x2>Ləğv</button><button class="btn" data-ok>Təsdiqlə</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.querySelector("[data-x2]").onclick=close;
  scrim.querySelector("[data-ok]").onclick=async()=>{const u=scrim.querySelector("#su").value.trim();close();
    await upd('smm_posts',p.id,{status:"posted",post_url:u,reason:"",done_at:new Date().toISOString()});};
}
function smmMarkMissed(p){
  if(!p)return;const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:440px"><div class="mh"><h3>✗ Paylaşılmadı — ${esc(p.client)}</h3><button data-x>×</button></div><div class="mb">
    <div class="hint" style="white-space:normal;margin-bottom:12px">${esc(smmDateAz(p.post_date))} · saat ${esc(p.post_time||"")} · ${esc(smmKind(p.kind))}. Səbəb CEO və PM-ə göndəriləcək.</div>
    <div class="field"><label>Səbəb</label><div class="pchips" style="max-height:none;margin-bottom:8px">${SMM_REASONS.map(r=>`<button type="button" class="pchip" data-r="${esc(r)}">${esc(r)}</button>`).join("")}</div>
    <textarea id="sr" rows="3" placeholder="Səbəbi yaz…" style="width:100%"></textarea></div></div>
    <div class="mf"><button class="btn ghost" data-x2>Ləğv</button><button class="btn" data-ok style="background:var(--crit)">Göndər</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();const ta=scrim.querySelector("#sr");
  scrim.querySelector("[data-x]").onclick=close;scrim.querySelector("[data-x2]").onclick=close;
  scrim.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{scrim.querySelectorAll("[data-r]").forEach(x=>x.classList.toggle("on",x===b));ta.value=b.dataset.r;});
  scrim.querySelector("[data-ok]").onclick=async()=>{const reason=ta.value.trim();if(!reason){ta.focus();ta.style.borderColor="var(--crit)";return;}
    const ok=scrim.querySelector("[data-ok]");ok.disabled=true;const nowIso=new Date().toISOString();
    await upd('smm_posts',p.id,{status:"missed",reason,done_at:nowIso,miss_notified_at:nowIso});
    const heads=state.profiles.filter(x=>SMM_MGR.includes(x.role)&&(!me||x.id!==me.id)).map(x=>x.id);
    const body=`Məkan: ${p.client}\nNövü: ${smmKind(p.kind).replace(/^\S+ /,"")}\nTarix: ${smmDateAz(p.post_date)} · saat ${p.post_time||""}\nAccount: ${p.account_id?personName(p.account_id):myName()}\nSəbəb: ${reason}`;
    try{if(heads.length)await sb.from('notifications').insert(heads.map(id=>({target_type:"user",target:id,title:`⚠️ Paylaşılmadı — ${p.client} · ${smmKind(p.kind).replace(/^\S+ /,"").toLowerCase()}`,body,from_name:myName(),from_id:me?me.id:null,read_by:[]})));}catch(e){}
    close();};
}
function openSmmForm(edit,day){
  const e=edit||{};const isEdit=!!edit;const mgr=SMM_MGR.includes(role);
  // CEO/PM: bütün klientlər (SMM-ə hələ əlavə olunmayanlar «c:Ad» kimi — yadda saxlayanda məkan yaradılır)
  const venues=smmVenues();const extra=mgr?state.clients.map(c=>c.name).filter(n=>!state.smm_venues.some(v=>v.client===n)).sort((a,b)=>a.localeCompare(b,"az")):[];
  if(!venues.length&&!extra.length){alert("Sənə hələ məkan təyin olunmayıb.");return;}
  // Yeni paylaşımda foto və video birlikdə seçilə bilər — hər biri ayrıca paylaşım kimi yazılır (öz saatı ilə)
  const kinds=new Set([e.kind||"foto"]);let v0=state.smm_venues.find(v=>v.id===e.venue_id)||venues.find(v=>v.client===smmVenue)||venues[0]||null;
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal smc"><div class="mh"><h3>${isEdit?"Paylaşımı düzəlt":"Yeni paylaşım"}</h3><button data-x>×</button></div><div class="mb"><div class="smc-grid"><div class="smc-left">
    <div class="field"><label>Məkan</label><select id="s1">${venues.map(v=>`<option value="${v.id}"${v0&&v.id===v0.id?" selected":""}>${esc(v.client)}${smmSeeAll()?" — "+esc(v.account_id?personName(v.account_id):"Account yoxdur"):""}</option>`).join("")}${extra.length?`<optgroup label="SMM-ə əlavə olunmayan klientlər">${extra.map(n=>`<option value="c:${esc(n)}"${!v0&&n===extra[0]?" selected":""}>${esc(n)}</option>`).join("")}</optgroup>`:""}</select></div>
    <div class="field"><label>Növü${isEdit?"":` <span style="text-transform:none;letter-spacing:0;font-weight:500">— ikisini də seçmək olar</span>`}</label><div class="pchips" style="max-height:none">${SMM_KINDS.map(([k,l])=>`<button type="button" class="pchip${kinds.has(k)?" on":""}" data-k="${k}">${l}</button>`).join("")}</div></div>
    <div class="field"><label>Platformalar</label><div class="pchips" style="max-height:none"><button type="button" class="pchip" data-plat="instagram">Instagram</button><button type="button" class="pchip" data-plat="tiktok">TikTok</button></div></div>
    <div class="field"><label>Tarix və saat</label><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="s2" type="date" style="flex:2;min-width:140px" value="${esc(e.post_date||day||smmToday())}">
      ${SMM_KINDS.map(([k,l])=>`<span data-tk="${k}" style="display:${kinds.has(k)?"flex":"none"};gap:6px;align-items:center;flex:1;min-width:120px"><span style="font-size:13px">${l.split(" ")[0]}</span><input data-t="${k}" type="time" style="flex:1" value="${esc(isEdit&&k===e.kind?e.post_time:smmVenueTime(v0,k))}"></span>`).join("")}</div></div>
    <div class="field"><label>Paylaşım (mövzu / mətn)</label><textarea id="s4" rows="3" placeholder="məs. Yeni menyu — karusel, 5 foto">${esc(e.note||"")}</textarea></div>
    <div class="field"><label>Material linki (istəyə bağlı)</label><input id="s5" value="${esc(e.material||"")}" placeholder="Drive linki"></div>
    <div class="field"><label>Kitabxanadan material</label><div id="s-pick"></div></div>
    <div class="field"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><label style="margin:0">Paylaşım mətni</label><button type="button" class="mini" id="s-ai" style="margin-left:auto">✨ AI ilə yaz</button></div>
      <div class="hint" id="s-aih" style="white-space:normal;margin-bottom:6px">Materialı seç və ya mövzunu yaz: AI materiala baxıb hər platforma üçün ayrıca mətn hazırlayır. Dillər, ünvan və telefon məkanın brend kitabçasından götürülür.</div>
      <div data-pf="instagram"><div class="hint" style="margin-bottom:4px">Instagram</div><textarea id="s7" rows="4" maxlength="2200" placeholder="Instagram paylaşımının mətni">${esc(e.caption||"")}</textarea></div>
      <div data-pf="tiktok" style="margin-top:10px"><div class="hint" style="margin-bottom:4px">TikTok</div><textarea id="s9" rows="3" maxlength="2200" placeholder="TikTok paylaşımının mətni">${esc(e.caption_tt||"")}</textarea></div></div>
    <div class="field"><label>Paylaşma üsulu</label><div class="pchips" style="max-height:none">${SMM_MODES.map(([k,l])=>`<button type="button" class="pchip" data-pm="${k}">${l}</button>`).join("")}</div><div class="hint" id="s-pm" style="white-space:normal;margin-top:6px"></div></div>
    <div class="field" data-pf="instagram"><label>Instagram-da harada</label><div class="pchips" style="max-height:none"><button type="button" class="pchip" data-dest="feed">Lent (Reels / post)</button><button type="button" class="pchip" data-dest="story">Story</button><button type="button" class="pchip" data-dest="both">İkisi də</button></div><div class="hint" id="s-dest" style="white-space:normal;margin-top:6px"></div></div>
    ${isEdit?"":`<label style="display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer"><input type="checkbox" id="s6"> Ay sonuna qədər hər həftə bu gün təkrarla</label>`}
  </div><div class="smc-right">
    <div class="smc-head"><span>Önizləmə</span><div class="seg" id="smc-tabs"></div></div>
    <div id="smc-phone"></div>
    <div class="smc-set" id="smc-igset">
      <div class="smc-set-h">Instagram ayarları</div>
      <div data-igf>
      <label class="smc-row"><span>«AI ilə yaradılıb» işarəsi</span><input type="checkbox" id="ig-ai"></label>
      <label class="smc-row"><span>Həmmüəllif (Collab)</span><input type="text" id="ig-collab" placeholder="@hesab, maks. 3"></label>
      <label class="smc-row" data-igv><span>Lentdə də göstər</span><input type="checkbox" id="ig-feed"></label>
      <label class="smc-row" data-igv><span>Örtük kadrı (saniyə)</span><input type="number" id="ig-cover" min="0" step="0.5" placeholder="0"></label>
      <label class="smc-row" data-igv><span>Audio adı</span><input type="text" id="ig-audio" maxlength="100" placeholder="Orijinal səs"></label>
      <label class="smc-row" data-igp><span>Alt mətn (əlçatanlıq)</span><input type="text" id="ig-alt" maxlength="1000" placeholder="Şəkildə nə var"></label>
      </div>
      <div class="hint" id="ig-sh" style="white-space:normal"></div>
    </div>
    <div class="smc-set" id="smc-tt">
      <div class="smc-set-h">TikTok ayarları</div>
      <label class="smc-row"><span>Kim baxa bilər</span><select id="tt-priv"><option value="PUBLIC_TO_EVERYONE">Hamı</option><option value="MUTUAL_FOLLOW_FRIENDS">Dostlar</option><option value="SELF_ONLY">Yalnız mən</option></select></label>
      <label class="smc-row"><span>Şərhlər</span><input type="checkbox" id="tt-com"></label>
      <label class="smc-row" data-ttv><span>Duet</span><input type="checkbox" id="tt-duet"></label>
      <label class="smc-row" data-ttv><span>Stitch</span><input type="checkbox" id="tt-stitch"></label>
      <label class="smc-row"><span>«AI ilə yaradılıb» işarəsi</span><input type="checkbox" id="tt-ai"></label>
      <div class="hint" style="white-space:normal">Ayarlar TikTok API qoşulanda avtomatik paylaşımda tətbiq olunacaq.</div>
    </div>
  </div></div></div><div class="mf"><button class="btn ghost" data-x2>Ləğv</button><button class="btn" data-ok>${isEdit?"Yadda saxla":"Əlavə et"}</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();const q=s=>scrim.querySelector(s);
  q("[data-x]").onclick=close;q("[data-x2]").onclick=close;
  const touched=new Set(isEdit?[e.kind]:[]);
  scrim.querySelectorAll("[data-t]").forEach(i=>i.oninput=()=>touched.add(i.dataset.t));
  const curV=()=>state.smm_venues.find(v=>v.id===q("#s1").value);
  const syncTime=()=>scrim.querySelectorAll("[data-t]").forEach(i=>{if(!touched.has(i.dataset.t))i.value=smmVenueTime(curV(),i.dataset.t);});
  let mediaId=e.media_id||null,pubMode=e.publish_mode||"manual";
  const plats=new Set(Array.isArray(e.platforms)&&e.platforms.length?e.platforms:["instagram"]);
  let dest=isEdit?(e.as_story?"story":"feed"):(smmTab==="story"?"story":"feed");
  const drawDest=()=>{scrim.querySelectorAll("[data-dest]").forEach(x=>x.classList.toggle("on",x.dataset.dest===dest));
    q("#s-dest").textContent=dest==="both"?(isEdit?"Bu paylaşım lentə gedəcək, eyni material üçün ayrıca Story paylaşımı da yaradılacaq.":"Eyni material həm lentə, həm Story-yə gedəcək (iki ayrı paylaşım kimi yazılır)."):dest==="story"?"Story-də mətn görünmür və 24 saatdan sonra yox olur.":"";};
  scrim.querySelectorAll("[data-dest]").forEach(b=>b.onclick=()=>{dest=b.dataset.dest;drawDest();});
  drawDest();
  const drawPlat=()=>{scrim.querySelectorAll("[data-plat]").forEach(x=>x.classList.toggle("on",plats.has(x.dataset.plat)));
    scrim.querySelectorAll("[data-pf]").forEach(x=>x.style.display=plats.has(x.dataset.pf)?"":"none");if(typeof drawPreview==="function")drawPreview();};
  scrim.querySelectorAll("[data-plat]").forEach(b=>b.onclick=()=>{const k=b.dataset.plat;if(plats.has(k)){if(plats.size>1)plats.delete(k);}else plats.add(k);drawPlat();drawPub();});
  const ttO=Object.assign({privacy:"PUBLIC_TO_EVERYONE",comment:true,duet:true,stitch:true,ai:false},(e.tt_opts&&typeof e.tt_opts==="object")?e.tt_opts:{});
  q("#tt-priv").value=ttO.privacy;q("#tt-com").checked=!!ttO.comment;q("#tt-duet").checked=!!ttO.duet;q("#tt-stitch").checked=!!ttO.stitch;q("#tt-ai").checked=!!ttO.ai;
  let pvTab=plats.has("instagram")?"instagram":"tiktok",capOpen=false;
  const igO=Object.assign({ai:false,collab:[],share_to_feed:true,cover_s:"",audio:"",alt:""},(e.ig_opts&&typeof e.ig_opts==="object")?e.ig_opts:{});
  q("#ig-ai").checked=!!igO.ai;q("#ig-collab").value=(igO.collab||[]).map(x=>"@"+x).join(", ");q("#ig-feed").checked=igO.share_to_feed!==false;q("#ig-cover").value=igO.cover_s||"";q("#ig-audio").value=igO.audio||"";q("#ig-alt").value=igO.alt||"";
  const igCollab=()=>q("#ig-collab").value.split(/[\s,]+/).map(x=>x.replace(/^@/,"").trim()).filter(Boolean);
  const SV={heart:'<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>',
    com:'<svg viewBox="0 0 24 24"><path d="M20.7 16.4A9 9 0 1 0 17 20l4 1-0.3-4.6z"/></svg>',
    send:'<svg viewBox="0 0 24 24"><path d="M22 3 9.2 10.1M22 3l-7 18-3.8-8.4L3 9.9z"/></svg>',
    save:'<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1z"/></svg>',
    rep:'<svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/></svg>'};
  const mediaThumb=()=>{const m=curM();const id=m?m.drive_id:driveId(q("#s5").value||"");return id?"https://drive.google.com/thumbnail?id="+encodeURIComponent(id)+"&sz=w800":"";};
  const handleOf=(v,p)=>{const raw=v?(p==="tiktok"?(v.tt_link||""):(v.ig_link||"")):"";const h=String(raw).trim().replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\/@?/i,"").replace(/\/.*$/,"").replace(/^@/,"");return h||(v?v.client.toLocaleLowerCase("az").replace(/\s+/g,""):"mekan");};
  const drawPreview=()=>{if(!plats.has(pvTab))pvTab=plats.has("instagram")?"instagram":"tiktok";
    const isV0=kinds.has("video")&&!kinds.has("foto");
    const tabs=[];if(plats.has("instagram")){if(dest!=="story")tabs.push(["instagram",isV0?"Reels":"Lent"]);if(dest!=="feed")tabs.push(["story","Story"]);}if(plats.has("tiktok"))tabs.push(["tiktok","TikTok"]);
    if(!tabs.some(t=>t[0]===pvTab))pvTab=tabs[0][0];
    q("#smc-tabs").innerHTML=tabs.map(([p,l])=>`<button type="button" data-pv="${p}" class="${p===pvTab?"on":""}">${l}</button>`).join("");
    q("#smc-tabs").querySelectorAll("[data-pv]").forEach(b=>b.onclick=()=>{pvTab=b.dataset.pv;drawPreview();});
    const v=curV(),img=mediaThumb(),isVid=kinds.has("video")&&!kinds.has("foto"),h=esc(handleOf(v,pvTab));
    const media=img?`<img src="${esc(img)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'smc-noimg',textContent:'Önizləmə açılmadı'}))">`:`<div class="smc-noimg">Material seçilməyib</div>`;
    if(pvTab==="tiktok"){const cap=q("#s9").value.trim();
      q("#smc-phone").innerHTML=`<div class="smc-tt">${media}<div class="smc-tt-side"><i>♥</i><i>💬</i><i>↗</i></div><div class="smc-tt-cap"><b>@${h}</b>${cap?`<p>${esc(cap)}</p>`:`<p class="smc-empty">TikTok mətni burada görünəcək</p>`}</div></div>`;}
    else{const cap=q("#s7").value.trim(),av=`<span class="smc-av">${h.slice(0,1).toUpperCase()}</span>`,col=igCollab(),ai=q("#ig-ai").checked;
      const who=h+(col.length?` və ${col.length===1?esc(col[0]):col.length+" nəfər"}`:"");
      const capH=cap?`<span class="${capOpen?"":"smc-clamp"}" data-cap><b>${h}</b> ${esc(cap)}</span>${capOpen||(cap.length<90&&!cap.includes("\n"))?"":`<button type="button" class="smc-more" data-more>daha çox</button>`}`:`<span class="smc-empty">Instagram mətni burada görünəcək</span>`;
      if(pvTab==="story"){
        q("#smc-phone").innerHTML=`<div class="smc-igs">${media}<div class="smc-igs-bar"><i></i></div><div class="smc-igs-top"><span class="smc-ring">${av}</span>${h} <small>İndi</small></div><div class="smc-igs-bot"><span>Mesaj göndər</span>${SV.heart}${SV.send}</div></div>`;}
      else if(isVid){
        const aud=esc(q("#ig-audio").value.trim()||"Orijinal səs");
        q("#smc-phone").innerHTML=`<div class="smc-igr">${media}<div class="smc-igr-top"><span>Reels</span></div><div class="smc-igr-side"><span>${SV.heart}Bəyən</span><span>${SV.com}Şərh</span><span>${SV.rep}</span><span>${SV.send}</span></div><div class="smc-igr-bot"><div class="smc-igr-who"><span class="smc-ring">${av}</span>${who}<span class="smc-follow">İzlə</span></div>${ai?`<div class="smc-ailab">Süni intellekt məlumatı</div>`:""}<p>${cap?`<span class="${capOpen?"":"smc-clamp"}">${esc(cap)}</span>${capOpen||cap.length<70?"":`<button type="button" class="smc-more" data-more>daha çox</button>`}`:`<span class="smc-empty" style="color:#cfcfe0">Instagram mətni burada görünəcək</span>`}</p><div class="smc-igr-aud">♫ ${h} · ${aud}</div></div></div>`;}
      else q("#smc-phone").innerHTML=`<div class="smc-ig"><div class="smc-ig-top"><span class="smc-ring">${av}</span><span class="smc-ig-who"><b>${who}</b>${ai?`<small>Süni intellekt məlumatı</small>`:""}</span><span class="smc-dots">···</span></div><div class="smc-ig-media">${media}</div><div class="smc-ig-act">${SV.heart}${SV.com}${SV.send}<span class="sv">${SV.save}</span></div><div class="smc-ig-likes">Bəyənmələr</div><div class="smc-ig-cap">${capH}</div><div class="smc-ig-time">İndi</div></div>`;
      const mb=q("#smc-phone [data-more]");if(mb)mb.onclick=()=>{capOpen=true;drawPreview();};}
    const igOn=plats.has("instagram");q("#smc-igset").style.display=igOn?"":"none";
    q("[data-igf]").style.display=dest==="story"?"none":"";
    scrim.querySelectorAll("[data-igv]").forEach(x=>x.style.display=isVid?"":"none");scrim.querySelectorAll("[data-igp]").forEach(x=>x.style.display=isVid?"none":"");
    q("#ig-sh").textContent=dest==="story"?"Story üçün əlavə ayar yoxdur. Mətn Story-də görünmür.":(dest==="both"?"Ayarlar lent paylaşımına aiddir, Story-yə tətbiq olunmur. ":"")+(pubMode==="auto"?"Avtomatik paylaşımda Instagram-a özü ötürülür.":"Əl ilə paylaşanda bu ayarları Instagram tətbiqində qoy.");
    q("#smc-tt").style.display=plats.has("tiktok")?"":"none";
    scrim.querySelectorAll("[data-ttv]").forEach(x=>x.style.display=kinds.has("video")?"":"none");};
  ["#s7","#s9","#s5","#ig-collab","#ig-audio"].forEach(id=>q(id).addEventListener("input",drawPreview));
  q("#ig-ai").addEventListener("change",drawPreview);
  scrim.querySelectorAll("[data-dest]").forEach(b=>b.addEventListener("click",()=>drawPreview()));
  q("#s-ai").onclick=async()=>{const b=q("#s-ai"),h=q("#s-aih");const v=curV();const sv=q("#s1").value;const client=v?v.client:(sv.startsWith("c:")?sv.slice(2):"");
    if(!client){h.textContent="Əvvəl məkanı seç.";return;}
    if(!q("#s4").value.trim()&&!curM()&&!driveId(q("#s5").value||"")&&!confirm("Nə mövzu, nə material var. Mətn ümumi olacaq. Davam edilsin?"))return;
    b.disabled=true;b.textContent="Yazılır…";h.textContent="AI mətn hazırlayır, bir neçə saniyə çəkə bilər.";
    try{const {data:{session}}=await sb.auth.getSession();
      const r=await fetch(SB_URL+"/functions/v1/smm-caption",{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+(session?session.access_token:"")},body:JSON.stringify({client,kinds:[...kinds],note:q("#s4").value.trim(),platforms:[...plats],drive_id:(curM()&&curM().drive_id)||driveId(q("#s5").value||"")||""})});
      const j=await r.json().catch(()=>({ok:false,error:"cavab oxunmadı ("+r.status+")"}));
      if(!j.ok){h.textContent="Alınmadı: "+(j.error||"naməlum xəta");}
      else{if(j.instagram&&plats.has("instagram"))q("#s7").value=j.instagram;if(j.tiktok&&plats.has("tiktok"))q("#s9").value=j.tiktok;h.textContent=(j.seen?"AI materialda gördü: "+j.seen+". ":j.image===false?"Material oxunmadı, mətn yalnız mövzuya görə yazıldı. ":"")+(j.footer===false?"Brend kitabçasında ünvan və telefon yoxdur. ":"")+"Yoxla və lazım olsa düzəlt."+(j.cost_usd!=null?" Xərc: $"+j.cost_usd:"");drawPreview();}}
    catch(err){h.textContent="Alınmadı: "+(err.message||err);}
    b.disabled=false;b.textContent="✨ AI ilə yaz";};
  const curM=()=>state.smm_media.find(m=>m.id===mediaId)||null;
  let pickF="";
  const drawPub=()=>{const v=curV();const sel=curM();
    const lib=v?smmLibrary(v):[];const kindOf=it=>it.kind==="dizayn"?"dizayn":it.folder_id||!smmIsVideo(it)?"foto":"video";
    const items=lib.filter(it=>!pickF||kindOf(it)===pickF);
    const chips=lib.length?`<div class="pchips" style="max-height:none;margin-bottom:8px">${[["","Hamısı"],["video","🎬 Video"],["foto","📷 Foto"],["dizayn","🎨 Dizayn"]].map(([k,l])=>{const n=k?lib.filter(it=>kindOf(it)===k).length:lib.length;return n||!k?`<button type="button" class="pchip${pickF===k?" on":""}" data-pf2="${k}">${l} <span style="opacity:.6">${n}</span></button>`:"";}).join("")}</div>`:"";
    if(sel&&v&&sel.venue_id!==v.id){mediaId=null;}
    q("#s-pick").innerHTML=chips+(items.length?`<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">${items.map(it=>`<button type="button" data-pk="${esc(it.key)}" title="${esc(it.name)}${it.ready?"":" · təsdiqsiz"}" style="flex:0 0 84px;height:84px;padding:0;border-radius:10px;overflow:hidden;position:relative;background:var(--surface-2);border:3px solid ${sel&&it.drive_id===sel.drive_id?"var(--accent)":"var(--border)"};font-size:26px;opacity:${it.ready?1:.6}">${it.folder_id?"📂":smmIsVideo(it)?"🎬":"🖼"}${it.folder_id?"":`<img loading="lazy" src="${smmThumb(it.drive_id,200)}" alt="" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`}</button>`).join("")}</div>${sel&&!items.some(it=>it.drive_id===sel.drive_id)?`<div class="hint" style="white-space:normal;margin-top:4px">Seçilib: ${esc(sel.name)}</div>`:""}`:`<div class="hint" style="white-space:normal">${lib.length?"Bu bölmədə material yoxdur.":"Bu məkan üçün material yoxdur. Çəkiliş videoları, foto qovluqları və hazır dizaynlar burada özü görünür."}</div>`);
    q("#s-pick").querySelectorAll("[data-pf2]").forEach(b=>b.onclick=()=>{pickF=b.dataset.pf2;drawPub();});
    const choose=async it=>{const row=await smmRegister(it,curV());if(!row)return;mediaId=mediaId===row.id?null:row.id;const m=curM();if(m)q("#s5").value=smmMediaLink(m);
      /* Növ seçilən materiala uyğunlaşır: video seçiləndə «Video», şəkil seçiləndə «Foto» */
      if(m){const want=smmIsVideo(m)?"video":"foto";if(!kinds.has(want)||kinds.size>1){kinds.clear();kinds.add(want);scrim.querySelectorAll("[data-k]").forEach(x=>x.classList.toggle("on",kinds.has(x.dataset.k)));scrim.querySelectorAll("[data-tk]").forEach(x=>x.style.display=kinds.has(x.dataset.tk)?"flex":"none");syncTime();}}
      drawPub();};
    q("#s-pick").querySelectorAll("[data-pk]").forEach(b=>b.onclick=()=>{const it=items.find(x=>x.key===b.dataset.pk);if(it.folder_id)smmFolderPick(it,choose);else choose(it);});
    scrim.querySelectorAll("[data-pm]").forEach(x=>x.classList.toggle("on",x.dataset.pm===pubMode));
    if(typeof drawPreview==="function")drawPreview();
    q("#s-pm").textContent=(pubMode==="auto"?(smmAutoProblem(curM(),v)||"Vaxtı gələndə Instagram-a özü gedəcək."):pubMode==="remind"?"Vaxtı gələndə fayl linki və mətn Account-a bildiriş kimi gedəcək.":"")+(plats.has("tiktok")?(pubMode==="manual"?"":" ")+"TikTok hissəsi API qoşulana qədər əl ilə paylaşılır.":"");};
  scrim.querySelectorAll("[data-pm]").forEach(b=>b.onclick=()=>{pubMode=b.dataset.pm;drawPub();});
  q("#s1").onchange=()=>{syncTime();drawPub();};
  scrim.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const k=b.dataset.k;
    if(isEdit){kinds.clear();kinds.add(k);}else if(kinds.has(k)){if(kinds.size>1)kinds.delete(k);}else kinds.add(k);
    scrim.querySelectorAll("[data-k]").forEach(x=>x.classList.toggle("on",kinds.has(x.dataset.k)));
    scrim.querySelectorAll("[data-tk]").forEach(x=>x.style.display=kinds.has(x.dataset.tk)?"flex":"none");syncTime();drawPub();});
  drawPlat();drawPub();
  q("[data-ok]").onclick=async()=>{let v=curV();const date=q("#s2").value;if(!date)return;
    const sv=q("#s1").value;
    if(!v&&sv.startsWith("c:")){const {data,error}=await sb.from('smm_venues').insert({client:sv.slice(2)}).select().single();if(error){alert("Xəta: "+error.message);return;}v=data;await reload('smm_venues');}
    if(!v)return;
    const asStory=dest==="story";const stories=plats.has("instagram")?(dest==="both"?[false,true]:[dest==="story"]):[false];
    if(plats.has("instagram")&&dest!=="story"){const col=igCollab();if(col.length>3){alert("Instagram ən çox 3 həmmüəllif qəbul edir.");return;}if(col.some(x=>!/^[A-Za-z0-9._]{1,30}$/.test(x))){alert("Həmmüəllif adı düzgün deyil: yalnız Instagram istifadəçi adı yaz (məs. @mezmoon).");return;}}
    if(pubMode==="auto"&&!plats.has("instagram")){alert("Avtomatik paylaşım hələlik yalnız Instagram üçündür. Instagram-ı seç və ya «Əl ilə» / «Xatırlatma» istifadə et.");return;}
    if(pubMode==="auto"){const bad=smmAutoProblem(curM(),v,asStory)||(dest==="both"?smmAutoProblem(curM(),v,true):"");if(bad){alert(bad);return;}
      if(kinds.size>1){alert("Avtomatik paylaşım üçün yalnız bir növ seç.");return;}
      if(q("#s6")&&q("#s6").checked){alert("Avtomatik paylaşım təkrarlana bilməz: eyni fayl hər həftə gedərdi.");return;}
      const k0=[...kinds][0];if(k0!==(smmIsVideo(curM())?"video":"foto")){alert("Seçilən material paylaşım növünə uyğun deyil.");return;}
      const tm=scrim.querySelector(`[data-t="${k0}"]`).value||smmVenueTime(v,k0);if(smmDue({post_date:date,post_time:tm,kind:k0})<=Date.now()){alert("Avtomatik paylaşımın vaxtı gələcəkdə olmalıdır.");return;}}
    const common={venue_id:v.id,client:v.client,account_id:v.account_id||(me?me.id:null),note:q("#s4").value.trim(),material:q("#s5").value.trim(),media_id:mediaId,caption:plats.has("instagram")?q("#s7").value.trim():"",caption_tt:plats.has("tiktok")?q("#s9").value.trim():"",platforms:[...plats],tt_opts:plats.has("tiktok")?{privacy:q("#tt-priv").value,comment:q("#tt-com").checked,duet:q("#tt-duet").checked,stitch:q("#tt-stitch").checked,ai:q("#tt-ai").checked}:{},ig_opts:plats.has("instagram")?{ai:q("#ig-ai").checked,collab:igCollab(),share_to_feed:q("#ig-feed").checked,cover_s:q("#ig-cover").value?Math.max(0,+q("#ig-cover").value):"",audio:q("#ig-audio").value.trim(),alt:q("#ig-alt").value.trim()}:{},publish_mode:pubMode,as_story:asStory,...(isEdit&&e.status==="plan"?{publish_status:"",publish_error:"",publish_attempts:0,ig_container:""}:{})};
    const one=k=>({...common,kind:k,post_time:(scrim.querySelector(`[data-t="${k}"]`).value)||smmVenueTime(v,k)});
    q("[data-ok]").disabled=true;
    if(isEdit){const k=[...kinds][0];const base={...one(k),as_story:stories[0]};const moved=date!==e.post_date||base.post_time!==e.post_time;await upd('smm_posts',e.id,{...base,post_date:date,...(moved?{due_notified_at:null,miss_notified_at:null}:{})});
      if(stories.length>1){const {error}=await sb.from('smm_posts').insert({...one(k),post_date:date,as_story:true,caption_tt:"",platforms:["instagram"]});if(error)alert("Story paylaşımı yaradılmadı: "+error.message);await reload('smm_posts');}}
    else{const dates=[date];
      if(q("#s6")&&q("#s6").checked){const d=new Date(date+"T00:00:00Z");const m=d.getUTCMonth();for(let x=new Date(d.getTime()+7*864e5);x.getUTCMonth()===m;x=new Date(x.getTime()+7*864e5))dates.push(x.toISOString().slice(0,10));}
      const rows=[];dates.forEach(dt=>SMM_KINDS.forEach(([k])=>{if(kinds.has(k))stories.forEach((st,si)=>rows.push({...one(k),post_date:dt,as_story:st,...(si>0?{caption_tt:"",platforms:["instagram"]}:{})}));}));
      const {error}=await sb.from('smm_posts').insert(rows);if(error)alert("Xəta: "+error.message);await reload('smm_posts');}
    close();};
}
function openSmmVenues(){
  const scrim=el("div","scrim");const accs=state.profiles.filter(p=>p.role==="account").sort((a,b)=>String(a.full_name||a.username).localeCompare(String(b.full_name||b.username),"az"));
  let q="";
  const rows=()=>{const names=[...new Set([...state.clients.map(c=>c.name),...state.smm_venues.map(v=>v.client)])];
    const stOf=n=>(state.clients.find(c=>c.name===n)||{}).status||"";
    return names.map(n=>({n,v:state.smm_venues.find(x=>x.client===n),st:stOf(n)}))
      .filter(r=>!q||r.n.toLocaleLowerCase("az").includes(q))
      .sort((a,b)=>(!!b.v-!!a.v)||((a.st==="Aktiv"?0:1)-(b.st==="Aktiv"?0:1))||a.n.localeCompare(b.n,"az"));};
  const inp="font-size:12.5px;padding:7px 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink);min-width:0";
  const draw=()=>{
    const sum=accs.map(a=>{const c=state.smm_venues.filter(v=>v.account_id===a.id).length;return `<span class="chip c-${c?"accent":"mut"}" style="font-size:11px">${esc(a.full_name||a.username)}: ${c}</span>`;}).join(" ");
    const free=state.smm_venues.filter(v=>!v.account_id).length;
    scrim.querySelector("[data-body]").innerHTML=`
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${sum}${free?` <span class="chip c-warn" style="font-size:11px">Account yoxdur: ${free}</span>`:""}</div>
      <div style="display:grid;grid-template-columns:minmax(120px,1.3fr) minmax(130px,1.2fr) minmax(110px,1.1fr) minmax(110px,1.1fr) 100px 100px 132px 30px;gap:6px;align-items:center;font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;font-weight:600;padding:0 2px 6px">
        <span>Məkan</span><span>Account Manager</span><span>Instagram</span><span>TikTok</span><span>📷 Foto</span><span>🎬 Video</span><span title="Məkanın son 30 paylaşımının bəyənmələrinə görə">🤖 Ən yaxşı saat</span><span></span></div>
      ${rows().map(({n,v,st})=>`<div data-row="${esc(n)}" style="display:grid;grid-template-columns:minmax(120px,1.3fr) minmax(130px,1.2fr) minmax(110px,1.1fr) minmax(110px,1.1fr) 100px 100px 132px 30px;gap:6px;align-items:center;padding:5px 2px;border-top:1px solid var(--border)">
        <div style="font-weight:600;font-size:13px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(n)}">${esc(n)}${st&&st!=="Aktiv"?` <span style="color:var(--muted);font-weight:500;font-size:11px">· ${esc(st)}</span>`:""}</div>
        <select data-k="account_id" style="${inp}"><option value="">${v?"— Account yoxdur —":"— SMM-də deyil —"}</option>${accs.map(a=>`<option value="${a.id}"${v&&v.account_id===a.id?" selected":""}>${esc(a.full_name||a.username)}</option>`).join("")}${v&&v.account_id&&!accs.some(a=>a.id===v.account_id)?`<option value="${v.account_id}" selected>${esc(personName(v.account_id))}</option>`:""}</select>
        <input data-k="ig_link" value="${esc(v?v.ig_link:"")}" placeholder="@hesab" style="${inp}">
        <input data-k="tt_link" value="${esc(v?(v.tt_link||""):"")}" placeholder="@tiktok" style="${inp}">
        <input data-k="photo_time" type="time" value="${esc(v?v.photo_time:"12:00")}" style="${inp}">
        <input data-k="video_time" type="time" value="${esc(v?v.video_time:"20:00")}" style="${inp}">
        <div style="font-size:11.5px;min-width:0">${!v?"":v.best&&(v.best.foto||v.best.video)?`<span title="Son ${v.best.n||""} paylaşım · ${esc(fmtWhen(v.best.at))}">📷 ${esc(v.best.foto||"—")} · 🎬 ${esc(v.best.video||"—")}</span>${(v.best.foto&&v.best.foto!==v.photo_time)||(v.best.video&&v.best.video!==v.video_time)?` <button class="mini" data-best="${v.id}" style="padding:2px 6px;font-size:10.5px">Tətbiq et</button>`:` <span style="color:var(--good)">✓</span>`}`:v.auto_err?`<span class="hint" title="${esc(v.auto_err)}">⚠️ Instagram icazəsi yoxdur</span>`:`<span class="hint">hesablanır…</span>`}</div>
        ${v?`<button class="mini" data-vd="${v.id}" title="SMM-dən çıxar" style="color:var(--crit);padding:5px">${ICON.trash}</button>`:"<span></span>"}
      </div>`).join("")}`;
    scrim.querySelectorAll("[data-row]").forEach(r=>r.querySelectorAll("[data-k]").forEach(f=>f.onchange=async()=>{if(await smmSaveVenue(r.dataset.row,f.dataset.k,f.value.trim(),f))draw();}));
    scrim.querySelectorAll("[data-best]").forEach(b=>b.onclick=async()=>{const v=state.smm_venues.find(x=>x.id===b.dataset.best);if(!v||!v.best)return;
      const patch={};if(v.best.foto)patch.photo_time=v.best.foto;if(v.best.video)patch.video_time=v.best.video;b.disabled=true;
      const {error}=await sb.from('smm_venues').update(patch).eq('id',v.id);if(error){alert("Xəta: "+error.message);b.disabled=false;return;}await reload('smm_venues');draw();});
    scrim.querySelectorAll("[data-vd]").forEach(b=>b.onclick=async()=>{const v=state.smm_venues.find(x=>x.id===b.dataset.vd);
      if(!confirm("«"+v.client+"» SMM siyahısından çıxarılsın? Bu məkanın bütün planlanmış paylaşımları da silinəcək."))return;await del('smm_venues',v.id);await reload('smm_posts');draw();});
  };
  scrim.innerHTML=`<div class="modal" style="max-width:1000px;width:96vw"><div class="mh"><h3>SMM — məkanların bölüşdürülməsi</h3><button data-x>×</button></div>
    <div style="padding:12px 18px 0"><div class="hint" style="white-space:normal;margin:0 0 10px">Klientin qarşısında Account Manager seç — məkan ona keçir və ona bildiriş gedir. Instagram və paylaşım saatları dəyişən kimi yadda qalır (standart: foto 12:00, video 20:00).</div>
    <input class="search" data-q placeholder="Məkan axtar…" style="width:100%;max-width:none;margin:0 0 10px;box-sizing:border-box"></div>
    <div class="mb" data-body style="max-height:60vh;overflow:auto"></div>
    <div class="mf"><button class="btn" data-x2>Hazırdır</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.querySelector("[data-x2]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  scrim.querySelector("[data-q]").oninput=e=>{q=e.target.value.trim().toLocaleLowerCase("az");draw();};
  draw();
}
/* Bölüşdürmə cədvəlində bir sahə dəyişəndə: məkan yoxdursa yaradılır; Account dəyişəndə gələcək planlar da ona keçir */
async function smmSaveVenue(client,key,val,field){
  const v=state.smm_venues.find(x=>x.client===client);
  const patch={[key]:key==="account_id"?(val||null):val};
  if(key==="photo_time"&&!val)patch.photo_time="12:00";if(key==="video_time"&&!val)patch.video_time="20:00";
  field.disabled=true;let error;
  if(v){({error}=await sb.from('smm_venues').update(patch).eq('id',v.id));
    if(!error&&key==="account_id"&&patch.account_id!==v.account_id){await sb.from('smm_posts').update({account_id:patch.account_id}).eq('venue_id',v.id).gte('post_date',smmToday());await reload('smm_posts');}}
  else({error}=await sb.from('smm_venues').insert({client,...patch}));
  field.disabled=false;
  if(error){alert("Xəta: "+error.message);return false;}
  field.style.borderColor="var(--good)";setTimeout(()=>{field.style.borderColor="";},900);
  await reload('smm_venues');
  if(key==="account_id"&&patch.account_id&&(!v||patch.account_id!==v.account_id))smmNotifyAssign(state.smm_venues.find(x=>x.client===client)||{client,account_id:patch.account_id,ig_link:"",photo_time:"12:00",video_time:"20:00"});
  return !v;   // yeni məkan yarandı — cədvəl yenidən çəkilsin (sil düyməsi görünsün)
}
async function smmNotifyAssign(v){
  if(!v.account_id||(me&&v.account_id===me.id))return;
  try{await sb.from('notifications').insert({target_type:"user",target:v.account_id,title:"📅 SMM — yeni məkan: "+v.client,
    body:`${myName()} sənə «${v.client}» məkanını təyin etdi.\nInstagram: ${v.ig_link?igUrl(v.ig_link):"—"}\nFoto: ${v.photo_time} · Video: ${v.video_time}\n\nSMM Plan bölməsində paylaşımları planla.`,from_name:myName(),from_id:me?me.id:null,read_by:[]});}catch(e){}
}
/* ---------- Aylıq Hesabat ---------- */
/* ---------- İclas cədvəli (CEO · PM) ---------- */
const SAT=[["cox_narazi","Çox narazı",1,"crit"],["narazi","Narazı",2,"warn"],["stabil","Stabil",3,"mut"],["razi","Razı",4,"good"]];
const SAT_CATS=[["video_sat","Video"],["content_sat","Kontent"],["design_sat","Dizayn"],["target_sat","Targeting"]];
/* Ümumi razılıq = 4 bölmənin orta balı (1 Çox narazı … 4 Razı) */
function reportScore(r){const v=SAT_CATS.map(c=>SAT.find(x=>x[0]===r[c[0]])).filter(Boolean);if(!v.length)return null;const avg=v.reduce((a,x)=>a+x[2],0)/v.length;const lvl=SAT[Math.min(3,Math.max(0,Math.round(avg)-1))];return {avg,label:lvl[1],c:lvl[3]};}
function meetMonth(m){return m.month||monthOfDate(m.meet_date);}
/* Yeni məkan görüşü (hələ müştəri olmayan məkan) — hesabat tələb olunmur */
function meetIsNew(m){return !!m&&m.kind==="new";}
/* Ofis iclası: işçilər arası, məkana bağlı deyil, hesabat tələb olunmur */
function meetIsOffice(m){return !!m&&m.kind==="office";}
function mapUrl(loc){loc=String(loc||"").trim();return /^https?:\/\//i.test(loc)?loc:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(loc);}
function igUrl(ig){ig=String(ig||"").trim();if(!ig)return "";if(/^https?:\/\//i.test(ig))return ig;return "https://www.instagram.com/"+ig.replace(/^@/,"").replace(/\/+$/,"")+"/";}
function igHandle(ig){const x=String(ig||"").trim().match(/instagram\.com\/([^/?#]+)/i);return "@"+(x?x[1]:String(ig||"").trim().replace(/^@/,""));}
function meetSub(m){return meetIsOffice(m)?"🏢 İşçilər arası iclas":meetIsNew(m)?"🆕 Yeni məkan görüşü"+(m.location?" · 📍 "+m.location:"")+(m.instagram?" · "+igHandle(m.instagram):""):meetMonth(m)+" hesabatı";}
function meetReport(m){return state.reports.find(r=>r.client===m.client&&r.month===meetMonth(m));}
function meetDeadline(m){if(meetIsOffice(m)||meetIsNew(m)||m.held!=="yes"||!m.held_at||meetReport(m))return null;const h=(Date.now()-Date.parse(m.held_at))/36e5;if(h<72){const l=Math.ceil((72-h)/24);return {c:l<=1?"warn":"good",txt:"Hesabat: "+l+" gün qalıb"};}return {c:"crit",txt:"Hesabat "+(Math.floor((h-72)/24)+1)+" gün gecikir"};}
function meetChip(m){if(m.held==="no")return `<span class="chip c-crit" style="font-size:10.5px">Baş tutmadı</span>`;if(m.held!=="yes")return `<span class="chip c-mut" style="font-size:10.5px">Planlanıb</span>`;if(meetIsNew(m)||meetIsOffice(m))return `<span class="chip c-good" style="font-size:10.5px">${ICON.check} ${meetIsOffice(m)?"İclas":"Görüş"} baş tutdu</span>`;if(meetReport(m))return `<span class="chip c-good" style="font-size:10.5px">${ICON.check} Hesabat verilib</span>`;const d=meetDeadline(m);return `<span class="chip c-${d.c}" style="font-size:10.5px">${esc(d.txt)}</span>`;}
function renderMeetings(){
  const wrap=el("div");
  const bar=el("div","calbar");bar.innerHTML=`<button class="nav2" data-mv="-1">‹</button><h3>${MONTHS_AZ[calM]} ${calY}</h3><button class="nav2" data-mv="1">›</button>`;
  bar.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{calM+=+b.dataset.mv;if(calM<0){calM=11;calY--;}if(calM>11){calM=0;calY++;}render();});
  wrap.appendChild(bar);
  const inMonth=state.meetings.filter(m=>meetFull()||(meetIsOffice(m)&&me&&meetPeople(m).includes(me.id))).filter(m=>{const d=shootDate(m.meet_date);return d&&d.mo===calM;});
  const evHtml=m=>{const col=meetIsOffice(m)?"accent":m.held==="no"?"crit":m.held==="yes"?(meetReport(m)?"good":"warn"):"mut";return `<div class="ev ev-${col}" data-mt="${m.id}" style="cursor:pointer"><div class="evt">${m.meet_time?`<span class="op">${esc(m.meet_time)}</span> `:""}${meetIsOffice(m)?"🏢 ":meetIsNew(m)?"🆕 ":""}${esc(m.client)}</div></div>`;};
  if(window.innerWidth>=640){
    const cal=el("div","cal");const dow=el("div","dow");["B.e","Ç.a","Ç","C.a","C","Ş","B"].forEach(d=>dow.appendChild(el("div",null,d)));cal.appendChild(dow);
    const grid=el("div","grid7");const startDow=(new Date(calY,calM,1).getDay()+6)%7,daysIn=new Date(calY,calM+1,0).getDate(),today=new Date();
    for(let i=0;i<startDow;i++)grid.appendChild(el("div","cell out"));
    for(let d=1;d<=daysIn;d++){const c=el("div","cell");if(today.getFullYear()===calY&&today.getMonth()===calM&&today.getDate()===d)c.classList.add("today");
      c.innerHTML=`<div class="dn">${d}</div>`+inMonth.filter(m=>shootDate(m.meet_date).d===d).sort((a,b)=>String(a.meet_time).localeCompare(String(b.meet_time))).map(evHtml).join("");grid.appendChild(c);}
    for(let i=0;i<(7-(startDow+daysIn)%7)%7;i++)grid.appendChild(el("div","cell out"));
    cal.appendChild(grid);wrap.appendChild(cal);
  }
  const p=el("div","panel");p.style.marginTop="16px";p.appendChild(el("div","ph",`<h3>${MONTHS_AZ[calM]} iclasları</h3><span class="count">${inMonth.length}</span>`));
  const pb=el("div","pb");
  inMonth.sort((a,b)=>shootDate(a.meet_date).d-shootDate(b.meet_date).d).forEach(m=>{const row=el("div","row");row.style.cursor="pointer";row.dataset.mt=m.id;
    if(meetIsOffice(m)){row.style.borderLeft="3px solid var(--accent)";row.style.background="var(--accent-soft)";}
    row.innerHTML=`<div class="main"><div class="t">${meetIsOffice(m)?"🏢 ":""}${esc(m.client)}</div><div class="m">${esc(m.meet_date||"")}${m.meet_time?" · "+esc(m.meet_time):""} · ${esc(meetSub(m))}${meetPeople(m).length?" · 👥 "+esc(meetPeople(m).map(personName).join(", ")):""}${m.note?" · "+esc(m.note):""}</div></div><div class="r">${meetChip(m)}</div>`;pb.appendChild(row);});
  if(!inMonth.length)pb.appendChild(el("div","empty",MONTHS_AZ[calM]+(meetFull()?" üçün iclas yoxdur — «+ Yeni iclas» ilə əlavə et.":" üçün dəvət olunduğunuz ofis iclası yoxdur.")));
  p.appendChild(pb);wrap.appendChild(p);
  wrap.querySelectorAll("[data-mt]").forEach(x=>x.onclick=()=>openMeeting(state.meetings.find(m=>m.id==x.dataset.mt)));
  return wrap;
}
function meetPeople(m){return Array.isArray(m&&m.attendees)?m.attendees.filter(Boolean):[];}
function openMeeting(m){
  if(!m)return;const scrim=el("div","scrim");const canMng=role==="ceo"||role==="pm";const ppl=meetPeople(m);
  scrim.innerHTML=`<div class="modal" style="max-width:420px"><div class="mh"><h3>${meetIsOffice(m)?"🏢 "+esc(m.client):esc(m.client)+" — iclas"}</h3><button data-x>×</button></div><div class="mb">
    <div class="hint" style="white-space:normal;margin-bottom:12px">${esc(m.meet_date||"")}${m.meet_time?" · "+esc(m.meet_time):""} · ${esc(meetIsNew(m)?"🆕 Yeni məkan görüşü":meetIsOffice(m)?"🏢 İşçilər arası iclas":meetMonth(m)+" hesabatı")}${m.note?"<br>"+esc(m.note):""}</div>
    ${meetIsNew(m)&&(m.location||m.instagram)?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${m.location?`<a class="btn ghost sm" href="${esc(mapUrl(m.location))}" target="_blank" rel="noopener">📍 ${esc(/^https?:/i.test(m.location)?"Xəritədə aç":m.location)}</a>`:""}${m.instagram?`<a class="btn ghost sm" href="${esc(igUrl(m.instagram))}" target="_blank" rel="noopener">📷 ${esc(igHandle(m.instagram))}</a>`:""}</div>`:""}
    <div style="margin-bottom:12px">${meetChip(m)}</div>
    ${ppl.length?`<div class="field" style="margin-bottom:12px"><label>İştirakçılar</label><div style="display:flex;gap:5px;flex-wrap:wrap">${ppl.map(id=>`<span class="chip c-accent" style="font-size:11px">${esc(personName(id))}</span>`).join("")}</div></div>`:""}
    ${canMng?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-h="yes">${ICON.check} Baş tutdu</button><button class="btn ghost" data-h="no" style="color:var(--crit)">✗ Baş tutmadı</button>${m.held?`<button class="btn ghost" data-h="">Sıfırla</button>`:""}</div>
    ${m.held==="yes"&&!meetIsNew(m)&&!meetIsOffice(m)&&!meetReport(m)?`<button class="btn" data-rep style="margin-top:10px;width:100%">${ICON.plus} Hesabat yaz</button>`:""}`:""}
  </div>${canMng?`<div class="mf"><button class="btn ghost" data-del style="color:var(--crit)">${ICON.trash} Sil</button><button class="btn ghost" data-ed>${ICON.edit} Redaktə</button></div>`:""}</div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  scrim.querySelectorAll("[data-h]").forEach(b=>b.onclick=async()=>{close();await upd('meetings',m.id,{held:b.dataset.h});});
  const rp=scrim.querySelector("[data-rep]");if(rp)rp.onclick=()=>{close();reportMonth=MONTHS_AZ.indexOf(meetMonth(m));openReportForm(null,m.client);};
  const ed=scrim.querySelector("[data-ed]");if(ed)ed.onclick=()=>{close();openMeetForm(m);};
  const dl=scrim.querySelector("[data-del]");if(dl)dl.onclick=()=>{close();confirmDel('meetings',m.id,"«"+m.client+"» iclası");};
}
function openMeetForm(edit,pre){
  const e=edit||pre||{};const isEdit=!!edit;const dp=shootDate(e.meet_date);const dd=dp?dp.d:new Date().getDate(),mo=dp?dp.mo:calM;
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>${isEdit?"İclası düzəlt":"Yeni iclas"}</h3><button data-x>×</button></div><div class="mb">
    <div class="field"><label>Görüş növü</label><div class="pchips" style="max-height:none"><button type="button" class="pchip" data-kind="client">Mövcud müştəri</button><button type="button" class="pchip" data-kind="new">🆕 Yeni məkan görüşü</button><button type="button" class="pchip" data-kind="office">🏢 Ofis (işçilər arası)</button></div></div>
    <div data-kc><div class="field"><label>Məkan</label><select id="m1">${selOpts(state.clients.map(c=>c.name),e.kind==="new"||e.kind==="office"?"":e.client)}</select></div></div>
    <div data-kn>
      <div class="field"><label>Məkanın adı</label><input id="n1" value="${esc(e.kind==="new"?e.client||"":"")}" placeholder="məs. The Pride Lounge"></div>
      <div class="field"><label>Lokasiya</label><input id="n2" value="${esc(e.location||"")}" placeholder="Ünvan və ya Google Maps linki"></div>
      <div class="field"><label>Instagram səhifəsi</label><input id="n3" value="${esc(e.instagram||"")}" placeholder="@hesab və ya instagram.com/... linki"></div>
    </div>
    <div class="field"><label>Tarix (gün / ay)</label><div style="display:flex;gap:8px"><select id="m2" style="flex:1">${Array.from({length:31},(_,i)=>`<option${i+1===dd?" selected":""}>${i+1}</option>`).join("")}</select><select id="m3" style="flex:2">${MONTHS_AZ.map((x,i)=>`<option value="${i+1}"${i===mo?" selected":""}>${x}</option>`).join("")}</select></div></div>
    <div class="field"><label>Saat</label><input id="m4" type="time" value="${esc(e.meet_time||"")}"></div>
    <div class="field" data-kc><label>Hansı ayın hesabatı?</label><select id="m5">${MONTHS_AZ.map((x,i)=>`<option${(isEdit&&e.month?x===e.month:i===mo)?" selected":""}>${x}</option>`).join("")}</select></div>
    <div class="field"><label>Qeyd (istəyə bağlı)</label><input id="m6" value="${esc(e.note||"")}"></div>
    <div class="field"><label>İştirakçılar <span style="text-transform:none;letter-spacing:0;font-weight:500">— seçilənlərə bildiriş və iclasdan öncə xatırlatma gedəcək</span></label>
      <div class="pchips" style="max-height:none;margin-bottom:8px"><button type="button" class="pchip" data-pgroup="">Hamısı</button>${[...new Set(state.profiles.filter(p=>p.role&&ROLES[p.role]).map(p=>ROLES[p.role].label))].sort((a,b)=>a.localeCompare(b,"az")).map(l=>`<button type="button" class="pchip" data-pgroup="${esc(l)}">${esc(l)}</button>`).join("")}</div>
      <div class="hint" id="pcount" style="margin-bottom:6px"></div>
      <div class="pchips">${state.profiles.filter(p=>p.role&&ROLES[p.role]).sort((a,b)=>(ROLES[a.role].label).localeCompare(ROLES[b.role].label,"az")||String(a.full_name||a.username).localeCompare(String(b.full_name||b.username),"az")).map(p=>`<button type="button" class="pchip${meetPeople(e).includes(p.id)?" on":""}" data-pid="${esc(p.id)}" data-plabel="${esc(ROLES[p.role].label)}">${esc(p.full_name||p.username)}<small>${esc(ROLES[p.role].label)}</small></button>`).join("")}</div></div>
  </div><div class="mf"><button class="btn ghost" data-x2>Ləğv</button><button class="btn" data-ok>${isEdit?"Yadda saxla":"Əlavə et"}</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.querySelector("[data-x2]").onclick=close;
  const v=id=>scrim.querySelector("#"+id).value.trim();
  const pAll=[...scrim.querySelectorAll("[data-pid]")];
  const pOf=g=>g?pAll.filter(b=>b.dataset.plabel===g):pAll;
  const pSync=()=>{scrim.querySelectorAll("[data-pgroup]").forEach(b=>{const L=pOf(b.dataset.pgroup);b.classList.toggle("on",L.length>0&&L.every(x=>x.classList.contains("on")));});
    scrim.querySelector("#pcount").textContent=pAll.filter(x=>x.classList.contains("on")).length+" nəfər seçilib";};
  pAll.forEach(b=>b.onclick=()=>{b.classList.toggle("on");pSync();});
  scrim.querySelectorAll("[data-pgroup]").forEach(b=>b.onclick=()=>{const L=pOf(b.dataset.pgroup);const on=!L.every(x=>x.classList.contains("on"));L.forEach(x=>x.classList.toggle("on",on));pSync();});
  pSync();
  let kind=e.kind==="new"?"new":e.kind==="office"?"office":"client";
  const showKind=()=>{scrim.querySelectorAll("[data-kind]").forEach(b=>b.classList.toggle("on",b.dataset.kind===kind));
    scrim.querySelectorAll("[data-kc]").forEach(x=>x.style.display=kind==="client"?"":"none");scrim.querySelectorAll("[data-kn]").forEach(x=>x.style.display=kind==="new"?"":"none");};
  scrim.querySelectorAll("[data-kind]").forEach(b=>b.onclick=()=>{kind=b.dataset.kind;showKind();});showKind();
  scrim.querySelector("[data-ok]").onclick=async()=>{
    const isNew=kind==="new",isOffice=kind==="office";const name=isOffice?"Ofis iclası":isNew?v("n1"):v("m1");
    if(!name){if(isNew){const f=scrim.querySelector("#n1");f.focus();f.style.borderColor="var(--crit)";}return;}
    const attendees=[...scrim.querySelectorAll(".pchip.on[data-pid]")].map(b=>b.dataset.pid);
    const p={client:name,kind,location:isNew?v("n2"):"",instagram:isNew?v("n3"):"",meet_date:String(v("m2")).padStart(2,"0")+"."+String(v("m3")).padStart(2,"0"),meet_time:v("m4"),month:isNew||isOffice?"":v("m5"),note:v("m6"),attendees};
    const ok=scrim.querySelector("[data-ok]");ok.disabled=true;
    if(isEdit){
      const moved=p.meet_date!==e.meet_date||p.meet_time!==(e.meet_time||"");
      if(moved){p.remind_day_at=null;p.remind_hour_at=null;}
      await upd('meetings',e.id,p);
      const old=meetPeople(e);const added=attendees.filter(id=>!old.includes(id));
      notifyMeeting({...e,...p},added,"new");
      if(moved)notifyMeeting({...e,...p},attendees.filter(id=>!added.includes(id)),"moved");
    }else{await ins('meetings',p);notifyMeeting(p,attendees,"new");}
    close();};
}
/* İclas bildirişi: iştirakçılara (özündən başqa) */
async function notifyMeeting(m,ids,kind){
  ids=(ids||[]).filter(id=>id&&(!me||id!==me.id));if(!ids.length)return;
  const ppl=meetPeople(m).map(personName).join(", ");
  const body=`${meetIsNew(m)?"🆕 Yeni məkan görüşü\n":""}${meetIsOffice(m)?"🏢 İşçilər arası iclas":"Məkan: "+m.client}\nTarix: ${m.meet_date||""}${m.meet_time?" · saat "+m.meet_time:""}${meetIsOffice(m)?"":meetIsNew(m)?(m.location?"\nLokasiya: "+m.location:"")+(m.instagram?"\nInstagram: "+igUrl(m.instagram):""):"\nHesabat ayı: "+(m.month||meetMonth(m))}${m.note?"\nQeyd: "+m.note:""}${ppl?"\nİştirakçılar: "+ppl:""}\nTəyin edən: ${myName()}`;
  const title=kind==="moved"?"📅 İclasın vaxtı dəyişdi — "+m.client:(meetIsOffice(m)?"🏢 Yeni ofis iclası":(meetIsNew(m)?"🆕 Yeni məkan görüşü — ":"📅 Yeni iclas — ")+m.client);
  try{await sb.from('notifications').insert(ids.map(id=>({target_type:"user",target:id,title,body,from_name:myName(),from_id:me?me.id:null,read_by:[]})));}catch(e){}
}
function renderReports(){
  const wrap=el("div");const mName=MONTHS_AZ[reportMonth];
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px";
  const msel=el("select");msel.style.cssText="font-size:13px;padding:8px 11px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--ink)";
  msel.innerHTML=MONTHS_AZ.map((m,i)=>`<option value="${i}"${i===reportMonth?" selected":""}>${m}</option>`).join("");
  msel.onchange=()=>{reportMonth=+msel.value;render();};bar.appendChild(msel);
  const addB=el("button","btn sm",`${ICON.plus} Hesabat yaz`);addB.style.marginLeft="auto";addB.onclick=()=>openReportForm();bar.appendChild(addB);
  wrap.appendChild(bar);
  const reps=state.reports.filter(r=>r.month===mName);
  const active=state.clients.filter(c=>c.status==="Aktiv");
  const reported=new Set(reps.map(r=>r.client));
  const missing=active.filter(c=>!reported.has(c.name));
  wrap.appendChild(el("div","tiles",
    tile("Hesabat verilib",`${reported.size}/${active.length}`,mName+" · məkan")
    +tile("Bu ay hesabatlar",reps.length,"")
    +(missing.length?tileC("Qalıb",missing.length,"iclas keçirilməyib","warn"):tile("Qalıb",0,"hamısı verilib"))));
  const mts=state.meetings.filter(m=>m.held&&!meetIsNew(m)&&!meetIsOffice(m)&&meetMonth(m)===mName);
  if(mts.length){const mp=el("div","panel");mp.style.marginBottom="16px";
    mp.appendChild(el("div","ph",`<h3>İclaslar — ${mName}</h3><span class="count">${mts.filter(m=>m.held==="yes").length} baş tutdu · ${mts.filter(m=>m.held==="no").length} baş tutmadı</span>`));
    const pb=el("div","pb");mts.forEach(m=>{const row=el("div","row");row.innerHTML=`<div class="main"><div class="t">${esc(m.client)}</div><div class="m">${esc(m.meet_date||"")}${m.meet_time?" · "+esc(m.meet_time):""}</div></div><div class="r" style="display:flex;gap:8px;align-items:center">${m.held==="yes"&&!meetReport(m)?`<button class="mini" data-radd="${esc(m.client)}">${ICON.plus} Hesabat yaz</button>`:""}${meetChip(m)}</div>`;pb.appendChild(row);});
    mp.appendChild(pb);wrap.appendChild(mp);}
  const grid=el("div","grid2");
  reps.forEach(r=>{
    const canEdit=role==="ceo"||(me&&r.author===me.id);
    const rl=r.author_role&&ROLES[r.author_role]?ROLES[r.author_role].label:"";
    const sc=reportScore(r);
    const stars=sc?"":(r.rating?"★".repeat(r.rating)+"☆".repeat(5-r.rating):"");
    const card=el("div","panel");card.dataset.sid="report:"+r.id;card.style.cssText="margin:0;padding:16px";
    card.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><strong style="font-size:15px;flex:1">${esc(r.client)}</strong>${sc?`<span class="chip c-${sc.c}" style="font-size:11px" title="Ümumi razılıq (bal: ${sc.avg.toFixed(1)}/4)">${sc.label} · ${sc.avg.toFixed(1)}</span>`:""}${stars?`<span style="color:var(--warn);font-size:13px;letter-spacing:1px" title="məmnunluq">${stars}</span>`:""}${canEdit?`<button class="ibtn" data-red="${r.id}" title="Düzəliş">${ICON.edit}</button><button class="ibtn danger" data-rdel="${r.id}" title="Sil">${ICON.trash}</button>`:""}</div>
      <div style="color:var(--muted);font-size:12px;margin-bottom:12px">${rl?`<span class="chip c-mut" style="font-size:10px">${esc(rl)}</span> `:""}${esc(r.author_name||"")}${r.meeting_date?" · iclas: "+esc(r.meeting_date):""}</div>
      ${sc?`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:11px">${SAT_CATS.map(c=>{const x=SAT.find(y=>y[0]===r[c[0]]);return x?`<span class="chip c-${x[3]}" style="font-size:10.5px">${c[1]}: ${x[1]}</span>`:"";}).join("")}</div>`:""}
      <div style="margin-bottom:11px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--good);font-weight:700;margin-bottom:3px">✓ Bu ay razı qaldı</div><div style="font-size:13.5px;line-height:1.5;white-space:pre-wrap">${esc(r.satisfied||"—")}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--accent-ink);font-weight:700;margin-bottom:3px">→ Gələn ay istəyir</div><div style="font-size:13.5px;line-height:1.5;white-space:pre-wrap">${esc(r.next_month||"—")}</div></div>
      ${r.notes?`<div style="margin-top:11px;padding-top:10px;border-top:1px solid var(--border);font-size:12.5px;color:var(--muted);white-space:pre-wrap"><b>Qeyd:</b> ${esc(r.notes)}</div>`:""}`;
    grid.appendChild(card);
  });
  if(!reps.length)grid.appendChild(el("div","empty",`${mName} üçün hələ hesabat yoxdur — «+ Hesabat yaz» ilə başla.`));
  wrap.appendChild(grid);
  if(missing.length){
    const mp=el("div","panel");mp.style.marginTop="16px";
    mp.appendChild(el("div","ph",`<h3>İclas keçirilməyən məkanlar — ${mName}</h3><span class="count">${missing.length}</span>`));
    const pb=el("div","pb");
    missing.forEach(c=>{const row=el("div","row");row.innerHTML=`<div class="main"><div class="t">${esc(c.name)}</div><div class="m">${esc(c.pkg||'')}</div></div><div class="r"><button class="mini" data-radd="${esc(c.name)}">${ICON.plus} Hesabat yaz</button></div>`;pb.appendChild(row);});
    mp.appendChild(pb);wrap.appendChild(mp);
  }
  wrap.querySelectorAll("[data-red]").forEach(b=>b.onclick=()=>openReportForm(state.reports.find(x=>x.id==b.dataset.red)));
  wrap.querySelectorAll("[data-rdel]").forEach(b=>b.onclick=()=>{const r=state.reports.find(x=>x.id==b.dataset.rdel);confirmDel('reports',r.id,"«"+r.client+"» hesabatı");});
  wrap.querySelectorAll("[data-radd]").forEach(b=>b.onclick=()=>openReportForm(null,b.dataset.radd));
  return wrap;
}
function openReportForm(edit,presetClient){
  const e=edit||{};const isEdit=!!edit;
  const scrim=el("div","scrim");
  const clientOpts=state.clients.map(c=>`<option${(isEdit?c.name===e.client:c.name===presetClient)?" selected":""}>${esc(c.name)}</option>`).join("");
  const monthOpts=MONTHS_AZ.map((m,i)=>`<option${(isEdit?m===e.month:i===reportMonth)?" selected":""}>${m}</option>`).join("");
  const ratingOpts=`<option value="">— reyting yoxdur —</option>`+[5,4,3,2,1].map(n=>`<option value="${n}"${e.rating==n?" selected":""}>${"★".repeat(n)} (${n})</option>`).join("");
  scrim.innerHTML=`<div class="modal aimodal"><div class="mh"><h3>${isEdit?"Hesabatı düzəlt":"Aylıq hesabat — iclasdan sonra"}</h3><button data-x>×</button></div>
    <div class="mb">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="field" style="flex:1;min-width:150px"><label>Məkan</label><select id="r-c">${clientOpts||'<option value="">— klient yoxdur —</option>'}</select></div>
        <div class="field" style="min-width:110px"><label>Ay</label><select id="r-m">${monthOpts}</select></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="field" style="flex:1;min-width:140px"><label>İclas tarixi (istəyə bağlı)</label><input id="r-d" value="${esc(e.meeting_date||'')}" placeholder="məs. 24.09"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">${SAT_CATS.map(c=>`<div class="field"><label>${c[1]}</label><select id="r-${c[0]}"><option value="">—</option>${SAT.map(x=>`<option value="${x[0]}"${e[c[0]]===x[0]?" selected":""}>${x[1]}</option>`).join("")}</select></div>`).join("")}</div>
      <div class="field"><label>✓ Bu ay nədən razı qaldı</label><textarea id="r-s" placeholder="Məkanın bu ay bəyəndiyi işlər…">${esc(e.satisfied||'')}</textarea></div>
      <div class="field"><label>→ Gələn ay üçün nə istəyir</label><textarea id="r-n" placeholder="Növbəti ay üçün istəklər, dəyişikliklər, yeni ideyalar…">${esc(e.next_month||'')}</textarea></div>
      <div class="field"><label>Əlavə qeyd (istəyə bağlı)</label><textarea id="r-note" placeholder="Digər qeydlər…">${esc(e.notes||'')}</textarea></div>
    </div>
    <div class="mf"><button class="btn ghost" data-x2>Ləğv</button><button class="btn" data-ok>${isEdit?"Yadda saxla":"Hesabatı ver"}</button></div></div>`;
  document.body.appendChild(scrim);
  const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.querySelector("[data-x2]").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  const v=id=>{const el2=scrim.querySelector("#"+id);return el2?el2.value.trim():"";};
  scrim.querySelector("[data-ok]").onclick=async()=>{
    if(!v("r-c")){alert("Məkan seç.");return;}
    if(SAT_CATS.some(c=>!v("r-"+c[0]))){alert("Video, Kontent, Dizayn və Targeting razılığını seç.");return;}
    if(!v("r-s")&&!v("r-n")){alert("Ən azı «razı qaldı» və ya «gələn ay» bölməsini doldur.");return;}
    const p={client:v("r-c"),month:v("r-m"),meeting_date:v("r-d"),video_sat:v("r-video_sat")||null,content_sat:v("r-content_sat")||null,design_sat:v("r-design_sat")||null,target_sat:v("r-target_sat")||null,satisfied:v("r-s"),next_month:v("r-n"),notes:v("r-note")};
    if(isEdit)await upd('reports',e.id,p);else await ins('reports',{...p,author:me?me.id:null,author_name:myName(),author_role:role});
    close();
  };
}
function paymentDue(c){
  const mName=MONTHS_AZ[new Date().getMonth()];const dnow=new Date().getDate();
  const paid=state.payments.some(p=>p.client===c.name&&p.month===mName&&p.status==="Ödənildi");
  const day=+c.pay_day||0;let status,color;
  if(paid){status="Ödənildi";color="good";}
  else if(!day){status="Gün yoxdur";color="mut";}
  else if(dnow>day){status="Gecikib";color="crit";}
  else if(day-dnow<=3){status="Yaxınlaşır";color="warn";}
  else{status="Gözləyir";color="mut";}
  return {status,color,day,paid,amount:+c.fee||0,mName};
}
function renderFinance(){
  const wrap=el("div");
  const income=state.payments.filter(p=>p.status==="Ödənildi").reduce((a,b)=>a+Number(b.amount||0),0);
  const expected=state.payments.reduce((a,b)=>a+Number(b.amount||0),0);
  const exp=state.expenses.reduce((a,b)=>a+Number(b.amount||0),0);
  wrap.appendChild(el("div","tiles",tile("Yığılan gəlir",money(income),"cari",true)+tile("Gözlənilən",money(expected),"bütün fakturalar")+tile("Xərclər",money(exp),"")+tile("Xalis",money(income-exp),"gəlir − xərc")));
  // Ödəniş təqvimi
  const pay=el("div","panel");pay.style.marginBottom="16px";
  const active=state.clients.filter(c=>c.status==="Aktiv"&&((+c.pay_day)||(+c.fee)));
  const prows=active.map(c=>({c,d:paymentDue(c)}));
  const rank={crit:0,warn:1,mut:2,good:3};
  prows.sort((a,b)=>(rank[a.d.color]-rank[b.d.color])||((a.d.day||99)-(b.d.day||99)));
  const overdue=prows.filter(x=>x.d.color==="crit").length,soon=prows.filter(x=>x.d.color==="warn").length;
  const pendingSum=prows.filter(x=>!x.d.paid).reduce((s,x)=>s+x.d.amount,0);
  const payPh=el("div","ph",`<h3>Ödəniş təqvimi — ${MONTHS_AZ[new Date().getMonth()]}</h3><span class="count">${overdue?`<span style="color:var(--crit)">${overdue} gecikib</span> · `:""}${soon} yaxınlaşır · gözləyən ${money(pendingSum)}</span>`);
  pay.appendChild(payPh);
  const ppb=el("div","pb");
  prows.forEach(({c,d})=>{const row=el("div","row");
    const act=d.paid?"":`<button class="mini" data-paid="${c.id}">${ICON.check} Ödənildi</button>`;
    row.innerHTML=`<div class="main"><div class="t">${esc(c.name)}</div><div class="m">Ödəniş günü: ${d.day?d.day+"-də":"—"} · ${money(d.amount)}</div></div><div class="r" style="display:flex;gap:8px;align-items:center">${act}<span class="chip c-${d.color}">${d.status}</span></div>`;
    ppb.appendChild(row);});
  if(!prows.length)ppb.appendChild(el("div","empty","Ödəniş günü təyin olunmuş aktiv müştəri yoxdur"));
  pay.appendChild(ppb);wrap.appendChild(pay);
  pay.querySelectorAll("[data-paid]").forEach(b=>b.onclick=async()=>{const c=state.clients.find(x=>x.id==b.dataset.paid);if(!c)return;b.disabled=true;await ins('payments',{client:c.name,month:MONTHS_AZ[new Date().getMonth()],amount:+c.fee||0,status:"Ödənildi"});});
  const g=el("div","grid2");
  const p1=el("div","panel");p1.appendChild(el("div","ph",`<h3>Klient ödənişləri</h3><span class="count">${state.payments.length}</span>`));
  const tw=el("div","tablewrap");const tb=el("tbody");
  state.payments.forEach(p=>{const tr=el("tr");tr.innerHTML=`<td><strong>${esc(p.client)}</strong></td><td>${esc(p.month)}</td><td class="num">${money(p.amount)}</td><td><button class="mini" data-pay="${p.id}" style="border:none;padding:0;background:none">${statusChip(p.status)}</button></td>`;tb.appendChild(tr);});
  const t=el("table");t.innerHTML=`<thead><tr><th>Klient</th><th>Ay</th><th>Məbləğ</th><th>Status</th></tr></thead>`;t.appendChild(tb);tw.appendChild(t);p1.appendChild(tw);g.appendChild(p1);
  const p2=el("div","panel");p2.appendChild(el("div","ph",`<h3>Xərclər</h3><span class="count">${money(exp)}</span>`));
  const pb=el("div","pb");state.expenses.forEach(e=>pb.appendChild(el("div","row",`<div class="main"><div class="t">${esc(e.category)}</div><div class="m">${esc(e.month)}</div></div><div class="r num">${money(e.amount)}</div>`)));
  if(!state.expenses.length)pb.appendChild(el("div","empty","Xərc yoxdur"));
  p2.appendChild(pb);g.appendChild(p2);wrap.appendChild(g);
  tw.querySelectorAll("[data-pay]").forEach(b=>b.onclick=()=>{const p=state.payments.find(x=>x.id==b.dataset.pay);upd('payments',p.id,{status:PAY_CYCLE[(PAY_CYCLE.indexOf(p.status)+1)%PAY_CYCLE.length]});});
  return wrap;
}

/* ---------- Team ---------- */
function renderTeam(){
  const wrap=el("div");actEnsure();
  wrap.appendChild(kpiPanel(state.profiles.filter(p=>ROLES[p.role]&&p.role!=="ceo").sort((a,b)=>String(a.role).localeCompare(String(b.role))),"📈 Komandanın göstəriciləri"));const p=el("div","panel");
  p.appendChild(el("div","ph",`<h3>Komanda / İstifadəçilər</h3><span class="count">${state.profiles.length}</span>`));
  const tw=el("div","tablewrap");const tb=el("tbody");
  state.profiles.forEach(u=>{
    const pending=!ROLES[u.role];
    const opts=`<option value=""${pending?" selected":""}>— təyin olunmayıb</option>`+Object.keys(ROLES).map(k=>`<option value="${k}"${u.role===k?" selected":""}>${esc(ROLES[k].label)}</option>`).join("");
    const tr=el("tr");
    tr.innerHTML=`<td><strong>${esc(u.username)}</strong>${u.id===me.id?' <span class="chip c-accent" style="font-size:10px">sən</span>':""}${pending?' <span class="chip c-warn" style="font-size:10px">gözləyir</span>':""}</td>
      <td><select class="mini" data-role="${u.id}" style="padding:6px 8px">${opts}</select></td>
      <td class="r">${u.id===me.id?"":`<button class="mini" data-del="${u.id}">Sil</button>`}</td>`;
    tb.appendChild(tr);
  });
  const t=el("table");t.innerHTML=`<thead><tr><th>İstifadəçi</th><th>Vəzifə (rol)</th><th></th></tr></thead>`;t.appendChild(tb);tw.appendChild(t);p.appendChild(tw);wrap.appendChild(p);
  tw.querySelectorAll("[data-role]").forEach(s=>s.onchange=async()=>{await upd('profiles',s.dataset.role,{role:s.value});await reloadProfiles();render();});
  tw.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{const pr=state.profiles.find(x=>x.id===b.dataset.del);const nm=pr?(pr.full_name||pr.username||pr.email||""):"";
    if(!confirm("«"+nm+"» paneldən tamamilə silinsin?\n\nHesabı bağlanacaq, daha daxil ola bilməyəcək. Onun yaratdığı tasklar, brifler və tarixçə qalır.\nBu əməliyyat geri qaytarılmır."))return;
    const {error}=await sb.rpc('ceo_delete_user',{uid:b.dataset.del});
    if(error){alert("Silinmədi: "+error.message);return;}
    await reloadProfiles();render();});
  wrap.appendChild(el("div","hint",`<div style="margin-top:11px">Vəzifələri yalnız sən (CEO) təyin edirsən. Komanda üzvləri özləri email+parol ilə qeydiyyatdan keçir; sən rol verənə qədər gözləmədə qalırlar.</div>`));
  if(role==="ceo"){
    const bp=el("div","panel");bp.style.marginTop="16px";
    bp.appendChild(el("div","ph",`<h3>Ehtiyat nüsxə (backup)</h3><span class="count">Sayt versiyası: ${APP_VERSION}</span>`));
    const bb=el("div","pb");
    bb.appendChild(el("div","row",`<div class="main"><div class="t">Bütün datanı indi yüklə</div><div class="m">Müştərilər, çəkilişlər, kontent, tasklar, hesabatlar, ödənişlər — bir JSON faylı kimi kompüterinə düşür.</div></div><div class="r"><button class="btn" id="bk-now">💾 Backup yüklə</button></div>`));
    bb.appendChild(el("div","row",`<div class="main"><div class="t">Avtomatik gündəlik backup</div><div class="m">Hər gecə server özü bütün datanı saxlayır (son 30 gün) — Supabase → Storage → <b>backups</b> qovluğunda.</div></div>`));
    bp.appendChild(bb);wrap.appendChild(bp);
    bp.querySelector("#bk-now").onclick=async(ev)=>{const b=ev.currentTarget;b.disabled=true;const o=b.innerHTML;b.innerHTML="⏳ Hazırlanır…";try{await downloadBackup();}catch(e){alert("Backup alınmadı: "+(e.message||e));}b.disabled=false;b.innerHTML=o;};
  }
  return wrap;
}
const BACKUP_TABLES=["meetings","clients","content","briefs","shoots","shoot_drafts","tasks","comments","notifications","reports","payments","expenses","profiles","ad_briefs","ad_issues","ig_accounts","ig_waits","smm_venues","smm_posts","smm_media","leads","proposals","client_feedback","prospects"];
async function fetchAllRows(t){
  const out=[];const step=1000;
  for(let from=0;;from+=step){
    const {data,error}=await sb.from(t).select('*').range(from,from+step-1);
    if(error)return {error:error.message,rows:out};
    out.push(...(data||[]));if(!data||data.length<step)break;
  }
  return {rows:out};
}
async function downloadBackup(){
  const snap={app:"MezMoon CRM",version:APP_VERSION,created_at:new Date().toISOString(),tables:{}};
  for(const t of BACKUP_TABLES){const r=await fetchAllRows(t);snap.tables[t]=r.error?{error:r.error}:r.rows;}
  const blob=new Blob([JSON.stringify(snap,null,1)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="mezmoon-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
}

/* ---------- Qlobal axtarış (Ctrl+K) ---------- */
const AZ_FOLD={"ə":"e","ı":"i","ö":"o","ü":"u","ç":"c","ş":"s","ğ":"g"};
function fold(s){return String(s==null?"":s).toLocaleLowerCase("az").replace(/̇/g,"").replace(/[əıöüçşğ]/g,ch=>AZ_FOLD[ch]);}
function hl(text,words){
  const s=String(text==null?"":text);const f=fold(s);if(f.length!==s.length)return esc(s);
  const mk=new Array(s.length).fill(false);
  words.forEach(w=>{if(!w)return;let i=f.indexOf(w);while(i>=0){for(let j=i;j<i+w.length;j++)mk[j]=true;i=f.indexOf(w,i+w.length);}});
  let out="",on=false;for(let i=0;i<s.length;i++){if(mk[i]&&!on){out+="<mark>";on=true;}if(!mk[i]&&on){out+="</mark>";on=false;}out+=esc(s[i]);}
  if(on)out+="</mark>";return out;
}
function goFlash(v,sid){
  view=v;render();
  setTimeout(()=>{const e=document.querySelector(`[data-sid="${sid}"]`);if(!e)return;
    e.scrollIntoView({behavior:"smooth",block:"center",inline:"center"});e.classList.add("sflash");setTimeout(()=>e.classList.remove("sflash"),2400);},60);
}
function searchItems(){
  const nav=ROLES[role].nav;const out=[];
  const add=(grp,ic,title,sub,extra,go)=>out.push({grp,ic,title,sub,hay:fold([title,sub,extra].join(" ")),go});
  state.clients.forEach(c=>add("Müştərilər",ICON.users,c.name,[c.pkg,c.status].filter(Boolean).join(" · "),"",()=>{view="clients";render();openClientDetail(c);}));
  const tl=TASK_MANAGERS.includes(role)?state.tasks:state.tasks.filter(taskIsMine);
  tl.forEach(t=>add("Tasklar",ICON.tasks,t.title,[taskRoleLabel(t.role),t.client,t.status,t.deadline?"deadline "+fmtDate(t.deadline):""].filter(Boolean).join(" · "),t.note||"",()=>{taskFilter="";goFlash("tasks","task:"+t.id);}));
  if(nav.includes("content"))state.content.forEach(c=>add("Kontent",ICON.layers,c.title,[c.client,c.platform,c.month,c.status].filter(Boolean).join(" · "),"",()=>goFlash("content","content:"+c.id)));
  if(nav.includes("briefs"))state.briefs.forEach(b=>add("Dizayn brifləri",ICON.palette,b.title,[b.client,b.designer,b.motion_by,b.status].filter(Boolean).join(" · "),"",()=>goFlash("briefs","brief:"+b.id)));
  if(nav.includes("shoots"))state.shoots.forEach(s=>add("Çəkilişlər",ICON.camPhoto,(s.client||"")+(s.shoot_date?" · "+s.shoot_date:""),[s.shoot_time,s.video_op,s.photo_op,s.model_name?"Model: "+s.model_name:"",s.kind==="atmosfer"?"Atmosfer":"Kontent",shootMonth(s)].filter(Boolean).join(" · "),"",()=>{shootKind=s.kind==="atmosfer"?"atmosfer":"kontent";view="shoots";render();openShoot(s.id);}));
  if(nav.includes("reports"))state.reports.forEach(x=>add("Aylıq hesabatlar",ICON.file,(x.client||"")+" · "+(x.month||""),x.author_name||"",[x.satisfied,x.next_month,x.notes].join(" "),()=>{const i=MONTHS_AZ.indexOf(x.month);if(i>=0)reportMonth=i;goFlash("reports","report:"+x.id);}));
  if(role==="ceo")state.payments.forEach(p=>add("Ödənişlər","₼",(p.client||"")+" · "+(p.month||""),money(p.amount)+" · "+(p.status||""),"",()=>{view="finance";render();}));
  return out;
}
function openSearch(){
  if(!role||document.querySelector(".gsscrim"))return;
  const scrim=el("div","scrim gsscrim");
  scrim.innerHTML=`<div class="modal gsmodal"><div class="gsin">${ICON.search}<input id="gsq" placeholder="Müştəri, task, kontent, çəkiliş, model, operator…" autocomplete="off" enterkeyhint="search"><button class="ibtn" data-x title="Bağla">${ICON.x}</button></div><div class="gsres"></div></div>`;
  document.body.appendChild(scrim);
  const inp=scrim.querySelector("#gsq"),res=scrim.querySelector(".gsres");
  const all=searchItems();let shown=[],sel=0;
  const setSel=i=>{sel=i;res.querySelectorAll(".gsit").forEach((r,j)=>r.classList.toggle("on",j===i));};
  const close=()=>{scrim.remove();document.removeEventListener("keydown",onKey,true);};
  const pick=i=>{const it=shown[i];if(!it)return;close();it.go();};
  const draw=()=>{
    const q=fold(inp.value.trim());res.innerHTML="";shown=[];sel=0;
    if(!q){res.appendChild(el("div","hint",`<div style="padding:14px 16px;white-space:normal">Yazmağa başla — məkan adı, model, operator, task başlığı, hesabat mətni… Azərbaycan hərfləri olmadan da tapır (məs. «cekilis»).</div>`));return;}
    const words=q.split(/\s+/).filter(Boolean);
    const hits=all.filter(it=>words.every(w=>it.hay.includes(w)));
    if(!hits.length){res.appendChild(el("div","empty","Heç nə tapılmadı"));return;}
    const groups={};hits.forEach(it=>{(groups[it.grp]=groups[it.grp]||[]).push(it);});
    Object.entries(groups).forEach(([g,items])=>{
      res.appendChild(el("div","gsgrp",`${esc(g)} · ${items.length}${items.length>8?" (ilk 8)":""}`));
      items.slice(0,8).forEach(it=>{const i=shown.length;shown.push(it);
        const row=el("div","gsit"+(i===0?" on":""));
        const ic=it.ic.startsWith("<svg")?it.ic:`<span style="width:16px;text-align:center;color:var(--muted);font-weight:700;flex:none">${it.ic}</span>`;
        row.innerHTML=`${ic}<div style="min-width:0;flex:1"><div class="t">${hl(it.title,words)}</div>${it.sub?`<div class="m">${hl(it.sub,words)}</div>`:""}</div>`;
        row.onclick=()=>pick(i);row.onmouseenter=()=>setSel(i);res.appendChild(row);});
    });
  };
  const move=d=>{if(!shown.length)return;setSel(Math.max(0,Math.min(shown.length-1,sel+d)));const r=res.querySelectorAll(".gsit")[sel];if(r)r.scrollIntoView({block:"nearest"});};
  const onKey=e=>{if(e.key==="Escape"){e.preventDefault();close();}else if(e.key==="ArrowDown"){e.preventDefault();move(1);}else if(e.key==="ArrowUp"){e.preventDefault();move(-1);}else if(e.key==="Enter"){e.preventDefault();pick(sel);}};
  document.addEventListener("keydown",onKey,true);
  inp.oninput=draw;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  draw();setTimeout(()=>inp.focus(),20);
}
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&(e.key==="k"||e.key==="K")&&role&&me){e.preventDefault();openSearch();}if(e.key==="Escape"){const b=$(".body.navopen");if(b)b.classList.remove("navopen");}});

/* ---------- Dəyişiklik tarixçəsi (yalnız CEO) ---------- */
/* ---------- Giriş-çıxış: ofisdəki sabit QR + lokasiya yoxlaması (hesabatı CEO görür) ----------
   İşçi ofisdəki QR-ı telefonla oxudur → panel açılır → «Giriş» / «Çıxış» → telefon lokasiyası ofislə müqayisə olunur (office_check). */
const ATT_START=10*60,ATT_END=18*60,ATT_GRACE=5;          // iş saatı 10:00–18:00, 5 dəq güzəşt
const bakuISO=(t)=>new Date((t==null?Date.now():t)+4*36e5).toISOString().slice(0,10);
const bakuMin=(iso)=>{const d=new Date(Date.parse(iso)+4*36e5);return d.getUTCHours()*60+d.getUTCMinutes();};
const hhmm=(m)=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const durTxt=(m)=>m<=0?"—":Math.floor(m/60)+" s "+String(m%60).padStart(2,"0")+" dəq";
const att={tab:"day",day:bakuISO(),month:bakuISO().slice(0,7),data:null,loading:false,err:"",radius:150};
const CHECKIN_KEY="mz_checkin";
/* QR linki (?checkin=TOKEN) — giriş tamamlanana qədər yadda saxlanır, ünvan sətrindən silinir */
(function(){const q=new URLSearchParams(location.search);const t=q.get("checkin");if(!t)return;
  try{sessionStorage.setItem(CHECKIN_KEY,t);}catch(e){}
  q.delete("checkin");history.replaceState(null,"",location.pathname+(q.toString()?"?"+q:"")+location.hash);})();
function checkinFromUrl(){let t="";try{t=sessionStorage.getItem(CHECKIN_KEY)||"";sessionStorage.removeItem(CHECKIN_KEY);}catch(e){}if(t&&me)openCheckin(t);}
const geoErr=e=>e&&e.code===1?"Lokasiya icazəsi verilməyib. Telefonun ayarlarında brauzerə lokasiya icazəsi ver və QR-ı yenidən oxut.":e&&e.code===3?"Lokasiya vaxtında alınmadı — bir də yoxla.":"Lokasiya alınmadı — telefonda lokasiya (GPS) açıq olsun.";
function getPos(){return new Promise((res,rej)=>{if(!navigator.geolocation){rej({code:0});return;}navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:20000,maximumAge:0});});}
async function openCheckin(token){
  const {data:last}=await sb.from('office_checkins').select('kind,at').eq('user_id',me.id).eq('day',bakuISO()).order('at',{ascending:false}).limit(1);
  const l=last&&last[0];const sug=l&&l.kind==="in"?"out":"in";
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" role="dialog" aria-labelledby="ck-t"><div class="mh"><h3 id="ck-t">🏢 Ofis — giriş / çıxış</h3><button aria-label="Bağla" data-x>×</button></div>
    <div class="mb"><div>Salam, <b>${esc(myName())}</b>!${l?`<div class="hint" style="margin-top:4px">Bu gün son qeyd: ${l.kind==="in"?"giriş":"çıxış"} · ${hhmm(bakuMin(l.at))}</div>`:""}</div>
      <div style="display:flex;gap:8px"><button class="btn${sug==="in"?"":" ghost"}" data-k="in" style="flex:1;min-height:52px;font-size:15px">➡️ Giriş</button><button class="btn${sug==="out"?"":" ghost"}" data-k="out" style="flex:1;min-height:52px;font-size:15px">⬅️ Çıxış</button></div>
      <div class="hint" id="ck-s">Basanda telefonun lokasiyası bir dəfə yoxlanılır — ofisdə olduğun təsdiqlənir.</div></div></div>`;
  document.body.appendChild(scrim);
  const close=()=>scrim.remove();scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const st=scrim.querySelector("#ck-s");let busy=false;
  scrim.querySelectorAll("[data-k]").forEach(b=>b.onclick=async()=>{
    if(busy)return;busy=true;scrim.querySelectorAll("[data-k]").forEach(x=>x.disabled=true);st.textContent="📍 Lokasiya yoxlanılır…";
    let pos;try{pos=await getPos();}catch(e){st.innerHTML=`<span style="color:var(--crit)">${esc(geoErr(e))}</span>`;busy=false;scrim.querySelectorAll("[data-k]").forEach(x=>x.disabled=false);return;}
    const {data,error}=await sb.rpc("office_check",{p_token:token,p_kind:b.dataset.k,p_lat:pos.coords.latitude,p_lng:pos.coords.longitude,p_acc:pos.coords.accuracy});
    if(error){st.innerHTML=`<span style="color:var(--crit)">${esc(error.message)}</span>`;busy=false;scrim.querySelectorAll("[data-k]").forEach(x=>x.disabled=false);return;}
    scrim.querySelector(".mb").innerHTML=`<div style="text-align:center;padding:10px 0"><div style="font-size:40px">${data.kind==="in"?"✅":"👋"}</div><h3 style="margin:8px 0 4px">${data.kind==="in"?"Giriş qeyd olundu":"Çıxış qeyd olundu"}</h3><div class="hint">${hhmm(bakuMin(data.at))} · ofisdən ~${data.distance} m</div></div><button class="btn" data-x style="width:100%">Bağla</button>`;
    scrim.querySelector(".mb [data-x]").onclick=close;att.data=null;
  });
}
async function loadAttendance(){
  att.loading=true;att.err="";
  const [y,m]=att.month.split("-").map(Number);const from=att.month+"-01",to=bakuISO(Date.UTC(y,m,0));
  const lo=att.day<from?att.day:from,hi=att.day>to?att.day:to;
  const [ci,cf]=await Promise.all([sb.from('office_checkins').select('*').gte('day',lo).lte('day',hi).order('at'),sb.from('office_qr').select('*').maybeSingle()]);
  att.loading=false;
  const e=ci.error||cf.error;
  if(e){att.err=e.message;att.data={checks:[],cfg:null};}
  else{att.data={checks:ci.data||[],cfg:cf.data||null};if(cf.data)att.radius=cf.data.radius_m;}
  if(view==="attendance")render();
}
/* bir gün üçün işçi üzrə: ilk giriş, son qeyd və hazırda içəridədirmi (son qeyd «giriş») */
function attDay(day){
  const per={};
  att.data.checks.filter(c=>c.day===day).forEach(c=>{const o=per[c.user_id]||(per[c.user_id]={first:null,last:c.at,open:false,n:0});
    if(c.kind==="in"&&!o.first)o.first=c.at;o.last=c.at;o.open=c.kind==="in";o.n++;});
  Object.values(per).forEach(o=>{if(!o.first)o.first=o.last;});
  return per;
}
function attFlags(day,o){
  const today=day===bakuISO(),nowM=bakuMin(new Date().toISOString());
  const f=bakuMin(o.first),here=today&&o.open,noOut=!today&&o.open;
  const l=here?nowM:bakuMin(o.last);
  const late=f>ATT_START+ATT_GRACE?f-ATT_START:0;
  const dayOver=!today||nowM>=ATT_END;   // bu gün 18:00-a qədər yekun «tez çıxıb» deyilmir
  const early=!here&&!noOut&&dayOver&&l<ATT_END-ATT_GRACE?ATT_END-l:0;
  const away=!here&&!dayOver;
  return {f,l,here,away,late,early,noOut,dur:noOut?0:Math.max(0,l-f)};
}
function attQrUrl(t){return location.origin+location.pathname+"?checkin="+encodeURIComponent(t);}
async function attQrSvg(t){await loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js");const q=qrcode(0,"M");q.addData(attQrUrl(t));q.make();return q.createSvgTag({cellSize:8,margin:2,scalable:true});}
function attPrintQr(svg){const w=window.open("","_blank");if(!w){alert("Brauzer yeni pəncərəni blokladı — icazə ver.");return;}
  w.document.write(`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>MezMoon — ofis QR</title><style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#1A1626}svg{width:380px;height:380px}h1{font-size:34px;margin:0 0 6px}p{font-size:18px;margin:4px 0;color:#4A4460}</style></head><body><h1>Ofisə giriş / çıxış</h1><p>Telefonun kamerası ilə oxut → «Giriş» və ya «Çıxış» bas</p>${svg}<p style="margin-top:14px">MezMoon CRM · panel.mezmoonagency.az</p><script>setTimeout(()=>print(),300)<\/script></body></html>`);w.document.close();}
async function attSetup(p){const {data,error}=await sb.rpc("office_qr_setup",p);if(error){alert("Xəta: "+error.message);return null;}att.data=null;render();return data;}
function renderAttQr(wrap){
  const c=att.data.cfg;const p=el("div","panel");
  p.appendChild(el("div","ph",`<h3>Ofis QR-ı və lokasiya</h3>`));
  const pb=el("div","pb");
  pb.innerHTML=`<div class="hint" style="white-space:normal;margin-bottom:12px">1) Ofisdə olanda «📍 Ofis lokasiyasını götür» bas. 2) QR-ı çap et və ofisin girişinə as. İşçilər hər gəlib-gedəndə QR-ı telefonla oxudub «Giriş» / «Çıxış» basır — panel telefonun lokasiyasını ofislə müqayisə edir.</div>
    <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
      <div id="att-qr" style="width:220px;height:220px;background:#fff;border-radius:12px;display:grid;place-items:center;padding:8px;color:#888">${c?"QR hazırlanır…":"Əvvəlcə lokasiyanı götür"}</div>
      <div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:10px">
        <div><b>Ofis lokasiyası:</b> ${c&&c.lat!=null?`<a href="https://maps.google.com/?q=${c.lat},${c.lng}" target="_blank" rel="noopener">${c.lat.toFixed(5)}, ${c.lng.toFixed(5)} ↗</a>`:`<span style="color:var(--warn)">təyin olunmayıb</span>`}</div>
        <div class="field" style="margin:0;max-width:260px"><label>İcazə verilən radius (metr)</label><input id="att-r" type="number" min="50" max="1000" step="10" value="${att.radius}"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="att-loc">📍 Ofis lokasiyasını götür</button>${c?`<button class="btn ghost" id="att-rs">Radiusu saxla</button><button class="btn ghost" id="att-pr">🖨 QR-ı çap et</button><button class="btn ghost" id="att-rot" style="color:var(--crit)">QR-ı yenilə</button>`:""}</div>
        <div class="hint" id="att-msg" style="white-space:normal">Radius: ofisdən bu qədər uzaqlıqda giriş qəbul olunur (bina içində GPS 20–50 m səhv edə bilər, 150 m tövsiyə olunur). «QR-ı yenilə» — köhnə QR işləməz, yenisini çap etmək lazımdır.</div>
      </div></div>`;
  p.appendChild(pb);wrap.appendChild(p);
  const rad=()=>Math.max(50,Math.min(1000,+pb.querySelector("#att-r").value||150));
  pb.querySelector("#att-loc").onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent="📍 Lokasiya alınır…";
    try{const pos=await getPos();await attSetup({p_lat:pos.coords.latitude,p_lng:pos.coords.longitude,p_radius:rad(),p_rotate:false});toast("✓ Ofis lokasiyası saxlanıldı (dəqiqlik ~"+Math.round(pos.coords.accuracy)+" m)","ok");}
    catch(err){alert(geoErr(err));b.disabled=false;b.textContent="📍 Ofis lokasiyasını götür";}};
  if(!c)return;
  pb.querySelector("#att-rs").onclick=()=>attSetup({p_lat:null,p_lng:null,p_radius:rad(),p_rotate:false}).then(t=>t&&toast("✓ Radius saxlanıldı","ok"));
  pb.querySelector("#att-rot").onclick=()=>{if(confirm("QR yenilənsin? Köhnə çap olunmuş QR artıq işləməyəcək."))attSetup({p_lat:null,p_lng:null,p_radius:rad(),p_rotate:true}).then(t=>t&&toast("✓ Yeni QR hazırdır — çap et","ok"));};
  attQrSvg(c.token).then(svg=>{const b=pb.querySelector("#att-qr");if(b){b.innerHTML=svg;b.querySelector("svg").style.cssText="width:100%;height:100%";}
    pb.querySelector("#att-pr").onclick=()=>attPrintQr(svg);}).catch(()=>{const b=pb.querySelector("#att-qr");if(b)b.textContent="QR kitabxanası yüklənmədi";});
}
function renderAttendance(){
  const wrap=el("div");
  if(!att.data&&!att.loading)loadAttendance();
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap";
  const seg=el("div","seg");seg.style.margin="0";
  [["day","Gün"],["month","Ay"],["qr","📱 QR və lokasiya"],["panel","💻 Panelə girişlər"]].forEach(([k,l])=>{const b=el("button",att.tab===k?"on":"",l);b.onclick=()=>{if(k==="panel")lgRows=null;att.tab=k;render();};seg.appendChild(b);});
  if(att.tab==="panel")return renderLogins(seg);
  bar.appendChild(seg);
  if(att.tab==="day"){const i=el("input");i.type="date";i.value=att.day;i.max=bakuISO();i.onchange=()=>{att.day=i.value||bakuISO();if(att.day.slice(0,7)!==att.month)att.month=att.day.slice(0,7);att.data=null;render();};bar.appendChild(i);}
  if(att.tab==="month"){const i=el("input");i.type="month";i.value=att.month;i.onchange=()=>{att.month=i.value||bakuISO().slice(0,7);att.data=null;render();};bar.appendChild(i);}
  const rb=el("button","mini","↻ Yenilə");rb.style.marginLeft="auto";rb.onclick=()=>{att.data=null;render();};bar.appendChild(rb);
  wrap.appendChild(bar);
  if(!att.data){wrap.appendChild(el("div","panel",`<div class="empty">Yüklənir…</div>`));return wrap;}
  if(att.err){wrap.appendChild(el("div","panel",`<div class="empty">${/office_|does not exist|schema cache/i.test(att.err)?"QR giriş-çıxış hələ qurulmayıb — «sql/qr_checkin.sql» Supabase-də işlədilməlidir.":"Xəta: "+esc(att.err)}</div>`));return wrap;}
  if(att.tab==="qr"){renderAttQr(wrap);return wrap;}
  if(!att.data.cfg||att.data.cfg.lat==null)wrap.appendChild(el("div","hint",`<div style="margin:-4px 2px 12px;display:flex;align-items:center;gap:6px"><span class="dotc" style="background:var(--warn)"></span>Ofis QR-ı hələ qurulmayıb — «📱 QR və lokasiya» bölməsindən qur.</div>`));
  const people=state.profiles.filter(p=>p.role&&ROLES[p.role]).sort((a,b)=>(a.full_name||a.username).localeCompare(b.full_name||b.username,"az"));
  const nm=p=>p.full_name||p.username;
  if(att.tab==="day"){
    const per=attDay(att.day);const p=el("div","panel");
    const came=people.filter(x=>per[x.id]).length;
    p.appendChild(el("div","ph",`<h3>${esc(att.day.split("-").reverse().join("."))}</h3><span class="count">${came}/${people.length} işçi ofisdə olub</span>`));
    const tw=el("div","tablewrap");
    tw.innerHTML=`<table><thead><tr><th>İşçi</th><th>Giriş</th><th>Çıxış</th><th>Ofisdə</th><th>Vəziyyət</th></tr></thead><tbody>${people.map(x=>{const o=per[x.id];
      if(!o)return `<tr><td><strong>${esc(nm(x))}</strong><div class="hint">${esc(ROLES[x.role].label)}</div></td><td>—</td><td>—</td><td>—</td><td><span class="chip c-mut">Gəlməyib</span></td></tr>`;
      const a=attFlags(att.day,o);const chips=[];
      if(a.here)chips.push(`<span class="chip c-good">Ofisdədir</span>`);
      if(a.away)chips.push(`<span class="chip c-mut">Çıxıb</span>`);
      if(a.noOut)chips.push(`<span class="chip c-warn">Çıxış qeyd olunmayıb</span>`);
      if(a.late)chips.push(`<span class="chip c-warn">Gecikib ${a.late<60?a.late+" dəq":durTxt(a.late)}</span>`);
      if(a.early)chips.push(`<span class="chip c-crit">Tez çıxıb ${a.early<60?a.early+" dəq":durTxt(a.early)}</span>`);
      if(!chips.length)chips.push(`<span class="chip c-good">Vaxtında</span>`);
      return `<tr><td><strong>${esc(nm(x))}</strong><div class="hint">${esc(ROLES[x.role].label)}</div></td><td class="num">${hhmm(a.f)}</td><td class="num">${a.here||a.noOut?"—":hhmm(a.l)}</td><td class="num">${durTxt(a.dur)}</td><td>${chips.join(" ")}</td></tr>`;}).join("")||`<tr><td colspan="5"><div class="empty">İşçi yoxdur</div></td></tr>`}</tbody></table>`;
    p.appendChild(tw);wrap.appendChild(p);
  }else{
    const [y,m]=att.month.split("-").map(Number);const days=[];const last=new Date(Date.UTC(y,m,0)).getUTCDate();
    for(let d=1;d<=last;d++){const iso=att.month+"-"+String(d).padStart(2,"0");if(iso>bakuISO())break;const wd=new Date(iso+"T12:00:00Z").getUTCDay();if(wd!==0&&wd!==6)days.push(iso);}
    const sum={};people.forEach(x=>sum[x.id]={days:0,late:0,early:0,min:0,firstSum:0});
    days.forEach(day=>{const per=attDay(day);Object.entries(per).forEach(([pid,o])=>{const s=sum[pid];if(!s)return;const a=attFlags(day,o);s.days++;if(a.late)s.late++;if(a.early)s.early++;s.min+=a.dur;s.firstSum+=a.f;});});
    const p=el("div","panel");p.appendChild(el("div","ph",`<h3>${MONTHS_AZ[m-1]} ${y}</h3><span class="count">${days.length} iş günü (B.e–Cümə)</span>`));
    const tw=el("div","tablewrap");
    tw.innerHTML=`<table><thead><tr><th>İşçi</th><th>Gəldiyi gün</th><th>Gecikmə</th><th>Tez çıxma</th><th>Orta giriş</th><th>Cəmi saat</th></tr></thead><tbody>${Object.entries(sum).map(([pid,s])=>{const x=people.find(q=>q.id===pid);
      return `<tr><td><strong>${esc(nm(x))}</strong></td><td class="num">${s.days}/${days.length}</td><td class="num" style="color:var(--${s.late?'warn':'muted'})">${s.late}</td><td class="num" style="color:var(--${s.early?'crit':'muted'})">${s.early}</td><td class="num">${s.days?hhmm(Math.round(s.firstSum/s.days)):"—"}</td><td class="num">${durTxt(s.min)}</td></tr>`;}).join("")||`<tr><td colspan="6"><div class="empty">İşçi yoxdur</div></td></tr>`}</tbody></table>`;
    p.appendChild(tw);wrap.appendChild(p);
  }
  return wrap;
}

let auditRows=null,auditErr="",auditLoading=false;
const auditF={tbl:"",act:"",user:"",q:"",days:"7"};
const AUD_TBL={clients:"Müştəri",content:"Kontent",briefs:"Brif",shoots:"Çəkiliş",tasks:"Task",reports:"Hesabat",meetings:"İclas",annotations:"Rəy",payments:"Ödəniş",expenses:"Xərc",profiles:"İstifadəçi",comments:"Şərh"};
const AUD_ACT={insert:["Yaratdı","good"],update:["Dəyişdi","accent"],delete:["Sildi","crit"]};
const AUD_FIELD={name:"Ad",title:"Başlıq",client:"Müştəri",status:"Status",pkg:"Paket",fee:"Aylıq ödəniş",pay_day:"Ödəniş günü",video_quota:"Video kvotası",month:"Ay",platform:"Platforma",file:"Fayl",designer:"Dizayner",motion_by:"Motion",ref_link:"Referans",brief_file:"Brif faylları",shoot_date:"Tarix",shoot_time:"Saat",video_op:"Video op",photo_op:"Foto op",model_name:"Model",held:"Baş tutma",stage:"Mərhələ",kind:"Növ",role:"Vəzifə",assignees:"Şəxslər",deadline:"Deadline",note:"Qeyd",notes:"Qeyd",amount:"Məbləğ",rating:"Reytinq",satisfied:"Razı qaldı",next_month:"Gələn ay",meeting_date:"İclas tarixi",appr_ceo:"CEO təsdiqi",appr_marketing:"Marketinq təsdiqi",appr_pm:"PM təsdiqi",ad_account_id:"Reklam hesabı",username:"İstifadəçi adı",full_name:"Ad Soyad",text:"Mətn",body:"Mətn"};
function fmtWhen(iso){const d=new Date(iso);if(isNaN(d))return String(iso||"");const p2=n=>String(n).padStart(2,"0");return `${p2(d.getDate())}.${p2(d.getMonth()+1)}.${String(d.getFullYear()).slice(2)} · ${p2(d.getHours())}:${p2(d.getMinutes())}`;}
function audVal(v,k){
  if(v===null||v===undefined||v==="")return "—";
  if(v===true)return "✓ bəli";if(v===false)return "✗ xeyr";
  if(k==="role")return ROLES[v]?ROLES[v].label:String(v);
  if(k==="assignees"&&Array.isArray(v))return v.map(id=>{const p=state.profiles.find(x=>x.id===id);return p?(p.full_name||p.username):"?";}).join(", ")||"—";
  if(k==="stage"&&typeof v==="number")return SHOOT_STAGES[v-1]||String(v);
  if(k==="held")return v==="yes"?"Baş tutdu":v==="no"?"Baş tutmadı":String(v);
  if((k==="fee"||k==="amount")&&typeof v==="number")return money(v);
  let s=typeof v==="object"?JSON.stringify(v):String(v);
  if(/^\d{4}-\d{2}-\d{2}T\d/.test(s))s=fmtWhen(s);
  return s.length>90?s.slice(0,90)+"…":s;
}
async function loadAudit(){
  auditLoading=true;auditErr="";
  let q=sb.from('audit_log').select('*').order('at',{ascending:false}).limit(500);
  if(auditF.days)q=q.gte('at',new Date(Date.now()-(+auditF.days)*864e5).toISOString());
  if(auditF.tbl)q=q.eq('tbl',auditF.tbl);
  if(auditF.act)q=q.eq('action',auditF.act);
  const {data,error}=await q;
  auditLoading=false;
  if(error){auditErr=error.message;auditRows=[];}else auditRows=data||[];
  if(view==="audit")render();
}
function renderAudit(){
  const wrap=el("div");
  if(auditRows===null&&!auditLoading)loadAudit();
  const bar=el("div");bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px";
  const selSt="font-size:13px;padding:8px 11px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--ink)";
  const mkSel=(key,opts)=>{const s=el("select");s.style.cssText=selSt;s.innerHTML=opts.map(([v,l])=>`<option value="${esc(v)}"${String(auditF[key])===String(v)?" selected":""}>${esc(l)}</option>`).join("");
    s.onchange=()=>{auditF[key]=s.value;if(key!=="user")auditRows=null;render();};return s;};
  bar.appendChild(mkSel("days",[["1","Son 24 saat"],["7","Son 7 gün"],["30","Son 30 gün"],["180","Son 6 ay"]]));
  bar.appendChild(mkSel("act",[["","Bütün əməliyyatlar"],["insert","Yaradılanlar"],["update","Dəyişdirilənlər"],["delete","Silinənlər"]]));
  bar.appendChild(mkSel("tbl",[["","Bütün bölmələr"],...Object.entries(AUD_TBL)]));
  bar.appendChild(mkSel("user",[["","Bütün işçilər"],...state.profiles.map(p=>[p.id,p.full_name||p.username])]));
  const s=el("input","search");s.placeholder="Axtar (ad, başlıq, dəyər)…";s.value=auditF.q;
  s.oninput=()=>{auditF.q=s.value;const l=wrap.querySelector("#aud-list");if(l)l.replaceWith(auditList());};
  bar.appendChild(s);
  const rb=el("button","mini","↻ Yenilə");rb.style.marginLeft="auto";rb.onclick=()=>{auditRows=null;render();};bar.appendChild(rb);
  wrap.appendChild(bar);
  wrap.appendChild(auditList());
  return wrap;
}
function auditList(){
  const p=el("div","panel");p.id="aud-list";
  if(auditRows===null||auditLoading){p.appendChild(el("div","empty","Yüklənir…"));return p;}
  if(auditErr){p.appendChild(el("div","empty",/audit_log|does not exist|schema cache/i.test(auditErr)?"Tarixçə hələ qurulmayıb — «tarixce-audit.sql» faylını Supabase SQL Editor-da işlət.":"Xəta: "+esc(auditErr)));return p;}
  const q=fold(auditF.q.trim());
  const rows=auditRows.filter(r=>(!auditF.user||r.user_id===auditF.user)&&(!q||fold([r.user_name,r.label,AUD_TBL[r.tbl],JSON.stringify(r.changes||{}),JSON.stringify(r.old_row||{})].join(" ")).includes(q)));
  const nDel=rows.filter(r=>r.action==="delete").length;
  p.appendChild(el("div","ph",`<h3>Əməliyyatlar</h3><span class="count">${rows.length}${auditRows.length>=500?" · son 500":""}${nDel?` · <span style="color:var(--crit)">${nDel} silinmə</span>`:""}</span>`));
  if(!rows.length){p.appendChild(el("div","empty","Bu filtrə uyğun dəyişiklik yoxdur"));return p;}
  const box=el("div");
  rows.forEach(r=>{
    const [al,ac]=AUD_ACT[r.action]||[r.action,"mut"];
    let det="";
    if(r.action==="update"&&r.changes){
      const ent=Object.entries(r.changes);
      det=`<div class="aud-ch">${ent.slice(0,12).map(([k,pair])=>{const [o,n]=Array.isArray(pair)?pair:[null,pair];return `<div><span class="k">${esc(AUD_FIELD[k]||k)}:</span> <span class="o">${esc(audVal(o,k))}</span> → <span class="n">${esc(audVal(n,k))}</span></div>`;}).join("")}${ent.length>12?`<div class="k">+${ent.length-12} sahə</div>`:""}</div>`;
    }
    if(r.action==="delete"&&r.old_row){
      const o=r.old_row;
      const bits=["client","status","month","shoot_date","video_op","model_name","amount","deadline"].filter(k=>o[k]!=null&&o[k]!==""&&!(k==="client"&&r.label===o[k])).map(k=>`${AUD_FIELD[k]||k}: ${audVal(o[k],k)}`);
      det=(bits.length?`<div class="aud-ch"><div class="k">${esc(bits.join(" · "))}</div></div>`:"")+(r.tbl!=="profiles"?`<div style="margin-top:7px"><button class="mini" data-restore="${esc(r.id)}">↩ Bərpa et</button></div>`:"");
    }
    const row=el("div","aud-row");
    row.innerHTML=`<div class="aud-when">${esc(fmtWhen(r.at))}</div><div style="min-width:0"><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><strong style="font-size:13px">${esc(r.user_name||"Naməlum")}</strong><span class="chip c-${ac}" style="font-size:10.5px">${al}</span><span class="chip c-mut" style="font-size:10.5px">${esc(AUD_TBL[r.tbl]||r.tbl)}</span><span style="font-size:13px;font-weight:600;overflow-wrap:anywhere">${esc(r.label||"")}</span></div>${det}</div>`;
    box.appendChild(row);
  });
  p.appendChild(box);
  box.querySelectorAll("[data-restore]").forEach(b=>b.onclick=()=>restoreDeleted(auditRows.find(x=>String(x.id)===b.dataset.restore),b));
  return p;
}
async function restoreDeleted(r,btn){
  if(!r||!r.old_row)return;
  if(!confirm(`«${r.label||AUD_TBL[r.tbl]||r.tbl}» (${AUD_TBL[r.tbl]||r.tbl}) geri qaytarılsın?`))return;
  if(btn){btn.disabled=true;btn.textContent="⏳";}
  const row={...r.old_row};let error=null;
  for(let i=0;i<8;i++){
    ({error}=await sb.from(r.tbl).insert(row));
    if(!error)break;
    const m=error.message||"";
    if(/duplicate key/i.test(m)){error={message:"Bu qeyd artıq mövcuddur (bəlkə artıq bərpa olunub)."};break;}
    const col=(m.match(/'([^']+)' column/)||m.match(/column "([^"]+)"/)||[])[1];
    if(/identity|DEFAULT/i.test(m)&&"id" in row){delete row.id;continue;}
    if(col&&col in row){delete row[col];continue;}
    break;
  }
  if(error){alert("Bərpa alınmadı: "+error.message);if(btn){btn.disabled=false;btn.textContent="↩ Bərpa et";}return;}
  if(state[r.tbl]!==undefined)await reload(r.tbl);
  alert("Bərpa olundu ✓");
  auditRows=null;if(view==="audit")render();
}

/* ---------- Yeni müştərilər (lidlər, Instagram audit, təklif səhifələri) ---------- */
const LEAD_ROLES=["ceo","pm","marketing"];
const LEAD_ST=[["Yeni","accent"],["Əlaqə saxlanıldı","warn"],["Görüş","warn"],["Təklif göndərildi","accent"],["Razılaşdı","good"],["İmtina","mut"]];
const LEAD_OPEN=new Set(["Yeni","Əlaqə saxlanıldı","Görüş","Təklif göndərildi"]);
const LEAD_SRC=[["manual","Əl ilə"],["audit","Instagram audit"],["maps","Google Maps"],["sayt","Sayt"],["tovsiye","Tövsiyə"],["gorus","Görüş"],["zeng","Zəng / mesaj"]];
const AUDIT_FUNC_URL=SB_URL+"/functions/v1/ig-audit";
const RESEARCH_FUNC_URL=SB_URL+"/functions/v1/lead-research";
const AUDIT_SECTORS=[["turizm","Turizm"],["horeca","Restoran / məkan"],["tehsil","Təhsil"],["gozellik","Gözəllik / klinika"],["ticaret","Mağaza / brend"],["umumi","Digər"]];
const PROP_URL="https://mezmoonagency.az/teklif.html?p=";
const PROP_PRESETS=[
  {key:"std",label:"6 video + 8 kontent",pk:{name:"Standart",tag:"Aylıq paket",desc:"Video və kontent bir paketdə.",price:1500,hi:[{n:"6",l:"video / ay"},{n:"8",l:"kontent / ay"}],
    items:["Ayda 6 video: ssenari, çəkiliş, montaj, rəng korreksiyası","Ayda 8 kontent: post, karusel və story dizaynları","Aylıq kontent planı, AZ/RU mətnlər və hashtag","Paylaşımların vaxtında yerləşdirilməsi","Aylıq hesabat: baxış, reach, ən yaxşı paylaşım"]}},
  {key:"atm",label:"6 video + 6 kontent + 2 atmosfer",pk:{name:"Standart+",tag:"Aylıq paket",desc:"Video, kontent və atmosfer çəkilişi.",price:1500,hi:[{n:"6",l:"video / ay"},{n:"6",l:"kontent / ay"},{n:"2",l:"atmosfer"}],
    items:["Ayda 6 video: ssenari, çəkiliş, montaj","Ayda 6 kontent: post, karusel və story dizaynları","Ayda 2 atmosfer çəkilişi: axşam və gecə ab-havası","Aylıq kontent planı, AZ/RU mətnlər","Aylıq hesabat"]}},
  {key:"ads",label:"Premium + targeting",pk:{name:"Premium",tag:"Aylıq paket",desc:"Kontent + reklam idarəçiliyi.",price:2500,hi:[{n:"10",l:"video / ay"},{n:"12",l:"kontent / ay"},{n:"✓",l:"Meta Ads"}],
    items:["Ayda 10 video","Ayda 12 kontent","Meta Ads kampaniyalarının qurulması və gündəlik optimizasiyası","Kreator / bloger əməkdaşlıqları","Həftəlik nəticə hesabatı"]}}
];
let leadTab="pipe",leadQ="",auditBusy=false;
const leadCanAdd=()=>LEAD_ROLES.includes(role);
const igHandle2=s=>{let h=String(s||"").trim();const m=h.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);if(m)h=m[1];return h.replace(/^@/,"").replace(/[/?#].*$/,"").toLowerCase();};
const fmtK2=n=>{n=Number(n||0);return n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,"")+"M":n>=1e3?(n/1e3).toFixed(1).replace(/\.0$/,"")+"K":String(Math.round(n));};
const scoreCol=s=>s>=80?"good":s>=55?"warn":"crit";
function scoreChip(a,small){if(!a||a.score==null)return "";return `<span class="chip c-${scoreCol(a.score)}" style="font-size:${small?10:11}px" title="Instagram audit balı">◎ ${a.score}/100</span>`;}
function leadProps(l){return state.proposals.filter(p=>p.lead_id===l.id).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));}
function propLink(p){return PROP_URL+encodeURIComponent(p.slug);}
function slugify(s){const m={"ə":"e","ı":"i","ö":"o","ü":"u","ş":"s","ç":"c","ğ":"g","İ":"i","Ə":"e","Ö":"o","Ü":"u","Ş":"s","Ç":"c","Ğ":"g"};
  return String(s||"").replace(/[əıöüşçğİƏÖÜŞÇĞ]/g,c=>m[c]).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40)||"teklif";}
async function runAudit(handle){
  const h=igHandle2(handle);if(!h)throw new Error("Instagram adını yazın");
  const {data}=await sb.auth.getSession();const tok=data&&data.session?data.session.access_token:"";
  const r=await fetch(AUDIT_FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+tok},body:JSON.stringify({handle:h})});
  const j=await r.json().catch(()=>({ok:false,error:"cavab yoxdur ("+r.status+")"}));
  if(!j.ok)throw new Error(j.error||"Audit alınmadı");
  return j.audit;
}
/* Audit hesabatı (modal və lid kartı üçün) */
function researchHtml(r){
  const head=(t,c)=>`<div style="font-size:12px;font-weight:700;color:var(--${c||"accent-ink"});margin-top:12px">${t}</div>`;
  const sec=(t,arr,c)=>(arr||[]).length?`${head(t,c)}<ul style="margin:2px 0 6px;padding-left:18px;font-size:13px">${arr.map(x=>`<li style="margin:4px 0">${esc(x)}</li>`).join("")}</ul>`:"";
  const td=(t,arr,c)=>(arr||[]).length?`${head(t,c)}<ul style="margin:2px 0 6px;padding-left:18px;font-size:13px">${arr.map(n=>`<li style="margin:4px 0">${n.t?`<b>${esc(n.t)}:</b> `:""}${esc(n.d)}</li>`).join("")}</ul>`:"";
  const safeUrl=u=>/^https?:\/\//i.test(String(u||""))?u:"#";
  const d=r.deck||{},m=r.market||{};
  const srcs=m.sources||r.sources||[];
  return `${(d.summary||r.summary)?`<div style="font-size:14px;font-weight:600;line-height:1.45">${esc(d.summary||r.summary)}</div>`:""}
    ${(r.notes||[]).length||r.posts_note?`<div class="chip c-warn" style="white-space:normal;margin-top:8px;font-size:11.5px">${esc([r.posts_note,...(r.notes||[])].filter(Boolean).join(" · "))}</div>`:""}
    ${td("📱 Instagram analizi",d.ig)}
    ${(d.posts||[]).length?`${head("🎞️ Paylaşımlar")}<div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">${d.posts.map(p=>`<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener" style="display:flex;gap:10px;align-items:flex-start;text-decoration:none;color:inherit;font-size:13px">${p.img?`<img src="${esc(p.img)}" alt="" style="width:52px;height:68px;object-fit:cover;border-radius:8px;flex:none">`:""}<span><b>${esc(p.verdict||"")}</b> ${esc(p.note)}</span></a>`).join("")}</div>`:""}
    ${sec("✅ Müsbət tərəflər",d.pros,"good")}${sec("⚠️ Mənfi tərəflər",d.cons,"crit")}
    ${td("🤝 Vədimiz",d.promises,"good")}
    ${(d.targets||[]).length?`${head("🎯 Hədəflər (zəmanət deyil, yoxlayın)","warn")}<ul style="margin:2px 0 6px;padding-left:18px;font-size:13px">${d.targets.map(t=>`<li style="margin:4px 0"><b>${esc(t.metric)}:</b> ${esc(t.now||"—")} → ${esc(t.goal)}${t.when?` · ${esc(t.when)}`:""}</li>`).join("")}</ul>`:""}
    ${(d.plan||[]).length?`${head("🗓️ Plan")}${d.plan.map(p=>`<div style="font-size:13px;margin:6px 0"><b>${esc(p.period)}${p.focus?`: ${esc(p.focus)}`:""}</b><ul style="margin:2px 0;padding-left:18px">${(p.items||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}`:""}
    ${td("🧭 Strategiya",d.needs||r.needs)}
    <details style="margin-top:10px;font-size:13px"><summary style="cursor:pointer;font-weight:600">Bazar araşdırması (daxili)</summary>
      ${sec("🌍 Dünyada işləyən marketinq",m.global||r.global)}${sec("📍 Bakı",m.local||r.local)}${sec("👥 Auditoriya",m.audience||r.audience)}${sec("⚔️ Rəqiblər",m.competitors||r.competitors)}${sec("🔎 Brend",m.brand||r.brand)}
      ${srcs.length?`${head("Mənbələr")}<div style="font-size:12px;display:flex;flex-direction:column;gap:3px">${srcs.map(x=>`<a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener" style="color:var(--accent-ink)">${esc(x.title)}</a>`).join("")}</div>`:""}
    </details>
    ${sec("🔒 Yalnız daxili (müştəriyə göstərilmir)",d.internal||r.internal)}
    ${r.raw?`<div style="white-space:pre-wrap;font-size:13px;margin-top:8px">${esc(r.raw)}</div>`:""}
    <div class="hint" style="margin-top:10px;font-size:11px">${esc(fmtWhen(r.at))} · ${r.searches||0} axtarış · ~$${Number(r.cost_usd||0).toFixed(2)}</div>`;
}
function openResearch(l){
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:680px"><div class="mh"><h3>📊 Təqdimat · ${esc(l.name)}</h3><button data-x>×</button></div><div class="mb" data-b></div><div class="mf"><button class="btn ghost" data-run></button><button class="btn" data-prop>📄 Təklif hazırla</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const body=scrim.querySelector("[data-b]"),run=scrim.querySelector("[data-run]");
  let cur=l.research||null;
  const draw=()=>{body.innerHTML=cur?researchHtml(cur):`<div class="empty">Hələ təqdimat yoxdur. Son 12 paylaşım tək-tək oxunacaq, bazar və rəqiblər araşdırılacaq, sonra müsbət/mənfi tərəflər, vədimiz, hədəflər və plan yazılacaq. Apify və Anthropic balansından pul xərcləyir, 3–5 dəqiqə çəkir. Bu pəncərəni bağlamayın.</div>`;run.textContent=cur?"🔄 Yenidən hazırla":"📊 Təqdimatı hazırla";};
  draw();
  scrim.querySelector("[data-prop]").onclick=()=>{close();openPropForm(state.leads.find(x=>x.id===l.id)||l);};
  run.onclick=async()=>{
    if(cur&&!confirm(`Yenidən hazırlamaq yenə pul xərcləyəcək (son dəfə ~$${Number(cur.cost_usd||0).toFixed(2)}). Davam edilsin?`))return;
    run.disabled=true;
    try{const {data}=await sb.auth.getSession();const tok=data&&data.session?data.session.access_token:"";
      const pk=(leadProps(l)[0]||{}).packages;const packages=pk&&pk.length?pk:PROP_PRESETS.map(p=>p.pk);
      const call=async step=>{const r=await fetch(RESEARCH_FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+tok},body:JSON.stringify({lead_id:l.id,step,packages})});
        const j=await r.json().catch(()=>({ok:false,error:"cavab yoxdur (vaxt limiti ola bilər), yenidən cəhd edin"}));if(!j.ok)throw new Error(j.error||"alınmadı");return j.research;};
      for(const [step,txt] of [["posts","⏳ 1/3 Paylaşımlar oxunur…"],["market","⏳ 2/3 Bazar araşdırılır…"],["deck","⏳ 3/3 Təqdimat yazılır…"]]){run.textContent=txt;cur=await call(step);}
      await reload('leads');}
    catch(e){alert("Təqdimat alınmadı: "+(e.message||e));}
    run.disabled=false;draw();};
}
function auditHtml(a){
  if(!a)return "";
  const m=(v,l,h)=>`<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:9px 11px"><div class="num" style="font-size:17px;font-weight:700${h?";color:var(--accent-ink)":""}">${v}</div><div class="hint" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.05em">${l}</div></div>`;
  const li=(arr,c)=>(arr||[]).map(x=>`<li style="margin:4px 0;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:.55em;width:6px;height:6px;border-radius:50%;background:var(--${c})"></span>${esc(x)}</li>`).join("");
  const last=a.days_since_last==null?"—":a.days_since_last===0?"bu gün":a.days_since_last+" gün əvvəl";
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      ${a.pic?`<img src="${esc(a.pic)}" alt="" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex:none">`:`<div class="avatar" style="width:52px;height:52px;font-size:20px">${esc((a.name||"?")[0])}</div>`}
      <div style="min-width:0;flex:1"><div style="font-weight:700;font-size:15px">${esc(a.name||a.handle)}</div><a href="https://www.instagram.com/${esc(a.handle)}/" target="_blank" rel="noopener" class="hint" style="text-decoration:none">@${esc(a.handle)}${a.category?" · "+esc(a.category):""}</a>${a.sector_name?`<div style="margin-top:3px"><span class="chip c-accent" style="font-size:10.5px">${esc(a.sector_name)}</span></div>`:""}</div>
      <div style="text-align:right"><div class="num" style="font-size:30px;font-weight:800;color:var(--${scoreCol(a.score)})">${a.score}</div><div class="hint" style="font-size:10px">/ 100 BAL</div></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:7px;margin-bottom:12px">
      ${m(fmtK2(a.followers),"izləyici")}${m(a.er+"%","engagement")}${m(a.reels_share+"%","video payı")}${m(a.posts_30d,"paylaşım / 30 gün")}${m(a.per_week,"həftədə")}${m(a.med_views?fmtK2(a.med_views):"—","tipik baxış")}${m(a.max_views?fmtK2(a.max_views):"—","ən yaxşı video",1)}${m(last,"son paylaşım")}
    </div>
    ${(a.good||[]).length?`<div style="font-size:12px;font-weight:700;color:var(--good);margin-top:4px">Güclü tərəflər</div><ul style="margin:2px 0 8px;padding:0;list-style:none;font-size:13px">${li(a.good,"good")}</ul>`:""}
    ${(a.bad||[]).length?`<div style="font-size:12px;font-weight:700;color:var(--crit)">Problemlər</div><ul style="margin:2px 0 8px;padding:0;list-style:none;font-size:13px">${li(a.bad,"crit")}</ul>`:""}
    ${(a.recs||[]).length?`<div style="font-size:12px;font-weight:700;color:var(--accent-ink)">Tövsiyələr (satış danışığı üçün)</div><ul style="margin:2px 0 8px;padding:0;list-style:none;font-size:13px">${li(a.recs,"accent")}</ul>`:""}
    ${(a.top||[]).filter(t=>t.img).length?`<div style="display:flex;gap:7px;margin-top:6px">${a.top.filter(t=>t.img).map(t=>`<a href="${esc(t.url)}" target="_blank" rel="noopener" style="flex:1;position:relative;display:block;border-radius:9px;overflow:hidden;aspect-ratio:4/5;background:var(--surface-2)"><img src="${esc(t.img)}" alt="" style="width:100%;height:100%;object-fit:cover"><span style="position:absolute;left:6px;bottom:5px;font-size:11px;font-weight:700;color:#fff;text-shadow:0 1px 3px #000">${t.views?"▶ "+fmtK2(t.views):"♥ "+fmtK2(t.likes)}</span></a>`).join("")}</div>`:""}
    <div class="hint" style="margin-top:8px;font-size:11px">Apify · ${esc(fmtWhen(a.at))} · son ${a.analysed} paylaşım analiz olundu</div>`;
}
function renderLeads(){
  const wrap=el("div");
  const L=state.leads,P=state.proposals;
  const open=L.filter(l=>LEAD_OPEN.has(l.status));
  const mStart=bakuISO().slice(0,7);
  const viewed=P.filter(p=>p.views>0);
  wrap.appendChild(el("div","tiles",
    tile("Aktiv lidlər",open.length,`${L.filter(l=>l.status==="Yeni").length} yeni`,true)
    +tile("Bu ay əlavə",L.filter(l=>String(l.created_at).slice(0,7)===mStart).length,"lid")
    +tile("Təkliflər",P.length,`${viewed.length} açılıb · ${P.reduce((s,p)=>s+(p.views||0),0)} baxış`)
    +tile("Razılaşdı",L.filter(l=>l.status==="Razılaşdı").length,L.length?Math.round(L.filter(l=>l.status==="Razılaşdı").length/L.length*100)+"% konversiya":"")));
  /* Instagram audit */
  const ap=el("div","panel");ap.style.marginBottom="16px";
  ap.appendChild(el("div","ph",`<h3>🔍 Instagram audit</h3><span class="count">Apify · məkanın profilini 15–40 saniyəyə analiz edir</span>`));
  const ab=el("div");ab.style.cssText="display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 16px";
  ab.innerHTML=`<input id="auIn" placeholder="@instagram_adi və ya profil linki" style="flex:1;min-width:200px;font-size:14px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--ink)"><button class="btn" id="auGo">${auditBusy?"⏳ Analiz edilir…":"Analiz et"}</button>`;
  ap.appendChild(ab);wrap.appendChild(ap);
  const go=async()=>{const inp=ab.querySelector("#auIn");const h=igHandle2(inp.value);if(!h){inp.focus();return;}
    const btn=ab.querySelector("#auGo");if(auditBusy)return;auditBusy=true;btn.disabled=true;btn.textContent="⏳ Analiz edilir…";
    try{const a=await runAudit(h);const ex=state.leads.find(l=>igHandle2(l.ig)===a.handle);
      if(ex){await sb.from('leads').update({audit:a,audit_at:new Date().toISOString()}).eq('id',ex.id);await reload('leads');}
      openAuditModal(a,ex?state.leads.find(l=>l.id===ex.id):null);inp.value="";}
    catch(e){alert("Audit alınmadı: "+(e.message||e));}
    auditBusy=false;btn.disabled=false;btn.textContent="Analiz et";};
  ab.querySelector("#auGo").onclick=go;ab.querySelector("#auIn").onkeydown=e=>{if(e.key==="Enter")go();};
  /* tablar */
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap";
  const seg=el("div","seg");seg.style.margin="0";
  [["pipe",`Lidlər · ${L.length}`],["maps",`🔎 Potensial · ${state.prospects.filter(x=>x.status==="new").length}`],["props",`Təkliflər · ${P.length}`]].forEach(([k,l])=>{const b=el("button",leadTab===k?"on":"",l);b.onclick=()=>{leadTab=k;render();};seg.appendChild(b);});
  bar.appendChild(seg);
  const s=el("input","search");s.placeholder="Axtar (ad, @instagram, telefon)…";s.value=leadQ;s.style.marginLeft="auto";
  s.oninput=()=>{leadQ=s.value;const o=wrap.querySelector("#leadBody");if(o)o.replaceWith(leadBody());};bar.appendChild(s);
  wrap.appendChild(bar);
  const leadBody=()=>{const q=fold(leadQ.trim());const box=el("div");box.id="leadBody";
    if(leadTab==="props"){box.appendChild(renderPropList(q));return box;}
    if(leadTab==="maps"){box.appendChild(renderProspects(q));return box;}
    const rows=L.filter(l=>!q||fold([l.name,l.ig,l.phone,l.contact,l.note].join(" ")).includes(q));
    const kan=el("div","kan");
    LEAD_ST.forEach(([st,c])=>{const items=rows.filter(l=>l.status===st).sort((a,b)=>String(a.next_at||"9").localeCompare(String(b.next_at||"9"))||String(b.created_at).localeCompare(String(a.created_at)));
      const col=el("div","col");col.appendChild(el("div","ch",`${st}<span class="n">${items.length}</span>`));
      items.forEach(l=>col.appendChild(leadCard(l,c)));
      if(!items.length)col.appendChild(el("div","hint",`<div style="padding:8px 4px">boş</div>`));
      kan.appendChild(col);});
    box.appendChild(kanWrap(kan));return box;};
  wrap.appendChild(leadBody());
  return wrap;
}
function leadCard(l,c){
  const card=el("div","kcard");card.style.cssText=`border-left:3px solid var(--${c==="mut"?"border":c});cursor:pointer`;
  const ps=leadProps(l);const pv=ps.reduce((s,p)=>s+(p.views||0),0);
  const due=l.next_at&&LEAD_OPEN.has(l.status)?(l.next_at<bakuISO()?"crit":l.next_at===bakuISO()?"warn":"mut"):"";
  card.innerHTML=`<div class="kt" style="display:flex;gap:6px;align-items:flex-start">${l.audit&&l.audit.pic?`<img src="${esc(l.audit.pic)}" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex:none">`:""}<span style="flex:1;min-width:0">${esc(l.name)}</span>${scoreChip(l.audit,1)}</div>
    <div class="km">${l.ig?`<a href="https://www.instagram.com/${esc(igHandle2(l.ig))}/" target="_blank" rel="noopener" data-stop style="color:var(--accent-ink);text-decoration:none">@${esc(igHandle2(l.ig))}</a>`:""}${l.audit?` · ${fmtK2(l.audit.followers)} izləyici`:""}${l.phone?` · ${esc(l.phone)}`:""}</div>
    ${l.note?`<div class="km" style="white-space:normal">${esc(String(l.note).slice(0,110))}</div>`:""}
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px">
      ${due?`<span class="chip c-${due}" style="font-size:10px">${ICON.clock}${esc(fmtDate(l.next_at))}</span>`:""}
      ${ps.length?`<span class="chip c-${pv?"good":"mut"}" style="font-size:10px" title="Təklif səhifəsi">📄 ${ps.length} təklif · ${pv?"👀 "+pv:"açılmayıb"}</span>`:""}
      ${l.status==="İmtina"&&l.lost_reason?`<span class="chip c-mut" style="font-size:10px">${esc(l.lost_reason)}</span>`:""}
    </div>
    <div class="kf" style="flex-wrap:wrap"><button class="mini" data-la title="Instagram audit">${ICON.search}</button><button class="mini" data-lr title="Müştəri təqdimatı: Instagram analizi, bazar, vəd, plan" style="white-space:nowrap">📊 Təqdimat</button><button class="mini" data-lp title="Təklif səhifəsi hazırla" style="white-space:nowrap">Təklif</button>
      <select data-ls style="flex:1 1 100%;min-width:0;font-size:11.5px;padding:4px 6px;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--ink)">${LEAD_ST.map(([s])=>`<option${s===l.status?" selected":""}>${s}</option>`).join("")}</select></div>`;
  card.onclick=e=>{if(e.target.closest("button,select,a,[data-stop]"))return;openLeadForm(l);};
  card.querySelector("[data-la]").onclick=e=>auditLead(l,e.currentTarget);
  card.querySelector("[data-lr]").onclick=()=>openResearch(l);
  card.querySelector("[data-lp]").onclick=()=>openPropForm(l);
  card.querySelector("[data-ls]").onchange=e=>setLeadStatus(l,e.target.value);
  return card;
}
async function setLeadStatus(l,st){
  if(st==="İmtina"){const r=prompt("İmtina səbəbi (istəyə bağlı):",l.lost_reason||"");if(r===null){render();return;}await upd('leads',l.id,{status:st,lost_reason:r.trim()});return;}
  if(st==="Razılaşdı"&&!l.client_id&&confirm(`«${l.name}» müştərilər siyahısına əlavə olunsun?`)){await convertLead(l);return;}
  await upd('leads',l.id,{status:st});
}
async function auditLead(l,btn){
  if(!l.ig){alert("Bu lidin Instagram adı yazılmayıb. Əvvəlcə lidi redaktə edin.");openLeadForm(l);return;}
  const old=btn?btn.innerHTML:"";if(btn){btn.disabled=true;btn.innerHTML="⏳";}
  try{const a=await runAudit(l.ig);await sb.from('leads').update({audit:a,audit_at:new Date().toISOString()}).eq('id',l.id);await reload('leads');openAuditModal(a,state.leads.find(x=>x.id===l.id)||l);}
  catch(e){alert("Audit alınmadı: "+(e.message||e));}
  if(btn){btn.disabled=false;btn.innerHTML=old;}
}
function openAuditModal(a,lead){
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:640px"><div class="mh"><h3>Instagram audit</h3><button data-x>×</button></div><div class="mb">${auditHtml(a)}</div>
    <div class="mf">${lead?`<span class="hint" style="margin-right:auto;align-self:center;display:flex;gap:8px;align-items:center;flex-wrap:wrap">Lidə yazıldı: ${esc(lead.name)}<select data-sec title="Sahə" style="font-size:12.5px;padding:5px 8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink)"><option value="">Sahə seç…</option>${AUDIT_SECTORS.map(([k,n])=>`<option value="${k}"${a.sector===k?" selected":""}>${n}</option>`).join("")}</select></span>`:`<button class="btn ghost" data-save>Lid kimi saxla</button>`}<button class="btn" data-prop>📄 Təklif hazırla</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const secSel=scrim.querySelector("[data-sec]");
  if(secSel)secSel.onchange=async()=>{if(!secSel.value)return;secSel.disabled=true;
    try{const {data}=await sb.auth.getSession();const tok=data&&data.session?data.session.access_token:"";
      const r=await fetch(AUDIT_FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+tok},body:JSON.stringify({action:"recs",audit:a,sector:secSel.value})});
      const j=await r.json().catch(()=>({ok:false,error:"cavab yoxdur"}));if(!j.ok)throw new Error(j.error||"alınmadı");
      Object.assign(a,j.audit);const {error}=await sb.from('leads').update({audit:a}).eq('id',lead.id);if(error)throw new Error(error.message);
      scrim.querySelector(".mb").innerHTML=auditHtml(a);await reload('leads');}
    catch(e){alert("Sahə dəyişmədi: "+(e.message||e));}
    secSel.disabled=false;};
  const save=async()=>{const {data,error}=await sb.from('leads').insert({name:a.name||a.handle,ig:a.handle,source:"audit",audit:a,audit_at:new Date().toISOString(),created_by_name:myName()}).select().single();
    if(error){alert("Xəta: "+error.message);return null;}await reload('leads');return data;};
  const sv=scrim.querySelector("[data-save]");if(sv)sv.onclick=async()=>{sv.disabled=true;const l=await save();if(l){close();openLeadForm(l);}else sv.disabled=false;};
  scrim.querySelector("[data-prop]").onclick=async e=>{e.currentTarget.disabled=true;const l=lead||await save();close();if(l)openPropForm(l);};
}
function openLeadForm(edit){
  const e=edit||{};const isEdit=!!edit;
  const scrim=el("div","scrim");
  const ps=isEdit?leadProps(e):[];
  scrim.innerHTML=`<div class="modal" style="max-width:${isEdit&&e.audit?680:460}px"><div class="mh"><h3>${isEdit?esc(e.name):"Yeni lid"}</h3><button data-x>×</button></div><div class="mb">
    <div class="field"><label>Məkanın adı</label><input id="l1" value="${esc(e.name||"")}" placeholder="məs. Qaysı Lounge"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Instagram</label><input id="l2" value="${esc(e.ig?"@"+igHandle2(e.ig):"")}" placeholder="@hesab və ya link"></div>
      <div class="field"><label>Telefon</label><input id="l3" value="${esc(e.phone||"")}" placeholder="+994 __ ___ __ __"></div>
      <div class="field"><label>Əlaqə şəxsi</label><input id="l4" value="${esc(e.contact||"")}" placeholder="Ad, vəzifə"></div>
      <div class="field"><label>Lokasiya</label><input id="l5" value="${esc(e.location||"")}" placeholder="Ünvan / xəritə linki"></div>
      <div class="field"><label>Mənbə</label><select id="l6">${LEAD_SRC.map(([k,v])=>`<option value="${k}"${(e.source||"manual")===k?" selected":""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label>Mərhələ</label><select id="l7">${LEAD_ST.map(([s])=>`<option${(e.status||"Yeni")===s?" selected":""}>${s}</option>`).join("")}</select></div>
    </div>
    <div class="field"><label>Növbəti addım tarixi</label><input id="l8" type="date" value="${esc(e.next_at||"")}"></div>
    <div class="field"><label>Qeyd</label><textarea id="l9" rows="3" placeholder="Nə danışıldı, nə ilə maraqlanır, büdcə…">${esc(e.note||"")}</textarea></div>
    ${isEdit?`<div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="mini" data-a>🔍 ${e.audit?"Auditi yenilə":"Instagram audit"}</button><button class="mini" data-r>📊 Təqdimat hazırla</button><button class="mini" data-p>📄 Təklif hazırla</button>
      ${role==="ceo"||role==="pm"?`<button class="mini" data-m>📅 Görüş təyin et</button>`:""}
      ${!e.client_id?`<button class="mini" data-c style="color:var(--good)">✅ Müştəriyə çevir</button>`:`<span class="chip c-good" style="font-size:11px">Müştəri siyahısındadır</span>`}
      <button class="mini" data-d style="margin-left:auto;color:var(--crit)">${ICON.trash}</button></div>`:""}
    ${ps.length?`<div class="field"><label>Təkliflər</label>${ps.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="flex:1;min-width:0">${esc(p.title||"Təklif")} <span class="hint">· ${esc(fmtWhen(p.created_at))}</span></span><span class="chip c-${p.views?"good":"mut"}" style="font-size:10.5px">${p.views?"👀 "+p.views+" · "+esc(fmtWhen(p.last_viewed_at)):"açılmayıb"}</span><button class="mini" data-pst="${p.id}" title="Baxış analitikası">📊</button><button class="mini" data-pe="${p.id}" title="Redaktə">${ICON.edit}</button><button class="mini" data-ppdf="${p.id}" title="PDF kimi saxla">📄 PDF</button><button class="mini" data-pc="${p.id}">Link</button></div>`).join("")}</div>`:""}
    ${e.audit?`<div class="field"><label>Son audit</label><div style="border:1px solid var(--border);border-radius:12px;padding:12px">${auditHtml(e.audit)}</div></div>`:""}
  </div><div class="mf"><button class="btn ghost" data-x2>Bağla</button><button class="btn" data-ok>${isEdit?"Yadda saxla":"Əlavə et"}</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.querySelector("[data-x2]").onclick=close;
  const v=id=>scrim.querySelector("#"+id).value.trim();
  const collect=()=>({name:v("l1"),ig:igHandle2(v("l2")),phone:v("l3"),contact:v("l4"),location:v("l5"),source:v("l6"),status:v("l7"),next_at:v("l8")||null,note:v("l9")});
  scrim.querySelector("[data-ok]").onclick=async()=>{const p=collect();if(!p.name){const f=scrim.querySelector("#l1");f.focus();f.style.borderColor="var(--crit)";return;}
    const ok=scrim.querySelector("[data-ok]");ok.disabled=true;
    if(isEdit)await upd('leads',e.id,p);else await ins('leads',{...p,created_by_name:myName()});close();};
  if(isEdit){
    scrim.querySelector("[data-a]").onclick=async b=>{const p=collect();if(p.ig!==igHandle2(e.ig||""))await upd('leads',e.id,{ig:p.ig});close();auditLead({...e,ig:p.ig},null);};
    scrim.querySelector("[data-r]").onclick=()=>{close();openResearch(state.leads.find(x=>x.id===e.id)||e);};
    scrim.querySelector("[data-p]").onclick=()=>{close();openPropForm(state.leads.find(x=>x.id===e.id)||e);};
    const mb=scrim.querySelector("[data-m]");if(mb)mb.onclick=()=>{close();openMeetForm(null,{kind:"new",client:e.name,location:e.location||"",instagram:e.ig?"@"+igHandle2(e.ig):""});
      if(e.status==="Yeni"||e.status==="Əlaqə saxlanıldı")upd('leads',e.id,{status:"Görüş"});};
    const cb=scrim.querySelector("[data-c]");if(cb)cb.onclick=async()=>{close();await convertLead(e);};
    scrim.querySelector("[data-d]").onclick=async()=>{if(!confirm(`«${e.name}» lidi silinsin? Təklif səhifələri qalacaq.`))return;close();await del('leads',e.id);};
    scrim.querySelectorAll("[data-ppdf]").forEach(b=>b.onclick=()=>{const p=state.proposals.find(x=>x.id===b.dataset.ppdf);if(p)propPdf(p);});
    scrim.querySelectorAll("[data-pc]").forEach(b=>b.onclick=()=>{const p=state.proposals.find(x=>x.id===b.dataset.pc);if(p)showPropLink(p);});
    scrim.querySelectorAll("[data-pst]").forEach(b=>b.onclick=()=>{const p=state.proposals.find(x=>x.id===b.dataset.pst);if(p)openPropStats(p);});
    scrim.querySelectorAll("[data-pe]").forEach(b=>b.onclick=()=>{const p=state.proposals.find(x=>x.id===b.dataset.pe);if(p){close();openPropForm(state.leads.find(l=>l.id===p.lead_id)||null,p);}});
  }
}
async function convertLead(l){
  const ex=state.clients.find(c=>fold(c.name)===fold(l.name));
  let cid=ex?ex.id:null;
  if(!ex){const p=leadProps(l)[0];const pk=p&&p.packages&&p.packages[0];
    const {data,error}=await sb.from('clients').insert({name:l.name,ig:l.ig?"@"+igHandle2(l.ig):"",phone:l.phone||"",contact:l.contact||"",status:"Aktiv",pkg:pk?pk.name:"",fee:pk?Number(pk.price)||0:0}).select().single();
    if(error){alert("Müştəri yaradılmadı: "+error.message);return;}cid=data.id;await reload('clients');}
  await upd('leads',l.id,{status:"Razılaşdı",client_id:cid});
  alert(ex?`«${l.name}» artıq müştərilər siyahısında idi — lid ona bağlandı.`:`✅ «${l.name}» müştərilər siyahısına əlavə olundu.`);
}
function renderPropList(q){
  const p=el("div","panel");
  const rows=state.proposals.filter(x=>!q||fold([x.client_name,x.title,x.slug].join(" ")).includes(q)).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  p.appendChild(el("div","ph",`<h3>Təklif səhifələri</h3><span class="count">${rows.length} · müştəri açanda bildiriş gəlir</span>`));
  if(!rows.length){p.appendChild(el("div","empty","Hələ təklif yoxdur — lidin kartında «📄 Təklif» düyməsini basın"));return p;}
  const pb=el("div","pb");
  rows.forEach(x=>{const tot=(x.packages||[]).map(k=>Number(k.price)||0);const exp=x.valid_until&&x.valid_until<bakuISO();
    const row=el("div","row");row.style.flexWrap="wrap";
    row.innerHTML=`<div class="main" style="min-width:200px"><div class="t">${esc(x.client_name)} <span class="hint" style="font-weight:500">· ${esc(x.title||"Təklif")}</span></div>
      <div class="m">${esc(fmtWhen(x.created_at))}${x.created_by_name?" · "+esc(x.created_by_name):""}${tot.length?" · "+tot.map(v=>money(v)).join(" / "):""}${x.valid_until?` · <span style="color:var(--${exp?"crit":"muted"})">${exp?"vaxtı keçib":"qüvvədədir"} ${esc(fmtDate(x.valid_until))}</span>`:""}</div></div>
      <div class="r" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${x.views?`<span class="chip c-good" style="font-size:10.5px" title="Son baxış">👀 ${x.views} · ${esc(fmtWhen(x.last_viewed_at))}</span>`:`<span class="chip c-mut" style="font-size:10.5px">Hələ açılmayıb</span>`}
        ${propStatChip(x)}<button class="mini" data-st title="Kim, nə vaxt, nə qədər baxıb">📊</button><button class="mini" data-k>Link</button><a class="mini" href="${esc(propLink(x))}" target="_blank" rel="noopener" style="text-decoration:none">Aç ↗</a><button class="mini" data-pdf title="Baxış sayını artırmadan PDF kimi saxla">📄 PDF</button><button class="mini" data-e>${ICON.edit}</button><button class="mini" data-d style="color:var(--crit)">${ICON.trash}</button></div>`;
    row.querySelector("[data-pdf]").onclick=()=>propPdf(x);
    row.querySelector("[data-k]").onclick=()=>showPropLink(x);
    row.querySelector("[data-st]").onclick=()=>openPropStats(x);
    row.querySelector("[data-e]").onclick=()=>openPropForm(state.leads.find(l=>l.id===x.lead_id)||null,x);
    row.querySelector("[data-d]").onclick=async()=>{if(!confirm(`«${x.client_name}» təklif səhifəsi silinsin? Link işləməyəcək.`))return;await del('proposals',x.id);};
    pb.appendChild(row);});
  p.appendChild(pb);return p;
}
function propPdf(x){
  const o="https://mezmoonagency.az";
  const w=window.open(o+"/teklif.html?pdf=1&p="+encodeURIComponent(x.slug),"_blank");
  if(!w){alert("Pəncərə bloklandı. Brauzerdə bu sayt üçün pop-up icazəsi verin.");return;}
  const on=e=>{if(e.source!==w||e.origin!==o||!e.data||e.data.type!=="mz-ready")return;removeEventListener("message",on);w.postMessage({type:"mz-proposal",proposal:x},o);};
  addEventListener("message",on);
}
function showPropLink(p){
  const url=propLink(p);const wa="https://wa.me/?text="+encodeURIComponent(`${p.client_name} üçün hazırladığımız təklif: ${url}`);
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>📄 Təklif səhifəsi hazırdır</h3><button data-x>×</button></div><div class="mb">
    <div class="hint" style="white-space:normal">Bu linki məkana göndərin. Açılan kimi sizə bildiriş gələcək, baxış sayı burada görünəcək.</div>
    <input readonly value="${esc(url)}" style="width:100%;font-size:13px;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2);color:var(--ink)">
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-c>Kopyala</button><a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener" style="text-decoration:none">Aç ↗</a><button class="btn ghost" data-lpdf>📄 PDF</button><a class="btn ghost" href="${esc(wa)}" target="_blank" rel="noopener" style="text-decoration:none">WhatsApp</a></div>
  </div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-lpdf]").onclick=()=>propPdf(p);
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  scrim.querySelector("[data-c]").onclick=e=>{const b=e.currentTarget;const done=()=>{b.textContent="Kopyalandı ✓";};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done,()=>prompt("Kopyala:",url));else prompt("Kopyala:",url);};
}
function openPropForm(lead,edit){
  const e=edit||{};const isEdit=!!edit;const a=isEdit?e.audit:(lead&&lead.audit)||null;
  const name=e.client_name||(lead&&lead.name)||"";
  const rn=!isEdit&&lead&&lead.research&&lead.research.needs;
  const dk=isEdit?((e.meta||{}).deck||null):((lead&&lead.research&&lead.research.deck)||null);
  const dkTd=x=>(x||[]).map(n=>n.t?n.t+": "+n.d:n.d).join("\n");
  const dkT=x=>(x||[]).map(t=>[t.metric,t.now,t.goal,t.when].join(" | ")).join("\n");
  const dkP=x=>(x||[]).map(m=>`${m.period} | ${m.focus||""} | ${(m.items||[]).join("; ")}`).join("\n");
  const strat=isEdit?(e.strategy||[]):rn&&rn.length?rn.map(x=>({t:x.t||"",d:x.d})):(a?(a.recs||[]).slice(0,5).map(r=>{const i=r.indexOf(":");return i>0&&i<60?{t:r.slice(0,i),d:r.slice(i+1).trim()}:{t:"",d:r};}):[]);
  let pks=isEdit?JSON.parse(JSON.stringify(e.packages||[])):[JSON.parse(JSON.stringify(PROP_PRESETS[0].pk))];
  const intro=isEdit?(e.intro||""):(a?`${name} üçün Instagram profilinin analizinə əsaslanan kontent strategiyası və aylıq paket təklifimiz.`:`${name} üçün kontent strategiyası və aylıq paket təklifimiz.`);
  const valid=e.valid_until||bakuISO(Date.now()+14*864e5);
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:720px"><div class="mh"><h3>${isEdit?"Təklifi redaktə et":"📄 Təklif səhifəsi"}</h3><button data-x>×</button></div><div class="mb">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Məkan</label><input id="p1" value="${esc(name)}"></div>
      <div class="field"><label>Başlıq</label><input id="p2" value="${esc(e.title||"Kontent strategiyası və aylıq paket")}"></div></div>
    <div class="field"><label>Giriş mətni</label><textarea id="p3" rows="2">${esc(intro)}</textarea></div>
    <div class="field"><label>Strategiya — hər sətir bir bənd («Başlıq: təsvir»)</label><textarea id="p4" rows="5" placeholder="Kreatorlu video: ayda 6 video, hər birində insan və hekayə">${esc(strat.map(x=>x.t?x.t+": "+x.d:x.d).join("\n"))}</textarea></div>
    <div class="field"><label>Paketlər <span style="text-transform:none;letter-spacing:0;font-weight:500">— hazır şablon əlavə et:</span> ${PROP_PRESETS.map(p=>`<button type="button" class="mini" data-pre="${p.key}" style="margin-left:4px">+ ${esc(p.label)}</button>`).join("")}</label><div id="pkBox"></div></div>
    <details ${e.meta&&Object.values(e.meta).some(Boolean)?"open":""} style="border:1px solid var(--border);border-radius:12px;padding:10px 12px"><summary style="cursor:pointer;font-size:13px;font-weight:600">Ətraflı — başlıq sətri, əlavə bölmə, son çağırış</summary>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
        <div class="field"><label>Başlıq sətri (yuxarıdakı kiçik yazı)</label><input id="m1" value="${esc((e.meta||{}).eyebrow||"")}" placeholder="məs. Xüsusi təklif"></div>
        <div class="field"><label>Əlavə bölmənin adı</label><input id="m2" value="${esc((e.meta||{}).note_title||"")}" placeholder="məs. Bonus, Şərtlər"></div>
        <div class="field" style="grid-column:1/-1"><label>Əlavə bölmənin mətni (boş qalsa bölmə görünmür)</label><textarea id="m3" rows="3" placeholder="məs. İlk ay 1 əlavə video hədiyyə. Ödəniş ayın 1-də.">${esc((e.meta||{}).note_body||"")}</textarea></div>
        <div class="field"><label>Son çağırış mətni</label><input id="m4" value="${esc((e.meta||{}).cta_text||"")}" placeholder="Planı birlikdə dəqiqləşdirək"></div>
        <div class="field"><label>Əlaqə linki (düymələr)</label><input id="m5" value="${esc((e.meta||{}).cta_link||"")}" placeholder="https://wa.me/994…"></div>
      </div><div class="hint" style="margin-top:6px">Dəyişikliklər eyni linkdə dərhal görünür — yeni link göndərməyə ehtiyac yoxdur.</div></details>
    ${dk?`<details open style="border:1px solid var(--border);border-radius:12px;padding:10px 12px"><summary style="cursor:pointer;font-size:13px;font-weight:600">📊 Təqdimat: göndərməzdən əvvəl oxuyun və düzəldin</summary>
      <label style="display:flex;gap:6px;align-items:center;font-size:13px;margin-top:10px"><input type="checkbox" id="d0" ${dk.off?"":"checked"}> Təqdimat bölmələrini səhifədə göstər</label>
      <div class="field"><label>Qısa nəticə</label><textarea id="d1" rows="2">${esc(dk.summary||"")}</textarea></div>
      <div class="field"><label>Instagram analizi: hər sətir «Mövzu: mətn»</label><textarea id="d2" rows="6">${esc(dkTd(dk.ig))}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="field"><label>Müsbət tərəflər</label><textarea id="d3" rows="5">${esc((dk.pros||[]).join("\n"))}</textarea></div>
      <div class="field"><label>Mənfi tərəflər</label><textarea id="d4" rows="5">${esc((dk.cons||[]).join("\n"))}</textarea></div></div>
      <div class="field"><label>Vədimiz: hər sətir «Başlıq: mətn»</label><textarea id="d5" rows="4">${esc(dkTd(dk.promises))}</textarea></div>
      <div class="field"><label>Hədəflər (zəmanət deyil, rəqəmləri təsdiqləyin): Göstərici | İndi | Hədəf | Müddət</label><textarea id="d6" rows="4">${esc(dkT(dk.targets))}</textarea></div>
      <div class="field"><label>Plan: Dövr | Fokus | iş; iş; iş</label><textarea id="d7" rows="4">${esc(dkP(dk.plan))}</textarea></div></details>`:""}
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
      ${a?`<label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="p5" ${e.include_audit===false?"":"checked"}> Audit nəticələrini göstər (bal ${a.score}/100)</label>`:`<span class="hint">Audit yoxdur — səhifədə «Mövcud vəziyyət» bölməsi olmayacaq</span>`}
      <label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="p6" ${e.show_portfolio===false?"":"checked"}> Portfolio (videolar + 17 məkan)</label>
      <label style="display:flex;gap:6px;align-items:center;font-size:13px;margin-left:auto">Qüvvədədir: <input type="date" id="p7" value="${esc(valid)}" style="font-size:13px;padding:5px 7px;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--ink)"></label>
    </div>
  </div><div class="mf"><button class="btn ghost" data-x2>Ləğv</button><button class="btn" data-ok>${isEdit?"Yadda saxla":"Səhifəni yarat"}</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.querySelector("[data-x2]").onclick=close;
  const box=scrim.querySelector("#pkBox");
  const inSt="width:100%;font-size:13px;padding:7px 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink)";
  const readPk=()=>{box.querySelectorAll("[data-pk]").forEach(c=>{const i=+c.dataset.pk;const g=s=>c.querySelector(s).value.trim();
    pks[i]={...pks[i],name:g("[data-n]"),price:Number(g("[data-pr]").replace(/[^\d.]/g,""))||0,desc:g("[data-ds]"),
      hi:g("[data-hi]").split(",").map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^(\S+)\s+(.*)$/);return m?{n:m[1],l:m[2]}:{n:x,l:""};}),
      items:g("[data-it]").split("\n").map(x=>x.trim()).filter(Boolean)};});};
  const drawPk=()=>{box.innerHTML=pks.map((p,i)=>`<div data-pk="${i}" style="border:1px solid var(--border);border-radius:12px;padding:10px;margin-top:8px;background:var(--surface-2);display:grid;grid-template-columns:1fr 120px;gap:7px">
      <input data-n placeholder="Paketin adı" value="${esc(p.name||"")}" style="${inSt}"><input data-pr placeholder="Qiymət AZN" value="${esc(p.price||"")}" style="${inSt}">
      <input data-ds placeholder="Qısa təsvir" value="${esc(p.desc||"")}" style="${inSt};grid-column:1/-1">
      <input data-hi placeholder="Əsas rəqəmlər: 6 video / ay, 8 kontent / ay" value="${esc((p.hi||[]).map(h=>(h.n+" "+(h.l||"")).trim()).join(", "))}" style="${inSt};grid-column:1/-1">
      <textarea data-it rows="4" placeholder="Hər sətir bir xidmət" style="${inSt};grid-column:1/-1;font-family:inherit">${esc((p.items||[]).join("\n"))}</textarea>
      <button type="button" class="mini" data-rm="${i}" style="grid-column:1/-1;justify-self:end;color:var(--crit)">Paketi sil</button></div>`).join("")||`<div class="hint" style="padding:6px 0">Paket yoxdur — yuxarıdan şablon əlavə edin</div>`;
    box.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{readPk();pks.splice(+b.dataset.rm,1);drawPk();});};
  drawPk();
  scrim.querySelectorAll("[data-pre]").forEach(b=>b.onclick=()=>{readPk();if(pks.length>=3){alert("Ən çox 3 paket");return;}pks.push(JSON.parse(JSON.stringify(PROP_PRESETS.find(p=>p.key===b.dataset.pre).pk)));drawPk();});
  scrim.querySelector("[data-ok]").onclick=async()=>{
    readPk();const v=id=>{const x=scrim.querySelector("#"+id);return x?x.value.trim():"";};
    const cn=v("p1");if(!cn){scrim.querySelector("#p1").focus();return;}
    const strategy=v("p4").split("\n").map(x=>x.trim()).filter(Boolean).map(r=>{const i=r.indexOf(":");return i>0&&i<60?{t:r.slice(0,i).trim(),d:r.slice(i+1).trim()}:{t:"",d:r};});
    const cb=id=>{const x=scrim.querySelector("#"+id);return x?x.checked:false;};
    const row={client_name:cn,title:v("p2"),intro:v("p3"),strategy,packages:pks.filter(p=>p.name||p.price),include_audit:!!a&&cb("p5"),audit:a,show_portfolio:cb("p6"),valid_until:v("p7")||null,
      meta:{...(e.meta||{}),eyebrow:v("m1"),note_title:v("m2"),note_body:v("m3"),cta_text:v("m4"),cta_link:v("m5")}};
    if(dk){const ln=id=>v(id).split("\n").map(x=>x.trim()).filter(Boolean);
      const tdp=r=>{const i=r.indexOf(":");return i>0&&i<60?{t:r.slice(0,i).trim(),d:r.slice(i+1).trim()}:{t:"",d:r};};
      row.meta.deck={off:!cb("d0"),summary:v("d1"),ig:ln("d2").map(tdp),pros:ln("d3"),cons:ln("d4"),promises:ln("d5").map(tdp),posts:dk.posts||[],
        targets:ln("d6").map(r=>{const [metric,now,goal,when]=r.split("|").map(x=>x.trim());return {metric:metric||"",now:now||"",goal:goal||"",when:when||""};}).filter(t=>t.metric&&t.goal),
        plan:ln("d7").map(r=>{const [period,focus,items]=r.split("|").map(x=>x.trim());return {period:period||"",focus:focus||"",items:(items||"").split(";").map(x=>x.trim()).filter(Boolean)};}).filter(m=>m.period)};}
    const ok=scrim.querySelector("[data-ok]");ok.disabled=true;
    if(isEdit){const {error}=await sb.from('proposals').update(row).eq('id',e.id);if(error){alert("Xəta: "+error.message);ok.disabled=false;return;}await reload('proposals');close();showPropLink({...e,...row});return;}
    const slug=slugify(cn)+"-"+Math.random().toString(36).slice(2,6);
    const {data,error}=await sb.from('proposals').insert({...row,slug,lead_id:lead?lead.id:null,created_by_name:myName()}).select().single();
    if(error){alert("Xəta: "+error.message);ok.disabled=false;return;}
    if(lead&&["Yeni","Əlaqə saxlanıldı","Görüş"].includes(lead.status))await sb.from('leads').update({status:"Təklif göndərildi"}).eq('id',lead.id);
    await Promise.all([reload('proposals'),reload('leads')]);close();showPropLink(data);};
}

/* ---------- Brend kitabçası (müştəri üzrə vahid mənbə: dizayner, kontent, Account, süni intellekt) ---------- */
const BB_TONES=["Premium","Lüks","Səmimi","Ailəvi","Gənc / enerjili","Yumorlu","Romantik","Rəsmi","Minimalist"];
const BB_FIELDS=[
  ["tagline","Bir cümləlik vəd","text","məs. Panorama-da özəl axşam"],
  ["about","Məkan haqqında","area","Konsept, mətbəx, atmosfer, nə ilə fərqlənir"],
  ["audience","Hədəf auditoriya","text","məs. 25–40 yaş, cütlüklər, biznes görüşləri"],
  ["address","Ünvan (açıqlamanın sonunda 📍)","text","məs. Nizami küç 62, Bakı, Azərbaycan"],
  ["phone","Telefon (açıqlamanın sonunda 📞)","text","məs. +994 (50) 404 04 07"],
  ["cap_langs","Açıqlama dilləri","select",["","Yalnız Azərbaycanca","Azərbaycanca + Rusca","Azərbaycanca + İngiliscə","Azərbaycanca + Rusca + İngiliscə"]],
  ["cap_example","Nümunə açıqlama","area","Bu məkanın tipik paylaşım mətnini yapışdır: AI eyni quruluşda yazacaq"],
  ["hours","İş saatları","text","məs. 12:00–02:00, hər gün"],
  ["reserve","Rezerv / əlaqə","text","telefon və ya WhatsApp linki"],
  ["menu","Menyu linki","text","https://…"],
  ["price","Qiymət səviyyəsi","select",["","₼ — sərfəli","₼₼ — orta","₼₼₼ — premium","₼₼₼₼ — lüks"]],
  ["signature","İmza yeməklər / içkilər","text","məs. təndir quzu, nar kokteyli"],
  ["colors","Brend rəngləri","text","#1A1A1A, #C8A96A"],
  ["fonts","Şriftlər","text",""],
  ["logo","Loqo faylı (link)","text","Drive linki"],
  ["hashtags","Hashtaglar","text","#bakulounge …"],
  ["do","Hər paylaşımda olsun","area","Loqo, ünvan, rezerv çağırışı…"],
  ["dont","Qadağandır","area","İstifadə olunmayan söz, mövzu, rəng, rəqib adı…"],
  ["refs","Nümunə hesablar / referanslar","text","@hesab, @hesab"],
  ["note","Qeyd","area",""]
];
const bbCanEdit=()=>["ceo","pm","account","marketing"].includes(role);
function bbFilled(c){const b=c&&c.brand;return !!b&&Object.values(b).some(v=>Array.isArray(v)?v.length:String(v||"").trim());}
function bbLink(client,label){const c=state.clients.find(x=>x.name===client);if(!c)return "";return `<a href="#" data-bb="${esc(client)}" title="Brend kitabçası${bbFilled(c)?"":" (boşdur)"}" style="text-decoration:none;color:var(--accent-ink);opacity:${bbFilled(c)?1:.5}">📘${label?" "+label:""}</a>`;}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-bb]");if(!b)return;e.preventDefault();e.stopPropagation();
  const c=state.clients.find(x=>x.name===b.dataset.bb);if(c)openBrandBook(c);},true);
const bbLinkify=v=>esc(v).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener" style="color:var(--accent-ink)">$1</a>');
function openBrandBook(c0,editMode){
  const c=state.clients.find(x=>x.id===c0.id)||c0;const b=c.brand||{};const ed=bbCanEdit();const editing=editMode||(ed&&!bbFilled(c));
  const scrim=el("div","scrim");
  const view=()=>{const rows=BB_FIELDS.filter(([k])=>String(b[k]||"").trim());
    const tones=(b.tone||[]).map(t=>`<span class="chip c-accent" style="font-size:11px">${esc(t)}</span>`).join(" ");
    const sw=String(b.colors||"").match(/#[0-9a-f]{3,8}\b/gi)||[];
    return `${tones?`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">${tones}</div>`:""}
      ${sw.length?`<div style="display:flex;gap:6px;margin-bottom:12px">${sw.map(h=>`<span title="${esc(h)}" style="width:34px;height:34px;border-radius:9px;background:${esc(h)};border:1px solid var(--border)"></span>`).join("")}</div>`:""}
      ${rows.length?rows.map(([k,l])=>`<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div class="hint" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em">${esc(l)}</div><div style="font-size:13.5px;white-space:pre-wrap;margin-top:2px${k==="dont"?";color:var(--crit)":""}">${bbLinkify(b[k])}</div></div>`).join(""):`<div class="empty">Brend kitabçası hələ doldurulmayıb</div>`}
      ${b.updated_by?`<div class="hint" style="margin-top:8px;font-size:11px">Son dəyişiklik: ${esc(b.updated_by)} · ${esc(fmtWhen(b.updated_at))}</div>`:""}`;};
  const form=()=>`<div class="field"><label>Ton</label><div class="pchips" style="max-height:none">${BB_TONES.map(t=>`<button type="button" class="pchip${(b.tone||[]).includes(t)?" on":""}" data-tone="${esc(t)}">${esc(t)}</button>`).join("")}</div></div>
    ${BB_FIELDS.map(([k,l,t,ph])=>`<div class="field"><label>${esc(l)}</label>${t==="area"?`<textarea data-f="${k}" rows="2" placeholder="${esc(ph)}">${esc(b[k]||"")}</textarea>`:t==="select"?`<select data-f="${k}">${ph.map(o=>`<option${o===(b[k]||"")?" selected":""}>${esc(o)}</option>`).join("")}</select>`:`<input data-f="${k}" value="${esc(b[k]||"")}" placeholder="${esc(ph)}">`}</div>`).join("")}`;
  scrim.innerHTML=`<div class="modal" style="max-width:640px"><div class="mh"><h3>📘 ${esc(c.name)} — brend kitabçası</h3><button data-x>×</button></div>
    <div class="mb" data-b style="max-height:70vh;overflow:auto">${editing?form():view()}</div>
    <div class="mf">${ed&&!editing?`<button class="btn ghost" data-e>${ICON.edit} Redaktə</button>`:""}${editing?`<button class="btn ghost" data-x2>Ləğv</button><button class="btn" data-s>Yadda saxla</button>`:`<button class="btn" data-x2>Bağla</button>`}</div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.querySelector("[data-x2]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const eb=scrim.querySelector("[data-e]");if(eb)eb.onclick=()=>{close();openBrandBook(c,true);};
  scrim.querySelectorAll("[data-tone]").forEach(x=>x.onclick=()=>x.classList.toggle("on"));
  const sb2=scrim.querySelector("[data-s]");if(sb2)sb2.onclick=async()=>{
    const nb={tone:[...scrim.querySelectorAll("[data-tone].on")].map(x=>x.dataset.tone)};
    scrim.querySelectorAll("[data-f]").forEach(f=>{nb[f.dataset.f]=f.value.trim();});
    nb.updated_by=myName();nb.updated_at=new Date().toISOString();
    sb2.disabled=true;const {error}=await sb.from('clients').update({brand:nb}).eq('id',c.id);
    if(error){alert("Yadda saxlanmadı: "+error.message);sb2.disabled=false;return;}
    await reload('clients');close();openBrandBook(state.clients.find(x=>x.id===c.id)||c);};
}

/* ---------- Məmnuniyyət balı (müştəri 0–10 bal verir: mezmoonagency.az/rey.html) ---------- */
const FB_URL="https://mezmoonagency.az/rey.html?k=";
function fbFor(client){return state.client_feedback.filter(f=>f.client===client).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));}
const fbCol=s=>s>=9?"good":s>=7?"warn":"crit";
function fbChip(client){const f=fbFor(client)[0];if(!f)return "";return `<span class="chip c-${fbCol(f.score)}" style="font-size:10.5px" title="Son məmnuniyyət balı · ${esc(fmtWhen(f.created_at))}">⭐ ${f.score}/10</span>`;}
function npsOf(list){if(!list.length)return null;const p=list.filter(x=>x.score>=9).length,d=list.filter(x=>x.score<=6).length;return Math.round((p-d)/list.length*100);}
async function askFeedback(c){
  let {data}=await sb.from('client_portals').select('token').eq('client',c.name).eq('revoked',false).order('created_at',{ascending:false}).limit(1);
  let t=data&&data[0]&&data[0].token;
  if(!t){const r=await sb.from('client_portals').insert({client:c.name}).select('token').single();if(r.error){alert("Xəta: "+r.error.message);return;}t=r.data.token;}
  const url=FB_URL+t;const wa="https://wa.me/"+(String(c.phone||"").replace(/[^\d]/g,""))+"?text="+encodeURIComponent(`Salam! MezMoon ilə işimizi 1 dəqiqəyə qiymətləndirə bilərsiniz? Rəyiniz bizim üçün çox önəmlidir 🙏\n${url}`);
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>⭐ Məmnuniyyət sorğusu — ${esc(c.name)}</h3><button data-x>×</button></div><div class="mb">
    <div class="hint" style="white-space:normal">Müştəri 0–10 bal verir və istəsə şərh yazır. 6 və aşağı bal gələndə CEO və PM-ə təcili bildiriş gedir.</div>
    <input readonly value="${esc(url)}" style="width:100%;font-size:13px;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2);color:var(--ink)">
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-c>Kopyala</button><a class="btn ghost" href="${esc(wa)}" target="_blank" rel="noopener" style="text-decoration:none">WhatsApp-da göndər</a><a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener" style="text-decoration:none">Aç ↗</a></div>
  </div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  scrim.querySelector("[data-c]").onclick=e=>{const b=e.currentTarget;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(()=>{b.textContent="Kopyalandı ✓";},()=>prompt("Kopyala:",url));else prompt("Kopyala:",url);};
}
function fbBox(c,box){
  const L=fbFor(c.name);const can=["ceo","pm","account"].includes(role);
  box.innerHTML=`<div class="ph" style="border:none;padding:14px 0 6px"><h3 style="font-size:14px">⭐ Məmnuniyyət</h3>${L.length?`<span class="count">orta ${(L.reduce((s,x)=>s+x.score,0)/L.length).toFixed(1)} · ${L.length} rəy</span>`:""}${can?`<button class="mini" data-fb style="margin-left:auto">Rəy istə</button>`:""}</div>
    ${L.length?L.slice(0,5).map(f=>`<div class="row" style="align-items:flex-start"><span class="chip c-${fbCol(f.score)}" style="font-size:12px;min-width:46px;justify-content:center">${f.score}/10</span><div class="main" style="min-width:0"><div class="t" style="font-weight:500;white-space:pre-wrap">${esc(f.comment||"(şərh yoxdur)")}</div><div class="m">${esc(fmtWhen(f.created_at))}</div></div></div>`).join(""):`<div class="empty">Hələ rəy yoxdur</div>`}`;
  const b=box.querySelector("[data-fb]");if(b)b.onclick=()=>askFeedback(c);
}

/* ---------- Potensial müştərilər (Google Maps, həftəlik avtomatik, Apify — aylıq 4.5$ həddi) ---------- */
const PROSPECT_URL=SB_URL+"/functions/v1/prospect-search";
async function prospectCall(body){
  const {data}=await sb.auth.getSession();const tok=data&&data.session?data.session.access_token:"";
  const r=await fetch(PROSPECT_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+tok},body:JSON.stringify(body)});
  return await r.json().catch(()=>({ok:false,error:"cavab yoxdur ("+r.status+")"}));
}
function renderProspects(q){
  const p=el("div","panel");
  const rows=state.prospects.filter(x=>x.status==="new"&&(!q||fold([x.name,x.category,x.address,x.ig].join(" ")).includes(q))).sort((a,b)=>(b.reviews||0)-(a.reviews||0));
  const runs=state.prospect_runs.slice().sort((a,b)=>String(b.started_at).localeCompare(String(a.started_at)));
  const running=runs.find(r=>!r.imported_at);const last=runs.find(r=>r.imported_at);
  const ph=el("div","ph");ph.style.flexWrap="wrap";ph.style.gap="8px";
  ph.innerHTML=`<h3>🔎 Potensial məkanlar — Google Maps</h3><span class="count">${rows.length} yeni${running?" · <span style=\"color:var(--warn)\">⏳ axtarış gedir…</span>":last?` · son axtarış ${esc(fmtWhen(last.started_at))} (+${last.added||0})`:""}</span>
    <span style="margin-left:auto;display:flex;gap:6px">${running?`<button class="mini" data-pc>↻ Nəticəni yoxla</button>`:`<button class="mini" data-ps>Yeni axtarış</button>`}</span>`;
  p.appendChild(ph);
  p.appendChild(el("div","hint",`<div style="padding:0 16px 10px;white-space:normal">Hər bazar ertəsi 09:00-da avtomatik 60 məkan yoxlanır (lounge, restaurant, rooftop bar). Ən azı 30 Google rəyi olan, hələ müştəri və ya lid olmayan məkanlar düşür. Apify xərci ayda ~1.3$, 4.5$ həddindən sonra axtarış dayanır.</div>`));
  const ps=ph.querySelector("[data-ps]");if(ps)ps.onclick=async()=>{const v=prompt("Axtarış sözləri (vergüllə, ən çox 5):","lounge, restaurant, rooftop bar");if(v===null)return;
    ps.disabled=true;ps.textContent="⏳";const j=await prospectCall({action:"start",queries:v.split(",").map(x=>x.trim()).filter(Boolean),limit:20});
    if(!j.ok)alert(j.error||"Alınmadı");else alert("Axtarış başladı — 2–5 dəqiqəyə nəticələr burada görünəcək (tamamlananda bildiriş gələcək).");
    await reload('prospect_runs');render();};
  const pc=ph.querySelector("[data-pc]");if(pc)pc.onclick=async()=>{pc.disabled=true;pc.textContent="⏳";const j=await prospectCall({action:"collect"});if(!j.ok)alert(j.error||"Alınmadı");await Promise.all([reload('prospect_runs'),reload('prospects')]);render();};
  if(!rows.length){p.appendChild(el("div","empty",running?"Axtarış gedir — bir neçə dəqiqəyə məkanlar burada görünəcək":"Yeni potensial məkan yoxdur"));return p;}
  const pb=el("div","pb");
  rows.forEach(x=>{const row=el("div","row");row.style.flexWrap="wrap";
    row.innerHTML=`<div class="main" style="min-width:220px"><div class="t">${esc(x.name)} <span class="chip c-${(x.rating||0)>=4.5?"good":(x.rating||0)>=4?"warn":"crit"}" style="font-size:10.5px">★ ${x.rating??"—"} · ${x.reviews||0} rəy</span></div>
      <div class="m">${esc(x.category||"")}${x.address?" · "+esc(x.address):""}${x.phone?" · "+esc(x.phone):""}</div>
      <div class="m" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:2px">${x.maps_url?`<a href="${esc(x.maps_url)}" target="_blank" rel="noopener" style="color:var(--accent-ink)">Xəritə ↗</a>`:""}${x.ig?`<a href="https://www.instagram.com/${esc(x.ig)}/" target="_blank" rel="noopener" style="color:var(--accent-ink)">@${esc(x.ig)}</a>`:""}${x.website?`<a href="${esc(x.website)}" target="_blank" rel="noopener" style="color:var(--accent-ink)">Sayt ↗</a>`:""}</div></div>
      <div class="r" style="display:flex;gap:6px;flex-wrap:wrap"><button class="mini" data-l>+ Lid</button>${x.ig?`<button class="mini" data-a>${ICON.search} Audit + lid</button>`:""}<button class="mini" data-h title="Siyahıdan gizlət" style="color:var(--muted)">Gizlət</button></div>`;
    row.querySelector("[data-l]").onclick=e=>prospectToLead(x,false,e.currentTarget);
    const ab=row.querySelector("[data-a]");if(ab)ab.onclick=e=>prospectToLead(x,true,e.currentTarget);
    row.querySelector("[data-h]").onclick=async()=>{await upd('prospects',x.id,{status:"ignored"});};
    pb.appendChild(row);});
  p.appendChild(pb);return p;
}
async function prospectToLead(x,withAudit,btn){
  if(btn){btn.disabled=true;btn.textContent="⏳";}
  const {data,error}=await sb.from('leads').insert({name:x.name,ig:x.ig||"",phone:x.phone||"",location:x.address||"",source:"maps",
    note:`Google Maps: ★ ${x.rating??"—"} (${x.reviews||0} rəy) · ${x.category||""}`,created_by_name:myName()}).select().single();
  if(error){alert("Xəta: "+error.message);if(btn)btn.disabled=false;return;}
  await sb.from('prospects').update({status:"added",lead_id:data.id}).eq('id',x.id);
  await Promise.all([reload('leads'),reload('prospects')]);
  if(withAudit&&x.ig)auditLead(data,null);else openLeadForm(data);
}

/* ---------- Təklif analitikası: kim, nə vaxt, hansı bölməyə nə qədər baxıb ---------- */
const PV_ORDER=["Giriş","Vəziyyət","Strategiya","Əlavə","Portfolio","Paket","Əlaqə"];
function propVisits(p){return state.proposal_visits.filter(v=>v.proposal_id===p.id).sort((a,b)=>String(b.started_at).localeCompare(String(a.started_at)));}
function fmtDur(s){s=Math.round(+s||0);return s<60?s+" san":Math.floor(s/60)+" dəq"+(s%60?" "+(s%60)+" san":"");}
function propStatChip(p){const V=propVisits(p);if(!V.length)return "";const t=V.reduce((s,v)=>s+(v.seconds||0),0);const wa=V.reduce((s,v)=>s+(+(v.sections||{})["WhatsApp klik"]||0),0);
  return `<span class="chip c-accent" style="font-size:10.5px" title="Ziyarət · ümumi baxış vaxtı">📊 ${V.length} ziyarət · ${fmtDur(t)}${wa?" · 💬 "+wa+" WhatsApp":""}</span>`;}
function openPropStats(p){
  const V=propVisits(p);const tot=V.reduce((s,v)=>s+(v.seconds||0),0);
  const agg={};V.forEach(v=>Object.entries(v.sections||{}).forEach(([k,n])=>{agg[k]=(agg[k]||0)+(+n||0);}));
  const wa=agg["WhatsApp klik"]||0;delete agg["WhatsApp klik"];
  const secs=PV_ORDER.filter(k=>agg[k]).concat(Object.keys(agg).filter(k=>!PV_ORDER.includes(k)));const mx=Math.max(1,...secs.map(k=>agg[k]));
  const t=(l,v,s)=>`<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:10px 12px"><div class="hint" style="font-size:10.5px;text-transform:uppercase">${l}</div><div class="num" style="font-size:19px;font-weight:700">${v}</div>${s?`<div class="hint" style="font-size:11px">${s}</div>`:""}</div>`;
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:620px"><div class="mh"><h3>📊 ${esc(p.client_name)} — təklifə baxış</h3><button data-x>×</button></div><div class="mb">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">${t("Ziyarət",V.length,p.views?p.views+" dəfə açılıb":"")}${t("Ümumi vaxt",fmtDur(tot),"")}${t("Orta ziyarət",V.length?fmtDur(tot/V.length):"—","")}${t("WhatsApp klik",wa,wa?"maraq göstərib":"")}</div>
    ${secs.length?`<div class="field"><label>Hansı bölməyə nə qədər baxılıb</label>${secs.map(k=>`<div style="display:grid;grid-template-columns:96px 1fr 70px;gap:8px;align-items:center;margin:5px 0;font-size:12.5px"><span>${esc(k)}</span><span style="height:10px;border-radius:5px;background:var(--surface-2);overflow:hidden"><span style="display:block;height:100%;width:${Math.round(agg[k]/mx*100)}%;background:var(--accent)"></span></span><span class="num hint" style="text-align:right">${fmtDur(agg[k])}</span></div>`).join("")}</div>`:""}
    <div class="field"><label>Ziyarətlər</label>${V.length?V.map(v=>`<div class="row" style="padding:7px 0"><div class="main"><div class="t" style="font-weight:500">${esc(fmtWhen(v.started_at))} · ${esc(v.device||"")}</div><div class="m">${fmtDur(v.seconds)} · ${v.max_scroll}% aşağı sürüşdürülüb${(v.sections||{})["WhatsApp klik"]?" · 💬 WhatsApp-a klikləyib":""}</div></div></div>`).join(""):`<div class="empty">Hələ ziyarət yoxdur</div>`}</div>
    <div class="hint" style="white-space:normal;font-size:11.5px">Komandanın özünün açması da sayılır. Linki yoxlamaq üçün açanda bunu nəzərə alın.</div>
  </div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
}

/* ---------- Video rəyləri: bütün videolar, saniyəyə bağlı montaj qeydləri, targetoloqun reklam rəyi ---------- */
let vidFilter="wait",vidClient="",vidQ="";
const VID_ROLES=["ceo","pm","marketing","editor","operator","targeting","coordinator"];
function allVideos(){
  const out=[];
  state.shoots.filter(s=>s.held==="yes"&&pmClientOk(s.client)).forEach(s=>getVids(s).forEach((v,i)=>{if(!v.link)return;const t="vid:"+s.id+":"+i;const A=annFor(t);
    const tg=A.filter(a=>a.kind==="targeting");const rs=tg.map(a=>+a.rating).filter(x=>x>0);
    out.push({s,i,v,t,open:A.filter(a=>!a.resolved&&a.kind!=="targeting").length,tg,rating:rs.length?rs.reduce((a,b)=>a+b,0)/rs.length:null});}));
  return out.sort((a,b)=>String(b.v.ready_at||b.s.held_at||b.s.shoot_date||"").localeCompare(String(a.v.ready_at||a.s.held_at||a.s.shoot_date||"")));
}
const starTxt=n=>"★".repeat(Math.round(n))+"☆".repeat(5-Math.round(n));
function renderVideos(){
  const wrap=el("div");const all=allVideos();
  const wait=all.filter(x=>x.v.stage===3),edit=all.filter(x=>x.v.stage===2),noTg=all.filter(x=>x.v.stage>=3&&!x.tg.length);
  wrap.appendChild(el("div","tiles",tile("Rəy gözləyir",wait.length,"hazırdır · təsdiq gözləyir",true)+tile("Montajda",edit.length,"")+tile("Açıq montaj qeydi",all.reduce((s,x)=>s+x.open,0),"düzəldilməyib")+tile("Targeting rəyi yoxdur",noTg.length,"hazır videolar")));
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px";
  const seg=el("div","seg");seg.style.margin="0";
  [["wait","Rəy gözləyir"],["edit","Montajda"],["notg","🎯 Rəysiz"],["all","Hamısı"]].forEach(([k,l])=>{const b=el("button",vidFilter===k?"on":"",l);b.onclick=()=>{vidFilter=k;render();};seg.appendChild(b);});
  bar.appendChild(seg);
  const cl=[...new Set(all.map(x=>x.s.client))].sort((a,b)=>a.localeCompare(b,"az"));
  const cs=el("select");cs.style.cssText="font-size:12.5px;padding:7px 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink)";
  cs.innerHTML=`<option value="">Bütün məkanlar</option>`+cl.map(c=>`<option${c===vidClient?" selected":""}>${esc(c)}</option>`).join("");cs.onchange=()=>{vidClient=cs.value;render();};bar.appendChild(cs);
  wrap.appendChild(bar);
  const rows=all.filter(x=>(vidFilter==="all"||(vidFilter==="wait"&&x.v.stage===3)||(vidFilter==="edit"&&x.v.stage===2)||(vidFilter==="notg"&&x.v.stage>=3&&!x.tg.length))&&(!vidClient||x.s.client===vidClient));
  const p=el("div","panel");
  p.appendChild(el("div","ph",`<h3>Videolar</h3><span class="count">${rows.length} · videonu açıb dayandırın, rəy həmin saniyəyə bağlanır</span>`));
  if(!rows.length){p.appendChild(el("div","empty","Bu filtrə uyğun video yoxdur"));wrap.appendChild(p);return wrap;}
  const pb=el("div","pb");
  rows.slice(0,150).forEach(x=>{const st=x.v.stage>=4?"Təsdiqləndi":SHOOT_STAGES[(x.v.stage||1)-1];const stc=x.v.stage>=4?"good":x.v.stage===3?"accent":"warn";
    const row=el("div","row");row.style.flexWrap="wrap";
    row.innerHTML=`<div class="main" style="min-width:200px"><div class="t">${esc(x.s.client)} · Video ${x.i+1} ${bbLink(x.s.client)}</div><div class="m">${esc(x.s.shoot_date||"")}${x.s.video_op?" · 🎥 "+esc(x.s.video_op):""}${x.v.ready_at?" · hazır "+esc(fmtWhen(x.v.ready_at)):""}</div></div>
      <div class="r" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="chip c-${stc}" style="font-size:10.5px">${esc(st)}</span>
        ${x.open?`<span class="chip c-warn" style="font-size:10.5px">✂️ ${x.open} açıq qeyd</span>`:""}
        ${x.tg.length?`<span class="chip c-${x.rating>=4?"good":x.rating>=3?"warn":"crit"}" style="font-size:10.5px" title="Targetoloqun reklam potensialı balı">🎯 ${x.rating?starTxt(x.rating):""} (${x.tg.length})</span>`:`<span class="chip c-mut" style="font-size:10.5px">🎯 rəy yoxdur</span>`}
        <button class="mini" data-o>▶ Bax və rəy yaz</button></div>`;
    row.querySelector("[data-o]").onclick=()=>openVideoReview(x.s,x.i);
    pb.appendChild(row);});
  p.appendChild(pb);wrap.appendChild(p);return wrap;
}

/* ---------- Reklam xəbərdarlıqları (ads-watch: anomaliya + kreativ yorğunluğu) ---------- */
const AA_ICON={account:"⛔",cap:"💳",stopped:"⏸",spend:"📈",cpr:"⚠️",fatigue:"🥱"};
function adsAlertsRecent(days){const since=Date.now()-(days||7)*864e5;return state.ads_alerts.filter(a=>Date.parse(a.created_at)>=since&&tgClientOk(a.client)).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));}
function openAdsAlerts(days){
  const L=adsAlertsRecent(days);const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:480px;width:96vw;max-height:84vh;display:flex;flex-direction:column">
    <div class="mh"><h3 style="font-size:16px">Reklam xəbərdarlıqları</h3><button>×</button></div>
    <div class="hint" style="white-space:normal;margin-bottom:8px;padding:0 12px">Son ${days||7} gün. Gündə 2 dəfə avtomatik yoxlanır (10:00, 15:00).</div>
    <div id="aalist" style="flex:1;overflow-y:auto;padding:2px"></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  const box=scrim.querySelector("#aalist");
  if(!L.length)box.appendChild(el("div","empty","Xəbərdarlıq yoxdur"));
  L.slice(0,25).forEach(a=>box.appendChild(el("div","row",`<div class="main" style="min-width:0"><div class="t">${esc(a.title||"")}</div><div class="m" style="white-space:pre-wrap">${esc(a.body||"")}</div><div class="hint" style="font-size:10px;margin-top:2px">${esc(fmtWhen(a.created_at))}</div></div>`)));
  scrim.querySelector(".mh button").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
}

/* ---------- Hər vəzifə üçün 3 göstərici (bu ay) ---------- */
function kpisFor(p){
  const M=bakuISO().slice(0,7);const inM=iso=>{const t=Date.parse(iso);return isFinite(t)&&bakuISO(t).slice(0,7)===M;};
  /* çəkiliş tarixi «21.10» formatındadır */
  const shootInM=s=>{const sd=shootDate(s.shoot_date||"");return sd?sd.mo+1===+M.slice(5,7):inM(s.held_at||s.created_at);};
  const pn=p.full_name||p.username;const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
  const fH=h=>h==null?"—":h<48?Math.round(h)+" saat":(h/24).toFixed(1)+" gün";
  const K=(l,v,sub,c)=>({l,v,sub,c});
  const myTasks=state.tasks.filter(t=>taskAssignees(t).includes(p.id));
  const overdue=myTasks.filter(t=>t.status!=="Təsdiqləndi"&&t.deadline&&t.deadline<bakuISO()).length;
  const tasksDone=myTasks.filter(t=>t.status==="Təsdiqləndi"&&inM(t.approved_at||t.created_at)).length;
  switch(p.role){
    case "designer":{const d=state.briefs.filter(b=>b.designer===pn&&b.done_at&&inM(b.done_at));
      const h=avg(d.map(b=>(Date.parse(b.first_done_at||b.done_at)-Date.parse(b.created_at))/36e5));const ed=avg(d.map(b=>Math.max(0,(+b.edit_count||0)-(+b.client_edit_count||0))));
      return [K("Hazır dizayn",d.length,"bu ay"),K("Orta hazırlanma",fH(h),"brifdən hazıra",h==null?"":h<=24?"good":h<=48?"warn":"crit"),K("Orta düzəliş",ed==null?"—":ed.toFixed(1),"hər dizayna",ed==null?"":ed<=0.5?"good":ed<=1.5?"warn":"crit")];}
    case "motion":{const mine=state.briefs.filter(b=>b.motion_by===pn);const d=mine.filter(b=>b.done_at&&inM(b.done_at));const ed=avg(d.map(b=>Math.max(0,(+b.motion_edit_count||0)-(+b.client_motion_edit_count||0))));
      return [K("Hazır motion",d.length,"bu ay"),K("Orta düzəliş",ed==null?"—":ed.toFixed(1),"hər işə",ed==null?"":ed<=0.5?"good":ed<=1.5?"warn":"crit"),K("Açıq iş",mine.filter(b=>b.status!=="Hazır").length,"")];}
    case "operator":{const sh=state.shoots.filter(s=>(Array.isArray(s.op_ids)&&s.op_ids.includes(p.id))||s.video_op===pn||s.photo_op===pn);
      const held=sh.filter(s=>s.held==="yes"&&(s.held_at?inM(s.held_at):shootInM(s)));
      const lag=[];sh.forEach(s=>{if(!s.held_at)return;getVids(s).forEach(v=>{if(v.ready_at&&inM(v.ready_at))lag.push((Date.parse(v.ready_at)-Date.parse(s.held_at))/36e5);});});
      const h=avg(lag);const open=sh.filter(s=>s.held==="yes").reduce((n,s)=>n+shootOpenVids(s),0);
      return [K("Çəkiliş",held.length,"bu ay"),K("Orta təhvil",fH(h),"çəkilişdən hazır videoya",h==null?"":h<=48?"good":h<=72?"warn":"crit"),K("Açıq video",open,"",open>6?"warn":"")];}
    case "editor":{const vids=[];state.shoots.forEach(s=>getVids(s).forEach((v,i)=>vids.push({s,v,i})));
      const done=vids.filter(x=>x.v.ready_at&&inM(x.v.ready_at)).length;const inEdit=vids.filter(x=>x.v.stage===2).length;
      const openN=state.annotations.filter(a=>String(a.target).startsWith("vid:")&&!a.resolved&&a.kind!=="targeting").length;
      return [K("Hazır video",done,"bu ay (komanda)"),K("Montajda",inEdit,"gözləyir",inEdit>8?"warn":""),K("Açıq montaj qeydi",openN,"düzəldilməyib",openN?"warn":"good")];}
    case "account":{const now=Date.now();const P=state.smm_posts.filter(x=>x.account_id===p.id&&inM(x.post_date+"T12:00:00Z")&&smmDue(x)<=now);
      const ok=P.filter(x=>x.status==="posted"&&(!x.done_at||Date.parse(x.done_at)<=smmDue(x)+3600e3)).length;const pct=P.length?Math.round(ok/P.length*100):null;
      return [K("SMM vaxtında",pct==null?"—":pct+"%",P.length+" paylaşım",pct==null?"":pct>=90?"good":pct>=70?"warn":"crit"),K("Paylaşılmayan",P.filter(x=>x.status==="missed").length,"bu ay"),K("Verilən brif",state.briefs.filter(b=>b.created_by===p.id&&inM(b.created_at)).length,"bu ay")];}
    case "pm":{const mt=state.meetings.filter(m=>m.kind!=="office"&&(m.created_by===p.id||(Array.isArray(m.attendees)&&m.attendees.includes(p.id)))&&m.held&&inM(m.held_at||m.created_at));
      const pct=mt.length?Math.round(mt.filter(m=>m.held==="yes").length/mt.length*100):null;
      return [K("İclas baş tutdu",pct==null?"—":pct+"%",mt.length+" iclas",pct==null?"":pct>=80?"good":pct>=50?"warn":"crit"),K("Hesabat",state.reports.filter(r=>r.author===p.id&&inM(r.created_at)).length,"bu ay"),K("Gecikən task",overdue,"",overdue?"crit":"good")];}
    case "content":{const mine=state.content.filter(c=>c.created_by===p.id);
      return [K("Yerləşdirilən",mine.filter(c=>c.status==="Yerləşdirildi"&&inM(c.created_at)).length,"bu ay"),K("Təsdiq gözləyir",mine.filter(c=>c.status==="Təsdiq gözləyir").length,""),K("Hazırlanır",mine.filter(c=>c.status==="Hazırlanır").length,"")];}
    case "coordinator":{const sh=state.shoots.filter(s=>s.created_by===p.id&&shootInM(s));const dec=sh.filter(s=>s.held);
      const pct=dec.length?Math.round(dec.filter(s=>s.held==="yes").length/dec.length*100):null;
      return [K("Planlanan çəkiliş",sh.length,"bu ay"),K("Baş tutma",pct==null?"—":pct+"%","",pct==null?"":pct>=90?"good":pct>=75?"warn":"crit"),K("Baş tutmadı",sh.filter(s=>s.held==="no").length,"")];}
    case "targeting":{const ab=state.ad_briefs.filter(b=>b.taken_by===p.id);const live=ab.filter(b=>b.live_at&&inM(b.live_at));
      const h=avg(live.map(b=>(Date.parse(b.live_at)-Date.parse(b.created_at))/36e5));
      return [K("Reklama qoyulan",live.length,"bu ay"),K("Orta başlama",fH(h),"brifdən reklama",h==null?"":h<=12?"good":h<=24?"warn":"crit"),K("Problemli",ab.filter(b=>b.status==="Problem").length,"")];}
    default:{const open=myTasks.filter(t=>t.status!=="Təsdiqləndi").length;
      return [K("Bitən task",tasksDone,"bu ay"),K("Açıq task",open,""),K("Gecikən task",overdue,"",overdue?"crit":"good")];}
  }
}
function kpiCard(p){
  let ks;try{ks=kpisFor(p);}catch(e){console.error("KPI",e);ks=[{l:"Göstərici hesablanmadı",v:"—",sub:"",c:""}];}const rl=ROLES[p.role]?ROLES[p.role].label:"";
  return `<div class="panel" style="margin:0;padding:14px"><div style="display:flex;align-items:center;gap:6px;margin-bottom:10px"><strong style="font-size:13.5px">${esc(p.full_name||p.username)}</strong><span class="hint">${esc(rl)}</span>${typeof actTag==="function"?actTag(p.id):""}</div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${ks.map(k=>`<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:9px 10px;min-width:0"><div class="num" style="font-size:18px;font-weight:700${k.c?";color:var(--"+k.c+")":""}">${esc(k.v)}</div><div style="font-size:11px;font-weight:600;margin-top:2px">${esc(k.l)}</div>${k.sub?`<div class="hint" style="font-size:10.5px">${esc(k.sub)}</div>`:""}</div>`).join("")}</div></div>`;
}
function kpiPanel(list,title){
  const p=el("div","panel");p.style.marginBottom="16px";
  p.appendChild(el("div","ph",`<h3>${title}</h3><span class="count">${MONTHS_AZ[new Date().getMonth()]} · hər vəzifə üçün 3 göstərici</span>`));
  const g=el("div");g.style.cssText="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;padding:0 14px 14px";
  g.innerHTML=list.map(kpiCard).join("");p.appendChild(g);return p;
}

/* ---------- Hesab analitikası: məkanların Instagram statistikası, postlar, aylıq hesabat ---------- */
const IGS_ROLES=["ceo","pm","marketing","account"];
const IG_STATS_URL=SB_URL+"/functions/v1/ig-stats";
const IGS_M=[["reach","Reach","neçə unikal hesab gördü"],["views","Görüntülənmə","ümumi baxış"],["profile_views","Profilə baxış","profilə girən"],["accounts_engaged","Əlaqə quran hesab",""],["total_interactions","Qarşılıqlı əlaqə","bəyənmə, şərh, paylaşma, yadda saxlama"],["website_clicks","Link klikləri","bio linki"]];
const IGS_TYPE=m=>m.product==="REELS"||m.type==="VIDEO"?"Reels":m.type==="CAROUSEL_ALBUM"?"Karusel":"Foto";
const WD_AZ=["Bazar","Bazar ertəsi","Çərşənbə axşamı","Çərşənbə","Cümə axşamı","Cümə","Şənbə"];
let igsAcct="",igsMonth=bakuISO().slice(0,7),igsCache={},igsSort="reach";
const igsMonthRange=m=>{const [y,mo]=m.split("-").map(Number);return [m+"-01",new Date(Date.UTC(y,mo,0)).toISOString().slice(0,10)];};
const igsPrev=m=>{const [y,mo]=m.split("-").map(Number);return new Date(Date.UTC(y,mo-2,1)).toISOString().slice(0,7);};
const igsMonthLabel=m=>{const [y,mo]=m.split("-").map(Number);return MONTHS_AZ[mo-1]+" "+y;};
function igsAccounts(){
  let L=state.ig_accounts.filter(a=>a.status!=="disconnected");
  if(role==="account"&&me){const mine=new Set(state.smm_venues.filter(v=>v.account_id===me.id).map(v=>v.client));L=L.filter(a=>{const c=state.clients.find(x=>x.id===a.client_id);return c&&mine.has(c.name);});}
  return L;
}
const igsClientName=a=>{const c=state.clients.find(x=>x.id===a.client_id);return c?c.name:"@"+a.username;};
async function igsLoad(id,m){
  const key=id+"|"+m;if(igsCache[key])return igsCache[key];
  const a=igsMonthRange(igsPrev(m))[0],e=igsMonthRange(m)[1];
  const [d,md]=await Promise.all([sb.from('ig_daily').select('*').eq('ig_user_id',id).gte('day',a).lte('day',e).order('day'),
    sb.from('ig_media').select('*').eq('ig_user_id',id).gte('ts',a+"T00:00:00Z").lte('ts',e+"T23:59:59Z").order('ts',{ascending:false})]);
  igsCache[key]={daily:d.data||[],media:md.data||[]};return igsCache[key];
}
/* Cari ay bitməyibsə keçən ay da eyni günlərlə müqayisə olunur (1–18 ↔ 1–18) */
function igsCut(m){return m===bakuISO().slice(0,7)?Math.max(1,+bakuISO().slice(8)-1):null;}
function igsAgg(data,m,cut){
  const [a,b]=igsMonthRange(m);const D=data.daily.filter(x=>x.day>=a&&x.day<=b&&(!cut||+x.day.slice(8)<=cut));const s={days:D.filter(x=>x.metrics&&Object.keys(x.metrics).length).length};
  IGS_M.forEach(([k])=>s[k]=D.reduce((t,x)=>t+(+((x.metrics||{})[k])||0),0));
  s.new_followers=D.reduce((t,x)=>t+(+((x.metrics||{}).new_followers)||0),0);
  const fl=D.filter(x=>x.followers!=null);s.followers=fl.length?fl[fl.length-1].followers:null;
  const M=data.media.filter(x=>{const d=bakuISO(Date.parse(x.ts));return d.slice(0,7)===m&&(!cut||+d.slice(8)<=cut+1);});s.posts=M.length;s.media=M;
  s.likes=M.reduce((t,x)=>t+(+x.likes||0),0);s.comments=M.reduce((t,x)=>t+(+x.comments||0),0);
  return s;
}
const igsNum=n=>n==null?"—":Number(n).toLocaleString("az-AZ");
function igsDelta(cur,prev){if(!prev||cur==null)return "";const p=Math.round((cur-prev)/prev*100);if(!isFinite(p))return "";
  return `<span style="font-size:11px;font-weight:700;color:var(--${p>=0?"good":"crit"})">${p>=0?"▲":"▼"} ${Math.abs(p)}%</span>`;}
const igsEr=x=>{const r=+((x.metrics||{}).reach)||0;const i=(+x.likes||0)+(+x.comments||0)+(+((x.metrics||{}).saved)||0)+(+((x.metrics||{}).shares)||0);return r?i/r*100:null;};
function igsChart(daily,m,w,h){
  w=w||720;h=h||190;const [a,b0]=igsMonthRange(m);const yd=bakuISO(Date.now()-864e5);const b=b0>yd&&a<=yd?yd:b0;const days=[];for(let t=Date.parse(a+"T00:00:00Z");t<=Date.parse(b+"T00:00:00Z");t+=864e5)days.push(new Date(t).toISOString().slice(0,10));
  const by={};daily.forEach(x=>by[x.day]=x.metrics||{});
  const R=days.map(d=>+(by[d]||{}).reach||0),P=days.map(d=>+(by[d]||{}).profile_views||0);
  const mR=Math.max(1,...R),mP=Math.max(1,...P);const pl=34,pb=22,cw=(w-pl-8)/days.length;
  const bars=R.map((v,i)=>`<rect x="${pl+i*cw+1}" y="${h-pb-(v/mR)*(h-pb-12)}" width="${Math.max(1,cw-2)}" height="${(v/mR)*(h-pb-12)}" rx="2" fill="var(--accent)" opacity=".75"><title>${days[i]}: reach ${v}</title></rect>`).join("");
  const line=P.map((v,i)=>`${i?"L":"M"}${(pl+i*cw+cw/2).toFixed(1)},${(h-pb-(v/mP)*(h-pb-12)).toFixed(1)}`).join(" ");
  const ticks=days.map((d,i)=>i%5===0||i===days.length-1?`<text x="${pl+i*cw+cw/2}" y="${h-6}" font-size="10" text-anchor="middle" fill="var(--muted)">${+d.slice(8)}</text>`:"").join("");
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" role="img" aria-label="Gündəlik reach və profil baxışı"><text x="2" y="12" font-size="10" fill="var(--muted)">${igsNum(mR)}</text><line x1="${pl}" x2="${w-6}" y1="${h-pb}" y2="${h-pb}" stroke="var(--border)"/>${bars}<path d="${line}" fill="none" stroke="var(--warn)" stroke-width="2"/>${ticks}</svg>
    <div style="display:flex;gap:14px;font-size:11.5px;color:var(--muted);margin-top:4px"><span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--accent);opacity:.75;margin-right:5px"></span>Reach (gündəlik)</span><span><span style="display:inline-block;width:14px;height:2px;background:var(--warn);vertical-align:middle;margin-right:5px"></span>Profilə baxış</span></div>`;
}
function igsInsights(cur,prev,acc){
  const out=[];const pct=(a,b)=>b?Math.round((a-b)/b*100):null;
  const r=pct(cur.reach,prev.reach);if(r!=null&&cur.reach)out.push(`Reach ${r>=0?"artıb":"azalıb"}: ${igsNum(cur.reach)} (${r>=0?"+":""}${r}% keçən ayın eyni dövrünə görə).`);
  const pv=pct(cur.profile_views,prev.profile_views);if(pv!=null&&cur.profile_views)out.push(`Profilə baxış ${igsNum(cur.profile_views)} (${pv>=0?"+":""}${pv}%).`);
  if(cur.new_followers)out.push(`Ay ərzində ${igsNum(cur.new_followers)} yeni izləyici qazanılıb.`);
  out.push(`${cur.posts} paylaşım edilib${prev.posts?` (keçən ay ${prev.posts})`:""}.${cur.posts<12?" Tövsiyə: ayda ən azı 12–16 paylaşım.":""}`);
  const M=cur.media;if(M.length){
    const best=M.slice().sort((a,b)=>((+(b.metrics||{}).reach||0)||(+b.likes||0))-((+(a.metrics||{}).reach||0)||(+a.likes||0)))[0];
    out.push(`Ən yaxşı paylaşım: ${fmtWhen(best.ts)} — ${(best.metrics||{}).reach?igsNum(best.metrics.reach)+" reach":igsNum(best.likes)+" bəyənmə"} («${esc(String(best.caption||"").slice(0,60))}…»).`);
    const byT={};M.forEach(x=>{const t=IGS_TYPE(x);(byT[t]||(byT[t]=[])).push((+(x.metrics||{}).reach||0)||(+x.likes||0));});
    const tl=Object.entries(byT).map(([t,a])=>[t,a.reduce((s,v)=>s+v,0)/a.length,a.length]).sort((a,b)=>b[1]-a[1]);
    if(tl.length>1)out.push(`Ən effektiv format: ${tl[0][0]} (orta ${igsNum(Math.round(tl[0][1]))}${M.some(x=>(x.metrics||{}).reach)?" reach":" bəyənmə"}), ən zəif: ${tl[tl.length-1][0]}.`);
    const byD={};M.forEach(x=>{const d=new Date(Date.parse(x.ts)+4*36e5).getUTCDay();(byD[d]||(byD[d]=[])).push((+(x.metrics||{}).reach||0)||(+x.likes||0));});
    const dl=Object.entries(byD).filter(([,a])=>a.length>=2).map(([d,a])=>[d,a.reduce((s,v)=>s+v,0)/a.length]).sort((a,b)=>b[1]-a[1]);
    if(dl.length)out.push(`Ən yaxşı gün: ${WD_AZ[dl[0][0]]}.`);
  }
  return out;
}
function renderIgStats(){
  const wrap=el("div");const accs=igsAccounts();
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px";
  const selSt="font-size:13px;padding:8px 11px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--ink)";
  if(igsAcct){const bk=el("button","mini","‹ Bütün hesablar");bk.onclick=()=>{igsAcct="";render();};bar.appendChild(bk);
    const as=el("select");as.style.cssText=selSt;as.innerHTML=accs.map(a=>`<option value="${esc(a.ig_user_id)}"${a.ig_user_id===igsAcct?" selected":""}>${esc(igsClientName(a))} · @${esc(a.username)}</option>`).join("");as.onchange=()=>{igsAcct=as.value;render();};bar.appendChild(as);
    const ms=el("select");ms.style.cssText=selSt;const months=[];let m=bakuISO().slice(0,7);for(let i=0;i<12;i++){months.push(m);m=igsPrev(m);}
    ms.innerHTML=months.map(x=>`<option value="${x}"${x===igsMonth?" selected":""}>${igsMonthLabel(x)}</option>`).join("");ms.onchange=()=>{igsMonth=ms.value;render();};bar.appendChild(ms);}
  const sp=el("span");sp.style.marginLeft="auto";bar.appendChild(sp);
  if(igsAcct){const rf=el("button","mini","↻ Yenilə");rf.title="Instagram-dan son 30 günü yenidən yüklə";rf.onclick=async()=>{rf.disabled=true;rf.textContent="⏳ Yüklənir… (1–2 dəq)";
      const {data}=await sb.auth.getSession();const r=await fetch(IG_STATS_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+(data.session?data.session.access_token:"")},body:JSON.stringify({ig_user_id:igsAcct,backfill:true})});
      const j=await r.json().catch(()=>({ok:false}));Object.keys(igsCache).forEach(k=>{if(k.startsWith(igsAcct+"|"))delete igsCache[k];});await reload('ig_accounts');
      const o=j.out&&j.out[0];if(!j.ok||(o&&o.error))alert("Qismən yükləndi: "+((o&&o.error)||j.error||"")+(o&&o.posts!=null?`\nPostlar: ${o.posts}`:""));render();};bar.appendChild(rf);
    const rp=el("button","btn sm","📄 Aylıq hesabat");rp.onclick=()=>igsReport(igsAcct,igsMonth);bar.appendChild(rp);}
  const cn=el("button","mini",ICON.plus+" Hesab qoş");cn.onclick=()=>igsConnect();bar.appendChild(cn);
  wrap.appendChild(bar);
  if(!igsAcct){wrap.appendChild(igsOverview(accs));return wrap;}
  const acc=accs.find(a=>a.ig_user_id===igsAcct)||state.ig_accounts.find(a=>a.ig_user_id===igsAcct);
  if(!acc){igsAcct="";return renderIgStats();}
  const key=igsAcct+"|"+igsMonth;
  if(!igsCache[key]){wrap.appendChild(el("div","panel",'<div class="empty">Yüklənir…</div>'));igsLoad(igsAcct,igsMonth).then(()=>{if(view==="igstats")render();});return wrap;}
  const data=igsCache[key];const cut=igsCut(igsMonth);const cur=igsAgg(data,igsMonth),prev=igsAgg(data,igsPrev(igsMonth),cut);
  if(!acc.stats_ok||acc.status==="error"){const w=el("div","panel");w.style.cssText="margin-bottom:14px;border-color:color-mix(in srgb,var(--warn) 40%,var(--border))";
    w.innerHTML=`<div style="padding:14px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:240px"><b>${acc.status==="error"?"⚠️ Hesab yenidən qoşulmalıdır":"⚠️ Statistika icazəsi yoxdur"}</b><div class="hint" style="white-space:normal">${esc(acc.last_error||acc.stats_err||"")} Reach, profil baxışı kimi rəqəmlər üçün hesabı «Statistika ilə yenidən qoş» edin. Postların bəyənmə və şərhləri yenə görünür.</div></div><button class="btn sm" data-rc>Statistika ilə yenidən qoş</button></div>`;
    w.querySelector("[data-rc]").onclick=()=>igsConnect(acc.client_id);wrap.appendChild(w);}
  const head=el("div","panel");head.style.marginBottom="14px";
  head.innerHTML=`<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;flex-wrap:wrap">${acc.pic?`<img src="${esc(acc.pic)}" alt="" style="width:46px;height:46px;border-radius:50%;object-fit:cover" onerror="this.remove()">`:""}<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:16px">${esc(igsClientName(acc))} ${bbLink(igsClientName(acc))}</div><a href="https://www.instagram.com/${esc(acc.username)}/" target="_blank" rel="noopener" class="hint" style="text-decoration:none">@${esc(acc.username)}</a></div>
    <div style="text-align:right"><div class="num" style="font-size:22px;font-weight:800">${igsNum(acc.followers)}</div><div class="hint" style="font-size:11px">izləyici${cur.new_followers?` · <span style="color:var(--good)">+${igsNum(cur.new_followers)} bu ay</span>`:""}</div></div>
    <div class="hint" style="width:100%;font-size:11px">${igsMonthLabel(igsMonth)}${cut?` · müqayisə: keçən ayın 1–${cut} günləri`:" · müqayisə: keçən ay"} · statistika ${acc.stats_at?"yeniləndi "+esc(fmtWhen(acc.stats_at)):"hələ yüklənməyib"} · ${cur.days} günün məlumatı</div></div>`;
  wrap.appendChild(head);
  const tiles=IGS_M.map(([k,l,s])=>`<div class="tile"><div class="lab">${esc(l)}</div><div class="val num">${cur.days?igsNum(cur[k]):"—"}</div><div class="sub">${igsDelta(cur[k],prev[k])} ${esc(s)}</div></div>`).join("")
    +`<div class="tile"><div class="lab">Paylaşım</div><div class="val num">${cur.posts}</div><div class="sub">${igsDelta(cur.posts,prev.posts)} ${(()=>{const t={};cur.media.forEach(x=>{const k=IGS_TYPE(x);t[k]=(t[k]||0)+1;});return Object.entries(t).map(([k,v])=>v+" "+k).join(" · ");})()}</div></div>`
    +`<div class="tile"><div class="lab">Bəyənmə · şərh</div><div class="val num">${igsNum(cur.likes)} · ${igsNum(cur.comments)}</div><div class="sub">${igsDelta(cur.likes,prev.likes)} bu ayın postları</div></div>`;
  wrap.appendChild(el("div","tiles",tiles));
  const g=el("div","grid2");
  const ch=el("div","panel");ch.appendChild(el("div","ph",`<h3>Gündəlik dinamika</h3><span class="count">${igsMonthLabel(igsMonth)}</span>`));
  const cb=el("div");cb.style.padding="4px 16px 14px";cb.innerHTML=cur.days?igsChart(data.daily,igsMonth):`<div class="empty">Bu ay üçün gündəlik statistika yoxdur${acc.stats_ok?"":" — statistika icazəsi lazımdır"}</div>`;ch.appendChild(cb);g.appendChild(ch);
  const ins=el("div","panel");ins.appendChild(el("div","ph",`<h3>Ayın xülasəsi</h3><span class="count">avtomatik</span>`));
  const il=el("div");il.style.padding="4px 16px 14px";il.innerHTML=`<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:13.5px">${igsInsights(cur,prev,acc).map(x=>`<li>${x}</li>`).join("")}</ul>`;ins.appendChild(il);g.appendChild(ins);
  wrap.appendChild(g);
  const pp=el("div","panel");pp.style.marginTop="14px";
  const sorts=[["date","Tarix"],["reach","Reach"],["views","Görüntülənmə"],["likes","Bəyənmə"],["er","ER%"]];
  pp.appendChild(el("div","ph",`<h3>Paylaşılan postlar</h3><span class="count">${cur.posts} · sırala: ${sorts.map(([k,l])=>`<a href="#" data-srt="${k}" style="color:${igsSort===k?"var(--accent-ink)":"var(--muted)"};font-weight:${igsSort===k?700:500}">${l}</a>`).join(" · ")}</span>`));
  const val=(x,k)=>k==="date"?Date.parse(x.ts):k==="likes"?(+x.likes||0):k==="er"?(igsEr(x)||0):(+((x.metrics||{})[k])||0);
  const rows=cur.media.slice().sort((a,b)=>val(b,igsSort)-val(a,igsSort));
  const tw=el("div");tw.style.overflowX="auto";
  tw.innerHTML=rows.length?`<table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="text-align:left;color:var(--muted);font-size:11px"><th style="padding:8px 12px">Post</th><th>Növ</th><th class="num">Reach</th><th class="num">Görünt.</th><th class="num">♥</th><th class="num">💬</th><th class="num">🔖</th><th class="num">↗</th><th class="num" style="padding-right:12px">ER</th></tr></thead><tbody>${rows.map(x=>{const M=x.metrics||{};const er=igsEr(x);
      return `<tr style="border-top:1px solid var(--border)"><td style="padding:7px 12px"><a href="${esc(x.permalink)}" target="_blank" rel="noopener" style="display:flex;gap:9px;align-items:center;text-decoration:none;color:var(--ink)">${x.thumb?`<img src="${esc(x.thumb)}" alt="" loading="lazy" style="width:40px;height:50px;object-fit:cover;border-radius:6px;background:var(--surface-2)" onerror="this.style.visibility='hidden'">`:""}<span style="min-width:0"><span style="display:block;font-weight:600">${esc(fmtWhen(x.ts))}</span><span class="hint" style="display:block;max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.caption||"")}</span></span></a></td>
        <td>${IGS_TYPE(x)}</td><td class="num">${igsNum(M.reach)}</td><td class="num">${igsNum(M.views)}</td><td class="num">${igsNum(x.likes)}</td><td class="num">${igsNum(x.comments)}</td><td class="num">${igsNum(M.saved)}</td><td class="num">${igsNum(M.shares)}</td><td class="num" style="padding-right:12px">${er==null?"—":er.toFixed(1)+"%"}</td></tr>`;}).join("")}</tbody></table>`:`<div class="empty">Bu ay paylaşım yoxdur</div>`;
  pp.appendChild(tw);
  pp.querySelectorAll("[data-srt]").forEach(a=>a.onclick=e=>{e.preventDefault();igsSort=a.dataset.srt;render();});
  wrap.appendChild(pp);
  return wrap;
}
function igsOverview(accs){
  const p=el("div","panel");
  p.appendChild(el("div","ph",`<h3>Instagram hesabları</h3><span class="count">${accs.length} qoşulub · statistika hər gecə 02:30-da yenilənir</span>`));
  if(!accs.length){p.appendChild(el("div","empty","Hələ hesab qoşulmayıb — yuxarıdan «+ Hesab qoş»"));return p;}
  const g=el("div");g.style.cssText="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;padding:0 14px 14px";
  g.innerHTML=accs.map(a=>{const st=a.status==="error"?`<span class="chip c-crit" style="font-size:10.5px" title="${esc(a.last_error||"")}">⚠️ yenidən qoş</span>`:a.stats_ok?`<span class="chip c-good" style="font-size:10.5px">● statistika</span>`:`<span class="chip c-warn" style="font-size:10.5px">yalnız postlar</span>`;
    return `<div class="panel" data-ia="${esc(a.ig_user_id)}" style="margin:0;padding:14px;cursor:pointer"><div style="display:flex;gap:10px;align-items:center">${a.pic?`<img src="${esc(a.pic)}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover" onerror="this.remove()">`:`<div class="avatar" style="width:40px;height:40px">${esc((a.username||"?")[0].toUpperCase())}</div>`}
      <div style="min-width:0;flex:1"><div style="font-weight:700">${esc(igsClientName(a))}</div><div class="hint">@${esc(a.username)}</div></div>${st}</div>
      <div style="display:flex;gap:16px;margin-top:10px;font-size:12.5px"><span><b class="num">${igsNum(a.followers)}</b> izləyici</span><span><b class="num">${igsNum(a.media_count)}</b> post</span></div>
      <div class="hint" style="font-size:11px;margin-top:4px">${a.stats_at?"yeniləndi "+esc(fmtWhen(a.stats_at)):"statistika hələ yüklənməyib"}</div></div>`;}).join("");
  g.querySelectorAll("[data-ia]").forEach(c=>c.onclick=()=>{igsAcct=c.dataset.ia;render();});
  p.appendChild(g);return p;
}
function igsConnect(clientId){
  const scrim=el("div","scrim");
  const cl=state.clients.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),"az"));
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>📷 Hesabı statistika ilə qoş</h3><button data-x>×</button></div><div class="mb">
    <div class="hint" style="white-space:normal">Instagram giriş səhifəsi açılır — məkanın hesabı ilə daxil olub icazələri təsdiqləyin. Şifrə məkan sahibindədirsə «Link» ilə ona göndərin (3 gün etibarlıdır). Hesab peşəkar (Business / Creator) olmalıdır. Qoşulan kimi son 30 günün statistikası yüklənir.</div>
    <div class="field"><label>Məkan</label><select id="ic">${cl.map(c=>`<option value="${c.id}"${c.id===clientId?" selected":""}>${esc(c.name)}${state.ig_accounts.some(a=>a.client_id===c.id&&a.status!=="disconnected")?" · qoşulub":""}</option>`).join("")}</select></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-go>Instagram-a daxil ol</button><button class="btn ghost" data-ln>🔗 Link (məkan sahibinə)</button></div></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const go=async(link,b)=>{b.disabled=true;const old=b.textContent;b.textContent="⏳";const j=await igCall({action:"start",client_id:scrim.querySelector("#ic").value,stats:true});b.disabled=false;b.textContent=old;
    if(!j.ok){alert("Alınmadı: "+(j.error||""));return;}if(link)abCopy(j.url);else location.href=j.url;};
  scrim.querySelector("[data-go]").onclick=e=>go(false,e.currentTarget);scrim.querySelector("[data-ln]").onclick=e=>go(true,e.currentTarget);
}
async function igsReport(id,m){
  const acc=state.ig_accounts.find(a=>a.ig_user_id===id);if(!acc)return;
  const data=await igsLoad(id,m);const cut=igsCut(m);const cur=igsAgg(data,m),prev=igsAgg(data,igsPrev(m),cut);
  const name=igsClientName(acc);const ins=igsInsights(cur,prev,acc);
  const pct=(a,b)=>b&&a!=null?Math.round((a-b)/b*100):null;
  const tile=(l,v,d)=>`<div class="t"><div class="l">${l}</div><div class="v">${v}</div>${d!=null?`<div class="d ${d>=0?"up":"dn"}">${d>=0?"▲":"▼"} ${Math.abs(d)}% ${cut?"keçən ayın eyni dövrünə":"keçən aya"} görə</div>`:""}</div>`;
  const top=cur.media.slice().sort((a,b)=>((+(b.metrics||{}).reach||0)||(+b.likes||0))-((+(a.metrics||{}).reach||0)||(+a.likes||0))).slice(0,6);
  const svg=cur.days?igsChart(data.daily,m,760,200).replace(/var\(--accent\)/g,"#6E5AE6").replace(/var\(--warn\)/g,"#C0821A").replace(/var\(--muted\)/g,"#8A83A0").replace(/var\(--border\)/g,"#E4DEF2"):"";
  const html=`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>${esc(name)} — ${igsMonthLabel(m)} hesabatı | MezMoon</title>
<style>@page{size:A4;margin:14mm}body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1A1626;margin:0;padding:24px;background:#fff}
.hd{display:flex;align-items:center;gap:14px;border-bottom:3px solid #6E5AE6;padding-bottom:14px;margin-bottom:18px}.hd img{width:54px;height:54px;border-radius:50%;object-fit:cover}
h1{font-size:22px;margin:0}.sub{color:#8A83A0;font-size:13px}.brand{margin-left:auto;text-align:right;font-weight:800;color:#6E5AE6;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}.t{border:1px solid #E4DEF2;border-radius:10px;padding:10px 12px}.l{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#8A83A0}.v{font-size:21px;font-weight:800;margin-top:2px}.d{font-size:11px;font-weight:700;margin-top:2px}.up{color:#1F9D63}.dn{color:#D8503F}
h2{font-size:15px;margin:20px 0 8px}ul{margin:0;padding-left:18px;line-height:1.6;font-size:13px}
.posts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.p{border:1px solid #E4DEF2;border-radius:10px;overflow:hidden;font-size:11.5px;break-inside:avoid}.p img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;background:#EFEBF8}.p div{padding:7px 9px}
table{width:100%;border-collapse:collapse;font-size:11.5px}th,td{padding:6px 7px;border-bottom:1px solid #EFEBF8;text-align:right}th:first-child,td:first-child{text-align:left}th{color:#8A83A0;font-weight:600}
.pb{text-align:center;margin:18px 0}.pb button{background:#6E5AE6;color:#fff;border:0;border-radius:999px;padding:11px 22px;font-size:14px;font-weight:600;cursor:pointer}
@media print{.pb{display:none}body{padding:0}}</style></head><body>
<div class="pb"><button onclick="print()">Çap et / PDF kimi saxla</button></div>
<div class="hd">${acc.pic?`<img src="${esc(acc.pic)}" alt="" onerror="this.remove()">`:""}<div><h1>${esc(name)}</h1><div class="sub">@${esc(acc.username)} · Instagram hesabatı · ${igsMonthLabel(m)}</div></div><div class="brand">MezMoon<div class="sub" style="font-weight:500">${new Date().toLocaleDateString("az")}</div></div></div>
<div class="grid">${tile("İzləyici",igsNum(cur.followers??acc.followers),null)}${tile("Yeni izləyici",igsNum(cur.new_followers),pct(cur.new_followers,prev.new_followers))}${IGS_M.map(([k,l])=>tile(l,cur.days?igsNum(cur[k]):"—",cur.days?pct(cur[k],prev[k]):null)).join("")}${tile("Paylaşım",cur.posts,pct(cur.posts,prev.posts))}${tile("Bəyənmə",igsNum(cur.likes),pct(cur.likes,prev.likes))}${tile("Şərh",igsNum(cur.comments),pct(cur.comments,prev.comments))}</div>
${svg?`<h2>Gündəlik dinamika</h2>${svg}`:""}
<h2>Ayın xülasəsi</h2><ul>${ins.map(x=>`<li>${x}</li>`).join("")}</ul>
${top.length?`<h2>Ən yaxşı paylaşımlar</h2><div class="posts">${top.map(x=>`<div class="p">${x.thumb?`<img src="${esc(x.thumb)}" alt="" onerror="this.style.display='none'">`:""}<div><b>${esc(fmtWhen(x.ts))}</b> · ${IGS_TYPE(x)}<br>${(x.metrics||{}).reach?igsNum(x.metrics.reach)+" reach · ":""}♥ ${igsNum(x.likes)} · 💬 ${igsNum(x.comments)}</div></div>`).join("")}</div>`:""}
${cur.media.length?`<h2>Bütün paylaşımlar (${cur.media.length})</h2><table><thead><tr><th>Tarix</th><th>Növ</th><th>Reach</th><th>Görünt.</th><th>♥</th><th>💬</th><th>Yadda</th><th>Paylaş</th></tr></thead><tbody>${cur.media.slice().sort((a,b)=>Date.parse(a.ts)-Date.parse(b.ts)).map(x=>{const M=x.metrics||{};return `<tr><td>${esc(fmtWhen(x.ts))}</td><td>${IGS_TYPE(x)}</td><td>${igsNum(M.reach)}</td><td>${igsNum(M.views)}</td><td>${igsNum(x.likes)}</td><td>${igsNum(x.comments)}</td><td>${igsNum(M.saved)}</td><td>${igsNum(M.shares)}</td></tr>`;}).join("")}</tbody></table>`:""}
<p class="sub" style="margin-top:22px">Mənbə: Instagram rəsmi statistikası (Meta). Hazırladı: MezMoon — mezmoonagency.az</p>
</body></html>`;
  const w=window.open("","_blank");if(!w){alert("Brauzer yeni pəncərəni blokladı — pop-up icazəsi verin.");return;}
  w.document.open();w.document.write(html);w.document.close();
}

/* ---------- Panelə girişlər ---------- */
let lgRows=null,lgDays=[],lgLoading=false,lgErr="",lgF={user:"",days:"0"};
let touchT=null,touchLast=0;
function touchNow(){if(!me||Date.now()-touchLast<60e3)return;touchLast=Date.now();sb.rpc('touch_session',{ua:navigator.userAgent}).then(()=>{},()=>{});}
function startTouch(){touchLast=0;touchNow();if(!touchT){touchT=setInterval(()=>{if(document.visibilityState==="visible")touchNow();},120e3);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")touchNow();});}}
async function loadLogins(){
  lgLoading=true;lgErr="";
  let q=sb.from('login_sessions').select('*').order('login_at',{ascending:false}).limit(5000);
  let qd=sb.from('panel_days').select('*').order('day',{ascending:false}).limit(10000);
  if(+lgF.days){const since=new Date(Date.now()-(+lgF.days)*864e5).toISOString();q=q.or(`login_at.gte.${since},logout_at.is.null,last_active_at.gte.${since}`);
    qd=qd.gte('day',bakuISO(Date.now()-(+lgF.days-1)*864e5));}
  const [r1,r2]=await Promise.all([q,qd]);
  lgLoading=false;
  const error=r1.error||r2.error;
  if(error){lgErr=error.message;lgRows=[];lgDays=[];}else{lgRows=r1.data||[];lgDays=r2.data||[];}
  if(view==="attendance"&&att.tab==="panel")render();
}
function lgDevice(ua){ua=ua||"";
  const os=/iPhone/.test(ua)?"iPhone":/iPad/.test(ua)?"iPad":/Android/.test(ua)?"Android":/Mac OS X|Macintosh/.test(ua)?"Mac":/Windows/.test(ua)?"Windows":/Linux/.test(ua)?"Linux":"";
  const br=/Edg\//.test(ua)?"Edge":/OPR\/|Opera/.test(ua)?"Opera":/YaBrowser/.test(ua)?"Yandex":/Firefox\//.test(ua)?"Firefox":/Chrome\//.test(ua)?"Chrome":/Safari\//.test(ua)?"Safari":"";
  return [os,br].filter(Boolean).join(" · ")||"—";}
function lgAgo(iso){if(!iso)return "—";const m=Math.round((Date.now()-Date.parse(iso))/60e3);
  if(m<3)return "indi";if(m<60)return m+" dəq əvvəl";const h=Math.round(m/60);if(h<24)return h+" saat əvvəl";const d=Math.round(h/24);return d+" gün əvvəl";}
function lgOnline(r){return !r.logout_at&&r.last_active_at&&Date.now()-Date.parse(r.last_active_at)<5*60e3;}
function renderLogins(seg){
  const wrap=el("div");
  if(lgRows===null&&!lgLoading)loadLogins();
  const bar=el("div");bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px";
  if(seg)bar.appendChild(seg);
  const selSt="font-size:13px;padding:8px 11px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--ink)";
  const mkSel=(key,opts)=>{const s=el("select");s.style.cssText=selSt;s.innerHTML=opts.map(([v,l])=>`<option value="${esc(v)}"${String(lgF[key])===String(v)?" selected":""}>${esc(l)}</option>`).join("");
    s.onchange=()=>{lgF[key]=s.value;if(key==="days")lgRows=null;render();};return s;};
  bar.appendChild(mkSel("days",[["0","Bütün tarixçə"],["1","Son 24 saat"],["7","Son 7 gün"],["30","Son 30 gün"]]));
  bar.appendChild(mkSel("user",[["","Bütün işçilər"],...state.profiles.map(p=>[p.id,p.full_name||p.username])]));
  const rb=el("button","mini","↻ Yenilə");rb.style.marginLeft="auto";rb.onclick=()=>{lgRows=null;render();};bar.appendChild(rb);
  wrap.appendChild(bar);
  if(lgRows===null||lgLoading){wrap.appendChild(el("div","panel",'<div class="empty">Yüklənir…</div>'));return wrap;}
  if(lgErr){wrap.appendChild(el("div","panel",`<div class="empty">Xəta: ${esc(lgErr)}</div>`));return wrap;}
  const nm=id=>{const p=state.profiles.find(x=>x.id===id);return p?(p.full_name||p.username):"Naməlum";};
  const rl=id=>{const p=state.profiles.find(x=>x.id===id);return p&&ROLES[p.role]?ROLES[p.role].label:"";};
  const hm=iso=>{const d=new Date(iso);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");};
  const dayOf=iso=>bakuISO(Date.parse(iso));
  const today=bakuISO();
  const isOn=d=>d.day===today&&Date.now()-Date.parse(d.last_at)<5*60e3;
  /* hər işçi üzrə xülasə */
  const per={};const P=id=>per[id]||(per[id]={login:null,active:null,logout:null,days:0,online:false});
  lgDays.forEach(d=>{const o=P(d.user_id);o.days++;
    if(!o.dayFirst||d.day>o.dayFirst.day)o.dayFirst=d;
    if(!o.active||d.last_at>o.active)o.active=d.last_at;if(isOn(d))o.online=true;});
  lgRows.forEach(r=>{const o=P(r.user_id);
    if(r.logout_at&&(!o.logout||r.logout_at>o.logout))o.logout=r.logout_at;
    if(!o.pw||r.login_at>o.pw)o.pw=r.login_at;
    if(lgOnline(r))o.online=true;
    const a=r.last_active_at||r.login_at;if(!o.active||a>o.active)o.active=a;});
  Object.values(per).forEach(o=>{o.login=o.dayFirst?o.dayFirst.first_at:null;if(o.pw&&(!o.login||o.pw>o.login))o.login=o.pw;});
  const people=state.profiles.filter(p=>p.role).map(p=>({id:p.id,...(per[p.id]||{})})).filter(x=>!lgF.user||x.id===lgF.user)
    .sort((a,b)=>(b.online-a.online)||String(b.active||"").localeCompare(String(a.active||"")));
  const nOn=people.filter(x=>x.online).length;
  const p1=el("div","panel");p1.style.marginBottom="14px";
  p1.appendChild(el("div","ph",`<h3>Son giriş — hamı</h3><span class="count">${people.length} işçi${nOn?` · <span style="color:var(--good)">● ${nOn} hazırda panel açıqdır</span>`:""}</span>`));
  const tw=el("div");tw.style.overflowX="auto";
  tw.innerHTML=`<table class="tbl" style="width:100%;font-size:13px;border-collapse:collapse"><thead><tr style="text-align:left;color:var(--muted);font-size:11.5px"><th style="padding:8px 12px">İşçi</th><th style="padding:8px">Son giriş</th><th style="padding:8px">Son aktivlik</th><th style="padding:8px">Son çıxış (düymə ilə)</th><th style="padding:8px">Aktiv gün</th></tr></thead><tbody>${people.map(x=>`<tr style="border-top:1px solid var(--border);cursor:pointer" data-lgu="${esc(x.id)}" title="Bu işçinin tarixçəsi">
    <td style="padding:9px 12px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px;background:${x.online?"var(--good)":"var(--border)"}"></span><strong>${esc(nm(x.id))}</strong> <span class="hint">${esc(rl(x.id))}</span></td>
    <td class="num" style="padding:9px 8px;white-space:nowrap">${x.login?esc(fmtWhen(x.login)):"—"}</td>
    <td class="num" style="padding:9px 8px;white-space:nowrap">${x.online?`<span style="color:var(--good);font-weight:600">● indi onlayn</span>`:x.active?`${esc(fmtWhen(x.active))} <span class="hint">· ${esc(lgAgo(x.active))}</span>`:"—"}</td>
    <td class="num" style="padding:9px 8px;white-space:nowrap">${x.logout?esc(fmtWhen(x.logout)):"—"}</td>
    <td class="num" style="padding:9px 8px">${x.days||"—"}</td></tr>`).join("")}</tbody></table>`;
  tw.querySelectorAll("[data-lgu]").forEach(tr=>tr.onclick=()=>{lgF.user=lgF.user===tr.dataset.lgu?"":tr.dataset.lgu;render();});
  p1.appendChild(tw);wrap.appendChild(p1);
  /* gün-gün tarixçə: hər işçinin hər günü — ilk giriş və son aktivlik */
  const ev={};lgRows.forEach(r=>{
    (ev[r.user_id+"|"+dayOf(r.login_at)]??=[]).push({t:r.login_at,h:`🔑 Parolla giriş ${hm(r.login_at)} · ${lgDevice(r.user_agent)}`});
    if(r.logout_at)(ev[r.user_id+"|"+dayOf(r.logout_at)]??=[]).push({t:r.logout_at,h:`${r.ended==="expired"?"⌛ Sessiya bitdi":"⏏ Çıxış"} ${hm(r.logout_at)}`});});
  const rows=lgDays.filter(d=>!lgF.user||d.user_id===lgF.user).sort((a,b)=>b.day.localeCompare(a.day)||b.first_at.localeCompare(a.first_at));
  const p2=el("div","panel");
  p2.appendChild(el("div","ph",`<h3>Giriş-çıxış tarixçəsi${lgF.user?" — "+esc(nm(lgF.user)):""}</h3><span class="count">${rows.length} gün</span>`));
  if(!rows.length){p2.appendChild(el("div","empty","Bu dövrdə giriş yoxdur"));wrap.appendChild(p2);return wrap;}
  const box=el("div");let lastDay="";
  const dayLbl=d=>{const [y,m,dd]=d.split("-");const wd=["Bazar","B.e.","Ç.a.","Çərş.","C.a.","Cümə","Şənbə"][new Date(d+"T12:00").getDay()];return `${dd}.${m}.${y} · ${wd}${d===today?" · bu gün":""}`;};
  box.innerHTML=rows.map(d=>{const on=isOn(d);const extra=(ev[d.user_id+"|"+d.day]||[]).sort((a,b)=>a.t.localeCompare(b.t));
    const head=d.day!==lastDay?`<div style="padding:9px 14px 5px;font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;border-top:1px solid var(--border)">${esc(dayLbl(d.day))}</div>`:"";lastDay=d.day;
    return head+`<div class="aud-row"><div class="aud-when">${esc(hm(d.first_at))} → ${on?"indi":esc(hm(d.last_at))}</div><div style="min-width:0"><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><strong style="font-size:13px">${esc(nm(d.user_id))}</strong><span class="hint">${esc(rl(d.user_id))}</span><span class="chip c-accent" style="font-size:10.5px">↪ Giriş ${esc(hm(d.first_at))}</span>${on?`<span class="chip c-good" style="font-size:10.5px">● Onlayn</span>`:`<span class="chip c-mut" style="font-size:10.5px">Son aktivlik ${esc(hm(d.last_at))}</span>`}</div>
      ${extra.length||d.user_agent?`<div class="hint" style="margin-top:4px">${extra.map(e=>esc(e.h)).join(" · ")}${extra.length&&d.user_agent?" · ":""}${d.user_agent&&!extra.length?esc(lgDevice(d.user_agent)):""}</div>`:""}</div></div>`;}).join("");
  p2.appendChild(box);wrap.appendChild(p2);
  return wrap;
}

/* ---------- Add modal ---------- */
function openAdd(){if(view==="leads")openLeadForm(null);else if(view==="meetings")openMeetForm();else if(view==="smm")openSmmForm();else openForm(null);}
function selOpts(list,sel){return list.map(o=>`<option${String(o)===String(sel)?" selected":""}>${esc(o)}</option>`).join("");}
function openForm(edit,pre){
  const scrim=el("div","scrim");const mode=view;const e=edit||pre||{};
  const isEdit=!!edit;
  const title=(isEdit?"Düzəliş — ":"Yeni ")+(mode==="shoots"?"çəkiliş":mode==="content"?"kontent":mode==="briefs"?"brif":"klient");
  const clientNames=(mode==="briefs"?pmClients():mode==="shoots"?allClients():state.clients).map(c=>c.name);
  const designers=state.profiles.filter(p=>p.role==='designer').map(p=>p.full_name||p.username);
  const desList=designers.length?designers:["Dizayner"];
  const platforms=["Instagram","TikTok","Facebook"];
  let form;
  const todayISO=new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0")+"-"+String(new Date().getDate()).padStart(2,"0");
  const ops=state.profiles.filter(p=>p.role==='operator').map(p=>p.full_name||p.username);
  const shP=e.shoot_date?shootDate(e.shoot_date):null;
  const shD=shP?shP.d:new Date().getDate();
  const shMo=shP?shP.mo:calM;
  const tP=String(e.shoot_time||'').split(':');
  const shH=tP[0]!==undefined&&tP[0]!==''?String(+tP[0]).padStart(2,'0'):"";
  const shMi=tP.length>1&&tP[1]!==''?String(+tP[1]).padStart(2,'0'):"";
  if(mode==="shoots")form=`<div class="field"><label>Müştəri</label><select id="f1">${selOpts(clientNames,e.client)}</select></div>
    <div class="field"><label>Tarix (gün / ay)</label><div style="display:flex;gap:8px">
      <select id="f3d" style="flex:1">${Array.from({length:31},(_,i)=>i+1).map(dv=>`<option${dv===shD?" selected":""}>${dv}</option>`).join("")}</select>
      <select id="f3m" style="flex:2">${MONTHS_AZ.map((m,i)=>`<option value="${i+1}"${i===shMo?" selected":""}>${m}</option>`).join("")}</select>
    </div></div>
    <div class="field"><label>Saat</label><div style="display:flex;gap:8px;align-items:center">
      <select id="f4h" style="flex:1"><option value="">—</option>${Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(hv=>`<option${hv===shH?" selected":""}>${hv}</option>`).join("")}</select>
      <span style="opacity:.6;font-weight:700">:</span>
      <select id="f4mi" style="flex:1"><option value="">00</option>${['00','05','10','15','20','25','30','35','40','45','50','55'].map(mv=>`<option${mv===shMi?" selected":""}>${mv}</option>`).join("")}</select>
    </div></div>
    <div class="field"><label>Hansı ayın çəkilişi?</label><select id="f6">${MONTHS_AZ.map((m,i)=>`<option${(e.month?m===e.month:i===calM)?" selected":""}>${m}</option>`).join("")}</select></div>
    <div class="field"><label>Video operator</label><input id="f2" list="oplist" placeholder="ad seç və ya yaz" value="${esc(e.video_op||'')}"></div>
    <div class="field"><label>Foto operator (yoxdursa boş)</label><input id="f5" list="oplist" placeholder="ad və ya boş" value="${esc(e.photo_op||'')}"></div>
    <div class="field"><label>Model(lər) — yoxdursa boş</label><input id="f7" placeholder="məs. Aysel, Elvin" value="${esc(e.model_name||'')}"></div>
    <datalist id="oplist">${ops.map(o=>`<option value="${esc(o)}"></option>`).join("")}</datalist>`;
  else if(mode==="content")form=`<div class="field"><label>Müştəri</label><select id="f1">${selOpts(clientNames,e.client)}</select></div>
    <div class="field"><label>Başlıq</label><input id="f2" placeholder="Yeni set Reels" value="${esc(e.title||'')}"></div>
    <div class="field"><label>Platforma</label><select id="f3">${selOpts(platforms,e.platform)}</select></div>
    <div class="field"><label>Ay</label><select id="f4">${MONTHS_AZ.map((m,i)=>`<option${(isEdit?m===e.month:i===calM)?" selected":""}>${m}</option>`).join("")}</select></div>
    <div class="field"><label>Növ</label><select id="f5">${CONTENT_KINDS.map(k=>`<option value="${k[0]}"${(e.kind||"kontent")===k[0]?" selected":""}>${k[1]}</option>`).join("")}</select></div>
    <div class="field" id="wkf" style="${e.kind==="atmosfer"?"":"display:none"}"><label>Hansı həftənin çəkilişi?</label><select id="f6">${[1,2,3,4,5].map(w=>`<option value="${w}"${+e.week===w?" selected":""}>${w}-ci həftə</option>`).join("")}</select></div>`;
  else if(mode==="briefs")form=`<div class="field"><label>Brif növü</label><div class="seg" style="margin:0;width:100%">
      <button type="button" data-bk="design" class="${isMotionOnly(e)?'':'on'}" style="flex:1"${isEdit?" disabled":""}>🎨 Dizayn brifi</button>
      <button type="button" data-bk="motion_only" class="${isMotionOnly(e)?'on':''}" style="flex:1"${isEdit?" disabled":""}>🎞 Yalnız motion brifi</button></div>${isEdit?`<div class="hint" style="margin-top:4px">Növ yaradılandan sonra dəyişmir.</div>`:""}</div>
    <div class="field"><label>Müştəri</label><select id="f1">${selOpts(clientNames,e.client)}</select></div>
    <div class="field"><label id="f2l">${isMotionOnly(e)?"Motion brifi":"Başlıq / brif"}</label><textarea id="f2" rows="7" style="line-height:1.5" placeholder="${isMotionOnly(e)?"Nə hazırlanmalıdır — video, müddət, format, musiqi, mətn (Enter ilə yeni abzas)":"Nə dizayn olunmalıdır — qısa brif (Enter ilə yeni abzas)"}">${esc(e.title||'')}</textarea></div>
    <div class="field"><label>Referans link</label><input id="f3" placeholder="https://… (istəyə bağlı)" value="${esc(e.ref_link||'')}"></div>
    <div class="field"><label class="urgtoggle"><input type="checkbox" id="furg"${e.urgent?" checked":""}> 🔥 Təcili brif</label></div>
    <div class="field dz-only" style="${isMotionOnly(e)?'display:none':''}"><label>Deadline (dizayn — yalnız həftə içi)</label><input id="fdl" type="date" value="${esc(e.deadline||'')}"><div id="fdlw" class="hint" style="color:var(--crit);min-height:0"></div></div>
    <div class="field"><label>Brif faylları (bir neçə fayl seçmək olar)</label><div id="bflist" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px"></div><button type="button" class="btn ghost" id="bfadd" style="padding:6px 12px">${ICON.attach} Fayl əlavə et</button></div>
    <div class="field dz-only" style="${isMotionOnly(e)?'display:none':''}"><label>Motion dizayn olacaq?</label><div class="seg" style="margin:0;width:100%">
      <button type="button" data-mo="1" class="${e.motion?'on':''}" style="flex:1">Bəli</button>
      <button type="button" data-mo="0" class="${e.motion?'':'on'}" style="flex:1">Xeyr</button></div></div>
    <div class="field" id="fmbw" style="${e.motion&&!isMotionOnly(e)?'':'display:none'}"><label>Motion brifi (motion dizayner üçün)</label><textarea id="fmb" rows="5" style="line-height:1.5" placeholder="Motion dizayner nə etməlidir — animasiya, müddət, format, musiqi, keçidlər…">${esc(e.motion_brief||'')}</textarea>
      <div style="margin-top:8px"><div id="mblist" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px"></div><button type="button" class="btn ghost" id="mbadd" style="padding:6px 12px">${ICON.attach} Motion üçün fayl əlavə et</button></div></div>
    <div class="field" id="fmdlw" style="${e.motion||isMotionOnly(e)?'':'display:none'}"><label>Motion deadline (həftəsonu da olar)</label><input id="fmdl" type="date" value="${esc(e.motion_deadline||'')}"></div>`;
  else form=`<div class="field"><label>Klient adı</label><input id="f1" placeholder="Yeni Restoran" value="${esc(e.name||'')}"></div>
    <div class="field"><label>Paket</label><input id="f2" placeholder="SMM + Video" value="${esc(e.pkg||'')}"></div>
    <div class="field"><label>Aylıq video sayı (paket)</label><input id="f6" type="number" min="0" placeholder="məs. 8" value="${esc(e.video_quota||'')}"></div>
    ${role==="ceo"?`<div class="field"><label>Aylıq (₼)</label><input id="f3" type="number" placeholder="1200" value="${esc(e.fee||'')}"></div>
    <div class="field"><label>Ödəniş günü (ayın günü)</label><input id="f7" type="number" min="1" max="31" placeholder="məs. 5" value="${esc(e.pay_day||'')}"></div>
    <div class="field"><label>Məsul Project Manager</label><select id="fpm"><option value="">— təyin olunmayıb —</option>${state.profiles.filter(x=>x.role==="pm").map(x=>`<option value="${x.id}"${e.pm_id===x.id?" selected":""}>${esc(x.full_name||x.username)}</option>`).join("")}</select></div>`:""}`;
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>${esc(title)}</h3><button>×</button></div><div class="mb">${form}</div><div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" data-ok>${isEdit?"Yadda saxla":"Əlavə et"}</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  scrim._briefMotion=!!e.motion;scrim._briefKind=isMotionOnly(e)?"motion_only":"design";
  {const k=scrim.querySelector("#f5");if(k&&mode==="content")k.onchange=()=>{scrim.querySelector("#wkf").style.display=k.value==="atmosfer"?"":"none";};}
  if(mode==="briefs"){
    scrim._bfKeep=briefFiles(e);scrim._bfNew=[];
    const drawBf=()=>{const box=scrim.querySelector("#bflist");if(!box)return;
      box.innerHTML=scrim._bfKeep.map((f,i)=>`<span class="chip c-mut" style="font-size:10.5px">${ICON.file}${esc(fileName(f))} <button type="button" data-bfk="${i}" style="border:none;background:none;cursor:pointer;padding:0 2px" title="Çıxar">×</button></span>`).join("")
        +scrim._bfNew.map((f,i)=>`<span class="chip c-accent" style="font-size:10.5px">${ICON.file}${esc(f.name)} <button type="button" data-bfn="${i}" style="border:none;background:none;cursor:pointer;padding:0 2px" title="Çıxar">×</button></span>`).join("");
      box.querySelectorAll("[data-bfk]").forEach(x=>x.onclick=()=>{scrim._bfKeep.splice(+x.dataset.bfk,1);drawBf();});
      box.querySelectorAll("[data-bfn]").forEach(x=>x.onclick=()=>{scrim._bfNew.splice(+x.dataset.bfn,1);drawBf();});};
    drawBf();
    scrim._mbKeep=motionBriefFiles(e);scrim._mbNew=[];
    const drawMb=()=>{const box=scrim.querySelector("#mblist");if(!box)return;
      box.innerHTML=scrim._mbKeep.map((f,i)=>`<span class="chip c-mut" style="font-size:10.5px">${ICON.file}${esc(fileName(f))} <button type="button" data-mbk="${i}" style="border:none;background:none;cursor:pointer;padding:0 2px" title="Çıxar">×</button></span>`).join("")
        +scrim._mbNew.map((f,i)=>`<span class="chip c-accent" style="font-size:10.5px">${ICON.file}${esc(f.name)} <button type="button" data-mbn="${i}" style="border:none;background:none;cursor:pointer;padding:0 2px" title="Çıxar">×</button></span>`).join("");
      box.querySelectorAll("[data-mbk]").forEach(x=>x.onclick=()=>{scrim._mbKeep.splice(+x.dataset.mbk,1);drawMb();});
      box.querySelectorAll("[data-mbn]").forEach(x=>x.onclick=()=>{scrim._mbNew.splice(+x.dataset.mbn,1);drawMb();});};
    drawMb();
    {const mb=scrim.querySelector("#mbadd");if(mb)mb.onclick=async()=>{const fs=await pickFiles("");const big=fs.filter(f=>f.size>50*1024*1024);if(big.length)alert("50 MB-dan böyük fayllar əlavə olunmadı: "+big.map(f=>f.name).join(", ")+"\nBöyük fayllar üçün Referans link (Drive) istifadə et.");scrim._mbNew.push(...fs.filter(f=>f.size<=50*1024*1024));drawMb();};}
    scrim.querySelector("#bfadd").onclick=async()=>{const fs=await pickFiles("");const big=fs.filter(f=>f.size>50*1024*1024);if(big.length)alert("50 MB-dan böyük fayllar əlavə olunmadı: "+big.map(f=>f.name).join(", ")+"\nBöyük fayllar üçün Referans link (Drive) istifadə et.");scrim._bfNew.push(...fs.filter(f=>f.size<=50*1024*1024));drawBf();};
  }
  const syncBriefForm=()=>{const mo=scrim._briefKind==="motion_only";
    scrim.querySelectorAll(".dz-only").forEach(x=>x.style.display=mo?"none":"");
    const show=(id,on)=>{const w=scrim.querySelector(id);if(w)w.style.display=on?"":"none";};
    show("#fmbw",!mo&&scrim._briefMotion);show("#fmdlw",mo||scrim._briefMotion);
    const l=scrim.querySelector("#f2l");if(l)l.textContent=mo?"Motion brifi":"Başlıq / brif";
    const t=scrim.querySelector("#f2");if(t)t.placeholder=mo?"Nə hazırlanmalıdır — video, müddət, format, musiqi, mətn (Enter ilə yeni abzas)":"Nə dizayn olunmalıdır — qısa brif (Enter ilə yeni abzas)";};
  scrim.querySelectorAll("[data-bk]").forEach(btn=>btn.onclick=()=>{if(btn.disabled)return;scrim._briefKind=btn.dataset.bk;scrim.querySelectorAll("[data-bk]").forEach(x=>x.classList.toggle("on",x===btn));syncBriefForm();});
  scrim.querySelectorAll("[data-mo]").forEach(btn=>btn.onclick=()=>{scrim._briefMotion=btn.dataset.mo==="1";scrim.querySelectorAll("[data-mo]").forEach(x=>x.classList.toggle("on",x.dataset.mo===(scrim._briefMotion?"1":"0")));syncBriefForm();});
  {const d=scrim.querySelector("#fdl");if(d&&mode==="briefs")d.onchange=()=>{scrim.querySelector("#fdlw").textContent=isWeekend(d.value)?"Şənbə/bazar seçilə bilməz — dizaynerlər həftə içi işləyir.":"";};}
  const v=id=>{const e2=scrim.querySelector("#"+id);return e2?e2.value.trim():"";};
  scrim.querySelector("[data-ok]").onclick=async()=>{
    if(mode==="shoots"){if(!v("f1"))return;const dd=String(v("f3d")||shD).padStart(2,'0')+"."+String(v("f3m")||"1").padStart(2,'0');const hh=v("f4h");const tm=hh?hh+":"+(v("f4mi")||"00"):"";const p={client:v("f1"),shoot_date:dd,shoot_time:tm,month:v("f6"),video_op:v("f2"),photo_op:v("f5"),model_name:v("f7")};if(isEdit)await upd('shoots',e.id,p);else{await ins('shoots',{...p,held:"",stage:1,kind:shootKind});if(pre&&pre._draft){await sb.from('shoot_drafts').delete().eq('id',pre._draft);await reload('shoot_drafts');}}}
    else if(mode==="content"){if(!v("f2"))return;const p={client:v("f1"),title:v("f2"),platform:v("f3"),month:v("f4"),kind:v("f5")||"kontent",week:v("f5")==="atmosfer"?(+v("f6")||null):null};if(isEdit)await upd('content',e.id,p);else await ins('content',{...p,status:"Hazırlanır"});}
    else if(mode==="briefs"){if(!v("f2"))return;
      const motionOnly=scrim._briefKind==="motion_only";
      if(!motionOnly&&isWeekend(v("fdl"))&&(!isEdit||(e.deadline||"")!==v("fdl"))){alert("Dizayn deadline-ı şənbə və ya bazar ola bilməz — dizaynerlər həftə içi işləyir. Həftə içi bir gün seç.");return;}
      const ok=scrim.querySelector("[data-ok]");ok.disabled=true;ok.textContent="Yüklənir…";
      const paths=scrim._bfKeep.slice();
      for(const f of scrim._bfNew){const path=await uploadTo("briefs",f);if(!path){ok.disabled=false;ok.textContent=isEdit?"Yadda saxla":"Əlavə et";return;}paths.push(path);}
      /* motion brifinin faylları — yalnız «dizayn + motion» brifində saxlanılır */
      const keepMb=!motionOnly&&scrim._briefMotion;const mpaths=keepMb?scrim._mbKeep.slice():[];
      if(keepMb)for(const f of scrim._mbNew){const path=await uploadTo("briefs",f);if(!path){ok.disabled=false;ok.textContent=isEdit?"Yadda saxla":"Əlavə et";return;}mpaths.push(path);}
      const removed=[...briefFiles(e).filter(f=>!paths.includes(f)),...motionBriefFiles(e).filter(f=>!mpaths.includes(f))].filter(f=>!/^https?:\/\//.test(f));
      if(removed.length){try{await sb.storage.from('crm-files').remove(removed);}catch(er){}}
      const p=motionOnly
        ?{client:v("f1"),title:v("f2"),ref_link:v("f3"),motion:true,brief_file:paths.length?JSON.stringify(paths):null,deadline:null,motion_deadline:v("fmdl")||null,motion_brief:null,motion_brief_files:[],urgent:!!(scrim.querySelector("#furg")||{}).checked}
        :{client:v("f1"),title:v("f2"),ref_link:v("f3"),motion:!!scrim._briefMotion,brief_file:paths.length?JSON.stringify(paths):null,deadline:v("fdl")||null,motion_deadline:scrim._briefMotion?(v("fmdl")||null):null,motion_brief:scrim._briefMotion?(v("fmb")||null):null,motion_brief_files:mpaths,urgent:!!(scrim.querySelector("#furg")||{}).checked};
      if(isEdit){if((e.deadline||null)!==p.deadline)p.dl_soon_notified_at=null;await upd('briefs',e.id,p);}
      else if(motionOnly){
        /* yalnız motion: dizayn mərhələsini keçir — birbaşa motion sütununa, motion dizaynerlərə bildiriş */
        await ins('briefs',{...p,kind:"motion_only",status:"Motion",motion_stage:""});
        const body=`Kim tərəfindən: ${myName()}\nMəkan: ${p.client}\nMotion deadline: ${fmtDl(p.motion_deadline)}${p.ref_link?"\nReferans: "+p.ref_link:""}${paths.length?"\nFayllar: "+paths.map(fileName).join(", "):""}\n\n🎞 Motion brifi:\n${p.title}`;
        try{await sb.from('notifications').insert({target_type:"role",target:"motion",title:(p.urgent?"🔥 TƏCİLİ · ":"")+"🎞 Yeni motion brifi var",body,from_name:myName(),from_id:me?me.id:null,read_by:[],urgent:!!p.urgent});}catch(er){}
      }else{await ins('briefs',{...p,kind:"design",status:"Açıq"});
        const body=`Kim tərəfindən: ${myName()}\nMəkan: ${p.client}\nDeadline: ${fmtDl(p.deadline)}${p.motion?"\nMotion: bəli — dizayn təsdiqlənəndən sonra motion dizaynerə keçəcək (motion deadline: "+fmtDl(p.motion_deadline)+")"+(mpaths.length?"\nMotion faylları: "+mpaths.map(fileName).join(", "):""):""}${p.ref_link?"\nReferans: "+p.ref_link:""}${paths.length?"\nFayllar: "+paths.map(fileName).join(", "):""}\n\nDetallar:\n${p.title}`;
        try{await sb.from('notifications').insert({target_type:"role",target:"designer",title:(p.urgent?"🔥 TƏCİLİ · ":"")+"🎨 Yeni dizayn brifi var",body,from_name:myName(),from_id:me?me.id:null,read_by:[],urgent:!!p.urgent});}catch(er){}}}
    else{if(!v("f1"))return;
      const nm=v("f1");const dup=state.clients.find(c=>c.name.trim().toLowerCase()===nm.toLowerCase()&&(!isEdit||c.id!==e.id));
      if(dup){alert("«"+dup.name+"» adlı müştəri artıq var. Başqa ad seç.");return;}
      const p={name:nm,pkg:v("f2"),video_quota:+v("f6")||0};if(role==="ceo"){p.fee=+v("f3")||0;p.pay_day=+v("f7")||null;p.pm_id=v("fpm")||null;}
      if(isEdit){
        const renamed=e.name!==nm;
        if(renamed&&!confirm("Müştərinin adı «"+e.name+"» → «"+nm+"» dəyişəcək.\nBütün çəkilişlər, kontent, brif, task, hesabat və ödənişlər yeni ada avtomatik keçiriləcək.\nDavam edək?"))return;
        await upd('clients',e.id,p);
        if(renamed){for(const t of ['shoots','content','briefs','tasks','reports','payments'])await reload(t);}
      }else await ins('clients',{...p,status:"Onboarding"});}
    close();
  };
}
async function confirmDel(t,id,label){if(confirm((label||"Bu qeyd")+" silinsin? Bu əməliyyat geri qaytarıla bilməz.")){await del(t,id);}}

/* ---------- Tasks ---------- */
function taskRoleLabel(k){return ROLES[k]?ROLES[k].label:k;}
function peopleOf(roleKey){return state.profiles.filter(p=>p.role===roleKey);}
/* İşçinin panel aktivliyi — tasklar və briflərdə ad yanında, hamı görür */
let actMap={},actAt=0,actLoading=false;
async function actEnsure(force){
  if(!me||actLoading||(!force&&Date.now()-actAt<110e3))return;
  actLoading=true;
  const {data}=await sb.rpc('team_activity');
  actLoading=false;actAt=Date.now();
  const m={};(data||[]).forEach(r=>{if(!m[r.user_id]||r.last_at>m[r.user_id])m[r.user_id]=r.last_at;});
  const ch=JSON.stringify(m)!==JSON.stringify(actMap);actMap=m;
  if(ch&&(view==="tasks"||view==="briefs"||view==="ofis"))render();
}
setInterval(()=>{if(document.visibilityState==="visible"&&(view==="tasks"||view==="briefs"||view==="ofis"))actEnsure();},120e3);
function actTag(id){
  if(!id)return "";
  const t=actMap[id];
  if(!t)return ` <span class="actd" title="Panelə son 60 gündə girməyib"><i></i>—</span>`;
  const m=Math.round((Date.now()-Date.parse(t))/60e3);
  const on=m<5;const txt=on?"onlayn":m<60?m+" dəq":m<1440?Math.round(m/60)+" saat":Math.round(m/1440)+" gün";
  return ` <span class="actd${on?" on":m<1440?" today":""}" title="Panelda son aktivlik: ${esc(fmtWhen(t))}"><i></i>${txt}</span>`;
}
function actTagName(name){if(!name)return "";const p=state.profiles.find(x=>(x.full_name||x.username)===name);return p?actTag(p.id):"";}
function personName(id){const p=state.profiles.find(x=>x.id===id);return p?(p.full_name||p.username):"?";}
function taskAssignees(t){return Array.isArray(t.assignees)?t.assignees:[];}
function taskIsMine(t){const as=taskAssignees(t);if(as.length)return !!(me&&as.includes(me.id));return t.role===role;}
function taskTargetChip(t){const as=taskAssignees(t);if(as.length){const names=as.map(personName);const shown=as.slice(0,2).map(id=>esc(personName(id))+actTag(id)).join(", ");return `<span class="chip c-accent" style="font-size:10.5px;padding:2px 7px">${ICON.users}${shown}${names.length>2?" +"+(names.length-2):""}</span>`;}return `<span class="chip c-accent" style="font-size:10.5px;padding:2px 7px">${ICON.users}${esc(taskRoleLabel(t.role))} · hamı</span>`;}
function parseDate(s){if(!s)return null;const p=String(s).slice(0,10).split('-').map(Number);if(p.length<3||!p[0])return null;return new Date(p[0],p[1]-1,p[2]);}
function fmtDate(s){const d=parseDate(s);return d?String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0"):"—";}
/* "YYYY-MM-DD" → şənbə/bazardırmı (yerli tarix kimi) */
function isWeekend(ymd){const m=String(ymd||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return false;const d=new Date(+m[1],+m[2]-1,+m[3]).getDay();return d===0||d===6;}
function fmtDl(ymd){return ymd?String(ymd).slice(0,10).split("-").reverse().join("."):"yoxdur";}
function dlInfo(deadline,status){
  if(status==="Təhvil verildi"||status==="Təsdiqləndi")return {c:"good",txt:deadline?fmtDate(deadline):"—"};
  const d=parseDate(deadline);if(!d)return {c:"mut",txt:"Deadline yox"};
  const today=new Date();today.setHours(0,0,0,0);
  const days=Math.round((d-today)/86400000);
  if(days<0)return {c:"crit",txt:fmtDate(deadline)+" · "+(-days)+" gün gecikib"};
  if(days===0)return {c:"warn",txt:"Bu gün"};
  if(days<=2)return {c:"warn",txt:fmtDate(deadline)+" · "+days+" gün qalıb"};
  return {c:"good",txt:fmtDate(deadline)+" · "+days+" gün qalıb"};
}
/* ---------- To-do: şəxsi siyahı ----------
   Bazada (RLS): sahib öz qeydlərini yaradır/dəyişir/silir; PM CEO-dan başqa hamınınkını, CEO hamınınkını görür (yalnız oxu).
   İki növ: bir dəfəlik (done) və gündəlik (daily) — gündəlik işin hər "Gördüm"ü todo_checks-də ayrıca gün kimi saxlanır. */
let todoWho="",todoShowDone=false,todoAddDaily=false;
const TD_REPEAT=IC('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>');
const todoDay=(off=0)=>{const d=new Date();d.setDate(d.getDate()+off);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const todoName=id=>{const p=state.profiles.find(x=>x.id===id);return p?(p.full_name||p.username):"—";};
const todoChk=(x,day)=>state.todo_checks.find(c=>c.todo_id===x.id&&c.day===day);
const todoIsDone=x=>x.daily?!!todoChk(x,todoDay()):!!x.done;
const todoHM=ts=>{const d=new Date(ts);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");};
function todoCss(){
  if(document.getElementById("td-css"))return;
  const s=document.createElement("style");s.id="td-css";s.textContent=`
  .td-add{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:end;padding:14px 16px;border-bottom:1px solid var(--border)}
  .td-add>*{min-width:0}.td-add .field{margin:0}.td-add input[type=text]{width:100%}.td-add .btn{white-space:nowrap}.td-add .td-dr{display:flex;gap:8px}.td-add .td-dr input{flex:1;min-width:0}
  .td-seg{display:inline-flex;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:3px;gap:2px}
  .td-seg button{white-space:nowrap;border:0;background:transparent;color:var(--ink-soft);font:600 12.5px var(--fbody);padding:0 12px;min-height:34px;border-radius:7px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
  .td-seg button svg{width:15px;height:15px}
  .td-seg button[aria-pressed=true]{background:var(--surface);color:var(--accent-ink);box-shadow:0 1px 3px rgba(26,22,38,.12)}
  .td-prog{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap}
  .td-bar{flex:1 1 160px;height:8px;border-radius:8px;background:var(--surface-2);overflow:hidden}
  .td-bar i{display:block;height:100%;background:var(--good);border-radius:8px;transition:width .35s cubic-bezier(.2,.8,.2,1)}
  .td-sec{padding:12px 16px 4px;font:700 11.5px var(--fbody);text-transform:uppercase;letter-spacing:.07em;color:var(--muted);display:flex;align-items:center;gap:8px}
  .td-sec svg{width:14px;height:14px}
  .td-item{display:flex;align-items:flex-start;gap:10px;padding:8px 16px 8px 8px;border-left:3px solid transparent;transition:background .2s}
  .td-item+.td-item{border-top:1px solid var(--border)}
  .td-item.done{background:var(--good-soft);border-left-color:var(--good)}
  .td-item.done .td-t{color:var(--ink-soft);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--good) 60%,transparent)}
  .td-ck{flex:none;width:44px;height:44px;display:grid;place-items:center;border:0;background:transparent;cursor:pointer;border-radius:12px;padding:0}
  .td-ck span{width:24px;height:24px;border-radius:50%;border:2px solid var(--muted);display:grid;place-items:center;transition:all .18s;color:#fff}
  .td-ck span svg{width:14px;height:14px;opacity:0;transform:scale(.6);transition:all .18s}
  .td-ck:hover span{border-color:var(--good)}
  .td-ck[aria-pressed=true] span{background:var(--good);border-color:var(--good)}
  .td-ck[aria-pressed=true] span svg{opacity:1;transform:none}
  .td-ck:active span{transform:scale(.9)}
  .td-ck:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .td-ck.ro{cursor:default}
  .td-b{flex:1;min-width:0;padding-top:10px}
  .td-t{font-weight:600;font-size:14.5px;line-height:1.35;word-break:break-word}
  .td-n{font-size:12.5px;color:var(--ink-soft);margin-top:3px;white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .td-m{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center}
  .td-m .chip{font-size:11px;padding:2px 8px}
  .td-m .chip svg{width:12px;height:12px}
  .td-ok{color:var(--good);font-weight:700;font-size:11.5px;display:inline-flex;align-items:center;gap:4px}
  .td-ok svg{width:13px;height:13px}
  .td-ed{flex:none;width:40px;height:40px;margin-top:2px}
  .td-wk{display:inline-flex;gap:3px;align-items:center}
  .td-wk i{width:9px;height:9px;border-radius:50%;background:transparent;border:1.5px solid color-mix(in srgb,var(--muted) 55%,transparent)}
  .td-wk i.y{background:var(--good);border-color:var(--good)}
  .td-wk i.na{opacity:.3;border-style:dashed}
  .td-person{border-top:1px solid var(--border)}
  .td-ph{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--surface-2);flex-wrap:wrap}
  .td-ph strong{font-family:var(--fdisp);font-size:14px}
  .td-empty{padding:28px 16px;text-align:center;color:var(--muted);font-size:13px}
  .td-more{display:flex;align-items:center;gap:6px;margin:8px 16px 12px;min-height:38px}
  @media (max-width:640px){.td-add{grid-template-columns:1fr}.td-seg{display:flex}.td-seg button{flex:1;justify-content:center}.ph .count{white-space:normal;text-align:right}}
  @media (prefers-reduced-motion:reduce){.td-bar i,.td-ck span,.td-ck span svg,.td-item{transition:none}}`;
  document.head.appendChild(s);
}
async function todoToggle(x){
  const was=todoIsDone(x),day=todoDay();
  if(x.daily){
    if(was){const c=todoChk(x,day);state.todo_checks=state.todo_checks.filter(y=>y!==c);render();
      const {error}=await sb.from('todo_checks').delete().eq('todo_id',x.id).eq('day',day);if(error){state.todo_checks.push(c);render();toast("Alınmadı: "+error.message);}}
    else{const tmp={todo_id:x.id,owner:x.owner,day,created_at:new Date().toISOString()};state.todo_checks.push(tmp);render();
      const {data,error}=await sb.from('todo_checks').insert({todo_id:x.id,day}).select().single();
      if(error){state.todo_checks=state.todo_checks.filter(y=>y!==tmp);render();toast("Alınmadı: "+error.message);}else Object.assign(tmp,data);}
  }else{
    const prev={done:x.done,done_at:x.done_at};Object.assign(x,{done:!was,done_at:was?null:new Date().toISOString()});render();
    const {error}=await sb.from('todos').update({done:!was}).eq('id',x.id);if(error){Object.assign(x,prev);render();toast("Alınmadı: "+error.message);}
  }
}
function todoWeek(x){
  const from=String(x.created_at||"").slice(0,10);let n=0;const dots=[];
  for(let i=6;i>=0;i--){const d=todoDay(-i);const na=d<from;const y=!na&&!!todoChk(x,d);if(y)n++;dots.push(`<i class="${y?"y":na?"na":""}" title="${d.split("-").reverse().join(".")}${y?" · görülüb":na?"":" · görülməyib"}"></i>`);}
  return `<span class="td-wk" role="img" aria-label="Son 7 gün: ${n} dəfə görülüb">${dots.join("")}</span>`;
}
function todoDue(x,done){
  if(x.daily||!x.due)return"";
  const days=Math.round((Date.parse(x.due)-Date.parse(todoDay()))/864e5);
  const c=done?"c-mut":days<0?"c-crit":days<=1?"c-warn":"c-mut";
  const t=days===0?"Bu gün":days===1?"Sabah":days<0?(-days)+" gün gecikib":x.due.split("-").reverse().join(".");
  return `<span class="chip ${c}">${ICON.clock}${t}</span>`;
}
function todoRow(x,mine){
  const done=todoIsDone(x);const r=el("div","td-item"+(done?" done":""));
  const c=x.daily?todoChk(x,todoDay()):null;const at=x.daily?(c&&c.created_at):x.done_at;
  r.innerHTML=`<button class="td-ck${mine?"":" ro"}" type="button" aria-pressed="${done}" ${mine?`aria-label="${done?"Görülmədi kimi qaytar":"Gördüm"}: ${esc(x.title)}"`:`disabled aria-label="${done?"Görülüb":"Görülməyib"}"`}><span>${ICON.check}</span></button>
    <div class="td-b"><div class="td-t">${esc(x.title)}</div>${x.note?`<div class="td-n">${esc(x.note)}</div>`:""}
      <div class="td-m">${done?`<span class="td-ok">${ICON.check}Görüldü${at?" · "+todoHM(at):""}</span>`:""}${x.daily?`<span class="chip c-accent">${TD_REPEAT}Hər gün</span>${todoWeek(x)}`:""}${todoDue(x,done)}</div></div>
    ${mine?`<button class="ibtn td-ed" type="button" aria-label="Düzəliş et: ${esc(x.title)}" title="Düzəliş">${ICON.edit}</button>`:""}`;
  if(mine){r.querySelector(".td-ck").onclick=()=>todoToggle(x);r.querySelector(".td-ed").onclick=()=>openTodoForm(x);}
  return r;
}
function openTodoForm(x){
  const scrim=el("div","scrim");let daily=!!x.daily,armed=false;
  scrim.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="tdf-h"><div class="mh"><h3 id="tdf-h">İşə düzəliş</h3><button type="button" aria-label="Bağla">×</button></div>
    <form class="mb" novalidate>
      <div class="field"><label for="tdf-t">Nə etməlisən?</label><input id="tdf-t" type="text" maxlength="300" required value="${esc(x.title)}" style="width:100%"><div class="hint" id="tdf-err" style="color:var(--crit);font-family:var(--fbody);margin-top:5px" hidden>Başlıq boş ola bilməz.</div></div>
      <div class="field"><label for="tdf-n">Qeyd <span style="text-transform:none;letter-spacing:0;font-weight:500">(seçimlik)</span></label><textarea id="tdf-n" rows="3" maxlength="2000" style="width:100%;resize:vertical">${esc(x.note||"")}</textarea></div>
      <div class="field"><label>Növ</label><div class="td-seg" role="group" aria-label="Növ"><button type="button" data-k="0">Bir dəfəlik</button><button type="button" data-k="1">${TD_REPEAT}Hər gün</button></div>
        <div class="hint" style="font-family:var(--fbody);margin-top:6px">«Hər gün» — hər səhər yenidən açılır, hər gün «Gördüm» işarələnir.</div></div>
      <div class="field" id="tdf-dw"><label for="tdf-d">Son tarix <span style="text-transform:none;letter-spacing:0;font-weight:500">(seçimlik)</span></label><input id="tdf-d" type="date" value="${esc(x.due||"")}"></div>
      <button type="submit" hidden></button>
    </form>
    <div class="mf" style="justify-content:space-between"><button class="btn ghost" type="button" data-del style="color:var(--crit)">${ICON.trash} Sil</button><span style="display:flex;gap:8px"><button class="btn ghost" type="button" data-x>Ləğv</button><button class="btn" type="button" data-ok>Yadda saxla</button></span></div></div>`;
  document.body.appendChild(scrim);
  const $s=q=>scrim.querySelector(q),close=()=>{scrim.remove();document.removeEventListener("keydown",onKey);};
  const onKey=e=>{if(e.key==="Escape")close();};document.addEventListener("keydown",onKey);
  const seg=()=>{scrim.querySelectorAll(".td-seg button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.k==="1"===daily)));$s("#tdf-dw").hidden=daily;};
  scrim.querySelectorAll(".td-seg button").forEach(b=>b.onclick=()=>{daily=b.dataset.k==="1";seg();});seg();
  $s(".mh button").onclick=close;$s("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const save=async()=>{
    const t=$s("#tdf-t").value.trim();if(!t){$s("#tdf-err").hidden=false;$s("#tdf-t").focus();return;}
    const b=$s("[data-ok]");b.disabled=true;b.textContent="Saxlanır…";
    const patch={title:t,note:$s("#tdf-n").value.trim(),daily,due:daily?null:($s("#tdf-d").value||null)};
    const {error}=await sb.from('todos').update(patch).eq('id',x.id);
    if(error){b.disabled=false;b.textContent="Yadda saxla";toast("Alınmadı: "+error.message);return;}
    Object.assign(x,patch);close();render();toast("✓ Yadda saxlandı");};
  $s("[data-ok]").onclick=save;$s("form").onsubmit=e=>{e.preventDefault();save();};
  $s("[data-del]").onclick=async e=>{
    const b=e.currentTarget;
    if(!armed){armed=true;b.innerHTML=`${ICON.trash} Əminsən? Sil`;b.style.background="var(--crit-soft)";setTimeout(()=>{if(b.isConnected){armed=false;b.innerHTML=`${ICON.trash} Sil`;b.style.background="";}},4000);return;}
    b.disabled=true;const {error}=await sb.from('todos').delete().eq('id',x.id);
    if(error){b.disabled=false;toast("Alınmadı: "+error.message);return;}
    state.todos=state.todos.filter(y=>y.id!==x.id);state.todo_checks=state.todo_checks.filter(c=>c.todo_id!==x.id);close();render();toast("«"+x.title+"» silindi");};
  setTimeout(()=>{const i=$s("#tdf-t");i.focus();i.setSelectionRange(i.value.length,i.value.length);},30);
}
const todoSortOpen=(a,b)=>((a.due||"9999")<(b.due||"9999")?-1:(a.due||"9999")>(b.due||"9999")?1:a.id-b.id);
function todoList(items,mine){
  const daily=items.filter(x=>x.daily).sort((a,b)=>todoIsDone(a)-todoIsDone(b)||a.id-b.id);
  const open=items.filter(x=>!x.daily&&!x.done).sort(todoSortOpen);
  const done=items.filter(x=>!x.daily&&x.done).sort((a,b)=>String(b.done_at||"").localeCompare(String(a.done_at||"")));
  return {daily,open,done};
}
function renderTodo(){
  todoCss();
  const wrap=el("div");
  const mine=state.todos.filter(x=>me&&x.owner===me.id);const L=todoList(mine,true);
  const dDone=L.daily.filter(todoIsDone).length,todayDone=dDone+L.done.filter(x=>x.done_at&&x.done_at.slice(0,10)>=todoDay()).length;
  const p=el("div","panel");p.style.marginBottom="16px";
  p.appendChild(el("div","ph",`<h3>Mənim siyahım</h3><span class="count">${L.open.length+L.daily.length-dDone} görüləcək · bu gün ${todayDone} görüldü</span>`));
  /* Sürətli əlavə */
  const f=el("form","td-add");
  f.innerHTML=`<div class="field td-in"><label for="td-new">Yeni iş</label><input id="td-new" type="text" name="t" placeholder="Məs: Müştəriyə hesabat göndər" maxlength="300" autocomplete="off"></div>
    <div class="field"><label>Növ</label><div class="td-seg" role="group" aria-label="Növ"><button type="button" data-k="0" aria-pressed="${!todoAddDaily}">Bir dəfəlik</button><button type="button" data-k="1" aria-pressed="${todoAddDaily}">${TD_REPEAT}Hər gün</button></div></div>
    ${todoAddDaily?`<div class="field"><label>&nbsp;</label><button class="btn" type="submit">${ICON.plus} Əlavə et</button></div>`:`<div class="field"><label for="td-due">Son tarix</label><span class="td-dr"><input id="td-due" class="search" type="date" name="d"><button class="btn" type="submit">${ICON.plus} Əlavə et</button></span></div>`}`;
  f.querySelectorAll(".td-seg button").forEach(b=>b.onclick=()=>{const v=f.t.value;todoAddDaily=b.dataset.k==="1";render();const i=$("#td-new");if(i){i.value=v;i.focus();}});
  f.onsubmit=async e=>{e.preventDefault();const t=f.t.value.trim();if(!t){f.t.focus();toast("Əvvəlcə işin adını yaz");return;}
    const b=f.querySelector("[type=submit]");b.disabled=true;
    const {data,error}=await sb.from('todos').insert({title:t,daily:todoAddDaily,due:todoAddDaily?null:(f.d&&f.d.value||null)}).select().single();
    if(error){b.disabled=false;toast("Alınmadı: "+error.message);return;}
    state.todos.push(data);render();setTimeout(()=>{const i=$("#td-new");if(i)i.focus();},0);};
  p.appendChild(f);
  /* Gündəlik irəliləyiş */
  if(L.daily.length){const pc=Math.round(dDone/L.daily.length*100);
    p.appendChild(el("div","td-prog",`<strong style="font-size:13px">Bugünkü gündəlik işlər</strong><div class="td-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${L.daily.length}" aria-valuenow="${dDone}" aria-label="Gündəlik işlər"><i style="width:${pc}%"></i></div><span class="hint" style="font-size:12px">${dDone}/${L.daily.length}${dDone===L.daily.length?" · hamısı görüldü 🎉":""}</span>`));}
  if(!mine.length)p.appendChild(el("div","td-empty","Siyahın boşdur. Yuxarıda ilk işini yaz — hər gün təkrarlanan işlər üçün «Hər gün» seç."));
  if(L.daily.length){p.appendChild(el("div","td-sec",`${TD_REPEAT}Hər gün`));L.daily.forEach(x=>p.appendChild(todoRow(x,true)));}
  if(L.open.length){p.appendChild(el("div","td-sec",`${ICON.clock}Görüləcək işlər · ${L.open.length}`));L.open.forEach(x=>p.appendChild(todoRow(x,true)));}
  else if(mine.length&&!L.daily.length)p.appendChild(el("div","td-empty","Bütün işlər görülüb 👏"));
  if(L.done.length){
    const tg=el("button","mini td-more",`${todoShowDone?"▾":"▸"} ${ICON.check} Görülənlər · ${L.done.length}`);tg.type="button";tg.setAttribute("aria-expanded",String(todoShowDone));tg.onclick=()=>{todoShowDone=!todoShowDone;render();};p.appendChild(tg);
    if(todoShowDone)L.done.forEach(x=>p.appendChild(todoRow(x,true)));
  }
  wrap.appendChild(p);
  /* Komanda — yalnız CEO və PM (baza da yalnız onlara başqalarının qeydlərini qaytarır) */
  if(role==="ceo"||role==="pm"){
    const others=state.todos.filter(x=>!me||x.owner!==me.id);
    const people=[...new Set(others.map(x=>x.owner))].map(id=>{const its=others.filter(x=>x.owner===id),l=todoList(its);return{id,n:todoName(id),l,open:l.open.length+l.daily.filter(x=>!todoIsDone(x)).length};}).sort((a,b)=>b.open-a.open||a.n.localeCompare(b.n,"az"));
    if(todoWho&&!people.some(q=>q.id===todoWho))todoWho="";
    const tp=el("div","panel");
    tp.appendChild(el("div","ph",`<h3>Komandanın siyahıları</h3><span class="count">${role==="ceo"?"Hamı":"CEO-dan başqa hamı"} · yalnız baxış</span>`));
    if(!people.length){tp.appendChild(el("div","td-empty","Komandadan hələ heç kim siyahı yazmayıb."));wrap.appendChild(tp);return wrap;}
    const fb=el("div");fb.style.cssText="display:flex;gap:7px;flex-wrap:wrap;padding:12px 16px";fb.setAttribute("role","group");fb.setAttribute("aria-label","Şəxs üzrə süz");
    const mk=(id,label,n)=>{const a=todoWho===id;const b=el("button","mini",`${esc(label)} <span style="opacity:.6;font-weight:700">${n}</span>`);b.type="button";b.setAttribute("aria-pressed",String(a));b.style.minHeight="36px";if(a)b.style.cssText+=";border-color:var(--accent);background:var(--accent-soft);color:var(--accent-ink);font-weight:700";b.onclick=()=>{todoWho=id;render();};return b;};
    fb.appendChild(mk("","Hamısı",people.reduce((s,q)=>s+q.open,0)));people.forEach(q=>fb.appendChild(mk(q.id,q.n,q.open)));
    tp.appendChild(fb);
    people.filter(q=>!todoWho||q.id===todoWho).forEach(q=>{
      const prof=state.profiles.find(y=>y.id===q.id),dd=q.l.daily.filter(todoIsDone).length;
      const recent=q.l.done.filter(x=>x.done_at&&Date.now()-Date.parse(x.done_at)<7*864e5);
      const box=el("div","td-person");
      box.appendChild(el("div","td-ph",`<strong>${esc(q.n)}</strong><span class="hint">${esc(prof&&ROLES[prof.role]?ROLES[prof.role].label:"")}</span><span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">${q.l.daily.length?`<span class="chip ${dd===q.l.daily.length?"c-good":"c-warn"}">${TD_REPEAT.replace("<svg","<svg style='width:12px;height:12px'")} Bu gün ${dd}/${q.l.daily.length}</span>`:""}<span class="chip c-mut">${q.l.open.length} açıq iş</span></span>`));
      [...q.l.daily,...q.l.open,...recent].forEach(x=>box.appendChild(todoRow(x,false)));
      if(!q.l.daily.length&&!q.l.open.length&&!recent.length)box.appendChild(el("div","td-empty","Açıq işi yoxdur."));
      tp.appendChild(box);
    });
    wrap.appendChild(tp);
  }
  return wrap;
}

function renderTasks(){
  actEnsure();
  const wrap=el("div");const isMgr=TASK_MANAGERS.includes(role);
  const lg=el("div","panel");lg.style.marginBottom="16px";
  const ph=el("div","ph",`<h3>Tasklar</h3><span class="count">Deadline: <span style="color:var(--good)">●</span> vaxt var · <span style="color:var(--warn)">●</span> yaxın · <span style="color:var(--crit)">●</span> gecikib</span>`);
  if(isMgr){
    const right=el("div");right.style.cssText="margin-left:auto";
    const b=el("button","btn",`${ICON.plus} Task yarat`);b.onclick=()=>openTaskForm();right.appendChild(b);
    ph.appendChild(right);
  }
  lg.appendChild(ph);
  if(isMgr){
    const counts={};state.tasks.forEach(t=>{counts[t.role]=(counts[t.role]||0)+1;});
    const openC={};state.tasks.forEach(t=>{if(!taskDone(t))openC[t.role]=(openC[t.role]||0)+1;});
    const fbar=el("div");fbar.style.cssText="display:flex;gap:7px;flex-wrap:wrap;align-items:center;padding:12px 14px 2px;border-top:1px solid var(--border)";
    fbar.appendChild(el("span",null,`<span style="font-size:11.5px;color:var(--muted);font-weight:600;margin-right:2px">Vəzifə üzrə:</span>`));
    const mk=(val,label,n)=>{const active=String(taskFilter)===String(val);const bt=el("button","mini");bt.style.cssText="cursor:pointer"+(active?";border-color:var(--accent);background:var(--accent-soft);color:var(--accent-ink);font-weight:700":"");bt.innerHTML=`${esc(label)}${n!=null?` <span style="opacity:.6;font-weight:700">${n}</span>`:""}`;bt.onclick=()=>{taskFilter=val;render();};return bt;};
    fbar.appendChild(mk("","Hamısı",state.tasks.length));
    Object.entries(ROLES).forEach(([k,r])=>{if(counts[k])fbar.appendChild(mk(k,r.label,openC[k]||0));});
    lg.appendChild(fbar);
  }
  wrap.appendChild(lg);
  let list=state.tasks.slice();
  if(!isMgr)list=list.filter(taskIsMine);
  else if(role==="pm")list=list.filter(pmTaskOk);
  else if(taskFilter)list=list.filter(t=>t.role===taskFilter);
  const kan=el("div","kan");
  TASK_STAGES.forEach(st=>{
    const col=el("div","col");
    // Təsdiqlənmiş tasklar 3 gün sonra lövhədən gizlənir (bazada qalır)
    const items=list.filter(t=>t.status===st||(st==="Təsdiqləndi"&&t.status==="Təhvil verildi")).filter(t=>!(st==="Təsdiqləndi"&&t.approved_at&&Date.now()-Date.parse(t.approved_at)>3*864e5));
    items.sort((a,b)=>(b.urgent?1:0)-(a.urgent?1:0));
    col.appendChild(el("div","ch",`${st}<span class="n">${items.length}</span>`));
    items.forEach(t=>{
      const di=dlInfo(t.deadline,t.status);
      const card=el("div","kcard");card.dataset.sid="task:"+t.id;card.style.borderLeft="3px solid var(--"+di.c+")";
      const turg=t.urgent&&!(t.status==="Təsdiqləndi"||t.status==="Təhvil verildi");if(turg)card.classList.add("urgent");
      const mine=taskIsMine(t);
      const isAppr=role==="ceo"||role==="marketing"||role==="pm";
      const done=t.status==="Təsdiqləndi"||t.status==="Təhvil verildi";
      const mgrBtns=(isMgr||isOwner(t,""))?`<span style="margin-left:auto;display:flex;gap:3px"><button class="ibtn" data-tedit="${t.id}" title="Düzəliş">${ICON.edit}</button><button class="ibtn danger" data-tdel="${t.id}" title="Sil">${ICON.trash}</button></span>`:"";
      let act="";
      if(t.status==="Təsdiq gözləyir"&&isAppr){
        act=t['appr_'+role]?`<span class="chip c-good" style="font-size:10.5px">Sən təsdiqlədin</span>`:`<button class="adv" data-tappr="${t.id}">${ICON.check} Təsdiq et</button>`;
      }else if(mine){
        if(t.status==="Yeni")act=`<button class="adv" data-tstart="${t.id}">${ICON.play2} İcraya başla</button>`;
        else if(t.status==="İcrada")act=`<button class="adv" data-tdone="${t.id}">${ICON.check} Təhvil ver</button>`;
        else if(t.status==="Təsdiq gözləyir")act=`<span class="chip c-warn" style="font-size:10.5px">Təsdiq gözləyir</span>`;
        else act=`<span class="chip c-good" style="font-size:10.5px">Təsdiqləndi</span>`;
      }else{
        if(t.status==="İcrada")act=`<span class="chip c-accent" style="font-size:10.5px">İcrada</span>`;
        else if(t.status==="Təsdiq gözləyir")act=`<span class="chip c-warn" style="font-size:10.5px">Təsdiq gözləyir</span>`;
        else if(done)act=`<span class="chip c-good" style="font-size:10.5px">Təsdiqləndi</span>`;
      }
      const apprRow=t.status==="Təsdiq gözləyir"?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">${APPROVERS.map(a=>`<span class="chip ${t['appr_'+a[0]]?'c-good':'c-mut'}" style="font-size:9.5px;padding:1px 6px">${t['appr_'+a[0]]?'✓':'○'} ${a[1]}</span>`).join("")}</div>`:"";
      card.innerHTML=`${turg?`<div class="urgbadge">🔥 TƏCİLİ</div>`:""}<div class="kt" style="display:flex;align-items:flex-start;gap:6px">${esc(t.title)}${mgrBtns}</div>
        ${t.note?`<div class="km" style="white-space:normal">${esc(t.note)}</div>`:""}
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">
          ${taskTargetChip(t)}
          ${(()=>{const cp=t.created_by&&state.profiles.find(p=>p.id===t.created_by);return cp?`<span class="chip c-mut" style="font-size:10.5px;padding:2px 7px" title="Taskı yaradan">✍ ${esc(cp.full_name||cp.username)}</span>`:"";})()}
          ${t.client?`<span class="chip c-mut" style="font-size:10.5px;padding:2px 7px">${ICON.users}${esc(t.client)}</span>`:""}
          <span class="chip c-${di.c}" style="font-size:10.5px;padding:2px 7px">${ICON.clock}${esc(di.txt)}</span></div>
        ${apprRow}
        <div class="kf">${chatBtn('task:'+t.id,t.title,taskRoleLabel(t.role)+(t.client?" · "+t.client:""))}<span style="margin-left:auto">${act}</span></div>`;
      col.appendChild(card);
    });
    if(!items.length)col.appendChild(el("div","hint",`<div style="padding:8px 4px">boş</div>`));
    kan.appendChild(col);
  });
  wrap.appendChild(kanWrap(kan));
  kan.querySelectorAll("[data-tstart]").forEach(b=>b.onclick=()=>upd('tasks',b.dataset.tstart,{status:"İcrada"}));
  kan.querySelectorAll("[data-tdone]").forEach(b=>b.onclick=()=>upd('tasks',b.dataset.tdone,{status:"Təsdiq gözləyir"}));
  kan.querySelectorAll("[data-tappr]").forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id==b.dataset.tappr);const patch={['appr_'+role]:true};const nx={...t,...patch};if(fullAppr(nx,'appr_'))patch.status="Təsdiqləndi";upd('tasks',t.id,patch);});
  kan.querySelectorAll("[data-tedit]").forEach(b=>b.onclick=()=>openTaskEdit(state.tasks.find(x=>x.id==b.dataset.tedit)));
  kan.querySelectorAll("[data-tdel]").forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id==b.dataset.tdel);confirmDel('tasks',t.id,"«"+t.title+"» taskı");});
  wireChat(kan);
  return wrap;
}
/* ---------- Universal chat (tasks, content, briefs, videos, photos) ---------- */
function chatCount(thread){return state.comments.filter(c=>c.thread===thread).length;}
function chatBtn(thread,title,sub){const n=chatCount(thread);return `<button class="adv chatbtn" data-chat="${esc(thread)}" data-ctitle="${esc(title||'Söhbət')}" data-csub="${esc(sub||'')}" title="Söhbət / rəy">${ICON.chat}<span>Söhbət${n?" · "+n:""}</span></button>`;}
function wireChat(root){root.querySelectorAll("[data-chat]").forEach(b=>b.onclick=e=>{e.stopPropagation();openChat(b.dataset.chat,b.dataset.ctitle,b.dataset.csub);});}
function renderChatBox(box,thread){
  const list=state.comments.filter(c=>c.thread===thread);
  box.innerHTML="";
  if(!list.length){box.appendChild(el("div","empty",`<div style="padding:30px 10px">Hələ mesaj yoxdur — ilk yazan ol.</div>`));return;}
  list.forEach(c=>{
    const mine=me&&c.author===me.id;
    const rl=c.author_role&&ROLES[c.author_role]?ROLES[c.author_role].label:"";
    const t=c.created_at?new Date(c.created_at):null;
    const tm=t?(String(t.getDate()).padStart(2,"0")+"."+String(t.getMonth()+1).padStart(2,"0")+" "+String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0")):"";
    const row=el("div");row.style.cssText="display:flex;margin-bottom:10px;gap:8px"+(mine?";flex-direction:row-reverse":"");
    const av=`<div class="avatar" style="width:30px;height:30px;font-size:12px;flex:none;${mine?'':'background:var(--surface-2);color:var(--ink-soft)'}">${esc((c.author_name||"?")[0].toUpperCase())}</div>`;
    row.innerHTML=`${av}<div style="max-width:74%">
      <div style="font-size:11px;font-weight:700;margin-bottom:3px;${mine?'text-align:right':''}">${esc(c.author_name||"?")}${rl?` <span class="chip c-mut" style="font-size:9px;padding:1px 6px;font-weight:600">${esc(rl)}</span>`:""}</div>
      <div style="background:${mine?'var(--accent)':'var(--surface)'};color:${mine?'#fff':'var(--ink)'};border:1px solid ${mine?'transparent':'var(--border)'};border-radius:13px;border-top-${mine?'right':'left'}-radius:4px;padding:9px 13px;font-size:13.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word;box-shadow:var(--shadow)">${esc(c.body)}</div>
      <div class="hint" style="font-size:10px;margin-top:3px;${mine?'text-align:right':''}">${tm}</div></div>`;
    box.appendChild(row);
  });
  box.scrollTop=box.scrollHeight;
}
/* Söhbət bildirişi: Kontent və Çəkiliş təhvili söhbətlərində yazandan başqa, həmin bölməni görən hər kəsə */
function chatNotifInfo(thread,text){
  const who=myName()||"Kimsə";const isAppr=!!(ROLES[role]&&ROLES[role].approver);
  const t=text.length>300?text.slice(0,300)+"…":text;
  let m=/^content:(.+)$/.exec(thread);
  if(m){const c=state.content.find(x=>String(x.id)===m[1]);if(!c)return null;
    return {view:"content",title:isAppr?"✏️ Kontent planına düzəliş":"💬 Kontent planına mesaj",
      body:`${c.client} məkanının ${c.month||""} kontent planı («${c.title}») üçün ${isAppr?"düzəliş gəldi":"yeni mesaj"}: ${t} — ${who}`};}
  m=/^shoot:(.+):(v(\d+)|photo)$/.exec(thread);
  if(m){const s=state.shoots.find(x=>String(x.id)===m[1]);if(!s)return null;
    const part=m[2]==="photo"?"Foto":"Video "+(+m[3]+1);
    return {view:"delivery",title:isAppr?"✏️ Edit gəldi":"💬 Yeni mesaj",
      body:`${s.client} məkanının ${shootMonth(s)} çəkilişi · ${part} üçün ${isAppr?"edit gəldi":"yeni mesaj"}: ${t} — ${who}`};}
  return null;
}
async function notifyChat(thread,text){
  const info=chatNotifInfo(thread,text);if(!info||!me)return;
  const rows=state.profiles.filter(p=>p.id!==me.id&&ROLES[p.role]&&ROLES[p.role].nav.includes(info.view))
    .map(p=>({target_type:"user",target:p.id,title:info.title,body:info.body,from_name:myName(),from_id:me.id,read_by:[]}));
  if(rows.length){try{await sb.from('notifications').insert(rows);}catch(e){}}
}
function openChat(thread,title,sub){
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal chatmodal"><div class="mh"><div style="min-width:0"><h3 style="font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(title||"Söhbət")}</h3>${sub?`<div class="hint" style="margin-top:2px">${esc(sub)}</div>`:""}</div><button>×</button></div>
    <div id="chatbox" class="chatbox"></div>
    <div class="chatinput"><input id="cin" placeholder="Mesaj / rəy yaz…"><button class="btn" data-send>${ICON.arrow}</button></div>
  </div>`;
  document.body.appendChild(scrim);
  const box=scrim.querySelector("#chatbox");const inp=scrim.querySelector("#cin");
  const refresh=()=>renderChatBox(box,thread);
  window._chatRefresh=refresh;refresh();
  const close=()=>{window._chatRefresh=null;scrim.remove();};
  scrim.querySelector(".mh button").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  const send=async()=>{const body=inp.value.trim();if(!body)return;inp.value="";inp.focus();await ins('comments',{thread,author:me?me.id:null,author_name:myName(),author_role:role,body});refresh();notifyChat(thread,body);};
  scrim.querySelector("[data-send]").onclick=send;
  inp.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}};
  setTimeout(()=>inp.focus(),60);
}
function fillPeopleSelect(row){const rk=row.querySelector(".tr").value;const sel=row.querySelector(".tp");const ppl=peopleOf(rk);sel.innerHTML=ppl.length?ppl.map(p=>`<option value="${esc(p.id)}">${esc(p.full_name||p.username)}</option>`).join(""):`<option value="" disabled>Bu vəzifədə işçi yoxdur</option>`;}
/* PM məkan bölgüsü: PM yalnız özünə təyin olunmuş (və hələ heç kimə təyin olunmamış) məkanların task və briflərini görür/verir */
function pmClientOk(name){if(role!=="pm"||!name)return true;const c=allClients().find(x=>x.name===name);return !c||!c.pm_id||(me&&c.pm_id===me.id);}
/* CEO: məkanları PM-lər arasında bölüşdürmə */
function openPmSplit(){
  const pms=state.profiles.filter(p=>p.role==="pm");const cl=[...allClients()].sort((a,b)=>String(a.name).localeCompare(String(b.name),"az"));
  const cur={};cl.forEach(c=>cur[c.id]=c.pm_id||"");
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:640px;width:96vw"><div class="mh"><h3>👥 PM-lər arasında məkan bölgüsü</h3><button>×</button></div>
    <div class="mb" style="max-height:70vh;overflow:auto">
      <div class="hint" style="white-space:normal">Hər PM tapşırıq, brif, kontent, iclas, hesabat, SMM, çatdırılma və videolarda <b>yalnız öz məkanlarını</b> görür. <b>Çəkiliş cədvəlində</b> isə bütün çəkilişlər hamıya görünür. Təyin olunmayan məkan bütün PM-lərə görünür.</div>
      ${pms.length?"":`<div class="hint" style="color:var(--crit)">Hələ «Project Manager» vəzifəsində işçi yoxdur — əvvəlcə Komanda bölməsində vəzifə ver.</div>`}
      <div id="pmsum" style="display:flex;gap:6px;flex-wrap:wrap"></div>
      ${pms.length>1?`<button class="adv" type="button" id="pmauto" style="align-self:flex-start">Təyin olunmayanları bərabər böl</button>`:""}
      <div id="pmrows" style="display:flex;flex-direction:column;gap:6px"></div>
    </div>
    <div class="mf"><button class="btn ghost" data-x>Bağla</button><button class="btn" data-ok>Yadda saxla</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const nm=p=>p.full_name||p.username;
  const draw=()=>{
    scrim.querySelector("#pmsum").innerHTML=pms.map(p=>`<span class="chip c-accent" style="font-size:11px">${esc(nm(p))}: ${cl.filter(c=>cur[c.id]===p.id).length}</span>`).join("")+`<span class="chip c-mut" style="font-size:11px">Təyin olunmayıb: ${cl.filter(c=>!cur[c.id]).length}</span>`;
    scrim.querySelector("#pmrows").innerHTML=cl.map(c=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)"><b style="flex:1;min-width:0;font-size:13.5px">${esc(c.name)}${c.status&&c.status!=="Aktiv"?` <span class="hint">· ${esc(c.status)}</span>`:""}</b>
      <select data-pmc="${c.id}" style="width:auto;min-width:170px"><option value="">— təyin olunmayıb —</option>${pms.map(p=>`<option value="${p.id}"${cur[c.id]===p.id?" selected":""}>${esc(nm(p))}</option>`).join("")}</select></div>`).join("")||`<div class="hint">Müştəri yoxdur</div>`;
    scrim.querySelectorAll("[data-pmc]").forEach(sel=>sel.onchange=()=>{cur[sel.dataset.pmc]=sel.value;draw();});};
  draw();
  const au=scrim.querySelector("#pmauto");if(au)au.onclick=()=>{const cnt=p=>cl.filter(c=>cur[c.id]===p.id).length;cl.filter(c=>!cur[c.id]).forEach(c=>{const p=[...pms].sort((a,b)=>cnt(a)-cnt(b))[0];cur[c.id]=p.id;});draw();};
  scrim.querySelector("[data-ok]").onclick=async e=>{const b=e.currentTarget;const ch=cl.filter(c=>(c.pm_id||"")!==cur[c.id]);if(!ch.length){close();return;}
    b.disabled=true;b.textContent="Saxlanır…";
    for(const c of ch){const {error}=await sb.from('clients').update({pm_id:cur[c.id]||null}).eq('id',c.id);if(error){alert("Xəta («"+c.name+"»): "+error.message);b.disabled=false;b.textContent="Yadda saxla";return;}}
    await reload('clients');toast(ch.length+" məkanın PM-i yeniləndi","ok");close();};
}
/* Targetoloq məkan bölgüsü */
function tgClientOk(name){if(role!=="targeting"||!name)return true;const c=allClients().find(x=>x.name===name);return !c||!c.tg_id||(me&&c.tg_id===me.id);}
/* Brif bildirişi: məkanın targetoloqu varsa yalnız ona, yoxdursa bütün targetoloqlara */
function abTgIds(client){const c=allClients().find(x=>x.name===client);const t=c&&c.tg_id&&state.profiles.find(p=>p.id===c.tg_id&&p.role==="targeting");return t?[t.id]:roleIds(["targeting"]);}
function openTgSplit(){
  const pms=state.profiles.filter(p=>p.role==="targeting");const cl=[...allClients()].sort((a,b)=>String(a.name).localeCompare(String(b.name),"az"));
  const cur={};cl.forEach(c=>cur[c.id]=c.tg_id||"");
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:640px;width:96vw"><div class="mh"><h3>🎯 Targetoloqlar arasında məkan bölgüsü</h3><button>×</button></div>
    <div class="mb" style="max-height:70vh;overflow:auto">
      <div class="hint" style="white-space:normal">Hər targetoloq Targeting brifləri, Reklam analizi, Video rəyləri və xəbərdarlıqlarda <b>yalnız öz məkanlarını</b> görür; yeni brif bildirişi də yalnız ona gedir. Təyin olunmayan məkan bütün targetoloqlara görünür.</div>
      ${pms.length?"":`<div class="hint" style="color:var(--crit)">Hələ «Targetoloq» vəzifəsində işçi yoxdur — əvvəlcə Komanda bölməsində vəzifə ver.</div>`}
      <div id="tgsum" style="display:flex;gap:6px;flex-wrap:wrap"></div>
      ${pms.length>1?`<button class="adv" type="button" id="tgauto" style="align-self:flex-start">Təyin olunmayanları bərabər böl</button>`:""}
      <div id="tgrows" style="display:flex;flex-direction:column;gap:6px"></div>
    </div>
    <div class="mf"><button class="btn ghost" data-x>Bağla</button><button class="btn" data-ok>Yadda saxla</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const nm=p=>p.full_name||p.username;
  const draw=()=>{
    scrim.querySelector("#tgsum").innerHTML=pms.map(p=>`<span class="chip c-accent" style="font-size:11px">${esc(nm(p))}: ${cl.filter(c=>cur[c.id]===p.id).length}</span>`).join("")+`<span class="chip c-mut" style="font-size:11px">Təyin olunmayıb: ${cl.filter(c=>!cur[c.id]).length}</span>`;
    scrim.querySelector("#tgrows").innerHTML=cl.map(c=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)"><b style="flex:1;min-width:0;font-size:13.5px">${esc(c.name)}${c.status&&c.status!=="Aktiv"?` <span class="hint">· ${esc(c.status)}</span>`:""}</b>
      <select data-tgc="${c.id}" style="width:auto;min-width:170px"><option value="">— təyin olunmayıb —</option>${pms.map(p=>`<option value="${p.id}"${cur[c.id]===p.id?" selected":""}>${esc(nm(p))}</option>`).join("")}</select></div>`).join("")||`<div class="hint">Müştəri yoxdur</div>`;
    scrim.querySelectorAll("[data-tgc]").forEach(sel=>sel.onchange=()=>{cur[sel.dataset.tgc]=sel.value;draw();});};
  draw();
  const au=scrim.querySelector("#tgauto");if(au)au.onclick=()=>{const cnt=p=>cl.filter(c=>cur[c.id]===p.id).length;cl.filter(c=>!cur[c.id]).forEach(c=>{const p=[...pms].sort((a,b)=>cnt(a)-cnt(b))[0];cur[c.id]=p.id;});draw();};
  scrim.querySelector("[data-ok]").onclick=async e=>{const b=e.currentTarget;const ch=cl.filter(c=>(c.tg_id||"")!==cur[c.id]);if(!ch.length){close();return;}
    b.disabled=true;b.textContent="Saxlanır…";
    for(const c of ch){const {error}=await sb.from('clients').update({tg_id:cur[c.id]||null}).eq('id',c.id);if(error){alert("Xəta («"+c.name+"»): "+error.message);b.disabled=false;b.textContent="Yadda saxla";return;}}
    await reload('clients');toast(ch.length+" məkanın targetoloqu yeniləndi","ok");close();};
}
function pmTaskOk(t){if(role!=="pm")return true;return t.client?pmClientOk(t.client):(!!me&&t.created_by===me.id)||taskIsMine(t);}
const pmClients=()=>state.clients.filter(c=>pmClientOk(c.name));
function openTaskForm(){
  const scrim=el("div","scrim");
  const roleOpts=Object.entries(ROLES).map(([k,r])=>`<option value="${k}">${esc(r.label)}</option>`).join("");
  const clientOpts=`<option value="">— müştəri yoxdur —</option>`+pmClients().map(c=>`<option>${esc(c.name)}</option>`).join("");
  const dd=new Date();dd.setDate(dd.getDate()+3);const defStr=dd.getFullYear()+"-"+String(dd.getMonth()+1).padStart(2,"0")+"-"+String(dd.getDate()).padStart(2,"0");
  const rowHtml=()=>`<div class="trow" style="border:1px solid var(--border);border-radius:10px;padding:11px;margin-bottom:9px;position:relative;background:var(--surface)">
    <button class="ibtn danger trm" title="Sətri sil" type="button" style="position:absolute;top:6px;right:6px">${ICON.x}</button>
    <div class="field" style="margin:0 34px 9px 0"><label>Başlıq</label><input class="tt" placeholder="Məs: Restoran üçün 3 story dizaynı"></div>
    <div style="display:grid;grid-template-columns:1fr 150px;gap:8px">
      <div class="field" style="margin:0"><label>Vəzifə</label><select class="tr">${roleOpts}</select></div>
      <div class="field" style="margin:0"><label>Deadline</label><input class="td" type="date" value="${defStr}"></div>
    </div>
    <div class="field" style="margin:9px 0 0"><label>Şəxslər <span class="hint" style="font-weight:400">(boş = bütün vəzifə görür; seç = yalnız seçilənlər)</span></label>
      <select class="tp" multiple size="4" style="width:100%"></select></div>
    <div class="field" style="margin:9px 0 0"><label>Müştəri <span class="hint" style="font-weight:400">(seçimlik — seçsən, həmin müştərinin daxilində görünəcək)</span></label>
      <select class="tc">${clientOpts}</select></div>
    <label class="urgtoggle" style="margin-top:9px"><input type="checkbox" class="tu"> 🔥 Təcili task</label></div>`;
  scrim.innerHTML=`<div class="modal" style="max-width:600px"><div class="mh"><h3>Yeni tasklar</h3><button>×</button></div>
    <div class="mb"><div class="hint" style="margin-bottom:10px;white-space:normal">Hər blok ayrı taskdır. Vəzifə seç → istəsən konkret şəxsləri seç (birdən çox olar). Şəxs seçməsən, o vəzifədəki hamı görür.</div>
    <div id="trows">${rowHtml()}</div>
    <button class="mini" id="taddrow" type="button" style="margin-top:2px">${ICON.plus} Yeni task</button></div>
    <div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" data-ok>Yarat</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  const rowsEl=scrim.querySelector("#trows");
  const wire=()=>{rowsEl.querySelectorAll(".trow").forEach(row=>{const rm=row.querySelector(".trm");rm.onclick=()=>{if(rowsEl.querySelectorAll(".trow").length>1)row.remove();};const tr=row.querySelector(".tr");tr.onchange=()=>fillPeopleSelect(row);if(!row.dataset.filled){fillPeopleSelect(row);row.dataset.filled="1";}});};
  wire();
  scrim.querySelector("#taddrow").onclick=()=>{const d=el("div");d.innerHTML=rowHtml();rowsEl.appendChild(d.firstElementChild);wire();};
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  scrim.querySelector("[data-ok]").onclick=async()=>{
    const payload=[];
    rowsEl.querySelectorAll(".trow").forEach(r=>{const title=r.querySelector(".tt").value.trim();if(!title)return;const assignees=[...r.querySelector(".tp").selectedOptions].map(o=>o.value).filter(Boolean);payload.push({title,role:r.querySelector(".tr").value,assignees,client:r.querySelector(".tc").value||"",deadline:r.querySelector(".td").value||null,status:"Yeni",urgent:r.querySelector(".tu").checked});});
    if(!payload.length){alert("Ən azı bir task başlığı yaz.");return;}
    const {error}=await sb.from('tasks').insert(payload);if(error){alert("Xəta: "+error.message);return;}
    const notifs=[];
    payload.forEach(t=>{const b=t.title+(t.deadline?(" · Deadline: "+t.deadline):"")+(t.client?(" · "+t.client):"");const u=t.urgent?"🔥 TƏCİLİ · ":"";
      if(t.assignees&&t.assignees.length)t.assignees.forEach(uid=>notifs.push({target_type:"user",target:uid,title:u+"📌 Yeni task",body:b,from_name:myName(),from_id:me?me.id:null,read_by:[],urgent:!!t.urgent}));
      else notifs.push({target_type:"role",target:t.role,title:u+"📌 Yeni task ("+taskRoleLabel(t.role)+")",body:b,from_name:myName(),from_id:me?me.id:null,read_by:[],urgent:!!t.urgent});});
    if(notifs.length){try{await sb.from('notifications').insert(notifs);}catch(e){}}
    close();await reload('tasks');
  };
}
function openTaskEdit(t){
  if(!t)return;const scrim=el("div","scrim");const cur=taskAssignees(t);
  const roleOpts=Object.entries(ROLES).map(([k,r])=>`<option value="${k}"${k===t.role?" selected":""}>${esc(r.label)}</option>`).join("");
  const stOpts=TASK_STAGES.map(s=>`<option${s===t.status?" selected":""}>${esc(s)}</option>`).join("");
  scrim.innerHTML=`<div class="modal"><div class="mh"><h3>Task düzəlişi</h3><button>×</button></div>
    <div class="mb">
      <div class="field"><label>Başlıq</label><input id="tt" value="${esc(t.title)}"></div>
      <div class="field"><label>Vəzifə</label><select id="tr">${roleOpts}</select></div>
      <div class="field"><label>Şəxslər <span class="hint" style="font-weight:400">(boş = bütün vəzifə)</span></label><select id="tp" multiple size="4" style="width:100%"></select></div>
      <div class="field"><label>Müştəri <span class="hint" style="font-weight:400">(seçimlik)</span></label><select id="tc"><option value="">— müştəri yoxdur —</option>${state.clients.map(c=>`<option${c.name===t.client?" selected":""}>${esc(c.name)}</option>`).join("")}</select></div>
      <div class="field"><label>Deadline</label><input id="td" type="date" value="${t.deadline?String(t.deadline).slice(0,10):""}"></div>
      <div class="field"><label>Status</label><select id="ts">${stOpts}</select></div>
      <label class="urgtoggle"><input type="checkbox" id="tu"${t.urgent?" checked":""}> 🔥 Təcili task</label>
    </div>
    <div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" data-ok>Yadda saxla</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  const trSel=scrim.querySelector("#tr"),tpSel=scrim.querySelector("#tp");
  const fill=()=>{const ppl=peopleOf(trSel.value);tpSel.innerHTML=ppl.length?ppl.map(p=>`<option value="${esc(p.id)}"${cur.includes(p.id)?" selected":""}>${esc(p.full_name||p.username)}</option>`).join(""):`<option value="" disabled>Bu vəzifədə işçi yoxdur</option>`;};
  fill();trSel.onchange=fill;
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  scrim.querySelector("[data-ok]").onclick=async()=>{const title=scrim.querySelector("#tt").value.trim();if(!title)return;const assignees=[...tpSel.selectedOptions].map(o=>o.value).filter(Boolean);await upd('tasks',t.id,{title,role:trSel.value,assignees,client:scrim.querySelector("#tc").value||"",deadline:scrim.querySelector("#td").value||null,status:scrim.querySelector("#ts").value,urgent:scrim.querySelector("#tu").checked});close();};
}

/* ---------- PWA: service worker + Web Push ---------- */
const VAPID_PUBLIC="BIjHEAOkRaBf8yyG_L2UL7BpehRPPJUV42NNQAcczFuszgktpAlXDyj5shYLALkikFuArZZ_pnmAgQYhOrjzYmQ";
if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
async function enablePush(){
  try{
    const ios=/iPhone|iPad/.test(navigator.userAgent),standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
    if(ios&&!standalone)return "iPhone-da əvvəlcə: Paylaş → «Ana ekrana əlavə et», sonra tətbiqdən aç";
    if(!("serviceWorker" in navigator)||!("PushManager" in window))return "Bu brauzer push dəstəkləmir";
    const perm=await Notification.requestPermission();if(perm!=="granted")return "İcazə verilmədi — telefon ayarlarından icazə ver";
    const reg=await navigator.serviceWorker.ready;
    const key=Uint8Array.from(atob(VAPID_PUBLIC.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
    const sub=(await reg.pushManager.getSubscription())||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
    const j=sub.toJSON();const {error}=await sb.from('push_subs').upsert({endpoint:j.endpoint,sub:j});
    return error?"Xəta: "+error.message:"✓ Push bildirişləri bu cihazda aktivdir";
  }catch(e){return "Alınmadı: "+(e.message||e);}
}
/* ---------- Notifications ---------- */
function notifForMe(n){return n.target_type==="all"||(n.target_type==="role"&&n.target===role)||(n.target_type==="user"&&me&&n.target===me.id);}
function notifHidden(n){return !!me&&Array.isArray(n.hidden_by)&&n.hidden_by.includes(me.id);}
function myNotifs(){return state.notifications.filter(n=>notifForMe(n)&&!notifHidden(n)).slice().sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")));}
function notifRead(n){return Array.isArray(n.read_by)&&me&&n.read_by.includes(me.id);}
function myDeadlineWarnings(){
  const isMgr=TASK_MANAGERS.includes(role);const out=[];
  state.tasks.forEach(t=>{if(taskDone(t))return;if(!(isMgr||taskIsMine(t)))return;if(!t.deadline)return;const di=dlInfo(t.deadline,t.status);if(di.c==="crit"||di.c==="warn")out.push({title:t.title,sub:taskRoleLabel(t.role)+(t.client?" · "+t.client:""),di});});
  if(role==="ceo"||role==="pm")state.meetings.forEach(m=>{const d=meetDeadline(m);if(d&&d.c!=="good")out.push({title:"📝 İclas hesabatı — "+m.client,sub:(m.meet_date||"")+" iclası · "+meetMonth(m),di:d});});
  // Koordinator: videoqraf videoları gecikdirəndə (3 günlük deadline keçib) — paneldə xəbərdarlıq
  if(role==="coordinator"||role==="ceo")state.shoots.forEach(sh=>{const di=shootDeadline(sh);if(di&&di.c==="crit")out.push({title:"🎬 Video gecikir — "+(sh.client||""),sub:(sh.video_op||"Videoqraf")+(sh.month?" · "+sh.month+" çəkilişi":""),di});});
  // SMM: paylaşım vaxtı keçib, qeyd olunmayıb — Account-a öz paylaşımları, CEO/PM-ə 1 saatdan sonra
  if(role==="account"||SMM_MGR.includes(role))smmOverdue().forEach(p=>{const late=Date.now()-smmDue(p);if(role!=="account"&&late<36e5)return;
    out.push({title:"📣 "+p.client+" — "+(p.kind==="video"?"video":"foto")+" paylaşılmalıdır",sub:smmDateAz(p.post_date)+" · saat "+(p.post_time||"")+(role!=="account"&&p.account_id?" · "+personName(p.account_id):""),di:{c:"crit",txt:"Paylaşılmayıb"}});});
  return out.sort((a,b)=>(a.di.c==="crit"?0:1)-(b.di.c==="crit"?0:1));
}
function notifBadge(){return myNotifs().filter(n=>!notifRead(n)).length+myDeadlineWarnings().length;}
function maybeBrowserNotify(n){try{if(!n||!notifForMe(n))return;if(me&&n.from_id===me.id)return;
  if(!n.urgent&&/təsdiqlədi|təsdiqləndi|hazırdır|✅/i.test(String(n.title||"")))fxConfetti();
  if(n.urgent)showUrgentAlert([n]);
  if(typeof Notification!=="undefined"&&Notification.permission==="granted"){new Notification((n.urgent?"🚨 TƏCİLİ — ":"MezMoon CRM — ")+String(n.title||"Bildiriş").replace(/^🔥 TƏCİLİ · /,""),{body:n.body||"",requireInteraction:!!n.urgent});}}catch(e){}}
/* ---------- Təcili bildirişlər: qırmızı pəncərə + siqnal səsi (gələndə və ya növbəti girişdə) ---------- */
const urgentShown=new Set();
function urgentBeep(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ac=new C();
  [0,.3,.6].forEach(t=>{const o=ac.createOscillator(),g=ac.createGain();o.type="square";o.frequency.value=t===.6?1175:880;
    g.gain.setValueAtTime(.0001,ac.currentTime+t);g.gain.exponentialRampToValueAtTime(.12,ac.currentTime+t+.02);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+t+.24);
    o.connect(g).connect(ac.destination);o.start(ac.currentTime+t);o.stop(ac.currentTime+t+.26);});setTimeout(()=>ac.close(),1600);}catch(e){}}
function urgentView(n){const t=String(n.title||"");return /task/i.test(t)?"tasks":/brif|dizayn|motion/i.test(t)?"briefs":"";}
function markNotifsRead(list){if(!me)return;list.filter(n=>!notifRead(n)).forEach(n=>{const rb=Array.isArray(n.read_by)?n.read_by.slice():[];rb.push(me.id);sb.from('notifications').update({read_by:rb}).eq('id',n.id).then(()=>{});});setTimeout(()=>reload('notifications'),400);}
function showUrgentAlert(list){
  list=(list||[]).filter(n=>n&&!urgentShown.has(n.id));if(!list.length)return;
  list.forEach(n=>urgentShown.add(n.id));
  let scrim=document.querySelector(".urgscrim");
  if(!scrim){
    scrim=el("div","scrim urgscrim");
    scrim.innerHTML=`<div class="modal urgmodal" role="alertdialog" aria-label="Təcili bildiriş"><div class="uh">🚨 TƏCİLİ</div><div class="ulist"></div>
      <div class="mf"><button class="btn ghost" data-ok>Gördüm</button><button class="btn" data-go style="background:var(--crit);border-color:var(--crit)">Bax ${ICON.arrow}</button></div></div>`;
    document.body.appendChild(scrim);scrim._items=[];
    const close=()=>{markNotifsRead(scrim._items);scrim.remove();};
    scrim.querySelector("[data-ok]").onclick=close;
    scrim.querySelector("[data-go]").onclick=()=>{const v=urgentView(scrim._items[scrim._items.length-1]);close();if(v&&ROLES[role]&&ROLES[role].nav.includes(v)){view=v;render();}};
  }
  const ul=scrim.querySelector(".ulist");
  list.forEach(n=>{scrim._items.push(n);ul.insertAdjacentHTML("afterbegin",`<div class="urgitem"><div class="t">${esc(String(n.title||"Bildiriş").replace(/^🔥 TƏCİLİ · /,""))}</div><div class="m">${esc(n.body||"")}</div>${n.from_name?`<div class="hint" style="margin-top:4px">— ${esc(n.from_name)}</div>`:""}</div>`);});
  urgentBeep();
}
function showPendingUrgent(){if(!me)return;const L=myNotifs().filter(n=>n.urgent&&!notifRead(n)&&n.from_id!==me.id&&Date.now()-Date.parse(n.created_at||0)<7*864e5);if(L.length)showUrgentAlert(L.slice(0,5).reverse());}
/* Bildirişi silmək: yalnız mənə aid olan sətir həqiqətən silinir, ortaq (rol / hamı) bildiriş isə yalnız məndə gizlənir */
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
function openNotifs(){
  if(typeof Notification!=="undefined"&&Notification.permission==="default")Notification.requestPermission().catch(()=>{});
  const isMgr=TASK_MANAGERS.includes(role);
  const warns=myDeadlineWarnings();const notifs=myNotifs();
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:480px;width:96vw;max-height:84vh;display:flex;flex-direction:column">
    <div class="mh"><h3 style="font-size:16px">Bildirişlər</h3><button>×</button></div>
    <div style="flex:1;overflow-y:auto;padding:2px">
      ${isMgr?`<button class="mini" id="ncompose" style="width:100%;margin-bottom:12px;justify-content:center;padding:9px">İşçiyə bildiriş göndər</button>`:""}
      ${warns.length?`<div class="hint" style="margin:2px 0 6px;font-weight:600">⏰ Deadline xəbərdarlıqları</div>`:""}
      <div id="nwarns"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0 6px"><div class="hint" style="font-weight:600">🔔 Mesajlar</div>${notifs.length?`<button class="mini" id="nclear" style="color:var(--crit)">Hamısını sil</button>`:""}</div>
      <div id="nlist"></div>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:6px"><button class="mini" id="pushon" style="width:100%;justify-content:center;padding:9px;margin-bottom:6px">🔔 Bu cihazda push bildirişlərini aç</button><button class="mini" id="tglink" style="width:100%;justify-content:center;padding:9px">📱 Telegram bildirişlərini qoş</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  const nw=scrim.querySelector("#nwarns");
  warns.forEach(w=>nw.appendChild(el("div","row",`<div class="main"><div class="t">${esc(w.title)}</div><div class="m">${esc(w.sub)}</div></div><div class="r"><span class="chip c-${w.di.c}" style="font-size:10.5px">${esc(w.di.txt)}</span></div>`)));
  const nl=scrim.querySelector("#nlist");
  if(!notifs.length)nl.appendChild(el("div","empty","Bildiriş yoxdur"));
  else notifs.forEach(n=>{const unread=!notifRead(n);const t=n.created_at?new Date(n.created_at):null;const tm=t?(String(t.getDate()).padStart(2,"0")+"."+String(t.getMonth()+1).padStart(2,"0")+" "+String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0")):"";
    nl.appendChild(el("div","row",`<div class="main"><div class="t">${unread?'<span style="display:inline-block;width:7px;height:7px;background:var(--accent);border-radius:50%;margin-right:6px"></span>':""}${n.urgent?'<span class="urgbadge urgmini">🚨 TƏCİLİ</span>':""}${esc(String(n.title||"Bildiriş").replace(/^🔥 TƏCİLİ · /,""))}</div><div class="m" style="white-space:normal">${esc(n.body||"")}</div><div class="hint" style="font-size:10px;margin-top:2px">${esc(n.from_name||"")}${tm?" · "+tm:""}</div></div><div class="r"><button class="ibtn danger" data-ndel="${n.id}" title="Bildirişi sil" aria-label="Bildirişi sil">×</button></div>`));});
  nl.querySelectorAll("[data-ndel]").forEach(b=>b.onclick=async()=>{const n=notifs.find(x=>String(x.id)===b.dataset.ndel);const row=b.closest(".row");if(row)row.remove();if(n)await notifRemove([n]);if(!nl.querySelector(".row")){nl.innerHTML="";nl.appendChild(el("div","empty","Bildiriş yoxdur"));}});
  const nc=scrim.querySelector("#nclear");if(nc)nc.onclick=async()=>{if(!confirm(`Bütün bildirişlər silinsin (${notifs.length})?`))return;nc.disabled=true;nl.innerHTML="";nl.appendChild(el("div","empty","Bildiriş yoxdur"));nc.remove();await notifRemove(notifs);};
  const cb=scrim.querySelector("#ncompose");if(cb)cb.onclick=()=>{close();openNotifCompose();};
  const po=scrim.querySelector("#pushon");if(po)po.onclick=async()=>{po.disabled=true;po.textContent=await enablePush();};
  const tg=scrim.querySelector("#tglink");if(tg)tg.onclick=()=>{if(!TELEGRAM_BOT){alert("Telegram bot hələ qurulmayıb.");return;}window.open("https://t.me/"+TELEGRAM_BOT+"?start="+(me?me.id:""),"_blank");};
  scrim.querySelector(".mh button").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  // mark unread as read
  const unread=notifs.filter(n=>!notifRead(n));
  if(unread.length&&me){unread.forEach(n=>{const rb=Array.isArray(n.read_by)?n.read_by.slice():[];rb.push(me.id);sb.from('notifications').update({read_by:rb}).eq('id',n.id).then(()=>{});});setTimeout(()=>reload('notifications'),400);}
}
function openNotifCompose(){
  const scrim=el("div","scrim");
  const roleOpts=Object.entries(ROLES).map(([k,r])=>`<option value="role:${k}">Vəzifə: ${esc(r.label)}</option>`).join("");
  const ppl=state.profiles.filter(p=>p.role).map(p=>`<option value="user:${esc(p.id)}">${esc(p.full_name||p.username)} (${esc(taskRoleLabel(p.role))})</option>`).join("");
  scrim.innerHTML=`<div class="modal" style="max-width:460px"><div class="mh"><h3>İşçiyə bildiriş göndər</h3><button>×</button></div>
    <div class="mb">
      <div class="field"><label>Kimə</label><select id="nt"><option value="all">Hamı</option>${roleOpts}${ppl}</select></div>
      <div class="field"><label>Başlıq</label><input id="ntitle" placeholder="məs. Deadline yaxınlaşır"></div>
      <div class="field"><label>Mesaj</label><textarea id="nbody" placeholder="Mesajı yaz…"></textarea></div>
    </div>
    <div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" data-ok>Göndər</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  scrim.querySelector("[data-ok]").onclick=async()=>{
    const title=scrim.querySelector("#ntitle").value.trim();const body=scrim.querySelector("#nbody").value.trim();
    if(!title&&!body){alert("Başlıq və ya mesaj yaz.");return;}
    const tv=scrim.querySelector("#nt").value;const [tt,...rest]=tv.split(":");const target=rest.join(":");
    const rec={target_type:tt,target:tt==="all"?"":target,title,body,from_name:myName(),from_id:me?me.id:null,read_by:[]};
    await ins('notifications',rec);
    pushTelegram(rec);
    close();alert("Bildiriş göndərildi.");
  };
}

/* ---------- Shell ---------- */
/* ---------- Reklam (Meta) ---------- */
function metaPreset(){return adsRange==="today"?"today":adsRange==="7"?"last_7d":"last_30d";}
function adsRangeLabel(){return adsRange==="today"?"Bu gün":adsRange==="7"?"Son 7 gün":"Son 30 gün";}
function adNum(n){n=Number(n||0);if(!isFinite(n))n=0;return (Math.abs(n)>=1000?Math.round(n):Math.round(n*100)/100).toLocaleString("az-AZ");}
function adMoney(n,cur){return adNum(n)+(cur?" "+cur:"");}
function adCardHTML(c,data){
  const head=`<div class="ph"><h3>${esc(c.name)}</h3><span class="count">${esc(adsRangeLabel())}</span></div>`;
  if(!data||data.loading)return head+`<div class="pb"><div class="empty">Yüklənir…</div></div>`;
  if(!data.ok)return head+`<div class="pb"><div class="empty" style="color:var(--crit)">⚠ ${esc(data.error||"Xəta baş verdi")}</div></div>`;
  const t=data.totals||{};const cur=(data.account&&data.account.currency)||"";
  const cpr=Number(t.results)>0?adMoney(Number(t.spend)/Number(t.results),cur):"—";
  const ctr=mCTR(t.clicks,t.impressions),cpc=mCPC(t.spend,t.clicks),cpm=mCPM(t.spend,t.impressions);
  const tiles=`<div class="tiles" style="padding:12px 14px 4px">
    ${tile("Xərc",adMoney(t.spend,cur),data.account&&data.account.name?esc(data.account.name):"",true)}
    ${tile("Nəticələr",adNum(t.results),"nəticə başına "+cpr)}
    ${tile("Kliklər",adNum(t.clicks),"CTR "+adNum(ctr)+"% · CPC "+adMoney(cpc,cur))}
    ${tile("Çatım / Göstərim",adNum(t.reach),adNum(t.impressions)+" göstərim · CPM "+adMoney(cpm,cur))}
  </div>`;
  let acts="";
  if(Array.isArray(data.actions)&&data.actions.length){
    acts=`<div style="padding:0 14px 12px;display:flex;gap:6px;flex-wrap:wrap">${data.actions.slice(0,4).map(a=>`<span class="chip c-mut" style="font-size:11px">${esc(a.label)}: <strong>${adNum(a.value)}</strong></span>`).join("")}</div>`;
  }
  let spark="";
  if(Array.isArray(data.daily)&&data.daily.length>1){
    const vals=data.daily.map(d=>Number(d.spend||0));const mx=Math.max(...vals,1);
    const bars=data.daily.map(d=>{const h=Math.max(2,Math.round(Number(d.spend||0)/mx*34));return `<div title="${esc(String(d.date))}: ${adMoney(d.spend,cur)}" style="flex:1;height:${h}px;background:var(--accent);opacity:.7;border-radius:2px 2px 0 0;min-width:3px"></div>`;}).join("");
    spark=`<div style="padding:2px 14px 14px"><div class="hint" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Gündəlik xərc</div><div style="display:flex;align-items:flex-end;gap:2px;height:38px">${bars}</div></div>`;
  }
  return head+tiles+acts+spark;
}
function updateAdsTotal(){
  const box=document.getElementById("ads-tot");if(!box)return;
  const withAcct=state.clients.filter(c=>(c.ad_account_id||"").trim());
  let spend=0,results=0,clicks=0,cur="",loaded=0;const total=withAcct.length;
  withAcct.forEach(c=>{const d=adsData[c.id+"|"+adsRange];if(d&&d.ok){loaded++;const t=d.totals||{};spend+=Number(t.spend||0);results+=Number(t.results||0);clicks+=Number(t.clicks||0);if(!cur&&d.account)cur=d.account.currency||"";}});
  const cpr=results>0?adMoney(spend/results,cur):"—";
  box.innerHTML=tile("Ümumi xərc",adMoney(spend,cur),loaded+"/"+total+" hesab · "+adsRangeLabel(),true)
    +tile("Ümumi nəticələr",adNum(results),"nəticə başına "+cpr)
    +tile("Ümumi kliklər",adNum(clicks),adsRangeLabel());
}
let _adsFeedTimer=null;
function adsFeedRefresh(){if(_adsFeedTimer)return;_adsFeedTimer=setTimeout(()=>{_adsFeedTimer=null;if(view==="ads"&&adsTab==="recent")render();},150);}
function adStatusChip(s){
  const m={ACTIVE:["Aktiv","c-good"],PAUSED:["Dayandırılıb","c-warn"],CAMPAIGN_PAUSED:["Dayandırılıb","c-warn"],ADSET_PAUSED:["Dayandırılıb","c-warn"],IN_PROCESS:["Hazırlanır","c-accent"],PENDING_REVIEW:["Yoxlamada","c-accent"],WITH_ISSUES:["Problemli","c-crit"],DISAPPROVED:["Rədd edilib","c-crit"],ARCHIVED:["Arxiv","c-mut"],DELETED:["Silinib","c-mut"],COMPLETED:["Tamamlanıb","c-mut"]};
  const x=m[s]||[s||"—","c-mut"];return `<span class="chip ${x[1]}">${esc(x[0])}</span>`;
}
function fmtDT(iso){if(!iso)return "—";const d=new Date(iso);if(isNaN(d))return "—";return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0")+"."+d.getFullYear();}
function isNewCampaign(iso){if(!iso)return false;const d=new Date(iso);return !isNaN(d)&&(Date.now()-d.getTime())<7*86400000;}
// valyutanı təxmini USD-yə çevirmək (CPM həddi dollarla verilib)
const FX_USD={USD:1,AZN:1.70,EUR:0.92,GBP:0.79,TRY:34,RUB:90,AED:3.67,KZT:480,GEL:2.70,UAH:41};
function cpmUsd(cpm,cur){const r=FX_USD[cur]||1;return Number(cpm||0)/r;}
// Zəiflik: yalnız MESAJ kampaniyaları, CPM 3$-dan yuxarı
const MSG_CPM_USD=3;
// CPM/CPC/CTR-i xam xərc/göstərim/klik-dən hesablayırıq (uyğunsuzluq olmasın deyə)
function mCPM(spend,impr){impr=Number(impr||0);return impr?Number(spend||0)/impr*1000:0;}
function mCPC(spend,clicks){clicks=Number(clicks||0);return clicks?Number(spend||0)/clicks:0;}
function mCTR(clicks,impr){impr=Number(impr||0);return impr?Number(clicks||0)/impr*100:0;}
function campWeak(c){
  if(c.type!=="message")return false;                        // yalnız mesaj kampaniyaları
  if(!(Number(c.impr||0)>=500))return false;                 // az göstərim → CPM etibarsız
  return cpmUsd(mCPM(c.spend,c.impr),c.cur)>MSG_CPM_USD;
}
function miniSpark(daily,weak){
  if(!Array.isArray(daily)||!daily.length)return "";
  const vals=daily.map(x=>Number(x.results||0));const mx=Math.max(...vals,1);
  const col=weak?"var(--crit)":"var(--accent)";
  return `<span title="son 7 gün nəticə" style="display:inline-flex;align-items:flex-end;gap:1px;height:20px;vertical-align:middle">${vals.map(v=>`<span style="width:4px;height:${Math.max(2,Math.round(v/mx*20))}px;background:${col};opacity:.75;border-radius:1px"></span>`).join("")}</span>`;
}
function campCover(url){
  if(url)return `<a href="${esc(url)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;color:var(--accent-ink);text-decoration:none;font-weight:600">${ICON.link}Cover</a>`;
  return `<span style="color:var(--muted)">cover yox</span>`;
}
function typeChip(t){return t==="message"?'<span class="chip c-accent" style="font-size:9.5px;padding:1px 5px">Mesaj</span>':'<span class="chip c-mut" style="font-size:9.5px;padding:1px 5px">Digər</span>';}
function renderAdsFeed(withAcct){
  const p=el("div","panel");let rows=[];let loading=0;
  withAcct.forEach(c=>{const d=adsData[c.id+"|"+adsRange];if(!d||d.loading){loading++;return;}if(!d.ok)return;
    const cur=(d.account&&d.account.currency)||"";
    (d.campaigns||[]).forEach(cm=>{const r=Object.assign({client:c.name,cur},cm);r.cpm=mCPM(r.spend,r.impr);r.cpc=mCPC(r.spend,r.clicks);r.ctr=mCTR(r.clicks,r.impr);r.cpr=r.results?Number(r.spend)/Number(r.results):0;r._weak=campWeak(r);rows.push(r);});
  });
  const weakCount=rows.filter(r=>r._weak).length;
  if(adsOnlyDown)rows=rows.filter(r=>r._weak);
  rows.sort((a,b)=>{if(a._weak!==b._weak)return a._weak?-1:1;if(Number(b.spend)!==Number(a.spend))return Number(b.spend)-Number(a.spend);return String(b.created||"").localeCompare(String(a.created||""));});
  const ph=el("div","ph",`<h3>Kampaniyalar — ${esc(adsRangeLabel())} nəticə & effektivlik</h3><span class="count">${rows.length} kampaniya</span>`);
  const flt=el("button","mini",(adsOnlyDown?"✓ ":"")+`⚠ Yalnız zəiflər${weakCount?" ("+weakCount+")":""}`);
  flt.style.marginLeft="auto";if(adsOnlyDown)flt.style.borderColor="var(--crit)";
  flt.onclick=()=>{adsOnlyDown=!adsOnlyDown;render();};ph.appendChild(flt);
  p.appendChild(ph);
  const tw=el("div","tablewrap");
  const body=rows.map(r=>`<tr${r._weak?' style="background:color-mix(in srgb,var(--crit) 6%,transparent)"':''}>
    <td><strong>${esc(r.name||"—")}</strong> ${typeChip(r.type)} ${r._weak?'<span class="chip c-crit" style="font-size:10px;padding:1px 6px">⚠ ZƏİF</span>':isNewCampaign(r.created)?'<span class="chip c-accent" style="font-size:10px;padding:1px 6px">YENİ</span>':""}<div class="m" style="color:var(--muted);font-size:12px">${esc(r.client)} · ${fmtDT(r.created)} · ${campCover(r.thumb)}</div></td>
    <td>${adStatusChip(r.status)}</td>
    <td class="num">${adMoney(r.spend,r.cur)}</td>
    <td class="num"><strong>${adNum(r.results)}</strong></td>
    <td class="num">${r.results?adMoney(r.cpr,r.cur):'—'}</td>
    <td style="font-size:11.5px;line-height:1.5;white-space:nowrap"><strong${(r.type==="message"&&cpmUsd(r.cpm,r.cur)>MSG_CPM_USD)?' style="color:var(--crit)"':''}>CPM ${adMoney(r.cpm,r.cur)}</strong><br>CPC ${adMoney(r.cpc,r.cur)} · CTR ${adNum(r.ctr)}%</td>
    <td style="white-space:nowrap">${miniSpark(r.daily7,r._weak)}</td></tr>`).join("");
  tw.innerHTML=`<table><thead><tr><th>Kampaniya</th><th>Status</th><th>Xərc</th><th>Nəticə</th><th>Nəticə qiyməti</th><th>CPM · CPC · CTR</th><th>7g</th></tr></thead><tbody>${body||`<tr><td colspan="7"><div class="empty">${loading?"Yüklənir…":adsOnlyDown?"Zəif kampaniya yoxdur ✓":"Kampaniya tapılmadı"}</div></td></tr>`}</tbody></table>`;
  p.appendChild(tw);
  const note=el("div","empty");note.style.cssText="text-align:left;color:var(--muted);font-size:12px;padding:10px 14px";
  note.innerHTML=`Rəqəmlər yuxarıdakı dövrə (${esc(adsRangeLabel())}) aiddir. <span class="chip c-crit" style="font-size:10px">⚠ ZƏİF</span> = <strong>Mesaj</strong> kampaniyasında CPM &gt; 3$ (təxmini USD-yə çevrilir). Nəticə qiyməti (CPR) satış effektivliyinin göstəricisidir — aşağı = yaxşı.`;
  p.appendChild(note);
  if(loading&&rows.length)p.appendChild(el("div","empty",`${loading} hesab hələ yüklənir…`));
  return p;
}
function openAdsConfig(){
  const scrim=el("div","scrim");
  const body=state.clients.map(c=>`<div class="row" data-cid="${c.id}"><div class="main"><div class="t">${esc(c.name)}</div><div class="m">Meta Ad Account ID (yalnız rəqəmlər)</div></div><div class="r" style="display:flex;gap:7px;align-items:center"><input data-in value="${esc(c.ad_account_id||'')}" placeholder="məs. 1234567890" style="width:160px;font-family:var(--fmono);font-size:12.5px;padding:6px 9px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--ink)"><button class="mini" data-sv>${ICON.check} Yadda</button></div></div>`).join("");
  scrim.innerHTML=`<div class="modal" style="max-width:640px"><div class="mh"><h3>Reklam hesabları — məkan ID-ləri</h3><button data-x>×</button></div><div class="mb"><div class="pb">${body||'<div class="empty">Klient yoxdur</div>'}</div></div><div class="mf"><button class="btn" data-done>Bağla</button></div></div>`;
  document.body.appendChild(scrim);
  const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.querySelector("[data-done]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  scrim.querySelectorAll(".row").forEach(row=>{
    const cid=row.dataset.cid,inp=row.querySelector("[data-in]"),sv=row.querySelector("[data-sv]");
    sv.onclick=async()=>{sv.disabled=true;const old=sv.innerHTML;sv.innerHTML=ICON.check+" ...";
      await upd('clients',cid,{ad_account_id:inp.value.replace(/[^0-9]/g,"")});
      Object.keys(adsData).forEach(k=>{if(k.indexOf(cid+"|")===0)delete adsData[k];});
      sv.innerHTML=ICON.check+" ✓";sv.disabled=false;setTimeout(()=>{if(sv.isConnected)sv.innerHTML=old;},1000);};
  });
}
/* ---------- Targeting brifləri ---------- */
/* Account/CEO/PM materialın linkini göndərir → brif MZ-kod alır → targetoloq reklamın ADINA kodu yazır →
   ad-briefs-sync funksiyası hər saat Meta-da kodu tapıb brifi «Reklamda» edir. */
const AD_SYNC_URL=SB_URL+"/functions/v1/ad-briefs-sync";
const AB_SENDERS=["ceo","pm","account"];
const AB_COL={"Təklif":"warn","Rədd edildi":"mut","Göndərildi":"warn","Götürüldü":"accent","Reklamda":"good","Bitdi":"mut","Problem":"crit"};
/* Targetoloqun öz təklifi: Təklif → CEO təsdiqləyir (kod aktivləşir, brif «Götürüldü») və ya rədd edir */
const AB_APPROVERS=["ceo"];
const abProp=b=>b.status==="Təklif"||b.status==="Rədd edildi";
const AB_GOALS=["Mesaj","Profil ziyarəti","Reach / Baxış","Trafik","Lead","Digər"];
const AB_BAD=new Set(["DISAPPROVED","WITH_ISSUES"]);
let abFilter="open", abClient="";
const abOpen=b=>b.status==="Göndərildi"||b.status==="Götürüldü";
function abAge(iso){const h=(Date.now()-Date.parse(iso))/36e5;if(!isFinite(h))return "";return h<1?Math.max(1,Math.round(h*60))+" dəq":h<48?Math.round(h)+" saat":Math.round(h/24)+" gün";}
function abLag(b){const h=(Date.parse(b.live_at)-Date.parse(b.created_at))/36e5;if(!isFinite(h))return "—";return h<1?"1 saatdan az":h<48?Math.round(h)+" saat":Math.round(h/24)+" gün";}
function abAdName(b){return b.code+" | "+b.client+(b.goal?" | "+b.goal:"");}
const roleIds=rs=>state.profiles.filter(p=>rs.includes(p.role)).map(p=>p.id);
async function abNotify(ids,title,body,ref){
  ids=[...new Set(ids.filter(x=>x&&(!me||x!==me.id)))];if(!ids.length)return;
  try{await sb.from('notifications').insert(ids.map(id=>({target_type:"user",target:id,title,body,from_name:myName(),from_id:me?me.id:null,read_by:[],...(ref?{ref}:{})})));}catch(e){}
}
/* Bildirişlərdə brifin tam detalları (Telegram-a da gedir) */
function abDetails(b){return [`Brif kodu: ${b.code}`,`Məkan: ${b.client}`,b.goal?`Məqsəd: ${b.goal}`:"",b.budget?`Büdcə / müddət: ${b.budget}`:"",b.link?`Material: ${b.link}`:"",b.note?`Qeyd: ${b.note}`:""].filter(Boolean).join("\n");}
async function abSync(btn){
  const old=btn?btn.innerHTML:"";if(btn){btn.disabled=true;btn.innerHTML="⏳ Meta yoxlanılır…";}
  try{
    const r=await fetch(AD_SYNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY},body:"{}"});
    const j=await r.json().catch(()=>({ok:false,error:"cavab yoxdur ("+r.status+")"}));
    if(!j.ok)alert("Yoxlama alınmadı: "+(j.error||""));
    else if(j.errors&&j.errors.length)alert("Bəzi hesablar oxunmadı:\n"+j.errors.join("\n"));
  }catch(e){alert("Yoxlama alınmadı: "+(e.message||e));}
  if(btn){btn.disabled=false;btn.innerHTML=old;}
  await reload('ad_briefs');
}
function abCopy(text){
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>alert("Kopyalandı:\n"+text),()=>prompt("Kopyala:",text));
  else prompt("Kopyala:",text);
}
function abCard(b){
  const isT=role==="targeting";const isMgr=TASK_MANAGERS.includes(role);
  const col=AB_COL[b.status]||"mut";
  const thumb=b.ad_thumb?`<img src="${esc(b.ad_thumb)}" alt="" style="width:46px;height:46px;border-radius:7px;object-fit:cover;flex:none">`:`<span class="nothumb" style="width:46px;height:46px"></span>`;
  const meta=[`<a href="${esc(b.link)}" target="_blank" rel="noopener" style="color:var(--accent-ink);font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:3px">${ICON.link}Material</a>`];
  if(b.goal)meta.push(esc(b.goal));if(b.budget)meta.push(esc(b.budget));
  if(b.proposed)meta.push(`💡 ${esc(b.created_by_name||"—")} təklif etdi · ${esc(abAge(b.proposed_at||b.created_at))} əvvəl`);
  else meta.push(`${esc(b.created_by_name||"—")} · ${esc(abAge(b.created_at))} əvvəl`);
  if(b.approved_by_name&&b.status!=="Rədd edildi")meta.push(`✅ ${esc(b.approved_by_name)} təsdiqlədi${b.approved_at?" · "+esc(fmtDT(b.approved_at)):""}`);
  if(b.taken_by_name&&!b.proposed)meta.push(`🎯 ${esc(b.taken_by_name)}`);
  let ad="";
  if(b.ad_id){
    const cur=b.ad_currency||"";const cpr=Number(b.ad_results)>0?adMoney(Number(b.ad_spend)/Number(b.ad_results),cur):"—";
    ad=`<div style="margin-top:7px;padding:8px 10px;border-radius:8px;background:var(--surface-2);font-size:12.5px">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><strong>${esc(b.ad_name||b.ad_id)}</strong>${b.ad_status?adStatusChip(b.ad_status):""}${Number(b.ad_count)>1?`<span class="chip c-mut" style="font-size:10px">${b.ad_count} reklam</span>`:""}</div>
      ${b.campaign_name?`<div class="hint">Kampaniya: ${esc(b.campaign_name)}</div>`:""}
      <div class="num" style="margin-top:4px;display:flex;gap:14px;flex-wrap:wrap"><span>Xərc <b>${adMoney(b.ad_spend,cur)}</b></span><span>Nəticə <b>${adNum(b.ad_results)}</b></span><span>Nəticə qiyməti <b>${cpr}</b></span><span>Göstərim <b>${adNum(b.ad_impr)}</b></span></div>
      ${b.live_at?`<div class="hint" style="margin-top:3px">Reklama çıxdı: ${fmtDT(b.live_at)} · göndərildikdən ${esc(abLag(b))} sonra${b.checked_at?" · yoxlandı "+esc(abAge(b.checked_at))+" əvvəl":""}</div>`:""}
    </div>`;
  }
  let act="";
  if(b.status==="Təklif"&&AB_APPROVERS.includes(role))act+=`<button class="mini" data-abok="${b.id}" style="color:var(--good)">${ICON.check} Təsdiqlə</button><button class="mini" data-abno="${b.id}" style="color:var(--crit)">Rədd et</button>`;
  if(isT&&b.status==="Göndərildi")act+=`<button class="mini" data-abtake="${b.id}">${ICON.check} Götürdüm</button>`;
  if(isT&&abOpen(b))act+=`<button class="mini" data-abcopy="${b.id}" title="Reklamın adına bunu yaz">📋 Reklam adı</button><button class="mini" data-abmanual="${b.id}" title="Kod yazmaq mümkün olmadısa — Ad ID ilə qeyd et">Ad ID</button><button class="mini" data-abprob="${b.id}" style="color:var(--crit)">Problem</button>`;
  if(isT&&b.status==="Problem")act+=`<button class="mini" data-abfixed="${b.id}" title="Problem həll olundu — reklamı qoymağa davam et">${ICON.check} Problem həll olundu</button><button class="mini" data-abcopy="${b.id}" title="Reklamın adına bunu yaz">📋 Reklam adı</button><button class="mini" data-abmanual="${b.id}" title="Reklam artıq qoşulub — Ad ID ilə qeyd et">✅ Reklama qoyuldu</button>`;
  if(b.status==="Reklamda"&&(isT||isMgr))act+=`<button class="mini" data-abdone="${b.id}">Bitdi</button>`;
  if(b.status==="Problem"&&(isOwner(b)||isMgr))act+=`<button class="mini" data-abresend="${b.id}">${ICON.arrow} Yenidən göndər</button>`;
  if(isOwner(b)||role==="ceo")act+=`<button class="mini" data-abdel="${b.id}" title="Brifi sil" style="color:var(--crit);border-color:color-mix(in srgb,var(--crit) 35%,transparent)">${ICON.trash}</button>`;
  const late=abOpen(b)&&(Date.now()-Date.parse(b.created_at))>24*36e5;
  return `<div class="row" style="align-items:flex-start;gap:12px;flex-wrap:wrap;border-left:3px solid var(--${col==="mut"?"border":col})">
    ${thumb}
    <div class="main" style="min-width:230px;flex:1">
      <div class="t" style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">${abProp(b)?`<span class="chip c-warn" style="font-size:11px">💡 Təklif</span>`:`<span class="chip c-accent num" style="font-size:11px;cursor:pointer" data-abcode="${esc(b.code)}" title="Kopyala">${esc(b.code)}</span>`}${esc(b.client)}${b.proposed&&!abProp(b)?`<span class="chip c-mut" style="font-size:10px" title="Targetoloqun öz təklifi">💡 targetoloq təklifi</span>`:""}<span class="chip c-${col}" style="font-size:10.5px">${esc(b.status)}</span>${late?`<span class="chip c-crit" style="font-size:10.5px">${ICON.clock}${esc(abAge(b.created_at))} gözləyir</span>`:""}${AB_BAD.has(b.ad_status)?`<span class="chip c-crit" style="font-size:10.5px">⛔ Meta problemi</span>`:""}</div>
      <div class="m" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:3px">${meta.join('<span style="opacity:.4">·</span>')}</div>
      ${b.note?`<div style="margin-top:5px;font-size:13px;color:var(--ink-soft);white-space:pre-wrap">${esc(b.note)}</div>`:""}
      ${b.problem_note?`<div style="margin-top:5px;font-size:12.5px;color:var(--crit)">⚠ ${esc(b.problem_note)}</div>`:""}
      ${b.status==="Rədd edildi"?`<div style="margin-top:5px;font-size:12.5px;color:var(--muted)">✖ ${esc(b.approved_by_name||"CEO")} rədd etdi${b.reject_note?": "+esc(b.reject_note):""}</div>`:""}
      ${ad}
    </div>
    <div class="r" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${act}</div>
  </div>`;
}
function renderAdBriefs(){
  const wrap=el("div");const isT=role==="targeting";
  const all=state.ad_briefs.slice().reverse();
  const info=el("div","panel");info.style.marginBottom="16px";
  info.appendChild(el("div","ph",`<h3>Necə işləyir</h3><span class="count">${isT?"Reklamın adına brif kodunu yaz":"Kod reklam adında olmalıdır"}</span>`));
  info.appendChild(el("div","pb",`<div class="hint" style="white-space:normal;padding:4px 2px;line-height:1.7">1. Account / CEO / PM materialın linkini məkan adı ilə göndərir — brif <b>MZ-kod</b> alır.<br>2. Targetoloq «Götürdüm» basır, reklamın <b>adına</b> kodu yazır: <span class="num">MZ-104 | Məkan | Məqsəd</span> («📋 Reklam adı» kopyalayır).<br><b>Targetoloq özü</b> post tapanda «+ Post təklif et» ilə göndərir → CEO təsdiqləyəndə kod aktivləşir və proses eyni davam edir.<br>3. Panel hər saat Meta-nı yoxlayır — kod tapılan kimi brif <b>Reklamda</b> olur, xərc və nəticələr görünür. 24 saatda tapılmasa xəbərdarlıq gəlir.</div>`));
  wrap.appendChild(info);
  const live=all.filter(b=>b.status==="Reklamda");
  const spendByCur={};live.forEach(b=>{const c=b.ad_currency||"";spendByCur[c]=(spendByCur[c]||0)+Number(b.ad_spend||0);});
  const lagH=all.filter(b=>b.live_at).map(b=>(Date.parse(b.live_at)-Date.parse(b.created_at))/36e5).filter(h=>isFinite(h)&&h>=0);
  const avgLag=lagH.length?lagH.reduce((a,b)=>a+b,0)/lagH.length:null;
  wrap.appendChild(el("div","tiles",
    tile("Gözləyən",all.filter(abOpen).length,all.filter(b=>abOpen(b)&&(Date.now()-Date.parse(b.created_at))>24*36e5).length+" gecikən",true)
    +tile("Reklamda",live.length,Object.entries(spendByCur).map(([c,v])=>adMoney(v,c)).join(" · ")||"xərc —")
    +tile("Orta başlama vaxtı",avgLag==null?"—":(avgLag<48?Math.round(avgLag)+" saat":Math.round(avgLag/24)+" gün"),"linkdən reklama qədər")
    +tile("Problemli",all.filter(b=>b.status==="Problem"||AB_BAD.has(b.ad_status)).length,"rədd / problem")
    +tile("Targetoloq təklifləri",all.filter(b=>b.status==="Təklif").length,`gözləyir · ${all.filter(b=>b.proposed&&!abProp(b)).length} təsdiq · ${all.filter(b=>b.status==="Rədd edildi").length} rədd`,all.some(b=>b.status==="Təklif"))));
  const groups={prop:["Təkliflər",b=>b.status==="Təklif"],open:["Gözləyir",abOpen],live:["Reklamda",b=>b.status==="Reklamda"],prob:["Problem",b=>b.status==="Problem"||AB_BAD.has(b.ad_status)],done:["Bitdi",b=>b.status==="Bitdi"],rej:["Rədd edilən",b=>b.status==="Rədd edildi"],mine:["Targetoloq təklifləri",b=>!!b.proposed],all:["Hamısı",()=>true]};
  const bar=el("div","panel");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;margin:16px 0";
  const seg=el("div","seg");seg.style.margin="0";
  Object.entries(groups).forEach(([k,[lbl,fn]])=>{const n=all.filter(fn).length;const b=el("button",abFilter===k?"on":"",lbl+(n?" · "+n:""));b.onclick=()=>{abFilter=k;render();};seg.appendChild(b);});
  {const n=state.ad_issues.filter(x=>x.status!=="Həll olundu").length;const b=el("button",abFilter==="issues"?"on":"","Brifsiz problemlər"+(n?" · "+n:""));b.onclick=()=>{abFilter="issues";render();};seg.appendChild(b);}
  bar.appendChild(seg);
  const names=[...new Set([...all.map(b=>b.client),...state.ad_issues.map(x=>x.client)])].sort();
  if(abClient&&!names.includes(abClient))abClient="";
  const sp=el("div");sp.style.marginLeft="auto";bar.appendChild(sp);
  if(names.length>1){const vs=el("select");vs.style.cssText="font-size:12.5px;padding:6px 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink);max-width:180px";
    vs.innerHTML=`<option value="">Bütün məkanlar</option>`+names.map(n=>`<option${n===abClient?" selected":""}>${esc(n)}</option>`).join("");vs.onchange=()=>{abClient=vs.value;render();};bar.appendChild(vs);}
  const sy=el("button","mini",ICON.arrow+" Meta-da yoxla");sy.title="Reklam adlarında MZ-kodları indi axtar";sy.onclick=()=>abSync(sy);bar.appendChild(sy);
  wrap.appendChild(bar);
  if(abFilter==="issues"){wrap.appendChild(adIssuesPanel());return wrap;}
  const list=all.filter(groups[abFilter][1]).filter(b=>!abClient||b.client===abClient);
  const p=el("div","panel");
  p.appendChild(el("div","ph",`<h3>Targeting brifləri — ${esc(groups[abFilter][0])}</h3><span class="count">${list.length}</span>`));
  const pb=el("div","pb");
  pb.innerHTML=list.map(abCard).join("")||`<div class="empty">${abFilter==="open"?"Gözləyən brif yoxdur ✓":abFilter==="prop"?"Təsdiq gözləyən təklif yoxdur ✓":"Brif yoxdur"}</div>`;
  p.appendChild(pb);wrap.appendChild(p);
  const find=id=>state.ad_briefs.find(x=>String(x.id)===String(id));
  pb.querySelectorAll("[data-abcode]").forEach(c=>c.onclick=()=>abCopy(c.dataset.abcode));
  pb.querySelectorAll("[data-abcopy]").forEach(x=>x.onclick=()=>abCopy(abAdName(find(x.dataset.abcopy))));
  pb.querySelectorAll("[data-abtake]").forEach(x=>x.onclick=async()=>{const b=find(x.dataset.abtake);
    await upd('ad_briefs',b.id,{status:"Götürüldü",taken_by:me.id,taken_by_name:myName(),taken_at:new Date().toISOString()});
    abNotify([b.created_by],`🎯 Targetoloq götürdü — ${b.code} · ${b.client}`,`${myName()} «${b.client}» brifini götürdü.\n\n${abDetails(b)}`);});
  pb.querySelectorAll("[data-abmanual]").forEach(x=>x.onclick=async()=>{const b=find(x.dataset.abmanual);
    const v=prompt("Reklamın Ad ID-si (Ads Manager → reklam → ID, yalnız rəqəmlər):","");if(v===null)return;const id=v.replace(/[^0-9]/g,"");
    if(!id){alert("Ad ID rəqəmlərdən ibarət olmalıdır.");return;}
    const wasProb=b.status==="Problem";
    await upd('ad_briefs',b.id,{status:"Reklamda",ad_id:id,live_at:new Date().toISOString(),problem_note:"",taken_by:b.taken_by||me.id,taken_by_name:b.taken_by_name||myName()});
    abNotify([b.created_by,...roleIds(["ceo"])],`✅ Reklama qoyuldu — ${b.code} · ${b.client}`,`${myName()} reklamı Ad ID ${id} ilə qeyd etdi.${wasProb?"\nƏvvəlki problem həll olunub.":""}\n\n${abDetails(b)}`);});
  pb.querySelectorAll("[data-abfixed]").forEach(x=>x.onclick=async()=>{const b=find(x.dataset.abfixed);
    if(!confirm(`${b.code} · ${b.client}\nProblem həll olundu? Brif «Götürüldü»-yə qayıdacaq — reklamın adına kodu yazanda panel onu avtomatik «Reklamda» edəcək.`))return;
    await upd('ad_briefs',b.id,{status:"Götürüldü",problem_note:"",alerted_late:false,taken_by:b.taken_by||me.id,taken_by_name:b.taken_by_name||myName(),taken_at:b.taken_at||new Date().toISOString()});
    abNotify([b.created_by,...roleIds(["ceo"])],`🛠 Problem həll olundu — ${b.code} · ${b.client}`,`${myName()}: «${b.problem_note||"problem"}» həll olundu, reklam qoyulur.\n\n${abDetails(b)}`);});
  pb.querySelectorAll("[data-abprob]").forEach(x=>x.onclick=async()=>{const b=find(x.dataset.abprob);
    const v=prompt("Problem nədir? (məs. link açılmır, format uyğun deyil)","");if(v===null||!v.trim())return;
    await upd('ad_briefs',b.id,{status:"Problem",problem_note:v.trim(),taken_by:b.taken_by||me.id,taken_by_name:b.taken_by_name||myName(),taken_at:b.taken_at||new Date().toISOString()});
    abNotify([b.created_by],`⚠ Brifdə problem — ${b.code} · ${b.client}`,`Problem: ${v.trim()}\n\n${abDetails(b)}`);});
  pb.querySelectorAll("[data-abdone]").forEach(x=>x.onclick=async()=>{const b=find(x.dataset.abdone);await upd('ad_briefs',b.id,{status:"Bitdi"});});
  pb.querySelectorAll("[data-abresend]").forEach(x=>x.onclick=async()=>{const b=find(x.dataset.abresend);
    const v=prompt("Yeni link (boş burax — köhnə link qalsın):",b.link);if(v===null)return;const link=v.trim()||b.link;
    if(!/^https?:\/\//i.test(link)){alert("Link https:// ilə başlamalıdır.");return;}
    await upd('ad_briefs',b.id,{status:b.taken_by?"Götürüldü":"Göndərildi",link,problem_note:"",alerted_late:false,created_at:new Date().toISOString()});
    abNotify(b.taken_by?[b.taken_by]:abTgIds(b.client),`🔁 Brif yenidən göndərildi — ${b.code} · ${b.client}`,`Problem düzəldildi.\n\n${abDetails({...b,link})}`,b.taken_by?null:"abtake:"+b.id);});
  pb.querySelectorAll("[data-abok]").forEach(x=>x.onclick=()=>abApprove(find(x.dataset.abok)));
  pb.querySelectorAll("[data-abno]").forEach(x=>x.onclick=()=>abReject(find(x.dataset.abno)));
  pb.querySelectorAll("[data-abdel]").forEach(x=>x.onclick=()=>{const b=find(x.dataset.abdel);confirmDel('ad_briefs',b.id,"«"+b.code+" — "+b.client+"» brifi");});
  return wrap;
}
/* Brifsiz problemlər: targetoloq məkanı seçib brifə aid olmayan problemi qeyd edir */
function adIssuesPanel(){
  const solved=x=>x.status==="Həll olundu";
  const L=state.ad_issues.filter(x=>!abClient||x.client===abClient).slice().sort((a,b)=>(solved(a)-solved(b))||String(b.created_at).localeCompare(String(a.created_at)));
  const p=el("div","panel");const ph=el("div","ph",`<h3>Brifsiz problemlər</h3><span class="count">${L.filter(x=>!solved(x)).length} açıq</span>`);
  p.appendChild(ph);
  const pb=el("div","pb");
  if(!L.length)pb.appendChild(el("div","empty","Qeyd olunmuş problem yoxdur"));
  L.forEach(x=>{const row=el("div","row");row.style.alignItems="flex-start";if(solved(x))row.style.opacity=".6";
    const canSolve=!solved(x)&&["targeting","ceo","pm"].includes(role),canDel=role==="ceo"||(me&&x.created_by===me.id);
    row.innerHTML=`<div class="main" style="min-width:0"><div class="t">${esc(x.client)} <span class="chip c-${solved(x)?"good":"crit"}" style="font-size:10.5px">${esc(x.status)}</span></div><div class="m" style="white-space:pre-wrap">${esc(x.note)}</div><div class="hint" style="font-size:10px;margin-top:2px">${esc(x.created_by_name||"")} · ${esc(fmtWhen(x.created_at))}${solved(x)?` · həll etdi: ${esc(x.resolved_by_name||"")}`:""}</div></div><div class="r" style="display:flex;gap:6px">${canSolve?`<button class="mini" data-isok="${x.id}">${ICON.check} Həll olundu</button>`:""}${canDel?`<button class="mini" data-isdel="${x.id}" title="Sil" style="color:var(--crit)">${ICON.trash}</button>`:""}</div>`;
    pb.appendChild(row);});
  const find=id=>state.ad_issues.find(x=>String(x.id)===String(id));
  pb.querySelectorAll("[data-isok]").forEach(b=>b.onclick=async()=>{const x=find(b.dataset.isok);await upd('ad_issues',x.id,{status:"Həll olundu",resolved_by_name:myName(),resolved_at:new Date().toISOString()});abNotify([x.created_by,...roleIds(["ceo"])],`🛠 Problem həll olundu — ${x.client}`,`${myName()}: «${x.note}»`);});
  pb.querySelectorAll("[data-isdel]").forEach(b=>b.onclick=()=>{const x=find(b.dataset.isdel);confirmDel('ad_issues',x.id,"«"+x.client+"» problemi");});
  p.appendChild(pb);return p;
}
function openAdIssue(){
  const clients=state.clients.map(c=>c.name).filter(Boolean).sort((a,b)=>a.localeCompare(b,"az"));
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:480px"><div class="mh"><h3>Problem qeyd et</h3><button>×</button></div>
    <div class="mb"><div class="field"><label>Məkan</label><select id="isc"><option value="">— seç —</option>${clients.map(n=>`<option>${esc(n)}</option>`).join("")}</select></div>
    <div class="field"><label>Problem nədir?</label><textarea id="isn" rows="4" placeholder="məs. reklam hesabı bloklanıb, ödəniş keçmir, səhifəyə giriş yoxdur"></textarea></div></div>
    <div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" data-ok>Qeyd et</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  scrim.querySelector("[data-ok]").onclick=async ev=>{
    const client=scrim.querySelector("#isc").value,note=scrim.querySelector("#isn").value.trim();
    if(!client){alert("Məkanı seç.");return;}if(!note){alert("Problemi yaz.");return;}
    ev.target.disabled=true;
    const {error}=await sb.from('ad_issues').insert({client,note,status:"Açıq",created_by:me.id,created_by_name:myName()});
    if(error){ev.target.disabled=false;alert("Xəta: "+error.message);return;}
    close();abFilter="issues";await reload('ad_issues');
    const c=state.clients.find(x=>x.name===client);const accs=state.smm_venues.filter(v=>v.client===client).map(v=>v.account_id);
    abNotify([...roleIds(["ceo"]),c&&c.pm_id,...accs],`⚠ Reklam problemi — ${client}`,`${myName()}: ${note}`);};
}
async function abApprove(b){
  if(!b||b.status!=="Təklif")return;
  if(!confirm(`«${b.client}» üçün targetoloq təklifini təsdiqləyirsən?\nKod: ${b.code} — targetoloq bu kodla reklamı qoşacaq.`))return;
  const now=new Date().toISOString();
  const {data,error}=await sb.from('ad_briefs').update({status:"Götürüldü",approved_by:me.id,approved_by_name:myName(),approved_at:now,taken_by:b.created_by,taken_by_name:b.created_by_name,taken_at:now,created_at:now,alerted_late:false}).eq('id',b.id).eq('status',"Təklif").select();
  if(error){alert("Xəta: "+error.message);return;}
  if(!data||!data.length){alert("Bu təklif artıq dəyişib.");await reload('ad_briefs');return;}
  await reload('ad_briefs');
  abNotify([b.created_by],`✅ Təklifin təsdiqləndi — ${b.code} · ${b.client}`,`${myName()} təsdiqlədi. Reklamı qoş, adına bunu yaz:\n${abAdName(b)}\n\n${abDetails(b)}`);
}
async function abReject(b){
  if(!b||b.status!=="Təklif")return;
  const v=prompt(`«${b.client}» təklifini rədd et — səbəb (istəyə bağlı):`,"");if(v===null)return;
  const {data,error}=await sb.from('ad_briefs').update({status:"Rədd edildi",reject_note:v.trim(),approved_by:me.id,approved_by_name:myName(),approved_at:new Date().toISOString()}).eq('id',b.id).eq('status',"Təklif").select();
  if(error){alert("Xəta: "+error.message);return;}
  if(!data||!data.length){alert("Bu təklif artıq dəyişib.");}
  await reload('ad_briefs');
  if(data&&data.length)abNotify([b.created_by],`✖ Təklifin rədd edildi — ${b.client}`,`${myName()} rədd etdi${v.trim()?": "+v.trim():"."}\n\nMəkan: ${b.client}\nPost: ${b.link}`);
}
function openAdBrief(){
  const clients=state.clients.map(c=>c.name).filter(Boolean).sort((a,b)=>a.localeCompare(b,"az"));
  const scrim=el("div","scrim");
  const prop=role==="targeting";
  scrim.innerHTML=`<div class="modal" style="max-width:520px"><div class="mh"><h3>${prop?"Post təklif et":"Yeni targeting brifi"}</h3><button>×</button></div>
    ${prop?`<div class="hint" style="white-space:normal;padding:0 20px">Reklama qoymaq istədiyin postu göndər — CEO təsdiqləyəndə kod aktivləşəcək və reklamı qoşa biləcəksən.</div>`:""}
    <div class="mb">
      <div class="field"><label>Məkan</label><select id="abc"><option value="">— seç —</option>${clients.map(n=>`<option>${esc(n)}</option>`).join("")}</select></div>
      <div class="field" id="abpickw" style="display:none"><label>Çəkiliş təhvilindən seç</label><select id="abpick"></select></div>
      <div class="field"><label>${prop?"Post linki":"Material linki"}</label><input id="abl" placeholder="${prop?"https://www.instagram.com/p/…":"https://drive.google.com/…"}"></div>
      <div class="field"><label>Məqsəd</label><select id="abg">${AB_GOALS.map(g=>`<option>${esc(g)}</option>`).join("")}</select></div>
      <div class="field"><label>Büdcə / müddət</label><input id="abb" placeholder="məs. 10 AZN/gün, 5 gün"></div>
      <div class="field"><label>${prop?"Niyə bu post? (auditoriya, plan)":"Qeyd (auditoriya, mətn, xüsusi istək)"}</label><textarea id="abn" placeholder="İstəyə bağlı"></textarea></div>
    </div>
    <div class="mf"><button class="btn ghost" data-x>Ləğv</button><button class="btn" data-ok>${prop?"CEO-ya təsdiqə göndər":"Targetoloqa göndər"}</button></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector(".mh button").onclick=close;scrim.querySelector("[data-x]").onclick=close;scrim.onclick=ev=>{if(ev.target===scrim)close();};
  const csel=scrim.querySelector("#abc"),pick=scrim.querySelector("#abpick"),pickw=scrim.querySelector("#abpickw"),lin=scrim.querySelector("#abl");
  csel.onchange=()=>{
    const opts=[];state.shoots.filter(s=>s.client===csel.value&&s.held==="yes").slice().reverse().forEach(s=>{
      getVids(s).forEach((v,i)=>{if(v.link)opts.push([v.link,`${s.shoot_date} · Video ${i+1}${v.stage>=4?" ✓":""}`]);});
      const ph=getPhotos(s);if(ph.link)opts.push([ph.link,`${s.shoot_date} · Foto qovluğu`]);});
    pickw.style.display=opts.length?"":"none";
    pick.innerHTML=`<option value="">— seç (və ya linki aşağıya yapışdır) —</option>`+opts.slice(0,40).map(o=>`<option value="${esc(o[0])}">${esc(o[1])}</option>`).join("");
  };
  pick.onchange=()=>{if(pick.value)lin.value=pick.value;};
  scrim.querySelector("[data-ok]").onclick=async ev=>{
    const client=csel.value,link=lin.value.trim();
    if(!client){alert("Məkanı seç.");return;}
    if(!/^https?:\/\//i.test(link)){alert("Düzgün link yapışdır (https:// ilə başlamalıdır).");return;}
    const btn=ev.currentTarget;btn.disabled=true;
    const row={client,link,goal:scrim.querySelector("#abg").value,budget:scrim.querySelector("#abb").value.trim(),note:scrim.querySelector("#abn").value.trim(),created_by_name:myName()};
    if(prop)Object.assign(row,{status:"Təklif",proposed:true,proposed_at:new Date().toISOString()});
    const {data,error}=await sb.from('ad_briefs').insert(row).select().single();
    if(error){btn.disabled=false;alert("Xəta: "+error.message);return;}
    close();await reload('ad_briefs');
    if(prop){
      abNotify(roleIds(AB_APPROVERS),`💡 Targetoloq post təklif edir — ${client}`,
        [`Məkan: ${client}`,`Məqsəd: ${row.goal}`,row.budget?`Büdcə / müddət: ${row.budget}`:"",`Post: ${link}`,row.note?`Niyə: ${row.note}`:"",`Təklif edən: ${myName()}`,"","Təsdiqləsən kod aktivləşəcək və targetoloq reklamı qoşacaq."].filter((x,i,arr)=>x!==""||i===arr.length-2).join("\n"),"abok:"+data.id);
      abFilter="prop";render();
      alert("Təklif CEO-ya göndərildi. Təsdiqlənəndə bildiriş gələcək.");return;
    }
    abNotify(abTgIds(client),`🎯 ${client} - yeni reklam brifi var (${data.code})`,
      [`Brif kodu: ${data.code}`,`Məkan: ${client}`,`Məqsəd: ${row.goal}`,row.budget?`Büdcə / müddət: ${row.budget}`:"",`Material: ${link}`,row.note?`Qeyd: ${row.note}`:"",`Göndərən: ${myName()}`,"",`Reklamın adına «${data.code}» yaz — panel reklamı bu kodla tapır. 24 saat ərzində qoşulmasa Account, PM və CEO-ya xəbərdarlıq gedəcək.`,"Telegram-dan götürmək üçün aşağıdakı «✋ Mən götürdüm» düyməsini bas."].filter((x,i,arr)=>x!==""||i===arr.length-3).join("\n"),"abtake:"+data.id);
    alert(`Brif göndərildi: ${data.code}\nTargetoloq reklamın adına bu kodu yazacaq.`);
  };
}
/* ---------- Reklam Analizi → Dərin analiz (ads-deep funksiyası) ---------- */
const DEEP_FUNC_URL=SB_URL+"/functions/v1/ads-deep";
const adsDeep={};
/* Dərin analizin öz filtrləri: təqvimlə tarix aralığı, status, sıralama */
const ymdLocal=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
let deepFrom="",deepTo="",deepStatus="all",deepSort="spend_desc";
function deepSetDays(n,offset){const t=new Date();t.setDate(t.getDate()-(offset||0));const f=new Date(t);f.setDate(t.getDate()-(n-1));deepFrom=ymdLocal(f);deepTo=ymdLocal(t);}
deepSetDays(7,1);
function deepRangeLabel(){const f=s=>s.split("-").reverse().slice(0,2).join(".");return deepFrom===deepTo?f(deepFrom):f(deepFrom)+" – "+f(deepTo);}
async function loadAdsDeep(c,from,to){
  const key=c.id+"|"+from+"|"+to;if(adsDeep[key])return;
  adsDeep[key]={loading:true};
  try{
    const r=await fetch(DEEP_FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY},body:JSON.stringify({act_id:c.ad_account_id,since:from,until:to})});
    adsDeep[key]=await r.json().catch(()=>({ok:false,error:"cavab yoxdur ("+r.status+")"}));
  }catch(e){adsDeep[key]={ok:false,error:e.message||String(e)};}
  if(view==="ads"&&adsTab==="deep")render();
}
const GENDER_AZ={male:"Kişi",female:"Qadın",unknown:"Naməlum"};
const PLACE_AZ={instagram_stories:"Stories",instagram_reels:"Reels",feed:"Feed",instagram_explore:"Explore",instagram_explore_grid_home:"Explore",facebook_reels:"Reels",facebook_stories:"Stories",status:"Status",marketplace:"Marketplace",video_feeds:"Video feed",search:"Axtarış",instream_video:"In-stream video",an_classic:"Audience Network",messenger_inbox:"Inbox",instagram_profile_feed:"Profil feed"};
const PLAT_AZ={instagram:"Instagram",facebook:"Facebook",whatsapp:"WhatsApp",messenger:"Messenger",audience_network:"Audience Network",threads:"Threads"};
const RANK_AZ={ABOVE_AVERAGE:["Ortadan yuxarı","c-good"],AVERAGE:["Orta","c-mut"],BELOW_AVERAGE_35:["Aşağı (35%)","c-warn"],BELOW_AVERAGE_20:["Aşağı (20%)","c-crit"],BELOW_AVERAGE_10:["Çox aşağı (10%)","c-crit"]};
const segLabel={
  age:k=>{const [a,g]=k.split("|");return `${/unknown/i.test(a)?"Naməlum yaş":a} · ${GENDER_AZ[g]||g}`;},
  placement:k=>{const [p,pos]=k.split("|");return `${PLAT_AZ[p]||p} ${PLACE_AZ[pos]||String(pos||"").replace(/_/g," ")}`;},
  region:k=>k,
  hour:k=>k+":00"
};
const pct=(a,b)=>b>0?a/b*100:0;
const cprOf=x=>x.results>0?x.spend/x.results:null;
/* Reklamın növünə görə əsas nəticə: mesaj reklamı → mesaj, profil ziyarəti / trafik → klik, digərləri → nəticə */
const AD_KIND={msg:["💬","Mesaj","mesaj"],profile:["👤","Profil ziyarəti","klik"],click:["🔗","Trafik","klik"],lead:["📝","Lead","lead"],other:["•","Digər","nəticə"]};
const adRes=a=>a.kind==="msg"?(+a.msgs||0):(a.kind==="profile"||a.kind==="click")?(+a.linkClicks||0):(+a.results||0);
const adUnit=a=>(AD_KIND[a.kind]||AD_KIND.other)[2];
const adCost=a=>adRes(a)>0?a.spend/adRes(a):null;
const adHook=a=>a.video&&a.impr>0?a.video.v3/a.impr*100:null;
/* Qarşılıqlı əlaqə: paylaşım / şərh / yadda saxlama — ədalətli müqayisə üçün 1000 göstərimə nisbət */
const ENG_K={shares:["↗","Paylaşım"],comments:["💬","Şərh"],saves:["🔖","Yadda saxlama"]};
const engOf=a=>(a&&a.eng)||{shares:0,comments:0,saves:0,reactions:0};
const engRate=(a,k)=>a.impr>=300?engOf(a)[k]/a.impr*1000:null;
function rankChips(rk){
  return [["quality","Keyfiyyət"],["engagement","Qarşılıq"],["conversion","Konversiya"]].map(([k,l])=>{const x=RANK_AZ[rk[k]];return x?`<span class="chip ${x[1]}" style="font-size:9.5px;padding:1px 6px" title="Meta reytinqi: ${l}">${l}: ${x[0]}</span>`:"";}).join(" ");
}
/* Bir ölçü — bir rəng: zolaq uzunluğu nəticə sayıdır, yanında xərc və nəticə qiyməti yazılır */
function deepBars(rows,kind,cur,limit){
  rows=rows.slice(0,limit||rows.length);
  const mx=Math.max(1,...rows.map(r=>r.results));
  const best=rows.filter(r=>r.results>=3).sort((a,b)=>cprOf(a)-cprOf(b))[0];
  return rows.map(r=>{const cpr=cprOf(r);const w=Math.max(r.results>0?2:0,r.results/mx*100);
    return `<div title="${esc(segLabel[kind](r.key))}: ${adNum(r.results)} nəticə · xərc ${adMoney(r.spend,cur)} · ${adNum(r.impr)} göstərim · CTR ${adNum(pct(r.clicks,r.impr))}%" style="display:grid;grid-template-columns:minmax(110px,170px) 1fr auto;gap:10px;align-items:center;padding:5px 0">
      <span style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(segLabel[kind](r.key))}${r===best?' <span class="chip c-good" style="font-size:9.5px;padding:0 5px">ən ucuz</span>':""}</span>
      <span style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden"><span style="display:block;height:100%;width:${w}%;background:var(--accent);border-radius:4px"></span></span>
      <span class="num" style="font-size:11.5px;color:var(--ink-soft);white-space:nowrap;text-align:right"><b style="color:var(--ink)">${adNum(r.results)}</b> nəticə · ${cpr!=null?adMoney(cpr,cur)+"/nəticə":"nəticə yox"} · ${adMoney(r.spend,cur)}</span>
    </div>`;}).join("")||`<div class="empty">Məlumat yoxdur</div>`;
}
function deepHours(rows,cur){
  const by={};rows.forEach(r=>by[r.key]=r);
  const hrs=Array.from({length:24},(_,i)=>by[String(i).padStart(2,"0")]||{key:String(i).padStart(2,"0"),spend:0,impr:0,clicks:0,results:0});
  const mx=Math.max(1,...hrs.map(h=>h.results));
  const top=new Set(hrs.slice().sort((a,b)=>b.results-a.results).slice(0,3).filter(h=>h.results>0).map(h=>h.key));
  return `<div style="display:flex;align-items:flex-end;gap:2px;height:120px;padding-top:6px">${hrs.map(h=>{const cpr=cprOf(h);
      return `<div title="${h.key}:00 — ${adNum(h.results)} nəticə · ${adMoney(h.spend,cur)}${cpr!=null?" · "+adMoney(cpr,cur)+"/nəticə":""}" style="flex:1;height:100%;display:flex;align-items:flex-end;cursor:default"><span style="display:block;width:100%;height:${Math.max(h.results>0?3:1,h.results/mx*100)}%;background:${top.has(h.key)?"var(--accent)":"color-mix(in srgb,var(--accent) 45%,var(--surface-2))"};border-radius:4px 4px 0 0"></span></div>`;}).join("")}</div>
    <div class="num" style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);margin-top:4px"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
    <div class="hint" style="margin-top:6px">Sütun = nəticə sayı (hesabın saat qurşağı ilə). Tünd sütunlar ən çox nəticə gətirən 3 saatdır.</div>`;
}
/* Hook rate dinamikası — hər kampaniya üçün ayrıca kiçik xətt qrafiki (hamısında eyni şkala), üzərinə gələndə günün rəqəmi */
const HK_MIN_IMPR=50;   // bundan az göstərimli gün səs-küydür — xətdə boşluq
function hookTrendsData(list){
  const camps=(list||[]).slice(0,12).map(c=>({id:c.id,name:c.name,impr:c.impr,v3:c.v3,pts:c.days.map(x=>({d:x.d,impr:x.impr,v3:x.v3,h:x.impr>=HK_MIN_IMPR?x.v3/x.impr*100:null}))}));
  const days=[...new Set(camps.flatMap(c=>c.pts.map(p=>p.d)))].sort();
  return {camps,days};
}
function deepHookTrends(list){
  const {camps,days}=hookTrendsData(list);
  if(!camps.length)return `<div class="empty">Bu dövrdə video reklamı olan kampaniya yoxdur</div>`;
  if(days.length<2)return `<div class="empty">Dinamikanı görmək üçün ən azı 2 günlük aralıq seç (məs. «Son 7 gün» və ya təqvimdən).</div>`;
  const vals=camps.flatMap(c=>c.pts.map(p=>p.h).filter(v=>v!=null));
  const ymax=Math.max(10,Math.ceil(Math.max(...vals,0)/10)*10);
  const W=300,H=120,L=30,R=10,T=10,B=20;
  const X=i=>L+(W-L-R)*(i/(days.length-1)),Y=v=>T+(H-T-B)*(1-v/ymax);
  const dm=d=>d.slice(8,10)+"."+d.slice(5,7);
  return `<div class="hkgrid">${camps.map((c,ci)=>{
    const byD={};c.pts.forEach(p=>byD[p.d]=p);
    let path="",pen=false;
    days.forEach((d,i)=>{const p=byD[d];if(p&&p.h!=null){path+=(pen?"L":"M")+X(i).toFixed(1)+" "+Y(p.h).toFixed(1)+" ";pen=true;}else pen=false;});
    const valid=c.pts.filter(p=>p.h!=null);const last=valid[valid.length-1];
    /* trend: dövrün ilk ~1/3 günləri vs son ~1/3 günləri (göstərimə görə çəkili) — tək günün sıçrayışı nəticəni pozmasın */
    const k=Math.max(1,Math.floor(valid.length/3));const wavg=a=>{const i=a.reduce((s,p)=>s+p.impr,0);return i?a.reduce((s,p)=>s+p.v3,0)/i*100:null;};
    const delta=valid.length>=2?wavg(valid.slice(-k))-wavg(valid.slice(0,k)):null;
    const dCls=delta==null||Math.abs(delta)<0.5?"flat":delta>0?"up":"down";
    const dTxt=delta==null?"":dCls==="flat"?"≈ sabit":(delta>0?"▲ +":"▼ ")+delta.toFixed(1)+" pp";
    const avg=c.impr?c.v3/c.impr*100:0;
    const grid=[0,ymax/2,ymax].map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" class="hkgl"/><text x="${L-5}" y="${Y(v)+3.5}" class="hkax" text-anchor="end">${v}%</text>`).join("");
    const avgLine=`<line x1="${L}" x2="${W-R}" y1="${Y(avg).toFixed(1)}" y2="${Y(avg).toFixed(1)}" class="hkavg"/>`;
    const xl=`<text x="${X(0)}" y="${H-5}" class="hkax" text-anchor="start">${dm(days[0])}</text><text x="${X(days.length-1)}" y="${H-5}" class="hkax" text-anchor="end">${dm(days[days.length-1])}</text>`;
    const lastDot=last?`<circle cx="${X(days.indexOf(last.d)).toFixed(1)}" cy="${Y(last.h).toFixed(1)}" r="3.5" class="hkdot"/>`:"";
    return `<div class="hkcard" data-hk="${ci}" data-cid="${esc(c.id)}" role="button" tabindex="0" title="Ətraflı bax — başladığı gündən">
      <div class="hkh"><div class="hkn" title="${esc(c.name)}">${esc(c.name)}</div>
        <div class="hkv"><span class="hkcap">son gün</span> <b class="num">${last?adNum(last.h)+"%":"—"}</b>${dTxt?` <span class="hkd ${dCls}" title="Son ${k} gün ilə ilk ${k} gün arasında fərq (faiz bəndi, göstərimə görə çəkili)">${dTxt}</span>`:""}</div></div>
      <svg viewBox="0 0 ${W} ${H}" class="hksvg" role="img" aria-label="${esc(c.name)} — gündəlik hook rate">${grid}${avgLine}<path d="${path}" class="hkline"/>${lastDot}
        <line class="hkguide" x1="0" x2="0" y1="${T}" y2="${H-B}" style="display:none"/><circle class="hkmark" r="4.5" style="display:none"/>
        <rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent" class="hkhit"/></svg>
      <div class="hkfoot"><span>orta ${adNum(avg)}% · ${c.impr>=1e6?adNum(c.impr/1e6)+"M":c.impr>=1e3?Math.round(c.impr/1e3)+"K":adNum(c.impr)} göstərim</span><span class="hkleg"><i class="hkavgkey"></i> orta · <b class="hkmore">Ətraflı →</b></span></div>
      <div class="hktip" style="display:none"></div></div>`;}).join("")}</div>
    <div class="hint" style="margin-top:8px">Hook rate = göstərimlərin neçə %-i videoya 3 saniyə baxıb. Hər kart bir kampaniyadır, hamısında şkala eynidir (0–${ymax}%). Böyük rəqəm — son günün hook rate-i. ▲/▼ — dövrün son günləri ilə ilk günləri arasındakı fərq (≈ — dəyişiklik 0.5 bənddən az). ${HK_MIN_IMPR}-dən az göstərimli günlər xətdə boşluq kimi qalır.</div>`;
}
function wireHookTrends(root,list,client){
  root.querySelectorAll("[data-cid]").forEach(card=>{const open=()=>openHookDetail(client,card.dataset.cid,(list.find(x=>String(x.id)===card.dataset.cid)||{}).name);
    card.addEventListener("click",open);card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});});
  const {camps,days}=hookTrendsData(list);if(days.length<2)return;
  const W=300,H=120,L=30,R=10,T=10,B=20;
  const vals=camps.flatMap(c=>c.pts.map(p=>p.h).filter(v=>v!=null));const ymax=Math.max(10,Math.ceil(Math.max(...vals,0)/10)*10);
  const X=i=>L+(W-L-R)*(i/(days.length-1)),Y=v=>T+(H-T-B)*(1-v/ymax);
  root.querySelectorAll("[data-hk]").forEach(card=>{
    const c=camps[+card.dataset.hk];const byD={};c.pts.forEach(p=>byD[p.d]=p);
    const svg=card.querySelector("svg"),hit=card.querySelector(".hkhit"),g=card.querySelector(".hkguide"),mk=card.querySelector(".hkmark"),tip=card.querySelector(".hktip");
    const hide=()=>{g.style.display="none";mk.style.display="none";tip.style.display="none";};
    hit.addEventListener("pointermove",ev=>{
      const r=svg.getBoundingClientRect();const vx=(ev.clientX-r.left)/r.width*W;
      const i=Math.max(0,Math.min(days.length-1,Math.round((vx-L)/(W-L-R)*(days.length-1))));
      const d=days[i],p=byD[d];const x=X(i);
      g.setAttribute("x1",x);g.setAttribute("x2",x);g.style.display="";
      if(p&&p.h!=null){mk.setAttribute("cx",x);mk.setAttribute("cy",Y(p.h));mk.style.display="";}else mk.style.display="none";
      tip.innerHTML=`<b>${d.slice(8,10)}.${d.slice(5,7)}.${d.slice(0,4)}</b><br>${p&&p.h!=null?`Hook: <b>${adNum(p.h)}%</b><br>${adNum(p.v3)} baxış / ${adNum(p.impr)} göstərim`:p?`Az göstərim (${adNum(p.impr)})`:"Göstərim yoxdur"}`;
      tip.style.display="";const cw=card.clientWidth;const px=x/W*r.width;
      tip.style.left=Math.min(Math.max(px-60,4),cw-128)+"px";
    });
    hit.addEventListener("pointerleave",hide);
  });
}
/* ---- Kampaniyanın ətraflı hook rate səhifəsi: yuxarıda ümumi kampaniya, altında hər reklamın öz qrafiki ----
   Hamısının tarix oxu eynidir və üst-üstə düzülür; üzərinə gələndə həmin gün bütün qrafiklərdə eyni anda göstərilir */
const hookDetailCache={};
function dayList(from,to){const out=[];const d=new Date(from+"T00:00:00Z"),e=new Date(to+"T00:00:00Z");for(let i=0;d<=e&&i<1200;i++){out.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1);}return out;}
const hkVal=p=>p&&p.impr>=HK_MIN_IMPR?p.v3/p.impr*100:null;
function hookStack(box,campDays,ads,mainLabel){
  if(!campDays.length){box.innerHTML=`<div class="empty">Bu aralıqda göstərim yoxdur</div>`;return;}
  const days=dayList(campDays[0].d,campDays[campDays.length-1].d),n=days.length;
  const cBy={};campDays.forEach(x=>cBy[x.d]=x);
  const rows=ads.map(a=>{const by={};a.days.forEach(x=>by[x.d]=x);return {a,by,vals:days.map(d=>hkVal(by[d]))};})
    .filter(r=>r.vals.some(v=>v!=null)).sort((x,y)=>String(x.a.first).localeCompare(String(y.a.first)));
  const cVals=days.map(d=>hkVal(cBy[d]));
  const all=[...cVals,...rows.flatMap(r=>r.vals)].filter(v=>v!=null);
  if(!all.length){box.innerHTML=`<div class="empty">Hook rate hesablamaq üçün kifayət qədər göstərim yoxdur</div>`;return;}
  const ymax=Math.max(10,Math.ceil(Math.max(...all)/10)*10);   // hamısında eyni şkala
  const W=720,L=40,R=14;const X=i=>L+(W-L-R)*(n===1?0.5:i/(n-1));
  const pathOf=(arr,Y)=>{let s="",pen=false;arr.forEach((v,i)=>{if(v!=null){s+=(pen?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)+" ";pen=true;}else pen=false;});return s;};
  const nt=Math.min(6,n);const ticks=[...new Set(Array.from({length:nt},(_,k)=>Math.round(k*(n-1)/Math.max(1,nt-1))))];
  const xl=(H)=>ticks.map((i,k)=>`<text x="${X(i)}" y="${H-6}" class="hkax" text-anchor="${k===0?"start":k===ticks.length-1?"end":"middle"}">${days[i].slice(8,10)}.${days[i].slice(5,7)}</text>`).join("");
  const svgOf=(vals,H,T,B,big,axis)=>{const Y=v=>T+(H-T-B)*(1-v/ymax);
    /* tək günlər (qonşusu boş) xətt əmələ gətirmir — nöqtə kimi */
    const dots=vals.map((v,i)=>v!=null&&vals[i-1]==null&&vals[i+1]==null?`<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="2.5" class="hkdot1"/>`:"").join("");
    const stp=big?(ymax<=60?10:20):ymax;const steps=Array.from({length:Math.floor(ymax/stp)+1},(_,k)=>k*stp);
    const grid=steps.map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" class="hkgl"/><text x="${L-6}" y="${Y(v)+3.5}" class="hkax" text-anchor="end">${v}%</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="hksvg" data-h="${H}" data-t="${T}" data-b="${B}">${grid}${axis?xl(H):""}<path d="${pathOf(vals,Y)}" class="hkline${big?" hkbig":""}"/>${dots}
      <line class="hkguide" x1="0" x2="0" y1="${T}" y2="${H-B}" style="display:none"/><circle class="hkmark" r="${big?5:4}" style="display:none"/>
      <rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent" class="hkhit"/></svg>`;};
  const fd=d=>d.slice(8,10)+"."+d.slice(5,7)+"."+d.slice(0,4);
  box.innerHTML=`<div class="hkrow hkmain" data-r="-1"><div class="hkrh"><b>${esc(mainLabel||"Ümumi kampaniya")}</b><span class="hkread"></span></div>${svgOf(cVals,230,12,24,true,true)}</div>
    ${rows.length?`<div class="hksub">Kampaniyadakı reklamlar — hər biri ayrıca (başlama tarixinə görə sıra ilə, şkala eynidir)</div>`:""}
    ${rows.map((r,ri)=>{const own=r.a.impr?r.a.v3/r.a.impr*100:null;
      return `<div class="hkrow" data-r="${ri}"><div class="hkrh">${r.a.thumb?`<img src="${esc(r.a.thumb)}" alt="">`:""}<div style="min-width:0;flex:1"><div class="hkrn" title="${esc(r.a.name)}">${esc(r.a.name)}</div>
        <div class="hkrm">başladı ${r.a.first?fd(r.a.first):"—"} · orta ${own!=null?adNum(own)+"%":"—"}${r.a.igLink?` · <a href="${esc(r.a.igLink)}" target="_blank" rel="noopener">↗ Instagram</a>`:""}</div></div><span class="hkread"></span></div>${ri===rows.length-1?svgOf(r.vals,84,6,20,false,true):svgOf(r.vals,66,6,4,false,false)}</div>`;}).join("")}`;
  /* sinxron hover: bir qrafikdə gün seçiləndə hamısında göstərilir */
  const rowEls=[...box.querySelectorAll(".hkrow")];
  const seriesOf=el=>{const ri=+el.dataset.r;return ri<0?{vals:cVals,by:cBy}:rows[ri];};
  const show=i=>{rowEls.forEach(el=>{const svg=el.querySelector("svg"),H=+svg.dataset.h,T=+svg.dataset.t,B=+svg.dataset.b;const Y=v=>T+(H-T-B)*(1-v/ymax);
      const sr=seriesOf(el),v=sr.vals[i],p=sr.by[days[i]];const g=el.querySelector(".hkguide"),mk=el.querySelector(".hkmark");
      g.setAttribute("x1",X(i));g.setAttribute("x2",X(i));g.style.display="";
      if(v!=null){mk.setAttribute("cx",X(i));mk.setAttribute("cy",Y(v));mk.style.display="";}else mk.style.display="none";
      el.querySelector(".hkread").innerHTML=`${fd(days[i])}: ${v!=null?`<b>${adNum(v)}%</b>`:p&&p.impr?`<span class="mut">az göstərim</span>`:`<span class="mut">göstərilmir</span>`}`;});};
  const hide=()=>rowEls.forEach(el=>{el.querySelector(".hkguide").style.display="none";el.querySelector(".hkmark").style.display="none";el.querySelector(".hkread").innerHTML="";});
  rowEls.forEach(el=>{const svg=el.querySelector("svg"),hit=el.querySelector(".hkhit");
    hit.addEventListener("pointermove",ev=>{const r=svg.getBoundingClientRect();const vx=(ev.clientX-r.left)/r.width*W;show(Math.max(0,Math.min(n-1,Math.round((vx-L)/(W-L-R)*(n-1)))));});
    hit.addEventListener("pointerleave",hide);});
}
function hookStats(days){
  const v=days.filter(x=>x.impr>=HK_MIN_IMPR).map(x=>({...x,h:x.v3/x.impr*100}));
  const im=days.reduce((s,x)=>s+x.impr,0),v3=days.reduce((s,x)=>s+x.v3,0);
  const k=Math.max(1,Math.floor(v.length/3));const w=a=>{const i=a.reduce((s,p)=>s+p.impr,0);return i?a.reduce((s,p)=>s+p.v3,0)/i*100:null;};
  return {avg:im?v3/im*100:null,impr:im,active:days.filter(x=>x.impr>0).length,best:v.slice().sort((a,b)=>b.h-a.h)[0],worst:v.slice().sort((a,b)=>a.h-b.h)[0],trend:v.length>=2?w(v.slice(-k))-w(v.slice(0,k)):null,k};
}
async function openHookDetail(client,cid,name){
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:860px;width:96vw;max-height:92vh;overflow:auto"><div class="mh"><div style="min-width:0"><h3 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">🎬 ${esc(name||"Kampaniya")}</h3><div class="hint">${esc(client.name)} · hook rate dinamikası</div></div><button data-x>×</button></div><div class="mb" id="hdb"><div class="empty">⏳ Meta-dan kampaniyanın başladığı gündən məlumat yüklənir…</div></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const key=client.id+"|"+cid;let d=hookDetailCache[key];
  if(!d){try{const r=await fetch(DEEP_FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY},body:JSON.stringify({act_id:client.ad_account_id,campaign_id:cid})});d=await r.json();}catch(e){d={ok:false,error:e.message||String(e)};}
    if(d&&d.ok)hookDetailCache[key]=d;}
  const body=scrim.querySelector("#hdb");if(!body)return;
  if(!d||!d.ok){body.innerHTML=`<div class="empty">Alınmadı: ${esc((d&&d.error)||"")}</div>`;return;}
  const startD=String(d.campaign.start||"").slice(0,10);let mode="all";
  const fd=x=>x?x.slice(8,10)+"."+x.slice(5,7)+"."+x.slice(0,4):"—";
  const draw=()=>{
    const inR=x=>mode==="all"||(x.d>=deepFrom&&x.d<=deepTo);
    const days=d.days.filter(inR);const ads=d.ads.map(a=>({...a,days:a.days.filter(inR)})).filter(a=>a.days.length);
    const st=hookStats(days);const tCls=st.trend==null||Math.abs(st.trend)<0.5?"flat":st.trend>0?"up":"down";
    body.innerHTML=`<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <div class="seg" style="margin:0"><button data-m="all" class="${mode==="all"?"on":""}">Başladığı gündən (${fd(startD)})</button><button data-m="rng" class="${mode==="rng"?"on":""}">Seçilmiş aralıq (${esc(deepRangeLabel())})</button></div>
        <span style="margin-left:auto">${adStatusChip(d.campaign.status)}</span></div>
      <div class="hkstats">
        <div><span>Orta hook</span><b class="num">${st.avg!=null?adNum(st.avg)+"%":"—"}</b></div>
        <div><span>Ən yaxşı gün</span><b class="num">${st.best?adNum(st.best.h)+"%":"—"}</b><em>${st.best?fd(st.best.d):""}</em></div>
        <div><span>Ən zəif gün</span><b class="num">${st.worst?adNum(st.worst.h)+"%":"—"}</b><em>${st.worst?fd(st.worst.d):""}</em></div>
        <div><span>Trend</span><b class="hkd ${tCls}" style="font-size:15px">${st.trend==null?"—":tCls==="flat"?"≈ sabit":(st.trend>0?"▲ +":"▼ ")+st.trend.toFixed(1)+" pp"}</b><em>son ${st.k} gün vs ilk ${st.k} gün</em></div>
      </div>
      <div class="hint" style="margin-bottom:8px;white-space:normal">Siçanı istənilən qrafikin üzərinə gətir — həmin gün bütün qrafiklərdə eyni anda göstərilir. Ümumi qrafikdə yüksəliş görəndə aşağıda həmin gün hansı reklamın qalxdığına bax.</div>
      <div id="hdc"></div>`;
    hookStack(body.querySelector("#hdc"),days,ads);
    body.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{mode=b.dataset.m;draw();});
  };
  draw();
}
/* Kreativlər cədvəlindən — tək reklamın öz hook rate qrafiki (başladığı gündən / seçilmiş aralıq) */
const adHookCache={};
async function openAdHook(client,ad){
  if(!ad)return;
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal" style="max-width:860px;width:96vw;max-height:92vh;overflow:auto"><div class="mh"><div style="display:flex;gap:10px;align-items:center;min-width:0">${ad.thumb?`<img src="${esc(ad.thumb)}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex:none">`:""}<div style="min-width:0"><h3 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📈 ${esc(ad.name||"Reklam")}</h3><div class="hint">${esc(client.name)} · ${esc(ad.campaign||"")} · reklamın hook rate-i</div></div></div><button data-x>×</button></div><div class="mb" id="ahb"><div class="empty">⏳ Meta-dan reklamın başladığı gündən məlumat yüklənir…</div></div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const key=client.id+"|"+ad.id;let d=adHookCache[key];
  if(!d){try{const r=await fetch(DEEP_FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY},body:JSON.stringify({act_id:client.ad_account_id,ad_id:ad.id})});d=await r.json();}catch(e){d={ok:false,error:e.message||String(e)};}
    if(d&&d.ok)adHookCache[key]=d;}
  const body=scrim.querySelector("#ahb");if(!body)return;
  if(!d||!d.ok){body.innerHTML=`<div class="empty">Alınmadı: ${esc((d&&d.error)||"")}</div>`;return;}
  const fd=x=>x?x.slice(8,10)+"."+x.slice(5,7)+"."+x.slice(0,4):"—";let mode="all";
  const draw=()=>{
    const days=d.days.filter(x=>mode==="all"||(x.d>=deepFrom&&x.d<=deepTo));
    const st=hookStats(days);const tCls=st.trend==null||Math.abs(st.trend)<0.5?"flat":st.trend>0?"up":"down";
    body.innerHTML=`<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <div class="seg" style="margin:0"><button data-m="all" class="${mode==="all"?"on":""}">Başladığı gündən (${fd(d.ad.first)})</button><button data-m="rng" class="${mode==="rng"?"on":""}">Seçilmiş aralıq (${esc(deepRangeLabel())})</button></div>
        <span style="margin-left:auto;display:flex;gap:8px;align-items:center">${d.ad.igLink?`<a href="${esc(d.ad.igLink)}" target="_blank" rel="noopener" style="font-size:12px;font-weight:600;color:var(--accent-ink);text-decoration:none">↗ Instagram</a>`:""}${adStatusChip(d.ad.status)}</span></div>
      <div class="hkstats">
        <div><span>Orta hook</span><b class="num">${st.avg!=null?adNum(st.avg)+"%":"—"}</b></div>
        <div><span>Ən yaxşı gün</span><b class="num">${st.best?adNum(st.best.h)+"%":"—"}</b><em>${st.best?fd(st.best.d):""}</em></div>
        <div><span>Ən zəif gün</span><b class="num">${st.worst?adNum(st.worst.h)+"%":"—"}</b><em>${st.worst?fd(st.worst.d):""}</em></div>
        <div><span>Trend</span><b class="hkd ${tCls}" style="font-size:15px">${st.trend==null?"—":tCls==="flat"?"≈ sabit":(st.trend>0?"▲ +":"▼ ")+st.trend.toFixed(1)+" pp"}</b><em>son ${st.k} gün vs ilk ${st.k} gün</em></div>
        <div><span>Göstərim olan gün</span><b class="num">${st.active}</b><em>${adNum(st.impr)} göstərim</em></div>
        ${(()=>{const t=k=>days.reduce((s,x)=>s+(+x[k]||0),0);const r=k=>st.impr?adNum(t(k)/st.impr*1000)+" / 1000 göstərim":"";
          return `<div><span>↗ Paylaşım</span><b class="num">${adNum(t("shares"))}</b><em>${r("shares")}</em></div><div><span>🔖 Yadda saxlama</span><b class="num">${adNum(t("saves"))}</b><em>${r("saves")}</em></div><div><span>💬 Şərh</span><b class="num">${adNum(t("comments"))}</b><em>${r("comments")}</em></div>`;})()}
      </div>
      <div id="ahc"></div>`;
    hookStack(body.querySelector("#ahc"),days,[],"Bu reklamın hook rate-i (gündəlik)");
    body.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{mode=b.dataset.m;draw();});
  };
  draw();
}
function deepRetention(ads){
  const vids=ads.filter(a=>a.video&&a.video.v3>=100).slice(0,6);
  if(!vids.length)return `<div class="empty">Kifayət qədər video baxışı yoxdur</div>`;
  return vids.map(a=>{const v=a.video;const steps=[["3 san",v.v3],["25%",v.p25],["50%",v.p50],["75%",v.p75],["100%",v.p100]];
    return `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:12.5px;font-weight:600;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.name)}</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${steps.map(([l,x])=>{const p=Math.min(100,pct(x,v.v3));
        return `<div title="${l}: ${adNum(x)} nəfər (${adNum(p)}% — 3 saniyə baxanlardan)"><div style="height:46px;background:var(--surface-2);border-radius:4px;display:flex;align-items:flex-end;overflow:hidden"><span style="display:block;width:100%;height:${p}%;background:var(--accent);border-radius:4px 4px 0 0"></span></div><div class="num" style="font-size:10.5px;color:var(--muted);margin-top:3px;text-align:center">${l} · <b style="color:var(--ink)">${Math.round(p)}%</b></div></div>`;}).join("")}</div>
    </div>`;}).join("")+`<div class="hint" style="margin-top:6px">Faiz — videoya 3 saniyə baxanların neçəsinin həmin nöqtəyə qədər izlədiyidir. Kəskin düşüş harada başlayırsa, video orada «itirir».</div>`;
}
function deepInsights(d,cur){
  const out=[];const ads=d.ads||[];
  const total=ads.reduce((s,a)=>s+a.spend,0);
  ["msg","profile","click","lead","other"].forEach(k=>{const withRes=ads.filter(a=>a.kind===k&&adRes(a)>=3).sort((a,b)=>adCost(a)-adCost(b));const u=(AD_KIND[k]||AD_KIND.other)[2];
    if(withRes.length){const b=withRes[0];out.push(["good",`Ən effektiv ${esc((AD_KIND[k]||AD_KIND.other)[1].toLowerCase())} reklamı: <b>${esc(b.name)}</b> — ${u} başına ${adMoney(adCost(b),cur)} (${adNum(adRes(b))} ${u}).`]);}
    if(withRes.length>1){const w=withRes[withRes.length-1];const r=adCost(w)/adCost(withRes[0]);if(r>=1.5)out.push(["warn",`<b>${esc(w.name)}</b> ${u}u ${adNum(r)} dəfə baha gətirir (${adMoney(adCost(w),cur)}/${u}). Büdcəni ən yaxşı kreativə keçirmək olar.`]);}});
  ads.filter(a=>adRes(a)===0&&total>0&&a.spend>=total*0.15).forEach(a=>out.push(["crit",`<b>${esc(a.name)}</b> ${adMoney(a.spend,cur)} xərcləyib (büdcənin ${Math.round(pct(a.spend,total))}%-i), amma ${adUnit(a)} yoxdur.`]));
  ads.filter(a=>a.freq>=3).forEach(a=>out.push(["warn",`<b>${esc(a.name)}</b> — tezlik ${adNum(a.freq)}: eyni insanlar reklamı 3 dəfədən çox görür, kreativi yeniləmək vaxtıdır.`]));
  const vids=ads.filter(a=>a.video&&a.impr>=1000).map(a=>({a,h:pct(a.video.v3,a.impr)})).sort((x,y)=>y.h-x.h);
  if(vids.length>1&&vids[0].h>vids[vids.length-1].h*1.4)out.push(["mut",`Hook (ilk 3 saniyə): ən güclü <b>${esc(vids[0].a.name)}</b> — ${adNum(vids[0].h)}%, ən zəif <b>${esc(vids[vids.length-1].a.name)}</b> — ${adNum(vids[vids.length-1].h)}%. Zəif videonun girişini dəyişmək lazımdır.`]);
  const seg=(rows,kind,label)=>{const r=(rows||[]).filter(x=>x.results>=3).sort((a,b)=>cprOf(a)-cprOf(b));
    if(r.length>1){const c=r[0],e=r[r.length-1];if(cprOf(e)>=cprOf(c)*1.5)out.push(["mut",`${label}: ən ucuz <b>${esc(segLabel[kind](c.key))}</b> (${adMoney(cprOf(c),cur)}/nəticə), ən baha <b>${esc(segLabel[kind](e.key))}</b> (${adMoney(cprOf(e),cur)}).`]);}
    const st=(rows||[]).reduce((s,x)=>s+x.spend,0);
    (rows||[]).filter(x=>st>0&&x.spend>=st*0.2&&x.results<=1).forEach(x=>out.push(["warn",`${label}: <b>${esc(segLabel[kind](x.key))}</b> xərcin ${Math.round(pct(x.spend,st))}%-ni alır, amma cəmi ${adNum(x.results)} nəticə verir.`]));};
  seg(d.age,"age","Auditoriya");seg(d.placement,"placement","Yerləşmə");
  [["shares","ən çox paylaşılan"],["saves","ən çox yadda saxlanılan"]].forEach(([k,lbl])=>{const r=ads.filter(a=>a.impr>=1000).map(a=>({a,v:engRate(a,k)})).filter(x=>x.v>0).sort((x,y)=>y.v-x.v);
    if(r.length>1&&r[0].v>=r[r.length-1].v*2)out.push(["good",`Kreativ ${lbl}: <b>${esc(r[0].a.name)}</b> — ${adNum(engOf(r[0].a)[k])} (${adNum(r[0].v)} / 1000 göstərim), ən zəifindən ${adNum(r[0].v/Math.max(r[r.length-1].v,0.01))} dəfə çox.`]);});
  const hrs=(d.hour||[]).filter(h=>h.results>0).sort((a,b)=>b.results-a.results).slice(0,3).map(h=>h.key+":00");
  if(hrs.length)out.push(["mut",`Ən çox nəticə gələn saatlar: <b>${hrs.join(", ")}</b>.`]);
  const lowQ=[...new Set(ads.filter(a=>/^BELOW_AVERAGE/.test(a.rank.quality)).map(a=>a.name))];
  if(lowQ.length)out.push(["crit",`${lowQ.length} kreativdə Meta keyfiyyət reytinqi ortadan aşağıdır — bu, reklamı bahalaşdırır: <b>${lowQ.slice(0,5).map(esc).join(", ")}</b>${lowQ.length>5?" və s.":""}.`]);
  const ic={good:"✓",warn:"⚠",crit:"⛔",mut:"•"};
  return out.length?out.map(([c,t])=>`<div style="display:flex;gap:9px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;line-height:1.5"><span class="chip c-${c}" style="font-size:10.5px;padding:1px 7px;flex:none;height:fit-content">${ic[c]}</span><span>${t}</span></div>`).join(""):`<div class="empty">Bu dövr üçün xüsusi qeyd yoxdur</div>`;
}
/* Aktiv reklamların linkləri — müştəriyə göndərmək üçün bir kliklə kopyala. Yalnız Instagram post linkləri (Facebook önizləmə linki yox).
   Xərcə yox, STATUSA görə: aktiv + yeni qoşulub yoxlamada/hazırlanan reklamlar (xərci hələ 0 olsa da); vaxtı bitmiş (Tamamlanıb) daxil deyil */
const adLink=a=>a.igLink||a.preview||"";
const LIVE_ST=["ACTIVE","IN_PROCESS","PENDING_REVIEW","PREAPPROVED"];
const isLiveAd=a=>LIVE_ST.includes(a.status);
function activeAdLinks(ads){
  const map=new Map();
  ads.filter(a=>isLiveAd(a)&&a.igLink).forEach(a=>{const l=a.igLink;const e=map.get(l);if(e){if(!e.names.includes(a.name))e.names.push(a.name);}else map.set(l,{link:l,names:[a.name||"Reklam"]});});
  return [...map.values()];
}
async function copyText(t){
  try{await navigator.clipboard.writeText(t);return true;}catch(e){}
  try{const ta=document.createElement("textarea");ta.value=t;ta.style.cssText="position:fixed;opacity:0";document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();return ok;}catch(e){return false;}
}
async function copyActiveAdLinks(venue,ads,btn){
  const L=activeAdLinks(ads);if(!L.length){alert(ads.some(isLiveAd)?"Aktiv reklamların Instagram post linki yoxdur (reklam Instagram postundan qurulmayıb).":"Bu məkanda hazırda aktiv reklam yoxdur.");return;}
  const d=new Date();const dt=String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0")+"."+d.getFullYear();
  const txt=`${venue} - Aktiv reklamlar (${dt})\n`+L.map((x,i)=>`${i+1}. ${x.link}`).join("\n");   // başlıq + nömrələnmiş linklər (reklam/kampaniya adı yox)
  const ok=await copyText(txt);
  if(btn){const old=btn.innerHTML;btn.innerHTML=ok?`✓ Kopyalandı — ${L.length} link`:"Kopyalanmadı";btn.disabled=true;setTimeout(()=>{btn.innerHTML=old;btn.disabled=false;},2200);}
  if(!ok)prompt("Linkləri buradan kopyala:",txt);
}
function deepDateBar(){
  const today=ymdLocal(new Date());const y=new Date();y.setDate(y.getDate()-1);const yest=ymdLocal(y);
  /* «Son N gün» — Meta-dakı kimi bu gün daxil deyil, dünənə qədər hesablanır */
  const quick=[["Bu gün",1,0],["Dünən",1,1],["Son 3 gün",3,1],["Son 7 gün",7,1],["Son 14 gün",14,1],["Son 30 gün",30,1]];
  const isOn=(n,o)=>{const t=new Date();t.setDate(t.getDate()-o);const f=new Date(t);f.setDate(t.getDate()-(n-1));return deepFrom===ymdLocal(f)&&deepTo===ymdLocal(t);};
  const bar=el("div","panel");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;margin-bottom:16px";
  const seg=el("div","seg");seg.style.cssText="margin:0;flex-wrap:wrap";
  quick.forEach(([l,n,o])=>{const b=el("button",isOn(n,o)?"on":"",l);b.onclick=()=>{deepSetDays(n,o);render();};seg.appendChild(b);});
  bar.appendChild(seg);
  const rng=el("div");rng.style.cssText="display:flex;align-items:center;gap:6px;margin-left:auto;font-size:12.5px;color:var(--muted)";
  rng.innerHTML=`<span>📅</span><input type="date" id="dfrom" value="${deepFrom}" max="${today}" class="dateinp"><span>—</span><input type="date" id="dto" value="${deepTo}" max="${today}" class="dateinp">`;
  const apply=()=>{const f=rng.querySelector("#dfrom").value,t=rng.querySelector("#dto").value;if(!f||!t)return;if(f>t){alert("Başlanğıc tarixi bitmə tarixindən sonra ola bilməz.");return;}deepFrom=f;deepTo=t;render();};
  rng.querySelector("#dfrom").onchange=apply;rng.querySelector("#dto").onchange=apply;
  bar.appendChild(rng);return bar;
}
function renderAdsDeep(all){
  const wrap=el("div");
  const c=all.find(x=>String(x.id)===String(adsClient))||all[0];
  wrap.appendChild(deepDateBar());
  if(!adsClient)wrap.appendChild(el("div","hint",`<div style="margin:-6px 0 12px">Dərin analiz bir məkan üzrə aparılır — yuxarıdan məkanı seç. İndi göstərilən: <b>${esc(c.name)}</b>.</div>`));
  const dkey=c.id+"|"+deepFrom+"|"+deepTo;const d=adsDeep[dkey];
  if(!d||d.loading){if(!d)loadAdsDeep(c,deepFrom,deepTo);wrap.appendChild(el("div","panel",`<div class="empty">⏳ ${esc(c.name)} — ${esc(deepRangeLabel())} üçün Meta-dan dərin analiz yüklənir…</div>`));return wrap;}
  if(!d.ok){const p=el("div","panel",`<div class="empty">Alınmadı: ${esc(d.error||"")}</div>`);const b=el("button","mini","Yenidən cəhd et");b.style.margin="0 auto 14px";b.style.display="block";b.onclick=()=>{delete adsDeep[dkey];render();};p.appendChild(b);wrap.appendChild(p);return wrap;}
  const cur=(d.account&&d.account.currency)||"";const ads=d.ads||[];
  {const nL=activeAdLinks(ads).length;const lb=el("div","panel");lb.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;margin-bottom:16px";
   const nA=ads.filter(isLiveAd).length;
   lb.innerHTML=`<div style="font-size:13px"><b>${esc(c.name)}</b> — <span style="color:var(--muted)">${nA} aktiv reklam${nL?" · "+nL+" Instagram post linki":nA?" · Instagram post linki yoxdur":""}</span></div>`;
   const cb=el("button","btn",`🔗 Aktiv reklamların Instagram linklərini kopyala`);cb.style.cssText="margin-left:auto;padding:8px 14px";if(!nL){cb.disabled=true;cb.title="Aktiv reklam yoxdur";}
   cb.onclick=()=>copyActiveAdLinks(c.name,ads,cb);lb.appendChild(cb);wrap.appendChild(lb);}
  const T=ads.reduce((s,a)=>({spend:s.spend+a.spend,impr:s.impr+a.impr,clicks:s.clicks+a.clicks,results:s.results+a.results,reach:s.reach+a.reach}),{spend:0,impr:0,clicks:0,results:0,reach:0});
  const vids=ads.filter(a=>a.video);const v3=vids.reduce((s,a)=>s+a.video.v3,0),vImpr=vids.reduce((s,a)=>s+a.impr,0),thru=vids.reduce((s,a)=>s+a.video.thruplay,0);
  wrap.appendChild(el("div","tiles",
    tile("Xərc",adMoney(T.spend,cur),ads.length+" reklam · "+deepRangeLabel(),true)
    +(()=>{const sum=(k,f)=>ads.filter(a=>a.kind===k).reduce((s,a)=>s+f(a),0);
        const mS=sum("msg",a=>a.spend),mN=sum("msg",a=>+a.msgs||0),pS=sum("profile",a=>a.spend)+sum("click",a=>a.spend),pN=sum("profile",a=>+a.linkClicks||0)+sum("click",a=>+a.linkClicks||0);
        let h="";if(mS>0||mN>0)h+=tile("💬 Mesaj",adNum(mN),mN?"mesaj başına "+adMoney(mS/mN,cur):"mesaj yox");
        if(pS>0||pN>0)h+=tile("👤 Profil ziyarəti",adNum(pN)+" klik",pN?"klik başına "+adMoney(pS/pN,cur):"klik yox");
        return h||tile("Nəticə",adNum(T.results),T.results?"nəticə başına "+adMoney(T.spend/T.results,cur):"nəticə yox");})()
    +tile("Hook rate",vImpr?adNum(pct(v3,vImpr))+"%":"—","göstərimdən 3 san baxış")
    +(()=>{const E=ads.reduce((s,a)=>{const e=engOf(a);return {shares:s.shares+e.shares,comments:s.comments+e.comments,saves:s.saves+e.saves};},{shares:0,comments:0,saves:0});
        const per=k=>T.impr?adNum(E[k]/T.impr*1000)+" / 1000 göstərim":"";
        return tile("↗ Paylaşım",adNum(E.shares),per("shares"))+tile("🔖 Yadda saxlama",adNum(E.saves),per("saves"))+tile("💬 Şərh",adNum(E.comments),per("comments"));})()
    +tile("ThruPlay",vImpr?adNum(pct(thru,vImpr))+"%":"—","göstərimdən 15 san / tam baxış")));
  const ip=el("div","panel");ip.style.marginTop="16px";
  ip.appendChild(el("div","ph",`<h3>Avtomatik çıxarışlar</h3><span class="count">${esc(c.name)} · ${esc(deepRangeLabel())}</span>`));
  ip.appendChild(el("div","pb",deepInsights(d,cur)));wrap.appendChild(ip);
  /* Kreativlər */
  const bestBy={};ads.filter(a=>adRes(a)>=3).forEach(a=>{const b=bestBy[a.kind];if(!b||adCost(a)<adCost(b))bestBy[a.kind]=a;});
  const kp=el("div","panel");kp.style.marginTop="16px";
  const isAct=a=>a.status==="ACTIVE";const nAct=ads.filter(isAct).length;
  let shown=ads.filter(a=>deepStatus==="all"||(deepStatus==="active"?isAct(a):!isAct(a)));
  const SORTS={spend_desc:["Xərc: çoxdan aza",(a,b)=>b.spend-a.spend],spend_asc:["Xərc: azdan çoxa",(a,b)=>a.spend-b.spend],
    results_desc:["Nəticə (mesaj/klik): çoxdan aza",(a,b)=>adRes(b)-adRes(a)||b.spend-a.spend],
    cpr_asc:["Mesaj / klik qiyməti: ucuzdan bahaya",(a,b)=>{const x=adCost(a),y=adCost(b);return (x==null)-(y==null)||(x||0)-(y||0);}],
    shares_desc:["Paylaşım nisbəti: yüksəkdən aşağı",(a,b)=>{const x=engRate(a,"shares"),y=engRate(b,"shares");return (x==null)-(y==null)||(y||0)-(x||0);}],
    saves_desc:["Yadda saxlama nisbəti: yüksəkdən aşağı",(a,b)=>{const x=engRate(a,"saves"),y=engRate(b,"saves");return (x==null)-(y==null)||(y||0)-(x||0);}],
    comments_desc:["Şərh nisbəti: yüksəkdən aşağı",(a,b)=>{const x=engRate(a,"comments"),y=engRate(b,"comments");return (x==null)-(y==null)||(y||0)-(x||0);}],
    hook_desc:["Hook: yüksəkdən aşağı",(a,b)=>{const x=adHook(a),y=adHook(b);return (x==null)-(y==null)||(y||0)-(x||0);}],
    thru_desc:["ThruPlay: yüksəkdən aşağı",(a,b)=>{const x=a.video&&a.impr?a.video.thruplay/a.impr:null,y=b.video&&b.impr?b.video.thruplay/b.impr:null;return (x==null)-(y==null)||(y||0)-(x||0);}],
    new:["Ən yeni reklamlar",(a,b)=>String(b.created).localeCompare(String(a.created))]};
  shown=shown.slice().sort((SORTS[deepSort]||SORTS.spend_desc)[1]);
  const kh=el("div","ph");kh.style.cssText="flex-wrap:wrap;gap:10px";
  kh.innerHTML=`<h3>Kreativlər — reklam səviyyəsində</h3><span class="count">${shown.length}/${ads.length} reklam</span>`;
  const ctl=el("div");ctl.style.cssText="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-left:auto";
  const sseg=el("div","seg");sseg.style.margin="0";
  [["all","Hamısı",ads.length],["active","Aktiv",nAct],["inactive","Aktiv olmayan",ads.length-nAct]].forEach(([k,l,n])=>{const b=el("button",deepStatus===k?"on":"",`${l} <span style="opacity:.6">${n}</span>`);b.onclick=()=>{deepStatus=k;render();};sseg.appendChild(b);});
  const ssel=el("select");ssel.className="dateinp";ssel.title="Sıralama";
  ssel.innerHTML=Object.entries(SORTS).map(([k,[l]])=>`<option value="${k}"${deepSort===k?" selected":""}>↕ ${l}</option>`).join("");
  ssel.onchange=()=>{deepSort=ssel.value;render();};
  ctl.appendChild(sseg);ctl.appendChild(ssel);kh.appendChild(ctl);kp.appendChild(kh);
  const tw=el("div","tablewrap");
  tw.innerHTML=`<table><thead><tr><th>Reklam</th><th>Status</th><th>Xərc</th><th>Nəticə</th><th>Qiymət</th><th>CTR · CPM</th><th>Tezlik</th><th>Hook · ThruPlay</th><th title="Paylaşım · Şərh · Yadda saxlama (altında — 1000 göstərimə nisbət)">↗ · 💬 · 🔖</th></tr></thead><tbody>${shown.map(a=>{
    const code=(String(a.name).match(/\bMZ-\d+\b/i)||[])[0];const br=code&&state.ad_briefs.find(b=>String(b.code).toUpperCase()===code.toUpperCase());
    const cpr=adCost(a);const K=AD_KIND[a.kind]||AD_KIND.other;const best=bestBy[a.kind];
    return `<tr${adRes(a)===0&&T.spend>0&&a.spend>=T.spend*0.15?' style="background:color-mix(in srgb,var(--crit) 6%,transparent)"':''}>
      <td><div style="display:flex;gap:10px;align-items:center">${a.thumb?`<img src="${esc(a.thumb)}" alt="" style="width:40px;height:40px;border-radius:6px;object-fit:cover;flex:none">`:'<span class="nothumb" style="width:40px;height:40px"></span>'}<div style="min-width:0"><strong>${esc(a.name||"—")}</strong>${a===best?' <span class="chip c-good" style="font-size:9.5px;padding:1px 6px">🏆 ən effektiv</span>':""}${br?` <span class="chip c-accent" style="font-size:9.5px;padding:1px 6px" title="Targeting brifi">${esc(br.code)}</span>`:""}<div class="m" style="color:var(--muted);font-size:11.5px"><span class="chip c-mut" style="font-size:9.5px;padding:0 6px">${K[0]} ${K[1]}</span>${a.noDelivery?' <span class="chip c-warn" style="font-size:9.5px;padding:0 6px" title="Aktivdir, amma bu dövrdə hələ göstərilməyib / pul xərcləməyib">hələ xərc yoxdur</span>':""}${adLink(a)?` <a href="${esc(adLink(a))}" target="_blank" rel="noopener" style="font-size:11px;font-weight:600;color:var(--accent-ink);text-decoration:none" title="${a.igLink?"Instagram postu":"Reklam önizləməsi"}">↗ ${a.igLink?"Instagram":"Önizləmə"}</a>`:""} ${esc(a.campaign)}${a.created?" · "+fmtDT(a.created):""}</div><div style="margin-top:3px">${rankChips(a.rank)}</div></div></div></td>
      <td>${a.status?adStatusChip(a.status):"—"}</td>
      <td class="num">${adMoney(a.spend,cur)}</td>
      <td class="num" style="white-space:nowrap"><strong>${adNum(adRes(a))}</strong> <span style="color:var(--muted);font-size:11px">${K[2]}</span></td>
      <td class="num" style="white-space:nowrap">${cpr!=null?adMoney(cpr,cur)+`<span style="color:var(--muted);font-size:11px">/${K[2]}</span>`:"—"}</td>
      <td class="num" style="white-space:nowrap;font-size:12px">${adNum(pct(a.clicks,a.impr))}%<br>${adMoney(mCPM(a.spend,a.impr),cur)}</td>
      <td class="num">${a.freq>=3?`<span class="chip c-warn" title="Yorulma riski">${adNum(a.freq)}</span>`:adNum(a.freq)}</td>
      <td class="num" style="white-space:nowrap;font-size:12px">${a.video?`<span class="hkcell">${adNum(pct(a.video.v3,a.impr))}% <button class="hkbtn" data-adhook="${esc(a.id)}" title="Bu reklamın hook rate qrafikinə bax" aria-label="Hook qrafiki">📈</button></span><br>${adNum(pct(a.video.thruplay,a.impr))}%`:"—"}</td>
      <td class="num" style="white-space:nowrap;font-size:12px">${a.impr?(()=>{const e=engOf(a);return `<span title="Paylaşım">↗ ${adNum(e.shares)}</span> · <span title="Şərh">💬 ${adNum(e.comments)}</span> · <span title="Yadda saxlama">🔖 ${adNum(e.saves)}</span>${a.impr>=300?`<br><span style="color:var(--muted);font-size:11px" title="1000 göstərimə: paylaşım · şərh · yadda saxlama">${adNum(e.shares/a.impr*1000)} · ${adNum(e.comments/a.impr*1000)} · ${adNum(e.saves/a.impr*1000)} /1000</span>`:""}`;})():"—"}</td></tr>`;}).join("")||`<tr><td colspan="9"><div class="empty">${ads.length?"Bu filtrə uyğun reklam yoxdur":"Bu dövrdə reklam yoxdur"}</div></td></tr>`}</tbody></table>`;
  kp.appendChild(tw);
  tw.querySelectorAll("[data-adhook]").forEach(b=>b.onclick=e=>{e.stopPropagation();openAdHook(c,ads.find(x=>String(x.id)===b.dataset.adhook));});
  kp.appendChild(el("div","empty",`<div style="text-align:left;font-size:12px;color:var(--muted)"><b>Hook</b> — göstərimlərin neçə %-i videoya 3 saniyə baxıb. <b>ThruPlay</b> — 15 saniyə və ya sona qədər baxış. <b>Tezlik</b> — bir nəfər reklamı orta neçə dəfə görüb (3+ = yorulma). <b>↗ · 💬 · 🔖</b> — paylaşım, şərh, yadda saxlama sayı; altında 1000 göstərimə düşən nisbət (reklamları ədalətli müqayisə üçün). Reytinqlər Meta-nındır, 500+ göstərimdən sonra çıxır.</div>`));
  wrap.appendChild(kp);
  /* Hook rate dinamikası — kampaniyalar üzrə */
  {const hk=el("div","panel");hk.style.marginTop="16px";
   hk.appendChild(el("div","ph",`<h3>Hook rate dinamikası — kampaniyalar üzrə</h3><span class="count">${esc(deepRangeLabel())} · gündəlik</span>`));
   const hb=el("div","pb",deepHookTrends(d.hookDaily||[]));hk.appendChild(hb);wireHookTrends(hb,d.hookDaily||[],c);wrap.appendChild(hk);}
  /* Video saxlama + saatlar */
  const g1=el("div","grid2");g1.style.marginTop="16px";
  const vp=el("div","panel");vp.appendChild(el("div","ph",`<h3>Video izlənmə əyrisi</h3><span class="count">ən çox xərclənən videolar</span>`));vp.appendChild(el("div","pb",deepRetention(ads)));g1.appendChild(vp);
  const hp=el("div","panel");hp.appendChild(el("div","ph",`<h3>Saatlara görə nəticə</h3><span class="count">${esc(deepRangeLabel())}</span>`));hp.appendChild(el("div","pb",deepHours(d.hour||[],cur)));g1.appendChild(hp);
  wrap.appendChild(g1);
  /* Auditoriya */
  const g2=el("div","grid2");g2.style.marginTop="16px";
  const ap=el("div","panel");ap.appendChild(el("div","ph",`<h3>Yaş və cins</h3><span class="count">zolaq = nəticə sayı</span>`));ap.appendChild(el("div","pb",deepBars(d.age||[],"age",cur,12)));g2.appendChild(ap);
  const pp=el("div","panel");pp.appendChild(el("div","ph",`<h3>Platforma və yerləşmə</h3><span class="count">zolaq = nəticə sayı</span>`));pp.appendChild(el("div","pb",deepBars(d.placement||[],"placement",cur,10)));g2.appendChild(pp);
  wrap.appendChild(g2);
  const rp=el("div","panel");rp.style.marginTop="16px";rp.appendChild(el("div","ph",`<h3>Regionlar</h3><span class="count">ilk 10</span>`));rp.appendChild(el("div","pb",deepBars(d.region||[],"region",cur,10)));wrap.appendChild(rp);
  if(d.errors&&d.errors.length)wrap.appendChild(el("div","hint",`<div style="margin-top:10px">Bəzi bölmələr yüklənmədi: ${esc(d.errors.join("; "))}</div>`));
  return wrap;
}
/* ---------- Instagram mesajları ---------- */
/* Webhook (ig-webhook) hər mesajı yazır; müştərinin ilk mesajından biznesin ilk cavabına qədər bir «gözləmə» (ig_waits) açılır.
   Qayda: B.e.–Şənbə 10:00–20:00 → 25 dəq, Bazar 10:00–20:00 → 4 saat; müddət yalnız iş saatlarında sayılır. Gecikmə bildirişləri söndürülüb (ig-check: NOTIFY_LATE=false) — yalnız statistika. */
const IG_OAUTH_URL=SB_URL+"/functions/v1/ig-oauth";
const IG_MANAGERS=["ceo","pm"];
let igRange="today", igAcct="", igData=null, _igTimer=null;
const IG_OFF=4*3600e3, IG_OPEN=10, IG_CLOSE=20;
function igDayStart(ms){const d=new Date(ms+IG_OFF);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-IG_OFF;}
function igNextOpen(ms){const ds=igDayStart(ms),o=ds+IG_OPEN*3600e3,c=ds+IG_CLOSE*3600e3;if(ms<o)return o;if(ms<c)return ms;return ds+86400e3+IG_OPEN*3600e3;}
function igWorkMin(a,b){if(b<=a)return 0;let t=igNextOpen(a),s=0;for(let i=0;i<400&&t<b;i++){const c=igDayStart(t)+IG_CLOSE*3600e3;s+=Math.min(c,b)-t;t=igNextOpen(c);}return Math.round(s/60e3);}
function igBounds(){const t=igDayStart(Date.now());if(igRange==="today")return [t,t+86400e3];if(igRange==="yesterday")return [t-86400e3,t];const n=igRange==="7"?7:igRange==="90"?90:30;return [t-(n-1)*86400e3,t+86400e3];}
const igRangeLabel=()=>({today:"Bu gün",yesterday:"Dünən","7":"Son 7 gün","30":"Son 30 gün","90":"Son 3 ay"}[igRange]);
function igMyAccounts(){const all=state.ig_accounts.filter(a=>a.status!=="disconnected");return IG_MANAGERS.includes(role)?all:all.filter(a=>(a.responders||[]).includes(me.id));}
function igVenue(a){const c=a&&state.clients.find(x=>x.id===a.client_id);return c?c.name:(a?"@"+a.username:"—");}
function igAcctOf(id){return state.ig_accounts.find(a=>a.ig_user_id===id);}
function profName(id){const p=state.profiles.find(x=>x.id===id);return p?(p.full_name||p.username):"—";}
function fmtMin(m){m=Math.round(m||0);if(m<60)return m+" dəq";const h=Math.floor(m/60),r=m%60;return h+" saat"+(r?" "+r+" dəq":"");}
function fmtHM(iso){const d=new Date(iso);if(isNaN(d))return "—";return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+" · "+String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0");}
/* Supabase bir sorğuda ən çox 1000 sətir qaytarır — böyük məkanlarda səhifə-səhifə yığırıq */
async function igFetchAll(q){const out=[];for(let i=0;i<50;i++){const r=await q().range(i*1000,i*1000+999);if(r.error)return {data:out,error:r.error};out.push(...(r.data||[]));if(!r.data||r.data.length<1000)break;}return {data:out,error:null};}
async function igLoad(){
  const [from,to]=igBounds();const key=igRange;
  if(!igData||igData.key!==key)igData={key,loading:true};
  const F=new Date(from).toISOString(),T=new Date(to).toISOString();
  const [w,o,d]=await Promise.all([
    igFetchAll(()=>sb.from('ig_waits').select('*').gte('first_msg_at',F).lt('first_msg_at',T).order('first_msg_at',{ascending:false}).order('id')),
    sb.from('ig_waits').select('*').eq('status','open').order('deadline_at'),
    igFetchAll(()=>sb.rpc('ig_daily',{p_from:F,p_to:T}))
  ]);
  if(igRange!==key)return;
  igData={key,waits:w.data||[],open:o.data||[],daily:d.data||[],error:(w.error||o.error||d.error||{}).message||""};
  if(view==="igmsg")render();
}
function igReload(){if(_igTimer)return;_igTimer=setTimeout(()=>{_igTimer=null;if(view==="igmsg")igLoad();},800);}
/* Gözləmə taymerləri ekranı yenidən qurmadan hər 30 saniyədə yenilənir */
setInterval(()=>{if(view!=="igmsg")return;document.querySelectorAll("[data-igsince]").forEach(e=>{e.textContent=fmtMin(igWorkMin(Date.parse(e.dataset.igsince),Date.now()));});},30000);
function igStats(waits,daily,ids){
  const W=waits.filter(w=>ids.has(w.ig_user_id)&&w.status!=="closed");
  const rep=W.filter(w=>w.status==="replied"),late=W.filter(w=>w.late);
  const incoming=daily.filter(x=>ids.has(x.ig_user_id)).reduce((s,x)=>s+Number(x.incoming||0),0);
  return {conv:W.length,replied:rep.length,late:late.length,open:W.filter(w=>w.status==="open").length,incoming,
    avg:rep.length?rep.reduce((s,w)=>s+(w.response_min||0),0)/rep.length:null,latePct:W.length?late.length/W.length*100:0,
    max:rep.reduce((m,w)=>Math.max(m,w.response_min||0),0)};
}
async function igCall(body){
  const {data:{session}}=await sb.auth.getSession();
  const r=await fetch(IG_OAUTH_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+(session?session.access_token:"")},body:JSON.stringify(body)});
  return r.json().catch(()=>({ok:false,error:"cavab yoxdur ("+r.status+")"}));
}
function openIgAccounts(){
  const responders=state.profiles.filter(p=>p.role==="responder");
  const clients=state.clients.slice().sort((a,b)=>{const ca=state.ig_accounts.some(x=>x.client_id===a.id&&x.status!=="disconnected"),cb=state.ig_accounts.some(x=>x.client_id===b.id&&x.status!=="disconnected");return ca!==cb?(ca?-1:1):String(a.name).localeCompare(String(b.name),"az");});
  const scrim=el("div","scrim");
  const rows=()=>clients.map(c=>{
    const a=state.ig_accounts.find(x=>x.client_id===c.id&&x.status!=="disconnected");
    const st=!a?`<span class="chip c-mut" style="font-size:10.5px">Qoşulmayıb</span>`:a.status==="active"?`<span class="chip c-good" style="font-size:10.5px">● @${esc(a.username)}</span>`:`<span class="chip c-crit" style="font-size:10.5px" title="${esc(a.last_error)}">⚠ @${esc(a.username)}</span>`;
    const resp=a?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${responders.length?responders.map(p=>`<label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 8px;border:1px solid var(--border);border-radius:999px;cursor:pointer"><input type="checkbox" data-igresp="${esc(a.ig_user_id)}" value="${p.id}"${(a.responders||[]).includes(p.id)?" checked":""}>${esc(p.full_name||p.username)}</label>`).join(""):`<span class="hint">«Cavabçı» rolu olan istifadəçi yoxdur — Komanda bölməsindən təyin et.</span>`}</div>`:"";
    return `<div class="row" style="align-items:flex-start;flex-wrap:wrap;gap:8px"><div class="main" style="min-width:200px"><div class="t" style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">${esc(c.name)} ${st}</div>
      ${a?`<div class="m">${a.last_event_at?"Son mesaj: "+fmtHM(a.last_event_at):"Hələ mesaj gəlməyib"}${a.status!=="active"&&a.last_error?` · <span style="color:var(--crit)">${esc(a.last_error)}</span>`:""}</div>`:""}${resp}</div>
      <div class="r" style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="mini" data-igconn="${c.id}">${a?"Yenidən qoş":"📷 Instagram-ı qoş"}</button>
        <button class="mini" data-iglink="${c.id}" title="Instagram şifrəsi məkan sahibindədirsə — linki ona göndər (3 gün etibarlı)">🔗 Link</button>
        ${a?`<button class="mini" data-igoff="${esc(a.ig_user_id)}" style="color:var(--crit)">Ayır</button>`:""}
      </div></div>`;}).join("");
  scrim.innerHTML=`<div class="modal" style="max-width:720px"><div class="mh"><h3>Instagram hesabları</h3><button data-x>×</button></div>
    <div class="mb"><div class="hint" style="white-space:normal;margin-bottom:10px">«Instagram-ı qoş» basanda Instagram giriş səhifəsi açılır — həmin məkanın hesabı ilə daxil olub icazə ver. Facebook-a bağlamaq lazım deyil; hesab <b>peşəkar (Business/Creator)</b> olmalıdır. Hər məkana cavab verən şəxsləri işarələ — onlar bu məkanın mesajlarını və statistikasını görür.</div><div class="pb" id="igrows">${rows()}</div></div>
    <div class="mf"><button class="btn" data-x>Bağla</button></div></div>`;
  document.body.appendChild(scrim);
  const close=()=>scrim.remove();
  scrim.querySelectorAll("[data-x]").forEach(b=>b.onclick=close);scrim.onclick=e=>{if(e.target===scrim)close();};
  const bind=()=>{
    scrim.querySelectorAll("[data-igconn],[data-iglink]").forEach(b=>b.onclick=async()=>{
      const cid=b.dataset.igconn||b.dataset.iglink;const old=b.innerHTML;b.disabled=true;b.innerHTML="⏳";
      const j=await igCall({action:"start",client_id:cid});b.disabled=false;b.innerHTML=old;
      if(!j.ok){alert("Alınmadı: "+(j.error||""));return;}
      if(b.dataset.iglink)abCopy(j.url);else location.href=j.url;
    });
    scrim.querySelectorAll("[data-igoff]").forEach(b=>b.onclick=async()=>{
      if(!confirm("Bu Instagram hesabının izlənməsi dayandırılsın? Statistika saxlanılır."))return;
      const j=await igCall({action:"disconnect",ig_user_id:b.dataset.igoff});if(!j.ok){alert("Alınmadı: "+(j.error||""));return;}
      await reload('ig_accounts');scrim.querySelector("#igrows").innerHTML=rows();bind();
    });
    scrim.querySelectorAll("[data-igresp]").forEach(cb=>cb.onchange=async()=>{
      const id=cb.dataset.igresp;const list=[...scrim.querySelectorAll(`[data-igresp="${CSS.escape(id)}"]`)].filter(x=>x.checked).map(x=>x.value);
      const {error}=await sb.from('ig_accounts').update({responders:list}).eq('ig_user_id',id);
      if(error)alert("Xəta: "+error.message);await reload('ig_accounts');
    });
  };
  bind();
}
function renderIgMsg(){
  const wrap=el("div");const isMgr=IG_MANAGERS.includes(role);
  const mine=igMyAccounts();
  if(igAcct&&!mine.some(a=>a.ig_user_id===igAcct))igAcct="";
  const bar=el("div","panel");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;margin-bottom:16px";
  const seg=el("div","seg");seg.style.margin="0";
  [["today","Bu gün"],["yesterday","Dünən"],["7","7 gün"],["30","30 gün"],["90","3 ay"]].forEach(([k,l])=>{const b=el("button",igRange===k?"on":"",l);b.onclick=()=>{if(igRange!==k){igRange=k;igData=null;render();}};seg.appendChild(b);});
  bar.appendChild(seg);
  const sp=el("div");sp.style.marginLeft="auto";bar.appendChild(sp);
  if(mine.length>1){const vs=el("select");vs.style.cssText="font-size:12.5px;padding:6px 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink);max-width:190px";
    vs.innerHTML=`<option value="">Bütün məkanlar</option>`+mine.map(a=>`<option value="${esc(a.ig_user_id)}"${a.ig_user_id===igAcct?" selected":""}>${esc(igVenue(a))}</option>`).join("");vs.onchange=()=>{igAcct=vs.value;render();};bar.appendChild(vs);}
  const rf=el("button","mini",ICON.arrow+" Yenilə");rf.onclick=()=>{igData=null;render();};bar.appendChild(rf);
  if(isMgr){const cf=el("button","mini","⚙ Hesablar");cf.onclick=()=>openIgAccounts();bar.appendChild(cf);}
  wrap.appendChild(bar);
  wrap.appendChild(el("div","hint",`<div style="margin:-6px 0 14px">Qayda: <b>B.e.–Şənbə 10:00–20:00 — 25 dəqiqə</b>, <b>Bazar 10:00–20:00 — 4 saat</b>. Müddət yalnız iş saatlarında sayılır; gecikən cavablar statistikada «gec cavab» kimi qeyd olunur.</div>`));
  if(!mine.length){wrap.appendChild(el("div","panel",`<div class="empty">${isMgr?"Hələ heç bir Instagram hesabı qoşulmayıb. «⚙ Hesablar»dan məkanın Instagram-ını qoş.":"Sənə hələ məkan təyin olunmayıb — CEO ilə əlaqə saxla."}</div>`));return wrap;}
  if(!igData||igData.key!==igRange||igData.loading){if(!igData||igData.key!==igRange)igLoad();wrap.appendChild(el("div","panel",`<div class="empty">⏳ Yüklənir…</div>`));return wrap;}
  if(igData.error)wrap.appendChild(el("div","hint",`<div style="color:var(--crit);margin-bottom:10px">Xəta: ${esc(igData.error)}</div>`));
  const accts=igAcct?mine.filter(a=>a.ig_user_id===igAcct):mine;const ids=new Set(accts.map(a=>a.ig_user_id));
  const S=igStats(igData.waits,igData.daily,ids);
  const openNow=igData.open.filter(w=>ids.has(w.ig_user_id));const overNow=openNow.filter(w=>Date.parse(w.deadline_at)<=Date.now());
  wrap.appendChild(el("div","tiles",
    tile("Gələn mesaj",adNum(S.incoming),S.conv+" söhbət · "+igRangeLabel(),true)
    +tile("Cavablandı",S.replied+"/"+S.conv,S.open?S.open+" hələ cavabsız":"hamısı cavablanıb")
    +tileC("Gec cavab",S.late,S.conv?Math.round(S.latePct)+"% söhbət":"—",S.late?"crit":"good")
    +tile("Orta cavab",S.avg==null?"—":fmtMin(S.avg),S.max?"ən uzun "+fmtMin(S.max):"iş vaxtı ilə")
    +tileC("İndi gözləyən",openNow.length,overNow.length?overNow.length+" gecikir":"gecikən yoxdur",overNow.length?"crit":openNow.length?"warn":"good")));
  /* Cavab gözləyənlər */
  const wp=el("div","panel");wp.style.marginTop="16px";
  wp.appendChild(el("div","ph",`<h3>Cavab gözləyənlər</h3><span class="count">${openNow.length}</span>`));
  const wb=el("div","pb");
  wb.innerHTML=openNow.map(w=>{const over=Date.parse(w.deadline_at)<=Date.now();const left=igWorkMin(Date.now(),Date.parse(w.deadline_at));
    return `<div class="row" style="flex-wrap:wrap;gap:8px;border-left:3px solid var(--${over?"crit":"warn"})"><div class="main" style="min-width:220px"><div class="t" style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">${esc(w.customer_name||"Müştəri")}<span class="chip c-mut" style="font-size:10px">${esc(igVenue(igAcctOf(w.ig_user_id)))}</span>${w.msg_count>1?`<span class="chip c-accent" style="font-size:10px">${w.msg_count} mesaj</span>`:""}</div>
      <div class="m">${w.preview?"«"+esc(w.preview)+"»":"—"} · ilk mesaj ${fmtHM(w.first_msg_at)}</div></div>
      <div class="r" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="chip c-${over?"crit":"warn"}" style="font-size:11px">${ICON.clock}<span data-igsince="${esc(w.first_msg_at)}">${fmtMin(igWorkMin(Date.parse(w.first_msg_at),Date.now()))}</span>&nbsp;/ ${fmtMin(w.limit_min)}</span>${over?`<span class="chip c-crit" style="font-size:10.5px">⛔ Gecikir</span>`:`<span class="hint">${fmtMin(left)} qalıb</span>`}<a class="mini" href="https://www.instagram.com/direct/inbox/" target="_blank" rel="noopener" style="text-decoration:none">Instagram-da aç</a></div></div>`;}).join("")||`<div class="empty">Cavab gözləyən mesaj yoxdur ✓</div>`;
  wp.appendChild(wb);wrap.appendChild(wp);
  /* Gündəlik qrafik */
  if(igRange==="7"||igRange==="30"){
    const [from,to]=igBounds();const days=[];for(let t=from;t<to;t+=86400e3)days.push(t);
    const key=t=>{const d=new Date(t+IG_OFF);return d.toISOString().slice(0,10);};
    const inc={},lateBy={};igData.daily.filter(x=>ids.has(x.ig_user_id)).forEach(x=>{inc[x.day]=(inc[x.day]||0)+Number(x.incoming||0);});
    igData.waits.filter(w=>ids.has(w.ig_user_id)&&w.late).forEach(w=>{const k=key(Date.parse(w.first_msg_at));lateBy[k]=(lateBy[k]||0)+1;});
    const mx=Math.max(1,...days.map(t=>inc[key(t)]||0));
    const cp=el("div","panel");cp.style.marginTop="16px";
    cp.appendChild(el("div","ph",`<h3>Gündəlik gələn mesajlar</h3><span class="count">${igRangeLabel()}</span>`));
    cp.appendChild(el("div","pb",`<div style="display:flex;align-items:flex-end;gap:3px;height:130px">${days.map(t=>{const k=key(t),v=inc[k]||0,l=lateBy[k]||0;const d=new Date(t+IG_OFF);const lab=String(d.getUTCDate()).padStart(2,"0")+"."+String(d.getUTCMonth()+1).padStart(2,"0");
        return `<div title="${lab}: ${v} mesaj${l?" · "+l+" gec cavab":""}" style="flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px"><span class="num" style="font-size:10px;color:var(--ink-soft)">${v||""}</span><span style="display:block;width:100%;max-width:28px;height:${Math.max(v?3:1,v/mx*100)}%;background:var(--accent);border-radius:4px 4px 0 0"></span></div>`;}).join("")}</div>
      <div class="num" style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);margin-top:4px">${[days[0],days[Math.floor(days.length/2)],days[days.length-1]].map(t=>{const d=new Date(t+IG_OFF);return `<span>${String(d.getUTCDate()).padStart(2,"0")}.${String(d.getUTCMonth()+1).padStart(2,"0")}</span>`;}).join("")}</div>`));
    wrap.appendChild(cp);
  }
  /* Məkanlar üzrə */
  const vp=el("div","panel");vp.style.marginTop="16px";
  vp.appendChild(el("div","ph",`<h3>Məkanlar üzrə</h3><span class="count">${igRangeLabel()}</span>`));
  const vt=el("div","tablewrap");
  vt.innerHTML=`<table><thead><tr><th>Məkan</th><th>Cavabçı</th><th>Gələn mesaj</th><th>Söhbət</th><th>Cavablandı</th><th>Gec cavab</th><th>Orta cavab</th><th>Ən uzun</th></tr></thead><tbody>${accts.map(a=>{const s=igStats(igData.waits,igData.daily,new Set([a.ig_user_id]));
    return `<tr><td><strong>${esc(igVenue(a))}</strong><div class="m" style="color:var(--muted);font-size:11.5px">@${esc(a.username)}${a.status==="error"?' · <span style="color:var(--crit)">⚠ bağlantı problemi</span>':""}</div></td>
      <td style="font-size:12.5px">${(a.responders||[]).map(profName).map(esc).join(", ")||'<span class="hint">təyin olunmayıb</span>'}</td>
      <td class="num">${adNum(s.incoming)}</td><td class="num">${s.conv}</td><td class="num">${s.replied}</td>
      <td class="num">${s.late?`<span class="chip c-crit">${s.late} · ${Math.round(s.latePct)}%</span>`:"0"}</td>
      <td class="num">${s.avg==null?"—":fmtMin(s.avg)}</td><td class="num">${s.max?fmtMin(s.max):"—"}</td></tr>`;}).join("")}</tbody></table>`;
  vp.appendChild(vt);wrap.appendChild(vp);
  /* Cavabçılar üzrə (rəhbərlik üçün) */
  if(isMgr){
    const ppl=[...new Set(accts.flatMap(a=>a.responders||[]))];
    if(ppl.length){
      const rp=el("div","panel");rp.style.marginTop="16px";
      rp.appendChild(el("div","ph",`<h3>Cavabçılar üzrə</h3><span class="count">${ppl.length} nəfər</span>`));
      const rt=el("div","tablewrap");
      rt.innerHTML=`<table><thead><tr><th>Cavabçı</th><th>Məkanlar</th><th>Söhbət</th><th>Gec cavab</th><th>Orta cavab</th></tr></thead><tbody>${ppl.map(pid=>{const mineA=accts.filter(a=>(a.responders||[]).includes(pid));const s=igStats(igData.waits,igData.daily,new Set(mineA.map(a=>a.ig_user_id)));
        return `<tr><td><strong>${esc(profName(pid))}</strong></td><td style="font-size:12.5px">${mineA.map(igVenue).map(esc).join(", ")}</td><td class="num">${s.conv}</td><td class="num">${s.late?`<span class="chip c-crit">${s.late} · ${Math.round(s.latePct)}%</span>`:"0"}</td><td class="num">${s.avg==null?"—":fmtMin(s.avg)}</td></tr>`;}).join("")}</tbody></table>`;
      rp.appendChild(rt);
      rp.appendChild(el("div","empty",`<div style="text-align:left;font-size:12px;color:var(--muted)">Meta cavabı kimin yazdığını göstərmir — rəqəmlər cavabçıya təyin olunmuş məkanlara görə hesablanır.</div>`));
      wrap.appendChild(rp);
    }
  }
  /* Gecikmiş cavablar */
  const late=igData.waits.filter(w=>ids.has(w.ig_user_id)&&w.late).slice(0,60);
  const lp=el("div","panel");lp.style.marginTop="16px";
  lp.appendChild(el("div","ph",`<h3>Gecikmiş cavablar</h3><span class="count">${late.length}</span>`));
  const lt=el("div","tablewrap");
  lt.innerHTML=`<table><thead><tr><th>Müştəri</th><th>Məkan</th><th>İlk mesaj</th><th>Cavab müddəti</th><th>Gecikmə</th></tr></thead><tbody>${late.map(w=>{const rm=w.status==="replied"?w.response_min:igWorkMin(Date.parse(w.first_msg_at),Date.now());
    return `<tr><td><strong>${esc(w.customer_name||"Müştəri")}</strong><div class="m" style="color:var(--muted);font-size:11.5px">${w.preview?"«"+esc(w.preview.slice(0,70))+"»":""}</div></td><td>${esc(igVenue(igAcctOf(w.ig_user_id)))}</td><td class="num" style="white-space:nowrap">${fmtHM(w.first_msg_at)}</td>
      <td class="num">${w.status==="replied"?fmtMin(rm):`<span class="chip c-crit">cavabsız · ${fmtMin(rm)}</span>`}</td><td class="num">+${fmtMin(Math.max(0,rm-w.limit_min))}</td></tr>`;}).join("")||`<tr><td colspan="5"><div class="empty">Gecikmiş cavab yoxdur ✓</div></td></tr>`}</tbody></table>`;
  lp.appendChild(lt);wrap.appendChild(lp);
  return wrap;
}
function renderAds(){
  const wrap=el("div");const isMgr=TASK_MANAGERS.includes(role);const preset=metaPreset();
  const all=state.clients.filter(c=>(c.ad_account_id||"").trim());
  if(adsClient&&!all.some(c=>c.id==adsClient))adsClient="";
  const bar=el("div","panel");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;margin-bottom:16px";
  const tseg=el("div","seg");tseg.style.margin="0";
  [["metrics","📊 Nəticələr"],["recent","🆕 Yeni reklamlar"],["deep","🔬 Dərin analiz"]].forEach(([k,lbl])=>{const b=el("button",adsTab===k?"on":"",lbl);b.onclick=()=>{if(adsTab!==k){adsTab=k;render();}};tseg.appendChild(b);});
  bar.appendChild(tseg);
  const sp=el("div");sp.style.marginLeft="auto";bar.appendChild(sp);
  if(all.length){
    const vsel=el("select");vsel.style.cssText="font-size:12.5px;padding:6px 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink);max-width:180px";
    vsel.innerHTML=`<option value="">Bütün məkanlar</option>`+all.map(c=>`<option value="${c.id}"${String(adsClient)===String(c.id)?" selected":""}>${esc(c.name)}</option>`).join("");
    vsel.onchange=()=>{adsClient=vsel.value;render();};bar.appendChild(vsel);
  }
  const seg=el("div","seg");seg.style.margin="0";
  [["today","Bu gün"],["7","Son 7 gün"],["30","Son 30 gün"]].forEach(([k,lbl])=>{const b=el("button",adsRange===k?"on":"",lbl);b.onclick=()=>{if(adsRange!==k){adsRange=k;render();}};seg.appendChild(b);});
  if(adsTab!=="deep")bar.appendChild(seg);   // dərin analizin öz təqvim filtri var
  const rf=el("button","mini",ICON.arrow+" Yenilə");rf.onclick=()=>{adsData={};Object.keys(adsDeep).forEach(k=>delete adsDeep[k]);render();};bar.appendChild(rf);
  if(isMgr){const cfg=el("button","mini",ICON.plus+" Hesab əlavə et");cfg.onclick=()=>openAdsConfig();bar.appendChild(cfg);}
  wrap.appendChild(bar);
  if(!all.length){
    const e=el("div","panel");e.appendChild(el("div","empty",isMgr?"Hələ heç bir məkana reklam hesabı təyin edilməyib. Yuxarıdan «+ Hesab əlavə et» ilə Ad Account ID əlavə et.":"Hələ reklam hesabı təyin edilməyib. Marketinq komandası ilə əlaqə saxla."));
    wrap.appendChild(e);return wrap;
  }
  if(adsTab==="deep"){wrap.appendChild(renderAdsDeep(all));return wrap;}
  const withAcct=adsClient?all.filter(c=>String(c.id)===String(adsClient)):all;
  const cards={};
  if(adsTab==="metrics"){
    if(withAcct.length>1){const tot=el("div","tiles");tot.id="ads-tot";wrap.appendChild(tot);}
    const grid=el("div",withAcct.length>1?"grid2":"");wrap.appendChild(grid);
    withAcct.forEach(c=>{const card=el("div","panel");card.style.marginBottom="0";card.innerHTML=adCardHTML(c,adsData[c.id+"|"+adsRange]);grid.appendChild(card);cards[c.id]=card;});
  } else {
    wrap.appendChild(renderAdsFeed(withAcct));
  }
  withAcct.filter(c=>{const d=adsData[c.id+"|"+adsRange];return !d||(!d.ok&&!d.loading&&!d.error);}).forEach(async c=>{
    const key=c.id+"|"+adsRange;adsData[key]={loading:true};
    const res=await fetchMetaInsights(c.ad_account_id,preset);adsData[key]=res;
    if(view!=="ads")return;
    if(cards[c.id]&&document.body.contains(cards[c.id]))cards[c.id].innerHTML=adCardHTML(c,res);
    updateAdsTotal();adsFeedRefresh();
  });
  setTimeout(()=>{if(view==="ads")updateAdsTotal();},40);
  return wrap;
}
/* ---------- Ofis: komandanın izometrik görünüşü (2026.10.24d) ---------- */
const OFFICE_ROLES=["ceo","pm","marketing"];
const OF_ORDER=["pm","marketing","account","designer","motion","content","coordinator","editor","targeting","responder","operator"];
let ofSel="";
function ofApprPending(r){
  let n=state.content.filter(c=>c.status==="Təsdiq gözləyir"&&!c['appr_'+r]).length+state.briefs.filter(b=>b.status==="Təsdiq gözləyir"&&!b['appr_'+r]).length;
  state.shoots.filter(s=>s.held==="yes").forEach(s=>getVids(s).forEach(v=>{if(v.stage===3&&!v[r])n++;}));return n;
}
/* Hər işçinin vəziyyəti, balon mətni və qısa növbəsi — real məlumatdan */
function officeInfo(p){
  const pn=p.full_name||p.username,uid=p.id,Q=[];let st="",bub="",away="";
  const q=(c,t,m)=>Q.push([c,String(t||"—"),m||""]);
  const today=new Date();today.setHours(0,0,0,0);
  const tasks=state.tasks.filter(t=>!taskDone(t)&&taskAssignees(t).includes(uid));
  const late=tasks.filter(t=>{const d=parseDate(t.deadline);return d&&d<today;});
  const bt=b=>firstLine(b.title)||"Brif";
  switch(p.role){
    case "designer":{const w=state.briefs.filter(b=>b.status==="İcrada"&&b.designer===pn),a=state.briefs.filter(b=>b.status==="Təsdiq gözləyir"&&b.designer===pn);
      w.forEach(b=>q(b.urgent?"crit":"good",bt(b),b.urgent?"təcili":"icrada"));a.forEach(b=>q("mut",bt(b),"təsdiqdə"));
      if(w.length){const u=w.find(b=>b.urgent);st=u?"urgent":"work";bub=(u?"🔥 ":"")+bt(u||w[0]);}else if(a.length){st="warn";bub=a.length+" iş təsdiqdə";}break;}
    case "motion":{const mo=state.briefs.filter(b=>b.status==="Motion");const w=mo.filter(b=>motionCol(b)==="İcrada"&&b.motion_by===pn),a=mo.filter(b=>motionCol(b)==="Təsdiq gözləyir"&&b.motion_by===pn),wt=mo.filter(b=>!motionCol(b));
      w.forEach(b=>q("good",bt(b),"icrada"));a.forEach(b=>q("mut",bt(b),"təsdiqdə"));
      if(w.length){st="work";bub=bt(w[0]);}else if(wt.length){st="warn";bub=wt.length+" motion gözləyir";}break;}
    case "account":{const P=state.smm_posts.filter(x=>x.account_id===uid&&x.status==="plan");const od=P.filter(x=>Date.now()>=smmDue(x)),td=P.filter(x=>x.post_date===bakuISO()&&Date.now()<smmDue(x));
      const ba=state.briefs.filter(b=>b.status==="Təsdiq gözləyir"&&b.created_by===uid),pr=state.ad_briefs.filter(b=>b.created_by===uid&&b.status==="Problem");
      od.forEach(x=>q("crit",(x.client||"")+" · "+(x.kind==="video"?"Video":"Post"),"gecikir"));pr.forEach(b=>q("crit",firstLine(b.title||b.client),"targeting problemi"));
      ba.forEach(b=>q("warn",bt(b),"təsdiqlə"));td.forEach(x=>q("accent",(x.client||"")+" · "+(x.kind==="video"?"Video":"Post"),"bu gün "+(x.post_time||"")));
      if(od.length){st="urgent";bub=od.length+" paylaşım gecikir";}else if(ba.length){st="warn";bub=ba.length+" dizayn təsdiq gözləyir";}else if(td.length){st="work";bub="Bu gün "+td.length+" paylaşım";}break;}
    case "content":{const mine=state.content.filter(c=>c.created_by===uid);const w=mine.filter(c=>c.status==="Hazırlanır"),a=mine.filter(c=>c.status==="Təsdiq gözləyir");
      w.forEach(c=>q("good",c.title,c.client||""));a.forEach(c=>q("mut",c.title,"təsdiqdə"));
      if(w.length){st="work";bub=w[0].title||"Kontent";}else if(a.length){st="warn";bub=a.length+" kontent təsdiqdə";}break;}
    case "coordinator":{const pend=state.shoots.filter(x=>x.held===""&&(d=>d!=null&&d<0)(ddDays(x.shoot_date))),up=state.shoots.filter(x=>x.held===""&&ddDays(x.shoot_date)===0);
      pend.forEach(x=>q("crit",x.client,"nəticə yazılmayıb"));up.forEach(x=>q("accent",x.client,"bu gün "+(x.shoot_time||"")));
      if(pend.length){st="warn";bub=pend.length+" çəkilişin nəticəsi yazılmayıb";}else if(up.length){st="work";bub="Bu gün "+up.length+" çəkiliş";}break;}
    case "operator":{const mine=state.shoots.filter(x=>(Array.isArray(x.op_ids)&&x.op_ids.includes(uid))||x.video_op===pn||x.photo_op===pn);
      const now=mine.find(x=>x.held===""&&ddDays(x.shoot_date)===0),raw=mine.filter(x=>x.held==="yes"&&getVids(x).some(v=>v.stage===1));
      mine.filter(x=>x.held===""&&(d=>d!=null&&d>=0&&d<=7)(ddDays(x.shoot_date))).forEach(x=>q("accent",x.client,dayWord(ddDays(x.shoot_date))+(x.shoot_time?" "+x.shoot_time:"")));
      raw.forEach(x=>q("warn",x.client,"montaja ötür"));
      if(now){away="📷 Çəkilişdə · "+(now.client||"");st="work";bub=away;}else if(raw.length){st="warn";bub=raw.length+" çəkiliş montaja ötürülməyib";}break;}
    case "editor":{const L=[];state.shoots.filter(x=>x.held==="yes").forEach(x=>getVids(x).forEach((v,i)=>{if(v.stage===2)L.push(x.client+" · Video "+(i+1));}));
      L.forEach(t=>q("good",t,"montaj"));if(L.length){st="work";bub=L.length===1?L[0]:L.length+" video montajda";}break;}
    case "targeting":{const ab=state.ad_briefs;const pr=ab.filter(b=>b.status==="Problem"&&b.taken_by===uid),w=ab.filter(b=>b.status==="Götürüldü"&&b.taken_by===uid),nw=ab.filter(b=>b.status==="Göndərildi");
      pr.forEach(b=>q("crit",firstLine(b.title||b.client),"problem"));w.forEach(b=>q("good",firstLine(b.title||b.client),"reklama qoy"));nw.forEach(b=>q("warn",firstLine(b.title||b.client),"yeni"));
      if(pr.length){st="urgent";bub=pr.length+" problemli reklam";}else if(w.length){st="work";bub="Reklama qoy: "+firstLine(w[0].title||w[0].client);}else if(nw.length){st="warn";bub=nw.length+" yeni brif";}break;}
    case "responder":{st="work";bub="Instagram mesajları";break;}
    default:{if(OFFICE_ROLES.includes(p.role)){const n=ofApprPending(p.role);if(n){st="warn";bub=n+" təsdiq gözləyir";q("warn",n+" iş","təsdiq gözləyir");}
      const mt=state.meetings.find(m=>!m.held&&ddDays(m.meet_date)===0);if(p.role==="pm"&&mt){st="work";bub="İclas: "+(mt.title||"");q("accent",mt.title,"bu gün "+(mt.meet_time||""));}}}
  }
  late.forEach(t=>q("crit",t.title,"task gecikib"));tasks.filter(t=>!late.includes(t)).slice(0,4).forEach(t=>q("accent",t.title,"task"));
  if(late.length&&st!=="urgent"){st="urgent";if(!bub)bub=late.length+" task gecikib";}
  if(!bub){if(tasks.length){st="work";bub=tasks[0].title;}else{st="idle";bub="Növbə boşdur ✓";}}
  const t=actMap[uid];const mins=t?(Date.now()-Date.parse(t))/60e3:1e9;
  const gr=(state.game_live||[]).find(r=>r.status==="playing"&&(r.players||[]).includes(uid)&&Date.now()-Date.parse(r.updated_at)<20*60e3);
  if(gr)return {st:"break",bub:"☕ Fasilədə · "+(GNAME[gr.game]||"oyun"),q:Q,pres:"on",last:t,brk:true};
  const pres=away?"away":mins<5?"on":mins<1440?"today":"off";
  return {st,bub,q:Q,pres,last:t};
}
function renderOffice(){
  actEnsure();
  const wrap=el("div","ofwrap");
  const team=state.profiles.filter(p=>ROLES[p.role]);
  const ceos=team.filter(p=>p.role==="ceo");
  const staff=team.filter(p=>p.role!=="ceo").sort((a,b)=>OF_ORDER.indexOf(a.role)-OF_ORDER.indexOf(b.role)||String(a.full_name||a.username).localeCompare(String(b.full_name||b.username),"az"));
  /* Account Manager-in datası öz məkanları ilə süzülür — ofisdə hamının vəziyyəti tam məlumatdan hesablanmalıdır */
  const sc=scopeOf(),swap=sc?Object.keys(sc).filter(t=>ACC_RAW[t]):[],keep={};swap.forEach(t=>{keep[t]=state[t];state[t]=ACC_RAW[t];});
  const info={};try{team.forEach(p=>{try{info[p.id]=officeInfo(p);}catch(e){console.error("ofis",e);info[p.id]={st:"idle",bub:"—",q:[],pres:"off"};}});}
  finally{swap.forEach(t=>{state[t]=keep[t];});}
  const ST={work:"#46C489",urgent:"#E97767",warn:"#E0A93F",idle:"#8B84A3",brk:"#7FD1C7",break:"#7FD1C7"};
  const QC={good:"var(--good)",crit:"var(--crit)",warn:"var(--warn)",accent:"var(--accent)",mut:"var(--muted)"};
  const nOn=team.filter(p=>info[p.id].pres==="on").length,nUrg=team.filter(p=>info[p.id].st==="urgent").length;
  /* Yerləşmə: solda CEO otağı, sağda 4 sütunlu masalar */
  const COLS=4,rows=Math.max(3,Math.ceil(staff.length/COLS)),GW=6+COLS*3.6,ceoH=Math.max(1,ceos.length)*3.4+1;
  const GH=Math.max(rows*3.8+1.5,ceoH+6.5);
  const TW=64,TH=32,WALL=118;
  const iso=(x,y,z=0)=>[(x-y)*TW/2,(x+y)*TH/2-z];const P=pts=>pts.map(p=>p.join(",")).join(" ");
  const NS="http://www.w3.org/2000/svg";
  const mk=(t,a={},parent)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(parent)parent.appendChild(e);return e;};
  const shade=(hex,f)=>{const n=parseInt(hex.slice(1),16);const m=v=>Math.max(0,Math.min(255,Math.round(f>1?v+(255-v)*(f-1):v*f)));return"#"+[n>>16,n>>8&255,n&255].map(v=>m(v).toString(16).padStart(2,"0")).join("");};
  const box=(g,x,y,z,w,d,h,c,o={})=>{
    mk("polygon",{points:P([iso(x,y+d,z),iso(x+w,y+d,z),iso(x+w,y+d,z+h),iso(x,y+d,z+h)]),fill:o.l||shade(c,.78)},g);
    mk("polygon",{points:P([iso(x+w,y,z),iso(x+w,y+d,z),iso(x+w,y+d,z+h),iso(x+w,y,z+h)]),fill:o.r||shade(c,.62)},g);
    mk("polygon",{points:P([iso(x,y,z+h),iso(x+w,y,z+h),iso(x+w,y+d,z+h),iso(x,y+d,z+h)]),fill:o.t||c},g);};
  const stage=el("div","ofstage");
  const svg=mk("svg",{class:"ofsvg",role:"img","aria-label":"Ofis: "+team.length+" işçi"});const scr=el("div","ofscroll");scr.appendChild(svg);stage.appendChild(scr);
  const items=[],BUBS=[];const add=(depth,fn)=>items.push({depth,fn});
  const floor=mk("g",{},svg);
  for(let x=0;x<Math.ceil(GW);x++)for(let y=0;y<Math.ceil(GH);y++)mk("polygon",{points:P([iso(x,y),iso(x+1,y),iso(x+1,y+1),iso(x,y+1)]),fill:(x+y)%2?"#221C35":"#251F3A",stroke:"#2C2543","stroke-width":.6},floor);
  mk("polygon",{points:P([iso(5.4,.5),iso(GW-.3,.5),iso(GW-.3,GH-.4),iso(5.4,GH-.4)]),fill:"#2A2342",opacity:.7},floor);
  const W=Math.ceil(GW),H=Math.ceil(GH);
  const walls=mk("g",{},svg);
  mk("polygon",{points:P([iso(0,0),iso(W,0),iso(W,0,WALL),iso(0,0,WALL)]),fill:"#2B2444"},walls);
  mk("polygon",{points:P([iso(0,0),iso(0,H),iso(0,H,WALL),iso(0,0,WALL)]),fill:"#231D39"},walls);
  mk("polygon",{points:P([iso(0,0,WALL),iso(W,0,WALL),iso(W,-.25,WALL+4),iso(-.25,-.25,WALL+4),iso(-.25,H,WALL+4),iso(0,H,WALL)]),fill:"#3A3158"},walls);
  const hr=+new Date(Date.now()+4*36e5).toISOString().slice(11,13);
  const sky=hr>=7&&hr<17?["#7FB8F0","#BFDDF7"]:hr>=17&&hr<20?["#F09A6B","#7B6BC8"]:["#1C2A55","#0F1530"];
  const defs=mk("defs",{},svg);const lg=mk("linearGradient",{id:"ofsky",x1:0,y1:0,x2:0,y2:1},defs);mk("stop",{offset:0,"stop-color":sky[1]},lg);mk("stop",{offset:1,"stop-color":sky[0]},lg);
  for(let a=1.6;a+1.6<H-.5;a+=3.6){const b=a+1.6;
    mk("polygon",{points:P([iso(0,a,34),iso(0,b,34),iso(0,b,96),iso(0,a,96)]),fill:"url(#ofsky)",stroke:"#3A3158","stroke-width":3},walls);
    const m1=iso(0,(a+b)/2,34),m2=iso(0,(a+b)/2,96);mk("line",{x1:m1[0],y1:m1[1],x2:m2[0],y2:m2[1],stroke:"#3A3158","stroke-width":2},walls);
    if(hr<7||hr>=20)for(let i=0;i<3;i++){const p=iso(0,a+.3+i*.45,60+i*11);mk("circle",{cx:p[0],cy:p[1],r:1,fill:"#fff",opacity:.7},walls);}}
  /* Divar ekranı */
  {const sx0=W/2-2.6,a=iso(sx0,0,46),c=iso(sx0+5,0,100);const d=iso(sx0,0,100),b=iso(sx0+5,0,46);
   mk("polygon",{points:P([a,b,c,d]),fill:"#120E1E",stroke:"#4B4170","stroke-width":2.5},walls);
   const cx=(a[0]+c[0])/2,cy=(a[1]+c[1])/2;const t=mk("g",{transform:`translate(${cx},${cy}) skewY(26.565)`},walls);
   mk("text",{x:0,y:-10,"text-anchor":"middle",fill:"#9A8BF2","font-family":"Sora","font-weight":700,"font-size":15},t).textContent="MezMoon";
   const doneT=state.tasks.filter(x=>x.approved_at&&bakuISO(Date.parse(x.approved_at))===bakuISO()).length+state.briefs.filter(b=>b.done_at&&bakuISO(Date.parse(b.done_at))===bakuISO()).length;
   mk("text",{x:0,y:8,"text-anchor":"middle",fill:"#C4BDD8","font-family":"Manrope","font-weight":600,"font-size":9.5},t).textContent=`Bu gün: ${doneT} iş bitdi · ${nUrg} təcili`;}
  {const p=iso(W-2,0,80);mk("circle",{cx:p[0],cy:p[1],r:11,fill:"#1D1830",stroke:"#4B4170","stroke-width":2},walls);
   const m=new Date(Date.now()+4*36e5);const hand=(a,l,w)=>mk("line",{x1:p[0],y1:p[1],x2:p[0]+Math.sin(a*Math.PI/180)*l,y2:p[1]-Math.cos(a*Math.PI/180)*l,stroke:"#C4BDD8","stroke-width":w,"stroke-linecap":"round"},walls);
   hand(((m.getUTCHours()%12)+m.getUTCMinutes()/60)*30,5.5,1.8);hand(m.getUTCMinutes()*6,8,1.2);}
  const plant=(x,y,s=1)=>add(x+y+.5,g=>{box(g,x,y,0,.5*s,.5*s,16*s,"#5B4A7A");const c=iso(x+.25*s,y+.25*s,30*s);
    [[-7,4,10],[6,3,9],[0,-6,11],[-3,-1,9]].forEach(([dx,dy,r],i)=>mk("circle",{cx:c[0]+dx*s,cy:c[1]+dy*s,r:r*s,fill:["#3FA36F","#4DBB7F","#36905F","#58C98A"][i]},g));});
  function person(g,x,y,p){
    const I=info[p.id],ghost=I.pres==="off"||I.pres==="away";const [sx,sy]=iso(x,y,10);
    const grp=mk("g",{class:"ofp "+I.st+(ghost?" ghost":I.pres==="today"?" dim":""),tabindex:0,role:"button","data-id":p.id,"aria-label":(p.full_name||p.username)+" — "+I.bub},g);
    const fig=mk("g",{class:"offig"},grp);const nm=p.full_name||p.username;
    if(!ghost){const body=mk("g",{class:"ofbody"},fig);mk("ellipse",{cx:sx,cy:sy+2,rx:16,ry:6,fill:"#000",opacity:.2},fig);
      if(avSrc(p))mk("image",{href:avSrc(p),x:sx-38,y:sy-68,width:76,height:76,preserveAspectRatio:"xMidYMax meet"},body);
      else{const col=ROLE_COL[p.role]||"#9A8BF2";mk("path",{d:`M${sx-12} ${sy} q0 -24 12 -24 q12 0 12 24 z`,fill:shade(col,.62)},body);
        mk("circle",{cx:sx,cy:sy-33,r:10.5,fill:col},body);mk("text",{x:sx,y:sy-29.2,"text-anchor":"middle","font-family":"Sora","font-weight":700,"font-size":11,fill:"#140F24"},body).textContent=nm[0].toUpperCase();}}
    else{mk("circle",{cx:sx,cy:sy-33,r:10.5,fill:"none",stroke:"#8B84A3","stroke-width":1.5,"stroke-dasharray":"3 3"},fig);
      mk("text",{x:sx,y:sy-29.2,"text-anchor":"middle","font-family":"Sora","font-weight":700,"font-size":11,fill:"#8B84A3"},fig).textContent=nm[0].toUpperCase();}
    const hasAv=!!avSrc(p)&&!ghost,dc=ST[I.st],dx=hasAv?sx+26:sx+9,dy=hasAv?sy-58:sy-42;
    if(I.st==="urgent"&&!ghost)mk("circle",{cx:dx,cy:dy,r:4,fill:"none",stroke:dc,"stroke-width":2,class:"ofring"},fig);
    mk("circle",{cx:dx,cy:dy,r:4.5,fill:ghost?"none":dc,stroke:ghost?dc:"#1D1830","stroke-width":1.5,"stroke-dasharray":ghost?"2 2":"0"},fig);
    BUBS.push({p,sx,sy});
  }
  function desk(x,y,p){
    add(x+y-.2,g=>{box(g,x+1.1,y-.1,0,.5,.5,12,"#3B3256");box(g,x+1.1,y-.17,12,.5,.08,22,"#463C66");if(p&&!info[p.id].brk)person(g,x+1.35,y+.15,p);});
    add(x+y+1.5,g=>{box(g,x,y+.55,0,2,.95,20,"#4A3F6B",{t:"#5C5085"});
      const I=p&&info[p.id],on=I&&I.pres!=="off"&&I.pres!=="away";
      box(g,x+.35,y+.62,20,.7,.08,26,"#15111F",{t:"#2B2440"});box(g,x+.62,y+.68,20,.12,.12,4,"#2B2440");
      if(on){const a=iso(x+.35,y+.62,46),b=iso(x+1.05,y+.62,46);mk("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:I.st==="urgent"?"#E97767":"#9A8BF2","stroke-width":2.5,"stroke-linecap":"round",class:"ofglow"},g);}
      box(g,x+.9,y+.9,20,.55,.22,1.5,"#2E2747");box(g,x+1.65,y+1.15,20,.14,.14,6,"#EDE8FD");
      if(on&&I.st!=="idle"){const s=iso(x+1.72,y+1.22,30);mk("path",{d:`M${s[0]} ${s[1]} q3 -5 0 -9 q-3 -4 0 -8`,stroke:"#C4BDD8","stroke-width":1.2,fill:"none",class:"ofsteam"},g);}});
  }
  /* CEO otağı */
  add(4.2,g=>mk("polygon",{points:P([iso(4.5,0,0),iso(4.5,ceoH,0),iso(4.5,ceoH,70),iso(4.5,0,70)]),fill:"#9A8BF2",opacity:.07,stroke:"#6E5AE6","stroke-opacity":.35},g));
  add(ceoH+1.5,g=>mk("polygon",{points:P([iso(0,ceoH,0),iso(3.1,ceoH,0),iso(3.1,ceoH,70),iso(0,ceoH,70)]),fill:"#9A8BF2",opacity:.07,stroke:"#6E5AE6","stroke-opacity":.35},g));
  ceos.forEach((p,i)=>desk(1.6,1.2+i*3.4,p));
  staff.forEach((p,i)=>desk(6+(i%COLS)*3.6,1.2+Math.floor(i/COLS)*3.8,p));
  /* İclas masası, divan, qəhvə, bitkilər */
  const my=ceoH+1.6;
  add(1+my+1.4,g=>box(g,.9,my,0,2.6,1.4,18,"#5C5085",{t:"#6B5E99"}));
  [[1.3,my-.5],[2.4,my-.5]].forEach(([x,y])=>add(x+y,g=>box(g,x,y,0,.45,.4,13,"#3B3256")));
  add(.6+GH-1,g=>{box(g,.4,GH-1.4,0,2.4,.9,10,"#6E5AE6",{t:"#7D6BEA"});box(g,.4,GH-1.4,10,2.4,.25,14,"#5B48D0");});
  add(GW-1,g=>{box(g,W-1.2,.3,0,.9,.6,30,"#2E2747");box(g,W-1.05,.32,30,.6,.45,10,"#3A3158");const c=iso(W-.9,.6,30);mk("circle",{cx:c[0],cy:c[1]-4,r:2.2,fill:"#46C489"},g);});
  /* İstirahət küncü: oyun masası + divan; oynayanlar burada oturur */
  {const gy=GH-3.2;add(.4+gy,g=>mk("polygon",{points:P([iso(.3,gy-.9),iso(3.6,gy-.9),iso(3.6,GH-.3),iso(.3,GH-.3)]),fill:"#3B2F5E",opacity:.55},g));
   add(1.4+gy+.8,g=>{box(g,1.3,gy,0,1.3,.8,15,"#7FD1C7",{t:"#9BE0D8"});const c=iso(1.95,gy+.4,15);mk("rect",{x:c[0]-9,y:c[1]-5,width:8,height:8,rx:2,fill:"#fff",transform:`rotate(20 ${c[0]-5} ${c[1]-1})`},g);mk("rect",{x:c[0]+2,y:c[1]-3,width:8,height:8,rx:2,fill:"#fff",transform:`rotate(-15 ${c[0]+6} ${c[1]+1})`},g);});
   const seats=[[1.5,gy-.45],[2.5,gy-.45],[.9,GH-.95],[1.7,GH-.95],[2.5,GH-.95],[3.3,gy+.6],[3.3,gy-.3],[.6,gy+.4]];
   team.filter(p=>info[p.id].brk).slice(0,seats.length).forEach((p,i)=>{const [x,y]=seats[i];add(x+y+.05,g=>person(g,x,y,p));});}
  plant(3.8,.3,1.1);plant(W-.8,H-1.1,1.2);plant(4.6,H-1.1,1);plant(W-.7,H/2,.9);
  items.sort((a,b)=>a.depth-b.depth).forEach(it=>it.fn(mk("g",{},svg)));
  /* Balonlar ən üst qatda, üst-üstə düşməsin */
  {const top=mk("g",{},svg),placed=[];
   BUBS.sort((a,b)=>b.sy-a.sy).forEach(({p,sx,sy})=>{
     const I=info[p.id],nm=String(p.full_name||p.username).split(/[\s@.]/)[0];const txt=I.bub.length>24?I.bub.slice(0,23)+"…":I.bub;
     const w=Math.max(90,(txt.length+nm.length)*7.5+46),h=28;let by=sy-80;
     const hit=y=>placed.some(r=>Math.abs(r.x-sx)<(r.w+w)/2+6&&Math.abs(r.y-y)<h+5);let gd=0;while(hit(by)&&gd++<30)by-=8;placed.push({x:sx,y:by,w});
     const bg=mk("g",{class:"ofbub"+(I.pres==="off"?" ghost":""),"data-id":p.id},top);
     if(sy-80-by>2)mk("line",{x1:sx,y1:by+14,x2:sx,y2:sy-50,stroke:"#4B4170","stroke-width":1.2,"stroke-dasharray":"2 3"},bg);
     mk("rect",{x:sx-w/2,y:by-h/2,width:w,height:h,rx:12,fill:"#1D1830",stroke:I.st==="urgent"?"#E97767":"#3A3158","stroke-width":1.2},bg);
     mk("path",{d:`M${sx-5} ${by+13.5} l5 6 l5 -6 z`,fill:"#1D1830"},bg);
     mk("circle",{cx:sx-w/2+14,cy:by,r:4,fill:ST[I.st]},bg);
     const t=mk("text",{x:sx-w/2+24,y:by+4.3,"font-family":"Manrope","font-size":12,fill:"#F1EEFA"},bg);
     const t1=mk("tspan",{"font-weight":700,fill:"#C7BEFB"},t);t1.textContent=nm+"  ";const t2=mk("tspan",{"font-weight":600},t);t2.textContent=txt;});}
  /* Kart */
  const card=el("div","ofcard");card.setAttribute("role","dialog");stage.appendChild(card);
  const STL={work:"İşləyir",urgent:"Təcili / gecikən işi var",warn:"Gözləyən işi var",idle:"Növbə boşdur",break:"Fasilədə"};
  const open=id=>{const p=team.find(x=>x.id===id);if(!p)return;ofSel=id;const I=info[id],nm=p.full_name||p.username;
    stage.classList.add("dimmed");svg.querySelectorAll("[data-id]").forEach(e=>e.classList.toggle("sel",e.dataset.id===id));
    const pres=I.pres==="on"?"onlayn":I.pres==="away"?"çöldə":I.last?"son aktivlik "+fmtWhen(I.last):"panelə girməyib";
    card.innerHTML=`<div class="h"><div class="av" style="${avSrc(p)?`background-image:url('${avSrc(p)}')`:`background:${ROLE_COL[p.role]||"var(--accent)"}`}">${avSrc(p)?"":esc(nm[0].toUpperCase())}</div><div style="min-width:0"><div class="nm">${esc(nm)}</div><div class="rl">${esc(ROLES[p.role].label)} · ${esc(pres)}</div></div><button class="x" aria-label="Bağla">×</button></div>
      <div class="st"><span style="color:${ST[I.st]}">●</span> ${I.st==="idle"?esc(I.bub):STL[I.st]+" · "+esc(I.bub)}</div>
      ${I.q.length?`<ul>${I.q.slice(0,8).map(([c,t,m])=>`<li><i style="background:${QC[c]}"></i><span>${esc(t)}</span><em>${esc(m)}</em></li>`).join("")}</ul>`:`<div class="st" style="margin:0 0 6px">Növbədə iş yoxdur ✓</div>`}`;
    card.classList.add("on");card.querySelector(".x").onclick=close;};
  const close=()=>{ofSel="";card.classList.remove("on");stage.classList.remove("dimmed");svg.querySelectorAll(".sel").forEach(e=>e.classList.remove("sel"));};
  svg.addEventListener("click",e=>{const g=e.target.closest("[data-id]");if(g)open(g.dataset.id);else close();});
  svg.addEventListener("keydown",e=>{const g=e.target.closest("[data-id]");if(g&&(e.key==="Enter"||e.key===" ")){e.preventDefault();open(g.dataset.id);}});
  const clk=el("div","ofclock",`Bakı ${new Date(Date.now()+4*36e5).toISOString().slice(11,16)} · <b>${nOn}</b> nəfər onlayn · ${team.length} nəfər komanda`);stage.appendChild(clk);
  const legend=el("div","oflegend",`<span><i style="background:#46C489"></i>İşləyir</span><span><i style="background:#E97767"></i>Təcili / gecikən</span><span><i style="background:#E0A93F"></i>Gözləyir</span><span><i style="background:#8B84A3"></i>Növbə boş</span><span><i style="background:#7FD1C7"></i>Fasilədə</span><span><i class="dash"></i>Oflayn / çöldə</span>`);
  wrap.append(legend,stage);
  requestAnimationFrame(()=>{try{const bb=svg.getBBox();svg.setAttribute("viewBox",`${bb.x-20} ${bb.y-20} ${bb.width+40} ${bb.height+40}`);}catch(e){}if(ofSel)open(ofSel);});
  return wrap;
}
const ROLE_COL={ceo:"#9A8BF2",pm:"#E9C46A",marketing:"#F4A261",account:"#FFB4A2",designer:"#F2A7C9",motion:"#7FD1C7",content:"#CDB4DB",coordinator:"#A8DADC",operator:"#F5D76E",editor:"#8FB8F5",responder:"#A0C4FF",targeting:"#B5E48C"};
/* ---------- Avatarlar: profiles.avatar = "sb:<storage yolu>" və ya data URL; imzalı linklər saatda bir yenilənir ---------- */
const AVATAR_FN=SB_URL+"/functions/v1/avatar-gen";
let avUrls={},avAt=0,avBusy=null;
function avSrc(p){const a=p&&p.avatar;if(!a)return "";if(a.startsWith("data:"))return a;if(a.startsWith("sb:"))return avUrls[a.slice(3)]||"";return "";}
async function avResolve(force){
  const paths=[...new Set(state.profiles.map(p=>p.avatar).filter(a=>a&&a.startsWith("sb:")).map(a=>a.slice(3)))];
  const miss=paths.filter(x=>!avUrls[x]);
  if(!paths.length||(!force&&!miss.length&&Date.now()-avAt<50*60e3))return false;
  if(avBusy)return avBusy;
  avBusy=(async()=>{try{const {data}=await sb.storage.from('crm-files').createSignedUrls(force?paths:(Date.now()-avAt<50*60e3?miss:paths),3600);
    (data||[]).forEach(x=>{if(x.signedUrl)avUrls[x.path]=x.signedUrl;});avAt=Date.now();return true;}catch(e){return false;}finally{avBusy=null;}})();
  return avBusy;
}
/* Profillər yüklənəndən sonra çağırılır: yeni avatar varsa ekranı yenilə */
function avAfterLoad(){avResolve().then(ch=>{if(ch&&role&&(view==="ofis"||$(".topbar")))render();});}
setInterval(()=>{if(document.visibilityState==="visible"&&role)avAfterLoad();},10*60e3);
const OUTFIT_CAT={
  m:[["blazer","Blazer + futbolka","#2B3A67"],["suit","Kostyum + qalstuk","#4A4E58"],["shirt","Oksford köynək","#8DB7E8"],["sweater","Sviter","#D8C3A0"],["hoodie","Hudi","#3C3C44"],["polo","Polo","#22356B"],["denim","Cins gödəkcə","#7EA6CF"]],
  f:[["blazer","Blazer + bluz","#1E1E22"],["blouse","İpək bluz","#D9A5A8"],["sweater","Sviter","#EDE3CF"],["cardigan","Kardiqan","#C8B6E2"],["shirt","Ağ köynək","#F2F2F2"],["dress","Ofis donu","#23305A"],["hoodie","Hudi","#CDBEF0"]],
  u:[["brand","MezMoon futbolkası","#6E5AE6"]]};
/* Geyim nümunəsi: hazır şəkil (outfits/<g>-<id>.webp), yüklənməsə rəng nişanı */
const outfitImg=(g,o)=>`<span class="pfoimg" style="--oc:${o[2]}"><img src="outfits/${g}-${o[0]}.webp?v=1" alt="" loading="lazy" onerror="this.remove()"></span>`;
const outfitName=id=>{if(!id||id==="import")return "Başlanğıc";const [g,k]=id.split(":");const L=(OUTFIT_CAT[g]||[]).concat(OUTFIT_CAT.u);const o=L.find(x=>x[0]===k);return o?o[1]:id;};
/* Selfini 1280px JPEG-ə kiçilt (yükləmə sürətli olsun) */
function shrinkImage(file,max=1280){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?res(b):rej(new Error("Şəkil oxunmadı")),"image/jpeg",.88);};im.onerror=()=>rej(new Error("Şəkil oxunmadı"));im.src=u;});}
/* Ad Soyad məcburidir: yazılmayana qədər panel bu pəncərə ilə bağlı qalır */
const NAME_RE=/^[^\s\d]{2,}( [^\s\d]{2,})+$/;
const needsName=p=>!!p&&!NAME_RE.test(String(p.full_name||"").trim().replace(/\s+/g," "));
function showNameGate(){
  if($(".namegate"))return;
  const scrim=el("div","scrim namegate");
  scrim.innerHTML=`<div class="modal" style="max-width:420px" role="dialog" aria-labelledby="ng-t"><div class="mh"><h3 id="ng-t">Ad və soyadını yaz</h3></div>
    <div class="mb"><div class="hint" style="font-size:13px;line-height:1.5;font-family:var(--fbody)">Komanda səni tasklarda, briflərdə və Ofisdə bu adla görəcək. İstifadəçi adın (<b>${esc(me.username||"")}</b>) dəyişmir.</div>
    <div class="field"><label for="ng-n">Ad Soyad</label><input id="ng-n" maxlength="40" autocomplete="name" placeholder="məs. Aysel Məmmədova" value="${esc(String(me.full_name||"").trim())}"></div>
    <div class="hint" id="ng-e" style="color:var(--crit);min-height:16px;font-family:var(--fbody)"></div></div>
    <div class="mf"><button class="btn" id="ng-s">Davam et</button></div></div>`;
  document.body.appendChild(scrim);
  const inp=scrim.querySelector("#ng-n"),err=scrim.querySelector("#ng-e"),btn=scrim.querySelector("#ng-s");
  setTimeout(()=>inp.focus(),50);
  const save=async()=>{const v=inp.value.trim().replace(/\s+/g," ");
    if(!NAME_RE.test(v)){err.textContent="Ad və soyadı boşluqla yaz, hər biri ən azı 2 hərf";inp.focus();return;}
    btn.disabled=true;btn.textContent="Saxlanır…";const {error}=await sb.rpc("set_my_name",{n:v});
    if(error){err.textContent=error.message;btn.disabled=false;btn.textContent="Davam et";return;}
    await reloadProfiles();me=state.profiles.find(x=>x.id===me.id)||Object.assign(me,{full_name:v});await reload("briefs");
    scrim.remove();toast("✓ Xoş gəldin, "+v.split(" ")[0]+"!","ok");render();};
  btn.onclick=save;inp.onkeydown=e=>{if(e.key==="Enter")save();};
}
function openProfile(){
  if(!me)return;
  const scrim=el("div","scrim");
  scrim.innerHTML=`<div class="modal pfmodal" role="dialog" aria-labelledby="pf-t"><div class="mh"><h3 id="pf-t">Profilim</h3><button aria-label="Bağla" data-x>×</button></div><div class="mb" id="pf-b"></div></div>`;
  document.body.appendChild(scrim);
  const close=()=>{clearTimeout(pollT);scrim.remove();};
  scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const b=scrim.querySelector("#pf-b");let info=null,pollT=0,busy=false;
  const meP=()=>state.profiles.find(p=>p.id===me.id)||me;
  async function load(){info=await fnCall(AVATAR_FN,{action:"list"});draw();const p=(info.gens||[]).find(g=>g.status==="pending");if(p)poll(p.id);}
  function poll(id){clearTimeout(pollT);pollT=setTimeout(async()=>{if(!scrim.isConnected)return;const r=await fnCall(AVATAR_FN,{action:"poll",id});
    if(r.status==="pending")poll(id);else{if(r.status==="failed")toast("Avatar alınmadı: "+(r.error||""),"err");else toast("✅ Yeni avatar hazırdır — bəyəndinsə «Seç»-ə bas","ok");load();}},6000);}
  function draw(){
    const p=meP(),src=avSrc(p),gs=info&&info.gens||[],g=p.gender||"";
    const hasBase=gs.some(x=>x.kind==="base"&&x.status==="done"),pend=gs.find(x=>x.status==="pending");
    const left=info?Math.max(0,(info.quota||3)-(info.used||0)):0;
    const cat=g?[...(OUTFIT_CAT[g]||[]),...OUTFIT_CAT.u]:[];
    b.innerHTML=`<div class="pfhead"><div class="pfav">${src?`<img src="${esc(src)}" alt="">`:`<span>${esc((myName()||"?")[0].toUpperCase())}</span>`}</div>
      <div style="min-width:0;flex:1"><div class="field"><label for="pf-n">Ad Soyad</label><div class="pfrow"><input id="pf-n" maxlength="40" autocomplete="name" value="${esc(p.full_name||"")}" placeholder="məs. Aysel Məmmədova"><button class="btn sm" id="pf-ns">Saxla</button></div></div>
      <div class="hint" style="margin-top:6px">Vəzifə: <b>${esc(ROLES[role].label)}</b> · dəyişmək üçün CEO-ya müraciət et</div></div></div>
      <div class="field"><label>Avatar üçün</label><div class="seg pfseg" style="margin:0"><button data-g="m" class="${g==="m"?"on":""}">Oğlan</button><button data-g="f" class="${g==="f"?"on":""}">Qız</button></div></div>
      <div class="pfsec"><div class="pfsh"><b>3D avatar</b><span class="hint">${info?`${left} / ${info.quota||3} generasiya qalıb`:"yüklənir…"}</span></div>
      ${pend?`<div class="pfpend"><span class="pfspin"></span>Avatar hazırlanır — təxminən 1 dəqiqə. Pəncərəni bağlaya bilərsən.</div>`:""}
      ${!g?`<div class="hint">Əvvəlcə yuxarıda «Oğlan» və ya «Qız» seç — geyimlər buna görə göstərilir.</div>`:
        !hasBase?`<div class="hint" style="margin-bottom:8px">Selfi yüklə — üzün aydın görünsün, işıq yaxşı olsun. Selfi yalnız avatar yaradılarkən istifadə olunur və dərhal silinir.</div>
          <div class="field"><label for="pf-f">Selfi</label><input type="file" id="pf-f" accept="image/*"></div>
          <div class="field"><label>Geyim</label><div class="pfcat">${cat.map((o,i)=>`<button class="pfo${i===0?" on":""}" data-o="${(o[0]==="brand"?"u":g)+":"+o[0]}">${outfitImg(g,o)}<span>${esc(o[1])}</span></button>`).join("")}</div></div>
          <label class="pfok"><input type="checkbox" id="pf-c"> Şəklimin avatar yaratmaq üçün istifadəsinə razıyam</label>
          <button class="btn" id="pf-go" ${left&&!pend?"":"disabled"} style="margin-top:10px">Avatar yarat (1 generasiya)</button>`:
        `<div class="hint" style="margin-bottom:8px">Geyim dolabı — geyimə bas, avatarın həmin paltarla yenidən çəkilir (1 generasiya). Köhnə geyimlərə qayıtmaq pulsuzdur.</div>
          <div class="pfcat">${cat.map(o=>`<button class="pfo" data-w="${(o[0]==="brand"?"u":g)+":"+o[0]}" ${left&&!pend?"":"disabled"}>${outfitImg(g,o)}<span>${esc(o[1])}</span></button>`).join("")}</div>`}
      ${gs.filter(x=>x.status==="done").length?`<div class="pfsh" style="margin-top:14px"><b>Mənim avatarlarım</b></div><div class="pfgal">${gs.filter(x=>x.status==="done").map(x=>{const cur=p.avatar&&p.avatar.slice(3).startsWith(x.path.replace(/\.png$/,""));
          return `<div class="pfg${cur?" cur":""}"><img src="${esc(x.url)}" alt="" loading="lazy"><div class="pfgl">${esc(outfitName(x.outfit))}</div>${cur?`<span class="chip c-good">Hazırkı</span>`:`<button class="mini" data-sel="${x.id}">Seç</button>`}</div>`;}).join("")}</div>`:""}
      ${gs.filter(x=>x.status==="failed").length?`<div class="hint" style="margin-top:8px">Alınmayan cəhdlər limitdən çıxılmır.</div>`:""}</div>`;
    b.querySelector("#pf-ns").onclick=async()=>{const v=b.querySelector("#pf-n").value.trim().replace(/\s+/g," ");if(!NAME_RE.test(v)){toast("Ad və soyadı boşluqla yaz (hər biri ən azı 2 hərf)","err");return;}const {error}=await sb.rpc("set_my_name",{n:v});
      if(error){toast(error.message,"err");return;}await reloadProfiles();me=state.profiles.find(x=>x.id===me.id)||me;await reload("briefs");toast("✓ Ad yeniləndi","ok");render();draw();};
    b.querySelectorAll("[data-g]").forEach(x=>x.onclick=async()=>{const {error}=await sb.rpc("set_my_gender",{g:x.dataset.g});if(error){toast(error.message,"err");return;}await reloadProfiles();draw();});
    b.querySelectorAll(".pfcat [data-o]").forEach(x=>x.onclick=()=>{b.querySelectorAll(".pfcat [data-o]").forEach(y=>y.classList.toggle("on",y===x));});
    const go=b.querySelector("#pf-go");
    if(go)go.onclick=async()=>{if(busy)return;const f=b.querySelector("#pf-f").files[0];const o=b.querySelector(".pfcat .on");
      if(!f){toast("Selfi seç","err");return;}if(!b.querySelector("#pf-c").checked){toast("Razılıq qutusunu işarələ","err");return;}
      busy=true;go.disabled=true;go.textContent="Yüklənir…";
      try{const blob=await shrinkImage(f);const path=`avatars/${me.id}/selfie-${Date.now()}.jpg`;
        const {error}=await sb.storage.from('crm-files').upload(path,blob,{contentType:"image/jpeg",upsert:true});if(error)throw error;
        const r=await fnCall(AVATAR_FN,{action:"create",selfie_path:path,outfit:o.dataset.o});if(!r.ok)throw new Error(r.error);
        toast("Avatar hazırlanır — təxminən 1 dəqiqə","ok");await load();}catch(e){toast("Alınmadı: "+(e.message||e),"err");}finally{busy=false;}};
    b.querySelectorAll("[data-w]").forEach(x=>x.onclick=async()=>{if(busy)return;if(!confirm(`«${x.querySelector("span:last-child").textContent.trim()}» geyimi ilə yeni avatar? 1 generasiya istifadə olunacaq (${left} qalıb).`))return;
      busy=true;const r=await fnCall(AVATAR_FN,{action:"outfit",outfit:x.dataset.w});busy=false;if(!r.ok){toast(r.error||"Alınmadı","err");return;}toast("Yeni geyim hazırlanır — təxminən 1 dəqiqə","ok");load();});
    b.querySelectorAll("[data-sel]").forEach(x=>x.onclick=async()=>{x.disabled=true;const r=await fnCall(AVATAR_FN,{action:"select",id:+x.dataset.sel});
      if(!r.ok){toast(r.error||"Alınmadı","err");x.disabled=false;return;}await reloadProfiles();await avResolve(true);toast("✓ Avatar yeniləndi","ok");render();draw();});
  }
  draw();load();
}

/* ---------- İstirahət zonası: oyunlar ayrıca modulda (lounge.js), yalnız açılanda yüklənir ---------- */
const GNAME={uno:"UNO",dama:"Şaşki",nerd:"Nərd",quiz:"Brend viktorinası"};
const gameSubs=new Set(),gameInvSeen=new Set();
if(!state.game_live)state.game_live=[];
function gameEvt(p){
  gameSubs.forEach(cb=>{try{cb(p);}catch(e){console.error("lounge",e);}});
  const n=p.new&&p.new.id?p.new:null;
  state.game_live=(state.game_live||[]).filter(r=>r.id!==(n?n.id:p.old&&p.old.id));
  if(n&&(n.status==="waiting"||n.status==="playing"))state.game_live.push(n);
  if(n&&me&&n.status==="waiting"&&(n.invited||[]).includes(me.id)&&!(n.players||[]).includes(me.id)&&!gameInvSeen.has(n.id)){
    gameInvSeen.add(n.id);if(view!=="lounge")toast(`🎮 ${personName(n.host)} səni «${GNAME[n.game]}» oyununa dəvət edir — «İstirahət» bölməsinə keç`,"ok");}
  if(view==="ofis"){clearTimeout(gameEvt.t);gameEvt.t=setTimeout(()=>{if(view==="ofis")render();},900);}
}
function myUrgentCount(){
  const today=new Date();today.setHours(0,0,0,0);
  const t=state.tasks.filter(x=>!taskDone(x)&&taskIsMine(x)&&(x.urgent||(d=>d&&d<today)(parseDate(x.deadline)))).length;
  const b=state.briefs.filter(x=>x.urgent&&(x.status==="İcrada"||x.status==="Motion")&&(x.designer===myName()||x.motion_by===myName())).length;
  return t+b+(role==="account"?smmOverdue().length:0);
}
function loungeCtx(){return {appVersion:APP_VERSION,sb,me:()=>me,state,esc,toast,avSrc,pname:personName,isMgr:()=>TASK_MANAGERS.includes(role),urgentCount:myUrgentCount,
  online:()=>Object.keys(actMap).filter(id=>Date.now()-Date.parse(actMap[id])<10*60e3),team:()=>state.profiles.filter(p=>ROLES[p.role]).map(p=>p.id),
  onGame:cb=>{gameSubs.add(cb);return ()=>gameSubs.delete(cb);},
  notify:t=>{try{if("Notification" in window&&Notification.permission==="granted")new Notification("MezMoon",{body:t,icon:"/icon-192.png"});}catch(e){}}};}
/* ---------- AI Subtitr: ayrıca modulda (subtitles.js), yalnız açılanda yüklənir; ekran yenilənəndə eyni element qalır (video itmir) ---------- */
let subsMod=null,subsBox=null;
function subsCtx(){return {sb,sbUrl:SB_URL,sbKey:SB_KEY,state,esc,toast,fnCall,getVids,uploadTo,clientOk:c=>pmClientOk(c)};}
function renderSubs(){
  if(subsBox&&subsMod){if(lastRenderView!=="subs")setTimeout(()=>subsMod.mount(subsBox,subsCtx()),0);return subsBox;}
  subsBox=el("div");subsBox.appendChild(el("div","empty","Yüklənir…"));
  import("./subtitles.js?v="+APP_VERSION).then(m=>{subsMod=m;m.mount(subsBox,subsCtx());})
    .catch(e=>{subsBox.innerHTML=`<div class="empty">AI Subtitr yüklənmədi: ${esc(e.message||e)}</div>`;subsMod=null;});
  return subsBox;
}
let loungeMod=null,loungeBox=null;
/* Ekran canlı yenilənəndə lounge yenidən qurulmur — eyni element geri qoyulur (oyun vəziyyəti itmir) */
function renderLounge(){
  actEnsure();
  if(loungeBox&&loungeMod){if(lastRenderView!=="lounge")setTimeout(()=>loungeMod.mount(loungeBox,loungeCtx()),0);return loungeBox;}
  loungeBox=el("div");loungeBox.appendChild(el("div","empty","Yüklənir…"));
  import("./lounge.js?v="+APP_VERSION).then(m=>{loungeMod=m;m.mount(loungeBox,loungeCtx());})
    .catch(e=>{loungeBox.innerHTML=`<div class="empty">İstirahət zonası yüklənmədi: ${esc(e.message||e)}</div>`;loungeMod=null;});
  return loungeBox;
}
function goView(id,push){if(id==="posters"){pst.rows=null;pst.open=null;}if(id==="audit")auditRows=null;if(id==="attendance"){att.data=null;lgRows=null;}if(id==="igstats"){igsCache={};reload("ig_accounts");}
  if(push&&id!==view)history.pushState(null,"",location.pathname+location.search+"#"+id);view=id;render();}
function navItem(id,ic,label,count){const a=el("a",view===id?"active":"");a.href="#"+id;if(view===id)a.setAttribute("aria-current","page");a.innerHTML=`<span class="ic">${ic}</span><span class="lbl">${label}</span>${count!=null?`<span class="count">${count}</span>`:""}`;a.onclick=e=>{if(e.metaKey||e.ctrlKey||e.shiftKey)return;e.preventDefault();goView(id,true);};return a;}
/* Bölmə URL-də saxlanır (#tasks): yeniləmədə itmir, brauzerin «geri» düyməsi işləyir, link paylaşmaq olur */
const hashView=()=>{const h=decodeURIComponent(location.hash.slice(1));return VIEWS[h]?h:"";};
addEventListener("popstate",()=>{const h=hashView();if(!h||!role||h===view)return;if(document.querySelector(".scrim"))document.querySelectorAll(".scrim").forEach(x=>x.remove());goView(h,false);});
/* Menyu qrupları — uzun siyahını oxunaqlı edir */
const NAV_GROUPS=[["Ümumi",["dash","todo","ofis","tasks","lounge"]],["Müştərilər",["clients","leads","meetings","reports"]],["Produksiya",["content","briefs","posters","shoots","delivery","videos","subs"]],["Marketinq",["smm","adbriefs","ads","igstats","igmsg"]],["İdarəetmə",["finance","team","attendance","audit"]]];
/* Bildiriş (toast): alert() kimi işi bloklamır */
function toast(msg,kind){let box=$(".toasts");if(!box){box=el("div","toasts");box.setAttribute("role","status");box.setAttribute("aria-live","polite");document.body.appendChild(box);}
  msg=String(msg??"");if(!kind)kind=/^(xəta|⚠|❌)|xəta|alınmadı|qoşulmadı|uğursuz|error|failed/i.test(msg)?"err":/^✅|✓/.test(msg)?"ok":"";
  const t=el("div","toast"+(kind?" "+kind:""));const tx=el("div","tx");tx.textContent=msg;const x=el("button","","×");x.setAttribute("aria-label","Bağla");
  t.append(tx,x);box.appendChild(t);while(box.children.length>4)box.firstChild.remove();
  const close=()=>{if(!t.isConnected)return;t.classList.add("out");setTimeout(()=>t.remove(),170);};x.onclick=close;
  let tm=setTimeout(close,kind==="err"?9000:Math.min(12000,3500+msg.length*45));t.onmouseenter=()=>clearTimeout(tm);t.onmouseleave=()=>{tm=setTimeout(close,2500);};}
window.alert=m=>toast(m);
/* Tarix sahəsinin istənilən yerinə basanda təqvim açılır (yalnız kiçik ikona yox) */
document.addEventListener("click",e=>{const i=e.target&&e.target.closest&&e.target.closest("input[type=date],input[type=datetime-local],input[type=month],input[type=time]");if(i&&!i.disabled&&!i.readOnly&&i.showPicker)try{i.showPicker();}catch(_){}});
/* Canlı bağlantı nişanı: realtime + internet vəziyyəti */
let rtStatus="",netOn=navigator.onLine!==false;
function updLive(){const b=$("#livebadge");if(!b)return;const off=!netOn,ok=netOn&&rtStatus==="SUBSCRIBED";
  b.className="cloudbadge"+(off?" off":ok?"":" wait");b.textContent=off?"● Oflayn":ok?"● Canlı":"● Qoşulur…";
  b.title=off?"İnternet bağlantısı yoxdur — dəyişikliklər saxlanmaya bilər":ok?"Dəyişikliklər canlı yenilənir":"Canlı yenilənmə bərpa olunur…";}
addEventListener("online",()=>{netOn=true;updLive();toast("✓ İnternet bərpa olundu","ok");if(role)loadAll().then(()=>render());});
addEventListener("offline",()=>{netOn=false;updLive();toast("İnternet bağlantısı kəsildi — dəyişikliklər saxlanmaya bilər.","err");});
const IS_MAC=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent);
/* Canlı yenilənmədə (realtime → render) sürüşdürmə yeri itməsin: eyni bölmədədirsə əvvəlki yerə qaytarılır */
let lastRenderView="",renderSeq=0;
function grabScroll(){
  const m=$("main"),n=$(".nav"),k=$("main .kan");
  return {view:lastRenderView,win:window.scrollY,main:m?m.scrollTop:0,mainX:m?m.scrollLeft:0,nav:n?[n.scrollLeft,n.scrollTop]:null,
    kan:k?k.scrollLeft:0,cols:[...document.querySelectorAll("main .kan .col")].map(c=>c.scrollTop),
    wraps:[...document.querySelectorAll("main .tablewrap")].map(w=>w.scrollLeft)};
}
function putScroll(sv,sameView){
  const n=$(".nav");if(n&&sv.nav){n.scrollLeft=sv.nav[0];n.scrollTop=sv.nav[1];}
  if(!sameView)return;
  const m=$("main");if(m){m.scrollTop=sv.main;m.scrollLeft=sv.mainX;}
  const k=$("main .kan");if(k)k.scrollLeft=sv.kan;
  document.querySelectorAll("main .kan .col").forEach((c,i)=>{if(sv.cols[i])c.scrollTop=sv.cols[i];});
  document.querySelectorAll("main .tablewrap").forEach((w,i)=>{if(sv.wraps[i])w.scrollLeft=sv.wraps[i];});
  if(Math.abs(window.scrollY-sv.win)>1)window.scrollTo(0,sv.win);
}
function render(){
  const r=ROLES[role];if(!r)return;
  const flipPrev=fxSnap();
  if(!r.nav.includes(view))view=r.nav[0];
  const sv=grabScroll(),same=sv.view===view;
  const app=$("#app");if(same)app.style.minHeight=app.offsetHeight+"px";app.innerHTML="";
  const tb=el("div","topbar");
  const usesDrive=r.maker||r.designer||r.motion||r.operator||r.coordinator||role==="ceo"||role==="pm"||role==="editor";
  const isDarkNow=()=>{const cur=document.documentElement.getAttribute("data-theme");return cur==="dark"||(cur!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);};
  tb.innerHTML=`<button class="iconbtn menubtn" id="menubtn" aria-label="Menyu" aria-expanded="false">${IC('<path d="M4 7h16M4 12h16M4 17h16"/>')}</button><div class="brand">${LOGO}<div>MezMoon<small>CRM</small></div></div><div class="spacer"></div>
    <button class="gsbtn" id="gsearch" title="Axtarış (${IS_MAC?"⌘K":"Ctrl+K"})" aria-label="Axtarış">${ICON.search}<span>Axtar…</span><kbd>${IS_MAC?"⌘ K":"Ctrl K"}</kbd></button>
    <span class="cloudbadge" id="livebadge" role="status">● Canlı</span>
    ${usesDrive?`<button class="iconbtn cloudbtn" id="gdrive" title="Google Drive — bir dəfə qoş, daimi qoşulu qalır" style="width:auto;max-width:220px;padding:0 12px;font-size:12px;font-weight:600;overflow:hidden">${ICON.cloud}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${driveConnected()?(gEmail?esc(gEmail):"Drive ✓"):"Drive-ı qoş"}</span></button>`:""}
    <button class="iconbtn" id="bell" title="Bildirişlər" aria-label="Bildirişlər${notifBadge()?" ("+notifBadge()+" yeni)":""}" style="position:relative">${ICON.bell}${notifBadge()?`<span class="nbadge">${notifBadge()>9?"9+":notifBadge()}</span>`:""}</button>
    <button class="iconbtn" id="theme" title="Tema" aria-label="${isDarkNow()?"Açıq temaya keç":"Qaranlıq temaya keç"}">${isDarkNow()?ICON.sun:MOON_IC}</button>
    <span class="who">${esc(myName())} · ${esc(r.label)}</span>
    <button class="avatar" id="meav" title="Profilim" aria-label="Profilim">${(()=>{const s=avSrc(state.profiles.find(p=>me&&p.id===me.id)||me);return s?`<img src="${esc(s)}" alt="">`:esc((myName()||"?")[0].toUpperCase());})()}</button>
    <button class="iconbtn" id="logout" title="Çıxış" aria-label="Çıxış">${ICON.logout}</button>`;
  app.appendChild(tb);
  tb.querySelector("#theme").onclick=e=>{const d=isDarkNow();applyTheme(d?"light":"dark");const b=e.currentTarget;b.innerHTML=d?MOON_IC:ICON.sun;b.setAttribute("aria-label",d?"Qaranlıq temaya keç":"Açıq temaya keç");};
  updLive();
  const gb=tb.querySelector("#gdrive");
  if(gb)gb.onclick=async()=>{
    /* token hələ serverdən gəlirsə — yenidən qoşma, nəticəni gözlə */
    if(!driveConnected()&&gRefreshing){gb.disabled=true;gb.innerHTML=ICON.cloud+"Yoxlanır…";const ok=await driveReady();gb.disabled=false;updateDriveBtn();if(ok)return;}
    if(driveConnected()||gLinked){if(confirm("Drive daimi qoşuludur"+(gEmail?" ("+gEmail+")":"")+".\n\nAyırmaq istəyirsən? Ayırsan, yenidən qoşmalı olacaqsan."))await disconnectDrive();return;}
    gb.disabled=true;gb.innerHTML=ICON.cloud+"Gözlə…";
    try{await connectDrive();}catch(e){alert("Drive qoşulmadı: "+(e.message||e));}
    gb.disabled=false;updateDriveBtn();};
  tb.querySelector("#logout").onclick=()=>sb.auth.signOut();
  tb.querySelector("#meav").onclick=()=>openProfile();
  tb.querySelector("#bell").onclick=()=>openNotifs();
  tb.querySelector("#gsearch").onclick=()=>openSearch();
  const body=el("div","body");const nav=el("div","nav");
  const myTasks=(TASK_MANAGERS.includes(role)?state.tasks:state.tasks.filter(taskIsMine)).filter(t=>!taskDone(t));
  const counts={todo:state.todos.filter(x=>me&&x.owner===me.id&&!todoIsDone(x)).length||null,videos:(role==="targeting"?allVideos().filter(x=>x.v.stage>=3&&!x.tg.length):allVideos().filter(x=>x.v.stage===3)).length||null,leads:state.leads.filter(l=>l.status==="Yeni").length||null,smm:smmOverdue().length||null,meetings:state.meetings.filter(m=>!m.held&&(meetFull()||(meetIsOffice(m)&&me&&meetPeople(m).includes(me.id)))).length,tasks:myTasks.length,clients:state.clients.length,content:state.content.filter(c=>c.status!=="Yerləşdirildi").length,briefs:state.briefs.filter(b=>b.status!=="Təsdiqləndi").length,shoots:state.shoots.filter(s=>s.held==="").length,delivery:state.shoots.filter(s=>s.held==="yes"&&shootOpenVids(s)>0).length,adbriefs:state.ad_briefs.filter(b=>abOpen(b)||(AB_APPROVERS.includes(role)&&b.status==="Təklif")).length,team:state.profiles.length};
  const icons={subs:IC('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M7 15h4M13 15h4M7 11h10"/>'),todo:IC('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>'),posters:IC('<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="9" r="3"/><path d="M7 18a5 5 0 0 1 10 0"/>'),lounge:IC('<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".9"/><circle cx="17.8" cy="13.8" r=".9"/>'),ofis:IC('<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5"/><path d="M9 10h.01M15 10h.01"/>'),dash:ICON.dash,tasks:ICON.tasks,clients:ICON.users,content:ICON.layers,briefs:ICON.palette,shoots:ICON.camPhoto,delivery:ICON.film,adbriefs:ICON.link,igmsg:ICON.chat,ads:ICON.megaphone,reports:ICON.file,meetings:ICON.clock,smm:ICON.camPhoto,finance:'<span style="font-family:var(--fdisp);font-weight:700;font-size:15px">₼</span>',team:ICON.shield,attendance:ICON.clock,audit:ICON.history,videos:ICON.play2,igstats:IC('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),leads:IC('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>')};
  const grps=NAV_GROUPS.map(([g,ids])=>[g,ids.filter(id=>r.nav.includes(id))]).filter(x=>x[1].length);
  const rest=r.nav.filter(id=>!NAV_GROUPS.some(g=>g[1].includes(id)));if(rest.length)grps.push(["Digər",rest]);
  const showG=r.nav.length>7&&grps.length>1;
  grps.forEach(([g,ids])=>{if(showG)nav.appendChild(el("div","navgrp",g));ids.forEach(id=>nav.appendChild(navItem(id,icons[id],VIEWS[id].t,counts[id])));});
  nav.setAttribute("aria-label","Bölmələr");
  nav.appendChild(el("div","scope",`<strong style="color:var(--ink-soft)">${r.label}</strong><br>${r.scope}<div style="margin-top:8px;font-size:10.5px;opacity:.6;font-family:var(--fmono)">v${APP_VERSION}</div>`));
  body.appendChild(nav);
  const nscrim=el("div","navscrim");body.appendChild(nscrim);
  const setNav=o=>{body.classList.toggle("navopen",o);tb.querySelector("#menubtn").setAttribute("aria-expanded",o?"true":"false");};
  tb.querySelector("#menubtn").onclick=()=>setNav(!body.classList.contains("navopen"));nscrim.onclick=()=>setNav(false);
  const main=el("main");const meta=VIEWS[view];const head=el("div","head");
  head.innerHTML=`<div><h1>${meta.t}</h1><p>${view==="meetings"&&!meetFull()?"Dəvət olunduğunuz ofis iclasları.":meta.d}</p></div><div class="actions"></div>`;
  const actions=head.querySelector(".actions");
  if(view==="clients"&&role==="ceo"){const pb=el("button","btn ghost","👥 PM bölgüsü");pb.title="Məkanları Project Manager-lər arasında bölüşdür";pb.onclick=openPmSplit;actions.appendChild(pb);const tb=el("button","btn ghost","🎯 Targeting bölgüsü");tb.title="Məkanları targetoloqlar arasında bölüşdür";tb.onclick=openTgSplit;actions.appendChild(tb);}
  if(view==="adbriefs"&&role==="ceo"){const tb=el("button","btn ghost","🎯 Targeting bölgüsü");tb.title="Məkanları targetoloqlar arasında bölüşdür";tb.onclick=openTgSplit;actions.appendChild(tb);}
  if(view==="clients"){const s=el("input","search");s.placeholder="Klient axtar…";s.value=clientQuery;s.oninput=e=>{clientQuery=e.target.value;const c=$("main .panel");if(c){const nn=renderClients();c.replaceWith(nn.firstChild);}};actions.appendChild(s);}
  const canAdd=(view==="leads"&&leadCanAdd())||(view==="smm"&&smmCanAdd())||(view==="clients"&&(role==="ceo"||role==="account"||role==="pm"))||(view==="content"&&(role==="content"||role==="ceo"))||(view==="briefs"&&(role==="account"||role==="ceo"||role==="pm"))||(view==="meetings"&&(role==="ceo"||role==="pm"))||(view==="shoots"&&(role==="ceo"||role==="pm"||role==="coordinator"||role==="marketing"))||(view==="adbriefs"&&(AB_SENDERS.includes(role)||role==="targeting"));
  if(view==="adbriefs"||view==="ads"){const dd=view==="ads"?7:3;const n=adsAlertsRecent(dd).length;const ab=el("button","btn ghost","🔔 Xəbərdarlıqlar"+(n?" · "+n:""));ab.onclick=()=>openAdsAlerts(dd);actions.appendChild(ab);}
  if(view==="adbriefs"&&(role==="targeting"||role==="ceo")){const ib=el("button","btn ghost","⚠ Problem qeyd et");ib.onclick=()=>openAdIssue();actions.appendChild(ib);}
  if(meta.add&&canAdd){const b=el("button","btn",view==="adbriefs"&&role==="targeting"?"+ Post təklif et":meta.add);b.onclick=view==="adbriefs"?()=>openAdBrief():openAdd;actions.appendChild(b);}
  main.appendChild(head);
  let content;
  if(view==="dash"){content=renderDash();if(role!=="ceo"&&me){try{const kp=kpiPanel([me],"Mənim göstəricilərim");kp.style.marginTop="18px";kp.style.marginBottom="0";content.appendChild(kp);}catch(e){console.error("KPI",e);}}}
  else if(view==="lounge")content=renderLounge();
  else if(view==="ofis")content=renderOffice();
  else if(view==="tasks")content=renderTasks();
  else if(view==="todo")content=renderTodo();
  else if(view==="clients")content=renderClients();
  else if(view==="content")content=renderContent();
  else if(view==="briefs")content=renderBriefs();
  else if(view==="shoots")content=renderShoots();
  else if(view==="delivery")content=renderDelivery();
  else if(view==="adbriefs")content=renderAdBriefs();
  else if(view==="igmsg")content=renderIgMsg();
  else if(view==="ads")content=renderAds();
  else if(view==="reports")content=renderReports();
  else if(view==="meetings")content=renderMeetings();
  else if(view==="smm")content=renderSmm();
  else if(view==="finance")content=renderFinance();
  else if(view==="team")content=renderTeam();
  else if(view==="attendance")content=(role==="ceo"?renderAttendance():el("div"));
  else if(view==="igstats")content=(IGS_ROLES.includes(role)?renderIgStats():el("div"));
  else if(view==="videos")content=(VID_ROLES.includes(role)?renderVideos():el("div"));
  else if(view==="leads")content=(LEAD_ROLES.includes(role)?renderLeads():el("div"));
  else if(view==="audit")content=(role==="ceo"?renderAudit():el("div"));
  else if(view==="posters")content=renderPosters();
  else if(view==="subs")content=(ROLES[role].nav.includes("subs")?renderSubs():el("div"));
  const vChanged=lastRenderView!==view;if(vChanged)content.classList.add("vt-in");
  main.appendChild(content);body.appendChild(main);app.appendChild(body);
  lastRenderView=view;putScroll(sv,same);app.style.minHeight="";
  fxAfter(content,vChanged,flipPrev);
  if(needsName(me))showNameGate();
  if(hashView()!==view&&!location.hash.includes("access_token"))history.replaceState(null,"",location.pathname+location.search+"#"+view);
  document.title=VIEWS[view].t+" · MezMoon CRM";
  /* sonradan yüklənən hissələr (məs. asinxron siyahılar) hündürlüyü artırsa, yeri bir daha bərpa et */
  const seq=++renderSeq;
  if(same&&sv.main)requestAnimationFrame(()=>{const m=$("main");if(m&&seq===renderSeq&&m.scrollTop<sv.main-2)m.scrollTop=sv.main;});
}

/* ---------- Köhnə açıq tablar: saytda yeni versiya varsa yenilə ---------- */
let updShown=false;
async function checkAppVersion(fromVisible){
  if(updShown)return;
  try{const r=await fetch(location.pathname+"?vc="+Date.now(),{cache:"no-store"});const m=(await r.text()).match(/APP_VERSION="([^"]+)"/);
    if(!m||m[1]===APP_VERSION)return;
    if(fromVisible&&!document.querySelector(".scrim")){location.reload();return;}   // tab yenicə açıldı və heç nə doldurulmur — dərhal yenilə
    updShown=true;const b=el("div");b.id="updbar";
    b.style.cssText="position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:70;display:flex;align-items:center;gap:12px;padding:10px 12px 10px 16px;background:var(--ink);color:var(--bg);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.3);font-size:13px;font-weight:600;max-width:calc(100vw - 32px)";
    b.innerHTML=`<span>Panelin yeni versiyası var</span><button class="btn" style="padding:7px 14px">Yenilə</button>`;
    b.querySelector("button").onclick=()=>location.reload();document.body.appendChild(b);
  }catch(e){}
}
setInterval(()=>checkAppVersion(false),5*60000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")checkAppVersion(true);});
/* ---------- Boot ---------- */
if(curTheme())applyTheme(curTheme());
async function handleSession(session){
  if(!session){me=null;role="";loadedUid=null;recovering=false;if(gLinked!==null||gAccessToken){clearTimeout(gTimer);gAccessToken=null;gTokenExp=0;gEmail="";gLinked=null;}gClearCache();if(rtSub){sb.removeChannel(rtSub);rtSub=null;}showAuth(false,AUTH_LINK_ERR);return;}
  if(recovering){showNewPassword();return;}
  const {data:prof,error:profErr}=await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle();
  /* Server xətası «vəzifən təyin olunmayıb» kimi göstərilməsin (2026-10-20 insidenti) */
  if(profErr&&!prof){showLoadError(profErr);return;}
  me=prof||{id:session.user.id,username:(session.user.email||'').split('@')[0],full_name:'',role:''};
  role=ROLES[me.role]?me.role:"";
  if(!role){showPending();return;}
  if(loadedUid!==session.user.id){loadedUid=session.user.id;{const h=hashView();if(h)view=h;}startTouch();gLoadCache(session.user.id);driveReady();await loadAll();subscribeRealtime();setTimeout(showPendingUrgent,700);setTimeout(checkinFromUrl,900);if(role==="responder"&&view==="dash")view="igmsg";}
  /* Instagram qoşulmasından qayıdış (?ig=ok|err) */
  const igq=new URLSearchParams(location.search);
  if(igq.get("ig")){history.replaceState(null,"",location.pathname);if(IG_MANAGERS.includes(role))view="igmsg";render();
    setTimeout(()=>alert(igq.get("ig")==="ok"?"✅ Instagram qoşuldu: @"+(igq.get("u")||""):"Instagram qoşulmadı: "+(igq.get("m")||"")),50);return;}
  render();
}
sb.auth.onAuthStateChange((e,session)=>{if(e==="PASSWORD_RECOVERY")recovering=true;handleSession(session);});
(function waitG(){if(window.google&&google.accounts&&google.accounts.oauth2){initGoogle();}else setTimeout(waitG,400);})();
