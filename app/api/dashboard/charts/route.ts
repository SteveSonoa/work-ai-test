import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  getTransactionTrends,
  getVolumeTrends,
  getStatusBreakdown,
} from '@/lib/services/dashboard.service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '28');

    // Validate days parameter
    if (![7, 28, 365].includes(days)) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be 7, 28, or 365' },
        { status: 400 }
      );
    }

    const [transactionTrends, volumeTrends, statusBreakdown] = await Promise.all([
      getTransactionTrends(days),
      getVolumeTrends(days),
      getStatusBreakdown(days),
    ]);

    return NextResponse.json({
      transactionTrends,
      volumeTrends,
      statusBreakdown,
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
