import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/services/user.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('[Test Auth] Testing credentials for:', email);

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const user = await verifyPassword(email, password);

    if (!user) {
      console.log('[Test Auth] Authentication failed');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    console.log('[Test Auth] Authentication successful:', user.email, user.role);
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Test Auth] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
