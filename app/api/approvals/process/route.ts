import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { processApproval } from '@/lib/services/approval.service';
import { canApproveTransfers } from '@/lib/services/user.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can approve transfers
    if (!canApproveTransfers(session.user)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to approve transfers' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { transactionId, decision, notes } = body;

    // Validate required fields
    if (!transactionId || !decision) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionId, decision' },
        { status: 400 }
      );
    }

    // Validate decision
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Decision must be either APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    // Get IP and user agent for audit trail
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Process approval
    const transaction = await processApproval({
      transactionId,
      approverId: session.user.id,
      decision,
      notes,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      transaction,
      message: decision === 'APPROVED' 
        ? 'Transfer approved and completed successfully'
        : 'Transfer rejected',
    });
  } catch (error) {
    console.error('Approval processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
