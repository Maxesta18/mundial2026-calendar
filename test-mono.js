// test-mono.js

async function testMono() {
  const match = {
    home: 'España',
    away: 'Arabia Saudí',
    phase: 'Fase de Grupos',
    group: 'Grupo H'
  };
  
  const prompt = `Eres el "Mono Maldini", un editor deportivo con personalidades múltiples, irreverente, gamberro y sin filtros.
Tu misión es escribir la descripción para el calendario del Mundial 2026: ${match.home} vs ${match.away} (${match.group || match.phase}).

Instrucciones OBLIGATORIAS:
1. ADOPTA UNA PERSONALIDAD AL AZAR: Escribe todo el texto actuando como un cuñado de bar de Carabanchel, o como Tomás Roncero hiperventilando, o como un documental lento de La 2, o como un apostador ludópata. Que se note MUCHO el personaje.
2. RESUMEN REAL: Da un brevísimo contexto del partido.
3. EL CERVEZÓMETRO 🍺: Define el nivel de sufrimiento del partido y sugiere la dosis exacta de alcohol para soportarlo (ej. "Nivel 3: Requiere 2 litros de cerveza tibia y un Jäger").
4. EL EXCUSÓMETRO LABORAL 👔: Invéntate una excusa ridículamente elaborada pero que suene creíble para que el usuario pueda enviársela a su jefe/pareja y escaquearse para ver el partido.
5. APUESTA ESTÚPIDA 💸: Propón una apuesta absurda a jugar con los colegas (ej. "Si De la Fuente se toca la nariz antes del min 10, pagas ronda").
6. DATO INÚTIL INVENTADO 🤥: Intercala un dato 100% falso, surrealista y gracioso sobre un jugador o el entrenador como si fuera verdad absoluta.
7. NOTICIAS REALES: Si abajo hay "NOTICIAS RECIENTES OBTENIDAS", úsalas para dar contexto de última hora real.
8. ENLACES: Si hay noticias, DEBES poner los enlaces literalmente al final del todo (Ejemplo: "🗞️ Lee más: [URL]" y "📸 Imagen: [URL]").

Noticias crudas (si las hay):
NOTICIAS RECIENTES OBTENIDAS:
- Marca: Lamine Yamal llega tocado tras una sobrecarga. (Link: https://marca.com/lamine)

Escribe sin usar markdown (nada de asteriscos). Texto plano, limpio, gamberro y directo al grano (máximo 250 palabras).`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    console.log(data.choices[0].message.content);
  } catch (error) {
    console.error(error.message);
  }
}

testMono();
