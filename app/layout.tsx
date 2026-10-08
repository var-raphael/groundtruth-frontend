import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ASSET_V } from "@/lib/asset-version";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const SITE_NAME = "groundtruth";
const TITLE = "groundtruth: verify developer candidates with real GitHub evidence";
const DESCRIPTION =
  "Groundtruth reads a candidate's GitHub, checks what's actually real, and gives you a ranked, evidence-backed report for every role. Hire on verified work, not resumes.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "developer hiring",
    "GitHub candidate screening",
    "verify engineering candidates",
    "technical recruiting tool",
    "proof of work hiring",
    "evidence-based hiring",
    "resume alternative",
    "GitHub activity analysis",
    "engineer screening",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: `/favicon.ico?v=${ASSET_V}`, sizes: "any" },
      { url: `/icon.png?v=${ASSET_V}`, type: "image/png" },
    ],
    apple: [{ url: `/apple-icon.png?v=${ASSET_V}` }],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      { url: `/opengraph-image.png?v=${ASSET_V}`, width: 1200, height: 630, alt: TITLE },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`/opengraph-image.png?v=${ASSET_V}`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
  colorScheme: "dark",
};

// Structured data: tells search engines and LLM crawlers what groundtruth is,
// who it's for, and what it costs, in a machine-readable way.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo-transparent.png?v=${ASSET_V}`,
      description: DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: SITE_NAME,
      url: SITE_URL,
      image: `${SITE_URL}/opengraph-image.png?v=${ASSET_V}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Hiring tool that reads a candidate's GitHub activity, verifies repos, deployments and open-source contributions, and generates a ranked report where every claim traces back to evidence. Candidates are scored per role on stack match, evidence strength, contributions and an AI review.",
      audience: {
        "@type": "Audience",
        audienceType: "Engineering teams, hiring managers and technical recruiters",
      },
      featureList: [
        "Verifies candidates against real GitHub activity",
        "Scores each candidate per job on a 0-10 scale",
        "Every score traces back to commits, deployments and contributions",
        "Flags dead links and unverifiable claims instead of hiding them",
        "AI-drafted outreach emails",
        "Candidate export to JSON, CSV, Excel and PDF",
      ],
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "59",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "59",
            priceCurrency: "USD",
            unitText: "MONTH",
          },
        },
      ],
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}
