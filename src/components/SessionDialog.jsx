import { useEffect, useMemo, useState } from 'react';
import {
  RULES,
  validateSession,
  findPaperCooldown,
  findOverlap,
  checkHostGap,
  dayDiff,
  defaultSlot,
  formatRange
} from '../rules/schedule.js';

// 行内处理的表单类问题；与其他场次冲突类问题交由页面写入冲突区。
const INLINE_CODES = new Set(['hostRequired', 'timeRequired', 'timeRange', 'count', 'reviewRequired']);

const emptyDraft = () => {
  const slot = defaultSlot();
  return { title: '', host: '', start: slot.start, end: slot.end, paperIds: [] };
};

export default function SessionDialog({ open, mode, initial, papers, members, sessions, onClose, onSubmit, onUpdateReview }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setReason('');
    setExpanded(null);
    if (initial) {
      setDraft({
        title: initial.title || '',
        host: initial.host || '',
        start: initial.start,
        end: initial.end,
        paperIds: [...initial.paperIds]
      });
    } else {
      setDraft(emptyDraft());
    }
  }, [open, initial, mode]);

  const paperMap = useMemo(() => new Map(papers.map((p) => [p.id, p])), [papers]);

  const live = useMemo(
    () => validateSession({ ...draft, id: initial?.id }, sessions, paperMap),
    [draft, sessions, paperMap, initial]
  );

  if (!open) return null;

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const toggle = (id) => {
    const paper = paperMap.get(id);
    const has = draft.paperIds.includes(id);
    if (has) {
      set('paperIds', draft.paperIds.filter((x) => x !== id));
      return;
    }
    if (paper.status === '已读' && !(paper.review || '').trim()) {
      setExpanded(id);
      setError(`《${paper.title}》是已读文献，请先在下方补写复盘要点再入选`);
      return;
    }
    if (draft.paperIds.length >= RULES.MAX_PAPERS) {
      setError(`每场最多安排 ${RULES.MAX_PAPERS} 篇`);
      return;
    }
    set('paperIds', [...draft.paperIds, id]);
    setError('');
  };

  const submitLabel =
    mode === 'adjust' ? '提交调整（冻结并留痕）' : mode === 'edit' ? '保存修改' : '排入场次';

  const submit = () => {
    if (mode === 'adjust' && !reason.trim()) {
      setError('冻结场次的调整必须填写原因');
      return;
    }
    const res = onSubmit({ ...draft, id: initial?.id }, reason.trim(), mode);
    if (res && !res.ok && INLINE_CODES.has(res.code)) setError(res.message);
  };

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <button className="close" onClick={onClose}>×</button>
        <span className="crumb">{mode === 'create' ? 'NEW SESSION' : mode === 'edit' ? 'EDIT SESSION' : 'ADJUST FROZEN'}</span>
        <h2>{mode === 'create' ? '安排一场讨论' : mode === 'edit' ? '编辑待确认场次' : '调整已冻结场次'}</h2>

        <label>主题（可留空，默认使用日期）
          <input value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="如：第 2 期 · 具身认知专题" />
        </label>

        <div className="two">
          <label>主持人
            <input list="host-list" value={draft.host} onChange={(e) => set('host', e.target.value)} placeholder="选择或输入姓名" />
            <datalist id="host-list">
              {members.map((m) => <option value={m} key={m} />)}
            </datalist>
          </label>
          <div className="dialog-count">
            <small>已选篇目</small>
            <strong className={draft.paperIds.length < RULES.MIN_PAPERS || draft.paperIds.length > RULES.MAX_PAPERS ? 'bad' : ''}>
              {draft.paperIds.length}<small> / {RULES.MIN_PAPERS}–{RULES.MAX_PAPERS} 篇</small>
            </strong>
          </div>
        </div>

        <div className="two">
          <label>开始
            <input type="datetime-local" value={draft.start} onChange={(e) => set('start', e.target.value)} />
          </label>
          <label>结束
            <input type="datetime-local" value={draft.end} onChange={(e) => set('end', e.target.value)} />
          </label>
        </div>

        {(() => {
          const overlap = findOverlap({ ...draft, id: initial?.id }, sessions);
          const gap = checkHostGap({ ...draft, id: initial?.id }, sessions);
          if (!overlap && !gap) return null;
          return (
            <div className="dialog-hint">
              {overlap && <div>⚠ 时段与原场次「{overlap.title || formatRange(overlap.start, overlap.end)}」（{overlap.host}）重叠，提交后将保留原场次并转入冲突区。</div>}
              {gap && <div>⚠ 主持人 {draft.host} 相邻两场仅隔 {gap.days} 天（要求 ≥ {RULES.HOST_GAP_DAYS} 天），提交后将转入冲突区。</div>}
            </div>
          );
        })()}

        <div className="picker-head">
          <span>选择篇目</span>
          <small>待读可直接排入；已读须先写复盘要点；同一篇 {RULES.PAPER_COOLDOWN_DAYS} 天内不重复</small>
        </div>
        <div className="picker">
          {papers.map((p) => {
            const checked = draft.paperIds.includes(p.id);
            const hit = findPaperCooldown(p.id, { ...draft, id: initial?.id }, sessions);
            const needReview = p.status === '已读' && !(p.review || '').trim();
            return (
              <div className={'pick-row' + (checked ? ' on' : '')} key={p.id}>
                <label className="pick-check">
                  <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} />
                  <div>
                    <strong>{p.title}</strong>
                    <span>{p.authors} · <i className={'status ' + p.status}>{p.status}</i>
                      {p.status === '已读' && (p.review ? <em className="review-ok">复盘已写</em> : <em className="review-miss">待补复盘</em>)}
                    </span>
                  </div>
                </label>
                {hit && (
                  <small className="cooldown">
                    {dayDiff(draft.start, hit.start)} 天前入选于「{hit.title || formatRange(hit.start, hit.end)}」 · {RULES.PAPER_COOLDOWN_DAYS} 天冷却中
                  </small>
                )}
                {needReview && (
                  <button className="link-btn" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                    {expanded === p.id ? '收起复盘' : '写复盘要点'}
                  </button>
                )}
                {expanded === p.id && (
                  <textarea
                    className="review-inline"
                    rows={3}
                    placeholder="写下这篇的复盘要点，保存后即可入选…"
                    value={p.review || ''}
                    onChange={(e) => onUpdateReview(p.id, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {mode === 'adjust' && (
          <label className="reason-label">调整原因（将随场次留痕）
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="如：原主持人出差，时段顺延一周" />
          </label>
        )}

        {!live.ok && <div className="dialog-hint soft">预检：{live.message}</div>}
        {error && <div className="dialog-hint">{error}</div>}

        <div className="modal-foot">
          <button className="outline" onClick={onClose}>取消</button>
          <button className="primary" onClick={submit}>{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}
