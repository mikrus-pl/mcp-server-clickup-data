const { db } = require('../db/database');
const { z } = require('zod');

module.exports = {
  name: 'createInvoice',
  description: 'Registers a new invoice in the database. Stores customer name, invoice amount, currency, month assignment, and description.',
  
  inputSchema: z.object({
    customerName: z.string()
      .describe('Name of the customer for the invoice.'),
    invoiceAmount: z.number()
      .describe('Invoice amount with up to 12 digits and 2 decimal places.'),
    invoiceCurrency: z.string()
      .describe('Currency code (e.g., USD, EUR, PLN).'),
    monthName: z.string()
      .describe('Month name to know which month it should be assigned to.'),
    description: z.string()
      .describe('Optional description of invoices/services provided.')
      .optional(),
  }),
  handler: async (args) => {
    // No need to check for existence or type of args, Zod did it for you!
    const { customerName, invoiceAmount, invoiceCurrency, monthName, description } = args;
    console.error(`[MCP Tool: createInvoice] Received validated request with args: ${JSON.stringify(args)}`);

    try {
      const [invoiceId] = await db('Invoices').insert({
        customer_name: customerName,
        invoice_amount: invoiceAmount,
        invoice_currency: invoiceCurrency,
        month_name: monthName,
        entry_creation_date: new Date().toISOString(),
        date_last_updated: new Date().toISOString(),
        description: description || null // Handle optional field for DB
      });

      console.error(`[MCP Tool: createInvoice] Successfully created invoice with ID: ${invoiceId}`);
      
      return {
        content: [{ type: 'text', text: `Successfully created invoice for ${customerName} with ID: ${invoiceId}` }],
      };
    } catch (error) {
      console.error(`[MCP Tool: createInvoice] Database error: ${error.message}`);
      return { 
        isError: true, 
        content: [{ type: 'text', text: `Database error when creating invoice: ${error.message}` }] 
      };
    }
  },
};
