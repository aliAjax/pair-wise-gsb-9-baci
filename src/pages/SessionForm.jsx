import React, { useMemo, useState } from 'react';
import { validateSession, MIN_PAPERS, MAX_PAPERS } from '../rules/schedule';
import { defaultStart, defaultEnd } from '../utils/date';

// 排期表单：新建场次 / 冻结场次调整共用。
// 只负责采集与即时校验；确认后的提交由 onSubmit 处理。
export default function SessionForm({
  papers,
  sessions,
  excludeId = null,
  initial = null,
  requireReason = false,
  title,
  submitText,
  onClose,
  onSubmit,
  onConflict,
}) {
  const [draft, setDraft] = useState(
    initial || {
      title: '',
      host: '',
      start: defaultStart(2),
      end: defaultEnd(2),
      paperIds: [],
    },
  );
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const togglePaper = (id) =>
    setDraft((d) => ({
      ...d,
      paperIds: d.paperIds.includes(id)
        ? d.paperIds.filter((x) => x !== id)
        : d.paperIds.length < MAX_PAPERS
          ? [...d.paperIds, id]
          : d.paperIds,
    }));

  const check = useMemo(
    () => validateSession(draft, papers, sessions, excludeId),
    [draft, papers, sessions, excludeId],
  );

  const submitValid = () => {
    if (!check.valid) return;
    if (requireReason && !reason.trim()) {
      setReasonError(true);
      return;
    }
    onSubmit({ draft: { ...draft, host: draft.host.trim() }, reason: reason.trim() });
  };

  // 存在冲突时仍可提交：原场次保留，拟排内容写入冲突区
  const submitConflict = () => {
    if (check.valid || !onConflict) return;
    if (requireReason && !reason.trim()) {
      setReasonError(true);
      return;
    }
    onConflict({ draft: { ...draft, host: draft.host.trim() }, reason: reason.trim(), errors: check.errors });
  };

  const selectable = papers;
  const count = draft.paperIds.length;

  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className="modal wide" onMouseDown={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>
          ×
        </button>
        <span className="crumb">
          {requireReason ? 'ADJUST FROZEN SESSION' : 'NEW SESSION'}
        </span>
        <h2>{title}</h2>

        <label>
          场次主题
          <input
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="例如：认知与学习经典（二）"
          />
        </label>

        <div className="two">
          <label>
            主持人
            <input
              value={draft.host}
              onChange={(e) => set('host', e.target.value)}
              placeholder="一名主持人"
            />
          </label>
          <div className="two-times">
            <label>
              开始
              <input
                type="datetime-local"
                value={draft.start}
                onChange={(e) => set('start', e.target.value)}
              />
            </label>
            <label>
              结束
              <input
                type="datetime-local"
                value={draft.end}
                onChange={(e) => set('end', e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="pick-head">
          <h4>
            选篇 <span>每场 {MIN_PAPERS}–{MAX_PAPERS} 篇 · 已选 {count} 篇</span>
          </h4>
        </div>

        <div className="paper-picker">
          {selectable.map((p) => {
            const checked = draft.paperIds.includes(p.id);
            const blocked =
              p.status === '已读' && !String(p.review || '').trim();
            const disabled = (!checked && count >= MAX_PAPERS) || blocked;
            return (
              <label
                key={p.id}
                className={
                  'pick-item ' +
                  (checked ? 'on ' : '') +
                  (disabled ? 'disabled' : '')
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => togglePaper(p.id)}
                />
                <div>
                  <strong>{p.title}</strong>
                  <small>
                    {p.authors} ·{' '}
                    <span className={'paper-state state-' + p.status}>{p.status}</span>
                    {blocked && <em className="warn"> · 缺复盘要点，不可排入</em>}
                  </small>
                </div>
              </label>
            );
          })}
        </div>

        <div className="rule-check">
          {check.errors.length === 0 ? (
            <small className="ok">✓ 当前排期符合全部规则</small>
          ) : (
            check.errors.map((err, i) => (
              <small key={i} className="rule-err">
                ✗ {err.message}
                {err.detail ? `：${err.detail}` : ''}
              </small>
            ))
          )}
        </div>

        {requireReason && (
          <label className={'reason' + (reasonError ? ' invalid' : '')}>
            调整原因 <span>冻结场次调整须另存原因</span>
            <textarea
              rows="2"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError(false);
              }}
              placeholder="说明为什么要调整这场已确认的讨论…"
            />
          </label>
        )}

        <div className="modal-foot">
          <button className="outline" onClick={onClose}>
            取消
          </button>
          {!check.valid && (
            <button className="outline danger" onClick={submitConflict}>
              提交至冲突区（保留原场次）
            </button>
          )}
          <button
            className="primary"
            disabled={!check.valid}
            onClick={submitValid}
            title={!check.valid ? '仍有规则冲突，可选择提交至冲突区' : ''}
          >
            {submitText}
          </button>
        </div>
        {!check.valid && (
          <small className="warn foot-note">
            存在规则冲突：可继续「提交至冲突区」，系统不会改动任何原场次；冲突区会记录篇名、主持人与时段。
          </small>
        )}
      </div>
    </div>
  );
}
