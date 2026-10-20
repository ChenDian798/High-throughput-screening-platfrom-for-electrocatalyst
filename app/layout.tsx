import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Robotic Single-Line Loading & Sealed Legion Cell Array',
  description: 'Interactive conceptual instrument: single-line robotic loading of a 2 × 3 Legion-style cell array with septum-sealed cells and one potentiostat channel per cell.'
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
