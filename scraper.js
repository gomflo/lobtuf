import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

const URL = "https://www.futbolenvivomexico.com/";
const OUTPUT_FILE = "partidos-hoy.json";

/**
 * Obtiene la fecha de hoy en formato usado por el sitio web
 * @returns {string} Fecha en formato DD/MM/YYYY
 */
const getTodayDate = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Extrae el nombre de un canal desde un texto
 * @param {string} text - Texto a analizar
 * @returns {string|null} Nombre del canal encontrado o null
 */
const extractChannelFromText = (text) => {
  if (!text) return null;
  
  const knownChannels = [
    'ESPN', 'ESPN 2', 'ESPN 3', 'ESPN 4', 'ESPN+', 'ESPN Deportes',
    'TUDN', 'TUDN USA',
    'Fox', 'Fox Sports', 'FOX One', 'FOX',
    'SKY Sports', 'Sky Sports',
    'Claro', 'Claro Sports',
    'Azteca', 'Azteca 7', 'Azteca 13',
    'Disney', 'Disney+', 'Disney+ Premium', 'Disney+ Estándar',
    'YouTube', 'Youtube',
    'HBO MAX', 'HBO Max',
    'TNT', 'TNT Sports',
    'Tubi',
    'TV5MONDE',
    'OneFootball', 'OneFootball PPV',
    'FIFA+',
    'MLS Season Pass',
    'TyC Sports', 'TyC Sports Internacional',
    'RCN', 'RCN Nuestra Tele',
    'FUTV',
    'Caliente TV',
  ];
  
  // Buscar el canal más largo que coincida (para capturar nombres completos)
  let longestMatch = null;
  let longestLength = 0;
  
  for (const channel of knownChannels) {
    if (text.includes(channel) && channel.length > longestLength) {
      longestMatch = channel;
      longestLength = channel.length;
    }
  }
  
  return longestMatch;
};

/**
 * Normaliza el nombre de un canal para evitar duplicados
 * @param {string} canal - Nombre del canal a normalizar
 * @returns {string} Nombre normalizado
 */
const normalizeChannelName = (canal) => {
  if (!canal) return canal;
  
  // Normalizar variaciones comunes
  const normalizations = {
    'Youtube': 'YouTube',
    'SKY Sports': 'SKY Sports',
    'Sky Sports': 'SKY Sports',
    'Disney+': 'Disney+',
    'Disney Plus': 'Disney+',
    'HBO MAX': 'HBO MAX',
    'HBO Max': 'HBO MAX',
    'TNT Sports': 'TNT Sports',
    'TNT': 'TNT',
  };
  
  // Verificar si hay una normalización específica
  for (const [key, value] of Object.entries(normalizations)) {
    if (canal.includes(key)) {
      return value;
    }
  }
  
  return canal.trim();
};

/**
 * Extrae los partidos de la página HTML
 * @param {string} html - Contenido HTML de la página
 * @returns {Array} Array de objetos con información de partidos
 */
const extractMatches = (html) => {
  const $ = cheerio.load(html);
  const matches = [];
  const todayDate = getTodayDate();

  console.log(`🔍 Buscando partidos para la fecha: ${todayDate}`);

  // Buscar la sección de partidos de hoy
  // El sitio muestra los partidos en una tabla con la fecha en el encabezado
  const dateHeaders = $(
    `th:contains("${todayDate}"), caption:contains("${todayDate}"), h2:contains("${todayDate}"), h3:contains("${todayDate}"), div:contains("${todayDate}")`
  );

  console.log(`📅 Headers con fecha encontrados: ${dateHeaders.length}`);

  // Determinar qué tablas/secciones pertenecen a la fecha de hoy
  let tablesToProcess = $();
  
  if (dateHeaders.length > 0) {
    console.log("✅ Encontrados headers con fecha, buscando tablas asociadas...");
    // Si encontramos headers con la fecha, buscar las tablas asociadas
    dateHeaders.each((index, header) => {
      const $header = $(header);
      // Buscar la tabla más cercana después del header
      let $table = $header.closest("table");
      if ($table.length === 0) {
        // Si no está dentro de una tabla, buscar la siguiente tabla
        $table = $header.nextAll("table").first();
      }
      if ($table.length > 0) {
        tablesToProcess = tablesToProcess.add($table);
      }
    });
  }

  // Si no encontramos headers específicos, buscar en todas las tablas
  // pero filtrar por contenido que contenga la fecha de hoy
  if (tablesToProcess.length === 0) {
    console.log("🔍 Buscando tablas que contengan la fecha...");
    $("table").each((index, table) => {
      const $table = $(table);
      const tableText = $table.text();
      // Verificar si la tabla contiene la fecha de hoy
      if (tableText.includes(todayDate)) {
        tablesToProcess = tablesToProcess.add($table);
      }
    });
  }

  // Si aún no encontramos tablas, procesar todas pero con filtro menos estricto
  if (tablesToProcess.length === 0) {
    console.warn("⚠️  No se encontró una sección específica para hoy. Procesando todas las tablas...");
    const allTables = $("table");
    console.log(`📊 Total de tablas encontradas: ${allTables.length}`);
    tablesToProcess = allTables;
  } else {
    console.log(`📊 Tablas a procesar: ${tablesToProcess.length}`);
  }

  // Buscar todas las filas de la tabla de partidos
  // Basado en la estructura HTML del sitio, los partidos están en filas de tabla
  let currentCompetition = "";
  let isInTodaySection = false;
  let rowsProcessed = 0;
  let rowsWithTime = 0;
  let rowsWithTeams = 0;

  // Procesar solo las filas de las tablas de hoy
  tablesToProcess.find("tbody tr, tr").each((index, element) => {
    const $row = $(element);
    const rowText = $row.text().trim();
    rowsProcessed++;

    // Debug: mostrar primeras filas para entender la estructura
    if (rowsProcessed <= 3) {
      const cells = $row.find("td, th");
      console.log(`\n🔍 Fila ${rowsProcessed} (primeras 3):`);
      console.log(`   Texto: ${rowText.substring(0, 100)}...`);
      console.log(`   Celdas: ${cells.length}`);
      cells.each((i, cell) => {
        if (i < 5) {
          console.log(`   Celda ${i}: ${$(cell).text().trim().substring(0, 50)}`);
        }
      });
    }

    // Verificar si esta fila contiene una fecha diferente a hoy
    // Buscar patrones de fecha DD/MM/YYYY en la fila
    const datePattern = /(\d{2}\/\d{2}\/\d{4})/g;
    const datesInRow = rowText.match(datePattern);
    
    // Si encontramos headers de fecha, ser más estricto
    if (dateHeaders.length > 0 && datesInRow) {
      const hasTodayDate = datesInRow.some(date => date === todayDate);
      const hasOtherDate = datesInRow.some(date => date !== todayDate);
      
      // Si la fila contiene una fecha diferente a hoy, saltarla
      if (hasOtherDate && !hasTodayDate) {
        isInTodaySection = false;
        return;
      }
      
      // Si contiene la fecha de hoy, estamos en la sección correcta
      if (hasTodayDate) {
        isInTodaySection = true;
      }
    } else {
      // Si no hay headers de fecha, ser más permisivo
      // Solo filtrar si encontramos explícitamente una fecha diferente
      if (datesInRow) {
        const hasTodayDate = datesInRow.some(date => date === todayDate);
        const hasOtherDate = datesInRow.some(date => date !== todayDate);
        
        // Solo saltar si hay una fecha diferente Y no hay fecha de hoy
        if (hasOtherDate && !hasTodayDate) {
          return;
        }
        
        if (hasTodayDate) {
          isInTodaySection = true;
        }
      } else {
        // Si no hay fecha en la fila, asumir que podría ser de hoy si estamos en modo permisivo
        if (dateHeaders.length === 0) {
          isInTodaySection = true; // Modo permisivo cuando no hay headers
        }
      }
    }

    // Verificar si esta fila contiene información de competición
    const competicionLink = $row.find('a[href*="/competicion/"]').first();
    if (competicionLink.length) {
      currentCompetition = competicionLink.text().trim();
      return; // Esta es una fila de encabezado, continuar con la siguiente
    }

    // Verificar si es una fila de partido (debe tener hora y equipos)
    // Buscar hora en diferentes formatos: HH:MM, H:MM, HHMM
    const hasTime = rowText.match(/\d{1,2}:\d{2}/) || rowText.match(/\d{4}/);
    
    // Buscar equipos de diferentes formas:
    // 1. Enlaces a /equipo/
    // 2. Texto que parezca nombres de equipos (palabras en mayúsculas, nombres propios)
    const equipoLinks = $row.find('a[href*="/equipo/"]');
    const hasTeamsLinks = equipoLinks.length >= 2;
    
    // También buscar texto que parezca equipos (dos palabras/nombres separados por "vs", "-", etc.)
    const teamPatterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:vs|v|VS|V|-|–|—)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/i,
      /\b[A-Z]{2,}\s+(?:vs|v|VS|V|-|–|—)\s+[A-Z]{2,}/,
    ];
    const hasTeamsText = teamPatterns.some(pattern => pattern.test(rowText));
    const hasTeams = hasTeamsLinks || hasTeamsText;
    
    if (hasTime) rowsWithTime++;
    if (hasTeams) rowsWithTeams++;

    // Debug para filas que tienen hora pero no equipos, o viceversa
    if (hasTime && !hasTeams && rowsProcessed <= 5) {
      console.log(`⚠️  Fila ${rowsProcessed} tiene hora pero no equipos detectados`);
      console.log(`   Texto: ${rowText.substring(0, 150)}`);
    }
    if (!hasTime && hasTeams && rowsProcessed <= 5) {
      console.log(`⚠️  Fila ${rowsProcessed} tiene equipos pero no hora detectada`);
      console.log(`   Texto: ${rowText.substring(0, 150)}`);
    }

    if (!hasTime || !hasTeams) {
      return; // No es una fila de partido, continuar
    }

    const cells = $row.find("td");

    if (cells.length === 0) {
      // Intentar buscar en otros elementos si no hay celdas td
      const allCells = $row.find("td, th, div, span");
      if (allCells.length === 0) return;
    }

    // Extraer hora - buscar en todas las celdas si es necesario
    let horaMatch = null;
    let timeCell = cells.eq(0).text().trim();
    
    // Buscar hora en la primera celda
    horaMatch = timeCell.match(/(\d{1,2}:\d{2})/);
    
    // Si no se encuentra, buscar en todo el texto de la fila
    if (!horaMatch) {
      horaMatch = rowText.match(/(\d{1,2}:\d{2})/);
    }
    
    if (!horaMatch) return;

    const hora = horaMatch[1];

    // Extraer competición (buscar logo o texto de competición)
    let competicion = currentCompetition;
    const competicionLinkInRow = $row.find('a[href*="/competicion/"]').first();
    if (competicionLinkInRow.length) {
      competicion = competicionLinkInRow.text().trim();
      currentCompetition = competicion; // Actualizar la competición actual
    } else {
      // Buscar en filas anteriores
      let prevRow = $row.prev();
      let found = false;
      // Buscar hasta 3 filas anteriores
      for (let i = 0; i < 3 && prevRow.length && !found; i++) {
        const competicionFromPrev = prevRow
          .find('a[href*="/competicion/"]')
          .first()
          .text()
          .trim();
        if (competicionFromPrev) {
          competicion = competicionFromPrev;
          currentCompetition = competicion;
          found = true;
        }
        prevRow = prevRow.prev();
      }
    }

    // Extraer equipos (enlaces a /equipo/ o texto)
    let equipoLocal = "";
    let equipoVisitante = "";
    
    // Reutilizar equipoLinks que ya fue declarado arriba
    if (equipoLinks.length >= 2) {
      // Extraer de enlaces
      equipoLocal = equipoLinks.eq(0).text().trim();
      equipoVisitante = equipoLinks.eq(1).text().trim();
    } else {
      // Intentar extraer del texto usando patrones
      const teamMatch = rowText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:vs|v|VS|V|-|–|—)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      if (teamMatch) {
        equipoLocal = teamMatch[1].trim();
        equipoVisitante = teamMatch[2].trim();
      } else {
        // Buscar en celdas específicas
        if (cells.length >= 3) {
          equipoLocal = cells.eq(1).text().trim();
          equipoVisitante = cells.eq(2).text().trim();
        }
      }
    }
    
    if (!equipoLocal || !equipoVisitante) {
      return; // No se pudieron extraer los equipos
    }

    // Extraer canales de TV
    const canales = [];
    
    // 1. Buscar enlaces con /canal/
    const canalLinks = $row.find('a[href*="/canal/"]');
    canalLinks.each((i, el) => {
      const canal = $(el).text().trim();
      if (canal && !canales.includes(canal)) {
        canales.push(canal);
      }
    });

    // 2. Buscar en todas las celdas, no solo la última
    // Obtener todo el texto de la fila para análisis
    const rowFullText = $row.text();
    
    // 3. Buscar en atributos de imágenes (alt, title)
    $row.find('img').each((i, img) => {
      const alt = $(img).attr('alt') || '';
      const title = $(img).attr('title') || '';
      const src = $(img).attr('src') || '';
      
      [alt, title, src].forEach(text => {
        if (text) {
          // Extraer posibles nombres de canales de los atributos
          const channelMatch = extractChannelFromText(text);
          if (channelMatch && !canales.includes(channelMatch)) {
            canales.push(channelMatch);
          }
        }
      });
    });

    // 4. Lista expandida de canales conocidos y sus variaciones
    const knownChannels = [
      // Canales principales
      'ESPN', 'ESPN 2', 'ESPN 3', 'ESPN 4', 'ESPN+', 'ESPN Deportes',
      'TUDN', 'TUDN USA',
      'Fox', 'Fox Sports', 'Fox Sports 1', 'Fox Sports 2', 'FOX One', 'FOX',
      'Sky', 'SKY Sports', 'Sky Sports', 'Sky Sports 1', 'Sky Sports 2',
      'Claro', 'Claro Sports',
      'Azteca', 'Azteca 7', 'Azteca 13', 'Azteca Deportes',
      'Disney', 'Disney+', 'Disney+ Premium', 'Disney+ Estándar',
      'YouTube', 'Youtube',
      // Streaming y plataformas
      'HBO MAX', 'HBO Max',
      'TNT', 'TNT Sports',
      'Tubi',
      'TV5MONDE',
      'OneFootball', 'OneFootball PPV',
      'FIFA+',
      'MLS Season Pass', 'MLS Season Pass (Apple TV)',
      'Apple TV',
      'Paramount+',
      'DAZN',
      'FuboTV',
      'Peacock',
      // Canales latinoamericanos
      'TyC Sports', 'TyC Sports Internacional',
      'RCN', 'RCN Nuestra Tele',
      'FUTV',
      'ElCanalDelFutbol.com',
      'Caliente TV',
      'L1 Max', 'L1 Max YouTube',
      'FC Barcelona PPV YouTube',
      'A-Leagues YouTube',
      'Arkema Première Ligue YouTube',
      // Otros
      'AYM Sports',
      'Latin American Sports TV',
    ];

    // 5. Buscar canales en todas las celdas usando patrones mejorados
    cells.each((index, cell) => {
      const cellText = $(cell).text();
      const cellHtml = $(cell).html() || '';
      
      // Buscar nombres exactos de canales conocidos
      knownChannels.forEach(channel => {
        // Buscar coincidencias exactas o como parte de palabras
        const regex = new RegExp(`\\b${channel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        if (regex.test(cellText) || regex.test(cellHtml)) {
          if (!canales.includes(channel)) {
            canales.push(channel);
          }
        }
      });
    });

    // 6. Patrones regex mejorados para capturar variaciones (ordenados de más específico a menos específico)
    const channelPatterns = [
      // Patrones específicos primero (más largos)
      /MLS\s*Season\s*Pass\s*\(Apple\s*TV\)/gi,
      /MLS\s*Season\s*Pass/gi,
      /Disney\+\s*Premium/gi,
      /Disney\+\s*Estándar/gi,
      /ESPN\s*Deportes/gi,
      /ESPN\s*(\d+)/gi,
      /ESPN\+/gi,
      /ESPN/gi,
      /TUDN\s*USA/gi,
      /TUDN/gi,
      /Fox\s*Sports\s*(\d+)/gi,
      /Fox\s*Sports/gi,
      /FOX\s*One/gi,
      /FOX/gi,
      /Fox/gi,
      /SKY\s*Sports/gi,
      /Sky\s*Sports/gi,
      /Disney\+/gi,
      /Disney/gi,
      /HBO\s*MAX/gi,
      /HBO\s*Max/gi,
      /TNT\s*Sports/gi,
      /TNT/gi,
      /OneFootball\s*PPV/gi,
      /OneFootball/gi,
      /FIFA\+/gi,
      /Paramount\+/gi,
      /TyC\s*Sports\s*Internacional/gi,
      /TyC\s*Sports/gi,
      /RCN\s*Nuestra\s*Tele/gi,
      /RCN/gi,
      /Caliente\s*TV/gi,
      /Claro\s*Sports/gi,
      /Azteca\s*(\d+)/gi,
      /Azteca/gi,
      /L1\s*Max\s*YouTube/gi,
      /L1\s*Max/gi,
      /FC\s*Barcelona\s*PPV\s*YouTube/gi,
      /A-Leagues\s*YouTube/gi,
      /Arkema\s*Première\s*Ligue\s*YouTube/gi,
      /YouTube/gi,
      /Youtube/gi,
      /TV5MONDE/gi,
      /AYM\s*Sports/gi,
      /Latin\s*American\s*Sports\s*TV/gi,
      /ElCanalDelFutbol\.com/gi,
      /FUTV/gi,
      /DAZN/gi,
      /FuboTV/gi,
      /Peacock/gi,
      /Apple\s*TV/gi,
      /Tubi/gi,
    ];

    // Aplicar patrones al texto completo de la fila y HTML
    const rowFullHtml = $row.html() || '';
    channelPatterns.forEach((pattern) => {
      // Buscar en texto y HTML
      const textMatches = rowFullText.match(pattern);
      const htmlMatches = rowFullHtml.match(pattern);
      
      const allMatches = [...(textMatches || []), ...(htmlMatches || [])];
      
      if (allMatches.length > 0) {
        allMatches.forEach((match) => {
          const cleanedMatch = match.trim();
          // Verificar que el match no sea solo parte de una palabra más larga
          if (cleanedMatch && cleanedMatch.length > 1) {
            // Buscar el match completo en la lista de canales conocidos o agregarlo
            const foundChannel = knownChannels.find(ch => 
              ch.toLowerCase() === cleanedMatch.toLowerCase() || 
              cleanedMatch.toLowerCase().includes(ch.toLowerCase()) ||
              ch.toLowerCase().includes(cleanedMatch.toLowerCase())
            );
            
            const channelToAdd = foundChannel || cleanedMatch;
            if (!canales.includes(channelToAdd)) {
              canales.push(channelToAdd);
            }
          }
        });
      }
    });

    // 7. Buscar en elementos específicos (spans, divs, etc.) que puedan contener canales
    $row.find('span, div, p, strong, b').each((i, el) => {
      const elText = $(el).text().trim();
      if (elText && elText.length > 0 && elText.length < 50) {
        // Verificar si el texto coincide con algún canal conocido
        knownChannels.forEach(channel => {
          if (elText.includes(channel) || channel.includes(elText)) {
            const match = elText.length > channel.length ? elText : channel;
            if (!canales.includes(match)) {
              canales.push(match);
            }
          }
        });
      }
    });

    // Verificación final: asegurar que el partido pertenece a hoy
    // Solo aplicar filtro estricto si encontramos headers de fecha
    if (dateHeaders.length > 0) {
      // Modo estricto: buscar la fecha en el contexto de la fila
      const $parentTable = $row.closest("table");
      const tableContext = $parentTable.text();
      const rowContext = $row.text();
      
      // Verificar que la fecha de hoy esté presente en el contexto
      const contextHasToday = tableContext.includes(todayDate) || rowContext.includes(todayDate);
      
      // Solo agregar si está en sección de hoy o tiene la fecha en el contexto
      if (!isInTodaySection && !contextHasToday) {
        return; // Saltar este partido, no pertenece a hoy
      }
    }
    // Si no hay headers de fecha, ser permisivo y agregar todos los partidos válidos

    // Normalizar y limpiar canales antes de agregar
    const canalesNormalizados = canales
      .map(canal => normalizeChannelName(canal))
      .filter(canal => canal && canal.length > 0)
      .filter((canal, index, self) => self.indexOf(canal) === index); // Eliminar duplicados

    matches.push({
      hora,
      competicion: competicion || "No especificada",
      equipoLocal,
      equipoVisitante,
      canales: canalesNormalizados.length > 0 ? canalesNormalizados : ["No especificado"],
    });
  });

  console.log(`📊 Estadísticas de procesamiento:`);
  console.log(`   - Filas procesadas: ${rowsProcessed}`);
  console.log(`   - Filas con hora: ${rowsWithTime}`);
  console.log(`   - Filas con equipos: ${rowsWithTeams}`);
  console.log(`   - Partidos encontrados: ${matches.length}`);

  return matches;
};

/**
 * Función principal que ejecuta el scraping
 */
const scrapeMatches = async () => {
  try {
    const todayDate = getTodayDate();
    console.log("Iniciando extracción de partidos de HOY...");
    console.log(`Fecha objetivo: ${todayDate}`);

    // Hacer petición HTTP
    const response = await axios.get(URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    console.log("Página descargada correctamente");
    
    // Opción para guardar HTML para debugging (descomentar si es necesario)
    // fs.writeFileSync("debug-page.html", response.data, "utf-8");
    // console.log("💾 HTML guardado en debug-page.html para inspección");

    // Extraer partidos
    const matches = extractMatches(response.data);

    if (matches.length === 0) {
      console.warn(
        "⚠️  No se encontraron partidos para hoy. Puede que el sitio cargue contenido dinámico."
      );
      console.log(
        "💡 Si no funciona, considera usar Puppeteer o Playwright en lugar de Cheerio."
      );
    } else {
      console.log(`✅ Se encontraron ${matches.length} partido(s)`);
    }

    // Guardar en JSON
    const jsonData = JSON.stringify(matches, null, 2);
    fs.writeFileSync(OUTPUT_FILE, jsonData, "utf-8");

    console.log(`\n✅ Partidos guardados en: ${OUTPUT_FILE}`);
    console.log(`\nResumen:`);
    matches.forEach((match, index) => {
      console.log(
        `${index + 1}. ${match.hora} - ${match.equipoLocal} vs ${
          match.equipoVisitante
        } (${match.competicion})`
      );
    });
  } catch (error) {
    if (error.response) {
      console.error(
        `❌ Error HTTP: ${error.response.status} - ${error.response.statusText}`
      );
    } else if (error.request) {
      console.error("❌ Error de red: No se pudo conectar al servidor");
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
    process.exit(1);
  }
};

// Ejecutar el scraper
scrapeMatches();
