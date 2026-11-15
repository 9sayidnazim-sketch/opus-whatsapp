import { db } from "@/api/client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Pencil, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AVATAR_OPTIONS,
  AvatarGlyph,
  DEFAULT_AVATAR,
  MemberAvatar,
  normalizeAvatar,
} from "./MemberAvatar";

const colorOptions = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e"
];

const roleOptions = [
  { value: "admin", label: "Admin (full access)", icon: ShieldCheck },
  { value: "editor", label: "Editor (creates and edits their transactions)", icon: Pencil },
  { value: "viewer", label: "Viewer (read only)", icon: Eye },
];

export default function AddMemberForm({ member, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "editor",
    color: colorOptions[0],
    avatar: DEFAULT_AVATAR,
    status: "active"
  });

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await db.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email,
        role: member.role,
        color: member.color || colorOptions[0],
        avatar: normalizeAvatar(member.avatar),
        status: member.status || "active"
      });
    }
  }, [member]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      invited_by: currentUser?.email || "system"
    };

    if (!member) {
      submitData.joined_date = new Date().toISOString().split('T')[0];
    }

    onSubmit(submitData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="mb-8 shadow-none border-border">
        <CardHeader className="border-b bg-secondary/60">
          <div className="flex items-center justify-between">
            <CardTitle>
              {member ? "Edit Member" : "Add Family Member"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Member name"
                  required
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div>
                <Label>Permission Level</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(({ value, label, icon: RoleIcon }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex min-w-0 items-center gap-2">
                          <RoleIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0 truncate">{label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <fieldset>
              <legend className="text-sm font-medium leading-none">Avatar</legend>
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
                {AVATAR_OPTIONS.map((option) => {
                  const selected = formData.avatar === option.id;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 px-1 py-2.5 text-[11px] font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                        selected
                          ? "border-[#B5F13E] bg-[#B5F13E]/10 text-foreground"
                          : "border-border bg-secondary/40 text-muted-foreground hover:border-[#B5F13E]/40 hover:text-foreground"
                      )}
                    >
                      <input
                        type="radio"
                        name="avatar"
                        value={option.id}
                        checked={selected}
                        onChange={() => setFormData({ ...formData, avatar: option.id })}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "flex h-6 items-center justify-center font-heading text-sm font-bold",
                          selected && "text-[#B5F13E]"
                        )}
                      >
                        <AvatarGlyph
                          avatar={option.id}
                          name={formData.name}
                          placeholderInitials="AB"
                          iconClassName="h-5 w-5"
                        />
                      </span>
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <Label>Identification Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg border-2 hover:scale-110 transition-transform ${
                      formData.color === color ? 'border-[#B5F13E] scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-secondary/40 border border-border/60 rounded-lg p-4">
              <h4 className="font-medium text-muted-foreground text-sm mb-3">Preview</h4>
              <div className="flex items-center gap-3">
                <MemberAvatar
                  avatar={formData.avatar}
                  name={formData.name}
                  color={formData.color}
                  className="w-12 h-12 rounded-full text-base"
                />
                <div>
                  <p className="font-medium text-foreground">{formData.name || "Name"}</p>
                  <p className="text-sm text-muted-foreground">{formData.email || "email@example.com"}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#B5F13E] text-[#121417] hover:bg-[#a3d937] font-semibold"
              >
                {member ? "Update Member" : "Add Member"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
