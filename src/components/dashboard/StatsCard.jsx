import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default function StatsCard({ title, value, trend, featured }) {
  return <Card className={featured ? 'border-primary/20 bg-accent shadow-none' : 'shadow-none'}>
    <CardHeader className="p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <CardTitle className="mt-2 text-2xl font-semibold tabular-nums md:text-3xl">{value}</CardTitle>
      {trend && <p className="mt-2 text-sm text-muted-foreground">{trend}</p>}
    </CardHeader>
  </Card>;
}
