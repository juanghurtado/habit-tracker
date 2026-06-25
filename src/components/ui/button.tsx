import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/utils.ts";

const buttonVariants = cva(
  "inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hoverable:hover:brightness-110 active:brightness-90",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hoverable:hover:brightness-110 active:brightness-90",
        accent:
          "bg-accent text-accent-foreground shadow-sm hoverable:hover:brightness-110 active:brightness-90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hoverable:hover:brightness-110 active:brightness-90",
        outline:
          "border border-border bg-card hoverable:hover:bg-muted active:bg-border",
        ghost: "hoverable:hover:bg-muted active:bg-muted-foreground/10",
        link: "text-primary underline-offset-4 hoverable:hover:underline",
        complete:
          "bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-md hoverable:hover:shadow-lg",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-14 px-8 text-lg",
        xl: "h-16 px-10 text-xl",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
