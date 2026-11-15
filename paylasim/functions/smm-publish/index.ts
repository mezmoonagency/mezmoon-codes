// Supabase Edge Function: "smm-publish" — MezMoon CRM · SMM Plan avtomatik paylaşım (pg_cron hər 2 dəqiqə)
// publish_mode='auto' paylaşımlar vaxtı gələndə Instagram-a göndərilir. Fayl Supabase-dən keçmir:
// Drive-dakı ictimai link Meta-ya verilir, Meta faylı özü endirir.
//   ''/retry → creating → processing → publishing → done (status='posted')   |   hər yerdən → failed (bildiriş gedir)
// Hər keçid şərtli update ilə tutulur ki, eyni paylaşım iki dəfə getməsin. media_publish cavabı bəlli deyilsə təkrar edilmir.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const IG = "https://graph.instagram.com/v21.0";
const MIN = 60e3, BAKU = 240 * MIN, MAX_LATE = 360 * MIN, MAX_TRIES = 3, STUCK = 10 * MIN, PROCESS_LIMIT = 30 * MIN;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
const driveUrl = (id: string) => `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;
const dueOf = (p: any) => {
  const t = String(p.post_time || "").match(/(\d{1,2}):(\d{2})/);
  return Date.parse(`${p.post_date}T00:00:00Z`) + ((t ? +t[1] : (p.kind === "video" ? 20 : 12)) * 60 + (t ? +t[2] : 0)) * MIN - BAKU;
};
async function igPost(path: string, params: Record<string, string>) {
  const r = await fetch(`${IG}/${path}`, { method: "POST", body: new URLSearchParams(params), signal: AbortSignal.timeout(40000) });
  return await r.json();
}
async function igGet(path: string, fields: string, token: string) {
  const r = await fetch(`${IG}/${path}?fields=${fields}&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(25000) });
  return await r.json();
}
/* Şərtli keçid: sətir hələ gözlənilən vəziyyətdədirsə yenilə; başqa proses tutubsa false */
async function move(p: any, from: string, patch: Record<string, unknown>) {
  const { data } = await sb.from("smm_posts").update(patch).eq("id", p.id).eq("status", "plan").eq("publish_status", from).select("id");
  return !!(data && data.length);
}
async function fail(p: any, from: string, msg: string) {
  if (!(await move(p, from, { publish_status: "failed", publish_error: msg.slice(0, 500) }))) return;
  const { data: heads } = await sb.from("profiles").select("id").in("role", ["ceo", "pm"]);
  const ids = new Set<string>((heads || []).map((x: any) => x.id));
  if (p.account_id) ids.add(p.account_id);
  const when = `${String(p.post_date).split("-").reverse().join(".")} · saat ${p.post_time || ""}`;
  await sb.from("notifications").insert([...ids].map((id) => ({ target_type: "user", target: id, title: `⚠️ Avtomatik paylaşım alınmadı — ${p.client}`,
    body: `Vaxt: ${when}\nSəbəb: ${msg}\n\nSMM Plan-da paylaşımı aç: yenidən cəhd et və ya əl ilə paylaş.`, from_name: "MezMoon CRM", read_by: [] })));
}
async function retryOrFail(p: any, from: string, msg: string) {
  const n = Number(p.publish_attempts || 0) + 1;
  if (n >= MAX_TRIES) return await fail(p, from, msg);
  await move(p, from, { publish_status: "retry", publish_attempts: n, publish_error: msg.slice(0, 500), ig_container: "" });
}
async function accountOf(client: string) {
  const { data: c } = await sb.from("clients").select("id").eq("name", client).limit(1);
  if (!c || !c.length) return null;
  const { data: a } = await sb.from("ig_accounts").select("ig_user_id,publish_ok").eq("client_id", c[0].id).eq("publish_ok", true).limit(1);
  if (!a || !a.length) return null;
  const { data: t } = await sb.from("ig_tokens").select("access_token").eq("ig_user_id", a[0].ig_user_id).maybeSingle();
  return t && t.access_token ? { id: a[0].ig_user_id as string, token: t.access_token as string } : null;
}
async function start(p: any, acc: { id: string; token: string }) {
  const from = p.publish_status;
  if (Date.now() - dueOf(p) > MAX_LATE) return await fail(p, from, "Vaxtı 6 saatdan çox keçib, gec paylaşılmadı.");
  if (from === "retry" && Date.now() - Date.parse(p.publish_started_at || 0) < 5 * MIN * Number(p.publish_attempts || 1)) return;
  if (!p.media_id) return await fail(p, from, "Material seçilməyib və ya silinib.");
  const { data: m } = await sb.from("smm_media").select("drive_id,mime").eq("id", p.media_id).maybeSingle();
  if (!m) return await fail(p, from, "Material kitabxanada tapılmadı.");
  if (!(await move(p, from, { publish_status: "creating", publish_started_at: new Date().toISOString() }))) return;
  const isVideo = String(m.mime).startsWith("video/");
  const params: Record<string, string> = { access_token: acc.token, [isVideo ? "video_url" : "image_url"]: driveUrl(m.drive_id) };
  if (p.as_story) params.media_type = "STORIES";
  else { if (isVideo) params.media_type = "REELS"; if (p.caption) params.caption = p.caption; }
  // Panelin Instagram ayarları (yalnız lent/Reels): AI işarəsi, həmmüəllif, örtük kadrı, audio adı, alt mətn
  const o: Record<string, any> = (p.ig_opts && typeof p.ig_opts === "object") ? p.ig_opts : {};
  const extra: Record<string, string> = {};
  if (!p.as_story) {
    if (o.ai) extra.is_ai_generated = "true";
    const col = (Array.isArray(o.collab) ? o.collab : []).map(String).filter((x: string) => /^[A-Za-z0-9._]{1,30}$/.test(x)).slice(0, 3);
    if (col.length) extra.collaborators = JSON.stringify(col);
    if (isVideo) {
      if (o.share_to_feed === false) extra.share_to_feed = "false";
      if (Number(o.cover_s) > 0) extra.thumb_offset = String(Math.round(Number(o.cover_s) * 1000));
      if (String(o.audio || "").trim()) extra.audio_name = String(o.audio).trim().slice(0, 100);
    } else if (String(o.alt || "").trim()) extra.alt_text = String(o.alt).trim().slice(0, 1000);
  }
  let j = await igPost(`${acc.id}/media`, { ...params, ...extra });
  // Əlavə ayar rədd edilərsə paylaşım dayanmasın: ayarsız bir dəfə də yoxla, Account-a bildir
  if (!j.id && Object.keys(extra).length) {
    const why = j.error?.message || "naməlum";
    const j2 = await igPost(`${acc.id}/media`, params);
    if (j2.id) {
      j = j2;
      if (p.account_id) await sb.from("notifications").insert({ target_type: "user", target: p.account_id, title: `ℹ️ Instagram ayarları tətbiq olunmadı — ${p.client}`,
        body: `Paylaşım ayarsız göndərildi (AI işarəsi, həmmüəllif və s.).\nSəbəb: ${why}\n\nLazımdırsa ayarı Instagram tətbiqində əl ilə əlavə et.`, from_name: "MezMoon CRM", read_by: [] });
    } else j = { error: { message: why } };
  }
  if (!j.id) return await retryOrFail(p, "creating", "Instagram faylı qəbul etmədi: " + (j.error?.message || "naməlum"));
  await move(p, "creating", { publish_status: "processing", ig_container: String(j.id) });
}
async function advance(p: any, acc: { id: string; token: string }) {
  const c = await igGet(p.ig_container, "status_code,status", acc.token);
  if (c.error) return await retryOrFail(p, "processing", "Status oxunmadı: " + c.error.message);
  if (c.status_code === "ERROR" || c.status_code === "EXPIRED") return await retryOrFail(p, "processing", "Instagram faylı emal edə bilmədi: " + (c.status || c.status_code));
  if (c.status_code !== "FINISHED") {
    if (Date.now() - Date.parse(p.publish_started_at || 0) > PROCESS_LIMIT) await fail(p, "processing", "Instagram 30 dəqiqədə faylı emal etmədi.");
    return;
  }
  if (!(await move(p, "processing", { publish_status: "publishing" }))) return;
  let j: any;
  try { j = await igPost(`${acc.id}/media_publish`, { access_token: acc.token, creation_id: p.ig_container }); }
  catch (_) { return await fail(p, "publishing", "Instagram cavab vermədi. Paylaşılmış ola bilər, əvvəlcə hesabı yoxla."); }
  if (!j.id) return await fail(p, "publishing", "Paylaşılmadı: " + (j.error?.message || "naməlum"));
  let link = "";
  try { link = (await igGet(String(j.id), "permalink", acc.token)).permalink || ""; } catch (_) { /* link olmasa da paylaşılıb */ }
  await sb.from("smm_posts").update({ status: "posted", auto: true, done_at: new Date().toISOString(), post_url: link, ig_media_id: String(j.id), publish_status: "done", publish_error: "" }).eq("id", p.id);
}

Deno.serve(async (req) => {
  const { data: k } = await sb.from("app_secrets").select("value").eq("key", "IG_INTERNAL_KEY").maybeSingle();
  const ik = req.headers.get("x-internal-key") || "";
  if (!ik || !k || k.value !== ik) return json({ ok: false, error: "icazə yoxdur" }, 401);
  const day = (o: number) => new Date(Date.now() + BAKU + o * 864e5).toISOString().slice(0, 10);
  const { data: posts } = await sb.from("smm_posts").select("*").eq("status", "plan").eq("publish_mode", "auto")
    .in("publish_status", ["", "retry", "creating", "processing", "publishing"]).gte("post_date", day(-1)).lte("post_date", day(0));
  const due = (posts || []).filter((p: any) => Date.now() >= dueOf(p)).sort((a: any, b: any) => dueOf(a) - dueOf(b)).slice(0, 8);
  const done: string[] = [];
  for (const p of due) {
    try {
      const age = Date.now() - Date.parse(p.publish_started_at || 0);
      if (p.publish_status === "creating" || p.publish_status === "publishing") {
        if (age > STUCK) await fail(p, p.publish_status, "Proses yarımçıq qaldı. Paylaşılmış ola bilər, əvvəlcə hesabı yoxla.");
        continue;
      }
      const acc = await accountOf(p.client);
      if (!acc) { await fail(p, p.publish_status, "Məkanın Instagram-ı avtomatik paylaşım üçün qoşulmayıb."); continue; }
      if (p.publish_status === "processing") await advance(p, acc); else await start(p, acc);
      done.push(p.id);
    } catch (e) {
      console.error("smm-publish", p.id, e instanceof Error ? e.message : String(e));
    }
  }
  return json({ ok: true, checked: due.length, done: done.length });
});
