// Supabase Edge Function: "ig-grid"
// Məkanın Instagram profilini Apify ilə çəkir, hər postun ƏSL grid örtüyünü (displayUrl) + run xərcini qaytarır.
//   POST {client, limit?}  (Authorization: Bearer <user jwt>)
//   → {ok, username, media:[{shortcode,cover,type,url,ts}], cost_usd, cents}
// İcazə: ceo, pm, marketing, account. Account yalnız öz məkanını. Yalnız oxuma.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ROLES = ["ceo", "pm", "marketing", "account"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return json({ ok: false, error: "Sessiya yoxdur, yenidən daxil ol." }, 401);
    const { data: prof } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
    if (!prof || !ROLES.includes(prof.role)) return json({ ok: false, error: "Bu funksiya bu rol üçün açıq deyil." }, 403);

    const body = await req.json().catch(() => ({}));
    const client = String(body.client || "").trim();
    const limit = Math.min(Math.max(Number(body.limit) || 12, 1), 20);
    if (!client) return json({ ok: false, error: "Məkan seçilməlidir." });

    const { data: ven } = await sb.from("smm_venues").select("account_id,ig_link").eq("client", client).maybeSingle();
    if (prof.role === "account" && (!ven || ven.account_id !== u.user.id))
      return json({ ok: false, error: "Bu məkan sənə təyin olunmayıb." }, 403);

    let handle = "";
    const { data: cl } = await sb.from("clients").select("id").eq("name", client).limit(1);
    if (cl && cl.length) {
      const { data: accs } = await sb.from("ig_accounts").select("username").eq("client_id", cl[0].id).order("publish_ok", { ascending: false }).limit(1);
      if (accs && accs.length && accs[0].username) handle = accs[0].username;
    }
    if (!handle && ven?.ig_link) {
      const m = String(ven.ig_link).match(/instagram\.com\/([^/?#]+)/i);
      if (m) handle = m[1];
    }
    handle = handle.replace(/^@/, "").trim();
    if (!handle) return json({ ok: false, error: "Məkanın Instagram adı tapılmadı (hesab qoşulmayıb və ig_link yoxdur)." });

    const { data: sec } = await sb.from("app_secrets").select("value").eq("key", "APIFY_TOKEN").maybeSingle();
    if (!sec?.value) return json({ ok: false, error: "APIFY_TOKEN təyin edilməyib." });
    const token = sec.value;

    const input = { directUrls: ["https://www.instagram.com/" + handle + "/"], resultsType: "posts", resultsLimit: limit, addParentData: false };
    // Run başlat (xərci oxumaq üçün run obyekti lazımdır), 60 s gözlə
    const runRes = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${encodeURIComponent(token)}&waitForFinish=60`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(70000) });
    let run = (await runRes.json())?.data;
    if (!run?.id) return json({ ok: false, error: "Apify run başlamadı." });
    for (let i = 0; i < 6 && (run.status === "RUNNING" || run.status === "READY"); i++) {
      await sleep(5000);
      const rr = await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(20000) });
      run = (await rr.json())?.data || run;
    }
    if (run.status !== "SUCCEEDED") return json({ ok: false, error: "Apify bitmədi (" + run.status + "), bir azdan yenidən yoxla." });

    const dsRes = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${encodeURIComponent(token)}&clean=true&limit=${limit}`, { signal: AbortSignal.timeout(20000) });
    const items = await dsRes.json();
    const cost = Number(run.usageTotalUsd || 0);
    const media = (Array.isArray(items) ? items : []).filter((x: any) => x && (x.shortCode || x.url) && x.displayUrl).map((x: any) => ({
      shortcode: x.shortCode || "",
      cover: x.displayUrl || "",
      type: x.type || "",
      url: x.url || (x.shortCode ? "https://www.instagram.com/p/" + x.shortCode + "/" : ""),
      ts: x.timestamp || "",
    }));
    return json({ ok: true, username: handle, media, cost_usd: Math.round(cost * 10000) / 10000, cents: Math.round(cost * 100 * 100) / 100 });
  } catch (e) {
    const msg = String((e as any)?.message || e);
    return json({ ok: false, error: msg.includes("timeout") ? "Apify gecikdi, bir azdan yenidən yoxla." : "Xəta: " + msg }, 500);
  }
});
