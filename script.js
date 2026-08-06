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

const orderDish = document.getElementById('order-dish');
const orderQty = document.getElementById('order-qty');
const addToOrderBtn = document.getElementById('add-to-order');
const orderListEl = document.getElementById('order-list');
const orderTotalEl = document.getElementById('order-total');
const order = [];

function renderOrder() {
  orderListEl.innerHTML = '';
  let total = 0;

  for (const item of order) {
    total += item.price * item.qty;
    const li = document.createElement('li');
    li.textContent = `${item.qty} × ${item.name} — $${(item.price * item.qty).toFixed(2)}`;
    orderListEl.appendChild(li);
  }

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

const form = document.getElementById('booking-form');
const formMessage = document.getElementById('form-message');

if (form && formMessage) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = data.get('name')?.toString().trim() || 'guest';
    formMessage.textContent = `Thanks, ${name}! Your reservation request has been received.`;
    form.reset();
  });
}

