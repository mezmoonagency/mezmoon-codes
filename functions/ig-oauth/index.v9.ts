// Supabase Edge Function: "ig-oauth"
// MezMoon CRM — məkanın Instagram hesabını panelə qoşmaq (Instagram API with Instagram Login; Facebook səhifəsi lazım deyil)
//
//   POST {action:"start", client_id}        (Authorization: istifadəçinin Supabase sessiyası, CEO/PM)
//        → Instagram giriş linki (3 gün etibarlı; məkan sahibinə də göndərmək olar)
//   GET  ?code=…&state=…                    → Instagram-dan qayıdış: token alınır, mesajlara abunə olunur, panelə yönləndirir
//   POST {action:"disconnect", ig_user_id}  (CEO/PM) → token silinir, izləmə dayanır
//   POST {action:"history", ig_user_id}     (CEO/PM) → son 90 günün yazışmaları Conversations API-dən yüklənir (qoşulanda avtomatik)
//   Hər qoşulmada statistika icazəsi də istənilir və son 30 günün statistikası fonda yüklənir (Hesab analitikası).
//   POST {action:"start", client_id, stats:true} → hesab əvvəl mesaj üçün qoşulmayıbsa yalnız statistika üçün qoşulur (mesaj izləmə açılmır)
//   POST {action:"start", client_id, stats:true, publish:true} → avtomatik paylaşım icazəsi də istənilir (ig_accounts.publish_ok)
//
// Sirlər: IG_APP_ID, IG_APP_SECRET. Meta tətbiqində «OAuth redirect URI»: https://<project>.supabase.co/functions/v1/ig-oauth
// 2026-11-08: ig_tokens → ig_accounts FK olduğu üçün token hesab sətrindən SONRA yazılır (ilk qoşulmada token itirdi).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deadlineFor, workingMinutes } from "./hours.ts";

let APP_ID = Deno.env.get("IG_APP_ID") || "";
let APP_SECRET = Deno.env.get("IG_APP_SECRET") || "";
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const sb = createClient(SB_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
// Sirlər env-də yoxdursa public.app_secrets cədvəlindən oxunur
async function loadSecrets() {
  if (APP_ID && APP_SECRET) return;
  const { data } = await sb.from("app_secrets").select("key,value").in("key", ["IG_APP_ID", "IG_APP_SECRET"]);
  for (const r of data || []) {
    if (r.key === "IG_APP_ID" && !APP_ID) APP_ID = r.value;
    if (r.key === "IG_APP_SECRET" && !APP_SECRET) APP_SECRET = r.value;
  }
}
async function internalKey() {
  const { data } = await sb.from("app_secrets").select("value").eq("key", "IG_INTERNAL_KEY").maybeSingle();
  return (data && data.value) || "";
}
const REDIRECT = SB_URL + "/functions/v1/ig-oauth";
const PANEL = "https://panel.mezmoonagency.az/";
const IG_GRAPH = "https://graph.instagram.com/v21.0";
const STATE_TTL = 3 * 86400e3;
const MANAGERS = ["ceo", "pm", "marketing", "account"];
const MSG_MANAGERS = ["ceo", "pm"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const back = (q: Record<string, string>) => Response.redirect(PANEL + "?" + new URLSearchParams(q).toString(), 302);

const b64u = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
async function hmac(s: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(s)));
  return b64u(String.fromCharCode(...sig));
}
async function makeState(p: Record<string, unknown>) { const body = b64u(JSON.stringify(p)); return body + "." + (await hmac(body)); }
async function readState(s: string) {
  const [body, sig] = String(s || "").split(".");
  if (!body || !sig || (await hmac(body)) !== sig) return null;
  const p = JSON.parse(unb64u(body));
  return Date.now() - Number(p.t) > STATE_TTL ? null : p;
}

async function caller(req: Request) {
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await sb.auth.getUser(jwt);
  if (!data || !data.user) return null;
  const { data: prof } = await sb.from("profiles").select("id,role").eq("id", data.user.id).maybeSingle();
  return prof && MANAGERS.includes(prof.role) ? prof : null;
}

async function finish(code: string, state: string) {
  const st = await readState(state);
  if (!st) return back({ ig: "err", m: "Link etibarsızdır və ya vaxtı keçib — paneldən yenidən «Instagram-ı qoş» bas." });
  // 1) qısa token
  const form = new URLSearchParams({ client_id: APP_ID, client_secret: APP_SECRET, grant_type: "authorization_code", redirect_uri: REDIRECT, code: code.replace(/#_$/, "") });
  const t1 = await (await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form })).json();
  const short = t1.access_token || (t1.data && t1.data[0] && t1.data[0].access_token);
  if (!short) return back({ ig: "err", m: "Instagram token vermədi: " + (t1.error_message || (t1.error && t1.error.message) || "naməlum") });
  // 2) 60 günlük token
  const t2 = await (await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(APP_SECRET)}&access_token=${encodeURIComponent(short)}`)).json();
  const token = t2.access_token || short;
  const expires = new Date(Date.now() + Number(t2.expires_in || 3600) * 1000).toISOString();
  // 3) hesab məlumatı (user_id = webhook-dakı entry.id)
  const me = await (await fetch(`${IG_GRAPH}/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(token)}`)).json();
  if (!me.user_id) return back({ ig: "err", m: "Hesab oxunmadı: " + ((me.error && me.error.message) || "naməlum") });
  // 4) mesaj webhook-una abunə
  const sub = await (await fetch(`${IG_GRAPH}/me/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(token)}`, { method: "POST" })).json();
  const id = String(me.user_id);
  // statistika icazəsi verilibmi?
  let statsOk = false;
  { const ins = await (await fetch(`${IG_GRAPH}/me/insights?metric=reach&period=day&metric_type=total_value&access_token=${encodeURIComponent(token)}`)).json().catch(() => ({ error: {} })); statsOk = !ins.error; }
  // avtomatik paylaşım icazəsi verilibmi?
  let publishOk = false;
  { const lim = await (await fetch(`${IG_GRAPH}/me/content_publishing_limit?access_token=${encodeURIComponent(token)}`)).json().catch(() => ({ error: {} })); publishOk = !lim.error; }
  const { data: prev } = await sb.from("ig_accounts").select("status").eq("ig_user_id", id).maybeSingle();
  const statsOnly = !!st.s && !(prev && (prev.status === "active" || prev.status === "error"));
  const { error: accErr } = await sb.from("ig_accounts").upsert({
    ig_user_id: id, client_id: st.c, username: me.username || "", connected_by: st.u, connected_at: new Date().toISOString(),
    status: statsOnly ? "stats" : (sub.success ? "active" : "error"),
    last_error: statsOnly || sub.success ? "" : "Webhook abunəliyi alınmadı: " + ((sub.error && sub.error.message) || "naməlum"),
    stats_ok: statsOk, stats_err: statsOk ? null : "Statistika icazəsi verilmədi", publish_ok: publishOk,
  }, { onConflict: "ig_user_id" });
  if (accErr) return back({ ig: "err", u: me.username || "", m: "Hesab yadda saxlanmadı: " + accErr.message });
  // Token hesab sətrindən sonra yazılır (ig_tokens.ig_user_id → ig_accounts FK)
  const { error: tokErr } = await sb.from("ig_tokens").upsert({ ig_user_id: id, access_token: token, expires_at: expires, refreshed_at: new Date().toISOString() }, { onConflict: "ig_user_id" });
  if (tokErr) return back({ ig: "err", u: me.username || "", m: "Token yadda saxlanmadı: " + tokErr.message + " — yenidən qoş." });
  if (statsOnly) { try { await fetch(`${IG_GRAPH}/me/subscribed_apps?access_token=${encodeURIComponent(token)}`, { method: "DELETE" }); } catch (_) { /* olmasa da olar */ } }
  else bg(startHistory(id).catch((e) => console.error("ig history", e)));   // keçmiş yazışmalar fonda
  // son 30 günün statistikası fonda
  { const key = await internalKey(); bg(fetch(SB_URL + "/functions/v1/ig-stats", { method: "POST", headers: { "Content-Type": "application/json", "x-internal-key": key }, body: JSON.stringify({ ig_user_id: id, backfill: true }) }).catch(() => {})); }
  if (st.p && !publishOk) return back({ ig: "err", u: me.username || "", m: "Hesab qoşuldu, amma avtomatik paylaşım icazəsi verilmədi — Meta tətbiqində instagram_business_content_publish icazəsi aktiv olmalıdır." });
  if (st.s) return back({ ig: statsOk ? "ok" : "err", u: me.username || "", m: statsOk ? "" : "Hesab qoşuldu, amma statistika icazəsi verilmədi — Meta tətbiqində instagram_business_manage_insights icazəsi aktiv olmalıdır." });
  return back({ ig: sub.success ? "ok" : "err", u: me.username || "", m: sub.success ? "" : "Hesab qoşuldu, amma mesaj abunəliyi alınmadı." });
}

// Keçmiş: webhook qoşulmadan əvvəlki yazışmalar. Instagram hər söhbətin yalnız son 20 mesajının detalını verir.
// Qoşulma anından (history_until) əvvəlki müştəri mesajları «gözləmə» kimi hesablanır (source = history);
// sonrakılar webhook-un işidir. Instagram iç-içə sorğularda yavaşdır, ona görə iş hissələrlə gedir:
// hər çağırış 25 söhbət emal edir və növbəti hissəni özü fonda başladır. Gedişat: ig_accounts.history_status.
const HISTORY_DAYS = 90, HISTORY_PAGE = 25;
const SELF = SB_URL + "/functions/v1/ig-oauth";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const bg = (p: Promise<unknown>) => { try { (globalThis as any).EdgeRuntime?.waitUntil(p); } catch (_) { /* yox */ } };

async function startHistory(acct: string) {
  const { data: a } = await sb.from("ig_accounts").select("connected_at,history_until").eq("ig_user_id", acct).maybeSingle();
  if (!a) return { ok: false, error: "Hesab tapılmadı" };
  const until = a.history_until || a.connected_at || new Date().toISOString();
  await sb.from("ig_waits").delete().eq("ig_user_id", acct).eq("source", "history");
  await sb.from("ig_accounts").update({ history_until: until, history_status: "loading 0" }).eq("ig_user_id", acct);
  return await historyChunk(acct, "", 0);
}
async function nextChunk(acct: string, after: string, done: number) {
  const key = await internalKey();
  await fetch(SELF, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "history", key, ig_user_id: acct, after, done }) });
}
async function igGet(url: string) {
  for (let i = 0; i < 3; i++) {
    try {
      const j = await (await fetch(url, { signal: AbortSignal.timeout(25000) })).json();
      if (!j.error) return j;
      if (i === 2) return j;
    } catch (e) { if (i === 2) return { error: { message: e instanceof Error ? e.message : String(e) } }; }
    await sleep(1500 * (i + 1));
  }
  return { error: { message: "naməlum" } };
}
async function historyChunk(acct: string, after: string, done: number) {
  const { data: a } = await sb.from("ig_accounts").select("history_until").eq("ig_user_id", acct).maybeSingle();
  const { data: tok } = await sb.from("ig_tokens").select("access_token").eq("ig_user_id", acct).maybeSingle();
  if (!a || !tok) return { ok: false, error: "Hesab və ya token tapılmadı" };
  const T = encodeURIComponent(tok.access_token);
  const until = Date.parse(a.history_until), cutoff = until - HISTORY_DAYS * 86400e3;
  const page = await igGet(`${IG_GRAPH}/me/conversations?platform=instagram&limit=${HISTORY_PAGE}&fields=updated_time${after ? "&after=" + encodeURIComponent(after) : ""}&access_token=${T}`);
  if (page.error) {
    await sb.from("ig_accounts").update({ history_status: "error: " + page.error.message }).eq("ig_user_id", acct);
    return { ok: false, error: page.error.message };
  }
  const convs = (page.data || []).filter((c: any) => Date.parse(c.updated_time) >= cutoff);
  const reachedEnd = convs.length < (page.data || []).length || !(page.paging && page.paging.next);
  // Mesajlar: eyni anda 3 sorğu (Instagram limitlərinə hörmət)
  const full: any[] = [];
  for (let i = 0; i < convs.length; i += 3) {
    const part = await Promise.all(convs.slice(i, i + 3).map((c: any) => igGet(`${IG_GRAPH}/${c.id}?fields=messages.limit(20){id,created_time,from,message}&access_token=${T}`)));
    for (const j of part) if (!j.error) full.push(j);
  }
  const msgs: any[] = [], waits: any[] = [], opens: any[] = [];
  for (const c of full) {
    const list = ((c.messages && c.messages.data) || []).map((m: any) => ({ ...m, t: Date.parse(String(m.created_time).replace(/\+0000$/, "Z")) }))
      .filter((m: any) => m.t >= cutoff && m.from && m.from.id).sort((x: any, y: any) => x.t - y.t);
    const cust = list.find((m: any) => String(m.from.id) !== acct);
    if (!cust) continue;
    const customer = String(cust.from.id), name = cust.from.username ? "@" + cust.from.username : "";
    let cur: any = null;
    for (const m of list) {
      const out = String(m.from.id) === acct;
      if (m.t < until) msgs.push({ mid: m.id, ig_user_id: acct, customer_id: customer, direction: out ? "out" : "in", sent_at: new Date(m.t).toISOString() });
      if (out) {
        if (cur) {
          waits.push({ ...cur, status: "replied", replied_at: new Date(m.t).toISOString(), response_min: workingMinutes(cur._t, m.t), late: m.t > Date.parse(cur.deadline_at) });
          cur = null;
        }
        continue;
      }
      if (m.t >= until) continue; // qoşulmadan sonrakı müştəri mesajları webhook-dadır
      if (cur) { cur.msg_count++; continue; }
      const { limit, deadline } = deadlineFor(m.t);
      cur = { _t: m.t, ig_user_id: acct, customer_id: customer, customer_name: name, preview: String(m.message || "📎 fayl / media").slice(0, 140),
        first_msg_at: new Date(m.t).toISOString(), limit_min: limit, deadline_at: new Date(deadline).toISOString(), msg_count: 1, source: "history" };
    }
    // Cavabsız qalan: son 24 saatdadırsa açıq gözləmə, köhnədirsə statistikadan kənar (closed) — köhnə söhbətlərə xatırlatma getməsin
    if (cur) {
      const recent = Date.now() - cur._t < 86400e3;
      (recent ? opens : waits).push({ ...cur, status: recent ? "open" : "closed", late: Date.now() > Date.parse(cur.deadline_at) });
    }
  }
  const strip = (w: any) => { const { _t, ...r } = w; return r; };
  if (msgs.length) await sb.from("ig_messages").upsert(msgs, { onConflict: "mid", ignoreDuplicates: true });
  if (waits.length) {
    const { error } = await sb.from("ig_waits").insert(waits.map(strip));
    if (error) { await sb.from("ig_accounts").update({ history_status: "error: " + error.message }).eq("ig_user_id", acct); return { ok: false, error: error.message }; }
  }
  for (const w of opens) await sb.from("ig_waits").insert(strip(w)); // eyni müştəri üçün webhook gözləməsi varsa unikal indeks buraxır
  done += convs.length;
  const nextAfter = page.paging && page.paging.cursors && page.paging.cursors.after;
  if (reachedEnd || !nextAfter) {
    await sb.from("ig_accounts").update({ history_status: "done " + done }).eq("ig_user_id", acct);
    return { ok: true, done: true, conversations: done };
  }
  await sb.from("ig_accounts").update({ history_status: "loading " + done }).eq("ig_user_id", acct);
  bg(nextChunk(acct, nextAfter, done));
  return { ok: true, done: false, conversations: done };
}

Deno.serve(async (req) => {
  await loadSecrets();
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!APP_ID || !APP_SECRET) return req.method === "GET" ? back({ ig: "err", m: "IG_APP_ID / IG_APP_SECRET təyin edilməyib" }) : json({ ok: false, error: "IG_APP_ID / IG_APP_SECRET təyin edilməyib (Supabase sirləri)" });
  const url = new URL(req.url);
  if (req.method === "GET") {
    if (url.searchParams.get("error")) return back({ ig: "err", m: "İcazə verilmədi: " + (url.searchParams.get("error_description") || url.searchParams.get("error")) });
    const code = url.searchParams.get("code");
    if (!code) return back({ ig: "err", m: "Kod yoxdur" });
    try { return await finish(code, url.searchParams.get("state") || ""); }
    catch (e) { return back({ ig: "err", m: e instanceof Error ? e.message : String(e) }); }
  }
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* boş */ }
  if (body.action === "history" && body.key) {
    const k = await internalKey();
    if (!k || body.key !== k) return json({ ok: false, error: "forbidden" }, 403);
    const acct = String(body.ig_user_id || "");
    // Növbəti hissə fonda işləyir — çağıran gözləmir (zəncir iç-içə qalmasın)
    bg((body.after ? historyChunk(acct, String(body.after), Number(body.done) || 0) : startHistory(acct)).catch((e) => console.error("ig history", e)));
    return json({ ok: true, started: true });
  }
  const who = await caller(req);
  if (!who) return json({ ok: false, error: "Yalnız CEO, PM, Marketinq və Account Instagram hesabı qoşa bilər" }, 403);
  if (body.action !== "start" && !MSG_MANAGERS.includes(who.role)) return json({ ok: false, error: "Yalnız CEO və PM" }, 403);
  if (body.action === "history") { bg(startHistory(String(body.ig_user_id || "")).catch((e) => console.error("ig history", e))); return json({ ok: true, started: true }); }
  if (body.action === "start") {
    if (!body.client_id) return json({ ok: false, error: "Məkan seçilməyib" });
    if (!body.stats && !MSG_MANAGERS.includes(who.role)) return json({ ok: false, error: "Mesaj izləmə üçün hesabı yalnız CEO və PM qoşa bilər" }, 403);
    const state = await makeState({ c: body.client_id, u: who.id, t: Date.now(), s: body.stats ? 1 : 0, p: body.publish ? 1 : 0 });
    const scope = "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_insights" + (body.publish ? ",instagram_business_content_publish" : "");
    const q = new URLSearchParams({ enable_fb_login: "0", force_authentication: "1", client_id: APP_ID, redirect_uri: REDIRECT, response_type: "code", scope, state });
    return json({ ok: true, url: "https://www.instagram.com/oauth/authorize?" + q.toString() });
  }
  if (body.action === "disconnect") {
    const id = String(body.ig_user_id || "");
    const { data: tok } = await sb.from("ig_tokens").select("access_token").eq("ig_user_id", id).maybeSingle();
    if (tok) { try { await fetch(`${IG_GRAPH}/me/subscribed_apps?access_token=${encodeURIComponent(tok.access_token)}`, { method: "DELETE" }); } catch (_) { /* olmasa da olar */ } }
    await sb.from("ig_tokens").delete().eq("ig_user_id", id);
    await sb.from("ig_accounts").update({ status: "disconnected", last_error: "" }).eq("ig_user_id", id);
    // açıq qalan gözləmələr üçün xatırlatma getməsin
    await sb.from("ig_waits").update({ status: "closed" }).eq("ig_user_id", id).eq("status", "open");
    return json({ ok: true });
  }
  return json({ ok: false, error: "Naməlum əməliyyat" });
});
