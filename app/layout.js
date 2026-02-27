import "./globals.css";
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: "MaplePlan",
  description: "AI Financial Planning Agent for Canadians",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-background-light dark:bg-background-dark text-text-main dark:text-slate-100 min-h-screen">
      <body className="flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
