// 时间展示工具（日期处理与规则、页面分开）
const pad = (n) => String(n).padStart(2, '0');

// 生成 datetime-local 用的本地时间字符串：默认 N 天后的 14:00
export function localInput(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultStart(daysAhead = 2) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(14, 0, 0, 0);
  return localInput(d);
}

export function defaultEnd(daysAhead = 2) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(16, 0, 0, 0);
  return localInput(d);
}

// 2026-08-25T14:00 -> 2026-08-25 14:00
export const dt = (v) => (v ? String(v).replace('T', ' ') : '');

// 场次时段：同一天只显示日期一次
export function rangeText(start, end) {
  if (!start || !end) return '时间待定';
  const [sd, st] = start.split('T');
  const [ed, et] = end.split('T');
  return sd === ed
    ? `${sd} ${st}–${et}`
    : `${sd} ${st} — ${ed} ${et}`;
}

export function daysBetween(a, b) {
  return Math.abs(new Date(a) - new Date(b)) / (24 * 60 * 60 * 1000);
}
