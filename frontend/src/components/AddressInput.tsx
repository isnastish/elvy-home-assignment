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
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a Swedish address or city..."
          className="flex-1 px-4 py-3 text-base border-2 border-gray-200 rounded-lg outline-none transition-colors focus:border-blue-500"
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />
        {loading && (
          <div className="flex items-center text-gray-400">
            Searching...
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-sm mt-1">
          {error}
        </div>
      )}

      {showDropdown && results.length > 0 && (
        <ul className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 p-0 list-none shadow-lg z-50 max-h-72 overflow-y-auto">
          {results.map((r, i) => (
            <li
              key={i}
              onClick={() => handleSelect(r)}
              className={`px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-gray-50 ${
                i < results.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <div className="font-medium">{r.display_name}</div>
              <div className="text-gray-400 text-xs mt-0.5">
                {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
