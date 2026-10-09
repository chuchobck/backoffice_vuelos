import { describe, expect, it } from 'vitest';
import { createTokenStore, fingerprint, type StorageLike } from './tokenStore';

function memoryStorage(): StorageLike & { keys: () => string[] } {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    keys: () => [...data.keys()],
  };
}

describe('almacén del refresh token', () => {
  it('guarda en sessionStorage, rota en el mismo lugar y limpia', () => {
    const session = memoryStorage();
    const local = memoryStorage();
    const store = createTokenStore(session, local);
    local.setItem('backoffice.auth.refresh', 'viejo-en-local');
    store.write('t1');
    expect([session.keys(), local.keys()]).toEqual([['backoffice.auth.refresh'], []]);
    store.replace('t2');
    expect(session.getItem('backoffice.auth.refresh')).toBe('t2');
    store.clear();
    expect(store.read()).toBeNull();
  });

  it('marca los tokens rotados por huella, sin guardarlos', () => {
    const local = memoryStorage();
    let now = 0;
    const store = createTokenStore(memoryStorage(), local, () => now);
    store.markRotated('un-token-secreto');
    expect(store.wasRotated('un-token-secreto')).toBe(true);
    expect(store.wasRotated('otro')).toBe(false);
    expect(local.getItem('backoffice.auth.rotated')).not.toContain('un-token-secreto');
    now += 11 * 60_000;
    expect(store.wasRotated('un-token-secreto')).toBe(false);
  });

  it('sin almacenamiento disponible no rompe', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };
    const store = createTokenStore(broken, null);
    expect(() => store.write('t')).not.toThrow();
    expect(store.read()).toBeNull();
  });

  it('la huella es estable y corta', () => {
    expect(fingerprint('abc')).toBe(fingerprint('abc'));
    expect(fingerprint('abc')).not.toBe(fingerprint('abd'));
    expect(fingerprint('x'.repeat(43))).toMatch(/^[0-9a-f]{8}$/);
  });
});
