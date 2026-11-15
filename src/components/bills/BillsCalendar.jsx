import { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { formatCurrency, getCategoryLabel } from "@/utils";

export default function BillsCalendar({ bills = [], onEdit }) {
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
              b.payment_status === 'pendente' && isBefore(new Date(b.due_date), startOfDay(new Date()))
            );
            const hasDueToday = dayBills.some(b =>
              b.payment_status === 'pendente' && isToday(new Date(b.due_date))
            );

            return (
              <div
                key={dateKey}
                className={`aspect-square border rounded-lg p-1.5 ${
                  isToday(day)
                    ? 'bg-[#B5F13E]/10 border-[#B5F13E] border-2'
                    : 'bg-card border-border'
                } hover:shadow-md transition-shadow`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-[#B5F13E]' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </div>
                {dayBills.length > 0 && (
                  <div className="space-y-0.5">
                    {dayBills.slice(0, 2).map((bill, idx) => (
                      <div
                        key={idx}
                        onClick={() => onEdit && onEdit(bill)}
                        className={`text-xs p-0.5 rounded truncate cursor-pointer ${
                          bill.payment_status === 'pago'
                            ? 'bg-emerald-950/60 text-emerald-400'
                            : hasOverdue
                            ? 'bg-red-950/60 text-red-400'
                            : hasDueToday
                            ? 'bg-amber-950/60 text-amber-400'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                        title={bill.description || getCategoryLabel(bill.category)}
                      >
                        {formatCurrency(bill.amount, { compact: true })}
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

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-950/60 border border-red-800 rounded" />
            <span className="text-xs text-muted-foreground">Overdue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-950/60 border border-amber-800 rounded" />
            <span className="text-xs text-muted-foreground">Due Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-secondary border border-border rounded" />
            <span className="text-xs text-muted-foreground">Upcoming</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-950/60 border border-emerald-800 rounded" />
            <span className="text-xs text-muted-foreground">Paid</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
