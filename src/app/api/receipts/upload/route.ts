import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { azureStorageServerService } from '@/services/azure-storage-server';

// Convert email to safe storage folder name
function emailToStoragePath(email: string): string {
  return email.replace('@', '_').replace(/\./g, '_');
}

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Receipt upload API called');

    // Get authenticated user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check if Azure Storage is available
    if (!azureStorageServerService.isAvailable()) {
      return NextResponse.json({
        success: false,
        error: 'Azure Storage service not available'
      }, { status: 500 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const expenseId = formData.get('expenseId') as string;

    // Use authenticated user's email as userId (converted to safe path)
    const userEmail = session.user.email;
    const userId = emailToStoragePath(userEmail);

    // Validate required fields
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No image file provided'
      }, { status: 400 });
    }

    if (!expenseId) {
      return NextResponse.json({
        success: false,
        error: 'Expense ID is required'
      }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: 'File must be an image (JPEG, PNG, WebP)'
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File size must be less than 10MB'
      }, { status: 400 });
    }

    console.log(`📋 Upload details:`, {
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      fileType: file.type,
      userEmail: userEmail,
      userId: userId,
      expenseId: expenseId
    });

    // Upload to Azure Blob Storage
    const uploadResult = await azureStorageServerService.uploadReceipt(file, expenseId, userId);

    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: uploadResult.error || 'Failed to upload to Azure Storage'
      }, { status: 500 });
    }

    console.log('✅ Receipt uploaded successfully to Azure');

    // Return success with blob URL
    return NextResponse.json({
      success: true,
      data: {
        blobUrl: uploadResult.blobUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Receipt upload API error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during upload'
    }, { status: 500 });
  }
}

// Add GET method for checking service status
export async function GET() {
  try {
    const status = azureStorageServerService.getStatus();
    const containerInfo = azureStorageServerService.getContainerInfo();
    
    return NextResponse.json({
      status: status,
      available: azureStorageServerService.isAvailable(),
      containerInfo: containerInfo
    });
  } catch (error) {
    return NextResponse.json({
      status: 'Error checking Azure Storage status',
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}