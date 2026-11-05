/* LATERIA · События — фильтрация и подробности */
(function () {
  'use strict';
  const L = window.LATERIA;
  const { db, fmt, esc, ui, heraldry } = L;

  const list = document.getElementById('events-list');
  const filterEl = document.getElementById('type-filter');
  const finishedBox = document.getElementById('show-finished');
  const countEl = document.getElementById('result-count');
  const modal = document.getElementById('event-modal');

  document.getElementById('world-date').textContent =
    `${fmt.date(db.now)}, ${fmt.time(db.now)}`;

  /* ---------- состояние фильтра (тип можно передать в адресе: ?type=pvp) */
  const initialType = L.url.get('type');
  const state = {
    type: db.eventTypes[initialType] ? initialType : 'all',
    finished: false
  };

  /* ---------- кнопки-фильтры */
  const types = [['all', { plural: 'Все события', icon: 'spark' }], ...Object.entries(db.eventTypes)];
  filterEl.innerHTML = types.map(([key, t]) => `
    <button type="button" class="chip" data-type="${key}" aria-pressed="${state.type === key}">
      ${heraldry.icon(t.icon)}${esc(t.plural)} <span class="chip__count" data-count="${key}"></span>
    </button>`).join('');

  function visibleByStatus(e) { return state.finished || e.status.key !== 'finished'; }

  function updateCounts() {
    filterEl.querySelectorAll('[data-count]').forEach(el => {
      const key = el.dataset.count;
      const n = db.events.filter(e => visibleByStatus(e) && (key === 'all' || e.type === key)).length;
      el.textContent = n;
    });
  }

  /* ---------- список, сгруппированный по месяцам */
  function render() {
    const items = db.events.filter(e => visibleByStatus(e) && (state.type === 'all' || e.type === state.type));
    countEl.textContent = items.length
      ? `Найдено ${items.length} ${fmt.plural(items.length, 'событие', 'события', 'событий')}`
      : '';
    if (!items.length) {
      list.innerHTML = `<div class="card empty"><h3>Событий этого типа пока нет</h3><p>Попробуйте другой тип или включите завершённые события.</p></div>`;
      return;
    }
    let month = '';
    list.innerHTML = items.map(e => {
      const m = fmt.date(e.start, { month: 'long', year: 'numeric' });
      const head = m !== month ? `<h3 class="event-month">${esc(m)}</h3>` : '';
      month = m;
      return head + ui.eventCard(e, { reveal: false });
    }).join('');
    L.icons(list);
  }

  filterEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    state.type = btn.dataset.type;
    filterEl.querySelectorAll('[data-type]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    L.url.set('type', state.type === 'all' ? null : state.type);
    render();
  });

  finishedBox.addEventListener('change', () => {
    state.finished = finishedBox.checked;
    updateCounts();
    render();
  });

  /* ---------- подробности события */
  function detail(e) {
    const t = e.typeInfo;
    const states = (e.states || []).map(db.state);
    const war = e.war ? db.wars.find(w => w.id === e.war) : null;
    const days = db.daysUntil(e.start);
    const when = e.status.key === 'finished' ? 'Событие завершено' :
      e.status.key === 'live' ? 'Идёт прямо сейчас' : `Начало ${fmt.relDays(days)}`;
    return `
      <button class="modal__close" type="button" data-close aria-label="Закрыть">×</button>
      <header class="modal__head event-modal__head" style="--type-color:${t.color}">
        <div class="event-card__top">
          <span class="event-card__type" style="--type-color:${t.color}">${heraldry.icon(t.icon)}${esc(t.label)}</span>
          ${ui.statusBadge(e.status)}
        </div>
        <h2 id="event-modal-title" style="margin-top:.8rem">${esc(e.title)}</h2>
        <div class="event-modal__meta">
          <span>${esc(fmt.weekday(e.start))}, ${esc(fmt.date(e.start))}</span>
          <span>${fmt.time(e.start)}–${fmt.time(e.end)} (${fmt.duration(e.durationMin)})</span>
          <span>${esc(when)}</span>
        </div>
      </header>
      <div class="modal__body">
        ${e.result ? `<p class="event-result"><strong>Итог:</strong> ${esc(e.result)}</p>` : ''}
        <div>${e.description.map(p => `<p class="muted">${esc(p)}</p>`).join('')}</div>
        <dl class="kv">
          <dt>Место</dt><dd>${esc(e.location)}</dd>
          ${e.details.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
          ${war ? `<dt>Война</dt><dd>${esc(war.name)} · счёт ${war.score[war.attacker]}:${war.score[war.defender]}</dd>` : ''}
        </dl>
        ${states.length ? `<div><h3>Государства</h3><div class="state-chips">${states.map(ui.stateChip).join('')}</div></div>` : ''}
      </div>
      <footer class="modal__foot">
        ${e.status.key === 'registration' ? '<p class="muted" style="margin:0 auto 0 0;font-size:.88rem">Регистрация проходит в игре у глашатая столицы.</p>' : ''}
        <button class="btn btn--ghost" type="button" data-close>Закрыть</button>
        <a class="btn btn--primary" href="play.html">Как попасть на сервер</a>
      </footer>`;
  }

  function openEvent(id, opener) {
    const e = db.event(id);
    if (!e) return;
    // завершённое событие из ссылки должно быть видно в списке
    if (e.status.key === 'finished' && !state.finished) {
      state.finished = finishedBox.checked = true;
      updateCounts();
      render();
    }
    L.url.set('event', id);
    L.modal.open(modal, detail(e), { opener, onClose: () => L.url.set('event', null) });
  }

  list.addEventListener('click', e => {
    const btn = e.target.closest('[data-event]');
    if (btn) openEvent(btn.dataset.event, btn);
  });

  updateCounts();
  render();

  const linked = L.url.get('event');
  if (linked && db.event(linked)) {
    const ev = db.event(linked);
    if (state.type !== 'all' && ev.type !== state.type) {
      state.type = 'all';
      filterEl.querySelectorAll('[data-type]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === 'all')));
      render();
    }
    openEvent(linked, null);
  }
})();
