import { useEffect, useRef } from 'react';
let openDialogs = 0;
let previousOverflow = '';
export function useDialog() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    if (!node) return;
    if (openDialogs === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openDialogs++;
    const controls = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not(:disabled):not([tabindex="-1"]),input:not(:disabled):not([tabindex="-1"]),select:not(:disabled):not([tabindex="-1"]),textarea:not(:disabled):not([tabindex="-1"]),[tabindex="0"]',
        ),
      ).filter((e) => e.offsetParent !== null);
    controls()[0]?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = controls(),
        first = focusable[0],
        last = focusable.at(-1);
      if (!first) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', listener);
    return () => {
      openDialogs--;
      if (openDialogs === 0) document.body.style.overflow = previousOverflow;
      node.removeEventListener('keydown', listener);
      previous?.focus();
    };
  }, []);
  return ref;
}
