import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SchemaField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
}

interface DocumentRequest {
  documentContent: string; // Base64 for images/PDFs, or extracted text for Word docs
  documentType: 'word' | 'pdf' | 'image';
  targetSchema: 'inventory' | 'employees' | 'customers' | 'expenses';
  mimeType?: string;
}

const schemaDefinitions: Record<string, { fields: SchemaField[]; prompt: string }> = {
  inventory: {
    fields: [
      { key: 'sku', label: 'SKU/Product Code', required: true, type: 'string' },
      { key: 'name', label: 'Product Name', required: true, type: 'string' },
      { key: 'unit_price', label: 'Unit Price', required: true, type: 'number' },
      { key: 'current_stock', label: 'Current Stock', required: false, type: 'number' },
      { key: 'reorder_level', label: 'Reorder Level', required: false, type: 'number' },
      { key: 'description', label: 'Description', required: false, type: 'string' },
      { key: 'category', label: 'Category', required: false, type: 'string' },
    ],
    prompt: `Extract product/inventory data from this document.

Return a JSON array with objects containing these fields:
- sku (string, required): Product code/SKU. If not found, generate sequential SKUs like "PROD-001", "PROD-002"
- name (string, required): Product name
- unit_price (number, required): Price per unit. Remove currency symbols, parse correctly
- current_stock (number, optional): Stock quantity. Default 0 if not found
- reorder_level (number, optional): Reorder threshold. Default 10 if not found
- description (string, optional): Product description
- category (string, optional): Product category

Rules:
1. Extract ALL products/items you can find
2. Generate sequential SKUs if none provided
3. Parse prices correctly (remove K, $, ZMW symbols)
4. Return ONLY valid JSON array, no explanations`,
  },
  employees: {
    fields: [
      { key: 'full_name', label: 'Full Name', required: true, type: 'string' },
      { key: 'employee_type', label: 'Employee Type', required: true, type: 'string' },
      { key: 'department', label: 'Department', required: false, type: 'string' },
      { key: 'job_title', label: 'Job Title', required: false, type: 'string' },
      { key: 'phone', label: 'Phone', required: false, type: 'string' },
      { key: 'email', label: 'Email', required: false, type: 'string' },
      { key: 'base_salary_zmw', label: 'Base Salary (ZMW)', required: false, type: 'number' },
    ],
    prompt: `Extract employee/staff data from this document.

Return a JSON array with objects containing these fields:
- full_name (string, required): Employee's full name
- employee_type (string, required): One of: driver, cleaner, security, office_staff, part_time, temporary, contract
- department (string, optional): Department name
- job_title (string, optional): Job title/position
- phone (string, optional): Phone number
- email (string, optional): Email address
- base_salary_zmw (number, optional): Monthly salary in ZMW

Rules:
1. Extract ALL employees/staff you can find
2. Infer employee_type from job title if not explicit
3. Parse salary correctly (remove currency symbols)
4. Return ONLY valid JSON array, no explanations`,
  },
  customers: {
    fields: [
      { key: 'name', label: 'Customer Name', required: true, type: 'string' },
      { key: 'phone', label: 'Phone', required: false, type: 'string' },
      { key: 'email', label: 'Email', required: false, type: 'string' },
      { key: 'address', label: 'Address', required: false, type: 'string' },
      { key: 'customer_type', label: 'Customer Type', required: false, type: 'string' },
    ],
    prompt: `Extract customer/client data from this document.

Return a JSON array with objects containing these fields:
- name (string, required): Customer/client name (person or company)
- phone (string, optional): Phone number
- email (string, optional): Email address
- address (string, optional): Physical address
- customer_type (string, optional): One of: individual, business, wholesale

Rules:
1. Extract ALL customers/clients you can find
2. Infer customer_type from context if not explicit
3. Return ONLY valid JSON array, no explanations`,
  },
  expenses: {
    fields: [
      { key: 'description', label: 'Description', required: true, type: 'string' },
      { key: 'amount', label: 'Amount', required: true, type: 'number' },
      { key: 'date', label: 'Date', required: false, type: 'string' },
      { key: 'category', label: 'Category', required: false, type: 'string' },
      { key: 'vendor', label: 'Vendor', required: false, type: 'string' },
    ],
    prompt: `Extract expense/transaction data from this document.

Return a JSON array with objects containing these fields:
- description (string, required): Description of the expense
- amount (number, required): Amount in ZMW
- date (string, optional): Date in YYYY-MM-DD format
- category (string, optional): Expense category
- vendor (string, optional): Vendor/supplier name

Rules:
1. Extract ALL expenses/transactions you can find
2. Parse amounts correctly (remove currency symbols)
3. Convert dates to YYYY-MM-DD format
4. Return ONLY valid JSON array, no explanations`,
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { documentContent, documentType, targetSchema, mimeType } = await req.json() as DocumentRequest;

    if (!documentContent || !targetSchema) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: documentContent, targetSchema" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const schema = schemaDefinitions[targetSchema];
    if (!schema) {
      return new Response(
        JSON.stringify({ error: `Invalid target schema: ${targetSchema}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${documentType} document for ${targetSchema} schema`);

    // Build the message content based on document type
    let messageContent: any[];
    
    if (documentType === 'word') {
      // For Word docs, we receive extracted text
      messageContent = [
        {
          type: "text",
          text: `${schema.prompt}\n\nDocument Content:\n${documentContent}`
        }
      ];
    } else {
      // For PDFs and images, use vision capabilities
      const mediaType = mimeType || (documentType === 'pdf' ? 'application/pdf' : 'image/jpeg');
      messageContent = [
        {
          type: "text",
          text: schema.prompt
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${mediaType};base64,${documentContent}`
          }
        }
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a data extraction assistant. Extract structured data from documents and return only valid JSON arrays. Never include explanations or markdown formatting."
          },
          {
            role: "user",
            content: messageContent
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing JSON...");

    // Try to extract JSON from the response
    let extractedData: any[];
    try {
      // First try direct parse
      extractedData = JSON.parse(content);
    } catch {
      // Try to find JSON array in the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Failed to parse AI response:", content);
        throw new Error("Could not extract valid JSON from AI response");
      }
    }

    if (!Array.isArray(extractedData)) {
      extractedData = [extractedData];
    }

    console.log(`Extracted ${extractedData.length} records`);

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        schema: schema.fields,
        recordCount: extractedData.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Document conversion error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
