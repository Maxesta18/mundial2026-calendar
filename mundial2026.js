#!/usr/bin/env node
/**
 * Mundial 2026 → ICS Generator
 * Genera un archivo .ics con los 104 partidos del Mundial 2026,
 * información de retransmisión en España y briefs generados con OpenRouter.
 *
 * Uso:
 *   OPENROUTER_API_KEY=sk-or-v1-xxx node mundial2026.js
 *
 * El archivo resultante mundial2026.ics se sube a Netlify/cualquier hosting
 * y se comparte el enlace. Cualquiera lo abre y lo importa a su calendario.
 */

const fs = require('fs');
const { randomUUID } = require('crypto');
const Parser = require('rss-parser');
const parser = new Parser();

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'PON_TU_KEY_AQUI';
const MODEL = 'moonshotai/kimi-k2'; // gratuito en OpenRouter. Alternativa: google/gemini-flash-1.5
const OUTPUT_FILE = 'mundial2026.ics';
const DELAY_MS = 800; // pausa entre llamadas a la API para no saturar

// ─────────────────────────────────────────────
// DATOS DE RETRANSMISIÓN EN ESPAÑA
// Fuente: RTVE (derechos principales) + Mediapro/DAZN (canal de pago, 71 partidos en exclusiva)
// Regla: partidos de España, inaugural, semis, final, y grandes duelos → RTVE La 1
// Resto → DAZN / Mediapro Mundial (canal de pago)
// ─────────────────────────────────────────────
const SPAIN_MATCHES = ['España', 'Spain'];

function getTVInfo(home, away, phase) {
  const isSpainMatch = [...SPAIN_MATCHES].some(t =>
    home.includes(t) || away.includes(t)
  );
  const isMajor = ['Final', 'Semifinal', 'Inaugural', 'Cuartos', '3er Puesto'].some(p =>
    phase.includes(p)
  );
  const isBigGame = isMajor || isSpainMatch;

  if (isBigGame) {
    return {
      channel: 'RTVE La 1 (en abierto)',
      streaming: 'rtve.es / RTVE Play (gratis)',
      note: isSpainMatch ? '🇪🇸 Partido de España — emisión en abierto' : '📺 Partido destacado — emisión en abierto'
    };
  }
  return {
    channel: 'DAZN / Mediapro Mundial (pago)',
    streaming: 'dazn.com | Movistar+ | Orange TV',
    note: '💳 Canal de pago — incluido en paquetes Movistar+ y Orange TV con fútbol'
  };
}

// ─────────────────────────────────────────────
// CALENDARIO COMPLETO — 104 PARTIDOS
// Todas las horas en hora España peninsular (Europe/Madrid)
// Fase de grupos: 72 partidos (Grupos A-L)
// Eliminatorias: 32 partidos (16avos, 8vos, Cuartos, Semis, 3°, Final)
// ─────────────────────────────────────────────
const MATCHES = [
  // ═══════════ GRUPO A ═══════════
  { id: 1,  home: 'México',        away: 'Sudáfrica',       date: '2026-06-11', time: '21:00', venue: 'Estadio Azteca, Ciudad de México',          group: 'Grupo A', phase: 'Fase de Grupos' },
  { id: 2,  home: 'Corea del Sur', away: 'Rep. Checa',      date: '2026-06-12', time: '04:00', venue: 'Estadio Akron, Guadalajara',                 group: 'Grupo A', phase: 'Fase de Grupos' },
  { id: 3,  home: 'Rep. Checa',    away: 'Sudáfrica',       date: '2026-06-18', time: '18:00', venue: 'Mercedes-Benz Stadium, Atlanta',             group: 'Grupo A', phase: 'Fase de Grupos' },
  { id: 4,  home: 'México',        away: 'Corea del Sur',   date: '2026-06-19', time: '03:00', venue: 'Estadio Akron, Guadalajara',                 group: 'Grupo A', phase: 'Fase de Grupos' },
  { id: 5,  home: 'Rep. Checa',    away: 'México',          date: '2026-06-25', time: '03:00', venue: 'Estadio Azteca, Ciudad de México',           group: 'Grupo A', phase: 'Fase de Grupos' },
  { id: 6,  home: 'Sudáfrica',     away: 'Corea del Sur',   date: '2026-06-25', time: '03:00', venue: 'Estadio BBVA, Guadalupe',                    group: 'Grupo A', phase: 'Fase de Grupos' },

  // ═══════════ GRUPO B ═══════════
  { id: 7,  home: 'Canadá',        away: 'Bosnia',          date: '2026-06-12', time: '21:00', venue: 'BMO Field, Toronto',                         group: 'Grupo B', phase: 'Fase de Grupos' },
  { id: 8,  home: 'Catar',         away: 'Suiza',           date: '2026-06-13', time: '21:00', venue: "Levi's Stadium, Santa Clara",                group: 'Grupo B', phase: 'Fase de Grupos' },
  { id: 9,  home: 'Suiza',         away: 'Bosnia',          date: '2026-06-18', time: '21:00', venue: 'SoFi Stadium, Inglewood',                    group: 'Grupo B', phase: 'Fase de Grupos' },
  { id: 10, home: 'Canadá',        away: 'Catar',           date: '2026-06-19', time: '00:00', venue: 'BC Place, Vancouver',                        group: 'Grupo B', phase: 'Fase de Grupos' },
  { id: 11, home: 'Suiza',         away: 'Canadá',          date: '2026-06-24', time: '21:00', venue: 'BC Place, Vancouver',                        group: 'Grupo B', phase: 'Fase de Grupos' },
  { id: 12, home: 'Bosnia',        away: 'Catar',           date: '2026-06-24', time: '21:00', venue: 'Lumen Field, Seattle',                       group: 'Grupo B', phase: 'Fase de Grupos' },

  // ═══════════ GRUPO C ═══════════
  { id: 13, home: 'Brasil',        away: 'Marruecos',       date: '2026-06-14', time: '00:00', venue: 'MetLife Stadium, Nueva Jersey',              group: 'Grupo C', phase: 'Fase de Grupos' },
  { id: 14, home: 'Haití',         away: 'Escocia',         date: '2026-06-14', time: '03:00', venue: 'Gillette Stadium, Foxborough',               group: 'Grupo C', phase: 'Fase de Grupos' },
  { id: 15, home: 'Brasil',        away: 'Haití',           date: '2026-06-20', time: '00:00', venue: 'Gillette Stadium, Foxborough',               group: 'Grupo C', phase: 'Fase de Grupos' },
  { id: 16, home: 'Escocia',       away: 'Marruecos',       date: '2026-06-20', time: '03:00', venue: 'Lincoln Financial Field, Filadelfia',        group: 'Grupo C', phase: 'Fase de Grupos' },
  { id: 17, home: 'Escocia',       away: 'Brasil',          date: '2026-06-25', time: '00:00', venue: 'Hard Rock Stadium, Miami',                   group: 'Grupo C', phase: 'Fase de Grupos' },
  { id: 18, home: 'Marruecos',     away: 'Haití',           date: '2026-06-25', time: '00:00', venue: 'Mercedes-Benz Stadium, Atlanta',             group: 'Grupo C', phase: 'Fase de Grupos' },

  // ═══════════ GRUPO D ═══════════
  { id: 19, home: 'EE.UU.',        away: 'Paraguay',        date: '2026-06-13', time: '03:00', venue: 'SoFi Stadium, Inglewood',                   group: 'Grupo D', phase: 'Fase de Grupos' },
  { id: 20, home: 'Australia',     away: 'Turquía',         date: '2026-06-13', time: '06:00', venue: 'BC Place, Vancouver',                        group: 'Grupo D', phase: 'Fase de Grupos' },
  { id: 21, home: 'Turquía',       away: 'Paraguay',        date: '2026-06-19', time: '06:00', venue: "Levi's Stadium, Santa Clara",                group: 'Grupo D', phase: 'Fase de Grupos' },
  { id: 22, home: 'EE.UU.',        away: 'Australia',       date: '2026-06-19', time: '21:00', venue: 'Lumen Field, Seattle',                       group: 'Grupo D', phase: 'Fase de Grupos' },
  { id: 23, home: 'Turquía',       away: 'EE.UU.',          date: '2026-06-26', time: '04:00', venue: 'SoFi Stadium, Inglewood',                    group: 'Grupo D', phase: 'Fase de Grupos' },
  { id: 24, home: 'Paraguay',      away: 'Australia',       date: '2026-06-26', time: '04:00', venue: "Levi's Stadium, Santa Clara",                group: 'Grupo D', phase: 'Fase de Grupos' },

  // ═══════════ GRUPO E ═══════════
  { id: 25, home: 'Alemania',      away: 'Curazao',         date: '2026-06-14', time: '19:00', venue: 'NRG Stadium, Houston',                       group: 'Grupo E', phase: 'Fase de Grupos' },
  { id: 26, home: 'Costa de Marfil', away: 'Ecuador',       date: '2026-06-15', time: '01:00', venue: 'Lincoln Financial Field, Filadelfia',        group: 'Grupo E', phase: 'Fase de Grupos' },
  { id: 27, home: 'Alemania',      away: 'Costa de Marfil', date: '2026-06-21', time: '00:00', venue: 'BMO Field, Toronto',                         group: 'Grupo E', phase: 'Fase de Grupos' },
  { id: 28, home: 'Ecuador',       away: 'Curazao',         date: '2026-06-21', time: '02:00', venue: 'Arrowhead Stadium, Kansas City',             group: 'Grupo E', phase: 'Fase de Grupos' },
  { id: 29, home: 'Ecuador',       away: 'Alemania',        date: '2026-06-26', time: '00:00', venue: 'MetLife Stadium, Nueva Jersey',              group: 'Grupo E', phase: 'Fase de Grupos' },
  { id: 30, home: 'Curazao',       away: 'Costa de Marfil', date: '2026-06-26', time: '00:00', venue: 'Lincoln Financial Field, Filadelfia',        group: 'Grupo E', phase: 'Fase de Grupos' },

  // ═══════════ GRUPO F ═══════════
  { id: 31, home: 'Países Bajos',  away: 'Japón',           date: '2026-06-15', time: '00:00', venue: 'AT&T Stadium, Arlington',                    group: 'Grupo F', phase: 'Fase de Grupos' },
  { id: 32, home: 'Suecia',        away: 'Túnez',           date: '2026-06-15', time: '04:00', venue: 'Estadio BBVA, Guadalupe',                    group: 'Grupo F', phase: 'Fase de Grupos' },
  { id: 33, home: 'Países Bajos',  away: 'Suecia',          date: '2026-06-20', time: '19:00', venue: 'NRG Stadium, Houston',                       group: 'Grupo F', phase: 'Fase de Grupos' },
  { id: 34, home: 'Túnez',         away: 'Japón',           date: '2026-06-20', time: '06:00', venue: 'Estadio BBVA, Guadalupe',                    group: 'Grupo F', phase: 'Fase de Grupos' },
  { id: 35, home: 'Túnez',         away: 'Países Bajos',    date: '2026-06-26', time: '01:00', venue: 'Arrowhead Stadium, Kansas City',             group: 'Grupo F', phase: 'Fase de Grupos' },
  { id: 36, home: 'Japón',         away: 'Suecia',          date: '2026-06-26', time: '01:00', venue: 'AT&T Stadium, Arlington',                    group: 'Grupo F', phase: 'Fase de Grupos' },

  // ═══════════ GRUPO G ═══════════
  { id: 37, home: 'Bélgica',       away: 'Egipto',          date: '2026-06-15', time: '21:00', venue: 'Lumen Field, Seattle',                       group: 'Grupo G', phase: 'Fase de Grupos' },
  { id: 38, home: 'Irán',          away: 'Nueva Zelanda',   date: '2026-06-16', time: '03:00', venue: 'SoFi Stadium, Inglewood',                    group: 'Grupo G', phase: 'Fase de Grupos' },
  { id: 39, home: 'Bélgica',       away: 'Irán',            date: '2026-06-22', time: '01:00', venue: 'SoFi Stadium, Inglewood',                    group: 'Grupo G', phase: 'Fase de Grupos' },
  { id: 40, home: 'Nueva Zelanda', away: 'Egipto',          date: '2026-06-22', time: '03:00', venue: 'BC Place, Vancouver',                        group: 'Grupo G', phase: 'Fase de Grupos' },
  { id: 41, home: 'Nueva Zelanda', away: 'Bélgica',         date: '2026-06-27', time: '05:00', venue: 'Lumen Field, Seattle',                       group: 'Grupo G', phase: 'Fase de Grupos' },
  { id: 42, home: 'Egipto',        away: 'Irán',            date: '2026-06-27', time: '05:00', venue: 'BC Place, Vancouver',                        group: 'Grupo G', phase: 'Fase de Grupos' },

  // ═══════════ GRUPO H ═══════════
  { id: 43, home: 'España',        away: 'Cabo Verde',      date: '2026-06-15', time: '18:00', venue: 'Mercedes-Benz Stadium, Atlanta',             group: 'Grupo H', phase: 'Fase de Grupos' },
  { id: 44, home: 'Arabia Saudí',  away: 'Uruguay',         date: '2026-06-16', time: '00:00', venue: 'Hard Rock Stadium, Miami',                   group: 'Grupo H', phase: 'Fase de Grupos' },
  { id: 45, home: 'España',        away: 'Arabia Saudí',    date: '2026-06-21', time: '18:00', venue: 'Mercedes-Benz Stadium, Atlanta',             group: 'Grupo H', phase: 'Fase de Grupos' },
  { id: 46, home: 'Uruguay',       away: 'Cabo Verde',      date: '2026-06-22', time: '00:00', venue: 'Hard Rock Stadium, Miami',                   group: 'Grupo H', phase: 'Fase de Grupos' },
  { id: 47, home: 'Uruguay',       away: 'España',          date: '2026-06-27', time: '02:00', venue: 'Estadio Akron, Guadalajara',                 group: 'Grupo H', phase: 'Fase de Grupos' },
  { id: 48, home: 'Cabo Verde',    away: 'Arabia Saudí',    date: '2026-06-27', time: '02:00', venue: 'NRG Stadium, Houston',                       group: 'Grupo H', phase: 'Fase de Grupos' },

  // ═══════════ GRUPO I ═══════════
  { id: 49, home: 'Francia',       away: 'Senegal',         date: '2026-06-16', time: '21:00', venue: 'MetLife Stadium, Nueva Jersey',              group: 'Grupo I', phase: 'Fase de Grupos' },
  { id: 50, home: 'Irak',          away: 'Noruega',         date: '2026-06-17', time: '00:00', venue: 'Gillette Stadium, Foxborough',               group: 'Grupo I', phase: 'Fase de Grupos' },
  { id: 51, home: 'Francia',       away: 'Irak',            date: '2026-06-22', time: '23:00', venue: 'Lincoln Financial Field, Filadelfia',        group: 'Grupo I', phase: 'Fase de Grupos' },
  { id: 52, home: 'Noruega',       away: 'Senegal',         date: '2026-06-23', time: '02:00', venue: 'MetLife Stadium, Nueva Jersey',              group: 'Grupo I', phase: 'Fase de Grupos' },
  { id: 53, home: 'Noruega',       away: 'Francia',         date: '2026-06-26', time: '21:00', venue: 'Gillette Stadium, Foxborough',               group: 'Grupo I', phase: 'Fase de Grupos' },
  { id: 54, home: 'Senegal',       away: 'Irak',            date: '2026-06-26', time: '21:00', venue: 'BMO Field, Toronto',                        group: 'Grupo I', phase: 'Fase de Grupos' },

  // ═══════════ GRUPO J ═══════════
  { id: 55, home: 'Argentina',     away: 'Argelia',         date: '2026-06-17', time: '03:00', venue: 'Arrowhead Stadium, Kansas City',             group: 'Grupo J', phase: 'Fase de Grupos' },
  { id: 56, home: 'Austria',       away: 'Jordania',        date: '2026-06-17', time: '06:00', venue: "Levi's Stadium, Santa Clara",                group: 'Grupo J', phase: 'Fase de Grupos' },
  { id: 57, home: 'Argentina',     away: 'Austria',         date: '2026-06-22', time: '19:00', venue: 'AT&T Stadium, Arlington',                    group: 'Grupo J', phase: 'Fase de Grupos' },
  { id: 58, home: 'Jordania',      away: 'Argelia',         date: '2026-06-23', time: '05:00', venue: "Levi's Stadium, Santa Clara",                group: 'Grupo J', phase: 'Fase de Grupos' },
  { id: 59, home: 'Jordania',      away: 'Argentina',       date: '2026-06-28', time: '04:00', venue: 'Arrowhead Stadium, Kansas City',             group: 'Grupo J', phase: 'Fase de Grupos' },
  { id: 60, home: 'Argelia',       away: 'Austria',         date: '2026-06-28', time: '04:00', venue: 'AT&T Stadium, Arlington',                    group: 'Grupo J', phase: 'Fase de Grupos' },

  // ═══════════ GRUPO K ═══════════
  { id: 61, home: 'Portugal',      away: 'RD Congo',        date: '2026-06-17', time: '19:00', venue: 'NRG Stadium, Houston',                       group: 'Grupo K', phase: 'Fase de Grupos' },
  { id: 62, home: 'Uzbekistán',    away: 'Colombia',        date: '2026-06-18', time: '04:00', venue: 'Estadio Azteca, Ciudad de México',           group: 'Grupo K', phase: 'Fase de Grupos' },
  { id: 63, home: 'Portugal',      away: 'Uzbekistán',      date: '2026-06-23', time: '19:00', venue: 'NRG Stadium, Houston',                       group: 'Grupo K', phase: 'Fase de Grupos' },
  { id: 64, home: 'Colombia',      away: 'RD Congo',        date: '2026-06-24', time: '04:00', venue: 'Estadio Akron, Guadalajara',                 group: 'Grupo K', phase: 'Fase de Grupos' },
  { id: 65, home: 'Colombia',      away: 'Portugal',        date: '2026-06-28', time: '01:30', venue: 'Hard Rock Stadium, Miami',                   group: 'Grupo K', phase: 'Fase de Grupos' },
  { id: 66, home: 'RD Congo',      away: 'Uzbekistán',      date: '2026-06-28', time: '01:30', venue: 'Mercedes-Benz Stadium, Atlanta',             group: 'Grupo K', phase: 'Fase de Grupos' },

  // ═══════════ GRUPO L ═══════════
  { id: 67, home: 'Inglaterra',    away: 'Croacia',         date: '2026-06-17', time: '22:00', venue: 'AT&T Stadium, Arlington',                    group: 'Grupo L', phase: 'Fase de Grupos' },
  { id: 68, home: 'Ghana',         away: 'Panamá',          date: '2026-06-18', time: '01:00', venue: 'BMO Field, Toronto',                        group: 'Grupo L', phase: 'Fase de Grupos' },
  { id: 69, home: 'Inglaterra',    away: 'Ghana',           date: '2026-06-23', time: '22:00', venue: 'Gillette Stadium, Foxborough',               group: 'Grupo L', phase: 'Fase de Grupos' },
  { id: 70, home: 'Panamá',        away: 'Croacia',         date: '2026-06-24', time: '01:00', venue: 'Lincoln Financial Field, Filadelfia',        group: 'Grupo L', phase: 'Fase de Grupos' },
  { id: 71, home: 'Croacia',       away: 'Ghana',           date: '2026-06-28', time: '21:00', venue: 'Hard Rock Stadium, Miami',                   group: 'Grupo L', phase: 'Fase de Grupos' },
  { id: 72, home: 'Panamá',        away: 'Inglaterra',      date: '2026-06-28', time: '21:00', venue: 'MetLife Stadium, Nueva Jersey',              group: 'Grupo L', phase: 'Fase de Grupos' },

  // ═══════════ DIECISEISAVOS (16avos) — 28 jun – 3 jul ═══════════
  { id: 73, home: '1A',            away: '3B/C/D',          date: '2026-06-28', time: '22:00', venue: 'AT&T Stadium, Arlington',                    group: '', phase: 'Dieciseisavos' },
  { id: 74, home: '1C',            away: '3A/B/F',          date: '2026-06-29', time: '01:00', venue: 'Hard Rock Stadium, Miami',                   group: '', phase: 'Dieciseisavos' },
  { id: 75, home: '1B',            away: '3G/H/I',          date: '2026-06-29', time: '19:00', venue: 'Mercedes-Benz Stadium, Atlanta',             group: '', phase: 'Dieciseisavos' },
  { id: 76, home: '1D',            away: '3J/K/L',          date: '2026-06-29', time: '22:00', venue: 'SoFi Stadium, Inglewood',                    group: '', phase: 'Dieciseisavos' },
  { id: 77, home: '1E',            away: '3A/B/C',          date: '2026-06-30', time: '01:00', venue: 'Lumen Field, Seattle',                       group: '', phase: 'Dieciseisavos' },
  { id: 78, home: '1F',            away: '3D/E/G',          date: '2026-06-30', time: '19:00', venue: 'BC Place, Vancouver',                        group: '', phase: 'Dieciseisavos' },
  { id: 79, home: '2A',            away: '2B',              date: '2026-06-30', time: '22:00', venue: 'BMO Field, Toronto',                        group: '', phase: 'Dieciseisavos' },
  { id: 80, home: '2C',            away: '2D',              date: '2026-07-01', time: '01:00', venue: 'NRG Stadium, Houston',                       group: '', phase: 'Dieciseisavos' },
  { id: 81, home: '1G',            away: '3D/E/H',          date: '2026-07-01', time: '19:00', venue: 'Arrowhead Stadium, Kansas City',             group: '', phase: 'Dieciseisavos' },
  { id: 82, home: '1H',            away: '3C/F/I',          date: '2026-07-01', time: '22:00', venue: 'Lincoln Financial Field, Filadelfia',        group: '', phase: 'Dieciseisavos' },
  { id: 83, home: '2E',            away: '2F',              date: '2026-07-02', time: '01:00', venue: 'Gillette Stadium, Foxborough',               group: '', phase: 'Dieciseisavos' },
  { id: 84, home: '2G',            away: '2H',              date: '2026-07-02', time: '19:00', venue: 'SoFi Stadium, Inglewood',                    group: '', phase: 'Dieciseisavos' },
  { id: 85, home: '1I',            away: '3F/G/J',          date: '2026-07-02', time: '22:00', venue: 'Mercedes-Benz Stadium, Atlanta',             group: '', phase: 'Dieciseisavos' },
  { id: 86, home: '1J',            away: '3H/I/K',          date: '2026-07-03', time: '01:00', venue: 'Lumen Field, Seattle',                       group: '', phase: 'Dieciseisavos' },
  { id: 87, home: '2I',            away: '2J',              date: '2026-07-03', time: '19:00', venue: 'AT&T Stadium, Arlington',                    group: '', phase: 'Dieciseisavos' },
  { id: 88, home: '1K/L',          away: '2K/L',            date: '2026-07-03', time: '22:00', venue: 'NRG Stadium, Houston',                       group: '', phase: 'Dieciseisavos' },

  // ═══════════ OCTAVOS (4 jul – 7 jul) ═══════════
  { id: 89, home: 'Gan. P73',      away: 'Gan. P74',        date: '2026-07-04', time: '19:00', venue: 'Hard Rock Stadium, Miami',                   group: '', phase: 'Octavos de Final' },
  { id: 90, home: 'Gan. P75',      away: 'Gan. P76',        date: '2026-07-04', time: '22:00', venue: 'MetLife Stadium, Nueva Jersey',              group: '', phase: 'Octavos de Final' },
  { id: 91, home: 'Gan. P77',      away: 'Gan. P78',        date: '2026-07-05', time: '19:00', venue: 'BC Place, Vancouver',                        group: '', phase: 'Octavos de Final' },
  { id: 92, home: 'Gan. P79',      away: 'Gan. P80',        date: '2026-07-05', time: '22:00', venue: 'Mercedes-Benz Stadium, Atlanta',             group: '', phase: 'Octavos de Final' },
  { id: 93, home: 'Gan. P81',      away: 'Gan. P82',        date: '2026-07-06', time: '19:00', venue: 'Lumen Field, Seattle',                       group: '', phase: 'Octavos de Final' },
  { id: 94, home: 'Gan. P83',      away: 'Gan. P84',        date: '2026-07-06', time: '22:00', venue: 'AT&T Stadium, Arlington',                    group: '', phase: 'Octavos de Final' },
  { id: 95, home: 'Gan. P85',      away: 'Gan. P86',        date: '2026-07-07', time: '19:00', venue: 'SoFi Stadium, Inglewood',                    group: '', phase: 'Octavos de Final' },
  { id: 96, home: 'Gan. P87',      away: 'Gan. P88',        date: '2026-07-07', time: '22:00', venue: 'NRG Stadium, Houston',                       group: '', phase: 'Octavos de Final' },

  // ═══════════ CUARTOS (9 jul – 11 jul) ═══════════
  { id: 97,  home: 'Gan. P89',     away: 'Gan. P90',        date: '2026-07-09', time: '22:00', venue: 'MetLife Stadium, Nueva Jersey',              group: '', phase: 'Cuartos de Final' },
  { id: 98,  home: 'Gan. P91',     away: 'Gan. P92',        date: '2026-07-10', time: '01:00', venue: 'Mercedes-Benz Stadium, Atlanta',             group: '', phase: 'Cuartos de Final' },
  { id: 99,  home: 'Gan. P93',     away: 'Gan. P94',        date: '2026-07-10', time: '22:00', venue: 'SoFi Stadium, Inglewood',                    group: '', phase: 'Cuartos de Final' },
  { id: 100, home: 'Gan. P95',     away: 'Gan. P96',        date: '2026-07-11', time: '01:00', venue: 'Arrowhead Stadium, Kansas City',             group: '', phase: 'Cuartos de Final' },

  // ═══════════ SEMIFINALES (14–15 jul) ═══════════
  { id: 101, home: 'Gan. P97',     away: 'Gan. P98',        date: '2026-07-14', time: '02:00', venue: 'AT&T Stadium, Arlington',                    group: '', phase: 'Semifinal' },
  { id: 102, home: 'Gan. P99',     away: 'Gan. P100',       date: '2026-07-15', time: '02:00', venue: 'Mercedes-Benz Stadium, Atlanta',             group: '', phase: 'Semifinal' },

  // ═══════════ 3ER PUESTO (18 jul) ═══════════
  { id: 103, home: 'Perd. P101',   away: 'Perd. P102',      date: '2026-07-18', time: '20:00', venue: 'Hard Rock Stadium, Miami',                   group: '', phase: '3er Puesto' },

  // ═══════════ FINAL (19 jul) ═══════════
  { id: 104, home: 'Gan. P101',    away: 'Gan. P102',       date: '2026-07-19', time: '20:00', venue: 'MetLife Stadium, East Rutherford, NJ',       group: '', phase: 'Final' },
];

// ─────────────────────────────────────────────
// SCRAPING DE NOTICIAS (RSS)
// ─────────────────────────────────────────────
async function fetchNews(home, away) {
  const feeds = [
    'https://e00-marca.uecdn.es/rss/futbol.xml',
    'https://as.com/rss/futbol/internacional.xml'
  ];
  let newsItems = [];
  try {
    for (const url of feeds) {
      const feed = await parser.parseURL(url);
      feed.items.forEach(item => {
        const text = (item.title + ' ' + (item.contentSnippet || item.content || '')).toLowerCase();
        if (text.includes(home.toLowerCase()) || text.includes(away.toLowerCase())) {
          let imageUrl = '';
          if (item.enclosure && item.enclosure.url) imageUrl = item.enclosure.url;
          
          newsItems.push({
            title: item.title,
            link: item.link,
            image: imageUrl,
            source: url.includes('marca') ? 'Marca' : 'AS'
          });
        }
      });
    }
  } catch (err) {
    console.error('  ⚠ Error obteniendo RSS:', err.message);
  }
  return newsItems.slice(0, 3); // top 3 noticias
}

// ─────────────────────────────────────────────
// OPENROUTER — Generar brief del partido (AGENTE EDITOR)
// ─────────────────────────────────────────────
async function generateBrief(match) {
  // Para fases eliminatorias sin equipos definidos, brief genérico
  const isGroupStage = match.phase === 'Fase de Grupos';
  if (!isGroupStage && match.home.startsWith('Gan.')) {
    return `Partido de ${match.phase}. Los equipos se determinarán según los resultados de la fase anterior. ¡Atento al calendario!`;
  }

  // Hacemos scraping de últimas noticias
  const news = await fetchNews(match.home, match.away);
  let newsContext = '';
  if (news.length > 0) {
    newsContext = 'NOTICIAS RECIENTES OBTENIDAS:\n' + news.map(n => `- ${n.source}: ${n.title} (Link: ${n.link}) ${n.image ? '(Imagen: ' + n.image + ')' : ''}`).join('\n');
  }

  const prompt = `Eres un Agente Editor especializado en periodismo deportivo. Tienes un tono desenfadado, divertido y fresco, capaz de enganchar al lector.
Tu misión es escribir la descripción para un evento de calendario del Mundial 2026: ${match.home} vs ${match.away} (${match.group || match.phase}).

Instrucciones:
1. Escribe un resumen breve (máximo 150-200 palabras) combinando el contexto del partido, posible táctica y un pronóstico rápido.
2. Si te he proporcionado "NOTICIAS RECIENTES OBTENIDAS", úsalas para darle contexto de ÚLTIMA HORA (lesiones, polémicas, declaraciones).
3. MUY IMPORTANTE: Si hay noticias, al final de tu texto debes poner los enlaces a las noticias literalmente y la URL de la imagen para que el usuario pueda hacer clic. (Ejemplo: "🗞️ Lee más: [URL]" y "📸 Imagen: [URL]").

Aquí tienes las noticias crudas (si las hay):
${newsContext}

Escribe el texto de forma limpia, sin markdown complejo (asteriscos, etc), directo para un calendario.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/mundial2026-calendar',
        'X-Title': 'Mundial 2026 Calendar Generator'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.8
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content.trim();
    }
    return `Partido ${match.home} vs ${match.away}. ${match.phase}.`;
  } catch (err) {
    console.error(`  ⚠ Error brief partido ${match.id}: ${err.message}`);
    return `${match.home} vs ${match.away} — ${match.phase}. Consulta medios deportivos para las últimas novedades.`;
  }
}

// ─────────────────────────────────────────────
// ICS — Formatear fecha/hora
// ─────────────────────────────────────────────
function toICSDate(dateStr, timeStr) {
  // Las horas del array ya están en hora España (Europe/Madrid, UTC+2 en verano)
  // ICS DTSTART con TZID es lo más limpio
  const [year, month, day] = dateStr.split('-');
  const [hour, min] = timeStr.split(':');
  return `${year}${month}${day}T${hour}${min}00`;
}

function addMinutes(dateStr, timeStr, minutes) {
  const dt = new Date(`${dateStr}T${timeStr}:00`);
  dt.setMinutes(dt.getMinutes() + minutes);
  const pad = n => String(n).padStart(2, '0');
  const y = dt.getFullYear();
  const mo = pad(dt.getMonth() + 1);
  const d = pad(dt.getDate());
  const h = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${y}${mo}${d}T${h}${mi}00`;
}

function escapeICS(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// ─────────────────────────────────────────────
// GENERAR ICS
// ─────────────────────────────────────────────
function buildICS(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mundial 2026 Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:⚽ Mundial 2026',
    'X-WR-TIMEZONE:Europe/Madrid',
    'X-WR-CALDESC:Todos los partidos del Mundial 2026 con retransmisión en España y análisis previo.',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Madrid',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const ev of events) {
    const dtstart = toICSDate(ev.date, ev.time);
    const dtend = addMinutes(ev.date, ev.time, 110); // 90min + 20 extra
    const uid = `mundial2026-partido${ev.id}@manu.ruiz`;

    const isSpain = ev.home.includes('España') || ev.away.includes('España');

    let title = ev.phase === 'Fase de Grupos'
      ? `⚽ ${ev.home} vs ${ev.away} | ${ev.group}`
      : `⚽ ${ev.home} vs ${ev.away} | ${ev.phase}`;

    if (isSpain) {
      title = `🇪🇸 🔴🟡🔴 ${ev.home} vs ${ev.away} | ${ev.phase}`;
    }

    const tv = getTVInfo(ev.home, ev.away, ev.phase);

    const description = [
      `📅 ${ev.phase}${ev.group ? ' — ' + ev.group : ''}`,
      `🏟️ ${ev.venue}`,
      ``,
      `📺 RETRANSMISIÓN EN ESPAÑA`,
      `Cadena: ${tv.channel}`,
      `Streaming: ${tv.streaming}`,
      `${tv.note}`,
      ``,
      `📰 ANÁLISIS PREVIO`,
      ev.brief || 'Brief pendiente de generación.',
      ``,
      `---`,
      `Generado automáticamente • Mundial 2026 Calendar`,
    ].join('\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART;TZID=Europe/Madrid:${dtstart}`);
    lines.push(`DTEND;TZID=Europe/Madrid:${dtend}`);
    lines.push(`SUMMARY:${escapeICS(title)}`);
    lines.push(`DESCRIPTION:${escapeICS(description)}`);
    lines.push(`LOCATION:${escapeICS(ev.venue)}`);
    lines.push(`CATEGORIES:${escapeICS(ev.phase)}`);
    if (isSpain) {
      // Intentamos forzar color en los clientes que lo soporten (Apple, Outlook, etc)
      lines.push('COLOR:#EF4444'); 
      lines.push('X-APPLE-CALENDAR-COLOR:#EF4444');
    }
    // Alarma 30 min antes
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT30M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:⚽ En 30 min: ${escapeICS(ev.home)} vs ${escapeICS(ev.away)}`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  // ICS requiere CRLF
  return lines.join('\r\n');
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  console.log('⚽ Mundial 2026 ICS Generator');
  console.log('================================');
  console.log(`📦 Total partidos: ${MATCHES.length}`);
  console.log(`🤖 Modelo OpenRouter: ${MODEL}`);
  console.log('');

  if (OPENROUTER_API_KEY === 'PON_TU_KEY_AQUI') {
    console.error('❌ Falta la API key. Ejecútalo con:');
    console.error('   OPENROUTER_API_KEY=sk-or-v1-xxx node mundial2026.js');
    process.exit(1);
  }

  const isTodayMode = process.argv.includes('--today');
  // Obtenemos la fecha en formato YYYY-MM-DD
  // Para pruebas manuales, podemos pasar --date=2026-06-11
  const dateArg = process.argv.find(arg => arg.startsWith('--date='));
  const todayStr = dateArg ? dateArg.split('=')[1] : new Date().toISOString().split('T')[0];

  if (isTodayMode) {
    console.log(`\n📅 MODO ACTUALIZACIÓN DIARIA (--today)`);
    console.log(`Solo se consultará información de última hora para los partidos del ${todayStr}`);
    console.log(`El resto de partidos tendrán un mensaje genérico para ahorrar cuota de API.\n`);
  }

  const enriched = [];
  const total = MATCHES.length;

  for (let i = 0; i < MATCHES.length; i++) {
    const match = MATCHES[i];
    const progress = `[${String(i + 1).padStart(3)}/${total}]`;
    
    let brief = '';
    
    // Si estamos en modo diario y no es el partido de hoy, nos saltamos la llamada a la API
    if (isTodayMode && match.date !== todayStr) {
       brief = `El análisis detallado con el Agente Editor, noticias y posibles alineaciones se publicará automáticamente aquí la mañana del partido (${match.date}).`;
    } else {
       console.log(`${progress} 🔍 Generando brief: ${match.home} vs ${match.away} (${match.phase})`);
       brief = await generateBrief(match);
       // Pausamos para no saturar la API (solo si hemos hecho llamada)
       if (i < MATCHES.length - 1) {
         await new Promise(r => setTimeout(r, DELAY_MS));
       }
    }

    enriched.push({ ...match, brief });
  }

  console.log('\n📝 Construyendo archivo ICS...');
  const icsContent = buildICS(enriched);

  fs.writeFileSync(OUTPUT_FILE, icsContent, 'utf8');
  console.log(`\n✅ Archivo generado: ${OUTPUT_FILE}`);
  
  // Guardar también un JSON para la landing page
  fs.writeFileSync('matches.json', JSON.stringify(enriched, null, 2), 'utf8');
  console.log(`✅ Archivo JSON generado: matches.json`);
  console.log(`📏 Tamaño: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`);
  console.log('\n🚀 PASOS SIGUIENTES:');
  console.log('1. Sube mundial2026.ics a Netlify (arrastra el archivo al panel)');
  console.log('2. Comparte la URL con tus amigos');
  console.log('3. Ellos la abren → "Añadir a calendario" → ¡listo!');
  console.log('\n💡 En Google Calendar también puedes importar via:');
  console.log('   Configuración → Importar y exportar → Importar');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
