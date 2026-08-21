'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function TestPage() {
  const [state, setState] = useState({
    loading: true,
    health: null,
    restaurants: [],
    orders: [],
    error: ''
  });

  useEffect(() => {
    async function load() {
      try {
        const [healthResponse, restaurantsResponse, ordersResponse] = await Promise.all([
          fetch(`${API_BASE}/health`),
          fetch(`${API_BASE}/api/restaurants`),
          fetch(`${API_BASE}/api/orders`)
        ]);

        if (!healthResponse.ok || !restaurantsResponse.ok || !ordersResponse.ok) {
          throw new Error('API response амжилтгүй байна.');
        }

        setState({
          loading: false,
          health: await healthResponse.json(),
          restaurants: await restaurantsResponse.json(),
          orders: await ordersResponse.json(),
          error: ''
        });
      } catch (error) {
        setState({
          loading: false,
          health: null,
          restaurants: [],
          orders: [],
          error: error.message
        });
      }
    }

    load();
  }, []);

  return (
    <main className="test-page">
      <section className="test-shell">
        <div className="test-header">
          <div>
            <p className="eyebrow">System test</p>
            <h1>Амттай аппын шалгах хуудас</h1>
            <p className="muted">Frontend, backend, PostgreSQL холболтын хурдан төлөв.</p>
          </div>
          <a className="btn btn-primary" href="/">Апп руу буцах</a>
        </div>

        {state.loading && <p className="test-status">Шалгаж байна...</p>}
        {state.error && <p className="test-status error">Алдаа: {state.error}</p>}

        {!state.loading && !state.error && (
          <>
            <div className="test-grid">
              <article>
                <span>Backend</span>
                <strong>{state.health?.status === 'ok' ? 'OK' : 'Алдаа'}</strong>
                <p>{API_BASE}</p>
              </article>
              <article>
                <span>Storage</span>
                <strong>{state.health?.storage}</strong>
                <p>PostgreSQL бол зөв холбогдсон гэсэн үг.</p>
              </article>
              <article>
                <span>Restaurants</span>
                <strong>{state.restaurants.length}</strong>
                <p>API-аас уншигдсан ресторан.</p>
              </article>
              <article>
                <span>Orders</span>
                <strong>{state.orders.length}</strong>
                <p>PostgreSQL-д хадгалагдсан захиалга.</p>
              </article>
            </div>

            <div className="test-list">
              <h2>Рестораны өгөгдөл</h2>
              {state.restaurants.slice(0, 5).map((restaurant) => (
                <div key={restaurant.id}>
                  <strong>{restaurant.name}</strong>
                  <span>{restaurant.category} · {Number(restaurant.avgOverall).toFixed(1)} ★</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
