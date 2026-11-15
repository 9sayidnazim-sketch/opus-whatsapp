import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pencil, Trash2, Calendar, CheckCircle, Plane, Car, Home, GraduationCap, Heart, ShoppingBag, Palmtree, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { enUS } from "date-fns/locale";

const iconMap = {
  Plane, Car, Home, GraduationCap, Heart, ShoppingBag, Palmtree, Sparkles
};

export default function GoalCard({ goal, onEdit, onDelete, onClick }) {
  const percentage = ((goal.current_amount || 0) / goal.target_amount) * 100;
  const Icon = iconMap[goal.icon] || Sparkles;
  const isCompleted = goal.status === 'concluida';
  const colorClass = goal.color || 'bg-[hsl(264_23%_30%)]';
  const textColorClass = colorClass.includes('bg-') ? colorClass.replace('bg-', 'text-') : 'text-[hsl(264_40%_78%)]';
  
  const daysRemaining = goal.target_date 
    ? differenceInDays(new Date(goal.target_date), new Date())
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card 
        className="hover:shadow-none transition-all cursor-pointer relative overflow-hidden"
        onClick={onClick}
      >
        <div className={`absolute top-0 right-0 w-32 h-32 ${colorClass} opacity-10 rounded-full transform translate-x-16 -translate-y-16`} />
        
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-xl ${colorClass} bg-opacity-20`}>
                <Icon className={`w-6 h-6 ${textColorClass}`} />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  {goal.title}
                </h3>
                {isCompleted && (
                  <Badge className="mt-1 bg-[hsl(151_20%_19%)] text-[hsl(151_31%_73%)] border-[hsl(151_20%_19%)]">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(goal)}
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(goal.id)}
              >
                <Trash2 className="w-4 h-4 text-[hsl(354_42%_74%)]" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-2xl font-bold text-[hsl(264_40%_78%)]">
                  {percentage.toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={Math.min(percentage, 100)} 
                className="h-3"
                indicatorClassName={isCompleted ? "bg-[hsl(151_20%_30%)]" : "bg-[hsl(264_23%_30%)]"}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-foreground font-medium">
                  {(goal.current_amount || 0).toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Target: {goal.target_amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Remaining</span>
                <span className="text-lg font-semibold text-foreground">
                  {(goal.target_amount - (goal.current_amount || 0)).toFixed(2)}
                </span>
              </div>
              
              {goal.target_date && daysRemaining !== null && !isCompleted && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {daysRemaining > 0 ? (
                    <span>{daysRemaining} days left • {format(new Date(goal.target_date), "MMM d", { locale: enUS })}</span>
                  ) : (
                    <span className="text-[hsl(354_42%_74%)]">Target date passed</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}