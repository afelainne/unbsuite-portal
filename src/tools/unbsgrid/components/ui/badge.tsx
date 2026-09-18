import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex h-[22px] items-center rounded-pill px-2 text-[11px] font-medium transition-colors duration-fast ease-out focus:outline-none focus-visible:shadow-focus",
  {
    variants: {
      variant: {
        default: "bg-fill-2 text-muted-foreground",
        secondary: "bg-accent text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "text-foreground shadow-hairline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
