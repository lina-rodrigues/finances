"use client";

import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  Select as ShadcnSelect,
  SelectContent as ShadcnSelectContent,
  SelectGroup as ShadcnSelectGroup,
  SelectItem as ShadcnSelectItem,
  SelectLabel as ShadcnSelectLabel,
  SelectSeparator as ShadcnSelectSeparator,
  SelectTrigger as ShadcnSelectTrigger,
  SelectValue as ShadcnSelectValue,
} from "@/components/ui/select";
import "@/components/ui/pixelact-ui/styles/styles.css";

export const inputVariants = cva("text-foreground", {
  variants: {
    font: {
      normal: "",
      pixel: "pixel-font",
    },
  },
  defaultVariants: {
    font: "pixel",
  },
});

function SelectValue({
  font,
  className,
  ...props
}: React.ComponentProps<typeof ShadcnSelectValue> & VariantProps<typeof inputVariants>) {
  return (
    <ShadcnSelectValue className={cn(inputVariants({ font }), className)} {...props} />
  );
}

function SelectTrigger({
  className,
  font,
  size = "default",
  ...props
}: React.ComponentProps<typeof ShadcnSelectTrigger> & {
  font?: "normal" | "pixel";
}) {
  return (
    <ShadcnSelectTrigger
      size={size}
      className={cn(
        "relative w-full rounded-none border-0 bg-background shadow-(--pixel-box-shadow) box-shadow-margin ring-0 dark:bg-background",
        "h-auto min-h-11 p-2 text-sm leading-normal data-[size=default]:h-auto data-[size=sm]:h-auto",
        inputVariants({ font }),
        className,
      )}
      {...props}
    />
  );
}

function SelectContent({
  className,
  font,
  ...props
}: React.ComponentProps<typeof ShadcnSelectContent> & VariantProps<typeof inputVariants>) {
  return (
    <ShadcnSelectContent
      className={cn(
        "rounded-none border-none bg-background shadow-(--pixel-box-shadow)",
        inputVariants({ font }),
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({ className, ...props }: React.ComponentProps<typeof ShadcnSelectItem>) {
  return (
    <ShadcnSelectItem
      className={cn(
        "rounded-none border-y-3 border-dashed border-transparent hover:border-foreground dark:hover:border-ring",
        className,
      )}
      {...props}
    />
  );
}

export {
  ShadcnSelect as Select,
  SelectContent,
  ShadcnSelectGroup as SelectGroup,
  SelectItem,
  ShadcnSelectLabel as SelectLabel,
  ShadcnSelectSeparator as SelectSeparator,
  SelectTrigger,
  SelectValue,
};
