import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plane, Car, Home, GraduationCap, Heart, ShoppingBag, Palmtree, Sparkles } from "lucide-react";

const iconOptions = [
  { value: "Plane", label: "Travel", icon: Plane, color: "bg-[hsl(216_24%_30%)]" },
  { value: "Car", label: "Vehicle", icon: Car, color: "bg-[hsl(26_24%_30%)]" },
  { value: "Home", label: "Home", icon: Home, color: "bg-[hsl(151_20%_30%)]" },
  { value: "GraduationCap", label: "Education", icon: GraduationCap, color: "bg-[hsl(264_23%_30%)]" },
  { value: "Heart", label: "Health", icon: Heart, color: "bg-[hsl(354_22%_30%)]" },
  { value: "ShoppingBag", label: "Shopping", icon: ShoppingBag, color: "bg-pink-500" },
  { value: "Palmtree", label: "Leisure", icon: Palmtree, color: "bg-teal-500" },
  { value: "Sparkles", label: "Other", icon: Sparkles, color: "bg-[hsl(48_24%_30%)]" }
];

export default function GoalForm({ goal, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_amount: "",
    current_amount: "0",
    target_date: "",
    icon: "Sparkles",
    color: "bg-[hsl(48_24%_30%)]",
    status: "em_progresso"
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title,
        description: goal.description || "",
        target_amount: goal.target_amount.toString(),
        current_amount: goal.current_amount?.toString() || "0",
        target_date: goal.target_date || "",
        icon: goal.icon || "Sparkles",
        color: goal.color || "bg-[hsl(48_24%_30%)]",
        status: goal.status || "em_progresso"
      });
    }
  }, [goal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount)
    });
  };

  const selectedIcon = iconOptions.find(opt => opt.value === formData.icon);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="mb-8 shadow-none border-[hsl(264_23%_22%)]">
        <CardHeader className="border-b bg-[hsl(264_23%_22%)]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[hsl(264_40%_78%)]">
              {goal ? "Edit Goal" : "New Goal"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Goal Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Trip to Europe"
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add more details about your goal..."
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Target Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label>Starting Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.current_amount}
                  onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => {
                    const opt = iconOptions.find(o => o.value === value);
                    setFormData({ 
                      ...formData, 
                      icon: value,
                      color: opt?.color || "bg-[hsl(48_24%_30%)]"
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[hsl(264_23%_36%)] hover:bg-[hsl(264_23%_36%)]">
                {goal ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}