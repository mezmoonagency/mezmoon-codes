// Supabase Edge Function: "ig-feed"
// Məkanın qoşulmuş Instagram hesabının HAZIRKI feed-ini (son postlar) qaytarır — SMM Plan · 🎨 Feed.
//   POST {client, limit?}  (Authorization: Bearer <user jwt>)
//   → {ok, username, media:[{id,type,url,thumb,permalink,ts}]}
// Token server tərəfdə (ig_tokens) saxlanılır, client-ə verilmir. İcazə: ceo, pm, marketing, account.
// Account yalnız öz məkanını görür. Yalnız oxuma — heç nə dəyişmir.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const IG = "https://graph.instagram.com/v21.0";
const ROLES = ["ceo", "pm", "marketing", "account"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

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
    const limit = Math.min(Math.max(Number(body.limit) || 15, 1), 25);
    if (!client) return json({ ok: false, error: "Məkan seçilməlidir." });

    // Account yalnız öz məkanını görür
    const { data: ven } = await sb.from("smm_venues").select("account_id").eq("client", client).maybeSingle();
    if (prof.role === "account" && (!ven || ven.account_id !== u.user.id))
      return json({ ok: false, error: "Bu məkan sənə təyin olunmayıb." }, 403);

    // Məkanın qoşulmuş Instagram hesabı → ig_user_id → token (server tərəfdə)
    const { data: cl } = await sb.from("clients").select("id").eq("name", client).limit(1);
    if (!cl || !cl.length) return json({ ok: false, error: "Məkan tapılmadı." });
    const { data: accs } = await sb.from("ig_accounts").select("ig_user_id,username").eq("client_id", cl[0].id).order("publish_ok", { ascending: false }).limit(1);
    if (!accs || !accs.length) return json({ ok: false, error: "Bu məkanın Instagram-ı panelə qoşulmayıb." });
    const acc = accs[0];
    const { data: tok } = await sb.from("ig_tokens").select("access_token").eq("ig_user_id", acc.ig_user_id).maybeSingle();
    if (!tok?.access_token) return json({ ok: false, error: "Instagram tokeni yoxdur — hesabı yenidən qoş." });

    const url = `${IG}/${acc.ig_user_id}/media?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${limit}&access_token=${encodeURIComponent(tok.access_token)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
    const j = await r.json();
    if (j.error) return json({ ok: false, error: "Instagram feed oxunmadı: " + (j.error.message || "naməlum") });
    const media = (j.data || []).map((m: any) => ({
      id: m.id,
      type: m.media_type,
      url: m.media_type === "VIDEO" ? (m.thumbnail_url || m.media_url) : m.media_url,
      thumb: m.thumbnail_url || m.media_url,
      permalink: m.permalink || "",
      ts: m.timestamp || "",
    }));
    return json({ ok: true, username: acc.username || "", media });
  } catch (e) {
    return json({ ok: false, error: "Xəta: " + String((e as any)?.message || e) }, 500);
  }
});
