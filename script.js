const API_BASE = window.location.port === '3001' ? '' : 'http://localhost:3001';
const THEME_KEY = 'amtai-theme';
const root = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');

const dishes = [
  {
    id: 'buuz',
    name: 'Гэрийн бууз',
    category: 'Монгол',
    price: 18500,
    time: '18 мин',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'tsuivan',
    name: 'Үхрийн цуйван',
    category: 'Монгол',
    price: 21500,
    time: '22 мин',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ramen',
    name: 'Халуун рамен',
    category: 'Ази',
    price: 24500,
    time: '20 мин',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'pasta',
    name: 'Улаан лоолийн паста',
    category: 'Итали',
    price: 26500,
    time: '24 мин',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'sushi',
    name: 'Сакура сет',
    category: 'Япон',
    price: 39500,
    time: '28 мин',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'salad',
    name: 'Тахианы салат',
    category: 'Хөнгөн',
    price: 19500,
    time: '14 мин',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80'
  }
];

const cart = new Map();
let activeCategory = 'Бүгд';
let deliveryMode = 'delivery';
let activeRestaurantId = null;

function money(value) {
  return `₮${value.toLocaleString('mn-MN')}`;
}

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '☀' : '☾';
  }
}

setTheme(localStorage.getItem(THEME_KEY) || 'dark');

themeToggle?.addEventListener('click', () => {
  setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
});

const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle?.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuToggle.classList.toggle('open', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

navLinks?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

const toastEl = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

const dishGrid = document.getElementById('dish-grid');
const categoryTabs = document.getElementById('category-tabs');
const dishSearch = document.getElementById('dish-search');

function renderCategories() {
  const categories = ['Бүгд', ...new Set(dishes.map((dish) => dish.category))];
  categoryTabs.innerHTML = categories
    .map((category) => `<button class="${category === activeCategory ? 'active' : ''}" type="button">${category}</button>`)
    .join('');

  categoryTabs.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = button.textContent;
      renderCategories();
      renderDishes();
    });
  });
}

function renderDishes() {
  const query = dishSearch.value.trim().toLowerCase();
  const filtered = dishes.filter((dish) => {
    const matchesCategory = activeCategory === 'Бүгд' || dish.category === activeCategory;
    const matchesSearch = dish.name.toLowerCase().includes(query) || dish.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  dishGrid.innerHTML = filtered
    .map(
      (dish) => `
        <article class="dish-card">
          <img src="${dish.image}" alt="${dish.name}" loading="lazy" />
          <div class="dish-body">
            <div>
              <h3>${dish.name}</h3>
              <p>${dish.category} · ${dish.time} · ★ ${dish.rating}</p>
            </div>
            <div class="dish-footer">
              <strong>${money(dish.price)}</strong>
              <button class="icon-btn" type="button" data-add="${dish.id}" aria-label="${dish.name} нэмэх">+</button>
            </div>
          </div>
        </article>
      `
    )
    .join('');

  dishGrid.querySelectorAll('[data-add]').forEach((button) => {
    button.addEventListener('click', () => addToCart(button.dataset.add));
  });
}

dishSearch?.addEventListener('input', renderDishes);

function addToCart(dishId) {
  const dish = dishes.find((item) => item.id === dishId);
  const current = cart.get(dishId);
  cart.set(dishId, { dish, qty: current ? current.qty + 1 : 1 });
  renderCart();
  showToast(`${dish.name} сагсанд нэмэгдлээ.`);
}

const cartList = document.getElementById('cart-list');
const cartCount = document.getElementById('cart-count');
const subtotalEl = document.getElementById('subtotal');
const serviceFeeEl = document.getElementById('service-fee');
const serviceLabelEl = document.getElementById('service-label');
const grandTotalEl = document.getElementById('grand-total');

function renderCart() {
  const items = [...cart.values()];
  const subtotal = items.reduce((sum, item) => sum + item.dish.price * item.qty, 0);
  const serviceFee = subtotal === 0 || deliveryMode === 'pickup' ? 0 : 5000;

  cartCount.textContent = String(items.reduce((sum, item) => sum + item.qty, 0));
  subtotalEl.textContent = money(subtotal);
  serviceFeeEl.textContent = money(serviceFee);
  serviceLabelEl.textContent = deliveryMode === 'pickup' ? 'Авах төлбөр' : 'Хүргэлт';
  grandTotalEl.textContent = money(subtotal + serviceFee);

  cartList.innerHTML = items
    .map(
      ({ dish, qty }) => `
        <li>
          <div>
            <strong>${dish.name}</strong>
            <span>${money(dish.price)} · ${qty}ш</span>
          </div>
          <div class="qty-controls">
            <button type="button" data-dec="${dish.id}" aria-label="${dish.name} хасах">−</button>
            <span>${qty}</span>
            <button type="button" data-inc="${dish.id}" aria-label="${dish.name} нэмэх">+</button>
          </div>
        </li>
      `
    )
    .join('');

  cartList.querySelectorAll('[data-inc]').forEach((button) => {
    button.addEventListener('click', () => addToCart(button.dataset.inc));
  });

  cartList.querySelectorAll('[data-dec]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = cart.get(button.dataset.dec);
      if (!item) return;
      if (item.qty <= 1) {
        cart.delete(button.dataset.dec);
      } else {
        item.qty -= 1;
      }
      renderCart();
    });
  });
}

document.querySelectorAll('.delivery-toggle button').forEach((button) => {
  button.addEventListener('click', () => {
    deliveryMode = button.dataset.mode;
    document.querySelectorAll('.delivery-toggle button').forEach((item) => item.classList.toggle('active', item === button));
    renderCart();
  });
});

document.getElementById('checkout-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = document.getElementById('checkout-message');
  if (cart.size === 0) {
    message.textContent = 'Эхлээд хоол сонгоно уу.';
    return;
  }
  const data = new FormData(event.currentTarget);
  message.textContent = `${data.get('name')} таны захиалга хүлээн авлаа.`;
  cart.clear();
  event.currentTarget.reset();
  renderCart();
  showToast('Захиалга амжилттай илгээгдлээ.');
});

const restaurantsGrid = document.getElementById('restaurants-grid');
const restaurantsStatus = document.getElementById('restaurants-status');

function stars(rating) {
  const rounded = Math.round(Number(rating) || 0);
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

function renderRestaurants(restaurants) {
  restaurantsGrid.innerHTML = restaurants
    .map(
      (restaurant) => `
        <article class="restaurant-card">
          <div>
            <p class="eyebrow">${restaurant.category}</p>
            <h3>${restaurant.name}</h3>
            <p>${restaurant.district} · ${restaurant.address || 'Хаяг оруулаагүй'}</p>
          </div>
          <div class="restaurant-meta">
            <span>${stars(restaurant.avgOverall)}</span>
            <strong>${Number(restaurant.avgOverall).toFixed(1)}</strong>
            <small>${restaurant.reviewCount} үнэлгээ</small>
          </div>
          <button class="btn btn-secondary" type="button" data-reviews="${restaurant.id}" data-name="${restaurant.name}">Сэтгэгдэл</button>
        </article>
      `
    )
    .join('');

  restaurantsGrid.querySelectorAll('[data-reviews]').forEach((button) => {
    button.addEventListener('click', () => openReviews(button.dataset.reviews, button.dataset.name));
  });
}

async function loadRestaurants() {
  restaurantsStatus.textContent = 'Ресторанууд ачаалж байна...';
  try {
    const response = await fetch(`${API_BASE}/api/restaurants`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const restaurants = await response.json();
    renderRestaurants(restaurants);
    restaurantsStatus.textContent = '';
  } catch (error) {
    restaurantsStatus.textContent = `Backend сервер асаалттай эсэхийг шалгана уу. (${error.message})`;
  }
}

document.getElementById('restaurant-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  restaurantsStatus.textContent = 'Нэмж байна...';

  try {
    const response = await fetch(`${API_BASE}/api/restaurants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, city: 'Улаанбаатар' })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Нэмэхэд алдаа гарлаа.');
    form.reset();
    showToast('Ресторан нэмэгдлээ.');
    await loadRestaurants();
  } catch (error) {
    restaurantsStatus.textContent = error.message;
  }
});

const reviewDialog = document.getElementById('review-dialog');
const reviewsList = document.getElementById('reviews-list');
const reviewForm = document.getElementById('review-form');

async function openReviews(restaurantId, restaurantName) {
  activeRestaurantId = restaurantId;
  document.getElementById('dialog-title').textContent = restaurantName;
  reviewsList.textContent = 'Сэтгэгдэл ачаалж байна...';
  if (!reviewDialog.open) {
    reviewDialog.showModal();
  }

  try {
    const response = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/reviews`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const reviews = await response.json();
    reviewsList.innerHTML = reviews.length
      ? reviews
          .map(
            (review) => `
              <article>
                <strong>${review.userDisplayName}</strong>
                <span>${stars((review.tasteRating + review.hygieneRating + review.serviceRating) / 3)}</span>
                <p>${review.comment}</p>
              </article>
            `
          )
          .join('')
      : '<p class="muted">Одоогоор сэтгэгдэл алга.</p>';
  } catch (error) {
    reviewsList.textContent = `Сэтгэгдэл авахад алдаа гарлаа. (${error.message})`;
  }
}

reviewForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeRestaurantId) return;

  const form = event.currentTarget;
  const raw = Object.fromEntries(new FormData(form));
  const payload = {
    userDisplayName: raw.userDisplayName,
    tasteRating: Number(raw.tasteRating),
    hygieneRating: Number(raw.hygieneRating),
    serviceRating: Number(raw.serviceRating),
    comment: raw.comment
  };

  try {
    const response = await fetch(`${API_BASE}/api/restaurants/${activeRestaurantId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Сэтгэгдэл хадгалсангүй.');
    form.reset();
    showToast('Сэтгэгдэл нэмэгдлээ.');
    await openReviews(activeRestaurantId, document.getElementById('dialog-title').textContent);
    await loadRestaurants();
  } catch (error) {
    showToast(error.message);
  }
});

const aiPrompt = document.getElementById('ai-prompt');
const aiAsk = document.getElementById('ai-ask');
const aiResponse = document.getElementById('ai-response');

aiAsk?.addEventListener('click', async () => {
  const prompt = aiPrompt.value.trim();
  if (!prompt) {
    aiResponse.textContent = 'Асуултаа бичнэ үү.';
    return;
  }

  aiAsk.disabled = true;
  aiResponse.textContent = 'Бодож байна...';

  try {
    const response = await fetch(`${API_BASE}/api/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Хүсэлт амжилтгүй.');
    aiResponse.textContent = data.reply;
  } catch (error) {
    aiResponse.textContent = `Туслахтай холбогдсонгүй. (${error.message})`;
  } finally {
    aiAsk.disabled = false;
  }
});

document.getElementById('booking-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  document.getElementById('booking-message').textContent = `${data.get('name')} таны ширээний хүсэлт хадгалагдлаа.`;
  event.currentTarget.reset();
});

renderCategories();
renderDishes();
renderCart();
loadRestaurants();
