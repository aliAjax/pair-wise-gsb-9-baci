import { useSyncExternalStore } from 'react';

// 极简本地 store：状态持久化在 localStorage，不引入任何额外依赖。
export function createStore(storageKey, initializer, hydrate = (x) => x) {
  let state;
  try {
    const raw = localStorage.getItem(storageKey);
    state = raw ? hydrate(JSON.parse(raw)) : initializer();
  } catch {
    state = initializer();
  }

  const listeners = new Set();

  const persist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* 存储不可用时仅保留内存态 */
    }
  };

  return {
    getState: () => state,
    setState(next) {
      state = typeof next === 'function' ? next(state) : next;
      persist();
      listeners.forEach((fn) => fn());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.getState);
}
