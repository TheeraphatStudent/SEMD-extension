import type { ReactNode } from "react";

type PopupShellProps = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PopupShell({ title, subtitle, actions, children }: PopupShellProps) {
  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div>
          <p className="eyebrow">SEMD</p>
          <h1>{title}</h1>
          <p className="subtitle">{subtitle}</p>
        </div>
        <div className="header-actions">{actions}</div>
      </header>
      <section className="popup-body">{children}</section>
    </main>
  );
}
