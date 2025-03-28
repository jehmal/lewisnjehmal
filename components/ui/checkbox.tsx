"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ className, checked, onCheckedChange, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      checked ? "bg-primary border-primary" : "border-input bg-background",
      className
    )}
    onClick={() => onCheckedChange?.(!checked)}
    data-state={checked ? "checked" : "unchecked"}
    aria-checked={checked}
    role="checkbox"
    tabIndex={0}
    onKeyDown={(event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        onCheckedChange?.(!checked);
      }
    }}
    {...props}
  >
    {checked && (
      <div className="flex h-full items-center justify-center">
        <Check className="h-3 w-3 text-white" />
      </div>
    )}
  </div>
))
Checkbox.displayName = "Checkbox"

export { Checkbox } 