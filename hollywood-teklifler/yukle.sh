#!/bin/bash
# Hollywood Group gizli təklif səhifəsi: mezmoonagency.az/hw-teklif-r8n3v6p2.html + 3 aparıcı fotosu və MezMoon loqosu.
# Yeni fayllardır, canlıda heç nəyi əvəz etmir. Sonda səhifə canlıdan endirilib müqayisə olunur.
set -e
cd "$(dirname "$0")"
TOK=$(python3 ../hostinger-token.py) || exit 1
R=$(curl -s -X POST https://developers.hostinger.com/api/hosting/v1/files/upload-urls -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d '{"username":"u420084070","domain":"mezmoonagency.az"}')
U=$(echo "$R"|python3 -c "import sys,json;print(json.load(sys.stdin)['url'])") || { echo "Token xətası: $R" | cut -c1-200; exit 1; }
A=$(echo "$R"|python3 -c "import sys,json;print(json.load(sys.stdin)['auth_key'])")
RA=$(echo "$R"|python3 -c "import sys,json;print(json.load(sys.stdin)['rest_auth_key'])")
U=${U%/}
up(){ N=$1; L=$(stat -f%z "$N")
  P=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$U/$N?override=true" -H "X-Auth: $A" -H "X-Auth-Rest: $RA" -H "Tus-Resumable: 1.0.0" -H "Upload-Length: $L" -H "Content-Length: 0")
  Q=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$U/$N?override=true" -H "X-Auth: $A" -H "X-Auth-Rest: $RA" -H "Tus-Resumable: 1.0.0" -H "Upload-Offset: 0" -H "Content-Type: application/offset+octet-stream" --data-binary @"$N")
  echo "$N: POST $P, PATCH $Q"; case "$P$Q" in 2*2*) ;; *) echo "Yükləmə alınmadı, dayandırıldı."; exit 1;; esac; }
for f in hw-akt-*.jpg hw-mezmoon-logo.png; do up "$f"; done
up hw-teklif-r8n3v6p2.html
sleep 2
curl -s "https://mezmoonagency.az/hw-teklif-r8n3v6p2.html?nc=$RANDOM$RANDOM" -o /tmp/hw-live-check.html
if cmp -s /tmp/hw-live-check.html hw-teklif-r8n3v6p2.html; then echo "CANLIDADIR: mezmoonagency.az/hw-teklif-r8n3v6p2.html"
else echo "Yükləndi, amma canlı fayl fərqli görünür (keş ola bilər)"; fi
