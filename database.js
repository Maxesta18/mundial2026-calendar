const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crea y conecta a la base de datos (se creará el archivo db.sqlite si no existe)
const dbPath = path.resolve(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error abriendo la base de datos', err.message);
  } else {
    console.log('✅ Conectado a la base de datos SQLite.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Tabla de usuarios (colegas de la porra)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`);

    // Tabla de predicciones (la porra)
    db.run(`CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      match_id INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      points INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, match_id)
    )`, (err) => {
      if (!err) {
        // Intentar añadir la columna por si la tabla ya existía de la versión anterior
        db.run(`ALTER TABLE predictions ADD COLUMN points INTEGER DEFAULT NULL`, () => {});
      }
    });

    // Tabla de partidos y resultados en vivo
    db.run(`CREATE TABLE IF NOT EXISTS matches_live (
      match_id INTEGER PRIMARY KEY,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT DEFAULT 'PENDING' -- PENDING, LIVE, FINISHED
    )`);
  });
}

// Función para guardar una predicción
function savePrediction(userName, matchId, homeScore, awayScore) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Insertar usuario si no existe
      db.run(`INSERT OR IGNORE INTO users (name) VALUES (?)`, [userName], function(err) {
        if (err) return reject(err);
        
        // 2. Obtener el ID del usuario
        db.get(`SELECT id FROM users WHERE name = ?`, [userName], (err, row) => {
          if (err || !row) return reject(err || new Error("User not found"));
          const userId = row.id;

          // 3. Insertar o actualizar predicción
          db.run(`
            INSERT INTO predictions (user_id, match_id, home_score, away_score) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, match_id) 
            DO UPDATE SET home_score=excluded.home_score, away_score=excluded.away_score
          `, [userId, matchId, homeScore, awayScore], function(err) {
            if (err) return reject(err);
            resolve({ success: true, userId, matchId });
          });
        });
      });
    });
  });
}

// Función para obtener las predicciones de un partido
function getPredictionsForMatch(matchId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT u.name, p.home_score, p.away_score 
      FROM predictions p
      JOIN users u ON p.user_id = u.id
      WHERE p.match_id = ?
    `, [matchId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Función para calcular puntos de un partido
function calculateMatchPoints(matchId, realHomeScore, realAwayScore) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT id, home_score, away_score FROM predictions WHERE match_id = ?`, [matchId], (err, rows) => {
      if (err) return reject(err);

      const realWinner = realHomeScore > realAwayScore ? 'home' : (realAwayScore > realHomeScore ? 'away' : 'draw');
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        rows.forEach(p => {
          let points = 0;
          const predWinner = p.home_score > p.away_score ? 'home' : (p.away_score > p.home_score ? 'away' : 'draw');
          
          if (p.home_score === realHomeScore && p.away_score === realAwayScore) {
            points = 3; // Pleno
          } else if (predWinner === realWinner) {
            points = 1; // Acierto simple
          }
          
          // Guardar puntos en la base de datos (requeriremos añadir la columna)
          db.run(`UPDATE predictions SET points = ? WHERE id = ?`, [points, p.id]);
        });
        
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });
}

// Obtener clasificación
function getLeaderboard() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT u.name, SUM(IFNULL(p.points, 0)) as total_points
      FROM users u
      LEFT JOIN predictions p ON u.id = p.user_id
      GROUP BY u.id
      ORDER BY total_points DESC, u.name ASC
    `, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  savePrediction,
  getPredictionsForMatch,
  calculateMatchPoints,
  getLeaderboard
};
