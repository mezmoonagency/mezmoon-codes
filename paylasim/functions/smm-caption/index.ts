// Supabase Edge Function: "smm-caption"
// SMM Plan-da paylaşım üçün Instagram və TikTok mətni yazır (Azərbaycanca).
//   POST {client, kinds:["foto"|"video"|...], note, platforms:["instagram","tiktok"], drive_id?}
//   → {ok, instagram?, tiktok?, seen?, image:boolean, cost_usd}
// drive_id verilibsə, faylın Drive önizləməsi (videoda bir kadr) modelə şəkil kimi göndərilir.
// İcazə: ceo, pm, marketing, account. Açar: public.app_secrets ANTHROPIC_API_KEY.
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MODEL = "claude-opus-5-5";
const ROLES = ["ceo", "pm", "marketing", "account"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SYSTEM = `Sən Bakıdakı restoran, kafe, otel və əyləncə məkanları üçün sosial media mətnləri yazan təcrübəli SMM mütəxəssisisən.
Mətnləri tapşırıqda göstərilən dillərdə, canlı danışıq dilində yaz. Şablon reklam ifadələrindən qaç ("unudulmaz anlar", "ən yaxşı seçim", "sizi gözləyirik" və s.).
Yalnız verilən məlumata söykən: qiymət, endirim, tarix, menyu adı və ya ünvan uydurma. Məlumat yoxdursa, ümumi amma konkret hiss verən mətn yaz.
Instagram: hər dildə 2-4 qısa cümlə, ilk cümlə diqqət çəksin, sonda yumşaq çağırış (məs. rezerv, gəl, yaz).
TikTok: hər dildə 1-2 qısa cümlə, güclü giriş. Emoji az və yerində.
Hər dil üçün mətni ayrıca sahəyə yaz: "az" Azərbaycan dilində, "ru" rus dilində, "en" ingilis dilində. Dillər eyni məzmunu daşısın, amma hərfi tərcümə kimi səslənməsin.
Ünvan və telefonu mətnə yazma, onları sistem özü sona əlavə edir. Hashtag yalnız tapşırıqda istənilibsə yaz.
Nümunə açıqlama verilibsə, onun quruluşunu, uzunluğunu və tonunu izlə, amma məzmunu bu paylaşıma uyğun yaz.
Məkanın əvvəlki mətnləri verilibsə, onların tonunu və üslubunu saxla, eyni cümlələri təkrarlama.
Şəkil verilibsə, mətn mütləq şəkildə görünənə uyğun olsun: məsələn futbol yayımıdırsa oyun gecəsi, yeməkdirsə həmin yemək, musiqidirsə canlı ifa. Şəkildə oxunmayan adları (komanda, müğənni, yemək adı) uydurma. "seen" sahəsinə şəkildə nə gördüyünü bir qısa cümlə ilə yaz.`;

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
    const platforms = (Array.isArray(body.platforms) ? body.platforms : []).filter((p: string) => p === "instagram" || p === "tiktok");
    if (!client || !platforms.length) return json({ ok: false, error: "Məkan və platforma seçilməlidir." });
    const kinds = (Array.isArray(body.kinds) ? body.kinds : []).map(String).slice(0, 4);
    const note = String(body.note || "").slice(0, 1500);
    const driveId = String(body.drive_id || "").replace(/[^\w-]/g, "").slice(0, 120);
    let image: { media_type: string; data: string } | null = null;
    if (driveId) {
      try {
        const r = await fetch(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`, { redirect: "follow" });
        const ct = (r.headers.get("content-type") || "").split(";")[0];
        if (r.ok && /^image\/(jpeg|png|webp|gif)$/.test(ct)) {
          const buf = new Uint8Array(await r.arrayBuffer());
          if (buf.length > 0 && buf.length < 4_500_000) {
            let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
            image = { media_type: ct, data: btoa(bin) };
          }
        }
      } catch (_) { /* şəkilsiz davam */ }
    }

    const { data: sec } = await sb.from("app_secrets").select("value").eq("key", "ANTHROPIC_API_KEY").maybeSingle();
    if (!sec?.value) return json({ ok: false, error: "ANTHROPIC_API_KEY təyin edilməyib." });

    const { data: venue } = await sb.from("smm_venues").select("ig_link,note").eq("client", client).maybeSingle();
    const { data: cl } = await sb.from("clients").select("brand").eq("name", client).maybeSingle();
    const brand: Record<string, any> = (cl && cl.brand && typeof cl.brand === "object") ? cl.brand : {};
    const LANGS: Record<string, string[]> = { "Yalnız Azərbaycanca": ["az"], "Azərbaycanca + Rusca": ["az", "ru"], "Azərbaycanca + İngiliscə": ["az", "en"], "Azərbaycanca + Rusca + İngiliscə": ["az", "ru", "en"] };
    const langs = LANGS[String(brand.cap_langs || "")] || ["az"];
    const brandTags = String(brand.hashtags || "").trim();
    const genTags = !brandTags && !brand.cap_example && !brand.cap_langs; // brend ayarı yoxdursa, köhnə qayda: AI özü hashtag yazır
    const bline = (k: string, l: string) => String(brand[k] || "").trim() ? `${l}: ${String(brand[k]).trim().slice(0, 700)}` : "";
    const { data: prev } = await sb.from("smm_posts").select("caption").eq("client", client).neq("caption", "").order("created_at", { ascending: false }).limit(5);
    const examples = (prev || []).map((p: any) => String(p.caption).slice(0, 600)).filter(Boolean);

    const props: Record<string, unknown> = {};
    const langProps: Record<string, unknown> = {};
    for (const l of langs) langProps[l] = { type: "string" };
    for (const p of platforms) props[p] = { type: "object", properties: langProps, required: langs, additionalProperties: false };
    if (image) props.seen = { type: "string" };
    const user = [
      `Məkan: ${client}`,
      venue?.ig_link ? `Instagram: ${venue.ig_link}` : "",
      venue?.note ? `Məkan haqqında qeyd: ${String(venue.note).slice(0, 600)}` : "",
      Array.isArray(brand.tone) && brand.tone.length ? `Brend tonu: ${brand.tone.join(", ")}` : "",
      bline("tagline", "Brend vədi"), bline("about", "Məkan haqqında"), bline("audience", "Auditoriya"), bline("signature", "İmza yeməklər / içkilər"),
      bline("do", "Hər paylaşımda olsun"), bline("dont", "Qadağandır"),
      brand.cap_example ? `Nümunə açıqlama (format üçün):\n---\n${String(brand.cap_example).slice(0, 1500)}\n---` : "",
      `Dillər: ${langs.join(", ")}.`,
      genTags ? "Azərbaycanca mətnin sonuna ayrıca sətirdə uyğun hashtaglar əlavə et (Instagram 5-8, TikTok 3-5)." : "Hashtag yazma.",
      `Paylaşım növü: ${kinds.join(", ") || "foto"}`,
      `Paylaşımın mövzusu: ${note || "(mövzu yazılmayıb)"}`,
      examples.length ? `Bu məkanın əvvəlki mətnləri:\n---\n${examples.join("\n---\n")}\n---` : "",
      image ? "Paylaşımın materialı şəkil kimi əlavə olunub, mətni ona uyğun yaz." : (driveId ? "Material var, amma şəkli açıla bilmədi: mətni mövzuya görə yaz." : ""),
      `Bu platformalar üçün mətn yaz: ${platforms.join(", ")}.`,
    ].filter(Boolean).join("\n");

    const anthropic = new Anthropic({ apiKey: sec.value });
    // deno-lint-ignore no-explicit-any
    const res: any = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      // @ts-ignore: SDK typings may lag the "default" fallback mode
      fallbacks: "default",
      system: SYSTEM,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: { type: "object", properties: props, required: image ? [...platforms, "seen"] : platforms, additionalProperties: false } },
      },
      messages: [{ role: "user", content: image ? [{ type: "image", source: { type: "base64", ...image } }, { type: "text", text: user }] : user }],
    } as any);
    if (res.stop_reason === "refusal") return json({ ok: false, error: "Mətn yazılmadı (model imtina etdi). Mövzunu dəyişib yenidən yoxla." });
    const text = (res.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    let raw: Record<string, any> = {};
    try { raw = JSON.parse(text); } catch (_) { return json({ ok: false, error: "Cavab oxunmadı, yenidən yoxla." }); }
    // Mətni brend formatında yığırıq: dillər ayrı abzas, sonra hashtaglar, ən sonda 📍 ünvan və 📞 telefon
    const footer = [String(brand.address || "").trim() ? "📍" + String(brand.address).trim() : "", String(brand.phone || "").trim() ? "📞 " + String(brand.phone).trim() : ""].filter(Boolean).join("\n");
    const out: Record<string, string> = {};
    for (const p of platforms) {
      const parts = langs.map((l) => String(raw[p]?.[l] || "").trim()).filter(Boolean);
      if (brandTags) parts.push(brandTags);
      if (footer) parts.push(footer);
      out[p] = parts.join("\n\n");
    }
    if (raw.seen) out.seen = String(raw.seen);
    const usage = res.usage || {};
    const cost = ((usage.input_tokens || 0) * 4 + (usage.output_tokens || 0) * 20) / 1e6;
    return json({ ok: true, ...out, langs, footer: !!footer, image: !!image, cost_usd: Math.round(cost * 10000) / 10000 });
  } catch (e) {
    return json({ ok: false, error: "Xəta: " + String((e as any)?.message || e) }, 500);
  }
});
