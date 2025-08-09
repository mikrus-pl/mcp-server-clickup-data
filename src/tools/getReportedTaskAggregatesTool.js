const { db } = require('../db/database');
const fs = require('fs');
const path = require('path');
//const { required } = require('zod/v4-mini');

// Function to log to file
function logToFile(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  const logFilePath = path.join(__dirname, '../../logs/getReportedTaskAggregates.log');
  
  // Ensure logs directory exists
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.appendFileSync(logFilePath, logMessage);
}

// Ręcznie zdefiniowany JSON Schema dla MCP
const inputSchema = {
  type: 'object',
  properties: {
    clientName: {
      type: 'string',
      description: 'Filter by client name (exact match, case-insensitive for query). Optional.'
    },
    userId: {
      type: 'integer',
      description: 'Filter by ClickUp User ID. Optional.'
    },
    month: {
      type: 'string',
      description: 'Filter by month name in Polish (e.g., "kwiecień", "lipiec"). Case-insensitive. Optional.'
    },
    limit: {
      type: 'integer',
      description: 'Limit the number of results (e.g., 100). Optional, defaults to 1000 if not provided.',
      default: 1000
    }
  },
  required: [],
  additionalProperties: false
};

// Debug: Log the JSON Schema
console.error('[DEBUG - getReportedTaskAggregates] JSON Schema:', JSON.stringify(inputSchema, null, 2));

module.exports = {
  name: 'getReportedTaskAggregates',
  description: 'Retrieves aggregated task time report from the database. Allows filtering by client name, user ID, and month (Polish month names, e.g., "kwiecień", "lipiec").',
  inputSchema, // To jest czysty JSON Schema, nie obiekt Zod!
  handler: async (args) => {
    // Manual validation since we're not using Zod anymore
    if (!args || typeof args !== 'object') {
      args = {};
    }
    
    // Validate optional fields if provided
    if (args.clientName !== undefined && typeof args.clientName !== 'string') {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: clientName must be a string' }] 
      };
    }
    
    if (args.userId !== undefined && (typeof args.userId !== 'number' || !Number.isInteger(args.userId))) {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: userId must be an integer' }] 
      };
    }
    
    if (args.month !== undefined && typeof args.month !== 'string') {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: month must be a string' }] 
      };
    }
    
    if (args.limit !== undefined && (typeof args.limit !== 'number' || !Number.isInteger(args.limit))) {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: limit must be an integer' }] 
      };
    }
    
    // Handle default value for limit
    const limit = args.limit !== undefined ? Math.min(args.limit, 5000) : 1000;
    
    // Extract parameters
    const clientName = args.clientName || null;
    const userId = args.userId || null;
    const month = args.month || null;
    
    // Log raw arguments received
    logToFile(`RECEIVED ARGS: ${JSON.stringify(args)}`);
    console.error(`[MCP Tool: getReportedTaskAggregates] Received request with filters:`, args);
    

    
    // Log extracted parameters
    logToFile(`EXTRACTED PARAMS - clientName: ${clientName}, userId: ${userId}, month: ${month}, limit: ${limit}`);
    logToFile(`PARAMETER TYPES - clientName: ${typeof clientName}, userId: ${typeof userId}, month: ${typeof month}, limit: ${typeof limit}`);
    
    console.error(`[MCP Tool: getReportedTaskAggregates] Extracted parameters - clientName: ${clientName}, userId: ${userId}, month: ${month}, limit: ${limit}`);

    try {
      // Build query with detailed logging
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
        .limit(limit);
      
      logToFile(`QUERY BUILT - Base query with limit: ${limit}`);
      
      // Apply filters with detailed logging
      if (clientName) {
        logToFile(`APPLYING FILTER - clientName: ${clientName}`);
        query = query.whereRaw('LOWER(ReportedTaskAggregates.client_name) = LOWER(?)', [clientName]);
      }
      if (userId) {
        logToFile(`APPLYING FILTER - userId: ${userId}`);
        query = query.where('ReportedTaskAggregates.reported_for_user_id', userId);
      }
      if (month) {
        logToFile(`APPLYING FILTER - month: ${month}`);
        console.warn(`[MCP Tool: getReportedTaskAggregates] Filtering by month ('${month}') based on 'extracted_month_from_parent_name'. Comparison is case-insensitive.`);
        query = query.whereRaw('LOWER(ReportedTaskAggregates.extracted_month_from_parent_name) = LOWER(?)', [month]);
      }
      
      // Log final query structure
      logToFile(`FINAL QUERY STRUCTURE: ${JSON.stringify(query.toString())}`);
      
      const results = await query;
      
      logToFile(`QUERY EXECUTED - Results count: ${results.length}`);
      
      // Log sample of results if any
      if (results.length > 0) {
        // Count results by month
        const monthCounts = {};
        results.forEach(result => {
          const monthName = result.monthInTaskName || 'unknown';
          monthCounts[monthName] = (monthCounts[monthName] || 0) + 1;
        });
        logToFile(`RESULTS BY MONTH: ${JSON.stringify(monthCounts)}`);
      }

      if (results.length === 0) {
        logToFile(`NO RESULTS FOUND`);
        return {
          content: [{ type: 'text', text: 'No aggregated task data found matching the criteria.' }],
        };
      }

      logToFile(`RETURNING ${results.length} RESULTS`);
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };

    } catch (error) {
      logToFile(`ERROR: ${error.message}`);
      console.error('[MCP Tool: getReportedTaskAggregates] Error:', error);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error retrieving aggregated task data: ${error.message}` }],
      };
    }
  },
};