/* =========================================================================
   LATERIA · Геральдическая система
   Все гербы строятся по одним правилам: одинаковая форма щита, кайма цвета
   кости, одно деление поля и одна фигура в центре. Различаются цветами
   поля, делением и фигурой.
   Фигуры и иконки нарисованы в квадрате 40×40.
   ========================================================================= */
(function () {
  'use strict';
  const L = window.LATERIA;

  const SHIELD = 'M8 6h84v44c0 34-20 52-42 64C28 102 8 84 8 50z';

  /* Фигуры: d — путь; rule — evenodd для «окон»; stroke — линейная фигура */
  const GLYPHS = {
    tower:    { d: 'M9 38V15H6V5h6v4h4V5h8v4h4V5h6v10h-3v23h-7v-8a4 4 0 0 0-8 0v8z' },
    eye:      { d: 'M2 20C8 10 14 6 20 6s12 4 18 14c-6 10-12 14-18 14S8 30 2 20zM20 12.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 1 0 0-15zM20 16.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z', rule: 'evenodd' },
    crystal:  { d: 'M20 3v34M5.3 11.5l29.4 17M5.3 28.5l29.4-17M20 3l-4.5 4.5M20 3l4.5 4.5M20 37l-4.5-4.5M20 37l4.5-4.5M5.3 11.5l6.2 1.6M5.3 11.5l1.6 6.2M34.7 28.5l-6.2-1.6M34.7 28.5l-1.6-6.2M5.3 28.5l1.6-6.2M5.3 28.5l6.2-1.6M34.7 11.5l-1.6 6.2M34.7 11.5l-6.2 1.6', stroke: true },
    key:      { d: 'M20 2a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM20 6a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM18 18h4v20h-4zM22 27h6v3h-6zM22 33h4v3h-4z', rule: 'evenodd' },
    sword:    { d: 'M20 1l3 5v20h-6V6zM9 26h22v3H9zM18 29h4v6h-4zM20 35a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z' },
    crescent: { d: 'M26 5.17A16 16 0 1 0 26 34.83A16 16 0 0 1 26 5.17z' },
    crown:    { d: 'M5 30L3 11l9 8 8-13 8 13 9-8-2 19zM5 32h30v5H5z' },
    banner:   { d: 'M8 2h3v36H8zM11 5h23l-6 8 6 8H11z' },
    flask:    { d: 'M15 3h10v3h-2v9l9.5 16.5A4 4 0 0 1 29 37H11a4 4 0 0 1-3.5-5.5L17 15V6h-2z' },
    mask:     { d: 'M3 12c5-3.5 11-5 17-5s12 1.5 17 5c0 13-7 21-17 21S3 25 3 12zM9 16l8 0-1.5 4.5H10zM23 16h8l-1 4.5h-5.5z', rule: 'evenodd' },
    cloak:    { d: 'M14 3h12l2 5 8 30H4l8-30zM17 3l3 6 3-6', rule: 'evenodd' },
    throne:   { d: 'M11 2h18v18h3v5h-3v13h-4V29H15v9h-4V25H8v-5h3zM15 6v14h10V6z', rule: 'evenodd' },
    mug:      { d: 'M7 9h19v25a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3zM26 13h4a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-4v-3.5h4a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-4z' },
    spark:    { d: 'M20 2l4 14 14 4-14 4-4 14-4-14-14-4 14-4z' },
    chevrons: { d: 'M4 15L20 5l16 10v6L20 11 4 21zM4 28l16-10 16 10v6L20 24 4 34z' },
    shield:   { d: 'M6 4h28v14c0 10-6 16-14 19C12 34 6 28 6 18z' },
    feather:  { d: 'M33 3C20 5 10 14 8 30l-3 7 3 1 3-7c12-1 20-9 22-28zM11 30l14-17', rule: 'evenodd' }
  };

  let uid = 0;

  function glyphMarkup(name, fill) {
    const g = GLYPHS[name];
    if (!g) return '';
    if (g.stroke) {
      return `<path d="${g.d}" fill="none" stroke="${fill}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return `<path d="${g.d}" fill="${fill}"${g.rule ? ` fill-rule="${g.rule}"` : ''}/>`;
  }

  function division(div, a, b) {
    const base = `<rect width="100" height="120" fill="${a}"/>`;
    switch (div) {
      case 'per-pale':    return base + `<rect x="50" width="50" height="120" fill="${b}"/>`;
      case 'per-fess':    return base + `<rect y="58" width="100" height="62" fill="${b}"/>`;
      case 'per-bend':    return base + `<polygon points="0,0 100,0 100,120" fill="${b}"/>`;
      case 'quarterly':   return base + `<rect x="50" width="50" height="58" fill="${b}"/><rect y="58" width="50" height="62" fill="${b}"/>`;
      case 'chevron':     return base + `<polygon points="0,98 50,70 100,98 100,114 50,86 0,114" fill="${b}"/>`;
      case 'per-saltire': return base + `<polygon points="0,0 100,0 50,58" fill="${b}"/><polygon points="0,120 100,120 50,58" fill="${b}"/>`;
      case 'bordure':     return base + `<path d="${SHIELD}" fill="none" stroke="${b}" stroke-width="16"/>`;
      default:            return base;
    }
  }

  /**
   * Герб государства.
   * @param {object} state  объект государства из data.js
   * @param {object} [opt]  { label: string|false, className }
   */
  function arms(state, opt = {}) {
    if (!state) return independent(opt);
    const { division: div, field, charge, tincture } = state.arms;
    const id = 'arms' + (++uid);
    const cy = div === 'chevron' ? 46 : 56;
    const s = 1.15;
    const tx = 50 - 20 * s, ty = cy - 20 * s;
    const label = opt.label === false ? '' : (opt.label || `Герб: ${state.name}`);
    const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
    return `<svg class="arms ${opt.className || ''}" viewBox="0 0 100 120" ${a11y}>
      <defs>
        <clipPath id="${id}c"><path d="${SHIELD}"/></clipPath>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity=".16"/>
          <stop offset=".45" stop-color="#fff" stop-opacity="0"/>
          <stop offset="1" stop-color="#000" stop-opacity=".42"/>
        </linearGradient>
      </defs>
      <g clip-path="url(#${id}c)">
        ${division(div, field[0], field[1])}
        <g transform="translate(${tx + 1.4} ${ty + 2}) scale(${s})" opacity=".45">${glyphMarkup(charge, '#0b090c')}</g>
        <g transform="translate(${tx} ${ty}) scale(${s})">${glyphMarkup(charge, tincture)}</g>
        <rect width="100" height="120" fill="url(#${id}g)"/>
      </g>
      <path d="${SHIELD}" fill="none" stroke="#D2B9A0" stroke-width="3"/>
      <path d="${SHIELD}" fill="none" stroke="#D2B9A0" stroke-opacity=".35" stroke-width="1" transform="translate(50 60) scale(.88) translate(-50 -60)"/>
    </svg>`;
  }

  /* Знак независимого игрока — пустой щит той же формы */
  function independent(opt = {}) {
    const label = opt.label === false ? '' : 'Независимый игрок';
    const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
    return `<svg class="arms arms--none ${opt.className || ''}" viewBox="0 0 100 120" ${a11y}>
      <path d="${SHIELD}" fill="#1d181c" stroke="#D2B9A0" stroke-opacity=".5" stroke-width="3" stroke-dasharray="6 5"/>
    </svg>`;
  }

  /* Иконка-фигура для интерфейса (цвет — currentColor) */
  function icon(name, opt = {}) {
    const label = opt.label;
    const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
    return `<svg class="icon ${opt.className || ''}" viewBox="0 0 40 40" ${a11y}>${glyphMarkup(name, 'currentColor')}</svg>`;
  }

  L.heraldry = { arms, independent, icon, glyphs: Object.keys(GLYPHS) };
})();
