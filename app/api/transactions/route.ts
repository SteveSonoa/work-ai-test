import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db/connection';
import { Transaction } from '@/lib/types/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const initiatedBy = searchParams.get('initiatedBy');
    const approvedBy = searchParams.get('approvedBy');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramCount = 1;

    if (initiatedBy) {
      conditions.push(`t.initiated_by = $${paramCount}`);
      params.push(initiatedBy);
      paramCount++;
    }

    if (approvedBy) {
      conditions.push(`t.approved_by = $${paramCount}`);
      params.push(approvedBy);
      paramCount++;
    }

    if (minAmount) {
      conditions.push(`t.amount >= $${paramCount}`);
      params.push(parseFloat(minAmount));
      paramCount++;
    }

    if (maxAmount) {
      conditions.push(`t.amount <= $${paramCount}`);
      params.push(parseFloat(maxAmount));
      paramCount++;
    }

    if (startDate) {
      conditions.push(`t.created_at >= $${paramCount}`);
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      conditions.push(`t.created_at <= $${paramCount}`);
      params.push(endDate);
      paramCount++;
    }

    if (status) {
      conditions.push(`t.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get transactions
    const transactionsQuery = `
      SELECT 
        t.*,
        fa.account_number as from_account_number,
        fa.account_name as from_account_name,
        ta.account_number as to_account_number,
        ta.account_name as to_account_name,
        iu.email as initiated_by_email,
        iu.first_name as initiated_by_first_name,
        iu.last_name as initiated_by_last_name,
        au.email as approved_by_email,
        au.first_name as approved_by_first_name,
        au.last_name as approved_by_last_name
      FROM transactions t
      LEFT JOIN accounts fa ON t.from_account_id = fa.id
      LEFT JOIN accounts ta ON t.to_account_id = ta.id
      LEFT JOIN users iu ON t.initiated_by = iu.id
      LEFT JOIN users au ON t.approved_by = au.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit, offset);
    const result = await query<Transaction>(transactionsQuery, params);

    return NextResponse.json({
      transactions: result.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
