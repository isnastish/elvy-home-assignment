import type { Granularity } from "../types/weather";

interface GranularitySelectorProps {
  value: Granularity;
  onChange: (granularity: Granularity) => void;
}

const options: { value: Granularity; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

export function GranularitySelector({
  value,
  onChange,
}: GranularitySelectorProps) {
  return (
    <div style={{ display: "flex", gap: 4, background: "#f0f0f0", borderRadius: 8, padding: 4 }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "8px 20px",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: value === opt.value ? 600 : 400,
            background: value === opt.value ? "#fff" : "transparent",
            color: value === opt.value ? "#2563eb" : "#666",
            boxShadow: value === opt.value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.2s",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
