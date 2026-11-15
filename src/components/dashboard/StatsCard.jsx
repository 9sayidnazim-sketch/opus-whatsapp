import { Card, CardContent } from '@/components/ui/card';
import { Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function StatsCard({ title, value, trend, trendType = 'neutral', featured, icon: Icon }) {
  return (
    <Card
      className={`min-w-0 rounded-2xl border transition-all duration-200 ${
        featured
          ? 'fuloozi-card-featured bg-gradient-to-br from-[#1a2316] via-[#181b1f] to-[#121417] border-[#B5F13E]/30 shadow-lime'
          : 'bg-card border-border hover:border-border/90'
      }`}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground tracking-tight">{title}</p>
          {Icon ? (
            <div className={`p-2 rounded-xl ${featured ? 'bg-[#B5F13E]/15 text-[#B5F13E]' : 'bg-secondary/70 text-muted-foreground'}`}>
              <Icon className="w-4 h-4" />
            </div>
          ) : featured ? (
            <div className="p-2 rounded-xl bg-[#B5F13E]/15 text-[#B5F13E]">
              <Wallet className="w-4 h-4" />
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading tracking-tight text-foreground tabular-nums">
            {value}
          </div>
          {trend && (
            <div className="flex items-center gap-1.5 pt-1">
              {trendType === 'positive' ? (
                <span className="inline-flex items-center text-xs font-medium text-emerald-400">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  {trend}
                </span>
              ) : trendType === 'negative' ? (
                <span className="inline-flex items-center text-xs font-medium text-rose-400">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  {trend}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{trend}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
