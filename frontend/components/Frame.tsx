import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";

interface FrameProps {
  children: ReactNode;
  className?: string;
}

export function Frame({ children, className = "" }: FrameProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
