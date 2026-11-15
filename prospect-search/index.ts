// Supabase Edge Function: "prospect-search" v4
// MezMoon CRM — Yeni müştərilər → Potensial: sektora görə məkan axtarışı (Apify Google Maps) + Instagram analizi
//   action "start"   { sector?, queries?, limit? }  — Google Maps axtarışı başlayır (asinxron)
//   action "collect" — bitmiş run-ları emal edir: Maps → prospects, sonra IG profil analizi → ig_stats / flags / score
//   action "enrich"  { ids? } — IG-si olan, hələ analiz olunmamış məkanlar üçün IG analizi başladır
//   action "usage"   — Apify bu ayki xərc
// Panel istifadəçisi (CEO/PM/Marketinq JWT) və ya daxili açar (x-internal-key, pg_cron).
// Bayraqlar: few_videos (30 gündə <4 video), stopped (50+ paylaşım, amma son paylaşım 30+ gün əvvəl),
//            weak (bal < 50), no_ig (Instagram tapılmadı), private (bağlı profil).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAPS = "compass~crawler-google-places";
const IGP = "apify~instagram-profile-scraper";
const BUDGET = 18; // Apify aylıq xərc həddi ($); hesabın öz limiti 19$
const DAY = 864e5;

export const SECTORS: Record<string, { name: string; q: string[]; minReviews: number; score: string }> = {
  horeca: { name: "Restoran / kafe", q: ["restaurant", "cafe", "lounge", "coffee shop", "bar"], minReviews: 30, score: "horeca" },
  otel: { name: "Otel", q: ["hotel", "boutique hotel"], minReviews: 20, score: "horeca" },
  gozellik: { name: "Gözəllik / klinika", q: ["beauty salon", "barbershop", "aesthetic clinic", "dental clinic", "spa"], minReviews: 15, score: "gozellik" },
  fitnes: { name: "Fitnes / idman", q: ["gym", "fitness center", "pilates studio", "yoga studio"], minReviews: 15, score: "umumi" },
  tehsil: { name: "Təhsil", q: ["education center", "language school", "training center"], minReviews: 10, score: "tehsil" },
  ticaret: { name: "Mağaza / butik", q: ["clothing store", "boutique", "cosmetics store", "furniture store", "flower shop"], minReviews: 15, score: "ticaret" },
  turizm: { name: "Turizm", q: ["travel agency", "tour operator"], minReviews: 10, score: "turizm" },
};
const GENERIC = new Set(["kafe", "cafe", "restoran", "restaurant", "lounge", "bar", "nur", "cayxana", "salon", "market", "magaza", "hotel", "otel"]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const fold = (s: string) => String(s || "").toLocaleLowerCase("az").replace(/[əıöüçşğ]/g, (c) => ({ "ə": "e", "ı": "i", "ö": "o", "ü": "u", "ç": "c", "ş": "s", "ğ": "g" } as any)[c]).replace(/[^a-z0-9]+/g, "");
const igFrom = (u: string) => { const m = String(u || "").match(/instagram\.com\/([A-Za-z0-9_.]+)/i); return m && !["p", "reel", "reels", "explore", "stories", "accounts"].includes(m[1].toLowerCase()) ? m[1].toLowerCase() : ""; };
const phoneIn = (s: string) => { const m = String(s || "").match(/(\+?994[\s-]?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\b0\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b)/); return m ? m[1].trim() : ""; };

async function apifyUsage(token: string): Promise<number | null> {
  try { const d = await (await fetch(`https://api.apify.com/v2/users/me/limits?token=${encodeURIComponent(token)}`)).json(); return Number(d.data.current.monthlyUsageUsd); } catch (_) { return null; }
}

// IG profil → göstəricilər (ig-audit analyse() ilə eyni hesab) + bal (ig-audit sector.ts bal hissəsi)
function analyse(p: any) {
  const followers = Number(p.followersCount || 0);
  const posts = (p.latestPosts || []).filter((x: any) => x && x.timestamp).sort((a: any, b: any) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 12);
  const now = Date.now();
  const isVideo = (x: any) => x.type === "Video" || x.productType === "clips";
  const likes = (x: any) => Math.max(0, Number(x.likesCount || 0));
  const comm = (x: any) => Math.max(0, Number(x.commentsCount || 0));
  const views = (x: any) => Math.max(0, Number(x.videoPlayCount || x.videoViewCount || 0));
  const n = posts.length, vids = posts.filter(isVideo);
  const avgLikes = n ? posts.reduce((s: number, x: any) => s + likes(x), 0) / n : 0;
  const avgCom = n ? posts.reduce((s: number, x: any) => s + comm(x), 0) / n : 0;
  const er = followers ? (avgLikes + avgCom) / followers * 100 : 0;
  const last = n ? Date.parse(posts[0].timestamp) : 0;
  const daysSince = last ? Math.floor((now - last) / DAY) : null;
  const in30 = posts.filter((x: any) => now - Date.parse(x.timestamp) <= 30 * DAY).length;
  const vid30 = vids.filter((x: any) => now - Date.parse(x.timestamp) <= 30 * DAY).length;
  const vv = vids.map(views).filter((x: number) => x > 0).sort((a: number, b: number) => a - b);
  const med = vv.length ? vv[Math.floor((vv.length - 1) / 2)] : 0, max = vv.length ? vv[vv.length - 1] : 0;
  const bio = String(p.biography || "");
  const link = p.externalUrl || (p.externalUrls && p.externalUrls[0] && p.externalUrls[0].url) || "";
  const reelsShare = n ? vids.length / n : 0;
  const lowReach = med > 0 && followers >= 1000 && med / followers < .05;
  const consist = max ? med / max : 0;
  const sAct = in30 >= 12 ? 20 : in30 >= 8 ? 14 : in30 >= 4 ? 8 : in30 >= 1 ? 4 : 0;
  const sReel = reelsShare >= .5 ? 20 : reelsShare >= .25 ? 12 : reelsShare > 0 ? 6 : 0;
  const sEr = er >= 3 ? 20 : er >= 1.5 ? 14 : er >= .7 ? 8 : n ? 3 : 0;
  const sCon = !(med > 0) || vids.length < 3 || lowReach ? 0 : consist >= .5 ? 15 : consist >= .3 ? 10 : consist >= .15 ? 5 : 2;
  const sNew = daysSince === null ? 0 : daysSince <= 3 ? 10 : daysSince <= 7 ? 6 : daysSince <= 14 ? 3 : 0;
  const sProf = (bio.length > 20 ? 5 : 0) + (link ? 5 : 0) + (p.businessCategoryName && p.businessCategoryName !== "None" ? 2 : 0) + (phoneIn(bio) ? 3 : 0);
  const score = Math.min(100, sAct + sReel + sEr + sCon + sNew + sProf);
  const postsTotal = Number(p.postsCount || 0);
  const flags: string[] = [];
  if (p.private) flags.push("private");
  if (vid30 < 4) flags.push("few_videos");
  if (postsTotal >= 50 && (daysSince === null || daysSince >= 30)) flags.push("stopped");
  if (score < 50) flags.push("weak");
  const stats = {
    followers, posts_total: postsTotal, analysed: n, posts_30d: in30, videos_30d: vid30, reels_share: Math.round(reelsShare * 100),
    er: Math.round(er * 100) / 100, avg_likes: Math.round(avgLikes), med_views: med, days_since_last: daysSince,
    last_post: last ? new Date(last).toISOString() : null, bio: bio.slice(0, 300), link, private: !!p.private, full_name: p.fullName || "",
  };
  const phone = String(p.businessPhoneNumber || p.public_phone_number || "").trim() || phoneIn(bio);
  return { stats, flags, score, phone };
}

async function startIg(sb: any, token: string, handles: string[], sector: string | null, uid: string | null) {
  const hs = [...new Set(handles.filter((h) => /^[a-z0-9_.]{1,30}$/.test(h)))].slice(0, 100);
  if (!hs.length) return null;
  const r = await fetch(`https://api.apify.com/v2/acts/${IGP}/runs?token=${encodeURIComponent(token)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usernames: hs }),
  });
  const d = await r.json().catch(() => null);
  if (!d || !d.data) return null;
  await sb.from("prospect_runs").insert({ id: d.data.id, kind: "ig", sector, handles: hs, queries: "Instagram analizi · " + hs.length + " profil", started_by: uid });
  return d.data.id;
}

async function collect(sb: any, token: string) {
  const { data: runs } = await sb.from("prospect_runs").select("*").is("imported_at", null).order("started_at");
  const res: any[] = [];
  if (!runs || !runs.length) return res;
  const [{ data: cl }, { data: ld }] = await Promise.all([sb.from("clients").select("name,ig"), sb.from("leads").select("name,ig")]);
  const known = new Set<string>(); const knownNames: string[] = [];
  for (const x of [...(cl || []), ...(ld || [])]) { if (x.name) { known.add(fold(x.name)); if (fold(x.name).length >= 4) knownNames.push(fold(x.name)); } if (x.ig) known.add("@" + String(x.ig).replace(/^@/, "").toLowerCase()); }
  const isKnown = (title: string, ig: string) => { const f = fold(title); return known.has(f) || (ig && known.has("@" + ig)) || knownNames.some((k) => f.startsWith(k) || f.includes(k + "lounge") || f.includes(k + "by")); };

  for (const run of runs) {
    const st = await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${encodeURIComponent(token)}`)).json().catch(() => null);
    const status = st && st.data ? st.data.status : "UNKNOWN";
    const cost = st && st.data ? Number(st.data.usageTotalUsd || 0) : null;
    if (["RUNNING", "READY"].includes(status)) { res.push({ run: run.id, kind: run.kind, status }); continue; }
    if (status !== "SUCCEEDED") { await sb.from("prospect_runs").update({ status, imported_at: new Date().toISOString(), found: 0, added: 0, cost_usd: cost }).eq("id", run.id); res.push({ run: run.id, status }); continue; }
    const items = await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}/dataset/items?clean=1&token=${encodeURIComponent(token)}`)).json().catch(() => []);
    const list = Array.isArray(items) ? items : [];

    if (run.kind === "ig") {
      let upd = 0; const seen = new Set<string>();
      for (const p of list) {
        if (!p || !p.username) continue;
        const h = String(p.username).toLowerCase(); seen.add(h);
        const a = analyse(p);
        const { data: u } = await sb.from("prospects").update({ ig_stats: a.stats, flags: a.flags, score: a.score, ig_phone: a.phone || null, ig_checked_at: new Date().toISOString() }).eq("ig", h).select("id");
        upd += (u || []).length;
      }
      // tapılmayan profillər: IG səhvdir və ya silinib
      for (const h of (run.handles || [])) if (!seen.has(h)) await sb.from("prospects").update({ flags: ["no_ig"], ig_checked_at: new Date().toISOString() }).eq("ig", h);
      await sb.from("prospect_runs").update({ status, imported_at: new Date().toISOString(), found: list.length, added: upd, cost_usd: cost }).eq("id", run.id);
      res.push({ run: run.id, kind: "ig", status, analysed: upd });
      if (upd && run.started_by) await sb.from("notifications").insert({ target_type: "user", target: run.started_by, title: `📊 ${upd} məkanın Instagram-ı analiz olundu`, body: "Yeni müştərilər → Potensial: «Az video», «Paylaşımı dayandırıb», «Zəif marketinq» filtrlərinə bax.", from_name: "Potensial axtarış", read_by: [] });
      continue;
    }

    const sector = run.sector && SECTORS[run.sector] ? run.sector : "horeca";
    const minR = SECTORS[sector].minReviews;
    let added = 0; const newIg: string[] = [];
    for (const p of list) {
      if (!p || !p.title || p.permanentlyClosed || p.temporarilyClosed) continue;
      const socials = [...(Array.isArray(p.instagrams) ? p.instagrams : []), p.website].filter(Boolean);
      let ig = ""; for (const s of socials) { ig = igFrom(s); if (ig) break; }
      if (isKnown(p.title, ig) || Number(p.reviewsCount || 0) < minR || GENERIC.has(fold(p.title)) || fold(p.title).length < 3) continue;
      const row: any = { place_id: p.placeId || p.cid || p.url, name: p.title, category: p.categoryName || (p.categories || [])[0] || "", address: p.address || "",
        phone: p.phone || p.phoneUnformatted || (Array.isArray(p.phones) && p.phones[0]) || "", website: igFrom(p.website) ? "" : (p.website || ""), ig, rating: p.totalScore ?? null,
        reviews: p.reviewsCount ?? null, maps_url: p.url || "", query: p.searchString || run.queries, sector, flags: ig ? [] : ["no_ig"] };
      const { error } = await sb.from("prospects").insert(row);
      if (!error) { added++; if (ig) newIg.push(ig); }
    }
    await sb.from("prospect_runs").update({ status, imported_at: new Date().toISOString(), found: list.length, added, cost_usd: cost }).eq("id", run.id);
    let igRun = null;
    if (newIg.length) igRun = await startIg(sb, token, newIg, sector, run.started_by);
    res.push({ run: run.id, kind: "maps", status, found: list.length, added, ig_run: igRun });
    if (added && run.started_by) await sb.from("notifications").insert({ target_type: "user", target: run.started_by, title: `🔎 ${added} yeni potensial məkan (${SECTORS[sector].name})`, body: newIg.length ? `${newIg.length} məkanın Instagram-ı analiz olunur, bir neçə dəqiqəyə bayraqlar görünəcək.` : "Yeni müştərilər → Potensial tabında baxın.", from_name: "Potensial axtarış", read_by: [] });
  }
  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const sb = createClient(SB_URL, SB_KEY);
    let uid: string | null = null; let ok = false;
    const ik = req.headers.get("x-internal-key") || "";
    if (ik) { const { data: k } = await sb.from("app_secrets").select("value").eq("key", "IG_INTERNAL_KEY").maybeSingle(); ok = !!(k && k.value === ik); }
    if (!ok) {
      const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const { data: u } = await sb.auth.getUser(jwt);
      if (u && u.user) { const { data: p } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle(); ok = !!p && ["ceo", "pm", "marketing"].includes(p.role); uid = u.user.id; }
    }
    if (!ok) return json({ ok: false, error: "icazə yoxdur" }, 401);
    const { data: sec } = await sb.from("app_secrets").select("value").eq("key", "APIFY_TOKEN").maybeSingle();
    if (!sec || !sec.value) return json({ ok: false, error: "APIFY_TOKEN yoxdur" });
    const token = sec.value;
    const body = await req.json().catch(() => ({}));

    if (body.action === "usage") return json({ ok: true, used: await apifyUsage(token), budget: BUDGET });

    if (body.action === "start" || body.action === "enrich") {
      const used = await apifyUsage(token);
      if (used !== null && used >= BUDGET) return json({ ok: false, error: `Apify aylıq həddi: bu ay ${used.toFixed(2)}$ xərclənib (hədd ${BUDGET}$).` });
    }

    if (body.action === "enrich") {
      let q = sb.from("prospects").select("ig").neq("ig", "").is("ig_checked_at", null).eq("status", "new").limit(100);
      if (Array.isArray(body.ids) && body.ids.length) q = sb.from("prospects").select("ig").in("id", body.ids.slice(0, 100)).neq("ig", "");
      const { data: rows } = await q;
      const hs = (rows || []).map((r: any) => String(r.ig).toLowerCase());
      if (!hs.length) return json({ ok: false, error: "Analiz olunacaq Instagram profili yoxdur" });
      const id = await startIg(sb, token, hs, null, uid);
      return id ? json({ ok: true, run: id, count: hs.length }) : json({ ok: false, error: "Apify IG analizi başlamadı" });
    }

    if (body.action === "start") {
      const { data: running } = await sb.from("prospect_runs").select("id").is("imported_at", null).eq("kind", "maps").limit(1);
      if (running && running.length) return json({ ok: false, error: "Axtarış artıq gedir — bir neçə dəqiqə gözləyin" });
      const sector = SECTORS[String(body.sector || "")] ? String(body.sector) : "horeca";
      const queries: string[] = (Array.isArray(body.queries) && body.queries.length ? body.queries : SECTORS[sector].q).map((x: any) => String(x).trim()).filter(Boolean).slice(0, 6);
      const limit = Math.min(Math.max(Number(body.limit) || 20, 5), 60);
      const area = String(body.area || "Baku, Azerbaijan").slice(0, 80);
      const r = await fetch(`https://api.apify.com/v2/acts/${MAPS}/runs?token=${encodeURIComponent(token)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchStringsArray: queries, locationQuery: area, maxCrawledPlacesPerSearch: limit, language: "en", skipClosedPlaces: true, scrapePlaceDetailPage: false, scrapeContacts: true, maxReviews: 0, maxImages: 0 }),
      });
      const d = await r.json().catch(() => null);
      if (!d || !d.data) return json({ ok: false, error: "Apify: " + ((d && d.error && d.error.message) || r.status) });
      await sb.from("prospect_runs").insert({ id: d.data.id, kind: "maps", sector, queries: queries.join(", "), started_by: uid });
      return json({ ok: true, run: d.data.id, sector, queries });
    }
    return json({ ok: true, collected: await collect(sb, token) });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
