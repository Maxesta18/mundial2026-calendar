const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { savePrediction } = require('./database');
const { startWhatsAppBot } = require('./whatsapp');

// Importamos la lógica existente del Mundial para usar sus funciones (más adelante las exportaremos)
// const { MATCHES } = require('./mundial2026'); // Refactorizaremos esto luego

const app = express();
const PORT = process.env.PORT || 3000;

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

  // Programar el cron diario a las 08:00 AM para generar el ICS y mandarlo por WhatsApp
  cron.schedule('0 8 * * *', () => {
    console.log('⏰ Ejecutando cron diario (08:00 AM)...');
    // Aquí invocaremos la lógica de mundial2026.js y mandaremos el mensaje de WhatsApp
  });
});
