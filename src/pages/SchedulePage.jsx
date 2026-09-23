import { useMemo, useState } from 'react';
import SessionDialog from '../components/SessionDialog.jsx';
import { RULES, validateSession, describeChange, formatRange } from '../rules/schedule.js';

const INLINE_CODES = new Set(['hostRequired', 'timeRequired', 'timeRange', 'count', 'reviewRequired']);

const CONFLICT_LABELS = {
  timeOverlap: '时间重叠',
  paperCooldown: '篇目冷却',
  hostGap: '主持人间隔'
};

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function SchedulePage({
  papers,
  setPapers,
  sessions,
  setSessions,
  members,
  setMembers,
  conflicts,
  setConflicts,
  notify
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [dialogInitial, setDialogInitial] = useState(null);

  const paperMap = useMemo(() => new Map(papers.map((p) => [p.id, p])), [papers]);
  const titleOf = (id) => paperMap.get(id)?.title || `文献 #${id}`;
  const displayTitle = (s) => s.title || `讨论 · ${formatRange(s.start, s.end).split(' ')[0]}`;

  const sorted = useMemo(() => [...sessions].sort((a, b) => a.start.localeCompare(b.start)), [sessions]);
  const upcoming = sessions.filter((s) => s.end >= (() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  })()).length;

  const openCreate = () => {
    setDialogMode('create');
    setDialogInitial(null);
    setDialogOpen(true);
  };

  const openEdit = (s, mode) => {
    setDialogMode(mode);
    setDialogInitial(s);
    setDialogOpen(true);
  };

  const freeze = (s) => {
    setSessions(sessions.map((x) => (x.id === s.id ? { ...x, confirmed: true, frozenAt: nowStamp() } : x)));
    notify('篇目已冻结，后续调整将记录原因');
  };

  const remove = (s) => {
    setSessions(sessions.filter((x) => x.id !== s.id));
    notify('待确认场次已删除');
  };

  const updateReview = (paperId, value) => {
    setPapers(papers.map((p) => (p.id === paperId ? { ...p, review: value } : p)));
  };

  const submit = (draft, reason, mode) => {
    const result = validateSession(draft, sessions, paperMap);

    if (!result.ok) {
      if (INLINE_CODES.has(result.code)) return result;

      // 规则冲突：不改动任何已存在场次，草案转入冲突区。
      const existing = result.existing;
      const conflict = {
        id: `c-${Date.now()}`,
        code: result.code,
        label: CONFLICT_LABELS[result.code] || '规则冲突',
        message: result.message,
        draft: {
          title: draft.title || '',
          host: draft.host.trim(),
          start: draft.start,
          end: draft.end,
          paperIds: draft.paperIds,
          paperTitles: draft.paperIds.map(titleOf),
          reason
        },
        existing: existing
          ? {
              id: existing.id,
              title: displayTitle(existing),
              host: existing.host,
              start: existing.start,
              end: existing.end,
              paperTitles: existing.paperIds.map(titleOf)
            }
          : null,
        createdAt: nowStamp()
      };
      setConflicts([conflict, ...conflicts]);
      setDialogOpen(false);
      notify('与排期规则冲突，已保留原场次并记入冲突区');
      return result;
    }

    const host = draft.host.trim();
    if (host && !members.includes(host)) setMembers([...members, host]);

    if (mode === 'create' || !draft.id) {
      const session = {
        id: `s-${Date.now()}`,
        title: draft.title,
        host,
        start: draft.start,
        end: draft.end,
        paperIds: draft.paperIds,
        confirmed: false,
        frozenAt: null,
        reason: '',
        history: []
      };
      setSessions([...sessions, session]);
      setDialogOpen(false);
      notify('场次已排入，确认篇目后请冻结');
      return { ok: true };
    }

    const before = sessions.find((s) => s.id === draft.id);
    if (!before) return { ok: false, code: 'missing', message: '原场次不存在' };

    if (mode === 'edit') {
      setSessions(
        sessions.map((s) =>
          s.id === draft.id
            ? { ...s, title: draft.title, host, start: draft.start, end: draft.end, paperIds: draft.paperIds }
            : s
        )
      );
      setDialogOpen(false);
      notify('待确认场次修改已保存');
    } else {
      const changes = describeChange(before, { ...draft, host }, titleOf);
      const entry = { at: nowStamp(), reason, changes };
      setSessions(
        sessions.map((s) =>
          s.id === draft.id
            ? {
                ...s,
                title: draft.title,
                host,
                start: draft.start,
                end: draft.end,
                paperIds: draft.paperIds,
                reason,
                history: [...s.history, entry]
              }
            : s
        )
      );
      setDialogOpen(false);
      notify('冻结场次已调整，原因与变更已留痕');
    }
    return { ok: true };
  };

  const loadConflict = (c) => {
    setDialogMode('create');
    setDialogInitial({
      id: undefined,
      title: c.draft.title,
      host: c.draft.host,
      start: c.draft.start,
      end: c.draft.end,
      paperIds: c.draft.paperIds
    });
    setConflicts(conflicts.filter((x) => x.id !== c.id));
    setDialogOpen(true);
  };

  const discardConflict = (c) => {
    setConflicts(conflicts.filter((x) => x.id !== c.id));
    notify('冲突记录已忽略');
  };

  return (
    <>
      <header>
        <div>
          <span className="crumb">RESEARCH / WEEKLY SEMINAR</span>
          <h1>每周讨论排期</h1>
        </div>
        <div className="actions">
          <span className="upcoming-pill">待举行 {upcoming} 场</span>
          <button className="primary" onClick={openCreate}>＋ 安排场次</button>
        </div>
      </header>

      <div className="sched-body">
        <section className="sched-main">
          {sorted.length === 0 && <div className="no-result">还没有排期，点击右上角安排第一场讨论。</div>}
          {sorted.map((s) => (
            <article className={'session-card' + (s.confirmed ? ' frozen' : '')} key={s.id}>
              <div className="session-top">
                <h3>{displayTitle(s)}</h3>
                {s.confirmed
                  ? <span className="badge freeze-badge">🔒 已冻结 · {s.frozenAt}</span>
                  : <span className="badge pending-badge">待确认</span>}
              </div>
              <div className="session-meta">
                <span>🕑 {formatRange(s.start, s.end)}</span>
                <span>🎤 主持人：{s.host}</span>
                <span>{s.paperIds.length} 篇</span>
              </div>
              <ul className="session-papers">
                {s.paperIds.map((id) => {
                  const p = paperMap.get(id);
                  return (
                    <li key={id}>
                      《{p ? p.title : id}》
                      {p && <small className={'status ' + p.status}>{p.status}</small>}
                      {p && p.status === '已读'
                        ? (p.review ? <em className="review-ok">复盘已写</em> : <em className="review-miss">复盘缺失</em>)
                        : <em className="review-ok">待读直排</em>}
                    </li>
                  );
                })}
              </ul>

              {s.confirmed && s.reason && (
                <div className="session-reason">最近调整原因：{s.reason}</div>
              )}
              {s.history.length > 0 && (
                <details className="session-history">
                  <summary>调整留痕（{s.history.length} 次）</summary>
                  {s.history.map((h, i) => (
                    <div className="history-entry" key={i}>
                      <strong>{h.at}</strong>
                      <p>原因：{h.reason}</p>
                      {h.changes.length > 0 && <ul>{h.changes.map((line, j) => <li key={j}>{line}</li>)}</ul>}
                    </div>
                  ))}
                </details>
              )}

              <div className="session-actions">
                {!s.confirmed && <>
                  <button className="mini primary" onClick={() => freeze(s)}>✓ 确认并冻结</button>
                  <button className="mini" onClick={() => openEdit(s, 'edit')}>编辑</button>
                  <button className="mini danger" onClick={() => remove(s)}>删除</button>
                </>}
                {s.confirmed && <button className="mini" onClick={() => openEdit(s, 'adjust')}>调整（需原因）</button>}
              </div>
            </article>
          ))}
        </section>

        <aside className="sched-side">
          <div className="rule-card">
            <h4>排期规则</h4>
            <ul>
              <li>每场安排 <b>{RULES.MIN_PAPERS}–{RULES.MAX_PAPERS}</b> 篇、一名主持人和起止时间</li>
              <li>同一篇目 <b>{RULES.PAPER_COOLDOWN_DAYS} 天</b>内不能重复入选</li>
              <li>主持人相邻两场至少隔 <b>{RULES.HOST_GAP_DAYS} 天</b></li>
              <li>待读文献可直接排入；已读文献须先写<b>复盘要点</b></li>
              <li>时间重叠或规则冲突时<b>保留原场次</b>，冲突写入右侧冲突区</li>
              <li>确认后的篇目<b>冻结</b>；调整须填写原因并留痕</li>
            </ul>
          </div>

          <div className={'conflict-card' + (conflicts.length ? ' has' : '')}>
            <div className="conflict-head">
              <h4>冲突区</h4>
              <span className="conflict-count">{conflicts.length}</span>
            </div>
            {conflicts.length === 0 && <p className="conflict-empty">当前没有冲突。冲突发生时，这里会写清篇名、主持人和时段。</p>}
            {conflicts.map((c) => (
              <article className="conflict-item" key={c.id}>
                <div className="conflict-tag">{c.label} · {c.createdAt}</div>
                <p className="conflict-msg">{c.message}</p>

                <div className="conflict-cols">
                  <div>
                    <small>被拦草案</small>
                    <strong>{c.draft.title || formatRange(c.draft.start, c.draft.end)}</strong>
                    <span>主持人：{c.draft.host}</span>
                    <span>时段：{formatRange(c.draft.start, c.draft.end)}</span>
                    <span>篇目：{c.draft.paperTitles.map((t) => `《${t}》`).join('、')}</span>
                    {c.draft.reason && <span>调整原因：{c.draft.reason}</span>}
                  </div>
                  {c.existing && (
                    <div className="kept">
                      <small>已保留的原场次</small>
                      <strong>{c.existing.title}</strong>
                      <span>主持人：{c.existing.host}</span>
                      <span>时段：{formatRange(c.existing.start, c.existing.end)}</span>
                      <span>篇目：{c.existing.paperTitles.map((t) => `《${t}》`).join('、')}</span>
                    </div>
                  )}
                </div>

                <div className="conflict-actions">
                  <button className="mini" onClick={() => loadConflict(c)}>载入草案再调整</button>
                  <button className="mini danger" onClick={() => discardConflict(c)}>忽略</button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <SessionDialog
        open={dialogOpen}
        mode={dialogMode}
        initial={dialogInitial}
        papers={papers}
        members={members}
        sessions={sessions}
        onClose={() => setDialogOpen(false)}
        onSubmit={submit}
        onUpdateReview={updateReview}
      />
    </>
  );
}
