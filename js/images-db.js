// Хранилище картинок, загруженных через «Кабинет автора».
// localStorage для картинок слишком мал (~5 МБ), поэтому используем IndexedDB.
const ImagesDB = {
  _dbPromise: null,
  _urls: new Map(), // кэш object URL: ключ -> blob:...

  open() {
    if (!this._dbPromise) {
      this._dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open('mangag', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('images');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this._dbPromise;
  },

  async _run(mode, action) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', mode);
      const request = action(tx.objectStore('images'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Не хватает места для картинок'));
    });
  },

  // Сохраняет Blob и возвращает ключ
  async put(blob) {
    const key = 'img_' + Utils.uid();
    await this._run('readwrite', (store) => store.put(blob, key));
    return key;
  },

  get(key) {
    return this._run('readonly', (store) => store.get(key));
  },

  async remove(key) {
    if (!key) return;
    if (this._urls.has(key)) {
      URL.revokeObjectURL(this._urls.get(key));
      this._urls.delete(key);
    }
    await this._run('readwrite', (store) => store.delete(key));
  },

  async removeMany(keys) {
    for (const key of keys) await this.remove(key);
  },

  clear() {
    this._urls.forEach((url) => URL.revokeObjectURL(url));
    this._urls.clear();
    return this._run('readwrite', (store) => store.clear());
  },

  // Адрес картинки для <img src>
  async url(key) {
    if (this._urls.has(key)) return this._urls.get(key);
    const blob = await this.get(key);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    this._urls.set(key, url);
    return url;
  },
};
