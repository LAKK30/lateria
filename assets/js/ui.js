/* =========================================================================
   LATERIA · Переиспользуемые шаблоны интерфейса
   Каждый шаблон получает объект из L.db и возвращает HTML-строку.
   Все пользовательские строки экранируются через L.esc.
   ========================================================================= */
(function () {
  'use strict';
  const L = window.LATERIA;
  const { esc, fmt, db, heraldry } = L;

  const stateUrl = id => `state.html?id=${encodeURIComponent(id)}`;
  const playerUrl = p => `ranking.html?player=${encodeURIComponent(p.id)}`;
  const eventUrl = e => `events.html?event=${encodeURIComponent(e.id)}`;

  function statusBadge(status) {
    return `<span class="status status--${status.key}">${esc(status.label)}</span>`;
  }

  /* Карточка государства (сетка на главной и на странице государств) */
  function stateCard(s, opt = {}) {
    const ruler = db.player(s.ruler);
    const wars = db.warsOf(s.id).length;
    const allies = db.alliancesOf(s.id).length;
    return `<article class="card card--interactive state-card-wrap ${opt.reveal === false ? '' : 'reveal'}" style="--state-color:${s.arms.field[0]};--accent:${s.accent}">
      <a class="state-card" href="${stateUrl(s.id)}">
        <div class="state-card__banner">${heraldry.arms(s, { label: false, className: 'state-card__arms' })}</div>
        <div class="state-card__body">
          <p class="state-card__kind">${esc(s.kind)}</p>
          <h3>${esc(s.name)}</h3>
          <p class="state-card__summary">${esc(s.summary)}</p>
          <div class="state-card__meta">
            <span class="tag">${allies} ${fmt.plural(allies, 'союз', 'союза', 'союзов')}</span>
            ${wars ? `<span class="tag tag--accent">${wars === 1 ? 'Идёт война' : `${wars} войны`}</span>` : '<span class="tag">Мир</span>'}
            <span class="tag">${fmt.num(s.population)} жителей</span>
          </div>
          <div class="state-card__foot">
            <span>${esc(s.rulerTitle)}: <strong>${esc(ruler ? ruler.nick : s.ruler)}</strong></span>
            <span aria-hidden="true">→</span>
          </div>
        </div>
      </a>
    </article>`;
  }

  /* Компактная ссылка-«чип» на государство */
  function stateChip(s) {
    return `<a class="state-chip" href="${stateUrl(s.id)}" style="--accent:${s.accent}">${heraldry.arms(s, { label: false })}<span>${esc(s.short)}</span></a>`;
  }

  /* Карточка события */
  function eventCard(e, opt = {}) {
    const t = e.typeInfo;
    const states = (e.states || []).map(db.state).filter(Boolean);
    const armsRow = states.length && states.length < 6
      ? `<span class="event-card__states" aria-label="Государства: ${esc(states.map(s => s.short).join(', '))}">${states.map(s => heraldry.arms(s, { label: false })).join('')}</span>`
      : (states.length === 6 ? '<span class="tag">Все государства</span>' : '');
    return `<article class="card event-card ${e.status.key === 'finished' ? 'is-finished' : ''} ${opt.reveal === false ? '' : 'reveal'}" style="--type-color:${t.color}">
      <div class="event-card__date">
        <span class="event-card__day">${e.start.getDate()}</span>
        <span class="event-card__mon">${esc(fmt.date(e.start, { month: 'short' }).replace('.', ''))}</span>
        <span class="event-card__time">${fmt.time(e.start)}</span>
      </div>
      <div class="event-card__body">
        <div class="event-card__top">
          <span class="event-card__type">${heraldry.icon(t.icon)}${esc(t.label)}</span>
          ${statusBadge(e.status)}
        </div>
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.summary)}</p>
        <div class="event-card__loc">${armsRow}<span>${esc(e.location)}</span></div>
      </div>
      <div class="event-card__action">
        ${opt.link
          ? `<a class="btn btn--ghost btn--sm" href="${eventUrl(e)}">Подробнее<span class="visually-hidden">: ${esc(e.title)}</span></a>`
          : `<button class="btn btn--ghost btn--sm" type="button" data-event="${esc(e.id)}">Подробнее<span class="visually-hidden">: ${esc(e.title)}</span></button>`}
      </div>
    </article>`;
  }

  /* Карточка лидера рейтинга */
  function podiumCard(p, opt = {}) {
    const s = db.state(p.state);
    const place = ['Первое место', 'Второе место', 'Третье место'][p.rank - 1] || `${p.rank} место`;
    const inner = `
      <span class="podium-card__rank" aria-hidden="true">${p.rank}</span>
      <span class="visually-hidden">${place}.</span>
      <span class="podium-card__arms">${heraldry.arms(s, { label: false })}</span>
      <span class="podium-card__nick">${esc(p.nick)}</span>
      <span class="podium-card__state">${esc(p.title)} · <span class="accent-text" style="--accent:${s ? s.accent : 'var(--muted)'}">${esc(s ? s.short : 'Независимый')}</span></span>
      <span class="podium-card__score num">${fmt.num(p.score)}<small>баллов активности</small></span>`;
    if (opt.button) {
      return `<button type="button" class="card card--interactive podium-card podium-card--${p.rank}" data-player="${esc(p.id)}">${inner}</button>`;
    }
    return `<a class="card card--link card--interactive podium-card podium-card--${p.rank} reveal" href="${playerUrl(p)}">${inner}</a>`;
  }

  L.ui = { stateUrl, playerUrl, eventUrl, statusBadge, stateCard, stateChip, eventCard, podiumCard };
})();
