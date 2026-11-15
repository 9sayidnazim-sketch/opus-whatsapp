import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, CheckCircle, Calendar, AlertCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { format, differenceInDays, isToday, startOfDay } from "date-fns";
import { enUS } from "date-fns/locale";

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

export default function BillCard({ bill, onEdit, onDelete, onMarkAsPaid, isOverdue, isPaid }) {
  const daysUntilDue = differenceInDays(new Date(bill.due_date), startOfDay(new Date()));
  const isDueToday = isToday(new Date(bill.due_date));
  const isDueSoon = daysUntilDue <= 2 && daysUntilDue > 0;

  const getStatusColor = () => {
    if (isPaid) return "border-green-500 bg-[hsl(151_20%_19%)]";
    if (isOverdue) return "border-red-500 bg-[hsl(354_22%_21%)]";
    if (isDueToday) return "border-orange-500 bg-[hsl(26_24%_20%)]";
    if (isDueSoon) return "border-yellow-500 bg-[hsl(48_24%_20%)]";
    return "border-[hsl(216_24%_21%)] bg-card";
  };

  const getStatusBadge = () => {
    if (isPaid) {
      return (
        <Badge className="bg-[hsl(151_20%_19%)] text-[hsl(151_31%_73%)] border-[hsl(151_20%_19%)]">
          <CheckCircle className="w-3 h-3 mr-1" />
          Paid
        </Badge>
      );
    }
    if (isOverdue) {
      return (
        <Badge className="bg-[hsl(354_22%_21%)] text-[hsl(354_42%_74%)] border-[hsl(354_22%_21%)]">
          <AlertCircle className="w-3 h-3 mr-1" />
          Overdue ({Math.abs(daysUntilDue)} days)
        </Badge>
      );
    }
    if (isDueToday) {
      return (
        <Badge className="bg-[hsl(26_24%_20%)] text-[hsl(26_53%_72%)] border-[hsl(26_24%_20%)]">
          <Clock className="w-3 h-3 mr-1" />
          Due Today
        </Badge>
      );
    }
    if (isDueSoon) {
      return (
        <Badge className="bg-[hsl(48_24%_20%)] text-[hsl(48_42%_73%)] border-[hsl(48_24%_20%)]">
          <AlertCircle className="w-3 h-3 mr-1" />
          Due in {daysUntilDue} days
        </Badge>
      );
    }
    return (
      <Badge className="bg-[hsl(216_24%_21%)] text-[hsl(216_49%_76%)] border-[hsl(216_24%_21%)]">
        <Clock className="w-3 h-3 mr-1" />
        {daysUntilDue} days
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className={`hover:shadow-none transition-all border-2 ${getStatusColor()}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-foreground truncate">
                {bill.description || categoryLabels[bill.category]}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {categoryLabels[bill.category]}
              </p>
            </div>
            <div className="flex gap-1 ml-2">
              {!isPaid && onMarkAsPaid && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMarkAsPaid(bill)}
                  className="text-[hsl(151_31%_73%)] hover:text-[hsl(151_31%_73%)] hover:bg-[hsl(151_20%_19%)]"
                >
                  <CheckCircle className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(bill)}
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(bill.id)}
              >
                <Trash2 className="w-4 h-4 text-[hsl(354_42%_74%)]" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">
                -{bill.amount.toFixed(2)}
              </span>
              {getStatusBadge()}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                Due: {format(new Date(bill.due_date), "MMM d", { locale: enUS })}
              </span>
            </div>

            {isPaid && bill.paid_date && (
              <div className="flex items-center gap-2 text-sm text-[hsl(151_31%_73%)] bg-[hsl(151_20%_19%)] px-3 py-2 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <span>
                  Paid on: {format(new Date(bill.paid_date), "MMM d", { locale: enUS })}
                </span>
              </div>
            )}

            {bill.recurring && (
              <div className="flex items-center gap-2 text-xs text-[hsl(264_40%_78%)] bg-[hsl(264_23%_22%)] px-3 py-1.5 rounded-lg">
                <span>🔄 Recurring Expense - Day {bill.recurring_day}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}