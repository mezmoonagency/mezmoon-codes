# Komanda ilə iş təlimatı

Bu təlimat ikimiz üçündür (CEO və əməkdaş). Çox şeyi Claude edir; bizim işimiz ona nə vaxt nə deyəcəyimizi bilməkdir.

## Əsas anlayışlar
- **`main`**: canlı saytda olan versiya. Burada heç kim birbaşa işləmir.
- **Budaq**: hər iş üçün ayrıca nüsxə. Orada istədiyin qədər dəyiş, `main` pozulmur.
- **Pull request (PR)**: "işimi bitirdim, baxın və `main`-ə qatın" sorğusu.
- Canlıya yalnız CEO yükləyir, yalnız `main`-dən.

## Gündəlik iş axını

### 1. İşə başlamazdan əvvəl
- Bir-birinizə yazın: "Godiva təklifi üzərindəyəm" kimi. Eyni anda eyni şeyi dəyişməyin.
- Claude-a deyin: *"Ən son versiyanı çək və `godiva-paket` adlı yeni budaq aç."*

### 2. İşləyərkən
- Claude-a adi dildə nə lazım olduğunu deyin.
- Hər hissə bitəndə: *"Bunu yadda saxla (commit) və göndər."* Göndərilməyən işi digəri görmür. Tez-tez göndərin, gün sonuna saxlamayın.

### 3. İş bitəndə
- Claude-a deyin: *"Pull request aç."* Linki digərinə göndərin.

### 4. Baxış və birləşdirmə (CEO)
- Öz Claude-una deyirsən: *"PR-a bax, nəyi dəyişib, problem varmı?"*
- Qaydasındadırsa: *"PR-ı `main`-ə birləşdir."*
- Düzəliş lazımdırsa, PR-ın altına şərh yaz. Əməkdaş düzəldib yenidən göndərir, eyni PR yenilənir.

### 5. Canlıya yükləmək (yalnız CEO)
- *"`main`-i çək, paneli önizləməyə yüklə."* Önizləmədə yoxla.
- Hər şey qaydasındadırsa: *"Canlıya yüklə."*

## Qızıl qaydalar
1. **`main`-də birbaşa işləmə.** Həmişə budaq.
2. **Başlamazdan əvvəl çək, bitirəndə göndər.**
3. **Eyni faylın eyni hissəsinə ikiniz birdən toxunmayın.** Panel tək böyük faylda olduğu üçün bu vacibdir: biriniz təkliflər, digəri başqa bölmə kimi bölüşün.
4. **Canlı sayta, Hostinger-ə və canlı bazaya yalnız CEO toxunur.**
5. **Bazada dəyişiklik** (yeni cədvəl, sütun): Claude onu `sql/` qovluğunda fayl kimi yazır, PR-la gəlir, CEO təsdiqləyəndən sonra tətbiq olunur.
6. **Sirlər** (açarlar, parollar, tokenlər) heç vaxt depoya düşmür. Claude-a çatda açar göndərməyin.

## Problem çıxanda
- **"Conflict" (toqquşma):** ikiniz eyni yeri dəyişmisiniz. Heç nəyi silməyin. Claude-a deyin: *"Toqquşmanı göstər, nə fərqlidir?"* Hansı versiyanın qalacağına birlikdə qərar verin.
- **Səhv bir şey `main`-ə düşüb:** *"Son birləşməni geri qaytar."* Git-də heç nə tam itmir, köhnə vəziyyətə qayıtmaq olur.
- **Claude "depo privatedir" və ya "giriş yoxdur" deyir:** GitHub girişi yoxdur. `gh auth login --web` ilə öz hesabınla yenidən daxil olun.

## Nümunə: bir iş əvvəldən axıra
1. Telegram: "Paneldə lid filtrini düzəldirəm."
2. Claude: "Son versiyanı çək, `lid-filtr` budağı aç."
3. Claude: "Filtrə 'Təklif göndərildi' statusunu əlavə et." Sonra: "Commit et və göndər."
4. Claude: "PR aç." Linki CEO-ya göndər.
5. CEO-nun Claude-u: "PR-a bax." → "Birləşdir." → "Önizləməyə yüklə." → yoxlama → "Canlıya yüklə."
