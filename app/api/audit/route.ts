import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAuditLogsWithDetails } from '@/lib/services/audit.service';
import { canViewAuditLogs } from '@/lib/services/user.service';
import { createAuditLog } from '@/lib/services/audit.service';
import { AuditAction } from '@/lib/types/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can view audit logs
    if (!canViewAuditLogs(session.user)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to view audit logs' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const initiatorId = searchParams.get('initiatorId') || undefined;
    const approverId = searchParams.get('approverId') || undefined;
    const transactionId = searchParams.get('transactionId') || undefined;
    const accountId = searchParams.get('accountId') || undefined;
    // Support multiple action filters
    const actions = searchParams.getAll('action');
    const action = actions.length > 0 ? (actions as unknown as AuditAction[]) : undefined;
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined;
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : undefined;
    const amountMin = searchParams.get('amountMin') 
      ? parseFloat(searchParams.get('amountMin')!) 
      : undefined;
    const amountMax = searchParams.get('amountMax') 
      ? parseFloat(searchParams.get('amountMax')!) 
      : undefined;
    const amountExact = searchParams.get('amountExact') 
      ? parseFloat(searchParams.get('amountExact')!) 
      : undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getAuditLogsWithDetails({
      userId,
      initiatorId,
      approverId,
      transactionId,
      accountId,
      action,
      startDate,
      endDate,
      amountMin,
      amountMax,
      amountExact,
      limit,
      offset,
    });

    // Log that audit logs were viewed
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    await createAuditLog({
      action: 'AUDIT_LOG_VIEWED',
      userId: session.user.id,
      details: {
        filters: {
          userId,
          initiatorId,
          approverId,
          transactionId,
          accountId,
          action,
          startDate,
          endDate,
          amountMin,
          amountMax,
          amountExact,
        },
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
