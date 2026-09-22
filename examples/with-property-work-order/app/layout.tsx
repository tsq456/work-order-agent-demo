import type { Metadata, Viewport } from "next";
import { DemoStoreProvider } from "@/lib/demo-store";
import { MyRuntimeProvider } from "@/app/MyRuntimeProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "园区物业工单助手",
  description: "报修对话、工单创建与人员分派",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "物业工单助手",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-dvh">
      <body className="bg-background h-dvh overscroll-none font-sans antialiased">
        <DemoStoreProvider>
          <MyRuntimeProvider>{children}</MyRuntimeProvider>
        </DemoStoreProvider>
      </body>
    </html>
  );
}
