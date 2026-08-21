'use client';

import { useEffect, useMemo, useState } from 'react';
import ThemeToggle from '../components/ThemeToggle';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

const statuses = [
  { id: 'idea', label: 'Idea' },
  { id: 'planned', label: 'Planned' },
  { id: 'doing', label: 'Doing' },
  { id: 'done', label: 'Done' }
];

const labels = {
  food: 'Хоол',
  tourism: 'Аялал',
  platform: 'Платформ',
  web: 'Web',
  app: 'App',
  both: 'Web + App',
  fire3: 'Гал 3',
  fire2: 'Гал 2',
  fire1: 'Гал 1',
  watch: 'Ажиглах'
};

export default function BacklogPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('Ачаалж байна...');
  const [implementItem, setImplementItem] = useState(null);

  useEffect(() => {
    loadBacklog();
  }, []);

  const grouped = useMemo(() => {
    return statuses.reduce((acc, column) => {
      acc[column.id] = items.filter((item) => item.status === column.id);
      return acc;
    }, {});
  }, [items]);

  async function loadBacklog() {
    try {
      const response = await fetch(`${API_BASE}/api/backlog`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setItems(await response.json());
      setStatus('');
    } catch (error) {
      setStatus(`Backlog авахад алдаа гарлаа. (${error.message})`);
    }
  }

  async function updateStatus(itemId, nextStatus) {
    setStatus('Status шинэчилж байна...');
    try {
      const response = await fetch(`${API_BASE}/api/backlog/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error || 'Status шинэчлэгдсэнгүй.');
      setItems((current) => current.map((item) => (item.id === itemId ? updated : item)));
      setStatus('');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function startImplementation(item) {
    if (item.status !== 'doing') {
      await updateStatus(item.id, 'doing');
    }
    setImplementItem({ ...item, status: 'doing' });
  }

  return (
    <main className="backlog-page">
      <section className="backlog-shell">
        <div className="backlog-hero">
          <div>
            <p className="eyebrow">Product backlog</p>
            <h1>Судалгаанаас гарсан ажлууд</h1>
          </div>
          <div className="page-actions">
            <a className="btn btn-secondary" href="/research">Судалгаа</a>
            <a className="btn btn-secondary" href="/">Веб app</a>
            <ThemeToggle />
          </div>
        </div>

        {status && <p className="form-message">{status}</p>}

        <div className="backlog-board">
          {statuses.map((column) => (
            <section className="backlog-column" key={column.id}>
              <div className="backlog-column-head">
                <h2>{column.label}</h2>
                <span>{grouped[column.id]?.length || 0}</span>
              </div>

              <div className="backlog-list">
                {(grouped[column.id] ?? []).map((item) => (
                  <article className="backlog-card" key={item.id}>
                    <h3>{item.title}</h3>
                    <div className="backlog-tags">
                      <span>{labels[item.domain]}</span>
                      <span>{labels[item.target]}</span>
                      <span>{labels[item.priority]}</span>
                    </div>
                    {item.evidence.length > 0 && (
                      <blockquote>{item.evidence[0]}</blockquote>
                    )}
                    <select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}>
                      {statuses.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                    <button className="btn btn-primary backlog-implement-btn" type="button" onClick={() => startImplementation(item)}>
                      Implement
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      {implementItem && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setImplementItem(null)}>
          <section className="implement-dialog" role="dialog" aria-modal="true" aria-labelledby="implement-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-header">
              <h2 id="implement-title">Implementation brief</h2>
              <button type="button" aria-label="Хаах" onClick={() => setImplementItem(null)}>×</button>
            </div>
            <div className="implement-body">
              <div>
                <p className="eyebrow">{labels[implementItem.domain]} · {labels[implementItem.target]} · {labels[implementItem.priority]}</p>
                <h3>{implementItem.title}</h3>
              </div>
              <div className="implement-steps">
                <strong>Хийх ажлын чиглэл</strong>
                <ol>
                  <li>UI дээр хэрэглэгчийн гол урсгалыг тодорхой харуулах.</li>
                  <li>Шаардлагатай бол backend API болон PostgreSQL schema-г нэмэх.</li>
                  <li>Feature-г build/test хийж шалгах.</li>
                </ol>
              </div>
              {implementItem.evidence.length > 0 && (
                <div className="implement-evidence">
                  <strong>Нотолгоо</strong>
                  {implementItem.evidence.map((line) => (
                    <blockquote key={line}>{line}</blockquote>
                  ))}
                </div>
              )}
              <p className="muted">Энэ item `Doing` төлөвт орсон. Дараагийн алхамд энэ brief-ээр feature-г код руу оруулна.</p>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
