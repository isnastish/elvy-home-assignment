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
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-5 py-2 border-none rounded-md cursor-pointer text-sm transition-all ${
            value === opt.value
              ? "bg-white text-blue-600 font-semibold shadow-sm"
              : "bg-transparent text-gray-500 font-normal"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
