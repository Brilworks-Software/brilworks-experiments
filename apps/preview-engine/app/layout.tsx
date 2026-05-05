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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
