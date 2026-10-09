import { es } from '@/shared/i18n';

export const MAIN_ID = 'contenido';

export function focusElement(el: HTMLElement | null) {
  if (!el) return false;
  if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'start' });
  return true;
}

/** "Saltar al contenido": primer elemento enfocable de cada pantalla. */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_ID}`}
      onClick={(e) => {
        e.preventDefault();
        focusElement(document.getElementById(MAIN_ID));
      }}
      className="sr-only z-[70] rounded bg-primary px-6 py-4 font-bold text-primary-foreground no-underline focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      {es.a11y.skipToContent}
    </a>
  );
}
