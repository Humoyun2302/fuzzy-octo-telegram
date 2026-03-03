import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "btn-3d text-white border-0 hover:text-white",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 rounded-2xl shadow-lg",
        outline:
          "border-2 border-primary/20 bg-white text-foreground hover:bg-accent hover:border-primary/30 rounded-2xl shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-2xl shadow-md",
        ghost:
          "hover:bg-accent/50 hover:text-accent-foreground rounded-2xl",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2.5 has-[>svg]:px-4 rounded-2xl",
        sm: "h-9 px-4 gap-1.5 has-[>svg]:px-3 rounded-xl",
        lg: "h-12 px-8 has-[>svg]:px-6 rounded-2xl text-base",
        icon: "size-11 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };