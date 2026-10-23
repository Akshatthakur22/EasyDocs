import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileSpreadsheet,
  FileText,
  Github,
  LockKeyhole,
  Mail,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Linkedin,
  Printer,
  ScanText,
  Workflow,
  Download,
  Layers,
  Clock,
  HelpCircle,
  CheckCircle2,
  XCircle,
  FileCheck,
  HardDrive,
  Cpu,
} from "lucide-react";
import type { ReactNode } from "react";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-site">
      <PublicHeader />
      <main className="public-main">{children}</main>
      <PublicFooter />
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="public-header">
      <Link href="/" className="brand" aria-label="EasyDocs home">
        <span className="brand-mark">
          <FileText size={18} />
        </span>
        <span className="brand-name">
          easy<span>docs</span>
        </span>
      </Link>
      <nav aria-label="Main navigation" className="public-nav">
        <Link href="/">Home</Link>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/#features">Features</Link>
        <Link href="/#compare">Comparison</Link>
        <Link href="/#use-cases">Use Cases</Link>
        <Link href="/#faq">FAQ</Link>
        <Link href="/about">About</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      <div className="header-actions">
        <a
          href="https://github.com/Akshatthakur22/EasyDocs"
          target="_blank"
          rel="noreferrer"
          className="header-gh-link"
          aria-label="View EasyDocs on GitHub"
        >
          <Github size={16} />
          <span className="gh-label">GitHub</span>
        </a>
        <Link href="/app" className="button public-cta">
          Open Tool <ArrowRight size={14} />
        </Link>
      </div>
      <details className="public-mobile-menu">
        <summary>Menu</summary>
        <nav aria-label="Mobile navigation">
          <Link href="/">Home</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#features">Features</Link>
          <Link href="/#compare">Comparison</Link>
          <Link href="/#use-cases">Use Cases</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/about">About EasyDocs</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/contact">Contact</Link>
          <a
            href="https://github.com/Akshatthakur22/EasyDocs"
            target="_blank"
            rel="noreferrer"
            className="mobile-gh-link"
          >
            <Github size={14} /> GitHub Repository
          </a>
        </nav>
      </details>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      {/* 1. Pre-footer Call to Action */}
      <section className="prefooter-stage" aria-label="Get Started with EasyDocs">
        <div className="prefooter-content">
          <span className="prefooter-eyebrow">
            NO ACCOUNT REQUIRED &middot; 100% FREE &middot; ZERO SERVER UPLOADS
          </span>
          <h2 className="prefooter-title">
            Ready to generate your personalized document batch?
          </h2>
          <p className="prefooter-desc">
            Bring your template and spreadsheet. Place your fields once, preview any record instantly, and export print-ready PDFs in seconds.
          </p>
          <div className="prefooter-action">
            <Link href="/app" className="button button-apple-primary button-large">
              Open Document Studio <ArrowRight size={15} />
            </Link>
            <span className="prefooter-subtext">Runs 100% locally in your browser &middot; Private and open source</span>
          </div>
        </div>
      </section>

      {/* 2. Directory Navigation */}
      <div className="footer-directory-stage">
        <div className="footer-inner">
          <div className="footer-directory-grid">
            {/* Left Brand & Attribution Column */}
            <div className="footer-brand-column">
              <Link href="/" className="brand footer-brand" aria-label="EasyDocs home">
                <span className="brand-mark">
                  <FileText size={18} strokeWidth={2.4} />
                </span>
                <span className="brand-name">
                  easy<span>docs</span>
                </span>
              </Link>
              <p className="footer-tagline">
                Free, local-first bulk document generator. Create certificates, letters, and personalized PDFs directly in your browser with zero server uploads.
              </p>
              <div className="footer-badges">
                <span className="footer-privacy-pill">
                  <ShieldCheck size={13} /> 100% Client-Side Engine
                </span>
              </div>
              <p className="footer-copyright-text">
                &copy; {new Date().getFullYear()} EasyDocs. Open source under the MIT License.<br />
                Created by{" "}
                <a href="https://akshatt.in/" target="_blank" rel="noreferrer" className="footer-author-link">
                  Akshat Thakur
                </a>.
              </p>
            </div>

            {/* 4 Directory Navigation Columns */}
            <div className="footer-nav-columns">
              <nav aria-label="Product navigation">
                <h2>PRODUCT</h2>
                <Link href="/app">Document Studio</Link>
                <Link href="/#how-it-works">How It Works</Link>
                <Link href="/#features">Features &amp; Sizing</Link>
                <Link href="/#compare">Competitor Comparison</Link>
                <Link href="/#use-cases">Use Cases</Link>
                <Link href="/#faq">FAQ &amp; Guide</Link>
              </nav>

              <nav aria-label="Trust &amp; Privacy">
                <h2>TRUST &amp; PRIVACY</h2>
                <Link href="/about">About &amp; Architecture</Link>
                <Link href="/privacy">Privacy Guarantee</Link>
                <Link href="/contact">Contact &amp; Support</Link>
                <Link href="/about#privacy">Local IndexedDB Sandbox</Link>
                <Link href="/privacy#lifecycle">3-Min Auto Cleanup</Link>
              </nav>

              <nav aria-label="Resources">
                <h2>RESOURCES</h2>
                <a href="https://github.com/Akshatthakur22/EasyDocs" target="_blank" rel="noreferrer">
                  GitHub Repository <ArrowUpRight size={12} />
                </a>
                <a href="/sample-attendance-warning.docx" download>
                  Sample Word (.docx)
                </a>
                <a href="/sample-students.csv" download>
                  Sample Data (.csv)
                </a>
                <a href="https://github.com/Akshatthakur22/EasyDocs/blob/main/LICENSE" target="_blank" rel="noreferrer">
                  MIT License <ArrowUpRight size={12} />
                </a>
              </nav>

              <nav aria-label="Connect with creator">
                <h2>CONNECT</h2>
                <a href="https://akshatt.in/" target="_blank" rel="noreferrer">
                  Akshat Thakur <ArrowUpRight size={12} />
                </a>
                <a href="https://github.com/Akshatthakur22" target="_blank" rel="noreferrer">
                  GitHub <ArrowUpRight size={12} />
                </a>
                <a href="https://www.linkedin.com/in/akshatthakur22/" target="_blank" rel="noreferrer">
                  LinkedIn <ArrowUpRight size={12} />
                </a>
                <a href="mailto:akshatthakur22@gmail.com">
                  Email <ArrowUpRight size={12} />
                </a>
              </nav>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div className="footer-bottom-copy">
              EasyDocs is built for administrators, educators, and teams who need secure bulk document generation.
            </div>
            <div className="footer-bottom-links">
              <Link href="/privacy">Privacy</Link>
              <span aria-hidden="true">&middot;</span>
              <Link href="/about">Architecture</Link>
              <span aria-hidden="true">&middot;</span>
              <a href="https://github.com/Akshatthakur22/EasyDocs" target="_blank" rel="noreferrer">GitHub</a>
              <span aria-hidden="true">&middot;</span>
              <Link href="/contact">Contact</Link>
            </div>
          </div>
        </div>

        {/* Subtle architectural wordmark */}
        <div className="footer-bleed-wrap" aria-hidden="true">
          <span className="footer-bleed-text">EasyDocs</span>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <PublicLayout>
      {/* 1. EDITORIAL HERO SECTION (Apple Inspired) */}
      <section className="marketing-hero apple-hero">
        <div className="hero-squircle-ambient" aria-hidden="true">
          <div className="squircle-card squircle-1">
            <FileText size={28} strokeWidth={1.75} />
          </div>
          <div className="squircle-card squircle-2">
            <ShieldCheck size={28} strokeWidth={1.75} />
          </div>
          <div className="squircle-card squircle-3">
            <Layers size={28} strokeWidth={1.75} />
          </div>
          <div className="squircle-card squircle-4">
            <Printer size={28} strokeWidth={1.75} />
          </div>
        </div>

        <div className="hero-content">
          <span className="hero-kicker">EASYDOCS STUDIO</span>
          <h1 className="hero-headline">
            Think less.<br />
            <span>Generate more.</span>
          </h1>
          <p className="hero-subhead">
            Create hundreds of personalized certificates, letters, and forms in seconds.
            Bring your existing PDF or Word file, map your spreadsheet columns, and export
            print-ready batches — 100% locally in your browser.
          </p>
          <div className="hero-actions">
            <Link href="/app" className="button button-apple-primary button-large">
              Open Document Studio <ArrowRight size={15} />
            </Link>
            <a href="#quickstart" className="button secondary button-apple-secondary button-large">
              <Download size={15} /> Download Sample Files
            </a>
          </div>
          <div className="hero-trust-bar">
            <span><ShieldCheck size={14} /> 100% In-Browser Engine</span>
            <span className="hero-trust-sep" aria-hidden="true">&middot;</span>
            <span><LockKeyhole size={14} /> Files Never Leave Device</span>
            <span className="hero-trust-sep" aria-hidden="true">&middot;</span>
            <span><Check size={14} /> Free &amp; Open Source</span>
          </div>
        </div>
      </section>

      {/* 2. THREE-PILLAR HARDWARE-GRADE SPEC STRIP */}
      <section className="apple-spec-strip" aria-label="Key capabilities at a glance">
        <div className="spec-strip-inner">
          <div className="spec-strip-item">
            <div className="spec-strip-icon">
              <Cpu size={20} strokeWidth={2} />
            </div>
            <h3>100% In-Browser Engine</h3>
            <p>Documents synthesize directly on your CPU via client-side libraries. Zero server uploads, zero external API latency.</p>
          </div>
          <div className="spec-strip-item">
            <div className="spec-strip-icon">
              <MousePointer2 size={20} strokeWidth={2} />
            </div>
            <h3>Precision Visual Overlays</h3>
            <p>8-handle interactive resizing for text, transparent signatures, and photo stamps with live dimension badges.</p>
          </div>
          <div className="spec-strip-item">
            <div className="spec-strip-icon">
              <Printer size={20} strokeWidth={2} />
            </div>
            <h3>Print-Ready Batch Outputs</h3>
            <p>Single sequenced merged PDF ready for duplex office printing, plus structured ZIP archives and single files.</p>
          </div>
        </div>
      </section>

      {/* 3. AUTHENTIC STUDIO SHOWCASE */}
      <section className="marketing-section showcase-section" id="how-it-works">
        <div className="section-intro text-center">
          <span className="eyebrow">A STUDIO DESIGNED FOR CLARITY</span>
          <h2>Five deliberate steps. Zero repetitive editing.</h2>
          <p>
            Designed for administrators, teachers, and small teams who already have documents and
            spreadsheets and want clean batch results without subscription bloat.
          </p>
        </div>

        <div className="apple-studio-window" aria-label="Authentic representation of the EasyDocs 5-step studio interface">
          <div className="studio-window-bar">
            <div className="studio-window-dots">
              <i />
              <i />
              <i />
            </div>
            <div className="studio-window-title">
              EasyDocs Studio &mdash; Certificate_Template.docx &times; Recipients.csv
            </div>
            <div className="studio-window-badge">
              <span className="live-pulse" /> Local Sandbox
            </div>
          </div>

          <div className="studio-workflow-bar">
            <div className="studio-step-chip done">
              <Check size={12} /> 1. Template
            </div>
            <div className="studio-step-chip done">
              <Check size={12} /> 2. Dataset
            </div>
            <div className="studio-step-chip active">
              <span>3</span> Design Canvas
            </div>
            <div className="studio-step-chip">
              <span>4</span> Review
            </div>
            <div className="studio-step-chip">
              <span>5</span> Export
            </div>
          </div>

          <div className="studio-canvas-stage">
            <div className="studio-doc-canvas">
              <div className="doc-canvas-paper">
                <div className="doc-header-kicker">CERTIFICATE OF ACHIEVEMENT</div>
                <h3 className="doc-title-line">Award of Recognition</h3>
                <p className="doc-body-lead">This certificate is proudly presented to</p>

                {/* Placed Dynamic Field: Name */}
                <div className="canvas-field-box active-field">
                  <span className="field-tag-badge">Text &middot; &#123;&#123;Full Name&#125;&#125;</span>
                  <div className="field-sample-text">Dr. Avery Chen</div>
                  <span className="field-handle handle-nw" />
                  <span className="field-handle handle-ne" />
                  <span className="field-handle handle-se" />
                  <span className="field-handle handle-sw" />
                </div>

                <p className="doc-body-desc">
                  In recognition of outstanding dedication, academic rigor, and leadership during the 2025–2026 academic term.
                </p>

                <div className="doc-footer-row">
                  {/* Placed Dynamic Field: Date */}
                  <div className="canvas-field-box static-field">
                    <span className="field-tag-badge">Text &middot; &#123;&#123;Issue Date&#125;&#125;</span>
                    <div className="field-sample-text-sub">October 24, 2026</div>
                  </div>

                  {/* Placed Dynamic Field: Signature */}
                  <div className="canvas-field-box signature-field">
                    <span className="field-tag-badge">Signature &middot; 160 &times; 60 pt</span>
                    <div className="field-signature-preview">
                      <em>Avery Chen</em>
                    </div>
                    <span className="field-handle handle-se" />
                  </div>
                </div>
              </div>
            </div>

            {/* Field Control Inspector */}
            <div className="studio-inspector-panel">
              <div className="inspector-head">
                <span className="eyebrow">FIELD PROPERTIES</span>
                <h4>&#123;&#123;Full Name&#125;&#125;</h4>
              </div>

              <div className="inspector-group">
                <label>Field Type</label>
                <div className="inspector-pill-toggle">
                  <span className="active">Text</span>
                  <span>Signature / Image</span>
                </div>
              </div>

              <div className="inspector-group">
                <label>Typography</label>
                <div className="inspector-row">
                  <span className="inspector-val">Helvetica &middot; 22 pt</span>
                  <span className="inspector-badge">Bold</span>
                </div>
              </div>

              <div className="inspector-group">
                <label>Page Scope</label>
                <div className="inspector-row">
                  <span className="inspector-val">Repeat Across All Pages</span>
                  <span className="inspector-badge-blue">Synced</span>
                </div>
              </div>

              <div className="inspector-record-nav">
                <span className="record-label">PREVIEW RECORD</span>
                <div className="record-stepper">
                  <span className="record-curr">1 of 150</span>
                  <span className="record-name">Dr. Avery Chen</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INSTANT QUICKSTART / SAMPLE PACK */}
      <section className="marketing-section quickstart-section" id="quickstart">
        <div className="section-intro text-center">
          <span className="eyebrow">TEST IN UNDER 30 SECONDS</span>
          <h2>Try EasyDocs immediately with sample data.</h2>
          <p>
            No need to prepare your own template right now. Download our sample Word document and
            student dataset, load them into EasyDocs, and inspect how personalized documents are
            synthesized in seconds.
          </p>
        </div>
        <div className="quickstart-grid">
          <div className="quickstart-card">
            <div className="quickstart-card-icon">
              <FileText size={22} />
            </div>
            <div className="quickstart-card-body">
              <h3>Sample Template</h3>
              <p>Official academic attendance &amp; performance notice (.docx).</p>
              <span className="quickstart-tag">Format: Word Document (DOCX)</span>
            </div>
            <a
              href="/sample-attendance-warning.docx"
              download
              className="button secondary quickstart-download"
            >
              <Download size={14} /> Download Template
            </a>
          </div>

          <div className="quickstart-card">
            <div className="quickstart-card-icon">
              <FileSpreadsheet size={22} />
            </div>
            <div className="quickstart-card-body">
              <h3>Sample Spreadsheet</h3>
              <p>Sample recipient roster with names, attendance figures, and dates (.csv).</p>
              <span className="quickstart-tag">Format: Comma-Separated Values</span>
            </div>
            <a
              href="/sample-students.csv"
              download
              className="button secondary quickstart-download"
            >
              <Download size={14} /> Download Dataset
            </a>
          </div>

          <div className="quickstart-card quickstart-cta-card">
            <div className="quickstart-card-icon cta-icon">
              <Workflow size={22} />
            </div>
            <div className="quickstart-card-body">
              <h3>Ready to Test?</h3>
              <p>Open the studio, drop both files in, and generate your first batch.</p>
              <span className="quickstart-tag">No login &middot; 100% Free</span>
            </div>
            <Link href="/app" className="button button-apple-primary quickstart-action">
              Launch Studio <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. CORE FEATURES & INNOVATIONS */}
      <section className="marketing-section features-section" id="features">
        <div className="section-intro text-center">
          <span className="eyebrow">ENGINEERED FOR REAL WORK</span>
          <h2>Capabilities built for precision and peace of mind.</h2>
          <p>
            Unlike generic mail-merge scripts, EasyDocs provides granular visual control and
            uncompromising data safety.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <MousePointer2 size={22} />
            </div>
            <h3>Dynamic Image &amp; Signature Resizing</h3>
            <p>
              Add signatures, organization seals, and student photographs. Adjust dimensions on-canvas
              with 8 interactive resize handles, keyboard nudging (`Shift + Arrows`), live dimension
              pills, and 1-click presets.
            </p>
            <span className="feature-pill">Signature · Stamp · Photo Presets</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Layers size={22} />
            </div>
            <h3>Multi-Page Repetition Scope</h3>
            <p>
              Working with multi-page agreements or transcripts? Set any field or signature to repeat
              across all pages, pin to the current page, or display only on selected pages.
            </p>
            <span className="feature-pill">Current · All Pages · Specific Range</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Clock size={22} />
            </div>
            <h3>3-Minute Inactivity Session Protection</h3>
            <p>
              Handling sensitive salary data or student grades on a shared computer? EasyDocs
              features an automatic 3-minute inactivity cleanup with a countdown banner and instant
              override.
            </p>
            <span className="feature-pill">Automatic Sandbox Wipe</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <HardDrive size={22} />
            </div>
            <h3>100% Client-Side Privacy</h3>
            <p>
              No remote server ever sees your spreadsheets, templates, or generated PDFs. All
              conversions, layout rendering, and PDF synthesis happen directly in your browser.
            </p>
            <span className="feature-pill">Zero Server Storage</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Printer size={22} />
            </div>
            <h3>Versatile Export Options</h3>
            <p>
              Get your documents the exact way your workflow needs them: separate files for digital
              distribution, an organized ZIP archive, or a single combined PDF for physical office
              batch printing.
            </p>
            <span className="feature-pill">Individual · ZIP · Merged Print PDF</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <FileCheck size={22} />
            </div>
            <h3>Preserves Original Layouts</h3>
            <p>
              Never spend hours redesigning a certificate or official form in an online editor. Keep
              your exact font typography, borders, logos, and layout intact.
            </p>
            <span className="feature-pill">Pixel-Accurate Backgrounds</span>
          </div>
        </div>
      </section>

      {/* 5. COMPETITOR COMPARISON TABLE */}
      <section className="marketing-section comparison-section" id="compare">
        <div className="section-intro">
          <span className="eyebrow">HONEST EVALUATION</span>
          <h2>Why teams choose EasyDocs over alternatives.</h2>
          <p>
            See how EasyDocs compares to popular tools like Canva Bulk Create, Google Workspace
            Autocrat, and traditional paid document generation services.
          </p>
        </div>

        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th scope="col" className="comp-feature">Feature / Dimension</th>
                <th scope="col" className="comp-highlight">
                  <strong>EasyDocs</strong>
                  <span className="comp-sub">Free &amp; Local</span>
                </th>
                <th scope="col">
                  <strong>Canva Bulk Create</strong>
                  <span className="comp-sub">Proprietary Cloud</span>
                </th>
                <th scope="col">
                  <strong>Google Autocrat</strong>
                  <span className="comp-sub">Drive Add-on</span>
                </th>
                <th scope="col">
                  <strong>Cloud Mail-Merge SaaS</strong>
                  <span className="comp-sub">Paid Credit Model</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cost &amp; Document Limits</td>
                <td className="comp-highlight">
                  <span className="badge-free">100% Free Core</span>
                  <small>No document paywall</small>
                </td>
                <td>
                  <span>Paid Canva Pro</span>
                  <small>$12.99+/mo per user</small>
                </td>
                <td>
                  <span>Free / Quota limited</span>
                  <small>Daily Google Apps Script caps</small>
                </td>
                <td>
                  <span>$15 – $50+/mo</span>
                  <small>Per-document fees &amp; limits</small>
                </td>
              </tr>
              <tr>
                <td>Data Privacy &amp; Processing</td>
                <td className="comp-highlight">
                  <div className="check-row">
                    <CheckCircle2 size={16} className="text-success" />
                    <strong>100% Local in Browser</strong>
                  </div>
                  <small>Zero data leaves your computer</small>
                </td>
                <td>
                  <div className="check-row">
                    <XCircle size={16} className="text-danger" />
                    <span>Cloud Upload Required</span>
                  </div>
                  <small>Data stored on Canva servers</small>
                </td>
                <td>
                  <div className="check-row">
                    <XCircle size={16} className="text-danger" />
                    <span>Cloud Processing</span>
                  </div>
                  <small>Requires Drive/Docs script permissions</small>
                </td>
                <td>
                  <div className="check-row">
                    <XCircle size={16} className="text-danger" />
                    <span>Remote Cloud Servers</span>
                  </div>
                  <small>Customer data transmitted remotely</small>
                </td>
              </tr>
              <tr>
                <td>Account or Registration</td>
                <td className="comp-highlight">
                  <div className="check-row">
                    <CheckCircle2 size={16} className="text-success" />
                    <strong>No Account Ever Needed</strong>
                  </div>
                  <small>Immediate access</small>
                </td>
                <td>
                  <span>Account Required</span>
                  <small>Mandatory registration</small>
                </td>
                <td>
                  <span>Google Account Required</span>
                  <small>OAuth access to entire Drive</small>
                </td>
                <td>
                  <span>Account &amp; Credit Card</span>
                  <small>Signup required</small>
                </td>
              </tr>
              <tr>
                <td>Existing PDF &amp; Word Support</td>
                <td className="comp-highlight">
                  <div className="check-row">
                    <CheckCircle2 size={16} className="text-success" />
                    <strong>Direct Template Upload</strong>
                  </div>
                  <small>PDF, Word, PNG, JPG</small>
                </td>
                <td>
                  <span>Must recreate design in Canva</span>
                  <small>Cannot overlay existing arbitrary multi-page PDFs</small>
                </td>
                <td>
                  <span>Must format in Google Docs</span>
                  <small>Limited to Google Docs layouts</small>
                </td>
                <td>
                  <span>Proprietary builder</span>
                  <small>Locked into their editor</small>
                </td>
              </tr>
              <tr>
                <td>Dynamic Signatures &amp; Photos</td>
                <td className="comp-highlight">
                  <div className="check-row">
                    <CheckCircle2 size={16} className="text-success" />
                    <strong>8-Handle Visual Resizer</strong>
                  </div>
                  <small>Live dimensions &amp; presets</small>
                </td>
                <td>
                  <span>Complex element mapping</span>
                  <small>Rigid aspect constraints</small>
                </td>
                <td>
                  <span>Requires custom script</span>
                  <small>Complex Drive image syntax</small>
                </td>
                <td>
                  <span>Paid tier only</span>
                  <small>Restricted feature</small>
                </td>
              </tr>
              <tr>
                <td>Multi-Page Document Scope</td>
                <td className="comp-highlight">
                  <div className="check-row">
                    <CheckCircle2 size={16} className="text-success" />
                    <strong>Current, All, or Selected Pages</strong>
                  </div>
                  <small>Full page-scope control</small>
                </td>
                <td>
                  <span>Duplicated per page</span>
                  <small>Manual page copy-pasting</small>
                </td>
                <td>
                  <span>Google Doc flow</span>
                  <small>Difficult to scope headers</small>
                </td>
                <td>
                  <span>Limited</span>
                  <small>Usually single-page only</small>
                </td>
              </tr>
              <tr>
                <td>Print-Ready Combined PDF</td>
                <td className="comp-highlight">
                  <div className="check-row">
                    <CheckCircle2 size={16} className="text-success" />
                    <strong>Merged PDF + ZIP + Individual</strong>
                  </div>
                  <small>Ready for batch office printers</small>
                </td>
                <td>
                  <span>ZIP or single PDF</span>
                  <small>Limited batch print options</small>
                </td>
                <td>
                  <span>Creates individual Drive files</span>
                  <small>Clutters Google Drive folders</small>
                </td>
                <td>
                  <span>ZIP archive only</span>
                  <small>No merged printing file</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. TARGET AUDIENCE & USE CASES */}
      <section className="marketing-section usecase-section-expanded" id="use-cases">
        <div className="section-intro">
          <span className="eyebrow">VERSATILE DOCUMENT AUTOMATION</span>
          <h2>Built for the documents teams generate every day.</h2>
          <p>
            Whether you issue dozens of certificates a week or send hundreds of administrative
            letters, EasyDocs removes the copy-paste grind.
          </p>
        </div>

        <div className="usecase-cards-grid">
          <div className="usecase-card">
            <div className="usecase-card-header">
              <span className="usecase-badge">Education &amp; Academics</span>
              <h3>Schools, Colleges &amp; Training Institutes</h3>
            </div>
            <p>
              Issue official student documentation with verified accuracy. Keep student records
              private on local school computers without cloud third-party risk.
            </p>
            <ul className="usecase-items">
              <li>
                <Check size={14} /> Course Completion &amp; Merit Certificates
              </li>
              <li>
                <Check size={14} /> Exam Hall Tickets &amp; Admit Cards with photos
              </li>
              <li>
                <Check size={14} /> Academic Performance Notices &amp; Warning Letters
              </li>
              <li>
                <Check size={14} /> Fee Receipts &amp; Dues Reminders
              </li>
            </ul>
          </div>

          <div className="usecase-card">
            <div className="usecase-card-header">
              <span className="usecase-badge">Business &amp; Operations</span>
              <h3>Small Businesses, HR &amp; Admin Teams</h3>
            </div>
            <p>
              Eliminate costly mail-merge subscriptions. Generate individualized operational
              paperwork in minutes using standard Excel workbooks.
            </p>
            <ul className="usecase-items">
              <li>
                <Check size={14} /> Offer Letters &amp; Employment Verification
              </li>
              <li>
                <Check size={14} /> Client Invoices, Estimates &amp; Payment Receipts
              </li>
              <li>
                <Check size={14} /> Personalized NDAs &amp; Vendor Agreements
              </li>
              <li>
                <Check size={14} /> Monthly Salary Statements
              </li>
            </ul>
          </div>

          <div className="usecase-card">
            <div className="usecase-card-header">
              <span className="usecase-badge">Events &amp; Communities</span>
              <h3>Conferences, Hackathons &amp; Non-Profits</h3>
            </div>
            <p>
              Prepare custom badges and credentials for hundreds of attendees, speakers, and
              volunteers without manual image alignment.
            </p>
            <ul className="usecase-items">
              <li>
                <Check size={14} /> Attendee, Speaker &amp; Press Badges
              </li>
              <li>
                <Check size={14} /> Volunteer Appreciation Certificates
              </li>
              <li>
                <Check size={14} /> Personalized Event Invitations &amp; Entry Passes
              </li>
              <li>
                <Check size={14} /> Donor Acknowledgment Letters
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 7. ARCHITECTURE & PRIVACY SPOTLIGHT */}
      <section className="privacy-band">
        <div className="privacy-icon">
          <ShieldCheck size={26} />
        </div>
        <div>
          <span className="eyebrow">LOCAL-FIRST BY ENGINEERING</span>
          <h2>Your documents never touch a remote server.</h2>
          <p>
            Unlike typical SaaS tools that upload your spreadsheets and recipient lists to remote
            cloud databases, EasyDocs synthesizes PDFs entirely on your CPU using browser Web
            Workers and `pdf-lib`. Your student data, financial figures, and private employee
            records never leave your device.
          </p>
          <div className="privacy-perks">
            <span>
              <HardDrive size={13} /> Local IndexedDB Sandbox
            </span>
            <span>
              <Clock size={13} /> 3-Minute Session Protection
            </span>
            <span>
              <Cpu size={13} /> Client-Side Vector Generation
            </span>
          </div>
        </div>
        <Link href="/privacy" className="text-link">
          Read Privacy Architecture <ArrowRight size={14} />
        </Link>
      </section>

      {/* 8. ANSWER ENGINE OPTIMIZATION (AEO) / FAQ */}
      <section className="marketing-section faq-section" id="faq">
        <div className="section-intro">
          <span className="eyebrow">
            <HelpCircle size={14} /> FREQUENTLY ANSWERED QUESTIONS
          </span>
          <h2>Everything you need to know about EasyDocs.</h2>
          <p>
            Clear, transparent answers to common questions about document formats, privacy,
            limitations, and batch exports.
          </p>
        </div>

        <div className="faq-grid">
          <details className="faq-item" open>
            <summary className="faq-question">
              Is EasyDocs really 100% free? Are there hidden fees or document limits?
            </summary>
            <div className="faq-answer">
              <p>
                <strong>Yes, the core tool is 100% free and open source.</strong> There are no
                per-document fees, no subscription paywalls, no watermark additions, and no
                mandatory credit cards. You can generate batches of up to 500 documents per run as
                often as you need.
              </p>
            </div>
          </details>

          <details className="faq-item">
            <summary className="faq-question">
              Are my documents or spreadsheets uploaded to a server?
            </summary>
            <div className="faq-answer">
              <p>
                <strong>No. All processing is 100% client-side in your browser.</strong> Your
                templates, spreadsheets, recipient names, signatures, and generated PDFs remain on
                your local device. EasyDocs does not send document contents to an external API or
                cloud storage.
              </p>
            </div>
          </details>

          <details className="faq-item">
            <summary className="faq-question">
              Can I use an existing PDF or certificate design I already have?
            </summary>
            <div className="faq-answer">
              <p>
                <strong>Yes, absolutely.</strong> You do not need to recreate your certificates or
                letters in a proprietary editor. Upload your existing PDF, high-resolution PNG/JPG,
                or Word document (.docx/.doc). EasyDocs renders it as the page background and overlays
                your spreadsheet values on top.
              </p>
            </div>
          </details>

          <details className="faq-item">
            <summary className="faq-question">
              How do dynamic signatures, stamps, and photograph fields work?
            </summary>
            <div className="faq-answer">
              <p>
                EasyDocs allows you to add dynamic image fields for signatures, seals, stamps, and
                photos. You can resize them visually on the document canvas using 8 interactive
                drag-handles or quick presets (Signature: 160×60, Stamp: 100×100, Photo: 120×150).
                Images can be shared across all records or matched dynamically.
              </p>
            </div>
          </details>

          <details className="faq-item">
            <summary className="faq-question">
              Can I generate a single combined PDF for office batch printing?
            </summary>
            <div className="faq-answer">
              <p>
                <strong>Yes.</strong> When generating documents, EasyDocs provides three export
                formats: a single <em>Merged Print PDF</em> with all recipient documents sequenced in
                order (ideal for double-sided office printers), a <em>ZIP archive</em> containing
                individual PDFs named by recipient, or individual PDF downloads.
              </p>
            </div>
          </details>

          <details className="faq-item">
            <summary className="faq-question">
              What happens if my spreadsheet has missing values or empty rows?
            </summary>
            <div className="faq-answer">
              <p>
                EasyDocs includes pre-generation data validation. Before generating files, the studio
                scans your mapped columns and alerts you to any rows missing required fields. You can
                preview records with issues, skip invalid rows, or correct them before exporting.
              </p>
            </div>
          </details>

          <details className="faq-item">
            <summary className="faq-question">
              How does the 3-minute inactivity cleanup protect my data?
            </summary>
            <div className="faq-answer">
              <p>
                If you are working on a shared office or university computer, EasyDocs automatically
                monitors inactivity. After 3 minutes without user interaction, a persistent warning
                banner appears with a countdown. You can click &quot;Keep session&quot; to extend your work,
                or let it clean up your local cache automatically to protect sensitive information.
              </p>
            </div>
          </details>

          <details className="faq-item">
            <summary className="faq-question">
              Can I repeat fields across all pages of a multi-page document?
            </summary>
            <div className="faq-answer">
              <p>
                <strong>Yes.</strong> With multi-page templates (like 3-page employment contracts or
                transcripts), you can choose whether a field appears only on the current page,
                repeats across every page (perfect for recipient names, headers, or page numbers), or
                appears on specific selected pages.
              </p>
            </div>
          </details>
        </div>
      </section>

      {/* 9. CREATOR BRAND & TECHNICAL AUTHORITY */}
      <section className="marketing-section creator-highlight-section">
        <div className="creator-card-expanded">
          <div className="creator-monogram-large">AT</div>
          <div className="creator-details">
            <span className="eyebrow">ENGINEERED BY AKSHAT THAKUR</span>
            <h2>Practical tools for real-world operations.</h2>
            <p>
              Hi, I&apos;m <strong>Akshat Thakur</strong>. I build software that tackles tedious
              operational headaches without unnecessary subscriptions or cloud surveillance.
            </p>
            <p className="creator-bio-secondary">
              Most bulk document tools force you into expensive monthly plans or require uploading
              confidential student and employee spreadsheets to remote servers. EasyDocs was built to
              prove that high-performance, private document automation can run 100% inside standard web
              browsers using Web Workers, IndexedDB, and `pdf-lib`.
            </p>
            <div className="creator-actions">
              <a
                href="https://akshatt.in/"
                target="_blank"
                rel="noreferrer"
                className="button secondary"
              >
                Portfolio <ArrowUpRight size={14} />
              </a>
              <a
                href="https://github.com/Akshatthakur22/EasyDocs"
                target="_blank"
                rel="noreferrer"
                className="button secondary"
              >
                <Github size={14} /> Star on GitHub <ArrowUpRight size={14} />
              </a>
              <a
                href="https://www.linkedin.com/in/akshatthakur22/"
                target="_blank"
                rel="noreferrer"
                className="button secondary"
              >
                <Linkedin size={14} /> LinkedIn <ArrowUpRight size={14} />
              </a>
              <a href="mailto:akshatthakur22@gmail.com" className="button secondary">
                <Mail size={14} /> Get in Touch
              </a>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}

export function AboutPage() {
  return (
    <PublicLayout>
      <article className="story-page about-page">
        <header className="story-hero">
          <span className="eyebrow">
            <Sparkles size={13} /> ABOUT EASYDOCS
          </span>
          <h1>
            Built to make repetitive document work<br />
            <span>simple, private, and free.</span>
          </h1>
          <p>
            Preparing personalized letters, certificates, and notices for hundreds of people
            traditionally meant manual copy-pasting, brittle Word mail merges, or uploading
            confidential lists to expensive third-party clouds. EasyDocs changes that.
          </p>
          <div className="story-actions">
            <Link href="/app" className="button button-large">
              Open Document Studio <ArrowRight size={16} />
            </Link>
            <a
              href="https://github.com/Akshatthakur22/EasyDocs"
              target="_blank"
              rel="noreferrer"
              className="button secondary button-large"
            >
              <Github size={15} /> Source Code on GitHub
            </a>
          </div>
          <div className="story-proof">
            <span>
              <Workflow size={15} /> Reusable Template Overlays
            </span>
            <span>
              <LockKeyhole size={15} /> 100% In-Browser Execution
            </span>
            <span>
              <Printer size={15} /> Print-Ready Output
            </span>
          </div>
        </header>

        <section className="about-workflow" id="about-workflow" aria-labelledby="about-workflow-title">
          <div className="about-section-heading">
            <span className="eyebrow">THE CORE PRINCIPLE</span>
            <h2 id="about-workflow-title">
              Keep your existing layout.<br />
              Automate only the changing details.
            </h2>
            <p>
              EasyDocs does not force you to redesign your paperwork in a proprietary canvas. Start
              with the PDF, scan, or Word file you already use.
            </p>
          </div>
          <ol className="workflow-list">
            <li>
              <span>01</span>
              <div>
                <strong>Bring Your Existing Document</strong>
                <p>
                  Use a PDF, high-res image, or convert a Word document locally into a sharp PDF
                  background.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Connect Your Spreadsheet</strong>
                <p>
                  Import CSV or Excel sheets. Every column becomes an available field ready to place.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Place, Resize &amp; Export</strong>
                <p>
                  Drag text, signatures, and photos onto the page. Inspect real recipient previews, then
                  export individual PDFs, a clean ZIP archive, or a merged print PDF.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* Technical Architecture */}
        <section className="about-capabilities" aria-labelledby="about-architecture-title">
          <div className="about-section-heading">
            <span className="eyebrow">UNDER THE HOOD</span>
            <h2 id="about-architecture-title">Engineered for client-side speed and privacy.</h2>
            <p>
              How EasyDocs achieves high-fidelity bulk document generation without a server-side
              rendering farm:
            </p>
          </div>
          <div className="capability-rows">
            <article>
              <span className="capability-icon">
                <Cpu size={18} />
              </span>
              <div>
                <h3>Local PDF Synthesis (`pdf-lib`)</h3>
                <p>
                  Documents are generated directly on the client using vector operations with `pdf-lib`.
                  Text overlays, coordinates, and embedded images are rendered at native printer
                  resolution without server roundtrips.
                </p>
              </div>
              <ScanText size={18} className="capability-end-icon" aria-hidden="true" />
            </article>
            <article>
              <span className="capability-icon">
                <HardDrive size={18} />
              </span>
              <div>
                <h3>Browser IndexedDB Sandbox (Dexie.js)</h3>
                <p>
                  Batch state, column mappings, and working files are persisted in local IndexedDB. You
                  can close your laptop and return to your batch without losing your work, while
                  ensuring no data is sent to external clouds.
                </p>
              </div>
              <Workflow size={18} className="capability-end-icon" aria-hidden="true" />
            </article>
            <article>
              <span className="capability-icon">
                <FileText size={18} />
              </span>
              <div>
                <h3>LibreOffice WebAssembly Worker</h3>
                <p>
                  Legacy Word (.doc/.docx) and Excel files (.xls) are converted locally in a dedicated
                  Web Worker using an in-browser WebAssembly runtime. Document contents never leave the
                  browser thread.
                </p>
              </div>
              <ArrowRight size={18} className="capability-end-icon" aria-hidden="true" />
            </article>
          </div>
        </section>

        {/* Creator Section */}
        <section className="creator-section" aria-labelledby="creator-title">
          <div className="creator-monogram" aria-hidden="true">
            AT
          </div>
          <div className="creator-copy">
            <span className="eyebrow">BUILT BY</span>
            <h2 id="creator-title">Akshat Thakur</h2>
            <p>
              Akshat is a software engineer passionate about developer tooling, local-first web
              applications, and high-utility open-source products. EasyDocs was born out of a desire to
              eliminate bloated enterprise software for simple administrative tasks.
            </p>
            <div className="creator-links">
              <a href="https://akshatt.in/" target="_blank" rel="noreferrer">
                Portfolio <ArrowUpRight size={14} />
              </a>
              <a
                href="https://github.com/Akshatthakur22"
                target="_blank"
                rel="noreferrer"
              >
                <Github size={14} /> GitHub <ArrowUpRight size={14} />
              </a>
              <a
                href="https://www.linkedin.com/in/akshatthakur22/"
                target="_blank"
                rel="noreferrer"
              >
                <Linkedin size={14} /> LinkedIn <ArrowUpRight size={14} />
              </a>
              <a href="mailto:akshatthakur22@gmail.com">
                <Mail size={14} /> Email
              </a>
            </div>
          </div>
        </section>

        <section className="about-final-cta">
          <div>
            <span className="eyebrow">START BUILDING</span>
            <h2>Ready to make your first batch?</h2>
            <p>Bring a document and a spreadsheet. EasyDocs handles the rest.</p>
          </div>
          <Link href="/app" className="button button-large">
            Open the Document Tool <ArrowRight size={16} />
          </Link>
        </section>
      </article>
    </PublicLayout>
  );
}

export function ContactPage() {
  return (
    <PublicLayout>
      <article className="story-page contact-page-redesign">
        <header className="contact-hero">
          <span className="eyebrow">
            <Mail size={13} /> COMMUNITY &amp; SUPPORT
          </span>
          <h1>
            Need help or want to contribute?<br />
            <span>Here is how to get in touch.</span>
          </h1>
          <p>
            EasyDocs is an open-source project created and maintained by Akshat Thakur. Whether you
            have questions, feature requests, or bug reports, here is where to find answers.
          </p>
        </header>

        <section className="contact-guidance" aria-labelledby="contact-guidance-title">
          <div className="contact-guidance-mark">
            <Github size={20} />
          </div>
          <div className="contact-guidance-copy">
            <span className="eyebrow">GITHUB COMMUNITY</span>
            <h2 id="contact-guidance-title">Report Issues and Feature Requests</h2>
            <p>
              Encountered a bug or have a suggestion for improving the template designer? Open an issue
              on our public GitHub repository. Please do not share sensitive or private documents in
              public bug reports.
            </p>
          </div>
          <div className="contact-guidance-note">
            <a
              href="https://github.com/Akshatthakur22/EasyDocs/issues"
              target="_blank"
              rel="noreferrer"
              className="button secondary"
            >
              Open GitHub Issues <ArrowUpRight size={14} />
            </a>
          </div>
        </section>

        <section className="contact-next" aria-labelledby="contact-next-title">
          <div className="about-section-heading">
            <span className="eyebrow">DIRECT CONTACT</span>
            <h2 id="contact-next-title">Reach out to the creator</h2>
          </div>
          <div className="contact-link-list">
            <a href="mailto:akshatthakur22@gmail.com">
              <span>
                <strong>Email Akshat Thakur</strong>
                <small>akshatthakur22@gmail.com for partnerships, questions, or feedback</small>
              </span>
              <Mail size={17} />
            </a>
            <a
              href="https://www.linkedin.com/in/akshatthakur22/"
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <strong>Connect on LinkedIn</strong>
                <small>Professional network and engineering updates</small>
              </span>
              <Linkedin size={17} />
            </a>
            <a href="https://akshatt.in/" target="_blank" rel="noreferrer">
              <span>
                <strong>Personal Website &amp; Portfolio</strong>
                <small>Explore other software projects and engineering writing</small>
              </span>
              <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
      </article>
    </PublicLayout>
  );
}

export function PrivacyPage() {
  return (
    <PublicLayout>
      <article className="privacy-page">
        <header className="privacy-hero">
          <span className="eyebrow">
            <LockKeyhole size={13} /> PRIVACY &amp; DATA INTEGRITY
          </span>
          <h1>
            Your documents stay strictly<br />
            <span>on your local device.</span>
          </h1>
          <p>
            EasyDocs was architected from day one to operate as a local-first application. We do not
            maintain a backend document storage database, we do not log your spreadsheet values, and
            your files are never uploaded to remote servers.
          </p>
        </header>

        <section className="privacy-summary" aria-labelledby="privacy-summary-title">
          <div className="privacy-summary-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="eyebrow">CORE ARCHITECTURAL GUARANTEE</span>
            <h2 id="privacy-summary-title">No remote document transmission.</h2>
            <p>
              When you load a PDF, Word document, or CSV spreadsheet, all parsing, coordinate
              placement, vector styling, and export synthesis take place directly in your web browser.
              The LibreOffice runtime for Word conversions is served as static WebAssembly assets
              from the EasyDocs domain and runs inside a local Web Worker thread.
            </p>
          </div>
          <Link href="/app" className="text-link">
            Open Document Studio <ArrowRight size={14} />
          </Link>
        </section>

        <section className="privacy-details" aria-label="How EasyDocs handles your files">
          <article>
            <span className="privacy-detail-index">01</span>
            <div>
              <h2>Local IndexedDB Sandbox</h2>
              <p>
                Working templates, column mappings, and generation batches are stored locally in your
                browser&apos;s IndexedDB (using Dexie.js). This ensures that if you accidentally close your
                browser tab, your work is preserved. Data in IndexedDB is sandboxed by the browser and
                is inaccessible to any other website.
              </p>
            </div>
          </article>

          <article>
            <span className="privacy-detail-index">02</span>
            <div>
              <h2>Automatic 3-Minute Inactivity Protection</h2>
              <p>
                To safeguard confidential records (such as employee salaries or student grades) on
                shared or public computers, EasyDocs monitors user interaction. If no activity is
                detected for 3 minutes, a countdown alert gives you the option to extend your session
                or automatically clears working data to protect your privacy.
              </p>
            </div>
          </article>

          <article>
            <span className="privacy-detail-index">03</span>
            <div>
              <h2>Instant Data Deletion</h2>
              <p>
                At any point inside the application, you can click <strong>&quot;Delete all local data&quot;</strong>{" "}
                in the bottom footer to immediately purge all templates, datasets, batch records, and
                cached PDFs from your browser. Clearing your browser&apos;s site data also permanently erases
                everything.
              </p>
            </div>
          </article>

          <article>
            <span className="privacy-detail-index">04</span>
            <div>
              <h2>No Third-Party Tracking or Ads</h2>
              <p>
                EasyDocs contains no advertising trackers, invasive session-recording cookies, or data
                brokers. Your operational documents remain entirely under your control.
              </p>
            </div>
          </article>
        </section>

        <footer className="privacy-page-end">
          <p>
            Have security questions or need to verify our local processing? Inspect the source code
            directly.
          </p>
          <div>
            <a
              href="https://github.com/Akshatthakur22/EasyDocs"
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Verify on GitHub <ArrowUpRight size={14} />
            </a>
            <Link href="/about" className="text-link">
              About the Architecture <ArrowRight size={14} />
            </Link>
          </div>
        </footer>
      </article>
    </PublicLayout>
  );
}
