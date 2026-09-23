// 领域数据层：本地持久化。只负责读写，不解释数据含义。

import { seedPapers, seedMembers, buildSeedSessions } from './seed.js';

export const KEYS = {
  papers: 'research-library', // 与既有文献库版本保持同一存储键
  sessions: 'research-schedule-sessions',
  members: 'research-schedule-members',
  conflicts: 'research-schedule-conflicts'
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 本地存储不可用时静默降级为内存态
  }
}

// 旧版本只存数组，补全新文献需要的复盘字段。
function migratePapers(papers) {
  return papers.map((p) => ({
    review: '',
    ...p
  }));
}

export function loadPapers() {
  return migratePapers(load(KEYS.papers, seedPapers));
}
export function savePapers(papers) {
  save(KEYS.papers, papers);
}

export function loadSessions() {
  return load(KEYS.sessions, buildSeedSessions());
}
export function saveSessions(sessions) {
  save(KEYS.sessions, sessions);
}

export function loadMembers() {
  return load(KEYS.members, seedMembers);
}
export function saveMembers(members) {
  save(KEYS.members, members);
}

export function loadConflicts() {
  return load(KEYS.conflicts, []);
}
export function saveConflicts(conflicts) {
  save(KEYS.conflicts, conflicts);
}
