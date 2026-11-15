import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export default function NotificationThreshold({ 
  label, 
  description, 
  value, 
  onChange, 
  min, 
  max, 
  step,
  suffix = ""
}) {
  return (
    <div className="pl-12 space-y-3">
      <div className="flex items-baseline justify-between">
        <Label className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <span className="text-lg font-bold text-[hsl(151_31%_73%)]">
          {value}{suffix}
        </span>
      </div>
      
      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}