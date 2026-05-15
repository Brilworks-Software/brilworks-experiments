import { notFound } from "next/navigation";
import { listPreviewSlugs, readPreview } from "@/lib/content/store";

// Static export — the page is generated at build time from JSON snapshots
// committed by `pnpm gen:preview`. No runtime data fetching.
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await listPreviewSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await readPreview(slug);
  if (!record) return { title: "Preview not found" };
  return {
    title: `${record.business.name} — preview by Brilworks`,
    description: record.generated.tagline,
  };
}

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await readPreview(slug);
  if (!record) notFound();

  const { business, hero, generated } = record;
  const hours = business.hours?.weekday_text ?? [];
  const isScaffold = generated.source === "scaffold";

  return (
    <main style={pageStyle}>
      <nav style={navStyle} aria-label="Site">
        <span style={navBrandStyle}>Brilworks · Preview</span>
        <a href="#visit" style={navLinkStyle}>Visit</a>
        <a href="#menu" style={navLinkStyle}>Menu</a>
        <a href="#contact" style={navCtaStyle} aria-disabled="true">
          Reserve
        </a>
      </nav>

      <section style={heroWrapStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero.url}
          alt={hero.alt}
          width={1600}
          height={900}
          style={heroImgStyle}
          fetchPriority="high"
        />
        <div style={heroScrimStyle} aria-hidden="true" />
        <div style={heroContentStyle}>
          <span style={heroKickerStyle}>{generated.neighborhood}</span>
          <h1 style={h1Style}>{business.name}</h1>
          <p style={taglineStyle}>{generated.tagline}</p>
        </div>
      </section>

      <section style={aboutSectionStyle} aria-labelledby="about-heading">
        <span style={eyebrowStyle}>About</span>
        <h2 id="about-heading" style={visuallyHiddenStyle}>About {business.name}</h2>
        <div style={aboutGridStyle}>
          <p style={aboutLeadStyle}>{generated.aboutP1}</p>
          <p style={aboutBodyStyle}>{generated.aboutP2}</p>
        </div>
      </section>

      <section id="menu" style={dishesSectionStyle} aria-labelledby="dishes-heading">
        <div style={sectionHeaderStyle}>
          <span style={eyebrowStyle}>Signature</span>
          <h2 id="dishes-heading" style={h2Style}>A taste of the kitchen</h2>
        </div>
        <ol style={dishesGridStyle}>
          {generated.signatureDishes.map((dish, idx) => (
            <li key={dish.name + idx} style={dishCardStyle}>
              <span style={dishNumStyle}>{String(idx + 1).padStart(2, "0")}</span>
              <h3 style={dishNameStyle}>{dish.name}</h3>
              <p style={dishLineStyle}>{dish.line}</p>
            </li>
          ))}
        </ol>
        <p style={dishesDisclaimerStyle}>
          Sample dishes for this preview. The real menu replaces these on launch.
        </p>
      </section>

      <section id="visit" style={visitSectionStyle} aria-labelledby="visit-heading">
        <div style={sectionHeaderStyle}>
          <span style={eyebrowStyle}>Visit</span>
          <h2 id="visit-heading" style={h2Style}>Find us</h2>
        </div>
        <div style={visitGridStyle}>
          <div>
            <h3 style={visitColHeaderStyle}>Hours</h3>
            {hours.length > 0 ? (
              <ul style={hoursListStyle}>
                {hours.map((line) => {
                  const [day, ...rest] = line.split(": ");
                  return (
                    <li key={line} style={hoursRowStyle}>
                      <span style={hoursDayStyle}>{day}</span>
                      <span style={hoursTimeStyle}>{rest.join(": ")}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p style={addressStyle}>Hours not available.</p>
            )}
          </div>
          <div>
            <h3 style={visitColHeaderStyle}>Address</h3>
            <address style={addressStyle}>
              {business.address}
              {business.phone ? (
                <>
                  <br />
                  <a href={`tel:${business.phone.replace(/\s+/g, "")}`} style={phoneLinkStyle}>
                    {business.phone}
                  </a>
                </>
              ) : null}
            </address>
            <div style={mapPlaceholderStyle} aria-hidden="true">
              <span style={mapPinStyle}>·</span>
            </div>
          </div>
        </div>
      </section>

      <section style={pressSectionStyle} aria-labelledby="press-heading">
        <span style={eyebrowStyle}>Featured in</span>
        <h2 id="press-heading" style={pressHeadlineStyle}>Press mentions appear here.</h2>
        <p style={pressSubStyle}>
          Once the real site is live, this strip lists publications, awards, and guides.
        </p>
      </section>

      <section id="contact" style={ctaSectionStyle}>
        <p style={ctaEyebrowStyle}>Like what you see?</p>
        <h2 style={ctaHeadlineStyle}>
          We can build the real one this week.
        </h2>
        <p style={ctaBodyStyle}>
          This preview was generated from your public Google listing in about five minutes.
          A real site — yours, on your domain, with your menu and your photos — takes us
          one week.
        </p>
        <a href="https://brilworks.com/contact" style={ctaButtonStyle}>
          Hire Brilworks to build the real one
        </a>
      </section>

      <footer style={footerStyle}>
        <p style={footerLineStyle}>
          Hero photo by{" "}
          <a href={hero.photographerUrl} rel="noopener noreferrer" style={footerLinkStyle}>
            {hero.photographer}
          </a>{" "}
          on{" "}
          <a href={hero.photoUrl} rel="noopener noreferrer" style={footerLinkStyle}>
            Unsplash
          </a>
          .
        </p>
        <p style={footerLineStyle}>
          Brilworks experiments · {business.name} preview
        </p>
        {isScaffold ? (
          <p style={footerWarnStyle}>
            Draft scaffold — copy has not been rewritten yet.
          </p>
        ) : null}
      </footer>
    </main>
  );
}

// Style objects — kept inline so the page stays a single file with zero CSS
// pipeline. Will move to CSS Modules once a second template lands.
const INK = "#14201f";
const PAPER = "#faf8f4";
const ACCENT = "#9c5a2b";
const RULE = "rgba(20, 32, 31, 0.12)";

const pageStyle: React.CSSProperties = {
  color: INK,
  background: PAPER,
  minHeight: "100vh",
  margin: 0,
  fontFamily: "var(--font-body), system-ui, -apple-system, Segoe UI, sans-serif",
};

const navStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 5,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "1.5rem",
  padding: "1.25rem 2rem",
  color: "#fff",
  fontSize: "0.8125rem",
  letterSpacing: "0.04em",
};

const navBrandStyle: React.CSSProperties = {
  marginRight: "auto",
  fontFamily: "var(--font-display), Georgia, serif",
  fontSize: "1rem",
  letterSpacing: "0.02em",
  color: "rgba(255,255,255,0.95)",
};

const navLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.85)",
  textDecoration: "none",
};

const navCtaStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.6)",
  padding: "0.4rem 0.9rem",
  borderRadius: "999px",
  textDecoration: "none",
  color: "#fff",
  cursor: "default",
  opacity: 0.85,
};

const heroWrapStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "min(82vh, 760px)",
  overflow: "hidden",
  background: INK,
};

const heroImgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const heroScrimStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%)",
  pointerEvents: "none",
};

const heroContentStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  padding: "0 2rem 4rem",
  maxWidth: "960px",
  margin: "0 auto",
  color: "#fff",
};

const heroKickerStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "0.75rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  marginBottom: "1rem",
  color: "rgba(255,255,255,0.85)",
  borderTop: "1px solid rgba(255,255,255,0.5)",
  paddingTop: "0.75rem",
};

const h1Style: React.CSSProperties = {
  fontFamily: "var(--font-display), Georgia, serif",
  fontSize: "clamp(2.25rem, 6vw, 4.5rem)",
  fontWeight: 500,
  lineHeight: 1.05,
  margin: 0,
  letterSpacing: "-0.015em",
  textShadow: "0 1px 2px rgba(0,0,0,0.25)",
};

const taglineStyle: React.CSSProperties = {
  fontSize: "clamp(1rem, 1.75vw, 1.25rem)",
  margin: "1rem 0 0",
  maxWidth: "44ch",
  lineHeight: 1.45,
  color: "rgba(255,255,255,0.92)",
  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
};

const aboutSectionStyle: React.CSSProperties = {
  maxWidth: "1040px",
  margin: "0 auto",
  padding: "5rem 1.5rem 4rem",
};

const eyebrowStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "0.75rem",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: ACCENT,
  marginBottom: "1.25rem",
};

const aboutGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "2.5rem",
  alignItems: "start",
};

const aboutLeadStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), Georgia, serif",
  fontSize: "clamp(1.25rem, 2.2vw, 1.625rem)",
  fontWeight: 400,
  lineHeight: 1.4,
  margin: 0,
  letterSpacing: "-0.005em",
  color: INK,
};

const aboutBodyStyle: React.CSSProperties = {
  fontSize: "1.0625rem",
  lineHeight: 1.7,
  margin: 0,
  color: "rgba(20, 32, 31, 0.78)",
};

const dishesSectionStyle: React.CSSProperties = {
  background: "#f1ece1",
  padding: "5rem 1.5rem",
};

const sectionHeaderStyle: React.CSSProperties = {
  maxWidth: "1040px",
  margin: "0 auto 2.5rem",
};

const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-display), Georgia, serif",
  fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  margin: 0,
  lineHeight: 1.15,
};

const dishesGridStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "0 auto",
  maxWidth: "1040px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "2rem",
};

const dishCardStyle: React.CSSProperties = {
  borderTop: `1px solid ${RULE}`,
  paddingTop: "1.25rem",
};

const dishNumStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), Georgia, serif",
  fontSize: "0.875rem",
  letterSpacing: "0.08em",
  color: ACCENT,
};

const dishNameStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), Georgia, serif",
  fontSize: "1.375rem",
  fontWeight: 500,
  margin: "0.4rem 0 0.5rem",
  letterSpacing: "-0.005em",
};

const dishLineStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  lineHeight: 1.6,
  margin: 0,
  color: "rgba(20, 32, 31, 0.78)",
};

const dishesDisclaimerStyle: React.CSSProperties = {
  maxWidth: "1040px",
  margin: "2.5rem auto 0",
  fontSize: "0.8125rem",
  color: "rgba(20, 32, 31, 0.55)",
  fontStyle: "italic",
};

const visitSectionStyle: React.CSSProperties = {
  maxWidth: "1040px",
  margin: "0 auto",
  padding: "5rem 1.5rem",
};

const visitGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "2.5rem",
};

const visitColHeaderStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), Georgia, serif",
  fontSize: "1.125rem",
  fontWeight: 500,
  margin: "0 0 1rem",
};

const hoursListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  fontSize: "0.9375rem",
};

const hoursRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "0.55rem 0",
  borderBottom: `1px solid ${RULE}`,
};

const hoursDayStyle: React.CSSProperties = {
  fontWeight: 500,
};

const hoursTimeStyle: React.CSSProperties = {
  color: "rgba(20, 32, 31, 0.7)",
};

const addressStyle: React.CSSProperties = {
  fontStyle: "normal",
  fontSize: "0.9375rem",
  lineHeight: 1.65,
  margin: 0,
};

const phoneLinkStyle: React.CSSProperties = {
  color: ACCENT,
  textDecoration: "none",
};

const mapPlaceholderStyle: React.CSSProperties = {
  marginTop: "1.5rem",
  height: "180px",
  borderRadius: "8px",
  background:
    "linear-gradient(135deg, #ece6d6 0%, #ddd2b9 60%, #cdbf9c 100%)",
  position: "relative",
  border: `1px solid ${RULE}`,
};

const mapPinStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  background: ACCENT,
  boxShadow: "0 0 0 4px rgba(156, 90, 43, 0.18)",
  textIndent: "-9999px",
};

const pressSectionStyle: React.CSSProperties = {
  maxWidth: "1040px",
  margin: "0 auto",
  padding: "3rem 1.5rem 5rem",
  textAlign: "center",
  borderTop: `1px solid ${RULE}`,
};

const pressHeadlineStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), Georgia, serif",
  fontSize: "clamp(1.25rem, 2.4vw, 1.625rem)",
  fontStyle: "italic",
  fontWeight: 400,
  margin: 0,
  color: "rgba(20, 32, 31, 0.55)",
};

const pressSubStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  marginTop: "0.75rem",
  color: "rgba(20, 32, 31, 0.5)",
};

const ctaSectionStyle: React.CSSProperties = {
  background: INK,
  color: PAPER,
  padding: "5rem 1.5rem",
  textAlign: "center",
};

const ctaEyebrowStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "rgba(250, 248, 244, 0.6)",
  margin: 0,
};

const ctaHeadlineStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), Georgia, serif",
  fontSize: "clamp(2rem, 4.5vw, 3rem)",
  fontWeight: 500,
  lineHeight: 1.15,
  letterSpacing: "-0.01em",
  margin: "1rem auto 1.25rem",
  maxWidth: "20ch",
};

const ctaBodyStyle: React.CSSProperties = {
  fontSize: "1rem",
  lineHeight: 1.65,
  maxWidth: "52ch",
  margin: "0 auto 2rem",
  color: "rgba(250, 248, 244, 0.78)",
};

const ctaButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.95rem 1.75rem",
  background: PAPER,
  color: INK,
  textDecoration: "none",
  borderRadius: "999px",
  fontWeight: 600,
  fontSize: "0.9375rem",
  letterSpacing: "0.01em",
};

const footerStyle: React.CSSProperties = {
  maxWidth: "1040px",
  margin: "0 auto",
  padding: "2.5rem 1.5rem 3.5rem",
  fontSize: "0.8125rem",
  color: "rgba(20, 32, 31, 0.55)",
  display: "grid",
  gap: "0.5rem",
};

const footerLineStyle: React.CSSProperties = {
  margin: 0,
};

const footerLinkStyle: React.CSSProperties = {
  color: "rgba(20, 32, 31, 0.7)",
};

const footerWarnStyle: React.CSSProperties = {
  margin: "0.5rem 0 0",
  fontStyle: "italic",
  color: "#a04a4a",
};

const visuallyHiddenStyle: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};
