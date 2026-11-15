# 09i -> 09j: Hazırkı feed-də analiz mətni (necə yaxşılaşsın / problem izahı)
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.09i"')==1
s=s.replace('APP_VERSION="2026.11.09i"','APP_VERSION="2026.11.09j"')

# setTimeout: diag konteyneri yarat və ötür
old_st='setTimeout(()=>feedLiveAnalyze(v,fd,media,grid,bar.querySelector("[data-fov]")),30);'
assert s.count(old_st)==1
s=s.replace(old_st,'const diag=el("div");diag.style.cssText="margin-top:12px";box.appendChild(diag);setTimeout(()=>feedLiveAnalyze(v,fd,media,grid,bar.querySelector("[data-fov]"),diag),30);')

# feedLiveAnalyze: analiz + feedAdvice
old_an=r'''async function feedLiveAnalyze(v,fd,media,grid,ov){
  const doms={};for(let i=0;i<media.length;i++){const im=await fLoad(feedLiveCoverSrc(media[i],fd));if(im){const d=fDominants(im);if(d)doms[i]=d;}}
  const got=Object.keys(doms).length;
  let pal=fd.pal;
  if((!pal||!pal.length)&&got){const all=[];Object.values(doms).forEach(ds=>ds.forEach(d=>all.push(d)));all.sort((a,b)=>b.w-a.w);const pick=[];for(const d of all){const lab=fRgb2lab(d.rgb[0],d.rgb[1],d.rgb[2]);if(pick.every(p=>fDE(lab,fRgb2lab(p[0],p[1],p[2]))>20))pick.push([Math.round(d.rgb[0]),Math.round(d.rgb[1]),Math.round(d.rgb[2])]);if(pick.length>=5)break;}pal=pick;}
  let sum=0,cnt=0;
  grid.querySelectorAll("[data-i]").forEach(t=>{const sc=fScore(doms[+t.dataset.i],pal);const b=t.querySelector("[data-fb]");if(b){b.textContent=sc==null?"—":sc;b.style.color=fCol(sc);}if(sc!=null){sum+=sc;cnt++;}});
  if(ov){const avg=cnt?Math.round(sum/cnt):null;ov.textContent=avg==null?(got?"—":"şəkil oxunmadı"):avg+"%";ov.style.color=fCol(avg);if(!got)ov.style.fontSize="12px";}}'''
assert s.count(old_an)==1
new_an=r'''function feedAdvice(doms,pal){
  const idx=Object.keys(doms).map(Number);const n=idx.length;
  if(!n)return '<b>🔎 Feed analizi</b><div class="hint" style="white-space:normal;margin-top:4px">Şəkillər brauzerdə oxunmadı, ona görə qiymət verilmədi. «↻ Yenilə» bas; davam edərsə, örtük şəkilləri Instagram CDN-dən açılmır.</div>';
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;const sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)*(x-m))));};
  const Ls=[],Cs=[];let out=0,sum=0,sc0=0;
  idx.forEach(i=>{const t=doms[i][0];const lab=fRgb2lab(t.rgb[0],t.rgb[1],t.rgb[2]);Ls.push(lab[0]);Cs.push(Math.sqrt(lab[1]*lab[1]+lab[2]*lab[2]));const sc=fScore(doms[i],pal);if(sc!=null){sc0++;sum+=sc;if(sc<60)out++;}});
  const avg=sc0?Math.round(sum/sc0):null;const sdL=sd(Ls),mC=mean(Cs);
  const set=new Set(idx);let sim=0;
  idx.forEach(i=>{[i-1,i-3].forEach(j=>{if(j===i-1&&i%3===0)return;if(set.has(j)){const a=fRgb2lab(doms[i][0].rgb[0],doms[i][0].rgb[1],doms[i][0].rgb[2]);const b=fRgb2lab(doms[j][0].rgb[0],doms[j][0].rgb[1],doms[j][0].rgb[2]);if(fDE(a,b)<7)sim++;}});});
  const b=[];
  b.push(avg==null?"Rəng balı hesablanmadı.":avg>=80?"Feed rəng baxımından tutarlıdır — vahid estetika hiss olunur.":avg>=60?"Feed orta səviyyədədir — bəzi postlar ümumi tondan ayrılır.":"Rənglər dağınıqdır — feed vahid görünmür, tutarlılıq zəifdir.");
  if(out>0)b.push(out+" post ümumi palitradan kənardır — onları dəyiş, yenidən rənglə və ya çıxar.");
  if(sdL>22)b.push("Açıqlıq çox dəyişkəndir (bəzi postlar çox tünd, bəzisi çox açıq) — ekspozisiya/işıqlandırmanı bərabərləşdir.");
  else if(sdL<7)b.push("Postlar demək olar eyni açıqlıqdadır — bir az kontrast və dərinlik feed-i canlandırar.");
  if(mC<12)b.push("Rənglər solğundur — doyğunluğu bir az artır, əsas brend rəngini gücləndir.");
  else if(mC>42)b.push("Rənglər çox parlaqdır — tonları bir az yumşalt ki, premium görünsün.");
  if(sim>0)b.push("Yan-yana oxşar postlar var — növbələşdir (açıq/tünd, yaxın plan/geniş plan).");
  b.push("Məsləhət: palitranı 3 rənglə saxla (neytral + əsas + vurğu) və hər postda eyni rəng tonunu (LUT) tətbiq et.");
  return '<b>🔎 Feed analizi</b><ul style="margin:6px 0 0;padding-left:18px;font-size:13.5px;line-height:1.55">'+b.slice(0,6).map(x=>'<li style="margin:3px 0">'+esc(x)+'</li>').join("")+'</ul>';}
async function feedLiveAnalyze(v,fd,media,grid,ov,diag){
  const doms={};for(let i=0;i<media.length;i++){const im=await fLoad(feedLiveCoverSrc(media[i],fd));if(im){const d=fDominants(im);if(d)doms[i]=d;}}
  const got=Object.keys(doms).length;
  let pal=fd.pal;
  if((!pal||!pal.length)&&got){const all=[];Object.values(doms).forEach(ds=>ds.forEach(d=>all.push(d)));all.sort((a,b)=>b.w-a.w);const pick=[];for(const d of all){const lab=fRgb2lab(d.rgb[0],d.rgb[1],d.rgb[2]);if(pick.every(p=>fDE(lab,fRgb2lab(p[0],p[1],p[2]))>20))pick.push([Math.round(d.rgb[0]),Math.round(d.rgb[1]),Math.round(d.rgb[2])]);if(pick.length>=5)break;}pal=pick;}
  let sum=0,cnt=0;
  grid.querySelectorAll("[data-i]").forEach(t=>{const sc=fScore(doms[+t.dataset.i],pal);const b=t.querySelector("[data-fb]");if(b){b.textContent=sc==null?"—":sc;b.style.color=fCol(sc);}if(sc!=null){sum+=sc;cnt++;}});
  if(ov){const avg=cnt?Math.round(sum/cnt):null;ov.textContent=avg==null?(got?"—":"şəkil oxunmadı"):avg+"%";ov.style.color=fCol(avg);if(!got)ov.style.fontSize="12px";}
  if(diag)diag.innerHTML='<div class="panel" style="padding:14px 16px">'+feedAdvice(doms,pal)+'</div>';}'''
s=s.replace(old_an,new_an)

open(dst,"w").write(s)
print("ok bytes:",len(s))
