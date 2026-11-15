import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";

const availableCategories = [
  { value: "alimentacao", label: "Food & Groceries" },
  { value: "contas", label: "Bills & Utilities (DEWA/du)" },
  { value: "transporte", label: "Transport & Fuel" },
  { value: "moradia", label: "Housing & Rent" },
  { value: "lazer", label: "Dining & Lifestyle" },
  { value: "compras", label: "Shopping & Retail" },
  { value: "saude", label: "Health & Wellness" },
  { value: "educacao", label: "Education & Tuition" },
  { value: "outros_gastos", label: "Other Expenses" },
];

export default function BudgetForm({ budget, onSubmit, onCancel, currentMonth }) {
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    month: currentMonth || "",
    alert_threshold: 80,
    active: true
  });

  useEffect(() => {
    if (budget) {
      setFormData({
        category: budget.category || "",
        amount: budget.amount ? budget.amount.toString() : "",
        month: budget.month || currentMonth || "",
        alert_threshold: budget.alert_threshold || 80,
        active: budget.active !== false
      });
    }
  }, [budget, currentMonth]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) return;
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
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
              {budget ? "Edit Budget Limit" : "Create Budget Category"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set monthly spending targets in AED
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-xl hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-medium text-foreground">Expense Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                  required
                >
                  <SelectTrigger id="category" className="h-11 rounded-xl bg-secondary/40 border-border text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-60">
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-sm">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-medium text-foreground">Monthly Limit (AED) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    AED
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="2500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="pl-12 h-11 rounded-xl bg-secondary/40 border-border text-foreground font-heading font-semibold text-base"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="threshold" className="text-xs font-medium text-foreground">
                  Alert Trigger Threshold
                </Label>
                <span className="text-xs font-bold text-[#B5F13E] tabular-nums">
                  {formData.alert_threshold}%
                </span>
              </div>
              <Slider
                id="threshold"
                min={50}
                max={95}
                step={5}
                value={[formData.alert_threshold]}
                onValueChange={([val]) => setFormData({ ...formData, alert_threshold: val })}
                className="py-2"
              />
              <p className="text-[11px] text-muted-foreground">
                Fuloozi alerts you when spending crosses {formData.alert_threshold}% of this budget.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/80">
              <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="fuloozi-btn-primary px-6 h-10 shadow-lime font-semibold">
                {budget ? "Update Budget" : "Save Budget"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </motion.div>
  );
}
