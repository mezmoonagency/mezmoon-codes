// ig-audit: sahəyə uyğun bal, güclü tərəflər və tövsiyələr. Apify-sız da işləyir (saxlanmış auditdən yenidən hesablanır).
export const SECTORS: Record<string, string> = { turizm: "Turizm", horeca: "Restoran / məkan", tehsil: "Təhsil", gozellik: "Gözəllik / klinika", ticaret: "Mağaza / brend", umumi: "Digər" };
export function detectSector(a: { category?: string; bio?: string; name?: string; handle?: string }) {
  const t = [a.category, a.bio, a.name, a.handle].filter(Boolean).join(" ").toLocaleLowerCase("az");
  if (/travel|tour|\btur\b|turizm|səyahət|seyahet|viza|\bavia|trip\b|agency.*travel/.test(t)) return "turizm";
  if (/restaurant|restoran|lounge|\bcafe\b|kafe|coffee|\bbar\b|\bpub\b|menyu|menu|çayxana|cayxana|hotel|otel|bakery|şadlıq/.test(t)) return "horeca";
  if (/education|school|məktəb|kurs|course|academy|akademiya|təhsil|tehsil|\bsat\b|ielts|ingilis/.test(t)) return "tehsil";
  if (/beauty|salon|clinic|klinika|dental|stomatolog|estetik|spa\b|gözəllik|gozellik|barber/.test(t)) return "gozellik";
  if (/shop|store|mağaza|magaza|boutique|butik|clothing|geyim|brand|brend|market/.test(t)) return "ticaret";
  return "umumi";
}
const fmtK = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K" : String(Math.round(n));

type Copy = { action: string; bioMissing: string; bio: string; videos: string; people: string; hook: string; rhythm: string; extra: string[]; ads: string };
const COPY: Record<string, Copy> = {
  turizm: {
    action: "müraciət", bioMissing: "Bioda link yoxdur (WhatsApp / tur sorğusu).",
    bio: "Bio: 1 cümləlik vəd + əsas istiqamətlər + WhatsApp + ofis ünvanı. Highlight-lar: Turlar, Rəylər, Viza, Əlaqə.",
    videos: "Hər istiqamət üçün 15–30 saniyəlik video seriyası: marşrut, otel, nələr daxildir, qiymət. Tək elan şəkilləri videonu əvəz etmir.",
    people: "Etibar üçün real insan: səyahətçinin öz səfərini danışdığı video, səfərdən kadrlar, menecerin istiqamət tövsiyəsi. Pul ödəməzdən əvvəl müştəri sübut axtarır.",
    hook: "İlk 2 saniyədə istiqamət və qiymət: «Bakıdan X-ə 5 gün, N AZN-dən». Sonra otel və daxil olanlar.",
    rhythm: "Mövsüm təqvimi: bayram, erkən rezervasiya və yay turlarını səfərdən həftələr əvvəl paylaşmaq, son dəqiqə təkliflərini ayrıca seriya etmək.",
    extra: ["Reaksiyanı artırmaq: «Hansı ölkəyə getmək istəyirsiniz?» sorğu story-ləri və «Qiymət üçün yazın» çağırışı. Hər sorğu potensial müştəridir."],
    ads: "Meta Ads: hər istiqamət üçün ən yaxşı tur videosunu WhatsApp mesaj kampaniyası ilə Bakı auditoriyasına vermək, baxışa yox müraciət qiymətinə görə ölçmək.",
  },
  horeca: {
    action: "bron", bioMissing: "Bioda link yoxdur (rezervasiya / WhatsApp / menyu).",
    bio: "Bio: məkanın 1 cümləlik vədi + ünvan + iş saatı + bron linki.",
    videos: "Reels əsas reach mənbəyidir: ayda 6+ peşəkar video (məkan turu, aşpaz, atmosfer, kreator collab).",
    people: "İnsan və hekayə olan videolar: qonaq, aşpaz, kreator. Adsız atmosfer kadrlarından daha çox yadda qalır.",
    hook: "İlk 2 saniyədə ən iştahlı kadr və ya sual, sonra trend səs.",
    rhythm: "Həftəlik ritm: menyu, canlı musiqi, tədbir və bayram anonsları üçün sabit təqvim.",
    extra: [], ads: "Meta Ads: ən yaxşı videonu yaxın ərazidə mesaj/profil ziyarəti kampaniyası ilə gücləndirmək.",
  },
  tehsil: {
    action: "qeydiyyat", bioMissing: "Bioda link yoxdur (qeydiyyat / WhatsApp).",
    bio: "Bio: hansı nəticəni verirsiniz + proqramlar + qeydiyyat linki.",
    videos: "Qısa dərs videoları: 1 mövzu, 1 səhv, 1 ipucu. Faydalı video saxlanılır və paylaşılır.",
    people: "Tələbənin nəticə hekayəsi və müəllimin kamerada izahı: valideyn və tələbə üçün ən güclü sübut.",
    hook: "İlk 2 saniyədə konkret problem: «SAT-da bu səhvi hamı edir».",
    rhythm: "Akademik təqvim: qəbul, imtahan və yeni qrup tarixlərinə 3–4 həftə qalmış seriya.",
    extra: [], ads: "Meta Ads: yeni qrup qəbulu üçün mesaj və ya lead form kampaniyası, müraciət qiymətinə görə ölçmək.",
  },
  gozellik: {
    action: "qeydiyyat", bioMissing: "Bioda link yoxdur (WhatsApp / onlayn növbə).",
    bio: "Bio: əsas xidmətlər + ünvan + iş saatı + növbə linki.",
    videos: "Öncə/sonra videoları və prosedurun qısa izahı (müştəri razılığı ilə).",
    people: "Mütəxəssis kamerada, real müştəri rəyi: etibar burada həlledicidir.",
    hook: "İlk 2 saniyədə nəticə kadrı və ya tez-tez verilən sual.",
    rhythm: "Xidmət üzrə həftəlik seriya və mövsüm təklifləri.",
    extra: [], ads: "Meta Ads: yaxın ərazidə konkret xidmət üçün mesaj kampaniyası, müraciət qiymətinə görə ölçmək.",
  },
  ticaret: {
    action: "sifariş", bioMissing: "Bioda link yoxdur (sayt / WhatsApp sifariş).",
    bio: "Bio: nə satırsınız + çatdırılma + sifariş linki.",
    videos: "Məhsul videoları: istifadədə göstərmək, ölçü/material, qiymət.",
    people: "Real müştəri və ya kreator məhsulu istifadə edir: UGC formatı.",
    hook: "İlk 2 saniyədə məhsulun əsas faydası və ya qiyməti.",
    rhythm: "Yeni gələn məhsullar və kampaniyalar üçün sabit təqvim.",
    extra: [], ads: "Meta Ads: ən çox satan məhsulun videosu ilə mesaj və ya satış kampaniyası.",
  },
  umumi: {
    action: "müraciət", bioMissing: "Bioda link yoxdur (WhatsApp / sayt).",
    bio: "Bio: nə edirsiniz + kimə + əlaqə linki.",
    videos: "Ayda 6+ qısa video: xidmət necə işləyir, tez-tez verilən suallar, nəticələr.",
    people: "İnsan olan videolar: komanda, müştəri, real hekayə. Adsız kadrlardan daha çox etibar yaradır.",
    hook: "İlk 2 saniyədə konkret problem və ya fayda.",
    rhythm: "Sabit həftəlik paylaşım təqvimi.",
    extra: [], ads: "Meta Ads: ən yaxşı videonu mesaj və ya müraciət kampaniyası ilə gücləndirmək.",
  },
};

// m: analyse() göstəriciləri; saxlanmış auditdən də gələ bilər
export function buildInsights(m: any, sectorKey?: string) {
  const sector = sectorKey && COPY[sectorKey] ? sectorKey : detectSector(m);
  const S = COPY[sector];
  const { followers, er, posts_30d: in30, days_since_last: last, med_views: med, max_views: max, avg_likes: avgLikes, analysed: n } = m;
  const reelsShare = Number(m.reels_share || 0) / 100, vidsN = Math.round(n * reelsShare);
  const hasVideos = med > 0 && max > 0, bio = String(m.bio || ""), hasLink = !!m.link, hasPhone = /\+?\d[\d\s-]{7,}/.test(bio);
  const reach = followers && hasVideos ? med / followers : 0;   // tipik videonun izləyiciyə nisbəti
  const consist = max ? med / max : 0;
  const lowReach = hasVideos && followers >= 1000 && reach < .05;

  const sAct = in30 >= 12 ? 20 : in30 >= 8 ? 14 : in30 >= 4 ? 8 : in30 >= 1 ? 4 : 0;
  const sReel = reelsShare >= .5 ? 20 : reelsShare >= .25 ? 12 : reelsShare > 0 ? 6 : 0;
  const sEr = er >= 3 ? 20 : er >= 1.5 ? 14 : er >= .7 ? 8 : n ? 3 : 0;
  // Sabitlik yalnız real çatım varsa bal verir: hamısı eyni dərəcədə az baxılırsa, bu güclü tərəf deyil
  const sCon = !hasVideos || vidsN < 3 || lowReach ? 0 : consist >= .5 ? 15 : consist >= .3 ? 10 : consist >= .15 ? 5 : 2;
  const sNew = last === null ? 0 : last <= 3 ? 10 : last <= 7 ? 6 : last <= 14 ? 3 : 0;
  const sProf = (bio.length > 20 ? 5 : 0) + (hasLink ? 5 : 0) + (m.category ? 2 : 0) + (hasPhone ? 3 : 0);
  const score = Math.min(100, sAct + sReel + sEr + sCon + sNew + sProf);

  const good: string[] = [], bad: string[] = [], recs: string[] = [];
  if (in30 >= 8) good.push(`Aktiv profil: son 30 gündə ${in30} paylaşım.`);
  else { bad.push(`Son 30 gündə cəmi ${in30} paylaşım: alqoritm üçün az.`); recs.push("Ayda ən azı 12–16 paylaşım və sabit təqvim."); }
  if (reelsShare >= .5) good.push(`Video payı yüksəkdir: son ${n} paylaşımın ${vidsN}-i video.`);
  else { bad.push(`Video payı aşağıdır: son ${n} paylaşımın yalnız ${vidsN}-i video (${Math.round(reelsShare * 100)}%).`); }
  if (er >= 1.5) good.push(`Engagement yaxşıdır: ${er.toFixed(2)}%.`);
  else if (n) bad.push(`Engagement aşağıdır: ${Number(er).toFixed(2)}% (orta bəyənmə ${fmtK(avgLikes)}, izləyici ${fmtK(followers)}).`);
  if (lowReach) { bad.push(`Videolar izləyicilərin çox az hissəsinə çatır: tipik video ${fmtK(med)} baxış, ən yaxşısı ${fmtK(max)}, izləyici ${fmtK(followers)}.`); }
  else if (hasVideos && vidsN >= 3 && consist < .3) bad.push(`Nəticə qeyri-sabitdir: ən yaxşı video ${fmtK(max)} baxış, tipik video ${fmtK(med)}.`);
  else if (hasVideos && vidsN >= 3) good.push(`Videolar sabit nəticə verir (tipik ${fmtK(med)} baxış).`);
  // Bir paylaşım ortanı süni qaldırırsa göstər (reklam ola bilər)
  const topLikes = (m.top || []).map((t: any) => Number(t.likes || 0)), best = topLikes.length ? Math.max(...topLikes) : 0;
  if (n > 3 && best >= 20) {
    const rest = (avgLikes * n - best) / (n - 1);
    if (best >= rest * 10) bad.push(`Bəyənmələr bir paylaşıma yığılıb: ən yaxşısı ${fmtK(best)}, qalanlarında orta ~${Math.round(rest)}. O paylaşımın reklam olub-olmadığını yoxlamaq lazımdır.`);
  }
  if (last !== null && last > 7) { bad.push(`Son paylaşım ${last} gün əvvəl olub.`); recs.push("Profil sönmüş görünür: paylaşım ritmini dərhal bərpa etmək lazımdır."); }
  else if (last !== null) good.push(last === 0 ? "Bu gün paylaşım olub." : `Son paylaşım ${last} gün əvvəl.`);
  if (!hasLink) bad.push(S.bioMissing); else good.push("Bioda link var.");
  if (bio.length <= 20) bad.push("Bio boşdur və ya çox qısadır.");

  recs.push(S.videos, S.people);
  if (hasVideos) recs.push(S.hook);
  recs.push(S.rhythm, ...S.extra);
  if (bio.length <= 40 || !hasLink || sector === "turizm") recs.push(S.bio);
  if (followers && followers < 5000) recs.push(`İzləyici bazası kiçikdir (${fmtK(followers)}): kreator collab-ları ilə böyütmək.`);
  recs.push(S.ads);
  return { sector, sector_name: SECTORS[sector], score, good, bad, recs,
    parts: { activity: sAct, reels: sReel, engagement: sEr, consistency: sCon, recency: sNew, profile: sProf } };
}
