# Temporizador de Entrenamiento (PWA)

Aplicación PWA hecha con Vite + React + TypeScript para cronometrar rutinas con fases de calentamiento, intervalos de trabajo/descanso y enfriamiento. Funciona offline, permite elegir tema (claro/oscuro/sistema), idioma (ES/EN) y tonos de alerta.

## Características
- Fases: calentamiento → trabajo/descanso × N → enfriamiento → completado.
- Controles: iniciar, pausar/reanudar, siguiente, anterior, reiniciar.
- Precisión por tiempo objetivo (corrige lags al cambiar de pestaña).
- PWA: caché offline, registro `autoUpdate` y aviso de nueva versión.
- Preferencias persistentes en `localStorage`.
- Wake Lock (cuando está activo) para mantener la pantalla encendida.
- Tema claro/oscuro/sistema.
- Idiomas: Español / English.
- Tonos de alerta: silencio, beep, campana, clic, madera, triple.

## Requisitos
- Node.js 18+
- npm o pnpm

## Desarrollo
```bash
npm install
npm run dev
```

## Producción
```bash
npm run build
npm run preview
```

## Estructura
- `vite.config.ts`: configuración de Vite y PWA (incluye `base` para GitHub Pages).
- `public/manifest.webmanifest`: manifiesto web PWA.
- `src/App.tsx`: lógica de temporizador, UI y ajustes.
- `src/main.tsx`: bootstrap de React y registro del SW.
- `src/styles.css`: estilos y variables de tema.

## Despliegue en GitHub Pages
El repositorio incluye un workflow en `.github/workflows/deploy.yml` que:
- Construye la app con Node 18 y Vite.
- Publica el artefacto a GitHub Pages usando `actions/deploy-pages`.

Pasos:
1. Asegúrate de que el repositorio sea `PabloGGuizar/temporizador-entrenamiento` (coincide con la `base` de Vite `"/temporizador-entrenamiento/"`).
2. Haz push a la rama `main` (el workflow se ejecutará automáticamente en GitHub Actions).
3. En la configuración del repositorio (Settings → Pages), selecciona “GitHub Actions” como fuente si aún no está activado.

La app quedará disponible en:
```
https://pablogguizar.github.io/temporizador-entrenamiento/
```

## Iconos PWA
Para una instalación óptima en dispositivos, añade PNGs en `public/icons/` y referencia en el manifest:
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`

Ejemplo de entrada en `public/manifest.webmanifest`:
```json
{
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

## Licencia
MIT (o la que prefieras). Actualmente no se incluye cabecera de licencia en los archivos fuente.
