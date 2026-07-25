/**
 * Локальный сервер для просмотра сайта с телефона.
 *
 * Зачем: телефон и компьютер в одной Wi-Fi сети, поэтому сайт можно
 * открыть на телефоне по адресу компьютера — без публикации в интернет.
 *
 * Запуск:  node preview-server.cjs
 * Остановка: Ctrl+C
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, 'dist');
const PORT = 4600;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

if (!fs.existsSync(ROOT)) {
  console.error('Папки dist нет. Сначала соберите сайт: npm run build');
  process.exit(1);
}

http
  .createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, url);

    if (url === '/' || url === '') {
      file = path.join(ROOT, 'index.html');
    } else if (!path.extname(file)) {
      // Красивые адреса без .html
      const asHtml = file + '.html';
      file = fs.existsSync(asHtml) ? asHtml : path.join(file, 'index.html');
    }

    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const notFound = path.join(ROOT, '404.html');
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Страница не найдена');
    }

    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, '0.0.0.0', () => {
    // Показываем все адреса, по которым сайт доступен
    const nets = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) addresses.push(net.address);
      }
    }

    console.log('');
    console.log('  Сайт запущен. Откройте на телефоне:');
    console.log('');
    addresses.forEach((ip) => console.log('    http://' + ip + ':' + PORT));
    console.log('');
    console.log('  На этом компьютере:  http://localhost:' + PORT);
    console.log('');
    console.log('  Телефон должен быть в той же сети Wi-Fi.');
    console.log('  Остановить: Ctrl+C');
    console.log('');
  });
