/**
 * Modo de datos: `real` (HTTP contra la API) o `demo` (en memoria, sin red). Se elige en el login y
 * se recuerda en sessionStorage mientras dure la pestaña. No se mezclan nunca.
 */
import { useSyncExternalStore } from 'react';

export type ApiMode = 'real' | 'demo';

const KEY = 'backoffice.mode';
const listeners = new Set<() => void>();

function readStored(): ApiMode {
  try {
    return window.sessionStorage.getItem(KEY) === 'demo' ? 'demo' : 'real';
  } catch {
    return 'real';
  }
}

let mode: ApiMode = typeof window === 'undefined' ? 'real' : readStored();

export const getApiMode = (): ApiMode => mode;

export function setApiMode(next: ApiMode): void {
  if (next === mode) return;
  mode = next;
  try {
    if (next === 'demo') window.sessionStorage.setItem(KEY, 'demo');
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* almacenamiento bloqueado: el modo dura lo que la pestaña en memoria */
  }
  for (const l of listeners) l();
}

export const subscribeApiMode = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useApiMode(): ApiMode {
  return useSyncExternalStore(subscribeApiMode, getApiMode, () => 'real');
}

export const useIsDemo = () => useApiMode() === 'demo';
