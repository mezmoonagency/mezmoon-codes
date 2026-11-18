#!/bin/bash
# Mirror real sayt: mezmoonagency.az/mirror/ (index, müştəri paneli, admin, şəkillər).
# Yeni qovluqdur, canlıda başqa heç nəyi əvəz etmir. Sonda index canlıdan endirilib müqayisə olunur.
set -e
cd "$(dirname "$0")"
TOK=$(python3 "$HOME/Documents/Mezmoon Codes/hostinger-token.py") || exit 1
R=$(curl -s -X POST https://developers.hostinger.com/api/hosting/v1/files/upload-urls -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d '{"username":"u420084070","domain":"mezmoonagency.az"}')
U=$(echo "$R"|python3 -c "import sys,json;print(json.load(sys.stdin)['url'])") || { echo "Token xətası: $R" | cut -c1-200; exit 1; }
A=$(echo "$R"|python3 -c "import sys,json;print(json.load(sys.stdin)['auth_key'])")
RA=$(echo "$R"|python3 -c "import sys,json;print(json.load(sys.stdin)['rest_auth_key'])")
U=${U%/}
up(){ N=$1; D="mirror/$1"; L=$(stat -f%z "$N")
  P=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$U/$D?override=true" -H "X-Auth: $A" -H "X-Auth-Rest: $RA" -H "Tus-Resumable: 1.0.0" -H "Upload-Length: $L" -H "Content-Length: 0")
  Q=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$U/$D?override=true" -H "X-Auth: $A" -H "X-Auth-Rest: $RA" -H "Tus-Resumable: 1.0.0" -H "Upload-Offset: 0" -H "Content-Type: application/offset+octet-stream" --data-binary @"$N")
  echo "$D: POST $P, PATCH $Q"; case "$P$Q" in 2*2*) ;; *) echo "Yükləmə alınmadı, dayandırıldı."; exit 1;; esac; }
for f in brendler/*.jpg brendler/fon/*.jpg; do up "$f"; done
up panel.html
up admin.html
up index.html
sleep 2
curl -s "https://mezmoonagency.az/mirror/index.html?nc=$RANDOM$RANDOM" -o /tmp/mirror-live-check.html
if cmp -s /tmp/mirror-live-check.html index.html; then echo "CANLIDADIR: https://mezmoonagency.az/mirror/"
else echo "Yükləndi, amma canlı fayl fərqli görünür (keş və ya qovluq yolu problemi ola bilər)"; fi
