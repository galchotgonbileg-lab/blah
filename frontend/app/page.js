'use client';

import { useEffect, useMemo, useState } from 'react';
import LocationFinder from './components/LocationFinder';
import SocialBar from './components/SocialBar';
import ThemeToggle from './components/ThemeToggle';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

const dishes = [
  {
    id: 'buuz',
    name: 'Гэрийн бууз',
    category: 'Монгол',
    price: 18500,
    time: '18 мин',
    rating: 4.8,
    tag: 'Өдрийн хит',
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'tsuivan',
    name: 'Үхрийн цуйван',
    category: 'Монгол',
    price: 21500,
    time: '22 мин',
    rating: 4.7,
    tag: 'Илчлэгтэй',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ramen',
    name: 'Халуун рамен',
    category: 'Ази',
    price: 24500,
    time: '20 мин',
    rating: 4.9,
    tag: 'Халуун',
    image: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'pasta',
    name: 'Улаан лоолийн паста',
    category: 'Итали',
    price: 26500,
    time: '24 мин',
    rating: 4.6,
    tag: 'Зөөлөн',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'sushi',
    name: 'Сакура сет',
    category: 'Япон',
    price: 39500,
    time: '28 мин',
    rating: 4.8,
    tag: 'Premium',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'salad',
    name: 'Тахианы салат',
    category: 'Хөнгөн',
    price: 19500,
    time: '14 мин',
    rating: 4.5,
    tag: 'Хөнгөн',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80'
  }
];

function money(value) {
  return `₮${value.toLocaleString('mn-MN')}`;
}

function stars(rating) {
  const rounded = Math.round(Number(rating) || 0);
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Бүгд');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});
  const [deliveryMode, setDeliveryMode] = useState('delivery');
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsStatus, setRestaurantsStatus] = useState('');
  const [activeRestaurant, setActiveRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewStatus, setReviewStatus] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('Таны хүссэн амт, нөхцөлд тааруулж санал болгоно.');
  const [recipePreview, setRecipePreview] = useState('');
  const [recipeServings, setRecipeServings] = useState(2);
  const [recipeResult, setRecipeResult] = useState(null);
  const [recipeStatus, setRecipeStatus] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [priceNoticeOpen, setPriceNoticeOpen] = useState(false);
  const [toast, setToast] = useState('');

  const categories = useMemo(() => ['Бүгд', ...new Set(dishes.map((dish) => dish.category))], []);
  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const subtotal = cartItems.reduce((sum, item) => sum + item.dish.price * item.qty, 0);
  const serviceFee = subtotal === 0 || deliveryMode === 'pickup' ? 0 : 5000;
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const topRestaurant = restaurants[0];

  const filteredDishes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dishes.filter((dish) => {
      const matchesCategory = activeCategory === 'Бүгд' || dish.category === activeCategory;
      const matchesSearch = dish.name.toLowerCase().includes(query) || dish.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  function addToCart(dishId) {
    const dish = dishes.find((item) => item.id === dishId);
    setCart((current) => ({
      ...current,
      [dishId]: { dish, qty: current[dishId] ? current[dishId].qty + 1 : 1 }
    }));
    setCheckoutMessage('');
    setToast(`${dish.name} сагсанд нэмэгдлээ.`);
  }

  function decreaseCart(dishId) {
    setCart((current) => {
      const item = current[dishId];
      if (!item) return current;
      const next = { ...current };
      if (item.qty <= 1) {
        delete next[dishId];
      } else {
        next[dishId] = { ...item, qty: item.qty - 1 };
      }
      return next;
    });
  }

  async function loadRestaurants() {
    setRestaurantsStatus('Ресторанууд ачаалж байна...');
    try {
      const response = await fetch(`${API_BASE}/api/restaurants`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setRestaurants(await response.json());
      setRestaurantsStatus('');
    } catch (error) {
      setRestaurantsStatus(`Backend сервер асаалттай эсэхийг шалгана уу. (${error.message})`);
    }
  }

  async function openReviews(restaurant) {
    setActiveRestaurant(restaurant);
    setReviews([]);
    setReviewStatus('Сэтгэгдэл ачаалж байна...');
    try {
      const response = await fetch(`${API_BASE}/api/restaurants/${restaurant.id}/reviews`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setReviews(await response.json());
      setReviewStatus('');
    } catch (error) {
      setReviewStatus(`Сэтгэгдэл авахад алдаа гарлаа. (${error.message})`);
    }
  }

  async function submitRestaurant(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setRestaurantsStatus('Нэмж байна...');
    try {
      const response = await fetch(`${API_BASE}/api/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, city: 'Улаанбаатар' })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Нэмэхэд алдаа гарлаа.');
      form.reset();
      setToast('Ресторан нэмэгдлээ.');
      await loadRestaurants();
    } catch (error) {
      setRestaurantsStatus(error.message);
    }
  }

  async function submitReview(event) {
    event.preventDefault();
    if (!activeRestaurant) return;
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
      const response = await fetch(`${API_BASE}/api/restaurants/${activeRestaurant.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Сэтгэгдэл хадгалсангүй.');
      form.reset();
      setToast('Сэтгэгдэл нэмэгдлээ.');
      await openReviews(activeRestaurant);
      await loadRestaurants();
    } catch (error) {
      setToast(error.message);
    }
  }

  async function askAssistant() {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setAiResponse('Асуултаа бичнэ үү.');
      return;
    }
    setAiResponse('Бодож байна...');
    try {
      const response = await fetch(`${API_BASE}/api/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Хүсэлт амжилтгүй.');
      setAiResponse(data.reply);
    } catch (error) {
      setAiResponse(`Туслахтай холбогдсонгүй. (${error.message})`);
    }
  }

  function handleRecipeImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setRecipeStatus('Зөвхөн зураг файл сонгоно уу.');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setRecipeStatus('Зураг 6MB-аас бага байх хэрэгтэй.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRecipePreview(reader.result.toString());
      setRecipeResult(null);
      setRecipeStatus('');
    };
    reader.readAsDataURL(file);
  }

  async function analyzeRecipeImage() {
    if (!recipePreview) {
      setRecipeStatus('Эхлээд хоолны зураг сонгоно уу.');
      return;
    }

    setRecipeStatus('Зургийг таньж, жор боловсруулж байна...');
    setRecipeResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/recipe-from-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: recipePreview,
          servings: recipeServings
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Зураг танихад алдаа гарлаа.');
      }

      setRecipeResult(data.recipe);
      setRecipeStatus('');
    } catch (error) {
      setRecipeStatus(error.message);
    }
  }

  async function submitCheckout(event) {
    event.preventDefault();
    if (cartItems.length === 0) {
      setCheckoutMessage('Эхлээд хоол сонгоно уу.');
      return;
    }

    const data = new FormData(event.currentTarget);
    const payload = {
      customerName: data.get('name')?.toString() || '',
      phone: data.get('phone')?.toString() || '',
      note: data.get('note')?.toString() || '',
      mode: deliveryMode,
      items: cartItems.map(({ dish, qty }) => ({
        dishId: dish.id,
        name: dish.name,
        price: dish.price,
        qty
      }))
    };

    setCheckoutMessage('Захиалгыг хадгалж байна...');

    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const order = await response.json();

      if (!response.ok) {
        throw new Error(order.error || 'Захиалга хадгалахад алдаа гарлаа.');
      }

      setCheckoutMessage(`${payload.customerName} таны захиалга #${order.id.slice(0, 8)} хадгалагдлаа.`);
      setCart({});
      event.currentTarget.reset();
      setToast('Захиалга PostgreSQL-д хадгалагдлаа.');
    } catch (error) {
      setCheckoutMessage(error.message);
    }
  }

  function submitBooking(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBookingMessage(`${data.get('name')} таны ширээний хүсэлт хадгалагдлаа.`);
    event.currentTarget.reset();
  }

  return (
    <>
      <header className="site-header">
        <nav className="nav container" aria-label="Үндсэн цэс">
          <a className="brand" href="#app">
            <span className="brand-mark">A</span>
            Амттай
          </a>
          <button className={`menu-toggle ${menuOpen ? 'open' : ''}`} aria-label="Цэс нээх" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <span />
            <span />
            <span />
          </button>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <a href="#app" onClick={() => setMenuOpen(false)}>Захиалга</a>
            <a href="#restaurants" onClick={() => setMenuOpen(false)}>Ресторан</a>
            <a href="#recipe" onClick={() => setMenuOpen(false)}>Жор</a>
            <a href="#assistant" onClick={() => setMenuOpen(false)}>Туслах</a>
            <a href="/tourism" onClick={() => setMenuOpen(false)}>Аялал</a>
            <a href="/research" onClick={() => setMenuOpen(false)}>Судалгаа</a>
            <a href="/backlog" onClick={() => setMenuOpen(false)}>Backlog</a>
            <a href="#booking" onClick={() => setMenuOpen(false)}>Ширээ</a>
          </div>
          <ThemeToggle />
        </nav>
      </header>

      <main>
        <section id="app" className="app-hero">
          <div className="container app-layout">
            <div className="menu-panel">
              <div className="hero-grid">
                <div className="hero-copy">
                  <p className="eyebrow">Улаанбаатарын амтууд</p>
                  <h1>Өнөөдрийн хоолоо хурдан, гоё сонго.</h1>
                  <p className="lead">Хоолоо шүүж, сагсандаа нэмээд нийт дүн, хүргэлт, үнэлгээг нэг дор харах ресторан апп.</p>
                  <div className="hero-actions">
                    <a className="btn btn-primary" href="#menu-list">Цэс харах</a>
                    <a className="btn btn-secondary" href="#restaurants">Ресторан сонгох</a>
                  </div>
                </div>

                <div className="feature-card" aria-label="Онцлох хоол">
                  <img src={dishes[2].image} alt={dishes[2].name} />
                  <div className="feature-info">
                    <span className="pill">Өнөөдрийн санал</span>
                    <h2>{dishes[2].name}</h2>
                    <p>Халуун, шөлтэй, оройн сэрүүнд яг таарна.</p>
                    <div className="feature-row">
                      <strong>{money(dishes[2].price)}</strong>
                      <button className="btn btn-primary" type="button" onClick={() => addToCart(dishes[2].id)}>Нэмэх</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="metric-strip" aria-label="Аппын үзүүлэлт">
                <div><strong>20-30</strong><span>мин хүргэлт</span></div>
                <div><strong>{restaurants.length || 4}</strong><span>ресторан</span></div>
                <div><strong>{topRestaurant ? Number(topRestaurant.avgOverall).toFixed(1) : '4.7'}</strong><span>дундаж үнэлгээ</span></div>
              </div>

              <div id="menu-list" className="toolbar" role="search">
                <label className="search-field" htmlFor="dish-search">
                  <span>Хайх</span>
                  <input id="dish-search" type="search" placeholder="Бууз, паста, суши..." value={search} onChange={(event) => setSearch(event.target.value)} />
                </label>
                <div className="category-tabs" aria-label="Хоолны төрөл">
                  {categories.map((category) => (
                    <button key={category} className={category === activeCategory ? 'active' : ''} type="button" onClick={() => setActiveCategory(category)}>
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="menu-headline">
                <div>
                  <p className="eyebrow">Цэс</p>
                  <h2>{activeCategory === 'Бүгд' ? 'Бүх хоол' : `${activeCategory} хоол`}</h2>
                </div>
                <div className="menu-meta-actions">
                  <span>{filteredDishes.length} сонголт</span>
                  <button type="button" onClick={() => setPriceNoticeOpen(true)}>Үнэ</button>
                </div>
              </div>

              <div className="dish-grid" aria-live="polite">
                {filteredDishes.map((dish) => (
                  <article className="dish-card" key={dish.id}>
                    <div className="dish-image-wrap">
                      <img src={dish.image} alt={dish.name} />
                      <span>{dish.tag}</span>
                    </div>
                    <div className="dish-body">
                      <div>
                        <h3>{dish.name}</h3>
                        <p>{dish.category} · {dish.time} · ★ {dish.rating}</p>
                      </div>
                      <div className="dish-footer">
                        <strong>{money(dish.price)}</strong>
                        <button className="icon-btn" type="button" aria-label={`${dish.name} нэмэх`} onClick={() => addToCart(dish.id)}>+</button>
                      </div>
                      <SocialBar resourceType="dish" resourceId={dish.id} />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="cart-panel" aria-label="Миний захиалга">
              <div className="cart-header">
                <div>
                  <p className="eyebrow">Захиалга</p>
                  <h2>Миний сагс</h2>
                </div>
                <span className="cart-count">{cartCount}</span>
              </div>

              <div className="delivery-toggle" role="group" aria-label="Захиалгын төрөл">
                <button className={deliveryMode === 'delivery' ? 'active' : ''} type="button" onClick={() => setDeliveryMode('delivery')}>Хүргэлт</button>
                <button className={deliveryMode === 'pickup' ? 'active' : ''} type="button" onClick={() => setDeliveryMode('pickup')}>Очиж авах</button>
              </div>

              <ul className="cart-list">
                {cartItems.length === 0 && (
                  <li className="empty-cart">
                    <strong>Сагс хоосон байна</strong>
                    <span>Дээрээс хоолоо сонгоод + товч дарна.</span>
                  </li>
                )}
                {cartItems.map(({ dish, qty }) => (
                  <li key={dish.id}>
                    <div>
                      <strong>{dish.name}</strong>
                      <span>{money(dish.price)} · {qty}ш</span>
                    </div>
                    <div className="qty-controls">
                      <button type="button" aria-label={`${dish.name} хасах`} onClick={() => decreaseCart(dish.id)}>−</button>
                      <span>{qty}</span>
                      <button type="button" aria-label={`${dish.name} нэмэх`} onClick={() => addToCart(dish.id)}>+</button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="totals">
                <div><span>Хоол</span><strong>{money(subtotal)}</strong></div>
                <div><span>{deliveryMode === 'pickup' ? 'Авах төлбөр' : 'Хүргэлт'}</span><strong>{money(serviceFee)}</strong></div>
                <div className="grand-total"><span>Нийт</span><strong>{money(subtotal + serviceFee)}</strong></div>
              </div>
              <button className="price-note-button" type="button" onClick={() => setPriceNoticeOpen(true)}>
                Одоогийн байдлаар үнэ
              </button>

              <form className="checkout-form" onSubmit={submitCheckout}>
                <input name="name" type="text" placeholder="Нэр" required />
                <input name="phone" type="tel" placeholder="Утас" required />
                <textarea name="note" rows="3" placeholder="Нэмэлт тэмдэглэл" />
                <button className="btn btn-primary" type="submit">Захиалга илгээх</button>
                <p className="form-message" aria-live="polite">{checkoutMessage}</p>
              </form>
            </aside>
          </div>
        </section>

        <section id="restaurants" className="section">
          <div className="container">
            <div className="section-heading split-heading">
              <div>
                <p className="eyebrow">Үнэлгээ</p>
                <h2>Хотын ресторанууд</h2>
              </div>
              <p className="muted">Амт, цэвэр байдал, үйлчилгээний дундаж оноогоор эрэмбэлэв.</p>
            </div>

            <div className="restaurant-tools">
              <LocationFinder type="restaurants" title="Ойролцоох ресторан" />
              <form className="restaurant-form" onSubmit={submitRestaurant}>
                <input name="name" type="text" placeholder="Рестораны нэр" required />
                <input name="district" type="text" placeholder="Дүүрэг" required />
                <input name="category" type="text" placeholder="Төрөл" required />
                <input name="address" type="text" placeholder="Хаяг" />
                <button className="btn btn-secondary" type="submit">Ресторан нэмэх</button>
              </form>
              <p className="form-message" aria-live="polite">{restaurantsStatus}</p>
            </div>

            <div className="restaurant-grid">
              {restaurants.map((restaurant) => (
                <article className="restaurant-card" key={restaurant.id}>
                  <div>
                    <p className="eyebrow">{restaurant.category}</p>
                    <h3>{restaurant.name}</h3>
                    <p>{restaurant.district} · {restaurant.address || 'Хаяг оруулаагүй'}</p>
                  </div>
                  <div className="restaurant-meta">
                    <span>{stars(restaurant.avgOverall)}</span>
                    <strong>{Number(restaurant.avgOverall).toFixed(1)}</strong>
                    <small>{restaurant.reviewCount} үнэлгээ</small>
                  </div>
                  <SocialBar resourceType="restaurant" resourceId={restaurant.id} />
                  <button className="btn btn-secondary" type="button" onClick={() => openReviews(restaurant)}>Сэтгэгдэл</button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="recipe" className="section section-alt">
          <div className="container recipe-layout">
            <div>
              <p className="eyebrow">Зураг таних</p>
              <h2>Хоолны зургаас жор гарга</h2>
              <p className="muted">Зураг оруулаад порцоо сонгоно. AI хоолыг таньж орц, хольц, хийх аргыг Монгол хэлээр гаргана.</p>
            </div>
            <div className="recipe-panel">
              <div className="recipe-upload">
                {recipePreview ? (
                  <img src={recipePreview} alt="Сонгосон хоол" />
                ) : (
                  <div>
                    <strong>Зураг сонгох</strong>
                    <span>PNG, JPG, WEBP · 6MB хүртэл</span>
                  </div>
                )}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleRecipeImage} />
              </div>
              <div className="recipe-controls">
                <label>
                  Порц
                  <input type="number" min="1" max="20" value={recipeServings} onChange={(event) => setRecipeServings(Number(event.target.value) || 1)} />
                </label>
                <button className="btn btn-primary" type="button" onClick={analyzeRecipeImage}>Жор гаргах</button>
              </div>
              {recipeStatus && <p className="form-message">{recipeStatus}</p>}
              {recipeResult && (
                <article className="recipe-result">
                  <div className="recipe-result-head">
                    <div>
                      <p className="eyebrow">Танигдсан хоол</p>
                      <h3>{recipeResult.dishName}</h3>
                    </div>
                    <span>{recipeResult.servings} порц · {recipeResult.confidence}</span>
                  </div>
                  <div className="recipe-columns">
                    <div>
                      <h4>Орц, хольц</h4>
                      <ul>
                        {recipeResult.ingredients?.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4>Хийх арга</h4>
                      <ol>
                        {recipeResult.method?.map((item) => <li key={item}>{item}</li>)}
                      </ol>
                    </div>
                  </div>
                  {recipeResult.tips?.length > 0 && (
                    <p className="muted">Зөвлөгөө: {recipeResult.tips.join(' ')}</p>
                  )}
                  {recipeResult.nutritionNote && <p className="muted">{recipeResult.nutritionNote}</p>}
                </article>
              )}
            </div>
          </div>
        </section>

        <section id="assistant" className="section">
          <div className="container assistant-layout">
            <div>
              <p className="eyebrow">Санаа авах</p>
              <h2>Хоолны туслахаас асуу</h2>
              <p className="muted">Орц, амт, нөхцөлөө бичвэл санал болгоно.</p>
            </div>
            <div className="assistant-box">
              <textarea rows="4" placeholder="Жишээ: Өнөөдөр халуун шөл идмээр байна" value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} />
              <button className="btn btn-primary" type="button" onClick={askAssistant}>Асуух</button>
              <p className="assistant-response">{aiResponse}</p>
            </div>
          </div>
        </section>

        <section id="booking" className="section">
          <div className="container booking-layout">
            <div>
              <p className="eyebrow">Ширээ захиалах</p>
              <h2>Оройн хоолны ширээгээ хадгал.</h2>
              <p className="muted">Захиалгын хүсэлт локал байдлаар баталгаажна.</p>
            </div>
            <form className="booking-form" onSubmit={submitBooking}>
              <input name="name" type="text" placeholder="Нэр" required />
              <input name="date" type="date" required />
              <select name="guests">
                <option>2 хүн</option>
                <option>4 хүн</option>
                <option>6 хүн</option>
                <option>8+ хүн</option>
              </select>
              <button className="btn btn-secondary" type="submit">Ширээ захиалах</button>
              <p className="form-message" aria-live="polite">{bookingMessage}</p>
            </form>
          </div>
        </section>
      </main>

      {activeRestaurant && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setActiveRestaurant(null)}>
          <section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-header">
              <h2 id="dialog-title">{activeRestaurant.name}</h2>
              <button type="button" aria-label="Хаах" onClick={() => setActiveRestaurant(null)}>×</button>
            </div>
            <div className="reviews-list">
              {reviewStatus && <p className="muted">{reviewStatus}</p>}
              {!reviewStatus && reviews.length === 0 && <p className="muted">Одоогоор сэтгэгдэл алга.</p>}
              {reviews.map((review) => (
                <article key={review.id}>
                  <strong>{review.userDisplayName}</strong>
                  <span>{stars((review.tasteRating + review.hygieneRating + review.serviceRating) / 3)}</span>
                  <p>{review.comment}</p>
                </article>
              ))}
            </div>
            <form className="review-form" onSubmit={submitReview}>
              <input name="userDisplayName" type="text" placeholder="Таны нэр" required />
              <div className="rating-row">
                <label>Амт <input name="tasteRating" type="number" min="1" max="5" defaultValue="5" required /></label>
                <label>Цэвэр <input name="hygieneRating" type="number" min="1" max="5" defaultValue="5" required /></label>
                <label>Үйлчилгээ <input name="serviceRating" type="number" min="1" max="5" defaultValue="5" required /></label>
              </div>
              <textarea name="comment" rows="3" placeholder="Сэтгэгдэл" required />
              <button className="btn btn-primary" type="submit">Сэтгэгдэл үлдээх</button>
            </form>
          </section>
        </div>
      )}

      {priceNoticeOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPriceNoticeOpen(false)}>
          <section className="price-dialog" role="dialog" aria-modal="true" aria-labelledby="price-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-header">
              <h2 id="price-dialog-title">Одоогийн байдлаар үнэ</h2>
              <button type="button" aria-label="Хаах" onClick={() => setPriceNoticeOpen(false)}>×</button>
            </div>
            <div className="price-dialog-body">
              <p>
                Апп дээр харагдаж буй үнэ нь одоогийн байдлаар оруулсан мэдээлэл. Ресторан, меню, хүргэлтийн нөхцөлөөс шалтгаалж бодит төлөх үнэ өөрчлөгдөж болно.
              </p>
              <ul>
                <li>Сагсны нийт дүн нь апп доторх тооцоолол.</li>
                <li>Эцсийн үнэ ресторан эсвэл захиалга баталгаажуулах үед дахин шалгагдана.</li>
                <li>Меню шинэчлэх үед `last_checked_at` талбар нэмээд үнээ баталгаажуулж хадгална.</li>
              </ul>
              <button className="btn btn-primary" type="button" onClick={() => setPriceNoticeOpen(false)}>Ойлголоо</button>
            </div>
          </section>
        </div>
      )}

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
