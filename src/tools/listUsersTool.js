const { db } = require('../db/database');
const { z } = require('zod'); // Import Zod

module.exports = {
  name: 'listUsers',
  description: 'Lists all users from the ClickUp data collector database with their most recent hourly rate.',
  inputSchema: z.object({}), // To narzędzie nie przyjmuje argumentów wejściowych
  handler: async (args) => { // args będzie pustym obiektem
    console.error('[MCP Tool: listUsers] Received request.');
    try {
      // Zapytanie do bazy: pobierz użytkowników i dołącz ich najnowszą stawkę
      // To zapytanie może być skomplikowane, aby wybrać tylko najnowszą stawkę.
      // Możemy to zrobić przez podzapytanie lub `ROW_NUMBER()` jeśli SQLite to wspiera dobrze z Knex.
      // Prostsze podejście na start: pobierz wszystkich userów i dla każdego zrób osobne zapytanie o najnowszą stawkę,
      // lub pobierz wszystkich userów i wszystkie stawki i przetwórz w JS.
      // Dla MVP, pobierzemy userów, a potem dla każdego najnowszą stawkę.
      
      const users = await db('Users').select('clickup_user_id', 'username', 'email', 'is_active', 'role');
      
      const usersWithRates = [];
      for (const user of users) {
        const latestRate = await db('UserHourlyRates')
          .where('user_id', user.clickup_user_id)
          .orderBy('effective_from_date', 'desc') // Najnowsza data początkowa
          .first(); // Weź tylko pierwszy (najnowszy) pasujący rekord

        usersWithRates.push({
          clickup_user_id: user.clickup_user_id,
          username: user.username,
          email: user.email,
          is_active: user.is_active,
          role: user.role,
          current_hourly_rate: latestRate ? latestRate.hourly_rate : null,
          rate_effective_from: latestRate ? latestRate.effective_from_date : null,
        });
      }

      if (usersWithRates.length === 0) {
        return {
          content: [{ type: 'text', text: 'No users found in the database.' }],
        };
      }

      // Zwracamy dane jako JSON string w TextContent
      // LLM będzie musiał to sparsować. Alternatywnie, jeśli klient wspiera `structuredContent`,
      // moglibyśmy zdefiniować `outputSchema` dla tego narzędzia i zwrócić obiekt.
      // Na razie dla prostoty MVP: JSON string.
      return {
        content: [{ type: 'text', text: JSON.stringify(usersWithRates, null, 2) }],
      };

    } catch (error) {
      console.error('[MCP Tool: listUsers] Error:', error);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error listing users: ${error.message}` }],
      };
    }
  },
};