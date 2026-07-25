/**
 * Единый источник правды по контактам, навигации и общим данным сайта.
 * Все тексты взяты дословно с santorinivip.com (снято 2026-07-25).
 * Источник: docs/harvest/verbatim-content.md
 */

export const SITE_URL = 'https://santorinigid.com';
export const SITE_NAME = 'Гид на Санторини — Владимир';

export const CONTACTS = {
  phone: '+30 6946800255',
  phoneHref: 'tel:+306946800255',
  email: 'santorinivip@gmail.com',
  emailHref: 'mailto:santorinivip@gmail.com',
  telegram: 'https://t.me/SANTORINI_VLADIMIR',
  telegramHandle: '@SANTORINI_VLADIMIR',
  instagram: 'https://www.instagram.com/vova_gid_santorini/?hl=ru',
  instagramHandle: '@vova_gid_santorini',
  messengers: 'Viber, WhatsApp, Telegram',
} as const;

/** Готовые ссылки WhatsApp с предзаполненным текстом (как на исходном сайте). */
const WA_BASE = 'https://wa.me/306946800255?text=';
export const WHATSAPP = {
  tour: WA_BASE + encodeURIComponent('Здравствуйте, Владимир! Хочу узнать подробнее об индивидуальной экскурсии.'),
  yacht: WA_BASE + encodeURIComponent('Здравствуйте, Владимир! Хочу узнать подробнее про аренду яхты.'),
  helicopter: WA_BASE + encodeURIComponent('Здравствуйте, Владимир! Хочу узнать подробнее про аренду вертолёта'),
  hotel: WA_BASE + encodeURIComponent('Здравствуйте, Владимир! Хочу узнать подробнее про отели на Санторини.'),
  general: WA_BASE + encodeURIComponent('Здравствуйте, Владимир!'),
} as const;

/** Внешние ссылки-партнёры (сохранены с исходного сайта). */
export const EXTERNAL = {
  ferries: 'https://www.ferries.gr/ru/',
  flyingDress: 'https://sunnyflyingdress.com',
} as const;

/** Навигация. URL сохранены 1:1 с сайтом на Wix ради SEO-истории. */
export const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/tours', label: 'Экскурсии' },
  { href: '/santorini', label: 'О Санторини' },
  { href: '/about', label: 'Обо мне' },
  {
    href: '/vip-service',
    label: 'VIP услуги',
    children: [
      { href: '/vip-service/yacht-rent-santorini', label: 'Аренда яхт' },
      { href: '/vip-service/helicopter-tours', label: 'Вертолётные туры' },
      { href: '/vip-service/santorini-hotels-2026', label: 'Отели' },
    ],
  },
  { href: '/contacts', label: 'Контакты' },
] as const;

export const FOOTER_NAV = [
  { href: '/', label: 'Главная' },
  { href: '/tours', label: 'Экскурсии' },
  { href: '/santorini', label: 'О Санторини' },
  { href: '/about', label: 'Обо мне' },
  { href: '/vip-service', label: 'VIP услуги' },
  { href: '/vip-service/santorini-hotels-2026', label: 'Отели' },
  { href: '/vip-service/yacht-rent-santorini', label: 'Яхты' },
  { href: '/vip-service/helicopter-tours', label: 'Вертолёты' },
  { href: '/contacts', label: 'Контакты' },
] as const;

export const COPYRIGHT = '© 2026 Все права защищены.';
