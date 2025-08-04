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
        description: 'Optional description of invoices/services provided.'
      }
    },
    required: ['customerName', 'invoiceAmount', 'invoiceCurrency', 'monthName']
  },
  handler: async (args) => {
    // Manual validation since we're not using Zod anymore
    if (!args || typeof args !== 'object') {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: args must be an object' }] 
      };
    }
    
    const { customerName, invoiceAmount, invoiceCurrency, monthName, description } = args;
    
    // Validate required fields
    if (typeof customerName !== 'string' || customerName.trim() === '') {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: customerName must be a non-empty string' }] 
      };
    }
    
    if (typeof invoiceAmount !== 'number' || isNaN(invoiceAmount)) {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: invoiceAmount must be a number' }] 
      };
    }
    
    if (typeof invoiceCurrency !== 'string' || invoiceCurrency.trim() === '') {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: invoiceCurrency must be a non-empty string' }] 
      };
    }
    
    if (typeof monthName !== 'string' || monthName.trim() === '') {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: monthName must be a non-empty string' }] 
      };
    }
    
    // Validate optional field if provided
    if (description !== undefined && typeof description !== 'string') {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: description must be a string' }] 
      };
    }
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
