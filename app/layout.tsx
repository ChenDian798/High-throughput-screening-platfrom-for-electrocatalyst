import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Robotic Single-Line Loading & Shared-Electrode Reactor',
  description: 'Interactive conceptual instrument for sequential loading and shared electrode contact.'
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
