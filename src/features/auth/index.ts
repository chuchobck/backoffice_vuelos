/** Sesión y login. Solo lo que se exporte aquí es público. */
export { AuthProvider, useAuth, type AuthContextValue } from './AuthProvider';
export { session } from './instance';
export { LoginForm } from './LoginForm';
export type { SessionEndReason, SessionState, SessionStatus } from './session';
// Para construir una sesión con otras dependencias (pruebas).
export { createLocalLock, type ChannelLike, type LockLike } from './crossTab';
export { ADMIN_SCOPE, SessionManager } from './session';
export { createTokenStore, type StorageLike, type TokenStore } from './tokenStore';
