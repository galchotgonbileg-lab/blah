export const domainCatalog = [
  {
    id: 'food',
    name: 'Хоол',
    status: 'active',
    description: 'Ресторан, меню, захиалга, сэтгэгдэл, зурагнаас жор гаргах урсгал.',
    modules: ['restaurants', 'menus', 'orders', 'reviews', 'recipe-vision']
  },
  {
    id: 'tourism',
    name: 'Аялал',
    status: 'planned',
    description: 'Үзэх газар, маршрут, тур багц, ойролцоох хоолны саналтай аяллын урсгал.',
    modules: ['destinations', 'trip-routes', 'tour-packages', 'nearby-food']
  }
];

export const tourismStarterDestinations = [
  {
    id: 'terelj',
    name: 'Тэрэлж',
    region: 'Төв аймаг',
    type: 'байгаль',
    season: 'бүх улирал',
    highlights: ['Арьяабалын хийд', 'Мэлхий хад', 'морин аялал'],
    suggestedDurationHours: 8,
    latitude: 47.994,
    longitude: 107.471
  },
  {
    id: 'kharkhorin',
    name: 'Хархорин',
    region: 'Өвөрхангай',
    type: 'түүх',
    season: 'хавар-намар',
    highlights: ['Эрдэнэ Зуу', 'Орхоны хөндий', 'музей'],
    suggestedDurationHours: 36,
    latitude: 47.197,
    longitude: 102.823
  },
  {
    id: 'khuvsgul',
    name: 'Хөвсгөл нуур',
    region: 'Хөвсгөл',
    type: 'байгаль',
    season: 'зун-өвөл',
    highlights: ['нуурын эрэг', 'завь', 'цаатан соёл'],
    suggestedDurationHours: 72,
    latitude: 50.612,
    longitude: 100.165
  }
];

export function getDomainCatalog() {
  return domainCatalog;
}

export function getTourismStarterData() {
  return {
    status: 'planned',
    destinations: tourismStarterDestinations
  };
}
