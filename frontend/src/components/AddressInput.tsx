import { useState, useRef, useEffect } from "react";
import type { GeocodeResult } from "../types/weather";
import { useLocations } from "../hooks/useLocations";

interface AddressInputProps {
  onLocationSelect: (result: GeocodeResult) => void;
}

export function AddressInput({ onLocationSelect }: AddressInputProps) {
  const [query, setQuery] = useState("");
  const { results, loading, error, search, clear } = useLocations();
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      clear();
      return;
    }
    debounceRef.current = setTimeout(() => {
      search(query);
      setShowDropdown(true);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search, clear]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(result: GeocodeResult) {
    setQuery(result.display_name);
    setShowDropdown(false);
    clear();
    onLocationSelect(result);
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", maxWidth: 600 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a Swedish address or city..."
          style={{
            flex: 1,
            padding: "12px 16px",
            fontSize: 16,
            border: "2px solid #e0e0e0",
            borderRadius: 8,
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />
        {loading && (
          <div style={{ display: "flex", alignItems: "center", color: "#888" }}>
            Searching...
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: "#e74c3c", fontSize: 14, marginTop: 4 }}>
          {error}
        </div>
      )}

      {showDropdown && results.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            marginTop: 4,
            padding: 0,
            listStyle: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 100,
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {results.map((r, i) => (
            <li
              key={i}
              onClick={() => handleSelect(r)}
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                borderBottom: i < results.length - 1 ? "1px solid #f0f0f0" : "none",
                fontSize: 14,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={{ fontWeight: 500 }}>{r.display_name}</div>
              <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
                {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
