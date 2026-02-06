import { NextResponse } from 'next/server';
import { query } from '@/lib/db/connection';

export async function GET() {
  try {
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    return NextResponse.json({
      success: true,
      time: result.rows[0].current_time,
      version: result.rows[0].pg_version,
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
