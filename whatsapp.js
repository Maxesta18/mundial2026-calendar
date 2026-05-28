const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client;
let isReady = false;

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
    // Comandos básicos
    if (msg.body === '!ping') {
      msg.reply('pong 🏓. ¡El Mono Maldini está online!');
    } else if (msg.body === '!porra') {
      msg.reply('Para echar la porra del día, entra aquí: https://mundial-magico.netlify.app/');
    } else if (msg.body === '!partidos') {
      msg.reply('Revisa tu Google Calendar, pringao. O entra en la web para verlos.');
    }
  });

  client.initialize();
}

async function sendBroadcastMessage(groupIdOrNumber, message) {
  if (!isReady) {
    console.error('El bot de WhatsApp no está listo para enviar mensajes.');
    return;
  }
  try {
    await client.sendMessage(groupIdOrNumber, message);
    console.log(`Mensaje enviado a ${groupIdOrNumber}`);
  } catch (err) {
    console.error('Error enviando mensaje de WhatsApp', err);
  }
}

module.exports = {
  startWhatsAppBot,
  sendBroadcastMessage
};
