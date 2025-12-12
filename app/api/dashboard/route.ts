import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDashboardStats, getRecentTransactions } from '@/lib/services/dashboard.service';
import { checkDatabaseHealth } from '@/lib/db/connection';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [stats, recentTransactions, dbHealth] = await Promise.all([
      getDashboardStats(),
      getRecentTransactions(10),
      checkDatabaseHealth(),
    ]);

    return NextResponse.json({
      stats,
      recent_transactions: recentTransactions,
      health: {
        database: dbHealth,
        api: {
          healthy: true,
          message: 'API is operational',
        },
      },
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
