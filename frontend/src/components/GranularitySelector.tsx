import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { Granularity } from "../types/weather";

interface GranularitySelectorProps {
  value: Granularity;
  onChange: (granularity: Granularity) => void;
}

export function GranularitySelector({ value, onChange }: GranularitySelectorProps) {
  return (
    <ToggleButtonGroup value={value} exclusive onChange={(_, v) => v && onChange(v)} size="small">
      <ToggleButton value="day">Daily</ToggleButton>
      <ToggleButton value="month">Monthly</ToggleButton>
      <ToggleButton value="year">Yearly</ToggleButton>
    </ToggleButtonGroup>
  );
}
