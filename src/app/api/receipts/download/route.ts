import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to proxy receipt downloads from Azure Blob Storage
 * This avoids CORS issues when fetching receipts from the browser
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const receiptUrl = searchParams.get('url');

    if (!receiptUrl) {
      return NextResponse.json(
        { error: 'Receipt URL is required' },
        { status: 400 }
      );
    }

    // Validate that it's a valid Azure Blob Storage URL
    if (!receiptUrl.includes('blob.core.windows.net')) {
      return NextResponse.json(
        { error: 'Invalid receipt URL' },
        { status: 400 }
      );
    }

    console.log(`📥 Downloading receipt from Azure: ${receiptUrl}`);

    // Fetch the receipt from Azure Blob Storage (server-to-server, no CORS)
    const response = await fetch(receiptUrl);

    if (!response.ok) {
      console.error(`❌ Failed to fetch receipt: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch receipt: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the blob data
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    // Get content type from Azure response
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log(`✅ Receipt downloaded successfully: ${buffer.byteLength} bytes, type: ${contentType}`);

    // Return the receipt with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('❌ Error downloading receipt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download receipt' },
      { status: 500 }
    );
  }
}
