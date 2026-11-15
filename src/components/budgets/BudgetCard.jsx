import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency, getCategoryLabel } from "@/utils";

export default function BudgetCard({ budget, onEdit, onDelete }) {
  const percent = Math.min(Math.round(budget.percentage || 0), 100);
  const isOver = (budget.percentage || 0) > 100;
  const isWarning = (budget.percentage || 0) >= (budget.alert_threshold || 80);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <Card className="rounded-2xl border-border bg-card hover:border-border/90 transition-all overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-base text-foreground">
                {getCategoryLabel(budget.category)}
              </h3>
              <div className="mt-1">
                {isOver ? (
                  <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-[11px] font-medium">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Exceeded by {formatCurrency(Math.abs(budget.remaining))}
                  </Badge>
                ) : isWarning ? (
                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[11px] font-medium">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Warning ({percent}%)
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px] font-medium">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    On track ({percent}%)
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(budget)}
                className="w-8 h-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(budget.id)}
                className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Spent: {formatCurrency(budget.spent)}</span>
              <span className="text-foreground font-semibold">Limit: {formatCurrency(budget.amount)}</span>
            </div>

            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-[#B5F13E]'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Remaining balance</span>
            <span
              className={`font-bold tabular-nums ${
                isOver ? 'text-rose-400' : 'text-foreground'
              }`}
            >
              {budget.remaining >= 0 ? formatCurrency(budget.remaining) : `-${formatCurrency(Math.abs(budget.remaining))}`}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
