// 排期规则层：所有业务规则集中在这里，纯函数，不依赖 React 与存储。

export const RULES = {
  MIN_PAPERS: 3,
  MAX_PAPERS: 5,
  PAPER_COOLDOWN_DAYS: 30,
  HOST_GAP_DAYS: 14
};

const MS_PER_DAY = 86400000;

// ---------- 日期工具（按本地时区解释，避免 UTC 偏移） ----------

export function parseLocal(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toInputValue(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 默认排到三天后的 14:00–16:00。
export function defaultSlot() {
  const start = new Date();
  start.setDate(start.getDate() + 3);
  start.setHours(14, 0, 0, 0);
  const end = new Date(start);
  end.setHours(16, 0, 0, 0);
  return { start: toInputValue(start), end: toInputValue(end) };
}

export function dayDiff(aValue, bValue) {
  const a = parseLocal(aValue);
  const b = parseLocal(bValue);
  if (!a || !b) return null;
  const at = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bt = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.abs(at - bt) / MS_PER_DAY;
}

export const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function formatRange(startValue, endValue) {
  const s = parseLocal(startValue);
  const e = parseLocal(endValue);
  if (!s) return '时间未定';
  const date = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
  const time = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const tail = e ? `${time(s)}–${time(e)}（${WEEKDAYS[s.getDay()]}）` : `${time(s)}（${WEEKDAYS[s.getDay()]}）`;
  return `${date} ${tail}`;
}

// ---------- 规则判定 ----------

export function rangesOverlap(a, b) {
  const as = parseLocal(a.start);
  const ae = parseLocal(a.end) || as;
  const bs = parseLocal(b.start);
  const be = parseLocal(b.end) || bs;
  if (!as || !bs) return false;
  return as < be && bs < ae;
}

// 返回与候选场次时间重叠的已存在场次（不含自身）。
export function findOverlap(candidate, sessions) {
  return sessions.find((s) => s.id !== candidate.id && rangesOverlap(candidate, s));
}

// 返回某篇目在冷却期内命中的场次（不含候选场次自身）。
export function findPaperCooldown(paperId, candidate, sessions) {
  return sessions.find((s) => {
    if (s.id === candidate.id) return false;
    if (!s.paperIds.includes(paperId)) return false;
    const diff = dayDiff(candidate.start, s.start);
    return diff !== null && diff < RULES.PAPER_COOLDOWN_DAYS;
  });
}

// 返回同一主持人间隔不足的场次及间隔天数。
export function checkHostGap(candidate, sessions) {
  for (const s of sessions) {
    if (s.id === candidate.id) continue;
    if (!candidate.host || s.host !== candidate.host) continue;
    const diff = dayDiff(candidate.start, s.start);
    if (diff !== null && diff < RULES.HOST_GAP_DAYS) {
      return { session: s, days: diff };
    }
  }
  return null;
}

/**
 * 校验一个场次草案。
 * @param {object} draft { id?, host, start, end, paperIds:number[] }
 * @param {Array}  sessions 已存在的场次
 * @param {Map|object} papersById 篇目索引，用于复盘要点校验与标题回填
 * @returns {{ok:true}|{ok:false,code:string,message:string,paperId?:number,existing?:object,days?:number}}
 */
export function validateSession(draft, sessions, papersById) {
  const fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });

  if (!draft.host || !draft.host.trim()) {
    return fail('hostRequired', '请填写主持人');
  }
  if (!draft.start || !draft.end) {
    return fail('timeRequired', '请填写起止时间');
  }
  if (parseLocal(draft.end) <= parseLocal(draft.start)) {
    return fail('timeRange', '结束时间必须晚于开始时间');
  }

  const overlap = findOverlap(draft, sessions);
  if (overlap) {
    return fail('timeOverlap', `与原场次「${overlap.title || formatRange(overlap.start, overlap.end)}」时间重叠`, {
      existing: overlap
    });
  }

  const count = draft.paperIds.length;
  if (count < RULES.MIN_PAPERS || count > RULES.MAX_PAPERS) {
    return fail('count', `每场需安排 ${RULES.MIN_PAPERS}–${RULES.MAX_PAPERS} 篇，当前 ${count} 篇`);
  }

  for (const paperId of draft.paperIds) {
    const paper = papersById.get ? papersById.get(paperId) : papersById[paperId];
    if (paper && paper.status === '已读' && !(paper.review || '').trim()) {
      return fail('reviewRequired', `已读文献《${paper.title}》需先写复盘要点`, { paperId });
    }
  }

  for (const paperId of draft.paperIds) {
    const hit = findPaperCooldown(paperId, draft, sessions);
    if (hit) {
      const paper = papersById.get ? papersById.get(paperId) : papersById[paperId];
      const diff = dayDiff(draft.start, hit.start);
      return fail(
        'paperCooldown',
        `《${paper ? paper.title : paperId}》${diff} 天前刚入选过，三十天内不能重复`,
        { paperId, existing: hit, days: diff }
      );
    }
  }

  const hostClash = checkHostGap(draft, sessions);
  if (hostClash) {
    return fail(
      'hostGap',
      `主持人 ${draft.host} 与上一场仅隔 ${hostClash.days} 天，至少需隔 ${RULES.HOST_GAP_DAYS} 天`,
      { existing: hostClash.session, days: hostClash.days }
    );
  }

  return { ok: true };
}

// 冻结后调整：生成字段级变更说明，随原因一起留痕。
export function describeChange(before, after, paperTitle = (id) => `#${id}`) {
  const lines = [];
  if ((before.title || '') !== (after.title || '')) {
    lines.push(`主题：${before.title || '（无）'} → ${after.title || '（无）'}`);
  }
  if (before.host !== after.host) {
    lines.push(`主持人：${before.host || '（空）'} → ${after.host || '（空）'}`);
  }
  if (before.start !== after.start || before.end !== after.end) {
    lines.push(`时段：${formatRange(before.start, before.end)} → ${formatRange(after.start, after.end)}`);
  }
  const beforeIds = before.paperIds || [];
  const afterIds = after.paperIds || [];
  const removed = beforeIds.filter((id) => !afterIds.includes(id));
  const added = afterIds.filter((id) => !beforeIds.includes(id));
  if (removed.length) lines.push(`移除篇目：${removed.map(paperTitle).join('、')}`);
  if (added.length) lines.push(`新增篇目：${added.map(paperTitle).join('、')}`);
  return lines;
}
