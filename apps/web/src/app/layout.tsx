import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/common/providers';
export const metadata: Metadata = {
  title: 'Continuum Mission Control',
  description: 'ARES-7 persistent mission intelligence',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-space text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
