const { db } = require('../db/database');

module.exports = {
  name: 'listInvoices',
  description: 'Lists invoices from the database with various filtering options. Can filter by month, customer, or both. Returns detailed invoice information.',
  inputSchema: {
    type: 'object',
    properties: {
      monthName: { 
        type: 'string', 
        description: 'Filter by month name to list all invoices for a selected month.' 
      },
      customerName: { 
        type: 'string', 
        description: 'Filter by customer name to list all invoices for a selected customer.' 
      },
      detailed: { 
        type: 'boolean', 
        description: 'If true, returns detailed invoice information. If false, returns aggregated values (count and total). Defaults to true.',
        default: true
      }
    },
    required: [],
  },
  handler: async (args) => {
    const safeArgs = args || {};
    const { monthName, customerName, detailed = true } = safeArgs;
    console.error(`[MCP Tool: listInvoices] Received request with args: ${JSON.stringify(safeArgs)}`);

    // Validate data types
    if (monthName && typeof monthName !== 'string') {
      return { isError: true, content: [{ type: 'text', text: 'Invalid argument type. Ensure monthName is a string.' }] };
    }
    if (customerName && typeof customerName !== 'string') {
      return { isError: true, content: [{ type: 'text', text: 'Invalid argument type. Ensure customerName is a string.' }] };
    }
    if (typeof detailed !== 'boolean') {
      return { isError: true, content: [{ type: 'text', text: 'Invalid argument type. Ensure detailed is a boolean.' }] };
    }

    try {
      let query = db('Invoices');

      // Apply filters
      if (monthName) {
        query = query.where('month_name', monthName);
      }
      
      if (customerName) {
        query = query.where('customer_name', customerName);
      }

      const results = await query.orderBy('entry_creation_date', 'desc');

      if (results.length === 0) {
        return {
          content: [{ type: 'text', text: 'No invoices found matching the criteria.' }],
        };
      }

      // Return detailed list or aggregated values based on the detailed flag
      if (detailed) {
        console.error(`[MCP Tool: listInvoices] Returning ${results.length} detailed invoices`);
        return {
          content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
        };
      } else {
        // Return aggregated values
        const count = results.length;
        const total = results.reduce((sum, invoice) => sum + parseFloat(invoice.invoice_amount), 0);
        
        console.error(`[MCP Tool: listInvoices] Returning aggregated data: ${count} invoices, total: ${total}`);
        return {
          content: [{ 
            type: 'text', 
            text: `Number of invoices: ${count}\nTotal income: ${total.toFixed(2)}` 
          }],
        };
      }
    } catch (error) {
      console.error(`[MCP Tool: listInvoices] Database error: ${error.message}`);
      return { 
        isError: true, 
        content: [{ type: 'text', text: `Database error when listing invoices: ${error.message}` }] 
      };
    }
  },
};
