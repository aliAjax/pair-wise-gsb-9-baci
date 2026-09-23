import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import LibraryPage from './pages/LibraryPage.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import {
  loadPapers, savePapers,
  loadSessions, saveSessions,
  loadMembers, saveMembers,
  loadConflicts, saveConflicts
} from './data/storage.js';

function App() {
  const [view, setView] = useState('library');
  const [papers, setPapers] = useState(loadPapers);
  const [sessions, setSessions] = useState(loadSessions);
  const [members, setMembers] = useState(loadMembers);
  const [conflicts, setConflicts] = useState(loadConflicts);
  const [notice, setNotice] = useState('');

  useEffect(() => savePapers(papers), [papers]);
  useEffect(() => saveSessions(sessions), [sessions]);
  useEffect(() => saveMembers(members), [members]);
  useEffect(() => saveConflicts(conflicts), [conflicts]);

  const notify = (text) => {
    setNotice(text);
    window.clearTimeout(notify._timer);
    notify._timer = window.setTimeout(() => setNotice(''), 2600);
  };

  return (
    <div className="app">
      <aside>
        <div className="logo"><span>∴</span> LITERATURE</div>
        <div className="library-head">
          <span>课题组工作台</span>
          <strong>{papers.length}<small> 篇文献</small></strong>
        </div>
        <nav className="view-nav">
          <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>
            ▤ <span>文献库</span><b>{papers.length}</b>
          </button>
          <button className={view === 'schedule' ? 'active' : ''} onClick={() => setView('schedule')}>
            🗓 <span>每周讨论</span>
            {conflicts.length > 0 && <i className="nav-dot">{conflicts.length}</i>}
          </button>
        </nav>
        <div className="side-foot">
          <small>本地数据库 · 已同步</small>
          <small>领域数据 / 排期规则 / 页面 三层分离</small>
        </div>
      </aside>

      <main>
        {view === 'library' ? (
          <LibraryPage papers={papers} setPapers={setPapers} notify={notify} />
        ) : (
          <SchedulePage
            papers={papers}
            setPapers={setPapers}
            sessions={sessions}
            setSessions={setSessions}
            members={members}
            setMembers={setMembers}
            conflicts={conflicts}
            setConflicts={setConflicts}
            notify={notify}
          />
        )}
      </main>

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
