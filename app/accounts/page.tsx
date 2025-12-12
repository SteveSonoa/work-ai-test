import { requireAuth } from '@/lib/auth/session';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/Card';
import { getAllAccounts } from '@/lib/services/account.service';
import { Account } from '@/lib/types/database';
import Link from 'next/link';

export default async function AccountsPage() {
  await requireAuth();
  const accounts = await getAllAccounts();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Bank Accounts</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts?.map((account: Account) => (
            <Link key={account.id} href={`/accounts/${account.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{account.account_name}</h3>
                    <p className="text-sm text-gray-700">{account.account_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Balance</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-700">
                      Minimum Balance: ${Number(account.minimum_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
