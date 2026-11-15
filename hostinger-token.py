#!/usr/bin/env python3
"""Hostinger giriş açarını qaytarır; vaxtı bitibsə, brauzer açmadan özü yeniləyir.
Rəsmi alətin (hostinger-api-mcp, src/core/oauth.ts) etdiyi eyni yeniləmə sorğusudur. Açar ekrana yazılmır, yalnız çağıran skriptə ötürülür."""
import json, os, sys, time, urllib.parse, urllib.request
P = os.path.expanduser('~/.config/hostinger-mcp/credentials.json')
try: c = json.load(open(P))
except Exception: sys.exit('Hostinger girişi tapılmadı: npx hostinger-api-mcp@3.24.1 --login')
if c.get('access_token') and c.get('expires_at') and time.time() * 1000 < c['expires_at']:
    print(c['access_token']); sys.exit(0)
if not (c.get('refresh_token') and c.get('client_id')):
    sys.exit('Yeniləmə açarı yoxdur: npx hostinger-api-mcp@3.24.1 --login')
body = urllib.parse.urlencode({'grant_type': 'refresh_token', 'refresh_token': c['refresh_token'], 'client_id': c['client_id']}).encode()
req = urllib.request.Request('https://auth.hostinger.com/api/external/v1/oauth-server/token', data=body, headers={'Content-Type': 'application/x-www-form-urlencoded'})
try: t = json.load(urllib.request.urlopen(req, timeout=30))
except Exception as e: sys.exit(f'Açar yenilənmədi ({e}). Bir dəfə yenidən daxil ol: npx hostinger-api-mcp@3.24.1 --login')
new = {'client_id': c['client_id'], 'access_token': t['access_token'], 'refresh_token': t.get('refresh_token') or c['refresh_token'], 'expires_at': int(time.time() * 1000 + (int(t.get('expires_in', 3600)) - 60) * 1000)}
fd = os.open(P + '.tmp', os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, 'w') as f: json.dump(new, f, indent=2)
os.replace(P + '.tmp', P)
print(new['access_token'])
