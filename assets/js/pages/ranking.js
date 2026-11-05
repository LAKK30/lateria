/* LATERIA · Рейтинг игроков — поиск, сортировка, профиль */
(function () {
  'use strict';
  const L = window.LATERIA;
  const { db, fmt, esc, ui, heraldry } = L;

  const body = document.getElementById('ranking-body');
  const empty = document.getElementById('ranking-empty');
  const search = document.getElementById('search');
  const stateSel = document.getElementById('state-filter');
  const countEl = document.getElementById('result-count');
  const modal = document.getElementById('player-modal');
  const headers = document.querySelectorAll('.ranking-table th[data-sort]');

  const view = { q: '', state: 'all', sort: 'score' };

  /* ---------- лидеры */
  document.getElementById('podium').innerHTML = db.ranked.slice(0, 3).map(p => ui.podiumCard(p, { button: true })).join('');

  /* ---------- фильтр государств */
  stateSel.innerHTML = `<option value="all">Все государства</option>` +
    db.states.map(s => `<option value="${s.id}">${esc(s.short)}</option>`).join('') +
    `<option value="none">Независимые</option>`;

  /* ---------- правила начисления */
  const pointsLabel = r => {
    const unit = r.unit ? ` за 1 ${r.unit}` : '';
    if (r.points < 1) return `${fmt.dec(r.points * (r.points < .1 ? 100 : 10))} за ${r.points < .1 ? 100 : 10}`;
    return `${fmt.num(r.points)}${unit || ' за 1'}`;
  };
  document.getElementById('rules-body').innerHTML = db.scoring.rules.map(r => `
    <tr>
      <td>${esc(r.label)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</td>
      <td>${pointsLabel(r)}</td>
      <td>${fmt.num(r.dailyCap)}${r.unit ? ' ' + r.unit : ''}</td>
    </tr>`).join('');
  document.getElementById('rules-notes').innerHTML = [
    ...db.scoring.notes,
    `В рейтинг попадают игроки, набравшие не менее ${fmt.num(db.scoring.minScore)} баллов.`
  ].map(n => `<li>${esc(n)}</li>`).join('');

  /* ---------- таблица */
  const highlight = (nick, q) => {
    if (!q) return esc(nick);
    const i = nick.toLowerCase().indexOf(q);
    if (i < 0) return esc(nick);
    return esc(nick.slice(0, i)) + '<mark>' + esc(nick.slice(i, i + q.length)) + '</mark>' + esc(nick.slice(i + q.length));
  };

  function filtered() {
    const q = view.q;
    return db.ranked
      .filter(p => !q || p.nick.toLowerCase().includes(q))
      .filter(p => view.state === 'all' || (view.state === 'none' ? !p.state : p.state === view.state))
      .sort((a, b) => (b[view.sort] - a[view.sort]) || (a.rank - b.rank));
  }

  function render() {
    const rows = filtered();
    empty.hidden = rows.length > 0;
    countEl.textContent = `Показано ${rows.length} из ${db.ranked.length} ${fmt.plural(db.ranked.length, 'игрока', 'игроков', 'игроков')}`;
    body.innerHTML = rows.map(p => {
      const s = db.state(p.state);
      return `<tr class="${p.rank <= 3 ? 'is-top' : ''}" data-row="${esc(p.id)}">
        <td class="rank-cell">${p.rank}</td>
        <td><div class="player-cell">${heraldry.arms(s, { label: false })}
          <span><button type="button" data-player="${esc(p.id)}">${highlight(p.nick, view.q)}</button><small>${esc(p.title)}</small></span></div></td>
        <td>${s ? `<a class="state-link" style="--accent:${s.accent}" href="${ui.stateUrl(s.id)}">${esc(s.short)}</a>` : '<span class="state-link state-link--none">Независимый</span>'}</td>
        <td class="num score-cell">${fmt.num(p.score)}</td>
        <td class="num">${fmt.num(p.hours)}</td>
        <td class="num">${fmt.num(p.kills)}</td>
        <td class="num">${fmt.dec2(p.kd)}</td>
        <td class="num">${fmt.big(p.blocks)}</td>
      </tr>`;
    }).join('');
  }

  let t;
  search.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { view.q = search.value.trim().toLowerCase(); render(); }, 80);
  });
  stateSel.addEventListener('change', () => { view.state = stateSel.value; render(); });

  headers.forEach(th => th.querySelector('button').addEventListener('click', () => {
    view.sort = th.dataset.sort;
    headers.forEach(h => h === th ? h.setAttribute('aria-sort', 'descending') : h.removeAttribute('aria-sort'));
    render();
  }));

  /* ---------- профиль игрока */
  function profile(p) {
    const s = db.state(p.state);
    const ruler = s && s.ruler === p.nick;
    const max = Math.max(...p.breakdown.map(b => b.points));
    const perDay = p.score / p.activeDays;
    const stats = [
      ['Часы в игре', `${fmt.num(p.hours)} ч`, `${fmt.dec(p.hours / p.activeDays)} ч в день`],
      ['Убийства игроков', fmt.num(p.kills), `K/D ${fmt.dec2(p.kd)}`],
      ['Смерти', fmt.num(p.deaths), ''],
      ['Убито мобов', fmt.big(p.mobs), ''],
      ['Поставлено блоков', fmt.big(p.blocks), `${fmt.num(p.blocks)} шт.`],
      ['Пройдено', `${fmt.num(p.distance)} км`, `≈ ${fmt.big(p.distance * 1000)} блоков`],
      ['События', fmt.num(p.events), `${fmt.num(p.eventWins)} ${fmt.plural(p.eventWins, 'победа', 'победы', 'побед')}`],
      ['Задания', fmt.num(p.quests), 'и достижения'],
      ['Дней активности', fmt.num(p.activeDays), `в игре с ${fmt.date(p.joined, { day: 'numeric', month: 'long' })}`]
    ];
    return `
      <button class="modal__close" type="button" data-close aria-label="Закрыть">×</button>
      <header class="modal__head" style="--accent:${s ? s.accent : 'var(--bone)'}">
        <div class="profile-head">
          ${heraldry.arms(s)}
          <div>
            <p class="profile-head__rank">Место #${p.rank} · ${esc(p.role)}</p>
            <h2 id="player-modal-title">${esc(p.nick)}</h2>
            <p class="profile-head__sub">${esc(p.title)} · ${s ? `<a href="${ui.stateUrl(s.id)}">${esc(s.name)}</a>${ruler ? ' (правитель)' : ''}` : 'Независимый игрок'}</p>
            <div class="profile-score"><strong class="num">${fmt.num(p.score)}</strong><span class="muted">баллов активности · ≈ ${fmt.num(perDay)} в день</span></div>
          </div>
        </div>
      </header>
      <div class="modal__body">
        <dl class="facts profile-stats">
          ${stats.map(([k, v, sub]) => `<div><dt>${esc(k)}</dt><dd class="num">${esc(v)}${sub ? `<small>${esc(sub)}</small>` : ''}</dd></div>`).join('')}
        </dl>
        <section aria-labelledby="breakdown-title">
          <h3 id="breakdown-title">Из чего сложились баллы</h3>
          <div class="breakdown">
            ${p.breakdown.map(b => `
              <div class="breakdown__row">
                <span class="breakdown__label">${esc(b.rule.label)}<small>${fmt.big(b.counted)}${b.rule.unit ? ' ' + b.rule.unit : ''}</small>
                  ${b.capped ? `<span class="breakdown__capped"> · лимит: засчитано ${fmt.big(b.counted)} из ${fmt.big(b.raw)}</span>` : ''}</span>
                <span class="breakdown__pts num">${fmt.num(b.points)}</span>
                <span class="breakdown__bar" aria-hidden="true"><span style="width:${max ? (b.points / max * 100).toFixed(1) : 0}%"></span></span>
              </div>`).join('')}
          </div>
        </section>
      </div>
      <footer class="modal__foot">
        ${s ? `<a class="btn btn--ghost" href="${ui.stateUrl(s.id)}">Государство</a>` : ''}
        <button class="btn btn--primary" type="button" data-close>Закрыть</button>
      </footer>`;
  }

  function openPlayer(id, opener) {
    const p = db.player(id);
    if (!p || !p.rank) return;
    L.url.set('player', p.id);
    L.modal.open(modal, profile(p), { opener, onClose: () => L.url.set('player', null) });
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-player]');
    if (btn) { openPlayer(btn.dataset.player, btn); return; }
    const row = e.target.closest('tr[data-row]');
    if (row && !e.target.closest('a')) openPlayer(row.dataset.row, row.querySelector('[data-player]'));
  });

  render();
  const linked = L.url.get('player');
  if (linked) openPlayer(linked, null);
})();
