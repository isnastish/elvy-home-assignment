import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { Granularity } from "../types/weather";

interface GranularitySelectorProps {
  value: Granularity;
  onChange: (granularity: Granularity) => void;
}

export function GranularitySelector({ value, onChange }: GranularitySelectorProps) {
  return (
    <ToggleButtonGroup 
      value={value} 
      exclusive 
      onChange={(_, v) => v && onChange(v)} 
      size="small"
      sx={{
        "& .MuiToggleButton-root": {
          textTransform: "none",
          fontWeight: 500,
          borderRadius: 2,
          px: 2.5,
          py: 1,
          border: "1px solid",
          borderColor: "divider",
          "&.Mui-selected": {
            background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
            color: "white",
            borderColor: "primary.main",
            boxShadow: "0px 2px 4px rgba(37, 99, 235, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)",
            },
          },
          "&:not(.Mui-selected)": {
            bgcolor: "background.paper",
            color: "text.secondary",
            "&:hover": {
              bgcolor: "action.hover",
            },
          },
        },
      }}
    >
      <ToggleButton value="day">Daily</ToggleButton>
      <ToggleButton value="month">Monthly</ToggleButton>
      <ToggleButton value="year">Yearly</ToggleButton>
    </ToggleButtonGroup>
  );
}
