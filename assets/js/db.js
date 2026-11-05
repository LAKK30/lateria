/* =========================================================================
   LATERIA · Слой доступа к данным
   Превращает сырые данные в удобные объекты, считает баллы, статусы
   событий и проверяет согласованность связей.
   ========================================================================= */
(function () {
  'use strict';
  const L = window.LATERIA;
  const D = L.data;

  /* ---------- даты: «YYYY-MM-DD» и «YYYY-MM-DDTHH:MM» как локальное время */
  function parseDate(iso) {
    const [d, t] = String(iso).split('T');
    const [y, m, day] = d.split('-').map(Number);
    const [hh, mm] = (t || '00:00').split(':').map(Number);
    return new Date(y, m - 1, day, hh, mm);
  }
  const NOW = parseDate(D.world.now);
  const DAY = 864e5;

  /* ---------- государства */
  const stateMap = new Map(D.states.map(s => [s.id, s]));

  function territoryKm2(chunks) {
    const side = D.world.chunkSize;
    return chunks * side * side / 1e6;
  }

  function alliancesOf(stateId) {
    return D.relations.alliances
      .filter(a => a.members.includes(stateId))
      .map(a => ({ ...a, partners: a.members.filter(m => m !== stateId).map(id => stateMap.get(id)) }));
  }

  function warsOf(stateId) {
    return D.relations.wars
      .filter(w => w.attacker === stateId || w.defender === stateId)
      .map(w => {
        const enemyId = w.attacker === stateId ? w.defender : w.attacker;
        return { ...w, role: w.attacker === stateId ? 'Нападение' : 'Оборона', enemy: stateMap.get(enemyId),
          ourScore: w.score[stateId], enemyScore: w.score[enemyId] };
      });
  }

  /* ---------- игроки и баллы */
  const players = D.players.map(row => {
    const p = {};
    D.playerFields.forEach((f, i) => { p[f] = row[i]; });
    p.id = p.nick.toLowerCase();
    return p;
  });

  function scorePlayer(p) {
    let total = 0;
    const breakdown = D.scoring.rules.map(rule => {
      const raw = p[rule.key];
      const cap = rule.dailyCap * p.activeDays;
      const counted = Math.min(raw, cap);
      const points = Math.round(counted * rule.points);
      total += points;
      return { rule, raw, cap, counted, points, capped: raw > cap };
    });
    return { total, breakdown };
  }

  players.forEach(p => {
    const s = scorePlayer(p);
    p.score = s.total;
    p.breakdown = s.breakdown;
    p.kd = p.deaths ? p.kills / p.deaths : p.kills;
  });

  const ranked = players
    .filter(p => p.score >= D.scoring.minScore)
    .sort((a, b) => b.score - a.score || a.nick.localeCompare(b.nick));
  ranked.forEach((p, i) => { p.rank = i + 1; });

  const playerMap = new Map(players.map(p => [p.id, p]));
  const getPlayer = nick => nick ? playerMap.get(String(nick).toLowerCase()) : undefined;

  /* ---------- события */
  function eventTimes(ev) {
    const start = parseDate(ev.start);
    const end = new Date(start.getTime() + ev.durationMin * 60000);
    return { start, end };
  }

  const STATUS = {
    live:         { key: 'live',         label: 'Идёт сейчас' },
    registration: { key: 'registration', label: 'Регистрация открыта' },
    upcoming:     { key: 'upcoming',     label: 'Скоро' },
    finished:     { key: 'finished',     label: 'Завершено' }
  };

  function eventStatus(ev) {
    const { start, end } = eventTimes(ev);
    if (end <= NOW) return STATUS.finished;
    if (start <= NOW) return STATUS.live;
    return ev.registration ? STATUS.registration : STATUS.upcoming;
  }

  const events = D.events
    .map(ev => ({ ...ev, ...eventTimes(ev), status: eventStatus(ev), typeInfo: D.eventTypes[ev.type] }))
    .sort((a, b) => a.start - b.start);
  const eventMap = new Map(events.map(e => [e.id, e]));

  function daysUntil(date) {
    const a = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
    const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.round((b - a) / DAY);
  }

  /* ---------- проверка согласованности (только предупреждения) */
  function validate() {
    const issues = [];
    D.states.forEach(s => {
      const r = getPlayer(s.ruler);
      if (!r) issues.push(`Правитель ${s.ruler} (${s.id}) отсутствует в списке игроков`);
      else if (r.state !== s.id) issues.push(`Правитель ${s.ruler} не является жителем ${s.id}`);
    });
    D.relations.alliances.forEach(a => a.members.forEach(m => { if (!stateMap.has(m)) issues.push(`Союз ${a.id}: нет государства ${m}`); }));
    D.relations.wars.forEach(w => {
      [w.attacker, w.defender].forEach(m => { if (!stateMap.has(m)) issues.push(`Война ${w.id}: нет государства ${m}`); });
      const allied = D.relations.alliances.some(a => a.members.includes(w.attacker) && a.members.includes(w.defender));
      if (allied) issues.push(`Война ${w.id}: стороны одновременно в союзе`);
    });
    players.forEach(p => { if (p.state && !stateMap.has(p.state)) issues.push(`Игрок ${p.nick}: нет государства ${p.state}`); });
    D.events.forEach(e => {
      (e.states || []).forEach(m => { if (!stateMap.has(m)) issues.push(`Событие ${e.id}: нет государства ${m}`); });
      if (e.war && !D.relations.wars.some(w => w.id === e.war)) issues.push(`Событие ${e.id}: нет войны ${e.war}`);
      if (!D.eventTypes[e.type]) issues.push(`Событие ${e.id}: неизвестный тип ${e.type}`);
    });
    if (issues.length) console.warn('[LATERIA] Несогласованность данных:\n' + issues.join('\n'));
    return issues;
  }
  validate();

  L.db = {
    world: D.world,
    now: NOW,
    parseDate,
    daysUntil,
    states: D.states,
    state: id => stateMap.get(id),
    territoryKm2,
    alliancesOf,
    warsOf,
    alliances: D.relations.alliances,
    wars: D.relations.wars.map(w => ({ ...w, attackerState: stateMap.get(w.attacker), defenderState: stateMap.get(w.defender) })),
    players,
    ranked,
    player: getPlayer,
    citizensOf: stateId => ranked.filter(p => p.state === stateId),
    scoring: D.scoring,
    events,
    event: id => eventMap.get(id),
    eventTypes: D.eventTypes,
    eventsOf: stateId => events.filter(e => (e.states || []).includes(stateId)),
    nextEvent: () => events.find(e => e.status.key !== 'finished' && e.status.key !== 'live') || null,
    shop: D.shop,
    item: id => D.shop.items.find(i => i.id === id),
    validate
  };
})();
