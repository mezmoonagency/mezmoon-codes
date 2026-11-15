// İş saatı qaydası (Bakı, UTC+4, yay vaxtı yoxdur):
//   B.e.–Şənbə 10:00–20:00 → cavab müddəti 25 dəqiqə
//   Bazar      10:00–20:00 → cavab müddəti 4 saat
// İş saatından kənar gələn mesajın taymeri növbəti açılışdan başlayır; müddət yalnız iş saatlarında sayılır.
// Müddət taymerin başladığı günə görə seçilir (şənbə 22:00 → bazar 10:00 başlayır → 4 saat).

const OFF = 4 * 3600e3, OPEN = 10, CLOSE = 20, DAY = 86400e3;

function dayStart(ms: number) {
  const d = new Date(ms + OFF);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - OFF;
}
export const isSunday = (ms: number) => new Date(ms + OFF).getUTCDay() === 0;
export function nextOpen(ms: number) {
  const ds = dayStart(ms), o = ds + OPEN * 3600e3, c = ds + CLOSE * 3600e3;
  if (ms < o) return o;
  if (ms < c) return ms;
  return ds + DAY + OPEN * 3600e3;
}
export const inHours = (ms: number) => nextOpen(ms) === ms;
export const limitFor = (startMs: number) => (isSunday(startMs) ? 240 : 25);
export function addWorking(ms: number, min: number) {
  let t = nextOpen(ms), left = min * 60e3;
  for (let i = 0; i < 60; i++) {
    const c = dayStart(t) + CLOSE * 3600e3;
    if (t + left <= c) return t + left;
    left -= c - t;
    t = nextOpen(c);
  }
  return t;
}
export function workingMinutes(a: number, b: number) {
  if (b <= a) return 0;
  let t = nextOpen(a), sum = 0;
  for (let i = 0; i < 400 && t < b; i++) {
    const c = dayStart(t) + CLOSE * 3600e3;
    sum += Math.min(c, b) - t;
    t = nextOpen(c);
  }
  return Math.round(sum / 60e3);
}
export function deadlineFor(firstMs: number) {
  const start = nextOpen(firstMs), limit = limitFor(start);
  return { limit, deadline: addWorking(start, limit) };
}
// Gecikmiş mesaj üçün xatırlatma aralığı: B.e.–Şənbə 25 dəq, Bazar 60 dəq
export const repeatMin = (nowMs: number) => (isSunday(nowMs) ? 60 : 25);
