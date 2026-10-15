import LegalLayout, { LEGAL, LegalSection } from "../components/LegalLayout";

export const metadata = { title: "Privacy Policy | Groundtruth" };

const SECTIONS: LegalSection[] = [
  {
    title: "Who we are",
    blocks: [
      `${LEGAL.operator} operates ${LEGAL.product} and is responsible for the personal data described in this policy. It covers recruiters, candidates and visitors to ${LEGAL.site}. Contact us at ${LEGAL.email}.`,
    ],
  },
  {
    title: "What we collect",
    blocks: [
      "Recruiters:",
      [
        "Your Google account name, email address and account ID when you sign in.",
        "The jobs you create, and your plan and billing status (Paystack customer and subscription references and your card brand, but never your full card number).",
        "How you use the Service, such as scans, rescans, exports and outreach drafts, so we can apply plan limits and prevent abuse.",
      ],
      "Candidates:",
      [
        "What you give us when you apply: name, email, GitHub username and ID, country, city, time zone, years of experience you claim, and links such as X or a portfolio.",
        "Public GitHub data we read: your profile, public repositories, languages, commit activity, README files, file names, releases, merged pull requests to other projects, and whether linked live sites are online.",
        "What we generate: scores, rankings, written reasons, evidence links and outreach drafts.",
      ],
      "Everyone:",
      [
        "Technical data such as IP address and browser details in server logs, and a sign-in session stored on your device.",
      ],
    ],
  },
  {
    title: "How we use it",
    blocks: [
      [
        "To run the Service: sign you in, scan public GitHub activity, score candidates against a role and show reports to recruiters.",
        "To process payments and manage subscriptions.",
        "To keep the Service secure, apply rate limits and prevent abuse.",
        "To fix problems and improve the Service.",
        "To send account and billing messages.",
        "To meet legal obligations.",
      ],
      "Where the law requires a legal basis, we rely on performing our contract with you, our legitimate interests in running and securing the Service, your consent (for example when a candidate applies), and legal obligations.",
    ],
  },
  {
    title: "Automated scoring and human review",
    blocks: [
      "Candidate reports are produced with automated analysis, including AI models. They are meant to support a recruiter’s judgement and not to replace it. Candidates can ask for a report about them to be corrected or reviewed by a person.",
    ],
  },
  {
    title: "Who we share it with",
    blocks: [
      [
        "The recruiter who posted the job, and anyone they share a report link with.",
        "Service providers that help us run Groundtruth: Supabase (database and sign-in), Render (backend hosting), Vercel (website hosting), Mistral AI (AI analysis of public GitHub evidence), Paystack (payments), and Google and GitHub (sign-in and public data).",
        "Authorities or other parties where the law requires it, or in a sale or restructuring of the business.",
      ],
      "We do not sell personal data and we do not share it for advertising.",
    ],
  },
  {
    title: "Where data is processed",
    blocks: [
      "Our database is hosted in Ireland. Other providers may process data in other countries, including the United States. Where required, we rely on safeguards such as standard contractual clauses.",
    ],
  },
  {
    title: "How long we keep it",
    blocks: [
      [
        "Recruiter account data: while your account is active.",
        "Jobs, candidate data and reports: until the recruiter deletes the job, or until we delete them on request.",
        "Billing records: as long as accounting and tax rules require.",
        "Server logs: for a short period.",
      ],
      "When we delete data, it leaves our active systems within 30 days and drops out of backups as they roll over.",
    ],
  },
  {
    title: "Your rights",
    blocks: [
      `You can ask us to give you access to your data, correct it, delete it, restrict or object to how we use it, move it to another service, or withdraw consent. Email ${LEGAL.email} and we will reply within 30 days. If you are a candidate and want your data and any report about you removed, just ask.`,
      "If you are in Nigeria, the EU or the UK, you also have the right to complain to your data protection authority, such as the Nigeria Data Protection Commission.",
    ],
  },
  {
    title: "Candidates who didn’t apply directly",
    blocks: [
      "Sometimes a report is created from a public GitHub profile without the person applying, for example a demo or showcase. We use only public information in those cases. If that is you, contact us and we will remove it.",
    ],
  },
  {
    title: "Cookies and local storage",
    blocks: [
      "We use only what is needed to keep you signed in. We do not use advertising cookies or third-party ad trackers. If we add analytics, we will update this policy.",
    ],
  },
  {
    title: "Security",
    blocks: [
      "We use encrypted connections, encrypt sensitive secrets we store, and limit who can access data. No system is perfectly secure, so we can’t guarantee absolute security.",
    ],
  },
  {
    title: "Children",
    blocks: [
      "Groundtruth is not for anyone under 18, and we do not knowingly collect their data. If you think a child has given us data, contact us and we will delete it.",
    ],
  },
  {
    title: "Changes to this policy",
    blocks: [
      "We may update this policy. We will change the date above and, for material changes, notify you by email or on the site.",
    ],
  },
  {
    title: "Contact",
    blocks: [`Questions or requests? Email ${LEGAL.email}.`],
  },
];

export default function PrivacyPage() {
  return <LegalLayout label="privacy" title="Privacy Policy" sections={SECTIONS} />;
}
