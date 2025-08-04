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
        description: 'If true, returns detailed invoice information. If false, returns aggregated values (count and total).',
        default: true
      }
    },
    required: []
  },
  handler: async (args) => {
    // Manual validation since we're not using Zod anymore
    if (!args || typeof args !== 'object') {
      args = {};
    }
    
    const { monthName, customerName } = args;
    // Handle default value for detailed
    const detailed = args.detailed !== undefined ? args.detailed : true;
    
    // Validate optional fields if provided
    if (monthName !== undefined && typeof monthName !== 'string') {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: monthName must be a string' }] 
      };
    }
    
    if (customerName !== undefined && typeof customerName !== 'string') {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: customerName must be a string' }] 
      };
    }
    
    if (args.detailed !== undefined && typeof args.detailed !== 'boolean') {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: detailed must be a boolean' }] 
      };
    }
    console.error(`[MCP Tool: listInvoices] Received request with args: ${JSON.stringify(args)}`);

    // No need for manual validation or setting defaults like `detailed = true`

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
