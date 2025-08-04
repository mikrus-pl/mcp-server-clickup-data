const { db } = require('../db/database');
const { z } = require('zod');

module.exports = {
  name: 'listInvoices',
  description: 'Lists invoices from the database with various filtering options. Can filter by month, customer, or both. Returns detailed invoice information.',
  inputSchema: z.object({
    monthName: z.string()
      .describe('Filter by month name to list all invoices for a selected month.')
      .optional(),
    customerName: z.string()
      .describe('Filter by customer name to list all invoices for a selected customer.')
      .optional(),
    detailed: z.boolean()
      .describe('If true, returns detailed invoice information. If false, returns aggregated values (count and total).')
      .optional()
      .default(true),
  }),
  handler: async (args) => {
    // The `detailed` argument will be `true` even if the client didn't send it.
    const { monthName, customerName, detailed } = args;
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
