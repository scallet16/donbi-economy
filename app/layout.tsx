import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "돈비경제 쉬운 경제 사전 Beta v0.9",
  description: "돈비와 함께 쉽고 즐겁게 배우는 경제 어휘 학습",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
