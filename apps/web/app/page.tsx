"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import "./landing.css";

const capabilities = [
  {
    index: "01",
    icon: "✳",
    title: "Collect the context.",
    description: "Keep demo farm profiles and manually entered observations together, with clear timestamps and source labels.",
    detail: "FARM RECORDS",
  },
  {
    index: "02",
    icon: "◈",
    title: "Explore the possibilities.",
    description: "Compare illustrative water-balance scenarios. See missing inputs before drawing conclusions.",
    detail: "DECISION LAB",
  },
  {
    index: "03",
    icon: "▤",
    title: "Preserve the reasoning.",
    description: "Save a decision passport with its input provenance, assumptions, and optional self-reported follow-ups.",
    detail: "EVIDENCE PASSPORT",
  },
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={"lp-brand" + (light ? " lp-brand-light" : "")} href="/" aria-label="AgriNexus home">
      <span className="lp-brand-icon" aria-hidden="true">
        <svg viewBox="0 0 36 36" width="22" height="22" fill="none"><path d="M9 26c7 0 17-6 18-18-12 1-18 8-18 18Z" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 26c3-7 8-11 15-15M10 26v4" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/></svg>
      </span>
      <span>agrinexus<span className="lp-brand-period">.</span></span>
    </Link>
  );
}

function FieldLandscape() {
  return (
    <div className="lp-landscape" aria-label="Stylized agricultural landscape; an illustration, not live field imagery" role="img">
      <svg className="lp-landscape-svg" viewBox="0 0 1080 510" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="lp-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e4e5c9"/><stop offset=".53" stopColor="#bbc9a4"/><stop offset="1" stopColor="#779476"/></linearGradient>
          <linearGradient id="lp-field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#71956d"/><stop offset="1" stopColor="#314f36"/></linearGradient>
          <clipPath id="lp-field-mask"><path d="M0 265C154 229 238 287 373 252c140-35 245-15 342 6 127 26 236-30 365-18v270H0Z"/></clipPath>
        </defs>
        <rect width="1080" height="510" fill="url(#lp-sky)"/>
        <circle cx="823" cy="103" r="68" fill="#f6f1d7" opacity=".7"/>
        <path d="M0 273c168-132 271-86 387-117 140-38 278-127 430-54 100 49 180 70 263 39v369H0Z" fill="#94a789" opacity=".72"/>
        <path d="M0 286c125-47 204-46 340-82 172-45 287 45 436-9 100-36 207-30 304-14v329H0Z" fill="#647f62"/>
        <path d="M0 265C154 229 238 287 373 252c140-35 245-15 342 6 127 26 236-30 365-18v270H0Z" fill="url(#lp-field)"/>
        <g clipPath="url(#lp-field-mask)" fill="none">
          <path d="M-170 495Q290 315 1220 256M-155 530Q290 339 1220 278M-137 562Q290 360 1220 302M-105 604Q290 386 1220 326M-70 644Q290 416 1220 348M-30 688Q290 445 1220 372M10 744Q290 478 1220 396" stroke="#aec29a" strokeWidth="14" opacity=".86"/>
          <path d="M-170 495Q290 315 1220 256M-155 530Q290 339 1220 278M-137 562Q290 360 1220 302M-105 604Q290 386 1220 326M-70 644Q290 416 1220 348M-30 688Q290 445 1220 372M10 744Q290 478 1220 396" stroke="#294d37" strokeWidth="3" opacity=".55" transform="translate(0 10)"/>
        </g>
        <path d="M0 370c200-24 286-8 412-28 162-25 318-83 668-48" stroke="#e6e4c9" strokeWidth="1.5" strokeDasharray="6 9" fill="none" opacity=".55"/>
        <circle cx="495" cy="305" r="18" fill="#f5f3d8" opacity=".27"/><circle cx="495" cy="305" r="8" fill="#f4f1d6"/><circle cx="495" cy="305" r="4" fill="#55765c"/>
        <circle cx="765" cy="263" r="14" fill="#f5f3d8" opacity=".3"/><circle cx="765" cy="263" r="6" fill="#f4f1d6"/>
      </svg>
      <div className="lp-landscape-label"><span className="lp-live-dot" /> FIELD VIEW / CONCEPT ART</div>
      <div className="lp-landscape-coordinate">EVIDENCE BEFORE PREDICTION <span>↗</span></div>
    </div>
  );
}

function SectionTitle({ eyebrow, children, description, centered = false }: {
  eyebrow: string; children: ReactNode; description?: string; centered?: boolean;
}) {
  return (
    <div className={"lp-section-title" + (centered ? " lp-section-title-centered" : "")}>
      <span className="lp-eyebrow"><span className="lp-eyebrow-dot" />{eyebrow}</span>
      <h2>{children}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<"inputs" | "comparison" | "passport">("inputs");

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="lp-page" id="home">
      <header className="lp-header">
        <nav className="lp-nav" aria-label="Main navigation">
          <Brand />
          <button className="lp-menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="lp-nav-links" onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
          <div className={"lp-nav-links" + (menuOpen ? " lp-nav-links-open" : "")} id="lp-nav-links">
            <a href="#features" onClick={closeMenu}>Features</a>
            <a href="#how-it-works" onClick={closeMenu}>How it works</a>
            <a href="#preview" onClick={closeMenu}>Product preview</a>
          </div>
          <Link className="lp-nav-cta" href="/workspace">Open prototype <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <main>
        <section className="lp-hero" aria-labelledby="lp-hero-heading">
          <div className="lp-hero-orb lp-orb-one" aria-hidden="true" />
          <div className="lp-hero-orb lp-orb-two" aria-hidden="true" />
          <div className="lp-hero-inner">
            <span className="lp-intro-pill"><span className="lp-pill-dot" /> INTRODUCING AGRINEXUS PROOFOS <span className="lp-pill-arrow">↗</span></span>
            <h1 id="lp-hero-heading">Good decisions<br />grow from <em>good evidence.</em></h1>
            <p className="lp-hero-description">One thoughtful place for farm observations, transparent scenario comparisons, and the reasoning behind every decision.</p>
            <div className="lp-hero-actions">
              <Link className="lp-button lp-button-primary" href="/workspace">Explore the prototype <span aria-hidden="true">↗</span></Link>
              <a className="lp-button lp-button-outline" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
            </div>
            <p className="lp-hero-note">EARLY DEVELOPMENT PROTOTYPE <span /> BUILT TO MAKE UNCERTAINTY VISIBLE</p>
          </div>
        </section>

        <section className="lp-landscape-section" aria-label="AgriNexus illustration">
          <FieldLandscape />
          <div className="lp-landscape-caption"><span>ROOTED IN REAL QUESTIONS.</span><p>A better farming decision starts by knowing what you know—and what you don’t.</p><span>01 / FIELD NOTES</span></div>
        </section>

        <section className="lp-features lp-container" id="features" aria-labelledby="lp-features-heading">
          <SectionTitle eyebrow="THE FOUNDATION" centered description="Less noise. More clarity. Three connected ways to understand the story behind a field decision.">
            Powerful tools, <em>naturally intuitive.</em>
          </SectionTitle>
          <div className="lp-feature-grid">
            {capabilities.map((feature, index) => (
              <article className={"lp-feature-card lp-feature-" + index} key={feature.index}>
                <div className="lp-feature-icon" aria-hidden="true">{feature.icon}</div>
                <span className="lp-feature-index">{feature.index} / {feature.detail}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <Link href={index === 0 ? "/workspace#farms" : index === 1 ? "/workspace#decision-lab" : "/workspace#farms"} className="lp-feature-link">Explore in prototype <span aria-hidden="true">↗</span></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-story" id="how-it-works" aria-labelledby="lp-story-heading">
          <div className="lp-story-inner lp-container">
            <div className="lp-story-visual">
              <div className="lp-story-blob lp-story-blob-back" />
              <div className="lp-story-blob lp-story-blob-front">
                <span className="lp-story-leaf" aria-hidden="true">✳</span>
                <span>FIELD NOTES<br />TO CLEARER THINKING</span>
                <strong>Every input<br />has a story.</strong>
              </div>
              <span className="lp-story-stamp">NO BLACK BOX / NO HIDDEN ASSUMPTIONS</span>
            </div>
            <div className="lp-story-copy">
              <span className="lp-eyebrow"><span className="lp-eyebrow-dot" /> HOW IT WORKS</span>
              <h2 id="lp-story-heading">A little more context.<br /><em>A lot more clarity.</em></h2>
              <p className="lp-story-description">Instead of treating an estimate like a fact, ProofOS shows where each piece of information came from—and makes missing evidence part of the conversation.</p>
              <div className="lp-story-steps">
                <div><span>01</span><div><strong>Record the field</strong><p>Create a demo farm and add time-stamped manual observations.</p></div></div>
                <div><span>02</span><div><strong>Compare possible scenarios</strong><p>Enter water-balance assumptions and review illustrative calculations.</p></div></div>
                <div><span>03</span><div><strong>Keep an evidence trail</strong><p>Save a passport with input sources, limitations, and optional follow-up notes.</p></div></div>
              </div>
              <Link href="/workspace" className="lp-text-cta">Step inside the workspace <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </section>

        <section className="lp-preview-section lp-container" id="preview" aria-labelledby="lp-preview-heading">
          <SectionTitle eyebrow="A LOOK INSIDE" centered description="This is a preview of the working demo. Actual outputs are generated only when you submit your own inputs in the workspace.">
            Get closer to the <em>whole picture.</em>
          </SectionTitle>
          <div className="lp-product-demo">
            <div className="lp-demo-toolbar"><div className="lp-demo-brand"><span className="lp-demo-icon">✳</span> AGRINEXUS <span>/</span> PROOFOS</div><span className="lp-demo-label">INTERFACE PREVIEW · SAMPLE DATA</span></div>
            <div className="lp-demo-body">
              <div className="lp-demo-sidebar" aria-hidden="true"><span className="lp-demo-sidebar-active">◈</span><span>▦</span><span>◇</span><span>☼</span></div>
              <div className="lp-demo-main">
                <div className="lp-demo-heading"><span className="lp-eyebrow">FIELD COMMAND CENTER / PREVIEW</span><h3>{preview === "inputs" ? "The field, in context." : preview === "comparison" ? "Compare with clarity." : "Reasoning worth keeping."}</h3><p>{preview === "inputs" ? "Make source labels visible before calculations begin." : preview === "comparison" ? "Look at two illustrative scenarios side by side." : "Preserve inputs and assumptions with a saved example record."}</p></div>
                <div className="lp-demo-tabs" role="group" aria-label="Preview screens">
                  <button className={preview === "inputs" ? "active" : ""} onClick={() => setPreview("inputs")} type="button" aria-pressed={preview === "inputs"}>Field context</button>
                  <button className={preview === "comparison" ? "active" : ""} onClick={() => setPreview("comparison")} type="button" aria-pressed={preview === "comparison"}>Scenarios</button>
                  <button className={preview === "passport" ? "active" : ""} onClick={() => setPreview("passport")} type="button" aria-pressed={preview === "passport"}>Passport</button>
                </div>
                {preview === "inputs" && <div className="lp-demo-cards">
                  <div className="lp-demo-card"><span>DEMO FIELD</span><strong>Sample plot A</strong><p>Cotton · Example region</p><div className="lp-demo-card-line" /><small>Manual observation <b>31% soil moisture</b></small><small>Source <b>Manual / unverified</b></small></div>
                  <div className="lp-demo-card lp-demo-accent"><span>EVIDENCE GATE</span><strong>Know your inputs.</strong><p>Check required measurements before comparing scenarios.</p><div className="lp-demo-progress"><i /></div><small>ILLUSTRATIVE ENTRIES · NOT LIVE DATA</small></div>
                </div>}
                {preview === "comparison" && <div className="lp-demo-cards">
                  <div className="lp-demo-card"><span>SCENARIO A / NO IRRIGATION</span><strong>30 <small>mm</small></strong><p>Illustrative end-of-day water</p><div className="lp-demo-card-line" /><small>From example manually entered values</small></div>
                  <div className="lp-demo-card lp-demo-accent"><span>SCENARIO B / WITH IRRIGATION</span><strong>40 <small>mm</small></strong><p>Illustrative end-of-day water</p><div className="lp-demo-card-line" /><small>Not a recommendation to irrigate</small></div>
                </div>}
                {preview === "passport" && <div className="lp-demo-cards">
                  <div className="lp-demo-card"><span>ILLUSTRATIVE PASSPORT</span><strong>Evidence snapshot</strong><p>Input source: manual and unverified</p><div className="lp-demo-card-line" /><small>Assumptions explicitly recorded</small><small>Follow-ups: self-reported only</small></div>
                  <div className="lp-demo-card lp-demo-accent"><span>INTEGRITY FIRST</span><strong>What’s still unknown?</strong><p>Observation validity, soil context, and actual crop response.</p><div className="lp-demo-card-line" /><small>NO VERIFIED FIELD OUTCOME CLAIMED</small></div>
                </div>}
              </div>
            </div>
          </div>
          <div className="lp-preview-footer"><span>REAL WORKSPACE / LOCAL BACKEND</span><Link href="/workspace" className="lp-button lp-button-primary">Try it with your inputs <span aria-hidden="true">↗</span></Link><span>DESKTOP &amp; MOBILE RESPONSIVE</span></div>
        </section>

        <section className="lp-principle">
          <div className="lp-principle-inner lp-container"><span className="lp-eyebrow">THE PROOFOS PRINCIPLE</span><h2>Not another prediction.<br /><em>A better way to ask questions.</em></h2><p>Transparent assumptions. Clear provenance. Honest limitations. Built for exploration, not for real-world irrigation instructions.</p><Link href="/workspace#decision-lab" className="lp-button lp-button-light">Explore the decision lab <span aria-hidden="true">↗</span></Link></div>
        </section>

        <footer className="lp-footer lp-container">
          <div><Brand /><p>Evidence-led thinking for the future of farming.</p></div>
          <div className="lp-footer-links"><a href="#features">Features</a><a href="#how-it-works">How it works</a><Link href="/workspace">Open prototype</Link></div>
          <div className="lp-footer-bottom"><span>© AGRINEXUS PROOFOS · EARLY PROTOTYPE</span><span>Illustrative outputs only · Do not use for actual irrigation decisions.</span><a href="#home">Back to top ↑</a></div>
        </footer>
      </main>
    </div>
  );
}
