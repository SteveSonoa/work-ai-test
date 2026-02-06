import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasDbHost: !!process.env.DB_HOST,
    hasDbPort: !!process.env.DB_PORT,
    hasDbName: !!process.env.DB_NAME,
    hasDbUser: !!process.env.DB_USER,
    hasDbPassword: !!process.env.DB_PASSWORD,
    dbHostPrefix: process.env.DB_HOST?.substring(0, 10) || 'missing',
    nodeEnv: process.env.NODE_ENV,
  });
}
