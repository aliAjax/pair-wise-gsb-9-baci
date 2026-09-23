import { useEffect, useMemo, useState } from 'react';

export default function LibraryPage({ papers, setPapers, notify }) {
  const [selected, setSelected] = useState(papers[0]?.id);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');
  const [statusFilter, setStatusFilter] = useState('所有文献');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: '', authors: '', year: '2024', venue: '', abstract: '', tags: '' });

  useEffect(() => {
    if (!papers.some((p) => p.id === selected)) setSelected(papers[0]?.id);
  }, [papers, selected]);

  const tags = ['全部', ...new Set(papers.flatMap((x) => x.tags))];

  const filtered = useMemo(
    () =>
      papers.filter((x) => {
        if (statusFilter !== '所有文献' && x.status !== statusFilter) return false;
        if (tag !== '全部' && !x.tags.includes(tag)) return false;
        return `${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(query.toLowerCase());
      }),
    [papers, statusFilter, tag, query]
  );

  const cur = papers.find((x) => x.id === selected) || papers[0];

  const update = (k, v) => setPapers(papers.map((x) => (x.id === cur.id ? { ...x, [k]: v } : x)));

  const add = () => {
    if (!form.title.trim()) {
      notify('请先填写标题');
      return;
    }
    const p = {
      ...form,
      id: Date.now(),
      title: form.title.trim(),
      year: +form.year,
      tags: form.tags.split(',').map((x) => x.trim()).filter(Boolean),
      status: '待读',
      review: '',
      cite: `${form.authors} (${form.year}). ${form.title}. ${form.venue}.`
    };
    setPapers([...papers, p]);
    setSelected(p.id);
    setForm({ title: '', authors: '', year: '2024', venue: '', abstract: '', tags: '' });
    setShow(false);
    notify('文献已加入研究库');
  };

  const bib = () => {
    navigator.clipboard?.writeText(cur.cite);
    notify('引用文本已复制');
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([papers.map((x) => x.cite).join('\n')], { type: 'text/plain' }));
    a.download = 'references.txt';
    a.click();
    notify('引用列表已导出');
  };

  const navItems = ['所有文献', '待读', '已读', '阅读中'];
  const countOf = (name) => (name === '所有文献' ? papers.length : papers.filter((x) => x.status === name).length);

  return (
    <>
      <header>
        <div>
          <span className="crumb">RESEARCH / LIBRARY</span>
          <h1>文献库</h1>
        </div>
        <div className="actions">
          <button className="outline" onClick={download}>↓ 导出引用</button>
          <button className="primary" onClick={() => setShow(true)}>＋ 添加文献</button>
        </div>
      </header>

      <div className="toolbar">
        <div className="search">
          ⌕
          <input placeholder="搜索标题、作者或摘要…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button onClick={() => setQuery('')}>×</button>}
        </div>
        <div className="tag-filter">
          {tags.map((t) => (
            <button className={tag === t ? 'on' : ''} onClick={() => setTag(t)} key={t}>{t}</button>
          ))}
        </div>
      </div>

      <div className="body body-split">
        <nav className="status-nav">
          {navItems.map((n) => (
            <button key={n} className={statusFilter === n ? 'active' : ''} onClick={() => setStatusFilter(n)}>
              <span>{n}</span><b>{countOf(n)}</b>
            </button>
          ))}
        </nav>

        <section className="paper-list">
          {filtered.map((p) => (
            <button className={'paper ' + (cur?.id === p.id ? 'selected' : '')} onClick={() => setSelected(p.id)} key={p.id}>
              <div className="paper-year">{p.year}</div>
              <div className="paper-copy">
                <h3>{p.title}</h3>
                <p>{p.authors}</p>
                <div>{p.tags.map((t) => <span key={t}>#{t}</span>)}</div>
              </div>
              <small className={'status ' + p.status}>{p.status}</small>
            </button>
          ))}
          {!filtered.length && <div className="no-result">没有找到匹配的文献</div>}
        </section>

        <section className="detail">
          {cur && (
            <>
              <div className="detail-top">
                <span className={'status reading ' + cur.status}>{cur.status}</span>
                <button onClick={() => notify('已加入收藏')}>☆ 收藏</button>
              </div>
              <h2>{cur.title}</h2>
              <p className="authors">{cur.authors}</p>
              <div className="cite-actions">
                <button onClick={bib}>▣ 复制引用</button>
                <button onClick={() => update('status', cur.status === '已读' ? '待读' : '已读')}>
                  {cur.status === '已读' ? '标记为待读' : '标记为已读'}
                </button>
              </div>
              <div className="detail-section">
                <h4>摘要 <span>ABSTRACT</span></h4>
                <p>{cur.abstract}</p>
              </div>

              {cur.status === '已读' && (
                <div className="detail-section">
                  <h4>复盘要点 <span>REVIEW · 排入讨论前必填</span></h4>
                  <textarea
                    className="notes review-edit"
                    placeholder="已读文献排入周讨论前，先在这里写下复盘要点…"
                    value={cur.review || ''}
                    onChange={(e) => update('review', e.target.value)}
                  />
                </div>
              )}

              <div className="detail-section">
                <h4>出版信息 <span>PUBLICATION</span></h4>
                <div className="pub-grid">
                  <div><small>出版物</small><strong>{cur.venue}</strong></div>
                  <div><small>年份</small><strong>{cur.year}</strong></div>
                </div>
              </div>
              <div className="detail-section">
                <h4>引用文本 <span>BIBTEX / TEXT</span></h4>
                <div className="cite-box">
                  {cur.cite}
                  <button onClick={bib}>复制</button>
                </div>
              </div>
              <div className="detail-section">
                <h4>我的笔记 <span>PRIVATE</span></h4>
                <textarea className="notes" placeholder="记录你的阅读想法…" value={cur.notes || ''} onChange={(e) => update('notes', e.target.value)} />
              </div>
            </>
          )}
        </section>
      </div>

      {show && (
        <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && setShow(false)}>
          <div className="modal">
            <button className="close" onClick={() => setShow(false)}>×</button>
            <span className="crumb">NEW REFERENCE</span>
            <h2>添加一篇文献</h2>
            <label>标题<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="论文或书籍标题" /></label>
            <label>作者<input value={form.authors} onChange={(e) => setForm({ ...form, authors: e.target.value })} /></label>
            <div className="two">
              <label>年份<input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></label>
              <label>出版物<input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></label>
            </div>
            <label>关键词<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="用逗号分隔" /></label>
            <label>摘要<textarea rows={3} value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} /></label>
            <button className="primary full" onClick={add}>保存文献</button>
          </div>
        </div>
      )}
    </>
  );
}
