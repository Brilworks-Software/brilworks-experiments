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

  return (
    <main style={pageStyle}>
      <section style={heroWrapStyle}>
        {/* Plain <img> with high fetch priority — keeps LCP low without next/image config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero.url}
          alt={hero.alt}
          width={1600}
          height={900}
          style={heroImgStyle}
          fetchPriority="high"
        />
        <div style={heroOverlayStyle}>
          <h1 style={h1Style}>{business.name}</h1>
          <p style={taglineStyle}>{generated.tagline}</p>
        </div>
      </section>

      <section style={contentSectionStyle}>
        <p style={paragraphStyle}>{generated.blurb1}</p>
        <p style={paragraphStyle}>{generated.blurb2}</p>

        <div style={metaGridStyle}>
          <div>
            <h2 style={h2Style}>Visit</h2>
            <address style={addressStyle}>{business.address}</address>
            {business.phone ? <p style={addressStyle}>{business.phone}</p> : null}
          </div>
          <div>
            <h2 style={h2Style}>Hours</h2>
            {hours.length > 0 ? (
              <ul style={hoursListStyle}>
                {hours.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p style={addressStyle}>Hours not available.</p>
            )}
          </div>
        </div>

        <div style={ctaWrapStyle}>
          <a href="https://brilworks.com/contact" style={ctaButtonStyle}>
            Hire Brilworks to build the real one
          </a>
          <p style={ctaSubStyle}>
            This is a 5-minute preview based on a public listing. The real site can be live in a week.
          </p>
        </div>
      </section>

      <footer style={footerStyle}>
        <p>
          Hero photo by{" "}
          <a href={hero.photographerUrl} rel="noopener noreferrer">
            {hero.photographer}
          </a>{" "}
          on{" "}
          <a href={hero.photoUrl} rel="noopener noreferrer">
            Unsplash
          </a>
          .
        </p>
        {generated.source === "scaffold" ? (
          <p style={{ opacity: 0.7 }}>Draft scaffold — copy has not been rewritten yet.</p>
        ) : null}
      </footer>
    </main>
  );
}

// Inline style objects — keeps the page a single file with zero CSS pipeline
// for v0.0. Will move to CSS Modules once a second template lands.
const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  color: "#1a1a1a",
  background: "#fafafa",
  minHeight: "100vh",
  margin: 0,
};

const heroWrapStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "16 / 9",
  maxHeight: "60vh",
  overflow: "hidden",
};

const heroImgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const heroOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  padding: "2rem",
  background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7) 100%)",
  color: "#fff",
};

const h1Style: React.CSSProperties = {
  fontSize: "clamp(2rem, 5vw, 3.5rem)",
  margin: 0,
  letterSpacing: "-0.02em",
  textShadow: "0 1px 2px rgba(0,0,0,0.4)",
};

const taglineStyle: React.CSSProperties = {
  fontSize: "clamp(1rem, 2vw, 1.25rem)",
  margin: "0.5rem 0 0",
  maxWidth: "60ch",
  textShadow: "0 1px 2px rgba(0,0,0,0.4)",
};

const contentSectionStyle: React.CSSProperties = {
  maxWidth: "720px",
  margin: "0 auto",
  padding: "3rem 1.5rem 1.5rem",
};

const paragraphStyle: React.CSSProperties = {
  fontSize: "1.0625rem",
  lineHeight: 1.65,
  margin: "0 0 1.25rem",
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "2rem",
  margin: "2.5rem 0",
};

const h2Style: React.CSSProperties = {
  fontSize: "0.875rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  margin: "0 0 0.5rem",
  color: "#666",
};

const addressStyle: React.CSSProperties = {
  fontStyle: "normal",
  fontSize: "0.9375rem",
  lineHeight: 1.55,
  margin: 0,
};

const hoursListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  fontSize: "0.9375rem",
  lineHeight: 1.7,
};

const ctaWrapStyle: React.CSSProperties = {
  margin: "3rem 0 1rem",
  padding: "2rem",
  borderRadius: "12px",
  background: "#111",
  color: "#fff",
  textAlign: "center",
};

const ctaButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.875rem 1.5rem",
  background: "#fff",
  color: "#111",
  textDecoration: "none",
  borderRadius: "8px",
  fontWeight: 600,
};

const ctaSubStyle: React.CSSProperties = {
  margin: "1rem 0 0",
  fontSize: "0.875rem",
  opacity: 0.8,
};

const footerStyle: React.CSSProperties = {
  maxWidth: "720px",
  margin: "0 auto",
  padding: "2rem 1.5rem 3rem",
  fontSize: "0.8125rem",
  color: "#666",
};
