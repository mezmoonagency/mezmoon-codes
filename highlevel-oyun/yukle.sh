#!/bin/bash
# HighLevel oyununu mezmoonagency.az-a gizli adla yükləyir (yeni fayl, mövcud heç nəyi dəyişmir)
set -e
cd "$(dirname "$0")"
N=hl-oyun-7q3x9k.html
TOK=$(python3 ../hostinger-token.py) || exit 1
R=$(curl -s -X POST https://developers.hostinger.com/api/hosting/v1/files/upload-urls -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d '{"username":"u420084070","domain":"mezmoonagency.az"}')
U=$(echo "$R"|python3 -c "import sys,json;print(json.load(sys.stdin)['url'])") || { echo "Token xətası: $R" | cut -c1-200; exit 1; }
A=$(echo "$R"|python3 -c "import sys,json;print(json.load(sys.stdin)['auth_key'])")
RA=$(echo "$R"|python3 -c "import sys,json;print(json.load(sys.stdin)['rest_auth_key'])")
L=$(stat -f%z "$N"); U=${U%/}
curl -s -o /dev/null -w "POST %{http_code}\n" -X POST "$U/$N?override=true" -H "X-Auth: $A" -H "X-Auth-Rest: $RA" -H "Tus-Resumable: 1.0.0" -H "Upload-Length: $L" -H "Content-Length: 0"
curl -s -o /dev/null -w "PATCH %{http_code}\n" -X PATCH "$U/$N?override=true" -H "X-Auth: $A" -H "X-Auth-Rest: $RA" -H "Tus-Resumable: 1.0.0" -H "Upload-Offset: 0" -H "Content-Type: application/offset+octet-stream" --data-binary @"$N"
curl -s "https://mezmoonagency.az/$N?nc=$RANDOM" -o /tmp/hl-live-check.html
cmp /tmp/hl-live-check.html "$N" && echo "YÜKLƏNDİ: https://mezmoonagency.az/$N"
