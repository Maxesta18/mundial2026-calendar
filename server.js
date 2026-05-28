const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { savePrediction, getLeaderboard } = require('./database');
const { startWhatsAppBot, sendBroadcastMessage, getMaldiniBroadcast, getProactiveMessage } = require('./whatsapp');

const app = express();
// Puerto 80 para que entren sin poner :3000
const PORT = process.env.PORT || 80;

app.use(cors());
app.use(express.json());
// Servir la landing page y archivos estáticos
app.use(express.static(path.join(__dirname, '/')));

// API para obtener partidos de la porra (leemos el matches.json por ahora)
app.get('/api/matches', (req, res) => {
  try {
    const data = require('./matches.json');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'No se pudieron cargar los partidos' });
  }
});

// API para guardar apuestas en la porra
app.post('/api/porra', async (req, res) => {
  const { name, matchId, homeScore, awayScore } = req.body;
  if (!name || matchId == null || homeScore == null || awayScore == null) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  
  try {
    await savePrediction(name, parseInt(matchId), parseInt(homeScore), parseInt(awayScore));
    res.json({ success: true, message: '¡Apuesta guardada con éxito!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error guardando la apuesta' });
  }
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  
  // Arrancar el bot de WhatsApp
  startWhatsAppBot();

  // Programar el cron diario a las 09:00 AM para generar el reporte de Maldini
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Ejecutando cron diario de Maldini (09:00 AM)...');
    try {
      // 1. Obtener clasificación actual
      const leaderboard = await getLeaderboard();
      if (leaderboard.length === 0) {
        return; // No hay jugadores aún
      }
      // 2. Pedirle a la IA que redacte el mensaje
      const maldiniMessage = await getMaldiniBroadcast(leaderboard);
      // 3. Enviarlo al grupo
      await sendBroadcastMessage(null, maldiniMessage);
    } catch (err) {
      console.error('Error en el cron diario:', err);
    }
  });

  // Programar un cron que hable solo cada 6 horas para caldear el ambiente
  cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ Ejecutando interacción espontánea de Maldini...');
    try {
      const randomMsg = await getProactiveMessage();
      await sendBroadcastMessage(null, randomMsg);
    } catch (err) {
      console.error('Error en interacción proactiva:', err);
    }
  });
});
