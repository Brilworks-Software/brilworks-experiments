import { Fraunces, Inter } from "next/font/google";

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const body = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "Brilworks experiments",
  description: "Brilworks v0.X experiments — preview engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body
        style={{
          margin: 0,
          fontFamily: "var(--font-body), system-ui, -apple-system, Segoe UI, sans-serif",
          color: "#1a1a1a",
          background: "#faf8f4",
        }}
      >
        {children}
      </body>
    </html>
  );
}
