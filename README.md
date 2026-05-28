# ⚽ Mundial 2026 — Calendar Generator

Genera un `.ics` con los **104 partidos del Mundial 2026** que cualquiera puede importar a Google Calendar, Apple Calendar u Outlook con un solo clic.

Cada evento incluye:
- Hora en España peninsular (Europa/Madrid)
- Sede y fase del torneo
- Cadena de TV en España (RTVE La 1 o DAZN/Mediapro)
- Streaming disponible
- Brief periodístico con contexto, alineaciones probables y pronóstico
- Alarma automática 30 minutos antes del partido

## Requisitos

- Node.js 18+
- API key de [OpenRouter](https://openrouter.ai) (gratuito para registrarse)
- Modelo recomendado: `moonshotai/kimi-k2` (gratuito) o `google/gemini-flash-1.5` (casi gratuito)

## Uso

```bash
# Instalar dependencias
npm install

# Ejecutar (sustituye con tu key real)
OPENROUTER_API_KEY=sk-or-v1-xxx node mundial2026.js
```

El proceso tarda ~2-3 minutos (104 llamadas a la API con 800ms de pausa entre cada una).

## Distribuir el calendario

### Opción A — Enlace compartido (recomendado)
1. Sube `mundial2026.ics` a Netlify (arrastra el archivo al panel de deploy)
2. Comparte la URL directa al archivo `.ics`
3. Tus amigos la abren → su calendario pregunta automáticamente si quieren importarlo

### Opción B — Importación manual
1. Abre Google Calendar → ⚙️ Configuración
2. "Importar y exportar" → "Importar"
3. Selecciona `mundial2026.ics`

### Opción C — Suscripción viva (si tienes servidor)
Sube el ICS a una URL pública y en Google Calendar usa "Añadir de URL" para suscribirse y recibir actualizaciones automáticas.

## Configuración

Edita las primeras líneas de `mundial2026.js`:

```js
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'PON_TU_KEY_AQUI';
const MODEL = 'moonshotai/kimi-k2'; // cambia aquí el modelo
const DELAY_MS = 800; // pausa entre llamadas (bájala si tienes plan de pago)
```

## Modelos recomendados en OpenRouter

| Modelo | Coste | Calidad |
|--------|-------|---------|
| `moonshotai/kimi-k2` | Gratis | ⭐⭐⭐⭐ |
| `google/gemini-flash-1.5` | ~$0.01 para todo | ⭐⭐⭐⭐ |
| `meta-llama/llama-3.1-8b-instruct:free` | Gratis | ⭐⭐⭐ |

## Retransmisión en España

- **RTVE La 1** (gratis): partidos de España, inauguración, semis, final y grandes duelos
- **DAZN / Mediapro Mundial**: resto de partidos (74 en exclusiva de pago)
- Incluido en Movistar+ y Orange TV con paquete fútbol
