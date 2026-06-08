import './globals.css';

export const metadata = {
  title: 'Canary Token Generator',
  description: 'Active Defense Canary Token Generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
