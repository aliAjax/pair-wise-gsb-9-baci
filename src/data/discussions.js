import { createStore } from './store';

// 排期数据（领域数据，与规则、页面分离）：
// - sessions：已确认并冻结的场次
// - conflicts：规则冲突区，保留冲突的拟排场次，不动原场次
// - adjustments：对已冻结场次的调整申请，必须另存原因
const seedSessions = [
  {
    id: 's1',
    title: '认知与学习经典（一）',
    host: '张明',
    start: '2026-08-25T14:00',
    end: '2026-08-25T16:00',
    paperIds: [1, 2, 3],
    frozen: true,
    createdAt: '2026-08-18T09:00',
  },
  {
    id: 's2',
    title: '方法论与研究伦理',
    host: '王芳',
    start: '2026-09-29T10:00',
    end: '2026-09-29T11:30',
    paperIds: [4, 7, 5, 6],
    frozen: true,
    createdAt: '2026-09-15T14:00',
  },
];

const initialState = () => ({
  sessions: seedSessions,
  conflicts: [],
  adjustments: [],
  seq: { s: 2, c: 0, a: 0 },
});

// 兼容字段缺失
const hydrate = (s) => ({
  sessions: (s.sessions || []).map((x) => ({ frozen: true, ...x })),
  conflicts: s.conflicts || [],
  adjustments: s.adjustments || [],
  seq:
    typeof s.seq === 'object' && s.seq
      ? { s: s.seq.s ?? 2, c: s.seq.c ?? 0, a: s.seq.a ?? 0 }
      : { s: 2, c: 0, a: 0 },
});

export const discussionStore = createStore(
  'research-discussions-v1',
  initialState,
  hydrate,
);

// 各类记录独立计数，避免 ID 撞车；种子场次为 s1、s2，故从 3 起
const nextId = (state, prefix) => {
  const n = state.seq[prefix] + 1;
  return { id: `${prefix}${n}`, seq: { ...state.seq, [prefix]: n } };
};

// 确认后的场次一律冻结
export const confirmSession = (draft) =>
  discussionStore.setState((state) => {
    const { id, seq } = nextId(state, 's');
    return {
      ...state,
      seq,
      sessions: [...state.sessions, { ...draft, id, frozen: true }],
    };
  });

// 冲突只写冲突区，原场次原样保留
export const addConflict = (entry) =>
  discussionStore.setState((state) => {
    const { id, seq } = nextId(state, 'c');
    return {
      ...state,
      seq,
      conflicts: [
        {
          ...entry,
          id,
          createdAt: new Date().toISOString().slice(0, 16),
        },
        ...state.conflicts,
      ],
    };
  });

export const dismissConflict = (id) =>
  discussionStore.setState((state) => ({
    ...state,
    conflicts: state.conflicts.filter((c) => c.id !== id),
  }));

// 调整另存：不直接改动冻结场次，先记录调整内容与原因
export const addAdjustment = (sessionId, draft, reason) =>
  discussionStore.setState((state) => {
    const { id, seq } = nextId(state, 'a');
    return {
      ...state,
      seq,
      adjustments: [
        {
          id,
          sessionId,
          reason,
          draft,
          status: '待处理',
          createdAt: new Date().toISOString().slice(0, 16),
        },
        ...state.adjustments,
      ],
    };
  });

// 应用调整：以拟调整内容覆盖原场次（通过校验后调用），仍保持冻结
export const applyAdjustment = (adjustmentId) =>
  discussionStore.setState((state) => {
    const adj = state.adjustments.find((a) => a.id === adjustmentId);
    if (!adj) return state;
    return {
      ...state,
      sessions: state.sessions.map((s) =>
        s.id === adj.sessionId
          ? { ...s, ...adj.draft, frozen: true }
          : s,
      ),
      adjustments: state.adjustments.map((a) =>
        a.id === adjustmentId ? { ...a, status: '已应用' } : a,
      ),
    };
  });

export const rejectAdjustment = (adjustmentId) =>
  discussionStore.setState((state) => ({
    ...state,
    adjustments: state.adjustments.map((a) =>
      a.id === adjustmentId ? { ...a, status: '已驳回' } : a,
    ),
  }));
