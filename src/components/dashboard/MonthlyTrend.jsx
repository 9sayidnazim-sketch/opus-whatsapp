import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';

export default function MonthlyTrend({ transactions, isLoading }) {
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
        .reduce((sum, t) => sum + t.amount, 0);

      const despesas = monthTransactions
        .filter(t => t.type === 'despesa')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        month: format(month, 'MMM', { locale: enUS }),
        receitas,
        despesas,
        saldo: receitas - despesas
      };
    });
  }, [transactions]);

  return (
    <Card className="min-w-0">
      <CardHeader className="border-b">
        <CardTitle>Monthly trend</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 p-4 sm:p-6">
        {isLoading ? (
          <Skeleton className="w-full h-64" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickMargin={8} />
              <YAxis width={48} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="receitas" 
                stroke="#8aba9f" 
                strokeWidth={2}
                name="Income"
              />
              <Line 
                type="monotone" 
                dataKey="despesas" 
                stroke="#cf9189" 
                strokeWidth={2}
                name="Expenses"
              />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="#a1ade0" 
                strokeWidth={2}
                name="Balance"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}