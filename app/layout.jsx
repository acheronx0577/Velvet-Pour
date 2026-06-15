import "./globals.css";

import SmoothScroll from "@/components/SmoothScroll";

export const metadata = {
  title: "Velvet Pour",
  description:
    "A scroll-driven cocktail landing page built with Next.js, GSAP, and Tailwind CSS.",
  icons: {
    icon: "/images/logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
