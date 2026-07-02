import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";
import { cn } from "@/lib/utils";

interface FrameProps {
  children: ReactNode;
  className?: string;
}

export function Frame({ children, className = "" }: FrameProps) {
  return (
    <Card className={cn("card-hover-lift", className)}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
