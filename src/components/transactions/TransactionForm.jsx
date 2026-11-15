import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { format } from "date-fns";

const categoryOptions = {
  receita: [
    { value: "salario", label: "Salary & Compensation" },
    { value: "freelance", label: "Freelance & Consulting" },
    { value: "investimentos", label: "Dividends & Investments" },
    { value: "outras_receitas", label: "Other Income / Bonus" }
  ],
  despesa: [
    { value: "alimentacao", label: "Food & Groceries" },
    { value: "contas", label: "Bills & Utilities (DEWA/du)" },
    { value: "transporte", label: "Transport & Fuel (Salik/ENOC)" },
    { value: "moradia", label: "Housing & Rent" },
    { value: "lazer", label: "Dining & Lifestyle" },
    { value: "compras", label: "Shopping & Retail" },
    { value: "saude", label: "Health & Medical" },
    { value: "educacao", label: "Education & Tuition" },
    { value: "outros_gastos", label: "Other Expenses" }
  ]
};

const paymentMethodOptions = [
  { value: "card", label: "Credit / Debit Card" },
  { value: "bank_transfer", label: "Bank Transfer / Wire" },
  { value: "apple_pay", label: "Apple Pay / Digital Wallet" },
  { value: "dinheiro", label: "Cash" },
];

export default function TransactionForm({ transaction, onSubmit, onCancel, isBillMode = false }) {
  const [formData, setFormData] = useState({
    type: "despesa",
    amount: "",
    category: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "card",
    payment_status: isBillMode ? "pendente" : "pago",
    due_date: "",
    recurring: false,
    recurring_day: new Date().getDate()
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type || "despesa",
        amount: transaction.amount ? transaction.amount.toString() : "",
        category: transaction.category || "",
        description: transaction.description || "",
        date: transaction.date || format(new Date(), "yyyy-MM-dd"),
        payment_method: transaction.payment_method || "card",
        payment_status: transaction.payment_status || "pago",
        due_date: transaction.due_date || "",
        recurring: transaction.recurring || false,
        recurring_day: transaction.recurring_day || new Date().getDate()
      });
    }
  }, [transaction]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || isNaN(parseFloat(formData.amount))) return;
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
              {transaction?.id ? "Edit Transaction" : isBillMode ? "Add Upcoming Bill" : "Record New Transaction"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter amounts in AED for your household ledger
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-xl hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary/60 border border-border/60">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "despesa", category: "" })}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  formData.type === "despesa"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Expense (Outflow)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "receita", category: "" })}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  formData.type === "receita"
                    ? "bg-card text-emerald-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Income (Inflow)
              </button>
            </div>

            {/* Amount and Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-medium text-foreground">Amount (AED) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    AED
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="pl-12 h-11 rounded-xl bg-secondary/40 border-border text-foreground font-heading font-semibold text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-medium text-foreground">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger id="category" className="h-11 rounded-xl bg-secondary/40 border-border text-sm">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-60">
                    {(categoryOptions[formData.type] || []).map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-sm">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium text-foreground">Description / Payee</Label>
              <Input
                id="description"
                placeholder="e.g. Spinneys Downtown, DEWA Bill, Monthly Salary"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-11 rounded-xl bg-secondary/40 border-border text-sm"
              />
            </div>

            {/* Date and Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs font-medium text-foreground">Transaction Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-11 rounded-xl bg-secondary/40 border-border text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment_method" className="text-xs font-medium text-foreground">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger id="payment_method" className="h-11 rounded-xl bg-secondary/40 border-border text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {paymentMethodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-sm">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due date if bill */}
            {(isBillMode || formData.type === 'despesa') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="due_date" className="text-xs font-medium text-foreground">Due Date (Optional bill date)</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="h-11 rounded-xl bg-secondary/40 border-border text-sm"
                  />
                </div>

                {formData.due_date && (
                  <div className="space-y-1.5">
                    <Label htmlFor="payment_status" className="text-xs font-medium text-foreground">Status</Label>
                    <Select
                      value={formData.payment_status}
                      onValueChange={(val) => setFormData({ ...formData, payment_status: val })}
                    >
                      <SelectTrigger id="payment_status" className="h-11 rounded-xl bg-secondary/40 border-border text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="pendente">Pending / Unpaid</SelectItem>
                        <SelectItem value="pago">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/80">
              <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="fuloozi-btn-primary px-6 h-10 shadow-lime font-semibold">
                {transaction?.id ? "Update Transaction" : "Save to Ledger"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </motion.div>
  );
}
