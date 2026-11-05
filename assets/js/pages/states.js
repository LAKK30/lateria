/* LATERIA · Государства — сетка и дипломатия */
(function () {
  'use strict';
  const L = window.LATERIA;
  const { db, fmt, esc, ui, heraldry } = L;

  document.getElementById('states-grid').innerHTML = db.states.map(s => ui.stateCard(s)).join('');

  const pairArms = ids => `<span class="relation__pair">${ids.map((id, i) => {
    const s = db.state(id);
    return (i ? '<span class="relation__sep" aria-hidden="true">×</span>' : '') +
      `<a href="${ui.stateUrl(id)}" aria-label="${esc(s.name)}">${heraldry.arms(s, { label: false })}</a>`;
  }).join('')}</span>`;

  document.getElementById('alliances').innerHTML = db.alliances.map(a => `
    <li class="relation">
      ${pairArms(a.members)}
      <span class="relation__name">${esc(a.name)}
        <span class="relation__sub">${a.members.map(id => esc(db.state(id).short)).join(' и ')} · с ${esc(fmt.date(a.since, { day: 'numeric', month: 'long' }))}</span>
      </span>
      <span></span>
    </li>`).join('');

  document.getElementById('wars').innerHTML = db.wars.map(w => `
    <li class="relation">
      ${pairArms([w.attacker, w.defender])}
      <span class="relation__name">${esc(w.name)}
        <span class="relation__sub">${esc(w.attackerState.short)} нападает на ${esc(w.defenderState.short)} · с ${esc(fmt.date(w.since, { day: 'numeric', month: 'long' }))}</span>
      </span>
      <span class="relation__score num" aria-label="Счёт ${w.score[w.attacker]}:${w.score[w.defender]}">${w.score[w.attacker]} : ${w.score[w.defender]}</span>
    </li>`).join('');
})();
