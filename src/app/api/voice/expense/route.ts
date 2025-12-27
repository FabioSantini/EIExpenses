import { NextRequest, NextResponse } from 'next/server';
import { voiceTokenBlobService } from '@/services/voice-token-blob-service';
import { prisma } from '@/lib/prisma';

/**
 * Voice Expense JSON Schema
 * Received from the voicebot
 */
interface VoiceExpensePayload {
  userToken: string;
  expenseNoteName: string;
  expenseType: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  // Type-specific fields (optional)
  duration?: string;
  parkingZone?: string;
  startLocation?: string;
  endLocation?: string;
  vehicleType?: string;
  distance?: string;
  liters?: string;
  route?: string;
  class?: string;
  departure?: string;
  arrival?: string;
  customer?: string;
  colleagues?: string;
  hotelLocation?: string;
  numberOfNights?: string;
  roomType?: string;
  otherDetails?: string;
}

// Valid expense types (matching our system)
const VALID_EXPENSE_TYPES = [
  'PARKING', 'FUEL', 'TELEPASS', 'LUNCH', 'DINNER',
  'HOTEL', 'TRAIN', 'BREAKFAST', 'TOURIST_TAX', 'OTHER'
];

/**
 * Normalize expense type to match our system
 * Handle common variations from voice input
 */
function normalizeExpenseType(type: string): string | null {
  if (!type) return null;

  const normalized = type.toUpperCase().trim();

  // Direct match
  if (VALID_EXPENSE_TYPES.includes(normalized)) {
    return normalized;
  }

  // Common variations
  const mappings: Record<string, string> = {
    'PARCHEGGIO': 'PARKING',
    'BENZINA': 'FUEL',
    'CARBURANTE': 'FUEL',
    'GASOLIO': 'FUEL',
    'PRANZO': 'LUNCH',
    'CENA': 'DINNER',
    'COLAZIONE': 'BREAKFAST',
    'ALBERGO': 'HOTEL',
    'TRENO': 'TRAIN',
    'TASSA_SOGGIORNO': 'TOURIST_TAX',
    'TASSA SOGGIORNO': 'TOURIST_TAX',
    'ALTRO': 'OTHER',
  };

  return mappings[normalized] || null;
}

/**
 * Parse date string to Date object
 * Handles various formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try ISO format first (YYYY-MM-DD)
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

/**
 * Build metadata object from type-specific fields
 */
function buildMetadata(payload: VoiceExpensePayload): Record<string, any> {
  const metadata: Record<string, any> = {};

  // Only include non-empty fields
  if (payload.duration) metadata.duration = payload.duration;
  if (payload.parkingZone) metadata.parkingZone = payload.parkingZone;
  if (payload.startLocation) metadata.startLocation = payload.startLocation;
  if (payload.endLocation) metadata.endLocation = payload.endLocation;
  if (payload.vehicleType) metadata.vehicleType = payload.vehicleType;
  if (payload.distance) metadata.distance = payload.distance;
  if (payload.liters) metadata.liters = payload.liters;
  if (payload.route) metadata.route = payload.route;
  if (payload.class) metadata.class = payload.class;
  if (payload.departure) metadata.departure = payload.departure;
  if (payload.arrival) metadata.arrival = payload.arrival;
  if (payload.customer) metadata.customer = payload.customer;
  if (payload.colleagues) metadata.colleagues = payload.colleagues;
  if (payload.hotelLocation) metadata.hotelLocation = payload.hotelLocation;
  if (payload.numberOfNights) metadata.numberOfNights = payload.numberOfNights;
  if (payload.roomType) metadata.roomType = payload.roomType;
  if (payload.otherDetails) metadata.otherDetails = payload.otherDetails;

  return metadata;
}

/**
 * POST /api/voice/expense
 * Receive expense data from voicebot and create expense line
 */
export async function POST(request: NextRequest) {
  console.log('🎤 Voice expense API called');

  try {
    // Parse request body
    const payload: VoiceExpensePayload = await request.json();
    console.log('🎤 Received payload:', JSON.stringify(payload, null, 2));

    // 1. Validate user token
    if (!payload.userToken) {
      return NextResponse.json(
        { success: false, error: 'Token utente mancante' },
        { status: 400 }
      );
    }

    const tokenValidation = await voiceTokenBlobService.validateVoiceToken(payload.userToken);
    if (!tokenValidation) {
      return NextResponse.json(
        { success: false, error: 'Token non valido o scaduto. Genera un nuovo token dalla pagina Settings.' },
        { status: 401 }
      );
    }

    const { userId, userEmail } = tokenValidation;
    console.log(`🎤 Token validated for user: ${userEmail}`);

    // 2. Validate expense note name
    if (!payload.expenseNoteName || payload.expenseNoteName.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Nome nota spese mancante' },
        { status: 400 }
      );
    }

    // 3. Find expense report by name (case-insensitive via LOWER comparison)
    // Note: Azure SQL Server doesn't support Prisma's 'mode: insensitive'
    const searchTitle = payload.expenseNoteName.trim().toLowerCase();
    const userReports = await prisma.expenseReport.findMany({
      where: {
        user_email: userEmail
      }
    });

    // Manual case-insensitive match
    const expenseReport = userReports.find(
      report => report.title.toLowerCase() === searchTitle
    );

    if (!expenseReport) {
      console.log(`🎤 Expense report not found: "${payload.expenseNoteName}" for user ${userEmail}`);
      return NextResponse.json(
        {
          success: false,
          error: `Nota spese "${payload.expenseNoteName}" non trovata. Verifica il nome e riprova.`
        },
        { status: 404 }
      );
    }

    console.log(`🎤 Found expense report: ${expenseReport.id} - "${expenseReport.title}"`);

    // 4. Validate and normalize expense type
    const normalizedType = normalizeExpenseType(payload.expenseType);
    if (!normalizedType) {
      return NextResponse.json(
        {
          success: false,
          error: `Tipo spesa "${payload.expenseType}" non riconosciuto. Tipi validi: ${VALID_EXPENSE_TYPES.join(', ')}`
        },
        { status: 400 }
      );
    }

    // 5. Parse and validate date
    const expenseDate = parseDate(payload.date);
    if (!expenseDate) {
      return NextResponse.json(
        {
          success: false,
          error: `Data "${payload.date}" non valida. Usa formato YYYY-MM-DD o DD/MM/YYYY.`
        },
        { status: 400 }
      );
    }

    // 6. Validate amount
    const amount = typeof payload.amount === 'number' ? payload.amount : parseFloat(String(payload.amount));
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json(
        { success: false, error: 'Importo non valido' },
        { status: 400 }
      );
    }

    // 7. Build metadata
    const metadata = buildMetadata(payload);

    // 8. Create expense line
    const expenseLine = await prisma.expenseLine.create({
      data: {
        report_id: expenseReport.id,
        user_email: userEmail,
        date: expenseDate,
        type: normalizedType,
        description: payload.description || '',
        amount: amount,
        currency: payload.currency || 'EUR',
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      }
    });

    console.log(`🎤 Created expense line: ${expenseLine.id}`);

    // 9. Update report totals
    await prisma.expenseReport.update({
      where: { id: expenseReport.id },
      data: {
        total_amount: { increment: amount },
        line_count: { increment: 1 }
      }
    });

    console.log(`🎤 Updated report totals for ${expenseReport.id}`);

    // 10. Return success
    return NextResponse.json({
      success: true,
      message: `Spesa di €${amount.toFixed(2)} aggiunta alla nota "${expenseReport.title}"`,
      expense: {
        id: expenseLine.id,
        type: normalizedType,
        amount: amount,
        currency: expenseLine.currency,
        date: expenseDate.toISOString().split('T')[0],
        reportId: expenseReport.id,
        reportTitle: expenseReport.title
      }
    });

  } catch (error) {
    console.error('🎤 Error processing voice expense:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'JSON non valido nel body della richiesta' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
