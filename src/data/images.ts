/**
 * Реестр изображений.
 *
 * Astro должен знать обо всех картинках на этапе сборки, поэтому пути нельзя
 * собирать «на лету» через import(`...${переменная}`) — сборщик такое не видит.
 * import.meta.glob с eager:true подхватывает всю папку статически, и мы просто
 * берём нужный файл по имени.
 */
import type { ImageMetadata } from 'astro';

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/img/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

/** Карта «имя файла → метаданные картинки». */
const byName = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(modules)) {
  const name = path.split('/').pop();
  if (name) byName.set(name, mod.default);
}

/**
 * Достаёт картинку по имени файла, напр. getImage('yachts-01.jpg').
 * Если файла нет — падаем сразу на сборке, а не показываем пустоту гостям.
 */
export function getImg(fileName: string): ImageMetadata {
  const img = byName.get(fileName);
  if (!img) {
    throw new Error(
      `Изображение «${fileName}» не найдено в src/assets/img. ` +
        `Доступны: ${[...byName.keys()].join(', ')}`,
    );
  }
  return img;
}
