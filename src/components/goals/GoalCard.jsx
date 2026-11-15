import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, CheckCircle, Target } from "lucide-react";
import { motion } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { formatCurrency } from "@/utils";

export default function GoalCard({ goal, onEdit, onDelete, onClick }) {
  const current = Number(goal.current_amount || 0);
  const target = Number(goal.target_amount || 1);
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  const isCompleted = current >= target || goal.status === 'concluida' || goal.status === 'completed';
  
  const daysRemaining = goal.target_date 
    ? differenceInDays(new Date(goal.target_date), new Date())
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <Card 
        className="rounded-2xl border-border bg-card hover:border-border/90 transition-all overflow-hidden cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#B5F13E]/15 text-[#B5F13E] flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-foreground leading-tight">
                  {goal.title}
                </h3>
                {isCompleted ? (
                  <Badge className="mt-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px] font-medium">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Target Achieved
                  </Badge>
                ) : daysRemaining !== null ? (
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : daysRemaining === 0 ? 'Target is today' : 'Past target date'}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(goal)}
                className="w-8 h-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(goal.id)}
                className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground tabular-nums font-heading">
                {formatCurrency(current)}
              </span>
              <span className="text-muted-foreground tabular-nums">
                Target: {formatCurrency(target)} ({percentage}%)
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-400' : 'bg-[#B5F13E]'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {goal.target_date ? `Target: ${format(new Date(goal.target_date), 'MMM d, yyyy')}` : 'No date set'}
            </span>
            <span className="font-medium text-foreground">
              {isCompleted ? 'Complete' : `Needs ${formatCurrency(Math.max(0, target - current))}`}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
