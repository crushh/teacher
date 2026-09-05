export interface DialogueOverlay {
  readonly root: HTMLDivElement;
  setLine(speaker: string, text: string): void;
  reset(): void;
  destroy(): void;
}

export function createDialogueOverlay(parent: HTMLElement): DialogueOverlay {
  const root = document.createElement('div');
  root.className = 'dialogue-overlay';
  root.dataset.testid = 'classroom-dialogue';
  root.setAttribute('aria-live', 'polite');
  root.innerHTML = `
    <span class="dialogue-overlay__speaker"></span>
    <span class="dialogue-overlay__text"></span>
  `;
  parent.appendChild(root);

  const speaker = root.querySelector<HTMLSpanElement>('.dialogue-overlay__speaker');
  const text = root.querySelector<HTMLSpanElement>('.dialogue-overlay__text');
  if (!speaker || !text) {
    root.remove();
    throw new Error('Dialogue overlay markup is incomplete.');
  }

  return {
    root,
    setLine(nextSpeaker: string, nextText: string): void {
      speaker.textContent = nextSpeaker;
      text.textContent = nextText;
    },
    reset(): void {
      speaker.textContent = '';
      text.textContent = '';
      root.style.opacity = '0';
      root.style.visibility = 'hidden';
    },
    destroy(): void {
      root.remove();
    },
  };
}
