import { useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['#a1ade0', '#8aba9f', '#cf9189', '#c7ae79', '#ae9ac4', '#83afb7', '#c592a8', '#a5ad87'];

const SIDES = ['#596185', '#506d5d', '#825752', '#786642', '#635472', '#4b6770', '#794f66', '#5c634b'];

const categoryLabels = {
  alimentacao: "Food",
  transporte: "Transport",
  moradia: "Housing",
  contas: "Bills",
  saude: "Health",
  educacao: "Education",
  lazer: "Leisure",
  compras: "Shopping",
  outros_gastos: "Other"
};

export default function CategoryChart({ data, isLoading }) {
  const id = useId();
  const chartData = data.filter(item => item.value > 0).map(item => ({
    name: categoryLabels[item.name] || item.name,
    value: item.value
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  return (
    <Card className="min-w-0">
      <CardHeader className="border-b">
        <CardTitle>Expenses by category</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 p-4 sm:p-6">
        {isLoading ? (
          <Skeleton className="w-full h-64" />
        ) : (
          <>
            <div className="relative">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <defs>
                    {COLORS.map((color, index) => <linearGradient id={`${id}-${index}`} key={color} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} style={{ filter: "brightness(1.24)" }} />
                      <stop offset="100%" stopColor={color} />
                    </linearGradient>)}
                  </defs>
                  <Pie data={chartData.length ? chartData : [{ value: 1 }]} dataKey="value" cx="50%" cy="53%"
                    innerRadius="53%" outerRadius="81%" paddingAngle={chartData.length > 1 ? 3 : 0}
                    stroke="none" isAnimationActive={false} tooltipType="none">
                    {(chartData.length ? chartData : [{ name:'empty' }]).map((entry, index) =>
                      <Cell key={entry.name} fill={total ? SIDES[index % SIDES.length] : '#23272e'} />)}
                  </Pie>
                  <Pie data={chartData.length ? chartData : [{ value: 1 }]} dataKey="value" cx="50%" cy="48%"
                    innerRadius="53%" outerRadius="81%" paddingAngle={chartData.length > 1 ? 3 : 0} cornerRadius={5}
                    stroke="none" isAnimationActive={false} tooltipType={total ? undefined : 'none'}>
                    {(chartData.length ? chartData : [{ name:'empty' }]).map((entry, index) =>
                      <Cell key={entry.name} fill={total ? `url(#${id}-${index % COLORS.length}) ${COLORS[index % COLORS.length]}` : '#525864'} />)}
                  </Pie>
                  {total > 0 && <Tooltip formatter={value => Number(value).toFixed(2)} />}
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-x-0 top-[48%] -translate-y-1/2 px-8 text-center">
                <p className="text-xs text-muted-foreground">This month</p>
                <p className="truncate text-lg font-semibold tabular-nums">{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            {total > 0 ? (
              <ul className="mt-2 space-y-2">
                {chartData.map((item, index) => <li key={item.name} className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="tabular-nums text-muted-foreground">{Math.round(item.value / total * 100)}%</span>
                </li>)}
              </ul>
            ) : <p className="text-center text-sm text-muted-foreground">No expenses this month</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}