import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, CheckCircle, Calendar, AlertCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { format, differenceInDays, isToday, startOfDay } from "date-fns";
import { formatCurrency, getCategoryLabel } from "@/utils";

export default function BillCard({ bill, onEdit, onDelete, onMarkAsPaid, isOverdue, isPaid }) {
  const daysUntilDue = differenceInDays(new Date(bill.due_date), startOfDay(new Date()));
  const isDueToday = isToday(new Date(bill.due_date));
  const isDueSoon = daysUntilDue <= 3 && daysUntilDue > 0;

  const getStatusBadge = () => {
    if (isPaid) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-medium">
          <CheckCircle className="w-3 h-3 mr-1" />
          Paid
        </Badge>
      );
    }
    if (isOverdue) {
      return (
        <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 font-medium">
          <AlertCircle className="w-3 h-3 mr-1" />
          Overdue ({Math.abs(daysUntilDue)}d)
        </Badge>
      );
    }
    if (isDueToday) {
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 font-medium">
          <Clock className="w-3 h-3 mr-1" />
          Due Today
        </Badge>
      );
    }
    if (isDueSoon) {
      return (
        <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30 font-medium">
          <Clock className="w-3 h-3 mr-1" />
          Due in {daysUntilDue} days
        </Badge>
      );
    }
    return (
      <Badge className="bg-secondary text-muted-foreground border-border font-medium">
        Due in {daysUntilDue} days
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="transition-all"
    >
      <Card className="rounded-2xl border-border bg-card hover:border-border/90 transition-all">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base text-foreground truncate">
                  {bill.description || getCategoryLabel(bill.category)}
                </h3>
                {getStatusBadge()}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Due {format(new Date(bill.due_date), "MMM d, yyyy")}
                </span>
                <span>·</span>
                <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[11px] font-medium">
                  {getCategoryLabel(bill.category)}
                </span>
                {bill.recurring && (
                  <>
                    <span>·</span>
                    <span className="text-[11px] text-[#B5F13E]">Monthly recurring</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
              <span className="text-lg font-bold font-heading tabular-nums text-foreground">
                {formatCurrency(bill.amount)}
              </span>

              <div className="flex items-center gap-1.5">
                {!isPaid && (
                  <Button
                    size="sm"
                    onClick={() => onMarkAsPaid(bill)}
                    className="h-8 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Paid
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(bill)}
                  className="w-8 h-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(bill.id)}
                  className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
