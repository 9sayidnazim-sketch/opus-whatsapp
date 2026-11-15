import { useId, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { formatCurrency } from '@/utils';

const SERIES = [
  { key: 'receitas', label: 'Income', color: '#4ade80' },
  { key: 'despesas', label: 'Expenses', color: '#f87171' },
  { key: 'saldo', label: 'Net Savings', color: '#B5F13E' },
];

export default function MonthlyTrend({ transactions, isLoading }) {
  const chartId = useId();
  const chartData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= monthStart && tDate <= monthEnd;
      });

      const receitas = monthTransactions
        .filter(t => t.type === 'receita')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const despesas = monthTransactions
        .filter(t => t.type === 'despesa')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      return {
        month: format(month, 'MMM', { locale: enUS }),
        receitas,
        despesas,
        saldo: receitas - despesas
      };
    });
  }, [transactions]);

  return (
    <Card className="min-w-0 rounded-2xl bg-card border-border">
      <CardHeader className="p-4 sm:p-6 border-b border-border/80 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base sm:text-lg font-semibold text-foreground">Cashflow & Trend</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Income vs spending over the past 6 months</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80]" />
            <span className="text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f87171]" />
            <span className="text-muted-foreground">Expenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B5F13E]" />
            <span className="text-muted-foreground">Net</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {isLoading ? (
          <Skeleton className="w-full h-64 rounded-xl" />
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262a30" vertical={false} />
                <XAxis dataKey="month" stroke="#8e95a0" fontSize={12} tickLine={false} axisLine={{ stroke: '#262a30' }} />
                <YAxis
                  stroke="#8e95a0"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === 'receitas' ? 'Income' : name === 'despesas' ? 'Expenses' : 'Net Savings'
                  ]}
                  contentStyle={{
                    backgroundColor: '#181b1f',
                    borderColor: '#262a30',
                    borderRadius: '12px',
                    color: '#fafafa',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="receitas" fill="#4ade80" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="despesas" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="saldo" fill="#B5F13E" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
