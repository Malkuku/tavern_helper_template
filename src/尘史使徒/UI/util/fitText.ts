import type { Directive } from 'vue';

interface FitTextState {
  animation?: Animation;
  content: HTMLElement;
  frame?: number;
  maxFontSize: number;
  minFontSize: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  observer: ResizeObserver;
}

const states = new WeakMap<HTMLElement, FitTextState>();

const scheduleFit = (element: HTMLElement) => {
  const state = states.get(element);
  if (!state) return;

  if (state.frame !== undefined) cancelAnimationFrame(state.frame);
  state.frame = requestAnimationFrame(() => {
    state.animation?.cancel();
    state.animation = undefined;
    state.content.style.transform = '';
    state.content.style.fontSize = `${state.maxFontSize}px`;

    let fontSize = state.maxFontSize;
    while (fontSize > state.minFontSize && state.content.scrollWidth > element.clientWidth) {
      fontSize = Math.max(state.minFontSize, fontSize - 0.5);
      state.content.style.fontSize = `${fontSize}px`;
    }

    element.dataset.textOverflowing = String(state.content.scrollWidth > element.clientWidth);
  });
};

export const vFitText: Directive<HTMLElement> = {
  mounted(element) {
    const content = element.querySelector<HTMLElement>('[data-fit-text-content]');
    if (!content) return;

    const maxFontSize = Number.parseFloat(getComputedStyle(content).fontSize);
    content.style.fontSize = 'var(--fit-text-min-font-size, 0.75rem)';
    const minFontSize = Number.parseFloat(getComputedStyle(content).fontSize);
    content.style.fontSize = `${maxFontSize}px`;

    const onMouseEnter = () => {
      const state = states.get(element);
      if (
        !state ||
        element.dataset.textOverflowing !== 'true' ||
        matchMedia('(prefers-reduced-motion: reduce)').matches
      )
        return;

      const distance = state.content.scrollWidth - element.clientWidth;
      state.animation = state.content.animate(
        [
          { transform: 'translateX(0)', offset: 0 },
          { transform: 'translateX(0)', offset: 0.12 },
          { transform: `translateX(-${distance}px)`, offset: 0.7 },
          { transform: `translateX(-${distance}px)`, offset: 0.85 },
          { transform: 'translateX(0)', offset: 1 },
        ],
        { duration: Math.max(3000, distance * 35 + 1800), easing: 'ease-in-out', iterations: Infinity },
      );
    };
    const onMouseLeave = () => {
      const state = states.get(element);
      state?.animation?.cancel();
      if (state) state.animation = undefined;
    };

    const observer = new ResizeObserver(() => scheduleFit(element));
    states.set(element, { content, maxFontSize, minFontSize, observer, onMouseEnter, onMouseLeave });
    observer.observe(element);
    element.addEventListener('mouseenter', onMouseEnter);
    element.addEventListener('mouseleave', onMouseLeave);
    scheduleFit(element);
  },
  updated(element) {
    scheduleFit(element);
  },
  unmounted(element) {
    const state = states.get(element);
    if (!state) return;
    state.animation?.cancel();
    state.observer.disconnect();
    element.removeEventListener('mouseenter', state.onMouseEnter);
    element.removeEventListener('mouseleave', state.onMouseLeave);
    if (state.frame !== undefined) cancelAnimationFrame(state.frame);
    states.delete(element);
  },
};
