"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API, useWorkspace } from "./WorkspaceShell";

const routes = [
  { href: "/workspace/farms", number: "01", symbol: "◇", title: "Farm records", sub: "Choose a field of study", text: "Create a demo farm and collect timestamped, manually entered observations.", action: "Manage farms" },
  { href: "/workspace/decisions", number: "02", symbol: "▦", title: "Decision lab", sub: "Explore the scenarios", text: "Compare an illustrative water balance and see when required inputs are missing.", action: "Compare scenarios" },
  { href: "/workspace/passports", number: "03", symbol: "▤", title: "Evidence passports", sub: "Keep the reasoning", text: "Inspect saved inputs, frozen evidence, and optional self-reported follow-ups.", action: "View passports" },
  { href: "/workspace/weather", number: "04", symbol: "☼", title: "Weather evidence", sub: "External context, labeled", text: "Request a regional provider forecast separately from manual scenario inputs.", action: "Explore weather" },
];

export default function Overview() {
  const { farmId, farmName, health } = useWorkspace();
  const [summary, setSummary] = useState<{ observations: number; passports: number } | null>(null);
  useEffect(() => {
    if (!farmId || health !== "online") { setSummary(null); return; }
    let active = true;
    const base = API + "/v1/farms/" + encodeURIComponent(farmId);
    Promise.all([fetch(base + "/observations"), fetch(base + "/passports")])
      .then(async (responses) => {
        if (responses.some((response) => !response.ok)) throw new Error("Unavailable");
        const [observations, passports] = await Promise.all(responses.map((response) => response.json()));
        if (active) setSummary({ observations: observations.length, passports: passports.length });
      }).catch(() => { if (active) setSummary(null); });
    return () => { active = false; };
  }, [farmId, health]);

  return <main className="workspace-overview">
    <section className="workspace-hero">
      <div className="workspace-hero-copy">
        <span className="section-kicker"><span className="kicker-line" /> THE FIELD COMMAND CENTER</span>
        <h1>Every decision begins with <em>a better question.</em></h1>
        <p>One calm workspace for sample farm records, evidence-first comparisons and a trace of the assumptions behind each illustrative result.</p>
        <div className="hero-actions"><Link className="primary-link" href={farmId ? "/workspace/decisions" : "/workspace/farms"}>
          {farmId ? "Continue to decision lab" : "Set up a demo farm"} <span aria-hidden="true">↗</span>
        </Link><Link className="text-link" href="/workspace/passports">See evidence passports →</Link></div>
        <p className="hero-footnote"><span className="footnote-dot" /> LOCAL DEVELOPMENT · NO AUTOMATED FARMING ADVICE</p>
      </div>
      <div className="workspace-overview-art" role="img" aria-label="Abstract cultivated field illustration; no live satellite or sensor data">
        <div className="landscape"><div className="terrain terrain-one" /><div className="terrain terrain-two" />
        <div className="terrain terrain-three" /><div className="terrain terrain-four" /><div className="terrain terrain-five" />
        <div className="landscape-grid" /><div className="map-point point-one"><span /></div>
        <div className="map-point point-two"><span /></div>
        <div className="field-label"><span className="field-label-icon">◎</span><span>FIELD STUDY<small>ILLUSTRATIVE VISUAL</small></span></div></div>
      </div>
    </section>

    <section className="workspace-overview-status" aria-label="Local workspace status">
      <div><span className="overview-index">ACTIVE DEMO FARM</span><strong>{farmId ? farmName || "Selected" : "Not selected"}</strong><span>{farmId ? "Selection persists within this browser tab" : "Start by creating or selecting a demo farm"}</span></div>
      <div><span className="overview-index">MANUAL OBSERVATIONS</span><strong>{summary ? summary.observations : "—"}</strong><span>{summary ? "Records for selected farm" : "Select a farm and connect the API"}</span></div>
      <div><span className="overview-index">SAVED PASSPORTS</span><strong>{summary ? summary.passports : "—"}</strong><span>{summary ? "Local illustrative records" : "No live count available"}</span></div>
    </section>

    <section aria-labelledby="workspace-next" className="workspace-route-section">
      <div className="section-heading"><div><span className="section-kicker"><span className="kicker-line" /> YOUR WORKFLOW</span>
        <h2 id="workspace-next">Explore one step at a time.</h2>
        <p>Each feature now has its own page, while your selected demo farm carries through the workspace.</p></div></div>
      <div className="workspace-route-grid">{routes.map((route) => <Link key={route.href} href={route.href} className="workspace-route-card">
        <span className="workspace-route-upper"><span>{route.number} / PROOFOS</span><span className="workspace-route-symbol" aria-hidden="true">{route.symbol}</span></span>
        <span className="workspace-route-sub">{route.sub}</span><strong>{route.title}</strong><span className="workspace-route-description">{route.text}</span>
        <span className="workspace-route-action">{route.action} <span aria-hidden="true">↗</span></span>
      </Link>)}</div>
    </section>
    <div className="workspace-quiet-notice">This is an unvalidated local prototype. Manually entered and provider data are not verified field measurements. No result is real-world irrigation advice.</div>
  </main>;
}
