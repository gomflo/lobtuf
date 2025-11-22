# Scraper y App Web de Partidos de Fútbol

Aplicación completa con scraper Node.js y aplicación web Astro para extraer y mostrar partidos de fútbol de hoy desde [futbolenvivomexico.com](https://www.futbolenvivomexico.com/).

## Características

- 🔍 Scraper para extraer partidos de fútbol
- 🌐 Aplicación web con Astro y TailwindCSS
- 📱 Diseño responsive y moderno
- 🔎 Búsqueda y filtros de partidos
- 📄 Páginas dinámicas para equipos y competiciones
- 🔄 API endpoint para actualizar partidos

## Instalación

```bash
npm install
```

## Uso

### Scraper

Ejecutar el scraper manualmente:

```bash
npm start
# o
npm run scrape
```

Esto genera el archivo `partidos-hoy.json` con todos los partidos de hoy.

### Aplicación Web

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:4321`

### Build para Producción

```bash
npm run build
npm run preview
```

## Estructura del Proyecto

```
lobtuf/
├── scraper.js              # Script de scraping
├── partidos-hoy.json       # Datos de partidos (generado)
├── src/
│   ├── pages/
│   │   ├── index.astro           # Página principal
│   │   ├── equipos/[equipo].astro      # Página de equipo
│   │   ├── competiciones/[competicion].astro  # Página de competición
│   │   └── api/scrape.ts          # API endpoint
│   ├── components/
│   │   ├── MatchCard.astro        # Tarjeta de partido
│   │   ├── SearchBar.astro        # Barra de búsqueda
│   │   └── FilterBar.astro        # Barra de filtros
│   ├── layouts/
│   │   └── Layout.astro           # Layout principal
│   └── utils/
│       └── readMatches.ts         # Utilidades para leer datos
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## Formato de Datos

El archivo `partidos-hoy.json` tiene la siguiente estructura:

```json
[
  {
    "hora": "19:00",
    "competicion": "Liga Expansión MX",
    "equipoLocal": "Irapuato",
    "equipoVisitante": "Atlético Morelia",
    "canales": ["ESPN", "Disney+ Estándar", "Disney+ Premium"]
  }
]
```

## API Endpoints

### GET/POST `/api/scrape`

Ejecuta el scraper y actualiza el archivo JSON. Opcionalmente redirige a la página principal.

- `?redirect=true` - Redirige a la página principal después de ejecutar
- `?redirect=false` - Retorna JSON con el resultado

## Notas

- El scraper extrae los partidos programados para el día actual según la zona horaria del sistema.
- Si el sitio web carga contenido dinámico con JavaScript, puede ser necesario usar Puppeteer o Playwright en lugar de Cheerio.
- La aplicación lee los datos del archivo `partidos-hoy.json` generado por el scraper.

## Dependencias

- `astro` - Framework web
- `@astrojs/tailwind` - Integración TailwindCSS
- `tailwindcss` - Framework CSS
- `axios` - Para peticiones HTTP
- `cheerio` - Para parsear HTML
- `typescript` - Soporte TypeScript

# lobtuf
