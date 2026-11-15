import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default function StatsCard({ title, value, trend, featured }) {
  return <Card className={featured ? 'opus-dashboard-balance min-w-0' : 'min-w-0'}>
    <CardHeader className="gap-2 space-y-0 p-3 sm:p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <CardTitle className="break-words text-xl font-semibold leading-tight tabular-nums sm:text-3xl">{value}</CardTitle>
      {trend && <p className="text-xs text-muted-foreground sm:text-sm">{trend}</p>}
    </CardHeader>
  </Card>;
}
