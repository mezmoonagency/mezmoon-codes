// mirror-api: Mirror saytı, müştəri paneli və admin üçün tək funksiya.
// verify_jwt=false ilə yerləşdirilir: ictimai əməliyyatlar (issue, check, lead, client) açarsız işləyir,
// admin əməliyyatları (a_*) MezMoon panel istifadəçisinin JWT-si ilə yoxlanılır.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ADMIN_ROLES = ["ceo", "pm", "account"];
const DISCOUNT_PCT = 10, DISCOUNT_MIN = 60;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const bad = (m: string, s = 400) => json({ error: m }, s);

async function ipHash(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0";
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("mirror:" + ip));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function newCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = crypto.getRandomValues(new Uint8Array(5));
  return "MIR-" + [...r].map((b) => A[b % A.length]).join("");
}
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function admin(req: Request) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!t) return null;
  const { data, error } = await SB.auth.getUser(t);
  if (error || !data?.user) return null;
  const { data: p } = await SB.from("profiles").select("role,full_name").eq("id", data.user.id).maybeSingle();
  if (!p || !ADMIN_ROLES.includes(p.role)) return null;
  return { id: data.user.id, name: p.full_name, role: p.role };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return bad("POST lazımdır", 405);
  let b: Record<string, any>;
  try { b = await req.json(); } catch { return bad("JSON səhvdir"); }
  const a = String(b.action || "");

  try {
    /* ---------- ictimai ---------- */
    if (a === "issue") { // 2 dəqiqə qalan ziyarətçiyə kod
      const sid = str(b.sid, 64); if (sid.length < 8) return bad("sid");
      const now = new Date();
      const { data: ex } = await SB.from("mirror_discount_codes").select("code,expires_at,used_at").eq("sid", sid).gt("expires_at", now.toISOString()).is("used_at", null).maybeSingle();
      if (ex) return json({ code: ex.code, expires_at: ex.expires_at, pct: DISCOUNT_PCT });
      const ih = await ipHash(req), hourAgo = new Date(now.getTime() - 3600e3).toISOString();
      const { count } = await SB.from("mirror_discount_codes").select("code", { count: "exact", head: true }).eq("ip_hash", ih).gt("issued_at", hourAgo);
      if ((count || 0) >= 6) return bad("Çox sorğu", 429);
      const exp = new Date(now.getTime() + DISCOUNT_MIN * 60e3).toISOString();
      for (let i = 0; i < 4; i++) {
        const code = newCode();
        const { error } = await SB.from("mirror_discount_codes").insert({ code, sid, ip_hash: ih, expires_at: exp });
        if (!error) return json({ code, expires_at: exp, pct: DISCOUNT_PCT });
      }
      return bad("Kod yaradılmadı", 500);
    }

    if (a === "check") {
      const code = str(b.code, 16).toUpperCase();
      const { data } = await SB.from("mirror_discount_codes").select("expires_at,used_at").eq("code", code).maybeSingle();
      const valid = !!data && !data.used_at && new Date(data.expires_at) > new Date();
      return json({ valid, expires_at: data?.expires_at || null, pct: valid ? DISCOUNT_PCT : 0 });
    }

    if (a === "lead") { // paket sorğusu
      const name = str(b.name, 80), phone = str(b.phone, 30).replace(/[^\d+]/g, ""), company = str(b.company, 120), email = str(b.email, 120);
      if (name.length < 2) return bad("Ad lazımdır");
      if (phone.replace(/\D/g, "").length < 7) return bad("Telefon nömrəsi səhvdir");
      const pkg = b.package && typeof b.package === "object" ? b.package : null;
      if (pkg && JSON.stringify(pkg).length > 8000) return bad("Paket çox böyükdür");
      const est = Math.max(0, Math.min(1e7, Number(b.est_price) || 0));
      const ih = await ipHash(req);
      const { count } = await SB.from("mirror_leads").select("id", { count: "exact", head: true }).eq("ip_hash", ih).gt("created_at", new Date(Date.now() - 3600e3).toISOString());
      if ((count || 0) >= 8) return bad("Çox sorğu, bir az sonra yenidən yoxlayın", 429);
      let pct = 0, code: string | null = null;
      const c = str(b.code, 16).toUpperCase();
      if (c) {
        const { data } = await SB.from("mirror_discount_codes").select("expires_at,used_at").eq("code", c).maybeSingle();
        if (data && !data.used_at && new Date(data.expires_at) > new Date()) { pct = DISCOUNT_PCT; code = c; }
      }
      const final = Math.round(est * (100 - pct)) / 100;
      const { data: lead, error } = await SB.from("mirror_leads").insert({ name, phone, company: company || null, email: email || null, package: pkg, est_price: est, discount_code: code, discount_pct: pct, final_price: final, ip_hash: ih }).select("id").single();
      if (error) throw error;
      if (code) await SB.from("mirror_discount_codes").update({ used_at: new Date().toISOString(), lead_id: lead.id }).eq("code", code).is("used_at", null);
      return json({ ok: true, discount_pct: pct, est_price: est, final_price: final });
    }

    if (a === "client") { // müştəri paneli: ?k=TOKEN
      const k = str(b.k, 80); if (k.length < 20) return bad("Link səhvdir", 404);
      const { data: cl } = await SB.from("mirror_clients").select("id,name,active").eq("token", k).maybeSingle();
      if (!cl || !cl.active) return bad("Link etibarsızdır", 404);
      const { data: camps } = await SB.from("mirror_campaigns").select("id,board_id,creative,start_date,end_date,note").eq("client_id", cl.id).order("start_date", { ascending: false });
      const ids = [...new Set((camps || []).map((c) => c.board_id))];
      const { data: boards } = ids.length ? await SB.from("mirror_boards").select("id,name,district,type,size,lat,lon,daily_traffic").in("id", ids) : { data: [] };
      const from = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
      const { data: plays } = ids.length ? await SB.from("mirror_plays_daily").select("board_id,creative,day,plays,hours").in("board_id", ids).gte("day", from) : { data: [] };
      // yalnız müştərinin kampaniya tarixlərinə və reklam adına uyğun göstərilmələr
      const rows: any[] = [];
      for (const c of camps || []) {
        const pat = (c.creative || "").toLowerCase();
        for (const p of plays || []) {
          if (p.board_id !== c.board_id || p.day < c.start_date || p.day > c.end_date) continue;
          if (pat && !String(p.creative).toLowerCase().includes(pat)) continue;
          rows.push({ campaign_id: c.id, board_id: p.board_id, day: p.day, plays: p.plays, hours: p.hours });
        }
      }
      const { data: last } = await SB.from("mirror_uploads").select("created_at").order("created_at", { ascending: false }).limit(1);
      return json({ client: { name: cl.name }, campaigns: camps || [], boards: boards || [], plays: rows, updated_at: last?.[0]?.created_at || null });
    }

    /* ---------- admin ---------- */
    if (a.startsWith("a_")) {
      const u = await admin(req); if (!u) return bad("Giriş icazəsi yoxdur", 401);

      if (a === "a_me") return json({ user: u });

      if (a === "a_list") {
        const [bo, cl, ca, up, le] = await Promise.all([
          SB.from("mirror_boards").select("*").order("id"),
          SB.from("mirror_clients").select("id,name,contact,token,active,created_at").order("created_at", { ascending: false }),
          SB.from("mirror_campaigns").select("*").order("start_date", { ascending: false }),
          SB.from("mirror_uploads").select("*").order("created_at", { ascending: false }).limit(60),
          SB.from("mirror_leads").select("id,created_at,name,phone,company,email,package,est_price,discount_code,discount_pct,final_price,status").order("created_at", { ascending: false }).limit(200),
        ]);
        const { count: codes } = await SB.from("mirror_discount_codes").select("code", { count: "exact", head: true });
        return json({ boards: bo.data, clients: cl.data, campaigns: ca.data, uploads: up.data, leads: le.data, codes_issued: codes || 0 });
      }

      if (a === "a_client_save") {
        const row: any = { name: str(b.name, 120), contact: str(b.contact, 200) || null, active: b.active !== false };
        if (row.name.length < 2) return bad("Ad lazımdır");
        const q = b.id ? SB.from("mirror_clients").update(row).eq("id", b.id) : SB.from("mirror_clients").insert(row);
        const { data, error } = await q.select("id,token").single(); if (error) throw error; return json({ ok: true, ...data });
      }
      if (a === "a_client_rotate") {
        const tok = [...crypto.getRandomValues(new Uint8Array(18))].map((x) => x.toString(16).padStart(2, "0")).join("");
        const { error } = await SB.from("mirror_clients").update({ token: tok }).eq("id", b.id); if (error) throw error; return json({ ok: true, token: tok });
      }
      if (a === "a_client_del") { const { error } = await SB.from("mirror_clients").delete().eq("id", b.id); if (error) throw error; return json({ ok: true }); }

      if (a === "a_campaign_save") {
        const row: any = { client_id: b.client_id, board_id: Number(b.board_id), creative: str(b.creative, 120) || null, start_date: b.start_date, end_date: b.end_date, note: str(b.note, 300) || null };
        const q = b.id ? SB.from("mirror_campaigns").update(row).eq("id", b.id) : SB.from("mirror_campaigns").insert(row);
        const { error } = await q; if (error) throw error; return json({ ok: true });
      }
      if (a === "a_campaign_del") { const { error } = await SB.from("mirror_campaigns").delete().eq("id", b.id); if (error) throw error; return json({ ok: true }); }

      if (a === "a_board_save") {
        const row: any = { id: Number(b.id), name: str(b.name, 120), district: str(b.district, 80) || null, type: str(b.type, 20), size: str(b.size, 30) || null,
          lat: b.lat === "" || b.lat == null ? null : Number(b.lat), lon: b.lon === "" || b.lon == null ? null : Number(b.lon),
          daily_traffic: b.daily_traffic === "" || b.daily_traffic == null ? null : Number(b.daily_traffic), is_sample: !!b.is_sample, active: b.active !== false };
        if (!row.id || row.name.length < 2) return bad("ID və ad lazımdır");
        const { error } = await SB.from("mirror_boards").upsert(row); if (error) throw error; return json({ ok: true });
      }

      if (a === "a_upload") { // loq: brauzerdə gün/panel/reklam üzrə toplanmış sətirlər
        const rows = Array.isArray(b.rows) ? b.rows : [];
        if (!rows.length || rows.length > 20000) return bad("Sətir sayı 1–20000 olmalıdır");
        const clean = rows.map((r: any) => ({ board_id: Number(r.board_id), creative: str(r.creative, 160), day: String(r.day).slice(0, 10), plays: Math.max(0, Math.round(Number(r.plays) || 0)),
          hours: Array.isArray(r.hours) && r.hours.length === 24 ? r.hours.map((x: any) => Math.max(0, Math.round(Number(x) || 0))) : null }))
          .filter((r: any) => r.board_id > 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.day));
        if (!clean.length) return bad("Uyğun sətir yoxdur");
        const { data: bset } = await SB.from("mirror_boards").select("id"); const known = new Set((bset || []).map((x: any) => x.id));
        const unknown = [...new Set(clean.filter((r: any) => !known.has(r.board_id)).map((r: any) => r.board_id))];
        if (unknown.length) return bad("Bazada olmayan panel ID: " + unknown.slice(0, 10).join(", "));
        const days = clean.map((r: any) => r.day).sort();
        const { data: up, error: e1 } = await SB.from("mirror_uploads").insert({ filename: str(b.filename, 200), kind: b.kind === "led" ? "led" : "template", rows: Number(b.raw_rows) || clean.length,
          plays: clean.reduce((s: number, r: any) => s + r.plays, 0), day_from: days[0], day_to: days[days.length - 1], uploaded_by: u.id }).select("id").single();
        if (e1) throw e1;
        for (let i = 0; i < clean.length; i += 1000) {
          const { error } = await SB.from("mirror_plays_daily").upsert(clean.slice(i, i + 1000).map((r: any) => ({ ...r, upload_id: up.id, updated_at: new Date().toISOString() })), { onConflict: "board_id,creative,day" });
          if (error) throw error;
        }
        return json({ ok: true, upload_id: up.id, rows: clean.length });
      }
      if (a === "a_upload_del") { const { error } = await SB.from("mirror_uploads").delete().eq("id", b.id); if (error) throw error; return json({ ok: true }); }

      if (a === "a_lead_status") {
        const st = str(b.status, 30); const { error } = await SB.from("mirror_leads").update({ status: st }).eq("id", b.id); if (error) throw error; return json({ ok: true });
      }
    }
    return bad("Naməlum əməliyyat");
  } catch (e) {
    console.error(a, e);
    return bad("Server xətası", 500);
  }
});
