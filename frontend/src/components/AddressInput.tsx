import { useState, useRef, useEffect } from "react";
import { TextField, Autocomplete, CircularProgress, Box } from "@mui/material";
import type { GeocodeResult } from "../types/weather";
import { useLocations } from "../hooks/useLocations";

interface AddressInputProps {
  onLocationSelect: (result: GeocodeResult) => void;
}

export function AddressInput({ onLocationSelect }: AddressInputProps) {
  const [query, setQuery] = useState("");
  const { results, loading, error, search, clear } = useLocations();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      clear();
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search, clear]);

  const options = results.map((r, i) => ({
    id: i,
    label: r.display_name,
    result: r,
  }));

  return (
    <Box sx={{ width: "100%", maxWidth: 600 }}>
      <Autocomplete
        freeSolo
        options={options}
        loading={loading}
        onInputChange={(_, value) => setQuery(value)}
        onChange={(_, option) => {
          if (option && typeof option === "object" && "result" in option) {
            onLocationSelect(option.result);
            clear();
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Enter a Swedish address or city..."
            error={!!error}
            helperText={error}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props} key={option.id}>
            <Box>
              <Box sx={{ fontWeight: 500 }}>{option.label}</Box>
              <Box sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.5 }}>
                {option.result.latitude.toFixed(4)}, {option.result.longitude.toFixed(4)}
              </Box>
            </Box>
          </Box>
        )}
      />
    </Box>
  );
}
