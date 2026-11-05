/* LATERIA · Главная */
(function () {
  'use strict';
  const L = window.LATERIA;
  const { db, fmt, esc, ui, heraldry } = L;

  const citizens = db.states.reduce((n, s) => n + s.population, 0);
  const chunks = db.states.reduce((n, s) => n + s.chunks, 0);
  const upcoming = db.events.filter(e => e.status.key !== 'finished').length;

  /* Короткая строка фактов в первом экране */
  document.getElementById('hero-meta').innerHTML = `
    <div><strong>${db.states.length}</strong>государств</div>
    <div><strong>${fmt.num(citizens)}</strong>жителей</div>
    <div><strong>${db.wars.length}</strong>${fmt.plural(db.wars.length, 'война', 'войны', 'войн')} идёт</div>`;

  /* Статистика мира */
  const stats = [
    [db.states.length, 'государств'],
    [fmt.num(citizens), 'жителей в государствах'],
    [fmt.km2(db.territoryKm2(chunks)), `освоено · ${fmt.num(chunks)} чанков`],
    [db.alliances.length + ' / ' + db.wars.length, 'союзов и войн'],
    [upcoming, 'событий впереди']
  ];
  document.getElementById('world-stats').innerHTML = stats
    .map(([v, l]) => `<div class="stat"><dt class="stat__label">${esc(l)}</dt><dd class="stat__value num">${v}</dd></div>`)
    .join('');

  /* Анонс ближайшего события */
  const next = db.nextEvent();
  const nextEl = document.getElementById('next-event');
  if (next) {
    const t = next.typeInfo;
    const states = next.states.map(db.state);
    const days = db.daysUntil(next.start);
    nextEl.innerHTML = `
      <article class="card announce reveal" style="--type-color:${t.color}">
        <div class="announce__date">
          <span class="announce__day">${next.start.getDate()}</span>
          <span class="announce__month">${esc(fmt.date(next.start, { month: 'long' }))}</span>
          <span class="announce__when">${esc(fmt.weekday(next.start))}, ${fmt.time(next.start)} · ${esc(fmt.relDays(days))}</span>
        </div>
        <div class="announce__body">
          <div class="announce__meta">
            <span class="event-card__type" style="--type-color:${t.color}">${heraldry.icon(t.icon)}${esc(t.label)}</span>
            ${ui.statusBadge(next.status)}
          </div>
          <h3>${esc(next.title)}</h3>
          <p class="muted">${esc(next.description[0])}</p>
          <div class="announce__meta"><span>${esc(next.location)}</span><span>Длительность: ${fmt.duration(next.durationMin)}</span></div>
          <div class="state-chips">${states.map(ui.stateChip).join('')}</div>
          <div class="announce__actions">
            <a class="btn btn--primary" href="${ui.eventUrl(next)}">Подробнее о событии</a>
            <a class="btn btn--ghost" href="events.html">Календарь</a>
          </div>
        </div>
      </article>`;
  } else {
    nextEl.innerHTML = '<p class="empty">Новые события скоро появятся в календаре.</p>';
  }

  /* Три государства — с наибольшим населением */
  const preview = [...db.states].sort((a, b) => b.population - a.population).slice(0, 3);
  document.getElementById('states-preview').innerHTML = preview.map(s => ui.stateCard(s)).join('');

  /* Тройка лидеров */
  document.getElementById('top-players').innerHTML = db.ranked.slice(0, 3).map(p => ui.podiumCard(p)).join('');
})();
