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

function Select(props: React.ComponentProps<typeof ShadcnSelect>) {
  return <ShadcnSelect {...props} />;
}

function SelectGroup(props: React.ComponentProps<typeof ShadcnSelectGroup>) {
  return <ShadcnSelectGroup {...props} />;
}

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
    <div
      className={cn(
        "relative shadow-(--pixel-box-shadow) box-shadow-margin w-full",
        inputVariants({ font }),
        className,
      )}
    >
      <ShadcnSelectTrigger
        size={size}
        className={cn(
          "w-full rounded-none border-0 bg-background ring-0 shadow-none dark:bg-background",
          className,
        )}
        {...props}
      />
    </div>
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

function SelectLabel(props: React.ComponentProps<typeof ShadcnSelectLabel>) {
  return <ShadcnSelectLabel {...props} />;
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

function SelectSeparator(props: React.ComponentProps<typeof ShadcnSelectSeparator>) {
  return <ShadcnSelectSeparator {...props} />;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
