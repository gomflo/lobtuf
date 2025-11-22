<!-- 0458d1d0-c2d2-49e4-af02-e474a57285d6 66d233bd-5896-4c0c-a61c-7e81150a95c0 -->
# Aplicación Web Astro para Partidos de Fútbol

## Objetivo

Crear una aplicación web con Astro y TailwindCSS que muestre los partidos de fútbol extraídos del scraper, con múltiples páginas, API endpoint y búsqueda.

## Estructura del Proyecto

### Archivos a crear:

1. `astro.config.mjs` - Configuración de Astro con integración de TailwindCSS
2. `package.json` - Dependencias del proyecto (Astro, TailwindCSS, etc.)
3. `tsconfig.json` - Configuración TypeScript
4. `tailwind.config.mjs` - Configuración de TailwindCSS
5. `src/pages/index.astro` - Página principal con lista de partidos
6. `src/pages/equipos/[equipo].astro` - Página de detalle de equipo
7. `src/pages/competiciones/[competicion].astro` - Página de competición
8. `src/pages/api/scrape.ts` - API endpoint para ejecutar el scraper
9. `src/components/MatchCard.astro` - Componente para mostrar un partido
10. `src/components/SearchBar.astro` - Componente de búsqueda
11. `src/components/FilterBar.astro` - Componente de filtros
12. `src/utils/readMatches.ts` - Utilidad para leer el JSON de partidos
13. `.gitignore` - Actualizar para incluir archivos de Astro

## Dependencias

- `astro` - Framework principal
- `@astrojs/tailwind` - Integración de TailwindCSS
- `tailwindcss` - Framework CSS
- `typescript` - Soporte TypeScript
- Mover `axios` y `cheerio` al proyecto principal (o mantenerlos separados)

## Implementación

### Estructura de páginas:

1. **Página principal (`/`)**: 

- Lista todos los partidos de hoy
- Barra de búsqueda para buscar por equipo o competición
- Filtros por competición y hora
- Botón para ejecutar scraper manualmente

2. **Página de equipo (`/equipos/[equipo]`)**:

- Muestra todos los partidos del equipo seleccionado
- Información del equipo

3. **Página de competición (`/competiciones/[competicion]`)**:

- Muestra todos los partidos de la competición seleccionada
- Información de la competición

### API Endpoint:

- `GET/POST /api/scrape`: Ejecuta el scraper y actualiza el JSON
- Retorna el resultado del scraping

### Componentes:

- **MatchCard**: Tarjeta visual para cada partido con hora, equipos, competición y canales
- **SearchBar**: Input de búsqueda con filtrado en tiempo real
- **FilterBar**: Filtros por competición y rango de horas

### Estilos:

- Diseño moderno y responsive con TailwindCSS
- Cards con hover effects
- Colores temáticos relacionados con fútbol
- Diseño mobile-first

## Consideraciones:

- El scraper se ejecuta como API endpoint, no automáticamente
- Los datos se leen del archivo JSON generado por el scraper
- La búsqueda funciona en el cliente (filtrado del JSON)
- Manejar casos donde no hay partidos disponibles

### To-dos

- [ ] Crear package.json con dependencias (axios, cheerio) y configuración básica
- [ ] Implementar script scraper.js que extrae partidos de la página web
- [ ] Implementar función para guardar datos en formato JSON (partidos-hoy.json)
- [ ] Agregar manejo de errores para peticiones HTTP y parsing
- [ ] Crear .gitignore para node_modules y archivos generados
- [ ] Configurar proyecto Astro con TailwindCSS y TypeScript
- [ ] Crear API endpoint /api/scrape para ejecutar el scraper
- [ ] Crear utilidad para leer el archivo JSON de partidos
- [ ] Crear componentes MatchCard, SearchBar y FilterBar
- [ ] Crear página principal con lista de partidos y funcionalidad de búsqueda
- [ ] Crear página dinámica para mostrar partidos de un equipo específico
- [ ] Crear página dinámica para mostrar partidos de una competición específica
- [ ] Aplicar estilos con TailwindCSS y hacer el diseño responsive