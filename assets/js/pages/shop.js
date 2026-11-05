/* LATERIA · Демонстрационный магазин — фильтры, подробности, корзина.
   Корзина хранится в localStorage этого браузера. Оплата не подключена. */
(function () {
  'use strict';
  const L = window.LATERIA;
  const { db, fmt, esc, heraldry } = L;
  const { categories, items } = db.shop;

  const grid = document.getElementById('products');
  const catEl = document.getElementById('cat-filter');
  const sortEl = document.getElementById('sort');
  const countEl = document.getElementById('result-count');
  const cartCount = document.getElementById('cart-count');
  const itemModal = document.getElementById('item-modal');
  const cartModal = document.getElementById('cart-modal');

  const view = { cat: 'all', sort: 'default' };
  const initialCat = L.url.get('category');
  if (categories[initialCat]) view.cat = initialCat;

  /* ---------- корзина */
  const KEY = 'lateria-demo-cart';
  const cart = {
    ids: (() => {
      try { return (JSON.parse(localStorage.getItem(KEY)) || []).filter(id => db.item(id)); }
      catch (e) { return []; }
    })(),
    has(id) { return this.ids.includes(id); },
    toggle(id) { this.has(id) ? this.remove(id) : this.add(id); },
    add(id) { if (!this.has(id)) { this.ids.push(id); this.save(); L.toast(`«${db.item(id).title}» добавлено в корзину`); } },
    remove(id) { this.ids = this.ids.filter(x => x !== id); this.save(); },
    clear() { this.ids = []; this.save(); },
    total() { return this.ids.reduce((s, id) => s + db.item(id).price, 0); },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.ids)); } catch (e) { /* приватный режим */ }
      sync();
    }
  };

  function sync() {
    cartCount.textContent = cart.ids.length;
    document.getElementById('cart-open').setAttribute('aria-label', `Корзина: ${cart.ids.length} ${fmt.plural(cart.ids.length, 'товар', 'товара', 'товаров')}`);
    grid.querySelectorAll('[data-add]').forEach(btn => {
      const inCart = cart.has(btn.dataset.add);
      btn.textContent = inCart ? 'В корзине' : 'В корзину';
      btn.setAttribute('aria-pressed', String(inCart));
      btn.classList.toggle('btn--primary', !inCart);
      btn.classList.toggle('btn--ghost', inCart);
    });
    if (cartModal.open) renderCart();
    if (itemModal.open && itemModal.dataset.item) renderItemFoot(itemModal.dataset.item);
  }

  /* ---------- фильтры */
  const counts = items.reduce((m, i) => (m[i.category] = (m[i.category] || 0) + 1, m), {});
  catEl.innerHTML = [['all', 'Все товары', items.length], ...Object.entries(categories).map(([k, c]) => [k, c.label, counts[k] || 0])]
    .map(([k, label, n]) => `<button type="button" class="chip" data-cat="${k}" aria-pressed="${view.cat === k}">${esc(label)} <span class="chip__count">${n}</span></button>`)
    .join('');

  catEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    view.cat = btn.dataset.cat;
    catEl.querySelectorAll('[data-cat]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    L.url.set('category', view.cat === 'all' ? null : view.cat);
    render();
  });
  sortEl.addEventListener('change', () => { view.sort = sortEl.value; render(); });

  /* ---------- карточки */
  /* Иллюстрации: assets/img/shop/<id>.svg для всех категорий, кроме привилегий
     (у них — символические иконки). Путь можно переопределить полем image в data.js. */
  const imageOf = i => i.image || (i.category !== 'privileges' ? `assets/img/shop/${i.id}.svg` : null);
  const art = (i, cls = '') => {
    const img = imageOf(i);
    const badge = i.badge ? `<span class="tag tag--accent product__badge">${esc(i.badge)}</span>` : '';
    return img
      ? `<div class="product__art product__art--image ${cls}"><img src="${img}" alt="${esc(i.title)}" width="400" height="260" loading="lazy" decoding="async">${badge}</div>`
      : `<div class="product__art ${cls}" style="--tone:${i.tone}">${heraldry.icon(i.icon)}${badge}</div>`;
  };
  const price = i => `<span class="price num">${fmt.rub(i.price)}${i.period ? `<small>/ ${esc(i.period)}</small>` : ''}</span>`;

  function render() {
    let list = items.filter(i => view.cat === 'all' || i.category === view.cat);
    if (view.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (view.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    countEl.textContent = `${list.length} ${fmt.plural(list.length, 'товар', 'товара', 'товаров')}`;
    grid.innerHTML = list.map(i => `
      <article class="card card--interactive product">
        ${art(i)}
        <div class="product__body">
          <p class="product__cat">${esc(categories[i.category].label)}</p>
          <h3>${esc(i.title)}</h3>
          <p>${esc(i.summary)}</p>
          <div class="product__foot">
            ${price(i)}
            <div class="product__actions">
              <button class="btn btn--ghost btn--sm" type="button" data-details="${i.id}">Подробнее<span class="visually-hidden">: ${esc(i.title)}</span></button>
              <button class="btn btn--primary btn--sm" type="button" data-add="${i.id}" aria-pressed="false">В корзину</button>
            </div>
          </div>
        </div>
      </article>`).join('');
    sync();
  }

  grid.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { cart.toggle(add.dataset.add); return; }
    const det = e.target.closest('[data-details]');
    if (det) openItem(det.dataset.details, det);
  });

  /* ---------- подробности товара */
  function renderItemFoot(id) {
    const foot = itemModal.querySelector('[data-item-foot]');
    if (!foot) return;
    const inCart = cart.has(id);
    foot.innerHTML = `
      <button class="btn btn--ghost" type="button" data-close>Закрыть</button>
      ${inCart
        ? `<button class="btn btn--ghost" type="button" data-modal-remove="${id}">Убрать из корзины</button>
           <button class="btn btn--primary" type="button" data-go-cart>Перейти в корзину</button>`
        : `<button class="btn btn--primary" type="button" data-modal-add="${id}">Добавить в корзину · ${fmt.rub(db.item(id).price)}</button>`}`;
  }

  function openItem(id, opener) {
    const i = db.item(id);
    if (!i) return;
    itemModal.dataset.item = id;
    L.modal.open(itemModal, `
      <button class="modal__close" type="button" data-close aria-label="Закрыть">×</button>
      ${art(i, 'product-modal__art')}
      <header class="modal__head">
        <p class="product__cat">${esc(categories[i.category].label)}</p>
        <h2 id="item-modal-title" style="margin:.4rem 0 .8rem">${esc(i.title)}</h2>
        ${price(i)}
      </header>
      <div class="modal__body">
        <p class="muted">${esc(i.summary)}</p>
        <div><h3>Что входит</h3><ul class="perks">${i.perks.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
        <p class="notice"><span><strong>Без влияния на баланс.</strong> Товар не меняет урон, защиту, скорость и добычу ресурсов${i.category === 'effects' ? ' и отключается в PvP-зонах' : ''}.</span></p>
      </div>
      <footer class="modal__foot" data-item-foot></footer>`, { opener, onClose: () => { delete itemModal.dataset.item; } });
    renderItemFoot(id);
  }

  itemModal.addEventListener('click', e => {
    const add = e.target.closest('[data-modal-add]');
    if (add) { cart.add(add.dataset.modalAdd); itemModal.querySelector('[data-modal-remove], [data-go-cart]')?.focus(); return; }
    const rem = e.target.closest('[data-modal-remove]');
    if (rem) { cart.remove(rem.dataset.modalRemove); itemModal.querySelector('[data-modal-add]')?.focus(); return; }
    if (e.target.closest('[data-go-cart]')) { itemModal.close(); openCart(document.getElementById('cart-open')); }
  });

  /* ---------- корзина */
  function renderCart(done) {
    const body = cartModal.querySelector('[data-modal-body]');
    const head = `<button class="modal__close" type="button" data-close aria-label="Закрыть">×</button>
      <header class="modal__head"><h2 id="cart-modal-title">Корзина</h2></header>`;
    if (done) {
      body.innerHTML = head + `
        <div class="modal__body">
          <p class="notice notice--accent"><span><strong>Заказ не создан.</strong> Это демонстрационный магазин: платёжная система не подключена, деньги не списываются, товары не выдаются.</span></p>
          <p class="muted">В реальном проекте здесь была бы переадресация на страницу оплаты.</p>
        </div>
        <footer class="modal__foot">
          <button class="btn btn--ghost" type="button" data-cart-clear>Очистить корзину</button>
          <button class="btn btn--primary" type="button" data-close>Понятно</button>
        </footer>`;
      return;
    }
    if (!cart.ids.length) {
      body.innerHTML = head + `
        <div class="modal__body"><div class="empty"><h3>Корзина пуста</h3><p>Выберите товары в каталоге.</p></div></div>
        <footer class="modal__foot"><button class="btn btn--primary" type="button" data-close>К каталогу</button></footer>`;
      return;
    }
    body.innerHTML = head + `
      <div class="modal__body">
        <ul class="cart-list">${cart.ids.map(id => {
          const i = db.item(id);
          return `<li class="cart-row">
            <span class="cart-row__icon" style="color:${i.tone}">${imageOf(i) ? `<img src="${imageOf(i)}" alt="" width="48" height="48">` : heraldry.icon(i.icon)}</span>
            <span><strong>${esc(i.title)}</strong><small>${esc(categories[i.category].label)}${i.period ? ' · ' + esc(i.period) : ''}</small></span>
            <span class="price num cart-row__price" style="font-size:1.15rem">${fmt.rub(i.price)}</span>
            <button class="btn btn--ghost btn--sm" type="button" data-cart-remove="${id}" aria-label="Убрать «${esc(i.title)}» из корзины">×</button>
          </li>`;
        }).join('')}</ul>
        <div class="cart-total"><span>Итого (демо)</span><strong class="num">${fmt.rub(cart.total())}</strong></div>
        <p class="muted" style="font-size:.86rem">Покупки не выполняются: оформление заказа только демонстрирует сценарий.</p>
      </div>
      <footer class="modal__foot">
        <button class="btn btn--ghost" type="button" data-cart-clear>Очистить</button>
        <button class="btn btn--primary" type="button" data-checkout>Оформить заказ (демо)</button>
      </footer>`;
  }

  function openCart(opener) {
    L.modal.open(cartModal, null, { opener });
    renderCart();
    cartModal.querySelector('.modal__close').focus();
  }

  document.getElementById('cart-open').addEventListener('click', e => openCart(e.currentTarget));

  cartModal.addEventListener('click', e => {
    const rem = e.target.closest('[data-cart-remove]');
    if (rem) { cart.remove(rem.dataset.cartRemove); cartModal.querySelector('[data-cart-remove], .modal__close').focus(); return; }
    if (e.target.closest('[data-cart-clear]')) { cart.clear(); L.toast('Корзина очищена'); cartModal.querySelector('.modal__close').focus(); return; }
    if (e.target.closest('[data-checkout]')) { renderCart(true); cartModal.querySelector('[data-close].btn').focus(); }
  });

  render();
})();
