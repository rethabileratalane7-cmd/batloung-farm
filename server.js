require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/db');

const PORT = Number(process.env.PORT) || 3000;

// The server starts even when MySQL is down; API calls then answer with 503.
app.listen(PORT, async () => {
  console.log(`Batloung Farm API listening on port ${PORT}`);
  console.log(`Open the system:  http://localhost:${PORT}`);
  console.log(`API health check: http://localhost:${PORT}/api/health`);
  const db = await testConnection();
  console.log(db.ok ? `[db] ${db.message}` : `[db] WARNING: ${db.message}. API will return 503 until MySQL is reachable.`);
});

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));