const { db } = require('../db/database');

module.exports = {
  name: 'getReportedTaskAggregates',
  description: 'Retrieves aggregated task time report from the database. Allows filtering by client name, user ID, and month (Polish month names, e.g., "kwiecień", "lipiec").',
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
        description: 'Filter by month name in Polish (e.g., "kwiecień", "lipiec"). Case-insensitive. Optional.' 
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
        // Filter by Polish month name (e.g., "kwiecień", "lipiec")
        // The database field `extracted_month_from_parent_name` contains Polish month names
        // TODO: In the future, consider standardizing to YYYY-MM format for more precise filtering
        // For now, we perform a case-insensitive comparison with the Polish month names in the database
        console.warn(`[MCP Tool: getReportedTaskAggregates] Filtering by month ('${month}') based on 'extracted_month_from_parent_name'. Comparison is case-insensitive.`);
        query = query.whereRaw('LOWER(ReportedTaskAggregates.extracted_month_from_parent_name) = LOWER(?)', [month]);
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