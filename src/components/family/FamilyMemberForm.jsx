import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { AVATAR_OPTIONS, AvatarGlyph, DEFAULT_AVATAR, normalizeAvatar } from "./MemberAvatar";

const colorOptions = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Orange" },
  { value: "#ef4444", label: "Red" },
  { value: "#ec4899", label: "Pink" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#14b8a6", label: "Teal" }
];


export default function FamilyMemberForm({ member, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    user_email: "",
    name: "",
    role: "editor",
    color: "#6366f1",
    avatar: DEFAULT_AVATAR,
    active: true
  });

  useEffect(() => {
    if (member) {
      setFormData({
        user_email: member.user_email,
        name: member.name,
        role: member.role,
        color: member.color || "#6366f1",
        avatar: normalizeAvatar(member.avatar),
        active: member.active
      });
    }
  }, [member]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="mb-8 shadow-none">
        <CardHeader className="border-b">
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
                <Label>Full Name</Label>
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
                  value={formData.user_email}
                  onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                  placeholder="email@example.com"
                  required
                  disabled={!!member}
                />
              </div>

              <div>
                <Label>Permission</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Full Access</SelectItem>
                    <SelectItem value="editor">Editor - Create and Edit</SelectItem>
                    <SelectItem value="viewer">Viewer - View Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Identification Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Avatar</Label>
                <Select
                  value={formData.avatar}
                  onValueChange={(value) => setFormData({ ...formData, avatar: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVATAR_OPTIONS.map(option => (
                      <SelectItem key={option.id} value={option.id}>
                        <span className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center font-heading text-[10px] font-bold">
                            <AvatarGlyph
                              avatar={option.id}
                              name={formData.name}
                              placeholderInitials="AB"
                              iconClassName="h-4 w-4"
                            />
                          </span>
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-[hsl(216_24%_21%)] border border-[hsl(216_24%_21%)] rounded-lg p-4">
              <h4 className="font-semibold text-[hsl(216_49%_76%)] mb-2">About Permissions:</h4>
              <ul className="space-y-1 text-sm text-[hsl(216_49%_76%)]">
                <li>• <strong>Admin:</strong> Can manage members and create, edit and delete everything</li>
                <li>• <strong>Editor:</strong> Can create and edit transactions, goals and budgets</li>
                <li>• <strong>Viewer:</strong> Can only view data, without editing</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[hsl(264_23%_36%)] hover:bg-[hsl(264_23%_36%)]">
                {member ? "Update" : "Add Member"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}