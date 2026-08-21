'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

function formatDistance(value) {
  if (!Number.isFinite(Number(value))) return '';
  return Number(value) < 1 ? `${Math.round(Number(value) * 1000)} м` : `${Number(value).toFixed(1)} км`;
}

function compactAddress(item) {
  return [item.district || item.region, item.address || item.season].filter(Boolean).join(' · ');
}

export default function LocationFinder({ type = 'all', title = 'Ойролцоох санал' }) {
  const [radiusKm, setRadiusKm] = useState(type === 'destinations' ? 500 : 25);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [nearby, setNearby] = useState({ restaurants: [], destinations: [] });

  const hasResults = nearby.restaurants.length > 0 || nearby.destinations.length > 0;
  async function locate() {
    if (!window.isSecureContext) {
      setStatus('Mobile дээр location ашиглахын тулд HTTPS хэрэгтэй.');
      return;
    }
    if (!navigator.geolocation) {
      setStatus('Таны browser location service дэмжихгүй байна.');
      return;
    }

    setLoading(true);
    setStatus('Байршил авч байна...');

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 300000
        });
      });
      const { latitude, longitude } = position.coords;
      const response = await fetch(
        `${API_BASE}/api/location/nearby?lat=${latitude}&lng=${longitude}&radiusKm=${radiusKm}&type=${type}`
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Байршил шалгахад алдаа гарлаа.');
      }

      setNearby(payload);
      setStatus(`${payload.restaurants.length + payload.destinations.length} санал олдлоо.`);
    } catch (error) {
      setStatus(error.code === 1 ? 'Location зөвшөөрөл өгөөгүй байна.' : error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="location-panel" aria-label={title}>
      <div className="location-head">
        <div>
          <p className="eyebrow">Location service</p>
          <h2>{title}</h2>
        </div>
        <label className="radius-control">
          <span>Радиус</span>
          <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
            <option value="10">10 км</option>
            <option value="25">25 км</option>
            <option value="50">50 км</option>
            <option value="500">500 км</option>
            <option value="5000">Бүгд</option>
          </select>
        </label>
      </div>

      <div className="location-actions">
        <button className="btn btn-secondary" type="button" onClick={locate} disabled={loading}>
          {loading ? 'Шалгаж байна...' : 'Байршил ашиглах'}
        </button>
        <p className="form-message" aria-live="polite">{status}</p>
      </div>

      {hasResults && (
        <div className="location-results">
          {nearby.restaurants.map((restaurant) => (
            <article className="location-result" key={`restaurant-${restaurant.id}`}>
              <span>{formatDistance(restaurant.distanceKm)}</span>
              <div>
                <strong>{restaurant.name}</strong>
                <small>{compactAddress(restaurant)}</small>
              </div>
            </article>
          ))}
          {nearby.destinations.map((destination) => (
            <article className="location-result" key={`destination-${destination.id}`}>
              <span>{formatDistance(destination.distanceKm)}</span>
              <div>
                <strong>{destination.name}</strong>
                <small>{compactAddress(destination)}</small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
