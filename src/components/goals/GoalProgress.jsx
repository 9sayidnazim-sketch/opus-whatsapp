import { useState } from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Target } from "lucide-react";
import { formatCurrency } from "@/utils";
import confetti from "canvas-confetti";

export default function GoalProgress({ goal, onClose, onAddProgress }) {
  const [amount, setAmount] = useState("");
  const current = Number(goal.current_amount || 0);
  const target = Number(goal.target_amount || 1);
  const percentage = Math.min(Math.round((current / target) * 100), 100);

  const handleSubmit = (e) => {
    e.preventDefault();
    const addVal = parseFloat(amount);
    if (!isNaN(addVal) && addVal > 0) {
      if (current + addVal >= target) {
        try {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        } catch {}
      }
      onAddProgress(goal.id, addVal);
      setAmount("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg"
      >
        <Card className="rounded-2xl border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#B5F13E]/15 text-[#B5F13E] flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground font-heading">
                  {goal.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deposit savings toward this target
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-secondary">
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </CardHeader>

          <CardContent className="p-5 space-y-5">
            <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Current Savings</span>
                <span className="text-foreground font-bold tabular-nums font-heading">
                  {formatCurrency(current)} of {formatCurrency(target)}
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#B5F13E] transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                <span>{percentage}% achieved</span>
                <span>Remaining: {formatCurrency(Math.max(0, target - current))}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="progress-amount" className="text-xs font-medium text-foreground">
                  Deposit Amount (AED)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    AED
                  </span>
                  <Input
                    id="progress-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="500.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="pl-12 h-11 rounded-xl bg-secondary/40 border-border font-heading font-semibold text-base"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" className="fuloozi-btn-primary px-5 h-10 shadow-lime font-semibold">
                  <Plus className="w-4 h-4 mr-1.5" /> Add to Goal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
