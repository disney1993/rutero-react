# Rutero React

Cliente **Expo 48** (React Native + web) para **Rutero**: propietarios y conductores gestionan rutas/traslados frente a la API Laravel.

## Descripción

- **Mis rutas**: en **web**, agenda **FullCalendar** (día ~26h con hombros −02:00→26:00, semana y lista unificadas). En **nativo**, lista del día. Crear/editar rutas con origen/destino, distancia, precio, vehículo y estado.
- **Mis vehículos**: alta/edición (matrícula, marca/modelo, color, plazas…).
- **Jornadas (driver)**: unirse por código, jornada A–C del día, planner acotado a esa jornada.
- **Admin**: búsqueda de usuarios, vehículos/rutas e informes.
- **Perfil**: datos, precio/km, moneda, tema, idioma (ES/EN), preferencia de modo (owner / driver).
- Auth email o **Google**; UI Paper + drawer.

Backend: [`rutero-api`](../rutero-api) → por defecto `http://127.0.0.1:8000`.

## Requisitos

- Node.js + npm
- API `rutero-api` en marcha
- Navegador (web) y/o Expo Go / emulador

## Instalación

```powershell
cd C:\laragon\www\rutero-react
npm install
```

## Comandos de uso

### API primero (otra terminal)

```powershell
cd C:\laragon\www\rutero-api
php artisan serve --host=127.0.0.1 --port=8000
```

### Arrancar el frontend

```powershell
cd C:\laragon\www\rutero-react
npm run web
```

| Recurso     | URL / comando |
|-------------|----------------|
| Web (Webpack) | http://localhost:19006 (Expo también en :19000) |
| Bundler QR    | `npm run start` → Expo Go |
| Android       | `npm run android` |
| iOS           | `npm run ios` (macOS + Xcode) |

Scripts npm:

```powershell
npm run start    # expo start
npm run web      # expo start --web
npm run android  # expo run:android
npm run ios      # expo run:ios
```

Si el puerto 19000 está ocupado, libera procesos o elige otro puerto cuando Expo lo pregunte.

## Stack

- UI: `react-native-paper`, tema claro/oscuro
- Nav: `@react-navigation` (stack + drawer)
- Agenda web: `@fullcalendar/*` (timeGrid + list)
- Calendario nativo auxiliar: `react-native-calendars`
- i18n: `i18next` / `react-i18next`
- Google: `expo-auth-session`
- HTTP: `axios` → `src/utils/apiClient.js` (`apiBase` desde `app.json` → `expo.extra`)

## Configuración

### API base

`app.json` → `expo.extra.apiBase` (default `http://127.0.0.1:8000`).

### Google Sign-In (opcional)

Client IDs en `app.json` → `expo.extra`:

- `googleWebClientId`
- `googleIosClientId` / `googleAndroidClientId`

En el backend: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_MAPS_API_KEY`.

## Roles en la app

| Rol / modo | Pantallas típicas |
|------------|-------------------|
| Owner      | Rutas, vehículos, códigos / jornadas de drivers |
| Driver     | Mis jornadas, planner de la jornada activa |
| Admin      | Dashboard + detalle de usuario |

Registro driver: `owner_code` del propietario. Google: `id_token` → `POST /api/auth/google/mobile`.

## Endpoints que usa el cliente

`/api/register`, `/api/login`, `/api/auth/google/mobile`, `/api/user`, `/api/rutas`, `/api/vehicles`, `/api/jornadas`, `/api/owner/codes`, `/api/driver/join-code`, `/api/geocode/*`, `/api/admin/*`.

Más detalle de API: [`rutero-api/README.md`](../rutero-api/README.md).
