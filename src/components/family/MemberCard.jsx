import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Shield, User, Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function MemberCard({ member, onEdit, onDelete }) {
  const isPending = member.status === 'pending';
  const role = member.role || 'Member';
  const isAdmin = role.toLowerCase().includes('admin') || role.toLowerCase().includes('head');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <Card className="rounded-2xl border-border bg-card hover:border-border/90 transition-all">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold text-black font-heading shrink-0 shadow-sm"
                style={{ backgroundColor: member.color || '#B5F13E' }}
              >
                {member.avatar || member.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base text-foreground truncate">
                  {member.name}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {member.email || '@household'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(member)}
                className="w-8 h-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(member.id)}
                className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
            <Badge className={`text-[10px] font-semibold border ${
              isAdmin 
                ? 'bg-[#B5F13E]/15 text-[#B5F13E] border-[#B5F13E]/30' 
                : 'bg-secondary text-muted-foreground border-border'
            }`}>
              <Shield className="w-3 h-3 mr-1" />
              {role}
            </Badge>

            {member.share && (
              <span className="text-xs text-muted-foreground font-medium">
                {member.share}% allocation
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
