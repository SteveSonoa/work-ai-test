import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getPendingApprovalsForAdmin } from '@/lib/services/approval.service';
import { canApproveTransfers } from '@/lib/services/user.service';

export async function GET(request: NextRequest) {
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
        { error: 'Forbidden: Insufficient permissions to view approvals' },
        { status: 403 }
      );
    }

    const approvals = await getPendingApprovalsForAdmin(session.user.id);

    return NextResponse.json({ approvals });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
