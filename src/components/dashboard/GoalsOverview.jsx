import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl, formatCurrency } from "@/utils";

export default function GoalsOverview({ goals, isLoading }) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl bg-card border-border">
        <CardHeader className="p-4 sm:p-6 border-b border-border/80">
          <CardTitle className="text-base font-semibold">Household Goals</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const activeGoals = (goals || []).filter(
    g => !g.status || g.status === 'em_progresso' || g.status === 'in_progress' || g.status === 'active'
  );

  if (activeGoals.length === 0) {
    return (
      <Card className="rounded-2xl bg-card border-border">
        <CardHeader className="p-4 sm:p-6 border-b border-border/80">
          <CardTitle className="text-base font-semibold text-foreground">Household Goals</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
          <p className="text-sm text-muted-foreground mb-4">No savings goals created yet</p>
          <Link
            to={createPageUrl("Goals")}
            className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors"
          >
            Create goal
          </Link>
        </CardContent>
      </Card>
    );
  }

  const topGoals = activeGoals.slice(0, 3);

  return (
    <Card className="rounded-2xl bg-card border-border">
      <CardHeader className="p-4 sm:p-6 border-b border-border/80 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base sm:text-lg font-semibold text-foreground">Savings Goals</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Progress toward household milestones</p>
        </div>
        <Link
          to={createPageUrl("Goals")}
          className="text-xs font-semibold text-[#B5F13E] hover:underline inline-flex items-center gap-1"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4">
        {topGoals.map((goal) => {
          const current = Number(goal.current_amount || 0);
          const target = Number(goal.target_amount || 1);
          const percent = Math.min(Math.round((current / target) * 100), 100);

          return (
            <div key={goal.id} className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#B5F13E]/10 text-[#B5F13E]">
                    <Target className="w-3.5 h-3.5" />
                  </span>
                  {goal.title}
                </span>
                <span className="font-bold text-[#B5F13E] tabular-nums">{percent}%</span>
              </div>

              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#B5F13E] transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>Saved: {formatCurrency(current)}</span>
                <span>Target: {formatCurrency(target)}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
