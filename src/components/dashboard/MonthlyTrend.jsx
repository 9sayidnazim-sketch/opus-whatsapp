import { useId, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';

const SERIES = [
  { key: 'receitas', label: 'Income', top: '#c9ded0', color: '#8aba9f', side: '#506b5b' },
  { key: 'despesas', label: 'Expenses', top: '#e9bab3', color: '#cf9189', side: '#78514f' },
  { key: 'saldo', label: 'Balance', top: '#c5cff6', color: '#a1ade0', side: '#575e88' },
];

function RaisedBar({ x, y, width, height, value, color, side, top }) {
  if (!width || !height) return null;
  const up = value >= 0;
  const heightAbs = Math.abs(height);
  const topY = Math.min(y, y + height);
  const depth = Math.min(4, width / 3, heightAbs / 2);
  const capY = up ? topY : topY + heightAbs;
  const offset = up ? -depth : depth;
  return (
    <g>
      <path d={`M ${x + width} ${topY} l ${depth} ${offset} v ${heightAbs} l -${depth} ${-offset} Z`} fill={side} />
      <rect x={x} y={topY} width={width} height={heightAbs} rx={Math.min(3, depth)} fill={color} />
      <path d={`M ${x + 1} ${capY} l ${depth} ${offset} h ${width - 1} l -${depth} ${-offset} Z`} fill={top} />
    </g>
  );
}

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
            <BarChart data={chartData} margin={{ top: 16, right: 6, bottom: 0, left: 0 }} barGap={4}>
              <defs>
                {SERIES.map(series => <linearGradient key={series.key} id={`${chartId}-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series.top} />
                  <stop offset="100%" stopColor={series.color} />
                </linearGradient>)}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 5" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickMargin={8} tickLine={false} />
              <YAxis width={48} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip formatter={value => Number(value).toFixed(2)} cursor={{ fill: '#ffffff0c' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              {SERIES.map(series => <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color}
                maxBarSize={24} isAnimationActive={false}
                shape={props => <RaisedBar {...props} color={`url(#${chartId}-${series.key})`} side={series.side} top={series.top} />} />)}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}