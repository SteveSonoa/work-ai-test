import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAllUsers, updateUserRole, canManageUsers } from '@/lib/services/user.service';
import { UserRole } from '@/lib/types/database';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can manage users
    if (!canManageUsers(session.user)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to view users' },
        { status: 403 }
      );
    }

    const users = await getAllUsers();

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can manage users
    if (!canManageUsers(session.user)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to update users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    // Validate required fields
    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, role' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: UserRole[] = ['CONTROLLER', 'AUDIT', 'ADMIN', 'NONE'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Get IP and user agent for audit trail
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const updatedUser = await updateUserRole(
      userId,
      role,
      session.user.id,
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
