import { useState, useRef, useEffect } from "react";
import { TextField, Autocomplete, CircularProgress, Box, Typography } from "@mui/material";
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
    <Box sx={{ width: "100%" }}>
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
            placeholder="Search for a Swedish address or city (e.g., Stockholm, Göteborg, Malmö)..."
            error={!!error}
            helperText={error}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "background.paper",
              },
            }}
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
          <Box 
            component="li" 
            {...props} 
            key={option.id}
            sx={{
              py: 1.5,
              px: 2,
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 500, color: "text.primary", mb: 0.5 }}>
                {option.label}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                {option.result.latitude.toFixed(4)}°N, {option.result.longitude.toFixed(4)}°E
              </Typography>
            </Box>
          </Box>
        )}
        sx={{
          "& .MuiAutocomplete-paper": {
            borderRadius: 2,
            boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.05), 0px 2px 4px rgba(0, 0, 0, 0.06)",
            border: "1px solid",
            borderColor: "divider",
          },
        }}
      />
    </Box>
  );
}
