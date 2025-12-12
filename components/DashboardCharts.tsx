'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface TransactionTrend {
  date: string;
  count: number;
}

interface VolumeTrend {
  date: string;
  volume: number;
}

interface StatusBreakdown {
  name: string;
  value: number;
}

interface DashboardChartsProps {
  initialTransactionTrends: TransactionTrend[];
  initialVolumeTrends: VolumeTrend[];
  initialStatusBreakdown: StatusBreakdown[];
  initialDays: number;
}

const COLORS = {
  Success: '#10b981', // green-500
  'In Progress': '#3b82f6', // blue-500
  Failed: '#ef4444', // red-500
  Other: '#6b7280', // gray-500
};

export default function DashboardCharts({
  initialTransactionTrends,
  initialVolumeTrends,
  initialStatusBreakdown,
  initialDays,
}: DashboardChartsProps) {
  const [selectedDays, setSelectedDays] = useState(initialDays);
  const [transactionTrends, setTransactionTrends] = useState(initialTransactionTrends);
  const [volumeTrends, setVolumeTrends] = useState(initialVolumeTrends);
  const [statusBreakdown, setStatusBreakdown] = useState(initialStatusBreakdown);
  const [loading, setLoading] = useState(false);

  const handleDaysChange = async (days: number) => {
    setSelectedDays(days);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/dashboard/charts?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setTransactionTrends(data.transactionTrends || []);
        setVolumeTrends(data.volumeTrends || []);
        setStatusBreakdown(data.statusBreakdown || []);
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Period</h3>
          <div className="flex gap-2">
            <Button
              variant={selectedDays === 7 ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleDaysChange(7)}
              disabled={loading}
            >
              7 Days
            </Button>
            <Button
              variant={selectedDays === 28 ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleDaysChange(28)}
              disabled={loading}
            >
              28 Days
            </Button>
            <Button
              variant={selectedDays === 365 ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleDaysChange(365)}
              disabled={loading}
            >
              365 Days
            </Button>
          </div>
        </div>
      </Card>

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-700">Loading chart data...</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Transaction Count Chart */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transactions Per Day</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={transactionTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  labelFormatter={formatDate}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                  name="Transactions"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Volume Chart */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Volume Per Day</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                  name="Volume ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Status Breakdown Pie Chart */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusBreakdown as unknown as Array<{ name: string; value: number }>}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.Other} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}
