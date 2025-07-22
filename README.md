# ClearApi (Solarized Dark)

**Beautiful, Accessible OpenAPI Viewer — Now a PWA!**

ClearApi is a pure frontend Progressive Web App (PWA) for exploring any OpenAPI/Swagger JSON. No login, proxy, or backend required. Just paste your OpenAPI JSON and instantly get a beautiful, accessible, and clear visualization.

- **Solarized Dark theme** with 100% accessibility and usability focus
- **PWA**: Install as a desktop app (Dock, Launchpad, Applications)
- **No backend, no login, no proxy** — works entirely offline after first load
- **Copy-to-clipboard** for curl commands
- **Collapsible endpoint groups**
- **Clear separation of request/response schemas**
- **Mandatory fields** marked with a red asterisk
- **Keyboard and screen reader accessible**

## Usage

1. Install dependencies:
   ```
   npm install
   ```
2. Start the development server:
   ```
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.
4. Paste your OpenAPI JSON and explore your API.

## PWA Installation
- In Chrome: Click the install icon in the address bar or use "More tools > Create shortcut...".
- In Safari: Use "File > Add to Home Screen".
- The app will open standalone, with its own icon and window.
- **Offline support**: After first load, works without internet.

## Project Structure

```
ClearAPI/
  src/
    App.jsx                # Main app logic
    main.jsx               # Entry point
    styles/solarized-dark.css # Solarized Dark theme & accessibility
    components/OpenApiViewer.jsx # OpenAPI parsing & UI
  index.html               # PWA manifest, accessibility, root
  icon-192.png, icon-512.png # App icons (Solarized brutalist 'C')
  vite.config.js           # Vite + PWA config
  package.json             # Dependencies & scripts
```

## Stack
- React + Vite
- Solarized Dark Theme (custom CSS)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for PWA support

## Features
- Paste any OpenAPI/Swagger JSON (v2/v3)
- Endpoints grouped by tag or path
- Collapsible endpoint groups
- Copy curl command for each endpoint
- View request and response schemas (with modal)
- Mandatory fields marked with *
- Fully keyboard and screen reader accessible
- Works offline as a PWA

## Limitations
- No dynamic URL loading or login (paste JSON only)
- No backend or proxy (pure frontend)
- If browser cache/data is cleared, app must be reloaded once online to re-enable offline mode

---

**ClearApi** — Beautiful, accessible OpenAPI for everyone. 