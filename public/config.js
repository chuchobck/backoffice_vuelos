// Configuración en tiempo de ejecución del backoffice. Se edita en el sitio publicado, sin recompilar.
//
// Todo entra por el gateway. Hay dos bases, una por servicio:
//   API_URL       core:     catálogo, auditoría y reservas          → https://<gateway>/flights/v1
//   IDENTITY_URL  identity: ingreso, sesión y administradores       → https://<gateway>/identity/v1
// IDENTITY_URL es opcional: si falta, se deriva de API_URL cambiando /flights/v1 por /identity/v1.
// Si API_URL no termina en /flights/v1, IDENTITY_URL es obligatoria. Un valor inválido detiene la aplicación
// y muestra qué corregir.
//
// Ejemplos:
//   Detrás del gateway:   API_URL: "https://<gateway>/flights/v1"
//   Explícita:            IDENTITY_URL: "https://<gateway>/identity/v1"
//   Desarrollo (npm run dev lo sirve solo; el proxy de Vite reenvía al gateway local): "/flights/v1" y "/identity/v1"
window.BACKOFFICE_CONFIG = {
  API_URL: "https://quinde-vuelos-api.onrender.com/flights/v1"
  // IDENTITY_URL: "https://quinde-vuelos-api.onrender.com/identity/v1"
};
