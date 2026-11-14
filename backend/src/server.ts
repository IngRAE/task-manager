import { createApp } from './app.js';
import { openDatabase } from './db.js';

const port = Number(process.env.PORT ?? 3000);
const databasePath = process.env.DATABASE_PATH ?? 'data/tasks.db';

const db = openDatabase(databasePath);
const server = createApp(db).listen(port, (error) => {
  if (error) {
    throw error;
  }
  console.log(`Task API listening on http://localhost:${port} (database: ${databasePath})`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} received, closing the server`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
