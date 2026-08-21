'use client';

const palette = [
  { name: 'Background', varName: '--bg' },
  { name: 'Surface', varName: '--surface' },
  { name: 'Soft Surface', varName: '--surface-2' },
  { name: 'Primary', varName: '--primary' },
  { name: 'Accent', varName: '--accent' },
  { name: 'Text', varName: '--text' }
];

export default function DesignPage() {
  return (
    <main className="design-page">
      <section className="design-shell">
        <div className="design-hero">
          <div>
            <p className="eyebrow">Visual direction</p>
            <h1>Амттай өнгө загвар</h1>
            <p className="muted">Frontend-ийн үндсэн palette, card, button, form style-ийг нэг дор шалгах preview.</p>
          </div>
          <a className="btn btn-primary" href="/">Апп харах</a>
        </div>

        <div className="design-section">
          <div className="section-heading">
            <p className="eyebrow">Palette</p>
            <h2>Өнгөний систем</h2>
          </div>
          <div className="palette-grid">
            {palette.map((color) => (
              <article className="swatch-card" key={color.varName}>
                <span className="swatch" style={{ background: `var(${color.varName})` }} />
                <strong>{color.name}</strong>
                <small>{color.varName}</small>
              </article>
            ))}
          </div>
        </div>

        <div className="design-grid">
          <section className="design-section">
            <div className="section-heading">
              <p className="eyebrow">Components</p>
              <h2>Товч ба input</h2>
            </div>
            <div className="component-stack">
              <div className="button-row">
                <button className="btn btn-primary" type="button">Захиалах</button>
                <button className="btn btn-secondary" type="button">Дэлгэрэнгүй</button>
                <button className="icon-btn" type="button" aria-label="Нэмэх">+</button>
              </div>
              <input type="text" placeholder="Хайх: бууз, рамен..." />
              <textarea rows="3" placeholder="Нэмэлт тэмдэглэл" />
            </div>
          </section>

          <section className="design-section">
            <div className="section-heading">
              <p className="eyebrow">Food card</p>
              <h2>Хоолны card</h2>
            </div>
            <article className="dish-card design-dish-card">
              <div className="dish-image-wrap">
                <img src="https://images.unsplash.com/photo-1591814468924-caf88d1232e1?auto=format&fit=crop&w=900&q=80" alt="Халуун рамен" />
                <span>Халуун</span>
              </div>
              <div className="dish-body">
                <div>
                  <h3>Халуун рамен</h3>
                  <p>Ази · 20 мин · ★ 4.9</p>
                </div>
                <div className="dish-footer">
                  <strong>₮24,500</strong>
                  <button className="icon-btn" type="button" aria-label="Нэмэх">+</button>
                </div>
              </div>
            </article>
          </section>
        </div>

        <section className="design-section">
          <div className="section-heading">
            <p className="eyebrow">Checkout</p>
            <h2>Сагсны preview</h2>
          </div>
          <div className="cart-panel design-cart">
            <div className="cart-header">
              <div>
                <p className="eyebrow">Захиалга</p>
                <h2>Миний сагс</h2>
              </div>
              <span className="cart-count">3</span>
            </div>
            <ul className="cart-list">
              <li>
                <div>
                  <strong>Халуун рамен</strong>
                  <span>₮24,500 · 2ш</span>
                </div>
                <div className="qty-controls">
                  <button type="button">−</button>
                  <span>2</span>
                  <button type="button">+</button>
                </div>
              </li>
              <li>
                <div>
                  <strong>Тахианы салат</strong>
                  <span>₮19,500 · 1ш</span>
                </div>
                <div className="qty-controls">
                  <button type="button">−</button>
                  <span>1</span>
                  <button type="button">+</button>
                </div>
              </li>
            </ul>
            <div className="totals">
              <div><span>Хоол</span><strong>₮68,500</strong></div>
              <div><span>Хүргэлт</span><strong>₮5,000</strong></div>
              <div className="grand-total"><span>Нийт</span><strong>₮73,500</strong></div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
