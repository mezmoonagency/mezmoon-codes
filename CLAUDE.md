# MezMoon CRM — layihə qeydləri

MezMoon Agency-nin marketing paneli + CRM: https://panel.mezmoonagency.az. UI və istifadəçi ilə ünsiyyət Azərbaycanca, qısa. AI şəkil/video promptları ingiliscə.

## Qırmızı xətlər
- Canlıya (Hostinger upload) və Supabase SQL dəyişikliyinə **yalnız açıq təsdiqlə** ("yüklə", "canlıya yüklə"). Oxuma sorğuları istisnadır.
- Yalnız istəniləni et. Qeyri-müəyyən "davam et" → soruş.
- Pullu abunə yoxdur. Token qənaəti: qısa yaz, artıq test/skrinşot etmə.
- Panelin görünüşü (bənövşəyi fonlar, Sora+Manrope, kölgəli kartlar, emoji) saxlanılır. 2026-10-28-də restyle rədd olunub; yalnız görünüşə toxunmayan düzəlişlər.
- Sirlər client koduna yazılmır: Supabase secrets və ya service-role-only `app_secrets` cədvəli.

## Quruluş
- `index.html` — bütün panel (vanilla JS, tək fayl), işlənən yeganə nüsxə. `APP_VERSION` hər deploy-da artırılır (format `YYYY.MM.DDx`). Köhnə `index-<versiya>.html` nüsxələri artıq yaradılmır: tarixçə git-dədir.
- `lounge.js` (index.html-dən dinamik import), `portal.html` (müştəri portalı, `?k=TOKEN`), `pwa/` (manifest, sw.js, ikonlar).
- `functions/*.ts` — Supabase Edge Functions (telegram-bot, client-portal, link-thumb, ref-analyze, ref-similar, office-presence). Lid funksiyaları ayrı qovluqlardadır: `lead-research/`, `audit-sektor/` (ig-audit sector.ts), `prospect-search/`.
- `sql/` — köhnə miqrasiya skriptləri. Kökdəki köhnə `index-20*.html` nüsxələri yalnız bu Mac-də qalır, depoda yoxdur (`.gitignore`).
- Tam tarixçə: `mezmoon-crm.zip` içində `mezmoon-crm/HANDOFF.md` + Claude yaddaşı (`mezmoon-crm-project`).

## Supabase
- Layihə ID: `tcdfhbtlqxcpwlycqhfv`.
- `pg_safeupdate` aktivdir: UPDATE/DELETE həmişə WHERE ilə.
- supabase-js builder-ləri həmişə `await` et.
- RLS köməkçiləri: `has_access()`, `my_role()`. Rollar: ceo, pm, marketing, account, coordinator, operator, targeting, responder və s.

## Deploy (Hostinger)
Fayl birbaşa alətlə yox, hazır skriptlə yüklənir (2026-11-14-dən):
1. Canlı faylı bir dəfə endir, son məlum lokal versiya ilə `cmp` et (2 Mac var, başqa yerdən dəyişə bilər).
2. Ayrı qovluq hazırla (`panel-deploy/`, `panel-preview/`, `teklif-deploy/` nümunədir): içində yüklənəcək fayl, canlının ehtiyat nüsxəsi və `yukle.sh`.
3. `yukle.sh`: açarı `TOK=$(python3 ../hostinger-token.py) || exit 1` ilə alır (60 dəqiqəlik açarı özü təzələyir), `files/upload-urls` (username `u420084070`; panel üçün domain `panel.mezmoonagency.az`, sayt üçün `mezmoonagency.az`), TUS POST + PATCH, sonra canlını endirib `cmp` edir.
4. Claude skripti `bash "<qovluq>/yukle.sh"` ilə özü işə sala bilir (ayarlarda icazə qaydası var). Yenə də yalnız istifadəçi açıq deyəndə.
5. Yükləmədən sonra səhifəni headless Chrome-da aç, konsol xətasına bax.
- Axın: böyük dəyişiklik əvvəl `preview.html`-ə, sınaqdan sonra `index.html`-ə. Köhnə canlı `index-<versiya>.html` kimi serverdə qalır.
- **`hosting_deploy` istifadə etmə** — bütün saytı əvəz edir.
- Firewall: çox sorğu IP-ni bloklayır. Server sorğularını minimumda saxla.
- Canlı: panel `2026.11.10c`, `teklif.html` = `teklif-mutexessis/teklif-new14.html`.

## Edge funksiyalar və Apify
- Funksiyanı `deploy_edge_function` ilə yerləşdir: bütün fayllar tam mətnlə göndərilir. Əvvəl canlı versiyanı `get_edge_function` ilə oxu, lokal nüsxə köhnə ola bilər. Sonra girişsiz çağırışla (401 gözlənilir) işə düşdüyünü yoxla.
- Apify aylıq hədd hər üç funksiyada 18$-dır (`ig-audit`, `prospect-search`, `lead-research`); hesabın öz limiti 19$.
- Apify-ı SQL-dən çağırmaq: `net.http_post` / `net.http_get` + `app_secrets.APIFY_TOKEN`, nəticə `net._http_response`. Aktorlar: `instagram-profile-scraper`, `instagram-search-scraper`.
- `lead-research` v4 (mənbə `lead-research/index.ts`): addımlar posts, market, rivals, deck, ref. `ref` təklif səhifəsinin tam analizini `leads.research.ref`-ə yazır.

## Təkliflər (teklif.html)
- Ünvan `mezmoonagency.az/teklif.html?p=<slug>`, data `proposals` cədvəlindən.
- **`get_proposal` çağırma və canlı linki açma**: hər açılış baxış sayılır. Datanı SQL ilə oxu, görünüşü lokal önizləmə ilə yoxla (canlı teklif.html + `<base>` + `fetch` əvəzləyicisi; nümunə `teklif-godiva/ONIZLEME-godiva.html`).
- Müştəriyə görünən mətni əvvəl istifadəçiyə göstər, "tətbiq et" sözündən sonra yaz.
- `meta.ref` (tam analiz) və `meta.deck` (Instagram analizi, vəd, plan): nümunələr `teklif-cag-baku/`, `teklif-godiva/`, `teklif-decaf/`. `meta.theme`: boş = MezMoon, `wt` = WeTrend, `mr` = Mirror. `meta.no_contact=true` əlaqə bölməsini və "Seç" düymələrini gizlədir.
- Kontent qarışığının rəngləri mövzuya görədir: MezMoon `--lav, --lav-lo, --lav-hi, #4E4A9E, --red`; WeTrend `--lav, --wt-pink, #7B4BF0, #B9A6FF, #5E528F`.
- Standart paketlər: Special 2500 və Standart 1500 (Decaf maddələri). WeTrend və MezMoon portfoliosu ayrıdır.
- Analizdə rəqəmləri özün hesabla və yoxla; videolara baxmadığını, baxış sayı gəlmədiyini səhifədə də qeyd et. Brendin öz paylaşımlarını kreator paylaşımlarından ayır.

## Komanda ilə iş (git)
İnsanlar üçün sadə dildə təlimat: `KOMANDA.md`. İstifadəçi orada yazılan ifadələrlə (məsələn "ən son versiyanı çək", "PR aç") müraciət edəcək.
Bu qovluq git deposudur. Komanda: CEO və bir əməkdaş, hər kəs öz Claude Code-u ilə işləyir. İki Claude bir-birini görmür: bir-birinin işini yalnız göndərilmiş (push) dəyişikliklərdən bilir.
- **İşə başlamazdan əvvəl:** `git pull`. Sonra yeni budaq aç: `git switch -c <qısa-ad>` (məsələn `godiva-paket`). `main` budağında birbaşa işləmə.
- **İşləyərkən:** kiçik və tez-tez commit et, sonra `git push`. Göndərilməyən iş digəri üçün mövcud deyil.
- **Bitəndə:** GitHub-da pull request aç. CEO baxır və `main`-ə qatır.
- **Sahə bölgüsü:** eyni anda eyni faylın eyni hissəsinə iki nəfər toxunmasın. Başlamazdan əvvəl komandaya nə üzərində işlədiyini yaz.
- **Toqquşma (conflict) olsa:** heç nəyi silmə, dayan və istifadəçiyə hansı versiyanın qalacağını soruş.
- **Canlıya yalnız CEO yükləyir** və yalnız `main` budağından. Əməkdaş və onun Claude-u Hostinger-ə və canlı Supabase-ə birbaşa yazmır.
- **Baza:** cədvəl dəyişikliyi `sql/` qovluğunda fayl kimi yazılır, CEO təsdiqləyəndən sonra tətbiq olunur. Edge funksiyalar depodakı mənbədən yerləşdirilir.
- **Sirlər** (`.env`, açarlar, tokenlər) depoya düşmür; `.gitignore`-a bax. Commit-dən əvvəl `git diff --cached`-ə göz at.

## Gözləyən işlər
- Panel `2026.11.14a` (budaq `tam-analiz`, önizləmə paketi `panel-preview/`): 5 addımlı Təqdimat, standart paketlər, tam analizin təklifə düşməsi. Önizləməyə yüklənməyi və istifadəçinin sınağını gözləyir.
- Marketing təklifləri (Instagram Insights nəticə dövrəsi, portalda aylıq hesabat və s.) — Claude yaddaşında `mezmoon-marketing-backlog`.
