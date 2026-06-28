import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Blog",
  description: "A hacker-themed blog platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/static/css/style.css" />
        <link rel="stylesheet" href="/static/css/video_controls.css" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.7/viewer.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.7/viewer.min.js" />
      </body>
    </html>
  );
}
