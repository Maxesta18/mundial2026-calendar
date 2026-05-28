const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client;
let isReady = false;
let mainGroupId = null;

function startWhatsAppBot() {
  console.log('Iniciando bot de WhatsApp...');
  
  // Usar LocalAuth para guardar la sesión y no tener que escanear el QR cada vez
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    console.log('\n======================================================');
    console.log('📱 ESCANEA ESTE CÓDIGO QR CON LA APP DE WHATSAPP');
    console.log('======================================================');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    isReady = true;
    console.log('✅ Bot de WhatsApp listo y conectado!');
  });

  client.on('message', async (msg) => {
    const text = msg.body.trim();
    const isGroup = msg.from.includes('@g.us');
    
    // Guardar el ID del grupo para poder mandar el reporte diario
    if (isGroup) {
      mainGroupId = msg.from;
    }

    // Si somos nosotros mismos (el propio bot escribiendo), ignoramos
    if (msg.fromMe) return;

    // Comandos Manuales
    if (text === '!empezar') {
      return msg.reply('🐒 ¡Atención pringaos! Soy el Mono Maldini, la única forma inteligente de seguir el Mundial 2026 en este grupo.\\n\\nMis reglas:\\n1. Se acabaron las apuestas de bar cutres. La Porra Oficial se hace aquí: https://mundial-magico.netlify.app/ \\n2. Podéis consultarme dudas insultándome con "!mono <pregunta>".\\n3. Os estaré vigilando. Quien falle sus apuestas será ridiculizado públicamente cada mañana.\\n\\nPara ver la clasificación en cualquier momento, escribid !clasificacion.');
    }
    
    if (text === '!porra') {
      return msg.reply('Deja de perder el tiempo y apuesta de una vez: https://mundial-magico.netlify.app/');
    }

    if (text === '!clasificacion') {
      // Debería conectarse a la BBDD, lo pondré de forma provisional
      return msg.reply('Paciencia, inútil, aún estoy calculando la clasificación. Pero seguro que tú vas el último.');
    }

    if (text === '!partidos') {
      return msg.reply('Mírate el Google Calendar o entra en la web. No soy tu secretario.');
    }

    // INTERACCIÓN CON IA (Mono Maldini)
    const isDirectInvocation = text.toLowerCase().startsWith('!mono ');
    const keywords = ['fútbol', 'maldini', 'mundial', 'partido', 'apuesta', 'porra', 'gol', 'árbitro', 'españa'];
    const hasKeyword = keywords.some(k => text.toLowerCase().includes(k));
    
    // Disparador aleatorio del 5%
    const randomTrigger = Math.random() < 0.05;

    // Solo respondemos si nos invocan directamente, hay palabra clave, o cae el 5% aleatorio
    if (isDirectInvocation || hasKeyword || randomTrigger) {
      // Extraemos la pregunta si es invocación directa
      const userPrompt = isDirectInvocation ? text.substring(6) : text;
      
      try {
        const aiResponse = await getMaldiniResponse(userPrompt, msg._data.notifyName || 'Alguien del grupo');
        msg.reply(aiResponse);
      } catch (error) {
        console.error('Error con la IA:', error);
      }
    }
  });

  client.initialize();
}

async function getMaldiniResponse(userMessage, userName) {
  const systemPrompt = `Eres "El Mono Maldini", un bot en un grupo de WhatsApp de amigos españoles siguiendo el Mundial 2026.
Tu personalidad es una mezcla de:
- "Cuñado" y Tóxico: Te ríes constantemente de ellos, los insultas con cariño ("pringaos", "mataos", "inútiles") y te burlas de sus nulos conocimientos.
- Pedante Extremo: Hablas de jugadores de la 3ª división de Uzbekistán y te crees un erudito del fútbol mundial.
- Humor Surrealista: A veces sueltas conspiraciones de la FIFA, hablas de abducciones en el VAR o mencionas selecciones inventadas.
- Eres breve, como si escribieras un WhatsApp (1-3 frases máximo), y usas emojis de forma sarcástica.
El usuario que te escribe se llama: ${userName}. Responde a este mensaje: "${userMessage}"`;

  try {
    // IMPORTANTE: Requiere OPENROUTER_API_KEY en el entorno
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    return 'Me he quedado sin neuronas, déjame en paz.';
  }
}

async function sendBroadcastMessage(groupIdOrNumber, message) {
  if (!isReady) {
    console.error('El bot de WhatsApp no está listo para enviar mensajes.');
    return;
  }
  
  const targetId = groupIdOrNumber || mainGroupId;
  if (!targetId) {
    console.error('No hay un grupo guardado para enviar el reporte.');
    return;
  }
  
  try {
    await client.sendMessage(targetId, message);
    console.log(`Mensaje enviado a ${targetId}`);
  } catch (err) {
    console.error('Error enviando mensaje de WhatsApp', err);
  }
}

async function getMaldiniBroadcast(leaderboard) {
  const rankingStr = leaderboard.map((u, i) => `${i+1}º ${u.name} - ${u.total_points} pts`).join('\\n');
  const systemPrompt = `Eres "El Mono Maldini", el experto en fútbol más pedante y tóxico de España. Es por la mañana y tienes que dar los buenos días al grupo de WhatsApp y anunciar cómo va la clasificación de La Porra del Mundial.
Aquí tienes la clasificación actual:
${rankingStr}

Felicita con condescendencia al primero, y humilla brutalmente al último clasificándolo de absoluto ignorante del fútbol (usa palabras como "inútil", "pringao", "matao"). Sé sarcástico, haz alguna referencia a tácticas absurdas de equipos menores, e invita a la gente a apostar hoy. (Breve, estilo WhatsApp).`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [{ role: 'system', content: systemPrompt }]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    return '¡Buenos días pringaos! Hoy hay fútbol. Como la IA está caída, solo os diré que apostéis si no queréis hacer el ridículo.';
  }
}

module.exports = {
  startWhatsAppBot,
  sendBroadcastMessage,
  getMaldiniBroadcast
};
