import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import SyncAgent from "@/components/SyncAgent";

export const metadata: Metadata = {
  title: "Anywhere Strength",
  description: "Guided dumbbell & kettlebell strength training — at home or on the road.",
  appleWebApp: { capable: true, title: "Anywhere", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1115",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SyncAgent />
        <main>{children}</main>
        <Nav />
      </body>
    </html>
  );
}
