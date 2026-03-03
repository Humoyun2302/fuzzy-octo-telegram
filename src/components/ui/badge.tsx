import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none transition-all overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "badge-soft",
        secondary:
          "bg-secondary/80 text-secondary-foreground border border-secondary [a&]:hover:bg-secondary rounded-xl shadow-sm",
        destructive:
          "bg-red-50 text-red-600 border border-red-200 [a&]:hover:bg-red-100 rounded-xl shadow-sm",
        outline:
          "text-foreground border-2 border-primary/20 bg-white [a&]:hover:bg-accent [a&]:hover:border-primary/30 rounded-xl shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };