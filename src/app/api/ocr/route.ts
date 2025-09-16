import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "OpenAI API key not configured"
      }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: "No image file provided"
      }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    console.log("🔍 Processing receipt with GPT-4 Vision API server-side...");

    // Call OpenAI GPT-4 Vision API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: getExtractionPrompt()
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();

    if (!result.choices?.[0]?.message?.content) {
      throw new Error("No content received from OpenAI API");
    }

    console.log("🤖 GPT-4 Vision Raw Response:", result.choices[0].message.content);

    // Parse the JSON response from GPT-4
    const extractedData = parseGPTResponse(result.choices[0].message.content);

    console.log("✅ Receipt processed successfully:", extractedData);

    return NextResponse.json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    console.error("❌ Receipt processing failed:", error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred during receipt processing"
    }, { status: 500 });
  }
}

function getExtractionPrompt(): string {
  return `Analyze this Italian receipt/scontrino image and extract the following information. Return ONLY a valid JSON object with these exact fields:

{
  "type": "expense_type",
  "amount": number,
  "date": "YYYY-MM-DD",
  "vendor": "vendor_name",
  "description": "brief_description",
  "location": "city_or_address",
  "confidence": number_between_0_and_1,
  "rawText": "visible_text_from_receipt"
}

EXPENSE TYPE RULES:
- LUNCH: if time is between 11:00-15:00 OR contains words like "pranzo", "lunch", "ristorante", "trattoria", "pizzeria"
- DINNER: if time is between 18:00-23:00 OR contains "cena", "dinner"
- BREAKFAST: if time is between 06:00-11:00 OR contains "colazione", "breakfast", "bar" (morning)
- HOTEL: if contains "hotel", "albergo", "soggiorno", "pernottamento"
- FUEL: if contains "carburante", "benzina", "gasolio", "fuel", "esso", "eni", "agip"
- PARKING: if contains "parcheggio", "sosta", "parking"
- TRAIN: if contains "trenitalia", "italo", "biglietto", "treno"
- TAXI: if contains "taxi", "uber", "ncc", "radio taxi", "servizio taxi", "servei taxi", "licencia", "matricula", "recorregut"
- OTHER: if none of the above apply

EXTRACTION RULES:
- Amount: Look for "TOTALE", "TOTAL", "TOT", "€" - extract the FINAL TOTAL amount as a NUMBER (e.g., 77.10 not "77,10")
  IMPORTANT: Convert Italian format (77,10) to decimal format (77.10) for the JSON
- Date: Look for dates in format DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY - convert to YYYY-MM-DD
- Vendor: Extract business name (usually at top of receipt) - NOT the description
- Description: Create meaningful description like "Lunch at [vendor_name]" or "[vendor_name] - [expense_type]"
- Location: Extract city/address if visible
- Time: Use time to help determine expense type
- rawText: Include ALL visible text exactly as written

ITALIAN CONTEXT:
- Receipts may show time in 24h format (13:45 = 1:45 PM = LUNCH time)
- Currency is € (Euro) - amounts may show as "77,10" or "77.10"
- Dates are typically DD/MM/YYYY or DD/MM/YY format (convert to YYYY-MM-DD)
- Common words: "SCONTRINO", "RICEVUTA", "FATTURA", "DATA", "ORA", "TOTALE", "IMPORTO"
- Months in Italian: gennaio, febbraio, marzo, aprile, maggio, giugno, luglio, agosto, settembre, ottobre, novembre, dicembre

CRITICAL RULES:
- ALWAYS return amount as a decimal NUMBER (77.10 not "77,10" or "€77.10")
- ALWAYS return date in YYYY-MM-DD format (e.g., "2025-09-11" not "11/09/2025")
- Be precise with amounts - look for the TOTAL/TOTALE (not subtotals)
- Return valid JSON only, no additional text or markdown.`;
}

function parseGPTResponse(content: string): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in GPT response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and clean the response
    const vendor = typeof parsed.vendor === 'string' ? parsed.vendor.trim() : null;
    const type = validateExpenseType(parsed.type);

    // Create a better description if one wasn't provided or seems generic
    let description = typeof parsed.description === 'string' ? parsed.description.trim() : null;
    if (!description || description.toLowerCase().includes('other expenses from receipt')) {
      if (vendor && type) {
        const typeText = type.toLowerCase().replace('_', ' ');
        description = `${typeText.charAt(0).toUpperCase() + typeText.slice(1)} at ${vendor}`;
      } else if (vendor) {
        description = vendor;
      } else if (type) {
        description = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase().replace('_', ' ');
      }
    }

    // Clean and validate amount
    let amount = null;
    if (parsed.amount !== undefined && parsed.amount !== null) {
      // Handle both number and string formats
      if (typeof parsed.amount === 'number') {
        amount = parsed.amount;
      } else if (typeof parsed.amount === 'string') {
        // Convert Italian format (77,10) to decimal (77.10)
        const cleanAmount = parsed.amount.replace(',', '.').replace(/[^\d.]/g, '');
        const parsedAmount = parseFloat(cleanAmount);
        if (!isNaN(parsedAmount)) {
          amount = parsedAmount;
        }
      }
    }

    return {
      type: type,
      amount: amount,
      date: validateDate(parsed.date),
      vendor: vendor,
      description: description,
      location: typeof parsed.location === 'string' ? parsed.location.trim() : null,
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
      rawText: typeof parsed.rawText === 'string' ? parsed.rawText.trim() : null,
    };
  } catch (error) {
    console.error("Failed to parse GPT response:", error);
    throw new Error("Failed to parse receipt data from GPT response");
  }
}

function validateExpenseType(type: any): string | null {
  const validTypes = [
    "PARKING", "FUEL", "TELEPASS", "LUNCH", "DINNER", "HOTEL",
    "TRAIN", "TAXI", "BREAKFAST", "TOURIST_TAX", "OTHER"
  ];

  if (typeof type === 'string' && validTypes.includes(type)) {
    return type;
  }

  return null;
}

function validateDate(date: any): string | null {
  if (typeof date !== 'string') return null;

  // Try parsing the date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return null;

  // Return in YYYY-MM-DD format
  return parsedDate.toISOString().split('T')[0];
}