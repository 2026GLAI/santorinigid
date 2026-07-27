/**
 * Единый источник правды по контактам, навигации и общим данным сайта.
 * Все тексты взяты дословно с santorinivip.com (снято 2026-07-25).
 * Источник: docs/harvest/verbatim-content.md
 */

export const SITE_URL = 'https://santorinigid.com';
export const SITE_NAME = 'Гид на Санторини — Владимир';

/**
 * Полное имя владельца — подтверждено на площадках-партнёрах:
 * Tourister.ru и NeedGuide («Русский гид на Санторини Владимир Лунгу»).
 * Нужно поисковикам и ИИ, чтобы связать сайт, профили и отзывы в одну личность.
 */
export const OWNER_FULL_NAME = 'Владимир Лунгу';

/**
 * Стаж считаем от года, а не пишем цифру руками.
 *
 * Почему так: если вписать «31 год» текстом, через год цифра станет неверной,
 * и никто об этом не вспомнит. Здесь она пересчитывается при каждой сборке
 * сайта — всегда актуальна.
 *
 * Данные подтверждены владельцем 2026-07-25:
 *  • на острове с 1995 года;
 *  • гидом работает около 14 лет (совпадает с «опыт работы с 2012 года»
 *    в профиле NeedGuide).
 */
export const ON_ISLAND_SINCE = 1995;
export const GUIDE_SINCE = 2012;

const CURRENT_YEAR = new Date().getFullYear();

const YEARS_ON_ISLAND = CURRENT_YEAR - ON_ISLAND_SINCE;
const YEARS_AS_GUIDE = CURRENT_YEAR - GUIDE_SINCE;

/**
 * Склонение: 31 год / 32 года / 35 лет.
 * Нужно, чтобы фразы на сайте звучали по-русски правильно при любом числе.
 */
function yearsWord(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'лет';
  if (mod10 === 1) return 'год';
  if (mod10 >= 2 && mod10 <= 4) return 'года';
  return 'лет';
}

/** Готовые строки: «31 год», «14 лет». */
export const ISLAND_YEARS_TEXT = `${YEARS_ON_ISLAND} ${yearsWord(YEARS_ON_ISLAND)}`;
export const GUIDE_YEARS_TEXT = `${YEARS_AS_GUIDE} ${yearsWord(YEARS_AS_GUIDE)}`;

/**
 * Профили на площадках-партнёрах. Идут в JSON-LD (sameAs) — это помогает
 * поисковикам понять, что сайт, профили и отзывы относятся к одному человеку.
 */
export const PROFILES = [
  'https://vladimir-santorini.tourister.ru',
  'https://needguide.ru/view_guide.php?user_id=1230',
  'https://t.me/SANTORINI_VLADIMIR',
  'https://www.instagram.com/vova_gid_santorini/',
  'https://www.santorinivip.com/',
] as const;

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
  { href: '/reviews', label: 'Отзывы' },
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
  { href: '/reviews', label: 'Отзывы' },
  { href: '/vip-service', label: 'VIP услуги' },
  { href: '/vip-service/santorini-hotels-2026', label: 'Отели' },
  { href: '/vip-service/yacht-rent-santorini', label: 'Яхты' },
  { href: '/vip-service/helicopter-tours', label: 'Вертолёты' },
  { href: '/contacts', label: 'Контакты' },
] as const;

/**
 * Год берётся при сборке, а не вписан цифрой: 1 января в подвале на всех
 * страницах стоял бы прошлый год. Та же причина, что и у стажа выше.
 */
export const COPYRIGHT = `© ${CURRENT_YEAR} Все права защищены.`;
