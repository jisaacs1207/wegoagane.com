import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { AtmosphereFx } from "./AtmosphereFx";

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const onHome = pathname === "/";

  return (
    <div className="app-root">
      <AtmosphereFx />
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-logo">
            wegoagane
          </Link>
          {!onHome && (
            <Link to="/" className="app-nav-muted">
              ← Home
            </Link>
          )}
        </div>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <span className="app-footer-note">Hardcore reroll & remembrance — Phase 1 build</span>
      </footer>
    </div>
  );
}
