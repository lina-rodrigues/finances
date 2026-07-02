import type { ReactNode } from "react";

interface FrameProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}

export function Frame({ children, className = "", innerClassName = "" }: FrameProps) {
  return (
    <div className={`frame-panel p-3 ${className}`}>
      <div className={`frame-panel-inner p-4 ${innerClassName}`}>{children}</div>
    </div>
  );
}
