import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, ArrowDownRight, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { formatCurrency, getCategoryLabel } from "@/utils";
import { MemberAvatar } from "./MemberAvatar";

export default function MemberActivity({ members = [], transactions = [] }) {
  const [selectedMember, setSelectedMember] = useState("all");

  const filteredTransactions = useMemo(() => {
    if (selectedMember === "all") {
      return transactions;
    }
    const member = members.find(m => m.id === selectedMember);
    return transactions.filter(t => t.created_by === member?.email);
  }, [transactions, selectedMember, members]);

  const recentTransactions = filteredTransactions.slice(0, 10);

  const getMemberByEmail = (email) => {
    return members.find(m => m.email === email);
  };

  return (
    <div className="mb-8">
      <Card className="border border-border/80 bg-card shadow-sm">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Recent Household Activity</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Filter contributions and payments across all family members</p>
            </div>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="w-full sm:w-52 h-9 text-xs bg-secondary/40 border-border/70">
                <SelectValue placeholder="Filter by member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <MemberAvatar
                        avatar={member.avatar}
                        name={member.name}
                        color={member.color}
                        className="h-5 w-5 rounded-full text-[9px]"
                        iconClassName="h-3 w-3"
                      />
                      <span className="text-xs">{member.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {recentTransactions.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                No recent activity recorded for this member.
              </div>
            ) : (
              recentTransactions.map((transaction) => {
                const member = getMemberByEmail(transaction.created_by);
                const isIncome = transaction.type === 'receita';

                return (
                  <div key={transaction.id} className="p-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3.5">
                      {member ? (
                        <MemberAvatar
                          avatar={member.avatar}
                          name={member.name}
                          color={member.color}
                          className="w-9 h-9 rounded-full text-xs shadow-sm"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm text-foreground truncate">
                            {transaction.description || getCategoryLabel(transaction.category)}
                          </p>
                          {member && (
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">
                              by {member.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] px-2 py-0 border-border/70 bg-secondary/30 font-normal">
                            {getCategoryLabel(transaction.category)}
                          </Badge>
                          <div className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3 text-muted-foreground/70" />
                            {format(new Date(transaction.date), "MMM d", { locale: enUS })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isIncome ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className={`font-semibold tabular-nums text-sm ${isIncome ? 'text-emerald-400' : 'text-foreground'}`}>
                          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}