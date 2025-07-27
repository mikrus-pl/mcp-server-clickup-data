const { db } = require('../db/database');

module.exports = {
  name: 'createInvoice',
  description: 'Registers a new invoice in the database. Stores customer name, invoice amount, currency, month assignment, and description.',
  inputSchema: {
    type: 'object',
    properties: {
      customerName: { 
        type: 'string', 
        description: 'Name of the customer for the invoice.' 
      },
      invoiceAmount: { 
        type: 'number', 
        description: 'Invoice amount with up to 12 digits and 2 decimal places.' 
      },
      invoiceCurrency: { 
        type: 'string', 
        description: 'Currency code (e.g., USD, EUR, PLN).' 
      },
      monthName: { 
        type: 'string', 
        description: 'Month name to know which month it should be assigned to.' 
      },
      description: { 
        type: 'string', 
        description: 'Description of invoices/services provided.' 
      }
    },
    required: ['customerName', 'invoiceAmount', 'invoiceCurrency', 'monthName'],
  },
  handler: async (args) => {
    const safeArgs = args || {};
    const { customerName, invoiceAmount, invoiceCurrency, monthName, description } = safeArgs;
    console.error(`[MCP Tool: createInvoice] Received request with args: ${JSON.stringify(safeArgs)}`);

    // Validate required arguments
    if (!customerName) {
      return { isError: true, content: [{ type: 'text', text: 'Error: customerName argument is required.' }] };
    }
    if (invoiceAmount === undefined) {
      return { isError: true, content: [{ type: 'text', text: 'Error: invoiceAmount argument is required.' }] };
    }
    if (!invoiceCurrency) {
      return { isError: true, content: [{ type: 'text', text: 'Error: invoiceCurrency argument is required.' }] };
    }
    if (!monthName) {
      return { isError: true, content: [{ type: 'text', text: 'Error: monthName argument is required.' }] };
    }

    // Validate data types
    if (typeof customerName !== 'string') {
      return { isError: true, content: [{ type: 'text', text: 'Invalid argument type. Ensure customerName is a string.' }] };
    }
    if (typeof invoiceAmount !== 'number') {
      return { isError: true, content: [{ type: 'text', text: 'Invalid argument type. Ensure invoiceAmount is a number.' }] };
    }
    if (typeof invoiceCurrency !== 'string') {
      return { isError: true, content: [{ type: 'text', text: 'Invalid argument type. Ensure invoiceCurrency is a string.' }] };
    }
    if (typeof monthName !== 'string') {
      return { isError: true, content: [{ type: 'text', text: 'Invalid argument type. Ensure monthName is a string.' }] };
    }
    if (description && typeof description !== 'string') {
      return { isError: true, content: [{ type: 'text', text: 'Invalid argument type. Ensure description is a string.' }] };
    }

    try {
      // Insert the new invoice into the database
      const [invoiceId] = await db('Invoices').insert({
        customer_name: customerName,
        invoice_amount: invoiceAmount,
        invoice_currency: invoiceCurrency,
        month_name: monthName,
        entry_creation_date: new Date().toISOString(),
        date_last_updated: new Date().toISOString(),
        description: description || ''
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
