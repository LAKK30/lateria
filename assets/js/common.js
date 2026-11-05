/* =========================================================================
   LATERIA · Общие утилиты и поведение интерфейса (все страницы)
   ========================================================================= */
(function () {
  'use strict';
  const L = window.LATERIA;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------ Форматы */
  const nf = new Intl.NumberFormat('ru-RU');
  const nf1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const compact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  L.fmt = {
    num: n => nf.format(Math.round(n)),
    dec: n => nf1.format(n),
    dec2: n => nf2.format(n),
    /* Большие числа: до 100 000 — полностью, дальше — «1,2 млн», «640,3 тыс.» */
    big: n => (Math.abs(n) >= 100000 ? compact.format(n) : nf.format(Math.round(n))),
    money: n => nf.format(n) + ' ' + L.data.world.currency.short,
    rub: n => nf.format(n) + ' ₽',
    km2: n => nf2.format(n) + ' км²',
    plural,
    date: (d, opt) => new Intl.DateTimeFormat('ru-RU', opt || { day: 'numeric', month: 'long', year: 'numeric' }).format(d instanceof Date ? d : L.db.parseDate(d)),
    time: d => new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(d),
    weekday: d => new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(d),
    duration: min => {
      const h = Math.floor(min / 60), m = min % 60;
      return [h ? `${h} ч` : '', m ? `${m} мин` : ''].filter(Boolean).join(' ');
    },
    relDays: n => {
      if (n === 0) return 'сегодня';
      if (n === 1) return 'завтра';
      if (n > 1) return `через ${n} ${plural(n, 'день', 'дня', 'дней')}`;
      const a = -n;
      return a === 1 ? 'вчера' : `${a} ${plural(a, 'день', 'дня', 'дней')} назад`;
    }
  };

  L.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);

  /* ------------------------------------------------------------ URL */
  L.url = {
    get: name => new URLSearchParams(location.search).get(name),
    set(name, value) {
      try {
        const u = new URL(location.href);
        if (value == null || value === '') u.searchParams.delete(name); else u.searchParams.set(name, value);
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      } catch (e) { /* file:// в некоторых браузерах — без изменения адреса */ }
    }
  };

  /* ------------------------------------------------------------ Модальные окна
     Используется нативный <dialog>: фокус-ловушка, Esc и возврат фокуса.
     Закрытие по клику на подложку и по кнопкам [data-close]. */
  function initDialog(dlg) {
    if (!dlg || dlg.dataset.ready) return;
    dlg.dataset.ready = '1';
    dlg.addEventListener('click', e => {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
    dlg.addEventListener('close', () => {
      if (dlg._onClose) dlg._onClose();
      if (dlg._opener && document.contains(dlg._opener)) dlg._opener.focus();
    });
  }

  L.modal = {
    open(dlg, html, opt = {}) {
      initDialog(dlg);
      const body = dlg.querySelector('[data-modal-body]');
      if (html != null && body) body.innerHTML = html;
      dlg._opener = opt.opener || document.activeElement;
      dlg._onClose = opt.onClose || null;
      if (!dlg.open) dlg.showModal();
      body && (body.scrollTop = 0);
      const focusTarget = dlg.querySelector('[autofocus]') || dlg.querySelector('.modal__close');
      focusTarget && focusTarget.focus();
      L.icons(dlg);
    },
    close(dlg) { if (dlg && dlg.open) dlg.close(); }
  };

  /* ------------------------------------------------------------ Уведомление */
  let toastTimer;
  L.toast = function (message) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2800);
  };

  /* ------------------------------------------------------------ Иконки [data-icon] */
  L.icons = function (root = document) {
    root.querySelectorAll('[data-icon]:not([data-icon-done])').forEach(el => {
      el.innerHTML = L.heraldry.icon(el.dataset.icon);
      el.setAttribute('data-icon-done', '');
    });
  };

  /* ------------------------------------------------------------ Появление при прокрутке */
  let observer = null;
  L.reveal = function (root = document) {
    const items = root.querySelectorAll('.reveal:not(.is-visible)');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    items.forEach(el => observer.observe(el));
  };

  /* ------------------------------------------------------------ Копирование */
  L.copy = async function (text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* перейти к запасному способу */ }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  };

  /* ------------------------------------------------------------ Навигация */
  function initNav() {
    const header = document.querySelector('.site-header');
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!header || !toggle || !nav) return;
    const mq = window.matchMedia('(max-width: 960px)');

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.visually-hidden').textContent = open ? 'Закрыть меню' : 'Открыть меню';
      header.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('nav-locked', open);
      if (open) {
        const first = nav.querySelector('a');
        first && first.focus();
      }
    }

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', e => { if (e.target.closest('a') && mq.matches) setOpen(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && header.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    mq.addEventListener('change', () => { if (!mq.matches) setOpen(false); });

    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------ Футер: данные сервера */
  function initFooter() {
    document.querySelectorAll('[data-server-address]').forEach(el => { el.textContent = L.data.world.server.address; });
    document.querySelectorAll('[data-season]').forEach(el => {
      const s = L.data.world.season;
      el.textContent = `Сезон ${s.roman} · «${s.title}»`;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initFooter();
    L.icons();
    L.reveal();
  });
})();
