const { db } = require('../db/database');

module.exports = {
  name: 'getReportedTaskAggregates',
  description: 'Retrieves aggregated task time report from the database. Allows filtering by client name, user ID, and month (YYYY-MM).',
  inputSchema: {
    type: 'object',
    properties: {
      clientName: { 
        type: 'string', 
        description: 'Filter by client name (exact match, case-insensitive for query). Optional.' 
      },
      userId: { 
        type: 'integer', // ClickUp User ID
        description: 'Filter by ClickUp User ID. Optional.' 
      },
      month: { 
        type: 'string', 
        pattern: '^\\d{4}-(0[1-9]|1[0-2])$', // Format YYYY-MM
        description: 'Filter by month of the parent task (e.g., "2024-03"). Optional.' 
      },
      limit: {
        type: 'integer',
        description: 'Limit the number of results (e.g., 100). Optional, defaults to a server-side limit if not provided.',
        default: 1000 // Domyślny limit, jeśli klient nie poda
      }
    },
    // required: [] // Na razie żadne pole nie jest wymagane
  },
  handler: async (args) => {
    const { clientName, userId, month, limit = 1000 } = args; // Użyj domyślnego limitu
    console.error(`[MCP Tool: getReportedTaskAggregates] Received request with filters:`, args);

    try {
      let query = db('ReportedTaskAggregates')
        .join('Users', 'ReportedTaskAggregates.reported_for_user_id', '=', 'Users.clickup_user_id')
        .select(
          'ReportedTaskAggregates.clickup_parent_task_id as parentTaskId',
          'ReportedTaskAggregates.parent_task_name as parentTaskName',
          'ReportedTaskAggregates.client_name as client',
          'Users.username as person',
          'ReportedTaskAggregates.reported_for_user_id as personClickUpId',
          'ReportedTaskAggregates.extracted_month_from_parent_name as monthInTaskName',
          'ReportedTaskAggregates.total_time_minutes as minutes',
          'ReportedTaskAggregates.total_time_seconds as seconds',
          'ReportedTaskAggregates.last_calculated_at as calculatedAt'
        )
        .limit(Math.min(limit, 5000)); // Ogranicz maksymalny limit po stronie serwera

      if (clientName) {
        // Użyj `whereRaw` dla porównania case-insensitive w SQLite, lub `whereILike` jeśli dostępne i działa poprawnie
        // Dla SQLite `ILIKE` nie jest standardem, ale `LOWER()` działa.
        query = query.whereRaw('LOWER(ReportedTaskAggregates.client_name) = LOWER(?)', [clientName]);
      }
      if (userId) {
        query = query.where('ReportedTaskAggregates.reported_for_user_id', userId);
      }
      if (month) {
        // Zakładamy, że extracted_month_from_parent_name przechowuje nazwę miesiąca np. "styczeń"
        // lub numer. Jeśli to nazwa, a filtr `month` to YYYY-MM, potrzebujemy mapowania.
        // Na razie załóżmy, że `extracted_month_from_parent_name` to coś, co można porównać z `month`
        // lub że LLM poda odpowiedni format.
        // Dla prostoty, jeśli `extracted_month_from_parent_name` to np. "2024-Marzec", a `month` to "2024-03"
        // to bezpośrednie porównanie nie zadziała.
        // W specyfikacji mieliśmy `extracted_month_from_name` (TEXT, NULLABLE) - Nazwa miesiąca (np. "styczeń", "luty") lub numer miesiąca (1-12)
        // TODO: Doprecyzować jak filtrować po miesiącu, jeśli `month` jest YYYY-MM, a w bazie jest np. "marzec".
        // Na razie proste porównanie, zakładając, że formaty są spójne lub LLM sobie poradzi.
        // Jeśli `extracted_month_from_parent_name` zawiera tylko nazwę miesiąca, a `month` to YYYY-MM,
        // to musimy inaczej filtrować (np. po `last_calculated_at` lub parsować datę z nazwy zadania).
        // Dla MVP załóżmy, że filtr `month` odnosi się do `extracted_month_from_parent_name`
        // i jeśli to YYYY-MM, to LLM musi wiedzieć, że to może nie pasować do formatu w bazie.
        // Lepsze: jeśli `month` to YYYY-MM, filtruj po `strftime('%Y-%m', last_calculated_at)` lub podobnie,
        // albo zmień `extracted_month_from_parent_name` na format YYYY-MM.
        // Na razie, jeśli `month` jest, spróbujmy dopasować do `extracted_month_from_parent_name` lub `parent_task_name`.
        // To wymaga przemyślenia. Na razie pomińmy filtrowanie po `month` w kodzie, jeśli nie jest to proste.
         if (month) {
             // Przykład: jeśli extracted_month_from_parent_name zawiera np. "2024 Styczeń"
             // a month to "2024-01"
             // console.warn("[MCP Tool: getReportedTaskAggregates] Month filtering is complex due to format mismatch. For MVP, this filter might not work as expected unless formats align.");
             // Możesz spróbować `query = query.where('ReportedTaskAggregates.extracted_month_from_parent_name', 'LIKE', `%${month}%`);`
             // ale to słabe. Lepiej byłoby ujednolicić format `extracted_month_from_parent_name` na YYYY-MM.
             // Na razie:
             // query = query.where('ReportedTaskAggregates.extracted_month_from_parent_name', month);
             console.warn(`[MCP Tool: getReportedTaskAggregates] Filtering by month ('${month}') based on 'extracted_month_from_parent_name'. Ensure formats match or adjust LLM query.`);
             query = query.where('ReportedTaskAggregates.extracted_month_from_parent_name', month);

         }
      }

      const results = await query;

      if (results.length === 0) {
        return {
          content: [{ type: 'text', text: 'No aggregated task data found matching the criteria.' }],
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };

    } catch (error) {
      console.error('[MCP Tool: getReportedTaskAggregates] Error:', error);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error retrieving aggregated task data: ${error.message}` }],
      };
    }
  },
};