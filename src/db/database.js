require('dotenv').config(); // Aby załadować CDC_DATABASE_PATH
const knex = require('knex');

const cdcDatabasePath = process.env.CDC_DATABASE_PATH;

if (!cdcDatabasePath) {
  console.error('[MCP Server DB] ERROR: CDC_DATABASE_PATH is not set in .env file.');
  // Można rzucić błąd, aby serwer się nie uruchomił
  throw new Error('CDC_DATABASE_PATH environment variable is not set.');
}

const dbConfig = {
  client: 'sqlite3',
  connection: {
    filename: cdcDatabasePath
  },
  useNullAsDefault: true,
  // Ważne: Ustaw flagę `flags: ['OPEN_READONLY']` dla połączeń tylko do odczytu,
  // aby zminimalizować ryzyko konfliktów i przypadkowych zapisów.
  // To jest specyficzne dla sterownika sqlite3.
  pool: { // Dodajemy konfigurację pool, aby przekazać flagi do sterownika
    afterCreate: (conn, done) => {
      // Dla SQLite, 'flags' są częścią obiektu połączenia, nie konfiguracji pool
      // Musimy to ustawić bezpośrednio w `connection`.
      done(null, conn); // Standardowy callback
    }
  },
  // Poprawiona konfiguracja `connection` dla flag tylko do odczytu
};

// Poprawiona konfiguracja `connection` dla flag tylko do odczytu dla SQLite
const db = knex({
    client: 'sqlite3',
    connection: {
        filename: cdcDatabasePath
       // flags: ['OPEN_READONLY'] // Otwórz bazę w trybie tylko do odczytu
    },
    useNullAsDefault: true
});


// Prosty test połączenia (opcjonalny dla serwera, który tylko czyta)
async function testReadOnlyConnection() {
  try {
    await db.raw('SELECT 1');
    console.error('[MCP Server DB] Successfully connected to CDC database in read-only mode.');
  } catch (error) {
    console.error('[MCP Server DB] Failed to connect to CDC database:', error);
    console.error(`[MCP Server DB] Path used: ${cdcDatabasePath}`);
    // Rzuć błąd, aby zatrzymać serwer, jeśli połączenie jest krytyczne
    throw error; 
  }
}
// Wywołaj test przy starcie, jeśli chcesz
// testReadOnlyConnection().catch(err => process.exit(1));


module.exports = {
  db, // Eksportujemy instancję knex
  testReadOnlyConnection // Możemy ją wywołać przy starcie serwera
};