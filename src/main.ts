import './style.css';

import { Game } from './game/Game';

const mount = document.querySelector<HTMLDivElement>('#app');

if (!mount) {
  throw new Error('Missing #app mount element.');
}

const game = new Game(mount);

void game.init().catch((error: unknown) => {
  console.error('Failed to initialize Pixel Teacher Adventure.', error);
  mount.innerHTML = `
    <section class="runtime-error" role="alert">
      <p class="runtime-error__eyebrow">PIXEL TEACHER ADVENTURE</p>
      <h1>Runtime initialization failed</h1>
      <p>Please refresh the page and try again.</p>
    </section>
  `;
});
