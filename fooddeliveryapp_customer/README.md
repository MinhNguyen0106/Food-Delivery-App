# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside `src/app/`. This project
uses [file-based routing](https://docs.expo.dev/router/introduction).

## Customer app structure

Application routes are under `src/app/` and use Expo Router. Authentication
screens live in `src/app/(auth)/`; shared UI, API services, validation, and
session management are kept outside the route directory.

Authentication calls the backend at `POST /api/auth/login` and
`POST /api/auth/register`. The Customer app also connects profile/logout/password,
catalog, cart, addresses, checkout, orders, vouchers, and reviews to the backend.
Configure `EXPO_PUBLIC_API_BASE_URL` in a local
`.env` file as the backend origin (for example, `http://localhost:3000`); the
API client adds `/api` automatically. For Android Emulator, use
`http://10.0.2.2:3000`; for a physical device, use the backend computer's
LAN address and ensure both devices can reach each other. Restart Expo after
changing the environment variable.
For web development, the backend's `CORS_ORIGINS` must include the exact Expo
web origin (including its port), or the browser will block API responses.

The customer app uses the authenticated API for the flows above. Checkout totals
are calculated by the backend, not estimated or submitted by the client. Order
status can be refreshed from the order detail screen; the backend does not expose
GPS or realtime shipper coordinates.

Address selection uses OpenStreetMap data without an API token. The Web map
uses Leaflet; native maps display OpenStreetMap tiles in a WebView. Address
search and reverse geocoding use the public Nominatim service. Search is
explicitly submitted by the user (no autocomplete), and requests are serialized
with at least 1.1 seconds between calls to respect its usage policy. The
service is community-run, has no availability guarantee, and is intended for
low-volume use. The public standard tile service is also capacity-limited:
keep the visible OpenStreetMap attribution, do not bulk-download or prefetch
tiles, and use a dedicated OSM tile provider or self-hosted service before
scaling to production or significant traffic.

The map can choose a point by tapping or dragging its marker and can optionally
use device location after permission is granted. Users can also search for a
Vietnamese address and select a matching result; the map centers on that
result and the address remains editable before it is saved to the backend.

Native builds keep the authentication token in Expo SecureStore. Web builds use
browser local storage because SecureStore is not available on web; do not treat
browser storage as equivalent to native secure storage. Restaurant and food
photography is loaded from Unsplash, so those images require network access.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
