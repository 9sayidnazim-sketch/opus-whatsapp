import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

export default function GoalForm({ goal, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_amount: "",
    current_amount: "0",
    target_date: "",
    status: "em_progresso"
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title || "",
        description: goal.description || "",
        target_amount: goal.target_amount ? goal.target_amount.toString() : "",
        current_amount: goal.current_amount ? goal.current_amount.toString() : "0",
        target_date: goal.target_date || "",
        status: goal.status || "em_progresso"
      });
    }
  }, [goal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.target_amount) return;
    onSubmit({
      ...formData,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount || 0)
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="mb-8"
    >
      <Card className="rounded-2xl border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="p-4 sm:p-6 border-b border-border/80 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold font-heading text-foreground">
              {goal ? "Edit Savings Goal" : "Create New Goal"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set milestones for vacations, emergency reserve, or major investments
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-xl hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium text-foreground">Goal Name *</Label>
              <Input
                id="title"
                placeholder="e.g. Summer Family Vacation, Emergency Fund, New Car Down Payment"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="h-11 rounded-xl bg-secondary/40 border-border text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="target_amount" className="text-xs font-medium text-foreground">Target Amount (AED) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    AED
                  </span>
                  <Input
                    id="target_amount"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="25000"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    required
                    className="pl-12 h-11 rounded-xl bg-secondary/40 border-border font-heading font-semibold text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="current_amount" className="text-xs font-medium text-foreground">Initial Amount Saved (AED)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    AED
                  </span>
                  <Input
                    id="current_amount"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={formData.current_amount}
                    onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                    className="pl-12 h-11 rounded-xl bg-secondary/40 border-border font-heading font-semibold text-base"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target_date" className="text-xs font-medium text-foreground">Target Completion Date</Label>
              <Input
                id="target_date"
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="h-11 rounded-xl bg-secondary/40 border-border text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium text-foreground">Notes / Purpose (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Details, bank account location, or purpose..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl bg-secondary/40 border-border text-sm resize-none h-20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/80">
              <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="fuloozi-btn-primary px-6 h-10 shadow-lime font-semibold">
                {goal ? "Update Goal" : "Save Goal"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </motion.div>
  );
}
