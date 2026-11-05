/* LATERIA · Играть — адрес сервера и копирование */
(function () {
  'use strict';
  const L = window.LATERIA;
  const srv = L.data.world.server;

  const code = document.getElementById('server-address');
  const btn = document.getElementById('copy-address');
  const label = btn.querySelector('[data-copy-label]');
  const status = document.getElementById('copy-status');

  code.textContent = srv.address;
  document.getElementById('server-info').innerHTML = `
    <dt>Порт</dt><dd>${srv.port} (по умолчанию, указывать не нужно)</dd>
    <dt>Клиент</dt><dd>${L.esc(srv.client)}</dd>
    <dt>Регион</dt><dd>${L.esc(srv.region)}</dd>
    <dt>Язык</dt><dd>${L.esc(srv.language)}</dd>`;

  let timer;
  btn.addEventListener('click', async () => {
    const ok = await L.copy(srv.address);
    label.textContent = ok ? 'Скопировано' : 'Не удалось';
    status.textContent = ok
      ? `Адрес ${srv.address} скопирован в буфер обмена.`
      : 'Браузер запретил доступ к буферу обмена — выделите адрес и скопируйте вручную.';
    if (!ok) {
      const range = document.createRange();
      range.selectNodeContents(code);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    clearTimeout(timer);
    timer = setTimeout(() => { label.textContent = 'Копировать'; }, 2500);
  });
})();
