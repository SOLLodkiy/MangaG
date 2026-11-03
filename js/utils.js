// Общие вспомогательные функции
const Utils = {
  // Экранирование HTML — обязательно для всего, что ввёл пользователь
  esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // "Ван-Пис: Начало" -> "van-pis-nachalo"
  slugify(text) {
    const map = {
      а: 'a',
      б: 'b',
      в: 'v',
      г: 'g',
      д: 'd',
      е: 'e',
      ё: 'e',
      ж: 'zh',
      з: 'z',
      и: 'i',
      й: 'y',
      к: 'k',
      л: 'l',
      м: 'm',
      н: 'n',
      о: 'o',
      п: 'p',
      р: 'r',
      с: 's',
      т: 't',
      у: 'u',
      ф: 'f',
      х: 'h',
      ц: 'ts',
      ч: 'ch',
      ш: 'sh',
      щ: 'sch',
      ъ: '',
      ы: 'y',
      ь: '',
      э: 'e',
      ю: 'yu',
      я: 'ya',
    };
    const slug = String(text)
      .toLowerCase()
      .split('')
      .map((ch) => (ch in map ? map[ch] : ch))
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    if (!slug) return 'title';
    return /^\d+$/.test(slug) ? `title-${slug}` : slug;
  },

  formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  },

  timeAgo(value) {
    const diff = (Date.now() - new Date(value).getTime()) / 1000;
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн. назад`;
    return Utils.formatDate(value);
  },

  // 1, 'глава', 'главы', 'глав' -> "1 глава"
  plural(n, one, few, many) {
    const n10 = n % 10;
    const n100 = n % 100;
    let word = many;
    if (n10 === 1 && n100 !== 11) word = one;
    else if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) word = few;
    return `${n} ${word}`;
  },

  rub(amount) {
    return `${Number(amount).toLocaleString('ru-RU')} ₽`;
  },

  formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return String(n);
  },

  // Цвет обложки-заглушки по названию
  hue(text) {
    let h = 0;
    for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
  },

  // Хеш пароля (SHA-256). Это учебный проект: данные хранятся в браузере,
  // поэтому это не настоящая защита, а просто чтобы не хранить пароль открытым текстом.
  async hashPassword(password, salt) {
    const text = `${salt}:${password}`;
    if (window.crypto && crypto.subtle) {
      const data = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    // запасной вариант для старых браузеров
    let h = 5381;
    for (const ch of text) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
    return 'djb2-' + h.toString(16);
  },

  // Проверка номера карты по алгоритму Луна
  luhn(number) {
    const digits = String(number).replace(/\D/g, '');
    if (digits.length < 13) return false;
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let d = Number(digits[digits.length - 1 - i]);
      if (i % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    return sum % 10 === 0;
  },

  // Сравнение имён файлов «по-человечески»: 2.jpg < 10.jpg
  naturalCompare(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  },

  debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  },

  // Уменьшение картинки через canvas (для аватаров и обложек)
  resizeImage(file, maxWidth, maxHeight, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Не удалось прочитать изображение'));
      };
      img.src = url;
    });
  },

  blobToDataUrl(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  },
};
