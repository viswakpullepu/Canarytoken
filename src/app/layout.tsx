import './globals.css';
import { Share_Tech_Mono } from 'next/font/google';

const hackerFont = Share_Tech_Mono({ subsets: ['latin'], weight: '400' });

export const metadata = {
  title: 'Canary Token Generator | SYSTEM.ROOT',
  description: 'Active Defense Canary Token Generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${hackerFont.className} antialiased`}>
        <div className="scanlines"></div>
        <div className="matrix-bg"></div>
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
