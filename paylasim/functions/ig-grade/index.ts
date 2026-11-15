// Supabase Edge Function: "ig-grade"
// Örtüyü nümunə referansa uyğun YALNIZ rəng xarakterini köçürür — parlaqlıq/məzmun qorunur, təbii adaptasiya.
//   POST {action:"start", (src_b64|src_url), src_mime?, (ref_b64|ref_url), ref_mime?, aspect?, strength?}  (JWT) → {ok, rid}
//   POST {action:"poll", rid}  (JWT) → {ok, status, url}
// İcazə: ceo, pm, marketing, account. Açar: app_secrets HIGGSFIELD_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const HF = "https://api.higgsfield.ai";
const ROLES = ["ceo", "pm", "marketing", "account"];
const ASPECTS = ["9:16", "3:4", "2:3", "1:1", "4:3", "16:9"];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const secret = async (k: string) => (await sb.from("app_secrets").select("value").eq("key", k).maybeSingle()).data?.value || "";

async function hf(path: string, key: string, init: RequestInit = {}) {
  const r = await fetch(HF + path, { ...init, headers: { "Authorization": "Key " + key, "Content-Type": "application/json", ...(init.headers || {}) } });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch (_) { /* boş */ }
  if (!r.ok) throw new Error("Higgsfield " + r.status + ": " + ((j && (j.detail || j.error)) || t.slice(0, 200)));
  return j;
}
function b64ToBytes(b64: string) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
async function hfUploadBytes(key: string, bytes: Uint8Array, ct: string) {
  const u = await hf("/files/generate-upload-url", key, { method: "POST", body: JSON.stringify({ content_type: ct }) });
  const r = await fetch(u.upload_url, { method: "PUT", headers: { "Content-Type": ct, ...(u.upload_headers || {}) }, body: bytes });
  if (!r.ok) throw new Error("Şəkil Higgsfield-ə yüklənmədi (" + r.status + ")");
  return u.public_url as string;
}
async function toHf(key: string, b64: string | undefined, url: string | undefined, mime: string) {
  if (url) { const r = await fetch(url, { signal: AbortSignal.timeout(25000) }); if (!r.ok) throw new Error("Şəkil endirilmədi (" + r.status + ")"); const bytes = new Uint8Array(await r.arrayBuffer()); const ct = (r.headers.get("content-type") || "").split(";")[0] || mime; return hfUploadBytes(key, bytes, ct.startsWith("image/") ? ct : mime); }
  if (b64) return hfUploadBytes(key, b64ToBytes(b64.replace(/^data:[^,]+,/, "")), mime);
  throw new Error("Şəkil çatmır");
}

function gradePrompt(strength: string) {
  const base =
`Reference image 1 is the ORIGINAL photo. Reference image 2 is a COLOR reference.
Transfer ONLY the color character of reference image 2 onto reference image 1 — its white balance, warmth/coolness and overall color mood, as a light color grade.
Keep reference image 1 otherwise IDENTICAL: the same subject, faces, people, food, objects, products, text, logos, composition, framing, shapes, positions, perspective and every detail. Do NOT add, remove, move, redraw, reinterpret, beautify or regenerate anything.
CRITICAL — brightness: keep the ORIGINAL photo's own brightness, exposure and contrast. Do NOT make it darker or lighter overall; do NOT copy how dark or bright the reference is, only its colors.
CRITICAL — keep real colors: preserve the true colors of distinct objects (a red object stays red, green stays green, blue stays blue, white stays white). Do NOT push every color toward one single hue; only gently harmonize the overall tone. Keep skin and food colors natural and appetizing.
Add no new text or logos. Never take any object, person, text or layout from reference image 2 — only a gentle color feel.`;
  const s = strength === "strong"
    ? "Grade strength: apply the color feel clearly, but still natural and without darkening."
    : strength === "medium"
      ? "Grade strength: moderate and natural — a clear but gentle tone shift."
      : "Grade strength: VERY SUBTLE — a light touch only; the result must look almost like the original photo with just a soft, natural tone shift.";
  return base + "\n" + s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return json({ ok: false, error: "Giriş tələb olunur" }, 401);
    const { data: prof } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
    if (!prof || !ROLES.includes(prof.role)) return json({ ok: false, error: "İcazə yoxdur" }, 403);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const key = await secret("HIGGSFIELD_KEY");
    if (!key) return json({ ok: false, error: "HIGGSFIELD_KEY təyin edilməyib" });

    if (action === "start") {
      const aspect = ASPECTS.includes(body.aspect) ? body.aspect : "3:4";
      const strength = ["soft", "medium", "strong"].includes(body.strength) ? body.strength : "soft";
      const srcUrl = await toHf(key, body.src_b64, body.src_url, String(body.src_mime || "image/jpeg"));
      const refUrl = await toHf(key, body.ref_b64, body.ref_url, String(body.ref_mime || "image/jpeg"));
      const r = await hf("/marketing-studio/image/flare", key, { method: "POST", body: JSON.stringify({ prompt: gradePrompt(strength), image_urls: [srcUrl, refUrl], resolution: "2k", aspect_ratio: aspect, quality: "high", enhance_prompt: false }) });
      if (!r.request_id) return json({ ok: false, error: "Higgsfield başlatmadı" });
      return json({ ok: true, rid: r.request_id });
    }
    if (action === "poll") {
      const rid = String(body.rid || "");
      if (!rid) return json({ ok: false, error: "rid yoxdur" });
      const st = await hf(`/requests/${rid}/status`, key, { method: "GET" });
      if (st.status === "completed" && st.images?.[0]?.url) return json({ ok: true, status: "completed", url: st.images[0].url });
      if (["failed", "nsfw", "canceled"].includes(st.status)) return json({ ok: true, status: "failed", error: st.status === "nsfw" ? "Filtrdən keçmədi" : (st.error || "Alınmadı") });
      return json({ ok: true, status: "pending" });
    }
    return json({ ok: false, error: "Naməlum əməliyyat" }, 400);
  } catch (e) { return json({ ok: false, error: String((e as any)?.message || e) }, 500); }
});
