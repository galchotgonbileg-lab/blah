import LocationFinder from '../components/LocationFinder';
import SocialBar from '../components/SocialBar';
import ThemeToggle from '../components/ThemeToggle';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

async function loadDestinations() {
  try {
    const response = await fetch(`${API_BASE}/api/tourism/destinations`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch {
    return {
      status: 'planned',
      destinations: []
    };
  }
}

export default async function TourismPage() {
  const data = await loadDestinations();

  return (
    <main className="tourism-page">
      <section className="tourism-shell">
        <div className="tourism-hero">
          <div>
            <p className="eyebrow">Дараагийн салбар</p>
            <h1>Аяллын модуль</h1>
            <p className="lead">
              Энэ хэсэг нь дараа нь үзэх газар, маршрут, тур багц, ойролцоох хоолны саналыг нэг урсгалд холбохоор бэлдсэн skeleton page.
            </p>
          </div>
          <div className="page-actions">
            <a className="btn btn-secondary" href="/">Хоолны апп руу буцах</a>
            <ThemeToggle />
          </div>
        </div>

        <LocationFinder type="destinations" title="Ойролцоох аяллын газар" />

        <div className="tourism-grid">
          {data.destinations.map((destination) => (
            <article className="tourism-card" key={destination.id}>
              <p className="eyebrow">{destination.type}</p>
              <h2>{destination.name}</h2>
              <p>{destination.region} · {destination.season}</p>
              <div className="tourism-tags">
                {destination.highlights.map((highlight) => (
                  <span key={highlight}>{highlight}</span>
                ))}
              </div>
              <SocialBar resourceType="destination" resourceId={destination.id} />
              <strong>{destination.suggestedDurationHours} цагийн санал</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
