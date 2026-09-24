"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

type WorkspaceState = {
  farmId: string | null;
  farmName: string;
  chooseFarm: (id: string | null) => void;
  health: "checking" | "online" | "offline";
  retry: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);
export function useWorkspace() {
  const state = useContext(WorkspaceContext);
  if (!state) throw new Error("Workspace components must be inside WorkspaceShell");
  return state;
}

const links = [
  { href: "/workspace", icon: "◈", label: "Overview" },
  { href: "/workspace/farms", icon: "◇", label: "Farm records" },
  { href: "/workspace/decisions", icon: "▦", label: "Decision lab" },
  { href: "/workspace/passports", icon: "▤", label: "Passports" },
  { href: "/workspace/weather", icon: "☼", label: "Weather evidence" },
];

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [farmId, setFarmId] = useState<string | null>(null);
  const [farmName, setFarmName] = useState("");
  const [health, setHealth] = useState<WorkspaceState["health"]>("checking");
  const [menuOpen, setMenuOpen] = useState(false);

  const retry = useCallback(async () => {
    setHealth("checking");
    try {
      const response = await fetch(API + "/health");
      setHealth(response.ok ? "online" : "offline");
    } catch { setHealth("offline"); }
  }, []);

  useEffect(() => {
    const savedId = window.sessionStorage.getItem("agrinexus-demo-farm");
    if (savedId) setFarmId(savedId);
    void retry();
  }, [retry]);

  useEffect(() => {
    if (!farmId) { setFarmName(""); return; }
    let active = true;
    fetch(API + "/v1/farms/" + encodeURIComponent(farmId))
      .then(async (response) => {
        if (!response.ok) throw new Error("Farm unavailable");
        return response.json();
      })
      .then((farm: { name: string }) => { if (active) setFarmName(farm.name); })
      .catch(() => { if (active) setFarmName("Farm selection pending"); });
    return () => { active = false; };
  }, [farmId]);

  function chooseFarm(id: string | null) {
    setFarmId(id);
    if (id) window.sessionStorage.setItem("agrinexus-demo-farm", id);
    else window.sessionStorage.removeItem("agrinexus-demo-farm");
  }

  const current = links.find((item) => item.href === pathname);
  const value: WorkspaceState = { farmId, farmName, chooseFarm, health, retry };

  return <WorkspaceContext.Provider value={value}>
    <div className="app-shell workspace-shell">
      <a className="workspace-skip" href="#workspace-content">Skip to page content</a>
      <aside className={"sidebar" + (menuOpen ? " workspace-nav-open" : "")} aria-label="Workspace navigation">
        <Link href="/workspace" className="side-brand" aria-label="AgriNexus workspace overview" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-copy">agrinexus<small>PROOF OS / LAB</small></span>
        </Link>
        <button type="button" className="workspace-menu-toggle" aria-label={menuOpen ? "Close workspace menu" : "Open workspace menu"}
          aria-controls="workspace-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "Close ×" : "Menu ☰"}
        </button>
        <div className="workspace-nav-body" id="workspace-navigation">
          <div className="side-group-label">YOUR WORKSPACE</div>
          <nav className="side-nav" aria-label="Pages">
            {links.map((item) => <Link key={item.href} href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={"side-link" + (pathname === item.href ? " workspace-link-active" : "")}
              onClick={() => setMenuOpen(false)}>
              <span className="nav-glyph" aria-hidden="true">{item.icon}</span>{item.label}
            </Link>)}
          </nav>
          <div className="sidebar-bottom">
            <div className="side-note"><span className="side-note-icon">↗</span>
              <strong>Evidence before prediction.</strong><p>Local demo · manual entries · transparent limitations.</p>
            </div>
            <span className="side-version">PROOFOS · EARLY PROTOTYPE</span>
          </div>
        </div>
      </aside>
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-path"><Link href="/">← Website</Link><span className="path-slash">/</span>
            <span>WORKSPACE</span><span className="path-slash">/</span>{current?.label ?? "Overview"}
          </div>
          <div className="topbar-actions">
            <span className="local-pill" title={farmName || "No farm selected"}>{farmId ? farmName || "Selected demo farm" : "NO FARM SELECTED"}</span>
            <button className={"connection-pill " + health} type="button" onClick={() => void retry()} title="Retry local API">
              <span className="connection-dot" aria-hidden="true" />
              {health === "online" ? "API connected" : health === "offline" ? "API offline · retry" : "Checking API"}
            </button>
          </div>
        </header>
        <div className="page-content workspace-page-content" id="workspace-content">
          {health === "offline" && <div className="workspace-api-banner" role="alert">
            <span>Backend offline. Start the local API on port 8000 to use live prototype features.</span>
            <button type="button" onClick={() => void retry()}>Retry connection ↗</button>
          </div>}
          {children}
          <footer className="site-footer"><span>AGRINEXUS / PROOFOS</span><p>Local prototype · Manual inputs unverified · Not real-world irrigation advice.</p><Link href="/">Website ↗</Link></footer>
        </div>
      </div>
    </div>
  </WorkspaceContext.Provider>;
}
