import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { initiateTransfer } from '@/lib/services/transfer.service';
import { canInitiateTransfers } from '@/lib/services/user.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can initiate transfers
    if (!canInitiateTransfers(session.user)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to initiate transfers' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fromAccountId, toAccountId, amount, description } = body;

    // Validate required fields
    if (!fromAccountId || !toAccountId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: fromAccountId, toAccountId, amount' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Get IP and user agent for audit trail
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Initiate transfer
    const transaction = await initiateTransfer({
      fromAccountId,
      toAccountId,
      amount,
      initiatedBy: session.user.id,
      description,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      transaction,
      message: transaction.requires_approval 
        ? 'Transfer initiated and awaiting approval'
        : 'Transfer completed successfully',
    });
  } catch (error) {
    console.error('Transfer initiation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
