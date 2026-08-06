const THEME_KEY = 'theme';
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

const toggle = document.querySelector('.menu-toggle');
const links = document.querySelector('.nav-links');

if (toggle && links) {
  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  links.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}

const toastEl = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

const orderDish = document.getElementById('order-dish');
const orderQty = document.getElementById('order-qty');
const addToOrderBtn = document.getElementById('add-to-order');
const orderListEl = document.getElementById('order-list');
const orderTotalEl = document.getElementById('order-total');
const order = [];

function renderOrder() {
  orderListEl.innerHTML = '';
  let total = 0;

  order.forEach((item, index) => {
    total += item.price * item.qty;
    const li = document.createElement('li');

    const label = document.createElement('span');
    label.textContent = `${item.qty} × ${item.name} — $${(item.price * item.qty).toFixed(2)}`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'order-item-remove';
    removeBtn.setAttribute('aria-label', `Remove ${item.name} from order`);
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      order.splice(index, 1);
      renderOrder();
    });

    li.appendChild(label);
    li.appendChild(removeBtn);
    orderListEl.appendChild(li);
  });

  orderTotalEl.textContent = `Total: $${total.toFixed(2)}`;
}

if (addToOrderBtn && orderDish && orderQty && orderListEl && orderTotalEl) {
  addToOrderBtn.addEventListener('click', () => {
    const selectedOption = orderDish.options[orderDish.selectedIndex];
    const name = selectedOption.value;
    const price = Number(selectedOption.dataset.price);
    const qty = Math.max(1, Number(orderQty.value) || 1);

    const existing = order.find((item) => item.name === name);
    if (existing) {
      existing.qty += qty;
    } else {
      order.push({ name, price, qty });
    }

    renderOrder();
    showToast(`Added ${qty} × ${name} to your order.`);
  });
}

const aiPrompt = document.getElementById('ai-prompt');
const aiAskBtn = document.getElementById('ai-ask');
const aiResponseEl = document.getElementById('ai-response');
const ASSISTANT_URL = 'http://localhost:3000/api/assistant';

if (aiAskBtn && aiPrompt && aiResponseEl) {
  aiAskBtn.addEventListener('click', async () => {
    const prompt = aiPrompt.value.trim();
    if (!prompt) {
      aiResponseEl.textContent = 'Please type a question first.';
      return;
    }

    aiAskBtn.disabled = true;
    aiResponseEl.textContent = 'Thinking...';

    try {
      const response = await fetch(ASSISTANT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed.');
      }

      aiResponseEl.textContent = data.reply;
    } catch (error) {
      aiResponseEl.textContent = `Could not reach the assistant. Is the server running? (${error.message})`;
    } finally {
      aiAskBtn.disabled = false;
    }
  });
}

const RESTAURANTS_URL = 'http://localhost:3000/api/restaurants';
const restaurantsGridEl = document.getElementById('restaurants-grid');
const restaurantsStatusEl = document.getElementById('restaurants-status');

function starsHtml(rating) {
  const filled = Math.round(rating);
  let html = '';
  for (let i = 0; i < 5; i += 1) {
    html += i < filled ? '★' : '<span class="star-empty">★</span>';
  }
  return html;
}

function renderRestaurants(list) {
  restaurantsGridEl.innerHTML = '';

  for (const restaurant of list) {
    const card = document.createElement('article');
    card.className = 'card dish-card';
    card.innerHTML = `
      <div class="dish-icon" aria-hidden="true">🍽️</div>
      <h3>${restaurant.name}</h3>
      <p>${restaurant.category} · ${restaurant.district}</p>
      <div class="stars" aria-label="${restaurant.avgOverall} out of 5 stars">${starsHtml(restaurant.avgOverall)}</div>
      <span class="dish-price">${restaurant.avgOverall.toFixed(1)} (${restaurant.reviewCount})</span>
    `;
    restaurantsGridEl.appendChild(card);
  }
}

async function loadRestaurants() {
  if (!restaurantsGridEl || !restaurantsStatusEl) {
    return;
  }

  restaurantsStatusEl.textContent = 'Loading restaurants...';

  try {
    const response = await fetch(RESTAURANTS_URL);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const restaurants = await response.json();
    renderRestaurants(restaurants);
    restaurantsStatusEl.textContent = '';
  } catch (error) {
    restaurantsStatusEl.textContent = `Could not load restaurants. Is the server running? (${error.message})`;
  }
}

loadRestaurants();

const form = document.getElementById('booking-form');
const formMessage = document.getElementById('form-message');

if (form && formMessage) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = data.get('name')?.toString().trim() || 'guest';
    formMessage.textContent = `Thanks, ${name}! Your reservation request has been received.`;
    showToast('Reservation request sent.');
    form.reset();
  });
}

const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealEls.forEach((el) => observer.observe(el));
}

