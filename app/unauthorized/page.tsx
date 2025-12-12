import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <>
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <div className="text-center space-y-6">
            <div className="text-6xl">🚫</div>
            <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact your administrator.
            </p>
            <div className="pt-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </>
  );
}
