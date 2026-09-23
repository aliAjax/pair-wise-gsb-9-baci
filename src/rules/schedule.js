// 排期规则（纯逻辑层，不依赖数据存储与页面）
// 规则来源：
//   1. 每场 3–5 篇、一名主持人、需要起止时间
//   2. 同一篇文献 30 天内不能重复入选
//   3. 同一名主持人前后两场至少间隔 14 天
//   4. 已读文献须先写复盘要点
//   5. 时间重叠 / 规则冲突时保留原场次，冲突写入冲突区

export const MIN_PAPERS = 3;
export const MAX_PAPERS = 5;
export const PAPER_GAP_DAYS = 30;
export const HOST_GAP_DAYS = 14;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const toTime = (v) => {
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
};

// 规则编码，页面层据此生成中文说明
export const RULES = {
  HOST_REQUIRED: '主持人不能为空',
  TIME_RANGE: '起止时间无效：结束时间必须晚于开始时间',
  PAPER_COUNT: `每场须安排 ${MIN_PAPERS}–${MAX_PAPERS} 篇文献`,
  PAPER_DUPLICATE: '同一场次内不能重复选择同一篇文献',
  REVIEW_REQUIRED: '已读文献须先写复盘要点才能排入',
  TIME_OVERLAP: '与已有场次时间重叠，原场次保留',
  HOST_GAP: `同一主持人前后两场至少间隔 ${HOST_GAP_DAYS} 天`,
  PAPER_GAP: `同一篇文献 ${PAPER_GAP_DAYS} 天内不能重复入选，原场次保留`,
};

// 校验一个拟排场次。
// draft: { title, host, start, end, paperIds: [] }
// papers: 文献列表（用于已读/复盘判断）
// sessions: 已确认场次；excludeId 用于调整申请时排除自身
// 返回 { valid, errors: [{ code, message, detail, paperId?, sessionId? }] }
export function validateSession(draft, papers, sessions, excludeId = null) {
  const errors = [];
  const push = (code, extra = {}) =>
    errors.push({ code, message: RULES[code], ...extra });

  // 1. 主持人
  if (!String(draft.host || '').trim()) push('HOST_REQUIRED');

  // 2. 起止时间
  const start = toTime(draft.start);
  const end = toTime(draft.end);
  if (start === null || end === null || end <= start) push('TIME_RANGE');

  // 3. 篇数 3–5
  const paperIds = draft.paperIds || [];
  if (paperIds.length < MIN_PAPERS || paperIds.length > MAX_PAPERS) {
    push('PAPER_COUNT', { detail: `当前 ${paperIds.length} 篇` });
  }

  // 4. 场次内重复
  if (new Set(paperIds).size !== paperIds.length) {
    push('PAPER_DUPLICATE');
  }

  // 5. 已读文献必须有复盘要点
  const byId = new Map(papers.map((p) => [p.id, p]));
  for (const id of paperIds) {
    const p = byId.get(id);
    if (p && p.status === '已读' && !String(p.review || '').trim()) {
      push('REVIEW_REQUIRED', { paperId: id, detail: `《${p.title}》` });
    }
  }

  if (start !== null && end !== null && end > start) {
    for (const s of sessions) {
      if (excludeId && s.id === excludeId) continue;
      const sStart = toTime(s.start);
      const sEnd = toTime(s.end);
      if (sStart === null || sEnd === null) continue;
      const range = `${s.title}（${s.host}，${s.start}–${s.end}）`;

      // 6. 时间重叠：start < sEnd && end > sStart
      if (start < sEnd && end > sStart) {
        push('TIME_OVERLAP', { sessionId: s.id, detail: range });
      }

      // 7. 主持人间隔 14 天（只校验间隔不足的情况）
      if (
        String(draft.host || '').trim() &&
        s.host.trim() === draft.host.trim()
      ) {
        const gapDays = Math.min(
          Math.abs(start - sEnd),
          Math.abs(sStart - end),
        ) / DAY_MS;
        if (gapDays < HOST_GAP_DAYS) {
          push('HOST_GAP', { sessionId: s.id, detail: range });
        }
      }

      // 8. 同一篇 30 天内重复
      for (const id of paperIds) {
        if (!s.paperIds.includes(id)) continue;
        const p = byId.get(id);
        const title = p ? `《${p.title}》` : '该文献';
        // 以两场日期中点间隔衡量
        const midA = (start + end) / 2;
        const midB = (sStart + sEnd) / 2;
        if (Math.abs(midA - midB) / DAY_MS < PAPER_GAP_DAYS) {
          push('PAPER_GAP', {
            sessionId: s.id,
            paperId: id,
            detail: `${title} 已排入 ${range}`,
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
