import type { ReactNode } from "react";

/** Standard app page title — matches Overview (`wa-heading-2xl`). */
export function PageTitle({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="wa-cluster wa-gap-s wa-align-items-center">
      <h1 className="wa-heading-2xl page-title" style={{ marginInlineEnd: "auto", marginBlock: 0 }}>
        {children}
      </h1>
      {actions}
    </div>
  );
}
