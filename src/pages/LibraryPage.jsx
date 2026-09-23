import React, { useEffect, useMemo, useState } from 'react';
import { paperStore, useStore, addPaper, updatePaper } from '../data/papers';

const emptyForm = {
  title: '',
  authors: '',
  year: '2024',
  venue: '',
  abstract: '',
  tags: '',
};

export default function LibraryPage() {
  const items = useStore(paperStore);
  const [selected, setSelected] = useState(1);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');
  const [status, setStatus] = useState('全部');
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  const tags = ['全部', ...new Set(items.flatMap((x) => x.tags))];
  const statuses = ['全部', '待读', '阅读中', '已读'];

  const filtered = useMemo(
    () =>
      items.filter(
        (x) =>
          (tag === '全部' || x.tags.includes(tag)) &&
          (status === '全部' || x.status === status) &&
          `${x.title}${x.authors}${x.abstract}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [items, tag, status, query],
  );

  const cur = items.find((x) => x.id === selected) || filtered[0] || items[0];

  const update = (k, v) => cur && updatePaper(cur.id, { [k]: v });

  const add = () => {
    if (!form.title.trim()) {
      setNotice('请先填写标题');
      return;
    }
    addPaper({
      ...form,
      year: +form.year,
      tags: form.tags
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      cite: `${form.authors} (${form.year}). ${form.title}. ${form.venue}.`,
    });
    setSelected(Date.now());
    setForm(emptyForm);
    setShow(false);
    setNotice('文献已加入研究库');
  };

  const bib = () => {
    navigator.clipboard?.writeText(cur.cite);
    setNotice('引用文本已复制');
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([items.map((x) => x.cite).join('\n')], { type: 'text/plain' }),
    );
    a.download = 'references.txt';
    a.click();
    setNotice('引用列表已导出');
  };

  return (
    <>
      <header>
        <div>
          <span className="crumb">RESEARCH / LIBRARY</span>
          <h1>所有文献</h1>
        </div>
        <div className="actions">
          <button className="outline" onClick={download}>
            ↓ 导出引用
          </button>
          <button className="primary" onClick={() => setShow(true)}>
            ＋ 添加文献
          </button>
        </div>
      </header>

      <div className="toolbar">
        <div className="search">
          ⌕
          <input
            placeholder="搜索标题、作者或摘要…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')}>×</button>
          )}
        </div>
        <div className="status-filter">
          {statuses.map((s) => (
            <button
              key={s}
              className={status === s ? 'on' : ''}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="tag-filter">
          {tags.map((t) => (
            <button
              className={tag === t ? 'on' : ''}
              onClick={() => setTag(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="body">
        <section className="paper-list">
          {filtered.map((p) => (
            <button
              className={'paper ' + (cur && selected === p.id ? 'selected' : '')}
              onClick={() => setSelected(p.id)}
              key={p.id}
            >
              <div className="paper-year">{p.year}</div>
              <div className="paper-copy">
                <h3>{p.title}</h3>
                <p>{p.authors}</p>
                <div>
                  {p.tags.map((t) => (
                    <span key={t}>#{t}</span>
                  ))}
                </div>
              </div>
              <small className={'paper-state state-' + p.status}>{p.status}</small>
            </button>
          ))}
          {!filtered.length && (
            <div className="no-result">没有找到匹配的文献</div>
          )}
        </section>

        <section className="detail">
          {cur && (
            <>
              <div className="detail-top">
                <select
                  className={'status-select state-' + cur.status}
                  value={cur.status}
                  onChange={(e) => update('status', e.target.value)}
                >
                  {['待读', '阅读中', '已读'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <small className="hint">
                  已读文献需写复盘要点后才能排入讨论
                </small>
              </div>
              <h2>{cur.title}</h2>
              <p className="authors">{cur.authors}</p>
              <div className="cite-actions">
                <button onClick={bib}>▣ 复制引用</button>
              </div>

              <div className="detail-section">
                <h4>
                  摘要 <span>ABSTRACT</span>
                </h4>
                <p>{cur.abstract}</p>
              </div>

              <div className="detail-section">
                <h4>
                  出版信息 <span>PUBLICATION</span>
                </h4>
                <div className="pub-grid">
                  <div>
                    <small>出版物</small>
                    <strong>{cur.venue}</strong>
                  </div>
                  <div>
                    <small>年份</small>
                    <strong>{cur.year}</strong>
                  </div>
                </div>
              </div>

              {cur.status === '已读' && (
                <div className="detail-section review-section">
                  <h4>
                    复盘要点 <span>REVIEW · 排入讨论前必填</span>
                  </h4>
                  <textarea
                    className="notes review"
                    placeholder="记录这篇文献的关键结论、可讨论点与局限…"
                    value={cur.review || ''}
                    onChange={(e) => update('review', e.target.value)}
                  />
                  {!String(cur.review || '').trim() && (
                    <small className="warn">尚未写复盘要点，该篇暂不能排入讨论场次</small>
                  )}
                </div>
              )}

              <div className="detail-section">
                <h4>
                  引用文本 <span>BIBTEX / TEXT</span>
                </h4>
                <div className="cite-box">
                  {cur.cite}
                  <button onClick={bib}>复制</button>
                </div>
              </div>

              <div className="detail-section">
                <h4>
                  我的笔记 <span>PRIVATE</span>
                </h4>
                <textarea
                  className="notes"
                  placeholder="记录你的阅读想法…"
                  value={cur.notes || ''}
                  onChange={(e) => update('notes', e.target.value)}
                />
              </div>
            </>
          )}
        </section>
      </div>

      {show && (
        <div className="modal-bg">
          <div className="modal">
            <button className="close" onClick={() => setShow(false)}>
              ×
            </button>
            <span className="crumb">NEW REFERENCE</span>
            <h2>添加一篇文献</h2>
            <label>
              标题
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="论文或书籍标题"
              />
            </label>
            <label>
              作者
              <input
                value={form.authors}
                onChange={(e) => setForm({ ...form, authors: e.target.value })}
              />
            </label>
            <div className="two">
              <label>
                年份
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                />
              </label>
              <label>
                出版物
                <input
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
              </label>
            </div>
            <label>
              关键词
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="用逗号分隔"
              />
            </label>
            <label>
              摘要
              <textarea
                rows="3"
                value={form.abstract}
                onChange={(e) => setForm({ ...form, abstract: e.target.value })}
              />
            </label>
            <button className="primary full" onClick={add}>
              保存文献
            </button>
          </div>
        </div>
      )}

      {notice && <div className="toast">{notice}</div>}
    </>
  );
}
