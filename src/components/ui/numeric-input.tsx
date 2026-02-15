import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: number;
  onChange: (value: number) => void;
  allowDecimals?: boolean;
  allowNegative?: boolean;
  min?: number;
  max?: number;
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    { value, onChange, allowDecimals = false, allowNegative = false, min, max, className, ...props },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // Allow empty string for clearing
      if (inputValue === "") {
        onChange(0);
        return;
      }

      // Remove non-numeric characters (except decimal point and minus)
      let cleanValue = inputValue;
      if (!allowDecimals) {
        cleanValue = cleanValue.replace(/[^\d-]/g, "");
      } else {
        cleanValue = cleanValue.replace(/[^\d.-]/g, "");
      }

      if (!allowNegative) {
        cleanValue = cleanValue.replace(/-/g, "");
      }

      // Parse to number
      const numericValue = allowDecimals ? parseFloat(cleanValue) : parseInt(cleanValue, 10);

      // Validate
      if (isNaN(numericValue)) {
        onChange(0);
        return;
      }

      // Apply min/max constraints
      let finalValue = numericValue;
      if (min !== undefined && finalValue < min) finalValue = min;
      if (max !== undefined && finalValue > max) finalValue = max;

      onChange(finalValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Auto-select all text on focus for easy replacement
      e.target.select();
    };

    // Display empty string if value is 0, otherwise show the number
    const displayValue = value === 0 ? "" : value.toString();

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={allowDecimals ? "decimal" : "numeric"}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        className={cn("text-right", className)}
        {...props}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";
