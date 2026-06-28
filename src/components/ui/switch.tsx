import * as React from "react";

import { cn } from "../../lib/utils";

type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ className, ...props }, ref) => (
  <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
    <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
    <span
      className={cn(
        "h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
    />
    <span className="pointer-events-none absolute left-1 size-4 rounded-full bg-background shadow transition-transform peer-checked:translate-x-5" />
  </label>
));
Switch.displayName = "Switch";
