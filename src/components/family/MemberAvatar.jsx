import { Baby, Backpack, Briefcase, GraduationCap, HandHeart, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Avatars are stored on the member record as one of these ids.
export const DEFAULT_AVATAR = "initials";

export const AVATAR_OPTIONS = [
  { id: "initials", label: "Initials" },
  { id: "user", label: "Adult", icon: User },
  { id: "heart", label: "Partner", icon: Heart },
  { id: "briefcase", label: "Working", icon: Briefcase },
  { id: "graduation-cap", label: "Student", icon: GraduationCap },
  { id: "backpack", label: "Child", icon: Backpack },
  { id: "baby", label: "Baby", icon: Baby },
  { id: "hand-heart", label: "Caregiver", icon: HandHeart },
];

const OPTIONS_BY_ID = new Map(AVATAR_OPTIONS.map((option) => [option.id, option]));

// Members saved before the icon set kept an emoji here. The ones with a clear
// equivalent map to that icon; any other emoji shows the member's initials.
const LEGACY_EMOJI_AVATARS = [
  ["\u{1F476}", "baby"], // baby
  ["\u{1F466}", "backpack"], // boy
  ["\u{1F467}", "backpack"], // girl
  ["\u{1F4BC}", "briefcase"], // man/woman office worker (briefcase, with or without ZWJ)
];

export function normalizeAvatar(avatar) {
  if (OPTIONS_BY_ID.has(avatar)) return avatar;
  if (typeof avatar === "string") {
    const match = LEGACY_EMOJI_AVATARS.find(([emoji]) => avatar.includes(emoji));
    if (match) return match[1];
  }
  return DEFAULT_AVATAR;
}

// First letter of the first and last word, skipping anything that is not a
// letter or digit, so names written with emoji never leak them into the avatar.
export function getInitials(name) {
  const words = String(name || "")
    .split(/\s+/)
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0])
    .filter(Boolean);
  if (words.length === 0) return "";
  const initials = words.length === 1 ? words[0] : words[0] + words[words.length - 1];
  return initials.toLocaleUpperCase();
}

const DARK_TEXT = "#121417";
const LIGHT_TEXT = "#ffffff";

function relativeLuminance(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!match) return null;
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(match[1].slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

// Charcoal or white, whichever contrasts more with the member's color.
export function readableTextColor(background) {
  const luminance = relativeLuminance(background);
  if (luminance === null) return DARK_TEXT;
  const darkLuminance = relativeLuminance(DARK_TEXT);
  const contrastWithDark = (luminance + 0.05) / (darkLuminance + 0.05);
  const contrastWithLight = 1.05 / (luminance + 0.05);
  return contrastWithDark >= contrastWithLight ? DARK_TEXT : LIGHT_TEXT;
}

// The glyph alone: the member's icon or their initials. With no name to take
// initials from, it shows `placeholderInitials` if given, else a person icon.
export function AvatarGlyph({ avatar, name, placeholderInitials, iconClassName = "h-1/2 w-1/2" }) {
  const option = OPTIONS_BY_ID.get(normalizeAvatar(avatar));
  const initials = getInitials(name) || placeholderInitials;
  const Icon = option.icon || (initials ? null : User);
  if (Icon) return <Icon className={iconClassName} aria-hidden="true" />;
  return <span aria-hidden="true">{initials}</span>;
}

// A filled badge in the member's color. Decorative: the member's name is
// always shown next to it, so screen readers skip it.
export function MemberAvatar({ avatar, name, color, fallbackColor = "#B5F13E", className, iconClassName }) {
  const background = color || fallbackColor;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center font-heading font-bold leading-none",
        className
      )}
      style={{ backgroundColor: background, color: readableTextColor(background) }}
      aria-hidden="true"
    >
      <AvatarGlyph avatar={avatar} name={name} iconClassName={iconClassName} />
    </span>
  );
}
