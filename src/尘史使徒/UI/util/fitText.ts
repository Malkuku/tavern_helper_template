import type { Directive } from 'vue';

interface FitTextState {
  frame?: number;
  maxFontSize: number;
  minFontSize: number;
  observer: ResizeObserver;
}

const states = new WeakMap<HTMLElement, FitTextState>();

const scheduleFit = (element: HTMLElement) => {
  const state = states.get(element);
  if (!state) return;

  if (state.frame !== undefined) cancelAnimationFrame(state.frame);
  state.frame = requestAnimationFrame(() => {
    element.style.fontSize = `${state.maxFontSize}px`;

    let fontSize = state.maxFontSize;
    while (fontSize > state.minFontSize && element.scrollWidth > element.clientWidth) {
      fontSize = Math.max(state.minFontSize, fontSize - 0.5);
      element.style.fontSize = `${fontSize}px`;
    }
  });
};

export const vFitText: Directive<HTMLElement> = {
  mounted(element) {
    const maxFontSize = Number.parseFloat(getComputedStyle(element).fontSize);
    element.style.fontSize = 'var(--fit-text-min-font-size, 0.75rem)';
    const minFontSize = Number.parseFloat(getComputedStyle(element).fontSize);
    element.style.fontSize = `${maxFontSize}px`;

    const observer = new ResizeObserver(() => scheduleFit(element));
    states.set(element, { maxFontSize, minFontSize, observer });
    if (element.parentElement) observer.observe(element.parentElement);
    scheduleFit(element);
  },
  updated(element) {
    scheduleFit(element);
  },
  unmounted(element) {
    const state = states.get(element);
    if (!state) return;
    state.observer.disconnect();
    if (state.frame !== undefined) cancelAnimationFrame(state.frame);
    states.delete(element);
  },
};
