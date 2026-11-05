/* LATERIA · Профиль государства (state.html?id=…) */
(function () {
  'use strict';
  const L = window.LATERIA;
  const { db, fmt, esc, ui, heraldry } = L;
  const root = document.getElementById('state-root');

  const id = L.url.get('id');
  const s = db.state(id);

  if (!s) {
    document.title = 'Государство не найдено — LATERIA';
    root.innerHTML = `
      <section class="page-hero">
        <div class="container page-hero__inner">
          <p class="eyebrow">Ошибка летописи</p>
          <h1>Государство не найдено</h1>
          <p class="lead">Такого государства нет в летописи третьего сезона. Возможно, ссылка устарела.</p>
          <p><a class="btn btn--primary" href="states.html">Ко всем государствам</a></p>
        </div>
      </section>`;
    return;
  }

  document.title = `${s.name} — LATERIA`;

  const ruler = db.player(s.ruler);
  const alliances = db.alliancesOf(s.id);
  const wars = db.warsOf(s.id);
  const citizens = db.citizensOf(s.id);
  const events = db.eventsOf(s.id);
  const idx = db.states.indexOf(s);
  const prev = db.states[(idx - 1 + db.states.length) % db.states.length];
  const next = db.states[(idx + 1) % db.states.length];
  const km2 = db.territoryKm2(s.chunks);
  const perCapita = Math.round(s.treasury / s.population);

  const allianceList = alliances.length
    ? `<ul class="side-list">${alliances.map(a => a.partners.map(p => `
        <li>${heraldry.arms(p, { label: false })}
          <span><a href="${ui.stateUrl(p.id)}">${esc(p.name)}</a><small>${esc(a.name)} · с ${esc(fmt.date(a.since, { day: 'numeric', month: 'long' }))}</small></span>
        </li>`).join('')).join('')}</ul>`
    : '<p class="side-empty">Государство не состоит в союзах.</p>';

  const warList = wars.length
    ? `<ul class="side-list">${wars.map(w => `
        <li>${heraldry.arms(w.enemy, { label: false })}
          <span><a href="${ui.stateUrl(w.enemy.id)}">${esc(w.name)}</a>
            <small>${esc(w.role)} · против ${esc(w.enemy.short)} · счёт ${w.ourScore}:${w.enemyScore}</small>
            <small>${esc(w.cause)}</small>
          </span>
        </li>`).join('')}</ul>`
    : '<p class="side-empty">Государство ни с кем не воюет.</p>';

  root.innerHTML = `
    <section class="state-hero" style="--state-color:${s.arms.field[0]};--accent:${s.accent}" aria-labelledby="state-title">
      <div class="state-hero__art"><img src="assets/img/ridge.svg" alt="" width="1920" height="480"></div>
      <div class="container">
        <nav aria-label="Навигационная цепочка">
          <ol class="breadcrumbs">
            <li><a href="index.html">Главная</a></li>
            <li><a href="states.html">Государства</a></li>
            <li aria-current="page">${esc(s.short)}</li>
          </ol>
        </nav>
        <div class="state-hero__grid">
          <div class="state-hero__arms">${heraldry.arms(s)}</div>
          <div class="state-hero__text">
            <p class="eyebrow">${esc(s.kind)} · основано ${esc(fmt.date(s.founded))}</p>
            <h1 id="state-title">${esc(s.name)}</h1>
            <p class="state-hero__motto">«${esc(s.motto)}»</p>
            <p class="lead">${esc(s.summary)}</p>
            <div class="state-card__meta">${s.traits.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          </div>
        </div>
      </div>
    </section>

    <div class="state-body" style="--accent:${s.accent}">
    <section class="section section--tight" aria-label="Основные сведения">
      <div class="container">
        <dl class="facts reveal">
          <div><dt>Правитель</dt><dd>${ruler ? `<a href="${ui.playerUrl(ruler)}">${esc(ruler.nick)}</a>` : esc(s.ruler)}<small>${esc(s.rulerTitle)}</small></dd></div>
          <div><dt>Казна</dt><dd class="num">${fmt.money(s.treasury)}<small>≈ ${fmt.num(perCapita)} кр. на жителя</small></dd></div>
          <div><dt>Территория</dt><dd class="num">${fmt.num(s.chunks)} чанков<small>${fmt.km2(km2)}</small></dd></div>
          <div><dt>Население</dt><dd class="num">${fmt.num(s.population)}<small>${fmt.plural(s.population, 'житель', 'жителя', 'жителей')}</small></dd></div>
          <div><dt>Столица</dt><dd>${esc(s.capital)}<small>${esc(s.government)}</small></dd></div>
        </dl>
      </div>
    </section>

    <section class="section section--tight">
      <div class="container state-layout">
        <div>
          <article class="state-section history reveal" aria-labelledby="history-title">
            <h2 id="history-title">История</h2>
            ${s.history.map(p => `<p>${esc(p)}</p>`).join('')}
          </article>

          <section class="state-section reveal" aria-labelledby="citizens-title">
            <h2 id="citizens-title">Жители в рейтинге сезона</h2>
            ${citizens.length ? `<div class="citizens">${citizens.map(p => `
              <a class="citizen" href="${ui.playerUrl(p)}">
                <span><strong>${esc(p.nick)}</strong><small>${esc(p.title)}</small></span>
                <span class="citizen__score num">#${p.rank}</span>
              </a>`).join('')}</div>` : '<p class="muted">Жителей в рейтинге пока нет.</p>'}
          </section>

          <section class="state-section reveal" aria-labelledby="events-title">
            <h2 id="events-title">События с участием государства</h2>
            ${events.length ? `<div class="events-list">${events.map(e => ui.eventCard(e, { link: true, reveal: false })).join('')}</div>` : '<p class="muted">Событий пока не запланировано.</p>'}
          </section>
        </div>

        <aside aria-label="Дипломатия">
          <div class="card side-card reveal">
            <h3>${heraldry.icon('key')}Союзы</h3>
            ${allianceList}
          </div>
          <div class="card side-card reveal">
            <h3>${heraldry.icon('sword')}Активные войны</h3>
            ${warList}
          </div>
        </aside>
      </div>

      <div class="container">
        <nav class="state-pager" aria-label="Другие государства">
          <a href="${ui.stateUrl(prev.id)}">${heraldry.arms(prev, { label: false })}<span><small>Предыдущее</small>${esc(prev.short)}</span></a>
          <a href="${ui.stateUrl(next.id)}">${heraldry.arms(next, { label: false })}<span><small>Следующее</small>${esc(next.short)}</span></a>
        </nav>
      </div>
    </section>
    </div>`;
})();
