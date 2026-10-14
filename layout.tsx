import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CIP - AI | VortexCipher",
  description: "Asisten AI CIP - AI, dibuat oleh JAVAS.",
  applicationName: "CIP - AI"
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
