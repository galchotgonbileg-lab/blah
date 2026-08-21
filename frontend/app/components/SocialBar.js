'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function SocialBar({ resourceType, resourceId }) {
  const [summary, setSummary] = useState({
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    comments: []
  });
  const [commentOpen, setCommentOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/social/${resourceType}/${encodeURIComponent(resourceId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (alive && data) setSummary(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [resourceType, resourceId]);

  async function postAction(action, payload = {}) {
    setMessage('');
    const response = await fetch(`${API_BASE}/api/social/${resourceType}/${encodeURIComponent(resourceId)}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: action === 'likes' ? undefined : JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Хадгалахад алдаа гарлаа.');
    }
    return data.summary || data;
  }

  async function like() {
    try {
      setSummary(await postAction('likes'));
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function share() {
    try {
      setSummary(await postAction('shares', { channel: 'internal' }));
      setMessage('Систем дотор шейр хадгалагдлаа.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function comment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      setSummary(await postAction('comments', data));
      form.reset();
      setCommentOpen(false);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="social-bar">
      <div className="social-actions">
        <button type="button" onClick={like}>Лайк · {summary.likeCount}</button>
        <button type="button" onClick={() => setCommentOpen((open) => !open)}>Коммент · {summary.commentCount}</button>
        <button type="button" onClick={share}>Шейр · {summary.shareCount}</button>
      </div>
      {message && <p className="social-message">{message}</p>}
      {commentOpen && (
        <form className="social-comment-form" onSubmit={comment}>
          <input name="userDisplayName" type="text" placeholder="Нэр" required />
          <textarea name="comment" rows="2" placeholder="Коммент" required />
          <button className="btn btn-secondary" type="submit">Илгээх</button>
        </form>
      )}
      {summary.comments.length > 0 && (
        <div className="social-comments">
          {summary.comments.slice(0, 2).map((item) => (
            <p key={item.id}><strong>{item.userDisplayName}:</strong> {item.comment}</p>
          ))}
        </div>
      )}
    </div>
  );
}
