// HighLevel oyunu: qeydiyyat və giriş (Telegram botu ilə təsdiq), hədiyyə kodları.
// Supabase Edge Function: hl-game  (verify_jwt: false, çünki qonaqlar panel istifadəçisi deyil)
//
// Lazım olan sirlər (Supabase → Edge Functions → Secrets), kodda YOXDUR:
//   HL_TG_BOT_TOKEN   BotFather-dən alınan token
//   HL_TG_BOT_NAME    botun istifadəçi adı, @ işarəsiz (məs. HighLevelBakuBot)
//   HL_TG_SECRET      webhook üçün özün seçdiyin təsadüfi sətir
//   HL_STAFF_PIN      qapıda kodu yoxlayan işçinin PIN-i
//
// Axın:
//   1. start   → brauzer ad/soyad/doğum tarixi/telefon göndərir, cavabda t.me linki alır
//   2. qonaq Telegram-da "Start", sonra "Nömrəmi göndər" basır
//   3. webhook → bot nömrənin həmin şəxsə aid olduğunu və formadakı ilə eyniliyini yoxlayır, 4 rəqəmli kod göndərir
//   4. verify  → qonaq kodu saytda yazır, cavabda sessiya açarı alır
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const BOT = Deno.env.get("HL_TG_BOT_TOKEN") ?? "";
const BOT_NAME = Deno.env.get("HL_TG_BOT_NAME") ?? "";
const TG_SECRET = Deno.env.get("HL_TG_SECRET") ?? "";
const STAFF_PIN = Deno.env.get("HL_STAFF_PIN") ?? "";

const PRIZE = "Double viski + Red Bull";
const GIFT_PER_PLAYER_DAYS = 7;   // bir qonağa neçə gündə bir hədiyyə
const GIFT_DAILY_CAP = 15;        // gündə ən çox neçə hədiyyə kodu verilir
const ORIGINS = ["https://mezmoonagency.az", "https://www.mezmoonagency.az"];

const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const rand = (n: number) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, "0")).join(""); };
const digits = (n: number) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(a[0] % 10 ** n).padStart(n, "0"); };
const normPhone = (v: string) => { let d = String(v ?? "").replace(/\D/g, ""); if (d.startsWith("994")) d = d.slice(3); if (d.startsWith("0")) d = d.slice(1); return /^(10|50|51|55|60|70|77|99)\d{7}$/.test(d) ? "994" + d : null; };
const age = (dob: string) => { const b = new Date(dob), n = new Date(); let a = n.getUTCFullYear() - b.getUTCFullYear(); if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) a--; return a; };
const name = (s: unknown) => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, 30);

async function tg(method: string, body: unknown) {
  await fetch(`https://api.telegram.org/bot${BOT}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
async function player(session: string) {
  if (!session) return null;
  const { data } = await sb.from("hl_sessions").select("player_id, expires_at").eq("token", session).maybeSingle();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  const { data: p } = await sb.from("hl_players").select("id, first_name, last_name, birth_date, phone").eq("id", data.player_id).maybeSingle();
  return p;
}
async function activeGift(pid: string) {
  const { data } = await sb.from("hl_gifts").select("code, prize, expires_at, redeemed_at").eq("player_id", pid).is("redeemed_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}
const pub = (p: any) => ({ ad: p.first_name, soy: p.last_name, dob: p.birth_date, tel: p.phone.slice(3) });

// ---- Telegram webhook ----
async function webhook(req: Request) {
  if (!TG_SECRET || req.headers.get("x-telegram-bot-api-secret-token") !== TG_SECRET) return new Response("forbidden", { status: 403 });
  const u = await req.json().catch(() => null);
  const m = u?.message;
  if (!m?.from) return new Response("ok");
  const chat = m.chat.id, uid = m.from.id;
  const askContact = { keyboard: [[{ text: "📱 Nömrəmi göndər", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };

  if (typeof m.text === "string" && m.text.startsWith("/start")) {
    const token = m.text.split(" ")[1]?.trim();
    if (!token) { await tg("sendMessage", { chat_id: chat, text: "Salam! Qeydiyyatı oyunun səhifəsindən başla, oradakı düymə səni bura gətirəcək." }); return new Response("ok"); }
    const { data: s } = await sb.from("hl_otp").select("token, status, expires_at").eq("token", token).maybeSingle();
    if (!s || s.status !== "pending" || new Date(s.expires_at) < new Date()) { await tg("sendMessage", { chat_id: chat, text: "Bu keçidin vaxtı bitib. Saytda yenidən «Kod göndər» bas." }); return new Response("ok"); }
    await sb.from("hl_otp").update({ tg_user_id: uid }).eq("token", token);
    await tg("sendMessage", { chat_id: chat, text: "HighLevel-ə xoş gəldin! Nömrəni təsdiqləmək üçün aşağıdakı düyməyə bas.", reply_markup: askContact });
    return new Response("ok");
  }

  if (m.contact) {
    if (m.contact.user_id !== uid) { await tg("sendMessage", { chat_id: chat, text: "Yalnız öz nömrəni göndərə bilərsən. Aşağıdakı düymədən istifadə et.", reply_markup: askContact }); return new Response("ok"); }
    const phone = normPhone(m.contact.phone_number);
    const { data: rows } = await sb.from("hl_otp").select("token, phone, expires_at").eq("tg_user_id", uid).eq("status", "pending").order("created_at", { ascending: false }).limit(1);
    const s = rows?.[0];
    if (!s || new Date(s.expires_at) < new Date()) { await tg("sendMessage", { chat_id: chat, text: "Aktiv sorğu tapılmadı. Saytda yenidən «Kod göndər» bas.", reply_markup: { remove_keyboard: true } }); return new Response("ok"); }
    if (!phone || phone !== s.phone) { await tg("sendMessage", { chat_id: chat, text: "Telegram nömrən saytda yazdığın nömrə ilə eyni deyil. Saytda nömrəni düzəlt və yenidən cəhd et.", reply_markup: { remove_keyboard: true } }); return new Response("ok"); }
    const code = digits(4);
    await sb.from("hl_otp").update({ code, status: "verified" }).eq("token", s.token);
    await tg("sendMessage", { chat_id: chat, text: `Təsdiq kodun: ${code}\n\nSayta qayıt və kodu yaz. Kod 10 dəqiqə etibarlıdır.`, reply_markup: { remove_keyboard: true } });
    return new Response("ok");
  }
  return new Response("ok");
}

// ---- brauzer API ----
Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("tg") === "1") return webhook(req);
  const H = { ...cors(req.headers.get("origin")), "content-type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: H });
  const out = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: H });
  const b = await req.json().catch(() => ({}));

  try {
    switch (b.action) {
      case "start": {            // qeydiyyat və ya giriş üçün təsdiq sorğusu
        const phone = normPhone(b.tel);
        if (!phone) return out({ error: "Telefon nömrəsi düzgün deyil." }, 400);
        const { data: ex } = await sb.from("hl_players").select("id").eq("phone", phone).maybeSingle();
        let payload = {};
        if (b.login) { if (!ex) return out({ error: "Bu nömrə ilə hesab tapılmadı. Qeydiyyatdan keç." }, 404); }
        else {
          if (ex) return out({ error: "Bu nömrə ilə hesab artıq var. Daxil ol." }, 409);
          const ad = name(b.ad), soy = name(b.soy), dob = String(b.dob ?? "");
          if (ad.length < 2 || soy.length < 2) return out({ error: "Ad və soyad ən azı 2 hərf olmalıdır." }, 400);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !(age(dob) >= 18 && age(dob) < 100)) return out({ error: "Oyun yalnız 18 yaşdan yuxarı qonaqlar üçündür." }, 400);
          if (b.consent !== true) return out({ error: "Razılıq tələb olunur." }, 400);
          payload = { ad, soy, dob };
        }
        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();   // eyni nömrəyə 15 dəqiqədə ən çox 5 sorğu
        const { count } = await sb.from("hl_otp").select("token", { count: "exact", head: true }).eq("phone", phone).gt("created_at", since);
        if ((count ?? 0) >= 5) return out({ error: "Çox cəhd edildi. 15 dəqiqədən sonra yenidən yoxla." }, 429);
        const token = rand(16);
        const { error } = await sb.from("hl_otp").insert({ token, phone, payload });
        if (error) throw error;
        return out({ token, link: `https://t.me/${BOT_NAME}?start=${token}` });
      }
      case "verify": {           // qonaq botun göndərdiyi kodu yazır
        const { data: s } = await sb.from("hl_otp").select("*").eq("token", String(b.token ?? "")).maybeSingle();
        if (!s || new Date(s.expires_at) < new Date()) return out({ error: "Sorğunun vaxtı bitib. Yenidən başla." }, 410);
        if (s.status === "pending") return out({ error: "Əvvəlcə Telegram-da nömrəni təsdiqlə.", wait: true }, 409);
        if (s.status !== "verified") return out({ error: "Bu kod artıq istifadə olunub." }, 410);
        if (s.attempts >= 5) return out({ error: "Çox səhv cəhd. Yenidən başla." }, 429);
        if (String(b.code ?? "") !== s.code) { await sb.from("hl_otp").update({ attempts: s.attempts + 1 }).eq("token", s.token); return out({ error: "Kod səhvdir.", left: 4 - s.attempts }, 400); }
        await sb.from("hl_otp").update({ status: "used" }).eq("token", s.token);
        let { data: p } = await sb.from("hl_players").select("*").eq("phone", s.phone).maybeSingle();
        if (!p) {
          if (!s.payload?.ad) return out({ error: "Hesab tapılmadı." }, 404);
          const ins = await sb.from("hl_players").insert({ phone: s.phone, first_name: s.payload.ad, last_name: s.payload.soy, birth_date: s.payload.dob, tg_user_id: s.tg_user_id }).select("*").single();
          if (ins.error) throw ins.error;
          p = ins.data;
        }
        await sb.from("hl_players").update({ last_login_at: new Date().toISOString(), tg_user_id: s.tg_user_id }).eq("id", p.id);
        const session = rand(24);
        await sb.from("hl_sessions").insert({ token: session, player_id: p.id });
        return out({ session, user: pub(p), gift: await activeGift(p.id) });
      }
      case "me": {
        const p = await player(String(b.session ?? ""));
        if (!p) return out({ error: "Sessiya bitib." }, 401);
        return out({ user: pub(p), gift: await activeGift(p.id) });
      }
      case "win": {              // qalibə hədiyyə kodu (limitlərlə)
        const p = await player(String(b.session ?? ""));
        if (!p) return out({ error: "Sessiya bitib." }, 401);
        const cur = await activeGift(p.id);
        if (cur) return out({ gift: cur });
        const since = new Date(Date.now() - GIFT_PER_PLAYER_DAYS * 864e5).toISOString();
        const { count: mine } = await sb.from("hl_gifts").select("id", { count: "exact", head: true }).eq("player_id", p.id).gt("created_at", since);
        if ((mine ?? 0) > 0) return out({ error: `Hədiyyə ${GIFT_PER_PLAYER_DAYS} gündə bir dəfə verilir. Rekord üçün oyna.`, limit: true }, 429);
        const day = new Date(); day.setUTCHours(0, 0, 0, 0);
        const { count: today } = await sb.from("hl_gifts").select("id", { count: "exact", head: true }).gt("created_at", day.toISOString());
        if ((today ?? 0) >= GIFT_DAILY_CAP) return out({ error: "Bugünkü hədiyyələr bitib. Sabah yenə cəhd et.", limit: true }, 429);
        for (let i = 0; i < 5; i++) {
          const code = "HL-" + digits(4);
          const ins = await sb.from("hl_gifts").insert({ player_id: p.id, code, prize: PRIZE }).select("code, prize, expires_at, redeemed_at").single();
          if (!ins.error) return out({ gift: ins.data });
        }
        throw new Error("code");
      }
      case "redeem": {           // qapıda işçi kodu yoxlayır və bağlayır
        if (!STAFF_PIN || String(b.pin ?? "") !== STAFF_PIN) return out({ error: "PIN səhvdir." }, 403);
        const { data: g } = await sb.from("hl_gifts").select("id, code, prize, expires_at, redeemed_at, player_id").eq("code", String(b.code ?? "").toUpperCase().trim()).maybeSingle();
        if (!g) return out({ ok: false, reason: "Belə kod yoxdur." });
        if (g.redeemed_at) return out({ ok: false, reason: "Bu kod artıq istifadə olunub." });
        if (new Date(g.expires_at) < new Date()) return out({ ok: false, reason: "Kodun vaxtı bitib." });
        const { data: p } = await sb.from("hl_players").select("first_name, last_name").eq("id", g.player_id).maybeSingle();
        if (b.confirm === true) await sb.from("hl_gifts").update({ redeemed_at: new Date().toISOString(), redeemed_by: name(b.staff) || "işçi" }).eq("id", g.id).is("redeemed_at", null);
        return out({ ok: true, prize: g.prize, guest: p ? `${p.first_name} ${p.last_name}` : "", done: b.confirm === true });
      }
      case "logout": { await sb.from("hl_sessions").delete().eq("token", String(b.session ?? "")); return out({ ok: true }); }
      case "delete": {           // qonaq öz hesabını silir (hədiyyələr və sessiyalar da silinir)
        const p = await player(String(b.session ?? ""));
        if (!p) return out({ error: "Sessiya bitib." }, 401);
        await sb.from("hl_otp").delete().eq("phone", p.phone);
        await sb.from("hl_players").delete().eq("id", p.id);
        return out({ ok: true });
      }
      default: return out({ error: "Naməlum əməliyyat." }, 400);
    }
  } catch (_e) {
    return out({ error: "Xəta baş verdi. Bir az sonra yenidən yoxla." }, 500);
  }
});
