# Rutero (app móvil/web)

Cliente en React Native (Expo) para **Rutero**, una app para propietarios de vehículos y conductores que gestionan rutas de transporte de clientes (traslados, taxis privados, viajes concertados, etc.).

## ¿Qué hace la app?

- **Mis rutas**: calendario mensual + vista diaria (ordenada por hora exacta) para crear, editar y eliminar rutas — cliente, teléfono, origen/destino con autocompletado de direcciones, distancia y precio calculados automáticamente, fecha/hora, pasajeros, vehículo, estado y precio final.
- **Mis vehículos**: alta de vehículos propios (matrícula, marca/modelo con autocompletado, color, año, plazas) usados luego al crear rutas.
- **Como conductor**: introduciendo el código mensual de un propietario, el conductor ve y gestiona las rutas que le asigna o crea para ese propietario, sin acceso a sus informes de ingresos.
- **Panel de administración** (rol `admin`): búsqueda y edición de usuarios, gestión de sus vehículos y rutas, e informes agregados.
- **Perfil**: datos personales, color de avatar, precio por km/moneda por defecto, tema claro/oscuro/sistema e idioma (español/inglés).
- **Cierre automático de viajes**: el cron de la API marca cada viaje como completado y pagado en efectivo cuando empieza el siguiente viaje o, como tarde, a la hora de fin estimada: inicio + espera inicial (10 min) + duración por carretera + 10 % por tráfico + 5 min de bajada y cobro. La app avisa de ello de varias formas:
  - en el formulario de ruta indica a qué hora se completará el viaje;
  - en la jornada muestra "Se completará sola hacia las…";
  - la primera vez explica el funcionamiento en un diálogo;
  - al cerrarse un viaje muestra un aviso **solo informativo** (sin botones, sonido ni vibración; se oculta en 6 s), para no invitar a tocar el móvil al volante.

  Las correcciones se hacen en **«Por revisar»** (marcar como correcto, corregir o deshacer), con el vehículo detenido. Los márgenes se configuran, o se desactiva el cierre, en **Ajustes**. La jornada abierta se refresca cada minuto.

El backend (API REST con Sanctum) está en [`rutero-api`](../rutero-api), en el mismo entorno Laragon.

## Requisitos

- Node.js + npm
- Expo CLI (se instala bajo demanda con `npx`/`npm run`)
- Expo Go (móvil) o un navegador (para `--web`)
- La API `rutero-api` corriendo en `http://127.0.0.1:8000` (ver su README)

## Instalación

```powershell
cd c:\laragon\www\rutero-react
npm install
```

## Ejecutar el frontend

Con la API ya corriendo (ver [`rutero-api/README.md`](../rutero-api/README.md)):

```powershell
cd c:\laragon\www\rutero-react
npm run web
# equivale a: expo start --web
```

También puedes usar:

```powershell
npm run start   # abre el bundler de Expo; escanea el QR con Expo Go (SDK 57) en el móvil
npm run android # abre la app en Expo Go del emulador/dispositivo Android conectado
npm run ios     # abre la app en Expo Go del simulador iOS (macOS)
```

## Ejecutar la API (rutero-api)

En otra terminal:

```powershell
cd c:\laragon\www\rutero-api
C:\tools\php85\php.exe artisan serve --host=127.0.0.1 --port=8000
```

Más detalles (instalación, migraciones, seeders, endpoints) en [`rutero-api/README.md`](../rutero-api/README.md).

## Stack

- UI: `react-native-paper` (Material Design), tema claro/oscuro
- Expo SDK 57 (React Native nueva arquitectura) + NativeWind 4
- Navegación: `@react-navigation/native` 7 + `bottom-tabs` (barra estilo Instagram) + `native-stack` por pestaña
- Respuesta háptica: `expo-haptics` (desactivable en Ajustes)
- Calendario: `react-native-calendars`
- i18n: `i18next` / `react-i18next` (español/inglés)
- Notificaciones: `react-native-flash-message`
- Autenticación Google: `expo-auth-session`

## Flujo de registro y roles

El backend soporta roles `admin`, `owner` (propietario) y `driver` (conductor).

- Para registrarse como `driver` asociado a un `owner`, se introduce el `owner_code` del propietario durante el registro (o después, desde "Como conductor").
- Para Google Sign-In la app obtiene un `id_token` y lo envía a `POST /api/auth/google/mobile` para crear/recuperar la sesión.

## Integración con backend

- `apiBase` apunta por defecto a `http://127.0.0.1:8000`; en desarrollo, en móvil/emulador se sustituye automáticamente por la IP del PC que sirve Metro — revisa `src/utils/apiClient.js` si cambias el host/puerto de la API.
- Endpoints principales usados: `/api/register`, `/api/login`, `/api/auth/google/mobile`, `/api/rutas`, `/api/vehicles`, `/api/owner/codes`, `/api/driver/join-code`, `/api/geocode/*`, `/api/admin/*`.

## Configuración de Google Sign-In (opcional)

Si quieres habilitar el login con Google:

- Crea client IDs (iOS, Android y/o Web) en Google Cloud.
- Añádelos en `app.json` → `expo.extra` o en variables de entorno locales antes de compilar.
