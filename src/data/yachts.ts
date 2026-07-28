/**
 * Флот — 8 судов. Тексты и цены сняты дословно с живой страницы
 * /vip-service/yacht-rent-santorini 2026-07-25.
 * Источник: docs/harvest/verbatim-content.md
 *
 * ВАЖНО: цены проверены на дату снятия. Перед публикацией подтвердить
 * актуальность на сезон 2026 у владельца.
 */

export interface YachtPrices {
  /** Дневной тур, 5 часов */
  day: number;
  /** Вечерний с закатом, 5 часов */
  sunset: number;
  /** Весь день, 10 часов */
  full: number;
}

export interface Yacht {
  slug: string;
  name: string;
  description: string;
  image: string;
  low: YachtPrices;
  high: YachtPrices;
  /** Подтверждённая вместимость — только там, где она указана на сайте. */
  guests?: number;
  badge?: string;
}

export const YACHTS: Yacht[] = [
  {
    slug: 'nautitech-46-fly',
    name: 'Nautitech 46 Fly «IQ»',
    description:
      'Самый просторный катамаран в своём классе с уникальным флайбриджем (верхней палубой). Создан для больших компаний до 24 человек, ценящих панорамные виды и комфорт уровня Luxury.',
    image: 'yacht-nautitech-46.jpg',
    guests: 24,
    low: { day: 1400, sunset: 1500, full: 2800 },
    high: { day: 1800, sunset: 2000, full: 3600 },
  },
  {
    slug: 'lagoon-46-the-one',
    name: 'Lagoon 46 «The One»',
    description:
      'Сочетание роскошного дизайна и максимального пространства. Для тех, кто ищет комфорт 5-звёздочного отеля в открытом море.',
    image: 'yacht-lagoon-46.jpg',
    low: { day: 1300, sunset: 1400, full: 2500 },
    high: { day: 1800, sunset: 1900, full: 3500 },
  },
  {
    slug: 'targa-46-escape',
    name: 'Targa 46 «Escape»',
    description:
      'Легендарный «морской внедорожник» для тех, кто ценит время и эксклюзивность. Мощная, манёвренная и невероятно комфортная яхта. Создана для индивидуальных маршрутов и доступа к самым потаённым пляжам Санторини, куда не зайдут большие суда.',
    image: 'yacht-targa-46.jpg',
    low: { day: 1600, sunset: 1700, full: 3200 },
    high: { day: 2200, sunset: 2300, full: 4400 },
  },
  {
    slug: 'excess-11',
    name: 'Excess 11',
    badge: 'Brand New',
    description:
      'Абсолютная новинка флота. Excess 11 — это сочетание спортивного азарта и домашнего комфорта. Для тех, кто хочет почувствовать настоящий драйв под парусами на фоне Кальдеры.',
    image: 'yacht-excess-11.jpg',
    low: { day: 1200, sunset: 1300, full: 2400 },
    high: { day: 1500, sunset: 1600, full: 3000 },
  },
  {
    slug: 'lagoon-42',
    name: 'Lagoon 42',
    description:
      'Золотой стандарт комфорта на Санторини. Просторный флайбридж, уютные каюты и великолепная устойчивость. Одинаково хорош и для семейного отдыха, и для шумной компании друзей.',
    image: 'yacht-lagoon-42.avif',
    low: { day: 1200, sunset: 1300, full: 2400 },
    high: { day: 1500, sunset: 1600, full: 3000 },
  },
  {
    slug: 'fountaine-pajot-isla-40',
    name: 'Fountaine Pajot Isla 40',
    description:
      'Воплощение французского стиля и инноваций. Этот катамаран отличается невероятной освещённостью салона и плавностью хода. Создан для романтических круизов на закате.',
    image: 'yacht-fountaine-pajot.jpg',
    low: { day: 1200, sunset: 1300, full: 2400 },
    high: { day: 1500, sunset: 1600, full: 3000 },
  },
  {
    slug: 'tesoro-t40',
    name: 'Tesoro T40',
    description:
      'Испанская эстетика и мощь. Эта яхта сочетает в себе элегантность и невероятную скорость (до 46 узлов). Для тех, кто хочет быстро и с максимальным комфортом добираться до любых пляжей Санторини.',
    image: 'yacht-tesoro-t40.jpg',
    low: { day: 1800, sunset: 1900, full: 3600 },
    high: { day: 2200, sunset: 2300, full: 4400 },
  },
  {
    slug: 'black-swan',
    name: 'Black Swan',
    description:
      'Чёрный лебедь Эгейского моря. Мощный двигатель в 450 л.с. и спортивный характер. Лучший выбор для приватных прогулок, доступ к пещерам в районе Белого и Красного пляжей.',
    image: 'yacht-black-swan.jpg',
    low: { day: 1500, sunset: 1600, full: 3000 },
    high: { day: 1800, sunset: 1900, full: 3600 },
  },
];

/** Стандартные программы выхода в море (тексты дословно с сайта). */
export const YACHT_PROGRAMS = [
  {
    title: 'Дневной круиз',
    time: '10:00 – 15:00',
    text: 'Лучшее время для купания и снорклинга: вода максимально прозрачная.',
    image: 'svc-yacht-aerial.webp',
  },
  {
    title: 'Круиз на закате',
    time: '15:30 – после заката',
    text: 'Самый романтичный формат. Ужин на борту и встреча заката прямо под скалами Ии.',
    image: 'yacht-sunset-sail.webp',
  },
  {
    title: 'Full Day',
    time: '10+ часов',
    text: 'Индивидуальный маршрут на весь день, включая поездку к острову Анафи или Иос.',
    image: 'yacht-sunset-deck.jpg',
  },
] as const;

/** Что включено в стоимость (тексты дословно с сайта, фото — оттуда же). */
export const YACHT_INCLUDED = [
  {
    title: 'Трансфер',
    text: 'Заберём из отеля и привезём обратно.',
    image: 'yacht-incl-transfer.jpg',
  },
  {
    title: 'Open Bar',
    text: 'Охлажденное белое вино, пиво и прохладительные напитки без ограничений.',
    image: 'yacht-incl-bar.jpg',
  },
  {
    title: 'Обед/ужин',
    text: 'Традиционные греческие блюда, приготовленные прямо на борту.',
    image: 'yacht-incl-lunch.jpg',
  },
  {
    title: 'Снорклинг',
    text: 'Маски, ласты и полотенца уже ждут вас.',
    image: 'yacht-incl-snorkel.jpg',
  },
] as const;
