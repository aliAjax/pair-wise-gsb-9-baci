import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import LibraryPage from './pages/LibraryPage';
import SchedulePage from './pages/SchedulePage';
import { paperStore, useStore } from './data/papers';
import { discussionStore } from './data/discussions';

function Shell() {
  const [page, setPage] = useState('library');
  const papers = useStore(paperStore);
  const disc = useStore(discussionStore);

  const todo = papers.filter((p) => p.status !== '已读').length;
  const read = papers.length - todo;
  const pendingAdj = disc.adjustments.filter((a) => a.status === '待处理').length;

  return (
    <div className="app">
      <aside>
        <div className="logo">
          <span>∴</span> LITERATURE
        </div>
        <nav className="main-nav">
          <button
            className={page === 'library' ? 'active' : ''}
            onClick={() => setPage('library')}
          >
            ▤ <span>文献库</span>
            <b>{papers.length}</b>
          </button>
          <button
            className={page === 'schedule' ? 'active' : ''}
            onClick={() => setPage('schedule')}
          >
            🗓 <span>每周讨论</span>
            <b>{disc.sessions.length}</b>
          </button>
        </nav>

        <div className="side-stats">
          <small>文献概览</small>
          <div>
            <span>待读 / 阅读中</span>
            <b>{todo}</b>
          </div>
          <div>
            <span>已读 · 可复盘</span>
            <b>{read}</b>
          </div>
          <div>
            <span>冲突区</span>
            <b>{disc.conflicts.length}</b>
          </div>
          <div>
            <span>待处理调整</span>
            <b>{pendingAdj}</b>
          </div>
        </div>

        <div className="side-foot">
          <small>本地数据库 · 规则校验在浏览器内完成</small>
        </div>
      </aside>

      <main key={page}>
        {page === 'library' ? <LibraryPage /> : <SchedulePage />}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Shell />);
