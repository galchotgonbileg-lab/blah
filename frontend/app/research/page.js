'use client';

import { useMemo, useState } from 'react';
import ThemeToggle from '../components/ThemeToggle';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

const keywordGroups = [
  {
    id: 'price',
    label: 'Үнэ',
    words: ['үнэ', 'төлбөр', 'хэд', 'тариф', 'хямдрал'],
    webFeature: 'Үнэ баталгаажуулалт, price notice, last checked',
    appFeature: 'Захиалгын өмнөх үнэ баталгаажуулах popup'
  },
  {
    id: 'menu',
    label: 'Меню',
    words: ['меню', 'хоол', 'цэс', 'порц', 'амттай'],
    webFeature: 'Ресторан/амралтын detail дээр меню tab',
    appFeature: 'Меню хайлт, зурагтай item, сагс'
  },
  {
    id: 'booking',
    label: 'Захиалга',
    words: ['захиалга', 'сул', 'өдөр', 'цаг', 'брон', 'booking'],
    webFeature: 'Сул өдөр, booking form, хүсэлт хадгалах',
    appFeature: 'Calendar picker, booking status'
  },
  {
    id: 'delivery',
    label: 'Хүргэлт',
    words: ['хүргэлт', 'хүргэх', 'дүүрэг', 'хаяг', 'байршил'],
    webFeature: 'Байршил, хүргэлтийн бүс, map section',
    appFeature: 'Delivery zone checker'
  },
  {
    id: 'rest',
    label: 'Амралт',
    words: ['амралт', 'өрөө', 'хоног', 'буудал', 'ресорт', 'сувилал'],
    webFeature: 'Амралтын газар detail, өрөөний төрөл',
    appFeature: 'Өрөө/хоногийн багц сонгох'
  },
  {
    id: 'trust',
    label: 'Итгэлцэл',
    words: ['зураг', 'сэтгэгдэл', 'review', 'үнэлгээ', 'бодит'],
    webFeature: 'Review, gallery, social proof',
    appFeature: 'Лайк, коммент, шейр, хэрэглэгчийн үнэлгээ'
  }
];

function splitLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function scorePriority(count) {
  if (count >= 6) return 'Гал 3';
  if (count >= 3) return 'Гал 2';
  if (count >= 1) return 'Гал 1';
  return 'Ажиглах';
}

function priorityCode(priority) {
  if (priority === 'Гал 3') return 'fire3';
  if (priority === 'Гал 2') return 'fire2';
  if (priority === 'Гал 1') return 'fire1';
  return 'watch';
}

function domainForInsight(id) {
  if (id === 'rest') return 'tourism';
  if (id === 'booking') return 'platform';
  return 'food';
}

function analyzeText(text) {
  const normalized = text.toLowerCase();
  const lines = splitLines(text);

  return keywordGroups
    .map((group) => {
      const count = group.words.reduce((sum, word) => {
        const matches = normalized.match(new RegExp(word.toLowerCase(), 'g'));
        return sum + (matches ? matches.length : 0);
      }, 0);
      const evidence = lines
        .filter((line) => group.words.some((word) => line.toLowerCase().includes(word.toLowerCase())))
        .slice(0, 4);

      return {
        ...group,
        count,
        priority: scorePriority(count),
        evidence
      };
    })
    .sort((a, b) => b.count - a.count);
}

export default function ResearchPage() {
  const [rawText, setRawText] = useState('');
  const [fbSourceId, setFbSourceId] = useState('');
  const [fbSourceType, setFbSourceType] = useState('group');
  const [fbKeywords, setFbKeywords] = useState('хоол,амралт,меню,үнэ,захиалга,хүргэлт,байршил');
  const [fbLimit, setFbLimit] = useState(30);
  const [fbStatus, setFbStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState({});
  const results = useMemo(() => analyzeText(rawText), [rawText]);
  const activeResults = results.filter((item) => item.count > 0);
  const totalSignals = activeResults.reduce((sum, item) => sum + item.count, 0);

  async function fetchFbFeed(event) {
    event.preventDefault();
    setFbStatus('FB feed татаж байна...');

    try {
      const params = new URLSearchParams({
        sourceId: fbSourceId.trim(),
        sourceType: fbSourceType,
        keywords: fbKeywords,
        limit: String(fbLimit)
      });
      const response = await fetch(`${API_BASE}/api/facebook/feed?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'FB feed татахад алдаа гарлаа.');
      }
      if (data.mode === 'not_configured') {
        setFbStatus(data.message);
        return;
      }
      if (data.mode === 'error') {
        setFbStatus(data.error);
        return;
      }

      const feedText = data.posts
        .map((post, index) => {
          const comments = post.comments.map((comment) => `- ${comment.message}`).join('\n');
          return `POST ${index + 1}:\n${post.message}\n\nCOMMENTS:\n${comments}`;
        })
        .join('\n\n---\n\n');

      setRawText(feedText || 'Шүүлтэд таарсан post олдсонгүй.');
      setFbStatus(`${data.posts.length} post татлаа.`);
    } catch (error) {
      setFbStatus(error.message);
    }
  }

  async function saveInsight(item) {
    setSaveStatus((current) => ({ ...current, [item.id]: 'Хадгалж байна...' }));

    try {
      const response = await fetch(`${API_BASE}/api/backlog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${item.label}: ${item.webFeature}`,
          domain: domainForInsight(item.id),
          target: 'both',
          priority: priorityCode(item.priority),
          status: 'idea',
          source: 'fb-research',
          evidence: item.evidence
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Backlog хадгалахад алдаа гарлаа.');
      }
      setSaveStatus((current) => ({ ...current, [item.id]: 'Backlog-д хадгаллаа.' }));
    } catch (error) {
      setSaveStatus((current) => ({ ...current, [item.id]: error.message }));
    }
  }

  return (
    <main className="research-page">
      <section className="research-shell">
        <div className="research-hero">
          <div>
            <p className="eyebrow">Сошиал судалгаа</p>
            <h1>FB post/comment insight</h1>
          </div>
          <div className="page-actions">
            <a className="btn btn-secondary" href="/backlog">Backlog</a>
            <ThemeToggle />
            <a className="btn btn-secondary" href="/">Веб app руу буцах</a>
          </div>
        </div>

        <div className="research-layout">
          <section className="research-input-panel">
            <form className="fb-feed-form" onSubmit={fetchFbFeed}>
              <div className="fb-feed-grid">
                <label>
                  Source ID
                  <input value={fbSourceId} onChange={(event) => setFbSourceId(event.target.value)} placeholder="page эсвэл group id" required />
                </label>
                <label>
                  Төрөл
                  <select value={fbSourceType} onChange={(event) => setFbSourceType(event.target.value)}>
                    <option value="group">Group</option>
                    <option value="page">Page</option>
                  </select>
                </label>
                <label>
                  Limit
                  <input type="number" min="1" max="50" value={fbLimit} onChange={(event) => setFbLimit(Number(event.target.value) || 1)} />
                </label>
              </div>
              <label>
                Keywords
                <input value={fbKeywords} onChange={(event) => setFbKeywords(event.target.value)} />
              </label>
              <button className="btn btn-secondary" type="submit">FB feed татах</button>
              {fbStatus && <p className="form-message">{fbStatus}</p>}
            </form>

            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              rows="18"
              placeholder="POST 1: ...&#10;COMMENTS:&#10;- Үнэ хэд вэ?&#10;- Меню байна уу?&#10;- Амралтын сул өдөр байна уу?"
            />
            <div className="research-stats">
              <span>{splitLines(rawText).length} мөр</span>
              <span>{totalSignals} signal</span>
              <span>{activeResults.length} хэрэгцээ</span>
            </div>
          </section>

          <section className="research-output-panel">
            <div className="research-summary">
              {activeResults.length === 0 ? (
                <article>
                  <h2>Signal алга</h2>
                  <p>FB group-ээс post/comment paste хийхэд хэрэгцээ энд гарна.</p>
                </article>
              ) : (
                activeResults.map((item) => (
                  <article key={item.id}>
                    <div className="research-card-head">
                      <h2>{item.label}</h2>
                      <span>{item.priority}</span>
                    </div>
                    <p>{item.count} давтамж</p>
                    <strong>Web: {item.webFeature}</strong>
                    <strong>App: {item.appFeature}</strong>
                    <button className="btn btn-secondary research-save-btn" type="button" onClick={() => saveInsight(item)}>
                      Backlog-д хадгалах
                    </button>
                    {saveStatus[item.id] && <p className="form-message">{saveStatus[item.id]}</p>}
                    {item.evidence.length > 0 && (
                      <div className="research-evidence">
                        {item.evidence.map((line) => (
                          <blockquote key={line}>{line}</blockquote>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
