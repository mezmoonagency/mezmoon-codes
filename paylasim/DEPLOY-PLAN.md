# Paylaşım: yerləşdirmə sırası (hər addım təsdiqlə)
1. `paylasim.sql`
2. Funksiyalar:
   - yeni `smm-publish`
   - `smm-check`: posts sorğusuna `.neq("publish_mode","auto")`; remind üçün info-ya mətn + fayl linki
   - `smm-autocheck`: posts sorğusuna `.neq("publish_mode","auto").eq("as_story",false)`
   - `ig-oauth`: `body.publish` → scope-a `instagram_business_content_publish`, state `p`; finish-də `/me/content_publishing_limit` → `ig_accounts.publish_ok`
3. `paylasim-cron.sql`
4. `preview.html` Hostinger-ə (canlı `index.html`-ə toxunmadan), test, sonra canlı ilə diff + merge.
