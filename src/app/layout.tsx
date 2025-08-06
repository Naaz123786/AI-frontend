import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Interview AI - Master Your Next Interview",
  description: "Get instant, intelligent answers to any interview question. Practice with voice or text, powered by advanced AI technology.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          {children}
          {process.env.NODE_ENV === 'development' && (
            <div>
              <script src="https://unpkg.com/@supabase/supabase-js@2" />
            </div>
          )}
        </AuthProvider>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Remove Next.js development indicators completely - AGGRESSIVE MODE
            function removeNextDevIndicators() {
              // Target ALL possible Next.js dev indicators
              const selectors = [
                '[data-nextjs-build-indicator]',
                '[data-nextjs-build-activity]',
                '.__next-build-watcher',
                '.__next-dev-overlay',
                'div[style*="position: fixed"][style*="right: 16px"][style*="bottom: 16px"]',
                'div[style*="position: fixed"][style*="right"][style*="bottom"]',
                'div[style*="position: fixed"][style*="bottom: 16px"]',
                'button[style*="position: fixed"][style*="border-radius: 50%"]',
                'button[aria-label*="build"]',
                'button[title*="build"]',
                'button[style*="width: 40px"][style*="height: 40px"]',
                'button[style*="width: 48px"][style*="height: 48px"]',
                'button[style*="background: black"]',
                'button[style*="background: rgb(0, 0, 0)"]'
              ];
              
              selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => el.remove());
              });
              
              // Remove any fixed position elements that contain 'N' text
              const allFixed = document.querySelectorAll('*[style*="position: fixed"]');
              allFixed.forEach(el => {
                const text = el.textContent?.trim();
                if (text === 'N' || text === 'n') {
                  el.remove();
                }
                
                // Check if it has a button child with 'N'
                const buttons = el.querySelectorAll('button');
                buttons.forEach(btn => {
                  if (btn.textContent?.trim() === 'N' || btn.textContent?.trim() === 'n') {
                    el.remove();
                  }
                });
              });
              
              // Remove any button that contains only 'N' and is positioned
              const allButtons = document.querySelectorAll('button');
              allButtons.forEach(btn => {
                const text = btn.textContent?.trim();
                const parent = btn.parentElement;
                if ((text === 'N' || text === 'n') && parent) {
                  const parentStyle = window.getComputedStyle(parent);
                  if (parentStyle.position === 'fixed' || parentStyle.position === 'absolute') {
                    parent.remove();
                  }
                }
              });
            }
            
            // Run immediately and aggressively
            removeNextDevIndicators();
            
            // Run after DOM loads
            document.addEventListener('DOMContentLoaded', removeNextDevIndicators);
            
            // Run very frequently to catch dynamically added indicators
            setInterval(removeNextDevIndicators, 100);
          `
        }} />
      </body>
    </html>
  );
}
