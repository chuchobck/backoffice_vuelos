import { describe, expect, it } from 'vitest';
import { normalizeBase, resolveConfig } from './config';

describe('configuración: API_URL e IDENTITY_URL', () => {
  it('IDENTITY_URL explícita: se usa tal cual (sin barra final) y no se marca como derivada', () => {
    const c = resolveConfig({ API_URL: 'https://gw.example.com/flights/v1/', IDENTITY_URL: 'https://id.example.com/identity/v1/' });
    expect(c).toEqual({ apiUrl: 'https://gw.example.com/flights/v1', identityUrl: 'https://id.example.com/identity/v1', identityDerived: false, issues: [] });
  });

  it('sin IDENTITY_URL: se deriva de API_URL cambiando /flights/v1 por /identity/v1', () => {
    const c = resolveConfig({ API_URL: 'https://gw.example.com/flights/v1' });
    expect(c).toMatchObject({ apiUrl: 'https://gw.example.com/flights/v1', identityUrl: 'https://gw.example.com/identity/v1', identityDerived: true, issues: [] });
  });

  it('la derivación respeta un prefijo del gateway y funciona con rutas relativas (proxy de desarrollo)', () => {
    expect(resolveConfig({ API_URL: 'https://gw.example.com/api/flights/v1' }).identityUrl).toBe('https://gw.example.com/api/identity/v1');
    expect(resolveConfig({ API_URL: '/flights/v1' })).toMatchObject({ identityUrl: '/identity/v1', identityDerived: true, issues: [] });
    expect(resolveConfig({ API_URL: 'https://gw.example.com/FLIGHTS/V1' }).identityUrl).toBe('https://gw.example.com/identity/v1');
  });

  it('una IDENTITY_URL vacía o de solo espacios cuenta como ausente', () => {
    expect(resolveConfig({ API_URL: 'https://gw.example.com/flights/v1', IDENTITY_URL: '   ' })).toMatchObject({ identityDerived: true, issues: [] });
  });

  it('sin config.js se usa la API de producción por defecto y se deriva identity', () => {
    const c = resolveConfig(undefined);
    expect(c.apiUrl).toMatch(/^https:\/\/.+\/flights\/v1$/);
    expect(c.identityUrl).toMatch(/\/identity\/v1$/);
    expect(c.issues).toEqual([]);
  });

  it('API_URL inválida: es un error y no se inventa ninguna base', () => {
    for (const bad of ['ftp://x.example.com/flights/v1', 'no es una url', 'https://u:p@x.example.com/flights/v1', 'https://x.example.com/flights/v1?a=1', '//evil.example.com/flights/v1', 42 as unknown as string]) {
      const c = resolveConfig({ API_URL: bad, IDENTITY_URL: 'https://id.example.com/identity/v1' });
      expect(c.issues).toEqual([{ code: 'API_URL_INVALID', value: String(bad) }]);
      expect(c.apiUrl).toBe('');
    }
  });

  it('IDENTITY_URL inválida: es un error (no se cae en silencio a la derivada)', () => {
    const c = resolveConfig({ API_URL: 'https://gw.example.com/flights/v1', IDENTITY_URL: 'identity' });
    expect(c.issues).toEqual([{ code: 'IDENTITY_URL_INVALID', value: 'identity' }]);
    expect(c.identityUrl).toBe('');
  });

  it('sin IDENTITY_URL y con API_URL que no termina en /flights/v1: no se puede derivar', () => {
    const c = resolveConfig({ API_URL: 'https://gw.example.com/api' });
    expect(c.issues).toEqual([{ code: 'IDENTITY_URL_UNDERIVABLE', value: 'https://gw.example.com/api' }]);
    expect(c.identityUrl).toBe('');
  });

  it('los dos errores a la vez se informan juntos', () => {
    const c = resolveConfig({ API_URL: 'x', IDENTITY_URL: 'y' });
    expect(c.issues.map((i) => i.code)).toEqual(['API_URL_INVALID', 'IDENTITY_URL_INVALID']);
  });

  it('normalizeBase: acepta http(s) y rutas del mismo origen; rechaza lo demás', () => {
    expect(normalizeBase('http://localhost:8080/flights/v1')).toBe('http://localhost:8080/flights/v1');
    expect(normalizeBase(' /identity/v1// ')).toBe('/identity/v1');
    for (const bad of ['', '   ', 'javascript:alert(1)', 'data:text/plain,x', '/a b', '/a?b', '/a#b', null, undefined, {}]) expect(normalizeBase(bad)).toBeNull();
  });
});
