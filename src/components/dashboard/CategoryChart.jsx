import { useId, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryLabel, formatCurrency } from "@/utils";

const COLORS = [
  '#B5F13E', // Fuloozi Lime
  '#38bdf8', // Sky
  '#a78bfa', // Purple
  '#fbbf24', // Amber
  '#f87171', // Coral Red
  '#34d399', // Emerald
  '#fb923c', // Orange
  '#e879f9', // Fuchsia
  '#94a3b8', // Slate
];

export default function CategoryChart({ data, isLoading }) {
  const chartData = useMemo(() => {
    return (data || [])
      .filter(item => item.value > 0)
      .map(item => ({
        name: getCategoryLabel(item.name),
        rawCategory: item.name,
        value: item.value,
      }));
  }, [data]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="min-w-0 rounded-2xl bg-card border-border">
      <CardHeader className="p-4 sm:p-6 border-b border-border/80 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base sm:text-lg font-semibold text-foreground">Expenses by Category</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Where your household money is going</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Total Spent</span>
          <p className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(total)}</p>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {isLoading ? (
          <Skeleton className="w-full h-56 rounded-xl" />
        ) : chartData.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center text-muted-foreground text-sm">
            <p>No expense data recorded yet for this period.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    stroke="#181b1f"
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={value => [formatCurrency(Number(value)), 'Spent']}
                    contentStyle={{
                      backgroundColor: '#181b1f',
                      borderColor: '#262a30',
                      borderRadius: '12px',
                      color: '#fafafa',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Categories</span>
                <span className="text-sm font-bold text-foreground">{chartData.length}</span>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {chartData.map((item, index) => {
                const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate text-foreground font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="text-muted-foreground">{percent}%</span>
                      <span className="text-foreground font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
