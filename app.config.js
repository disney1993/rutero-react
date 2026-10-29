// Config dinámica sobre app.json: la URL de la API y los client IDs de Google
// salen de variables de entorno para no tocar código entre entornos.
//  - En local, Expo carga .env (API_BASE=http://127.0.0.1:8000).
//  - En EAS Build, los perfiles de eas.json fijan API_BASE (el .env no se sube).
// Si una variable no está definida se usa el valor de app.json.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiBase: process.env.API_BASE || config.extra.apiBase,
    googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || config.extra.googleIosClientId,
    googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || config.extra.googleAndroidClientId,
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || config.extra.googleWebClientId,
  },
});
