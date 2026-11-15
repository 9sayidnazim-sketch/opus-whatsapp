import { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfDay } from "date-fns";
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

export default function BillsCalendar({ bills, onBillClick }) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const billsByDate = useMemo(() => {
    const grouped = {};
    bills.forEach(bill => {
      const dateKey = format(new Date(bill.due_date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(bill);
    });
    return grouped;
  }, [bills]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="shadow-none">
      <CardContent className="p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-foreground">
            {format(today, "MMMM yyyy", { locale: enUS })}
          </h2>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-muted-foreground text-sm py-2">
              {day}
            </div>
          ))}

          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {daysInMonth.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayBills = billsByDate[dateKey] || [];
            const hasOverdue = dayBills.some(b => 
              b.payment_status === 'a_pagar' && isBefore(new Date(b.due_date), startOfDay(new Date()))
            );
            const hasDueToday = dayBills.some(b => 
              b.payment_status === 'a_pagar' && isToday(new Date(b.due_date))
            );
            const hasPending = dayBills.some(b => b.payment_status === 'a_pagar');

            return (
              <div
                key={dateKey}
                className={`aspect-square border rounded-lg p-2 ${
                  isToday(day) 
                    ? 'bg-[hsl(216_24%_21%)] border-blue-500 border-2' 
                    : 'bg-card border-border'
                } hover:shadow-md transition-shadow cursor-pointer`}
              >
                <div className="text-sm font-medium text-foreground mb-1">
                  {format(day, 'd')}
                </div>
                {dayBills.length > 0 && (
                  <div className="space-y-1">
                    {dayBills.slice(0, 2).map((bill, idx) => (
                      <div
                        key={idx}
                        onClick={() => onBillClick(bill)}
                        className={`text-xs p-1 rounded truncate ${
                          bill.payment_status === 'pago'
                            ? 'bg-[hsl(151_20%_19%)] text-[hsl(151_31%_73%)]'
                            : hasOverdue
                            ? 'bg-[hsl(354_22%_21%)] text-[hsl(354_42%_74%)]'
                            : hasDueToday
                            ? 'bg-[hsl(26_24%_20%)] text-[hsl(26_53%_72%)]'
                            : 'bg-[hsl(216_24%_21%)] text-[hsl(216_49%_76%)]'
                        }`}
                        title={bill.description || categoryLabels[bill.category]}
                      >
                        -{bill.amount.toFixed(0)}
                      </div>
                    ))}
                    {dayBills.length > 2 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayBills.length - 2}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[hsl(354_22%_21%)] border border-[hsl(354_22%_21%)] rounded" />
            <span className="text-sm text-muted-foreground">Overdue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[hsl(26_24%_20%)] border border-[hsl(26_24%_20%)] rounded" />
            <span className="text-sm text-muted-foreground">Due Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[hsl(216_24%_21%)] border border-[hsl(216_24%_21%)] rounded" />
            <span className="text-sm text-muted-foreground">To Pay</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[hsl(151_20%_19%)] border border-[hsl(151_20%_19%)] rounded" />
            <span className="text-sm text-muted-foreground">Paid</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}