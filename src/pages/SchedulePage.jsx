import React, { useEffect, useMemo, useState } from 'react';
import { paperStore, useStore } from '../data/papers';
import {
  discussionStore,
  confirmSession,
  addConflict,
  dismissConflict,
  addAdjustment,
  applyAdjustment,
  rejectAdjustment,
} from '../data/discussions';
import { validateSession } from '../rules/schedule';
import { rangeText, dt } from '../utils/date';
import SessionForm from './SessionForm';

const paperNames = (paperIds, papers) =>
  paperIds
    .map((id) => papers.find((p) => p.id === id)?.title)
    .filter(Boolean);

export default function SchedulePage() {
  const papers = useStore(paperStore);
  const state = useStore(discussionStore);
  const { sessions, conflicts, adjustments } = state;

  const [mode, setMode] = useState(null); // 'new' | { type:'adjust', session }
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.start.localeCompare(b.start)),
    [sessions],
  );

  const paperTitle = (id) =>
    papers.find((p) => p.id === id)?.title || `文献 #${id}（已删除）`;

  // —— 新建场次：通过校验则确认冻结，否则写入冲突区 ——
  const submitNew = ({ draft }) => {
    const { valid, errors } = validateSession(draft, papers, sessions);
    if (valid) {
      confirmSession({
        ...draft,
        createdAt: new Date().toISOString().slice(0, 16),
      });
      setMode(null);
      setNotice('场次已确认并冻结');
    } else {
      addConflict({
        kind: 'new',
        draft,
        paperTitles: paperNames(draft.paperIds, papers),
        errors,
      });
      setMode(null);
      setNotice('规则冲突：原场次保留，已写入冲突区');
    }
  };

  // 新建时主动“带冲突提交”
  const submitNewConflict = ({ draft, errors }) => {
    addConflict({
      kind: 'new',
      draft,
      paperTitles: paperNames(draft.paperIds, papers),
      errors,
    });
    setMode(null);
    setNotice('已写入冲突区，原场次未作任何改动');
  };

  // —— 调整冻结场次：校验排除自身；先另存为调整记录（含原因）——
  const submitAdjustment = ({ session, draft, reason }) => {
    const { valid, errors } = validateSession(draft, papers, sessions, session.id);
    if (valid) {
      addAdjustment(session.id, draft, reason);
      setMode(null);
      setNotice('调整申请已另存（含原因），原场次仍冻结');
    } else {
      addConflict({
        kind: 'adjust',
        sessionId: session.id,
        sessionTitle: session.title,
        reason,
        draft,
        paperTitles: paperNames(draft.paperIds, papers),
        errors,
      });
      setMode(null);
      setNotice('调整存在规则冲突：已写入冲突区，冻结场次不变');
    }
  };

  const submitAdjustmentConflict = ({ session, draft, reason, errors }) => {
    addConflict({
      kind: 'adjust',
      sessionId: session.id,
      sessionTitle: session.title,
      reason,
      draft,
      paperTitles: paperNames(draft.paperIds, papers),
      errors,
    });
    setMode(null);
    setNotice('调整冲突已写入冲突区，冻结场次不变');
  };

  // 应用一条“待处理”的调整记录（落库前再校验一次）
  const doApply = (adj) => {
    const { valid, errors } = validateSession(
      adj.draft,
      papers,
      sessions,
      adj.sessionId,
    );
    if (!valid) {
      addConflict({
        kind: 'adjust',
        sessionId: adj.sessionId,
        sessionTitle: sessions.find((s) => s.id === adj.sessionId)?.title,
        reason: `应用调整记录时重新校验未通过：${adj.reason}`,
        draft: adj.draft,
        paperTitles: paperNames(adj.draft.paperIds, papers),
        errors,
      });
      rejectAdjustment(adj.id);
      setNotice('情况已变化，调整不再合规，已转入冲突区');
      return;
    }
    applyAdjustment(adj.id);
    setNotice('调整已应用，场次保持冻结');
  };

  return (
    <>
      <header>
        <div>
          <span className="crumb">WEEKLY / SEMINAR</span>
          <h1>每周讨论排期</h1>
        </div>
        <div className="actions">
          <button className="primary" onClick={() => setMode('new')}>
            ＋ 新建场次
          </button>
        </div>
      </header>

      <div className="schedule-wrap">
        <section className="rule-card">
          <h4>排期规则</h4>
          <ul>
            <li>每场安排 <b>3–5 篇</b> 文献、<b>一名主持人</b> 和起止时间</li>
            <li>同一篇文献 <b>30 天内</b> 不能重复入选</li>
            <li>同一主持人前后两场至少间隔 <b>14 天</b></li>
            <li>待读文献可直接排入；已读文献须先在文献库写 <b>复盘要点</b></li>
            <li>时间重叠或规则冲突时 <b>保留原场次</b>，冲突写入冲突区（含篇名、主持人、时段）</li>
            <li>确认后的篇目 <b>冻结</b>；调整须另存原因</li>
          </ul>
        </section>

        <section className="session-section">
          <div className="section-head">
            <h3>已确认场次 <small>{sessions.length}</small></h3>
            <span className="frozen-tag">🔒 全部冻结</span>
          </div>

          {sortedSessions.map((s) => (
            <article className="session-card" key={s.id}>
              <div className="session-main">
                <div className="session-title-line">
                  <h3>{s.title || '（未命名场次）'}</h3>
                  <span className="frozen-badge">已冻结</span>
                </div>
                <div className="session-meta">
                  <span>🕑 {rangeText(s.start, s.end)}</span>
                  <span>🎤 {s.host}</span>
                  <span>📄 {s.paperIds.length} 篇</span>
                </div>
                <ul className="session-papers">
                  {s.paperIds.map((id) => {
                    const p = papers.find((x) => x.id === id);
                    return (
                      <li key={id}>
                        《{paperTitle(id)}》
                        {p && (
                          <small className={'paper-state state-' + p.status}>
                            {p.status}
                          </small>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="session-side">
                <button
                  className="outline"
                  onClick={() => setMode({ type: 'adjust', session: s })}
                >
                  申请调整（另存原因）
                </button>
              </div>
            </article>
          ))}
          {!sessions.length && (
            <div className="no-result">还没有确认的场次，点击右上角「新建场次」</div>
          )}
        </section>

        {/* 冲突区：保留原场次，记录冲突拟排的篇名、主持人、时段与原因 */}
        <section className={'conflict-section' + (conflicts.length ? ' has' : '')}>
          <div className="section-head">
            <h3>
              冲突区 <small>{conflicts.length}</small>
            </h3>
            <small className="hint">原场次一律保留，此处仅登记冲突拟排内容</small>
          </div>
          {conflicts.map((c) => (
            <article className="conflict-card" key={c.id}>
              <div className="conflict-top">
                <span className="conflict-kind">
                  {c.kind === 'adjust' ? '调整冲突' : '排期冲突'}
                </span>
                <button
                  className="link-danger"
                  onClick={() => dismissConflict(c.id)}
                >
                  清除记录
                </button>
              </div>
              <dl className="conflict-grid">
                <div>
                  <dt>主题</dt>
                  <dd>{c.draft.title || '（未命名）'}</dd>
                </div>
                <div>
                  <dt>主持人</dt>
                  <dd>{c.draft.host || '（未填写）'}</dd>
                </div>
                <div className="span2">
                  <dt>时段</dt>
                  <dd>{rangeText(c.draft.start, c.draft.end)}</dd>
                </div>
                <div className="span2">
                  <dt>篇名（{c.paperTitles.length}）</dt>
                  <dd>
                    {c.paperTitles.length
                      ? c.paperTitles.map((t) => `《${t}》`).join('、')
                      : '（未选篇）'}
                  </dd>
                </div>
                {c.kind === 'adjust' && (
                  <div className="span2">
                    <dt>调整对象 / 原因</dt>
                    <dd>
                      {c.sessionTitle}
                      {c.reason ? `；原因：${c.reason}` : ''}
                    </dd>
                  </div>
                )}
                <div className="span2">
                  <dt>冲突规则</dt>
                  <dd>
                    <ul className="error-list">
                      {c.errors.map((e, i) => (
                        <li key={i}>
                          {e.message}
                          {e.detail ? `：${e.detail}` : ''}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt>登记时间</dt>
                  <dd>{dt(c.createdAt)}</dd>
                </div>
              </dl>
            </article>
          ))}
          {!conflicts.length && (
            <div className="no-result compact">暂无冲突记录</div>
          )}
        </section>

        {/* 调整记录：冻结场次的调整必须另存原因，复核后才应用 */}
        <section className="adjust-section">
          <div className="section-head">
            <h3>
              调整记录 <small>{adjustments.length}</small>
            </h3>
            <small className="hint">冻结场次的调整在此另存，复核后才生效</small>
          </div>
          {adjustments.map((a) => {
            const s = sessions.find((x) => x.id === a.sessionId);
            return (
              <article className={'adjust-card ' + a.status} key={a.id}>
                <div className="adjust-top">
                  <strong>{s ? s.title : '（原场次不存在）'}</strong>
                  <span className={'adj-status ' + a.status}>{a.status}</span>
                </div>
                <p className="adjust-reason">原因：{a.reason}</p>
                <div className="adjust-diff">
                  <div>
                    <small>拟调整为</small>
                    <span>
                      🕑 {rangeText(a.draft.start, a.draft.end)} · 🎤 {a.draft.host}
                    </span>
                    <span>
                      📄 {a.draft.paperIds.map((id) => `《${paperTitle(id)}》`).join('、')}
                    </span>
                  </div>
                </div>
                {a.status === '待处理' && s && (
                  <div className="adjust-actions">
                    <button className="outline" onClick={() => rejectAdjustment(a.id)}>
                      驳回
                    </button>
                    <button className="primary" onClick={() => doApply(a)}>
                      复核通过并应用
                    </button>
                  </div>
                )}
              </article>
            );
          })}
          {!adjustments.length && (
            <div className="no-result compact">暂无调整记录</div>
          )}
        </section>
      </div>

      {mode === 'new' && (
        <SessionForm
          papers={papers}
          sessions={sessions}
          title="新建讨论场次"
          submitText="确认排期（冻结）"
          onClose={() => setMode(null)}
          onSubmit={submitNew}
          onConflict={submitNewConflict}
        />
      )}

      {mode && mode.type === 'adjust' && (
        <SessionForm
          papers={papers}
          sessions={sessions}
          excludeId={mode.session.id}
          requireReason
          initial={{
            title: mode.session.title,
            host: mode.session.host,
            start: mode.session.start,
            end: mode.session.end,
            paperIds: [...mode.session.paperIds],
          }}
          title={`调整冻结场次：${mode.session.title}`}
          submitText="另存调整申请"
          onClose={() => setMode(null)}
          onSubmit={({ draft, reason }) =>
            submitAdjustment({ session: mode.session, draft, reason })
          }
          onConflict={({ draft, reason, errors }) =>
            submitAdjustmentConflict({ session: mode.session, draft, reason, errors })
          }
        />
      )}

      {notice && <div className="toast">{notice}</div>}
    </>
  );
}
