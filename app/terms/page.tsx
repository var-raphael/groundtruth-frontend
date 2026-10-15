import LegalLayout, { LEGAL, LegalSection } from "../components/LegalLayout";

export const metadata = { title: "Terms of Service | Groundtruth" };

const SECTIONS: LegalSection[] = [
  {
    title: "Who we are",
    blocks: [
      `${LEGAL.product} (“we”, “us”) is operated by ${LEGAL.operator}. These Terms govern your use of ${LEGAL.site} and our API (the “Service”). By using the Service you agree to them. If you don’t agree, please don’t use it.`,
    ],
  },
  {
    title: "What Groundtruth does",
    blocks: [
      "Groundtruth helps recruiters evaluate software engineers. A recruiter creates a job and shares an apply link. Candidates apply with GitHub. We analyze the candidate’s public GitHub activity, score it against the role using automated tools, including AI models, and show the recruiter a ranked report with links to the evidence behind each point.",
    ],
  },
  {
    title: "Accounts",
    blocks: [
      [
        "Recruiters sign in with Google. You are responsible for your account and everything done through it.",
        "You must be at least 18 years old and give us accurate information.",
        "Candidates don’t need a Groundtruth account. They apply by connecting GitHub.",
      ],
    ],
  },
  {
    title: "Plans and payment",
    blocks: [
      "We offer a Free plan and a paid Pro plan. Plan limits are shown on our pricing page, and we may change them with reasonable notice.",
      [
        "Pro is billed monthly. The price is listed in US dollars ($59 per month) and charged in Nigerian naira through Paystack. The naira amount shown is an approximation, and your bank may apply its own exchange rate.",
        "Pro renews automatically until you cancel. You can cancel at any time from the pricing page, and Pro stays active until the end of the period you paid for.",
        "Cancellation and refunds are covered in the next section.",
        "We will give you at least 30 days’ notice before a price change takes effect on your next renewal.",
        "Payments are processed by Paystack. We never see or store your full card number.",
      ],
    ],
  },
  {
    title: "Cancellation and refunds",
    blocks: [
      "If you cancel:",
      [
        "You can cancel at any time from the pricing page. We make no further charges after you cancel.",
        "Pro stays active until the end of the period you already paid for. After that, your account moves to the Free plan and its limits apply again.",
        "Your existing jobs and reports are kept.",
        "Cancelling does not by itself refund the current period.",
      ],
      "If you ask for a refund:",
      [
        "First payment: if you ask within 7 days of your first Pro payment, we will refund it in full.",
        "Renewals: we refund a renewal if we charged you in error, if you were charged after cancelling, or if the law requires it. Otherwise, cancel before your renewal date to avoid the charge.",
        "Refunds go back to the card you paid with, through Paystack, in the naira amount you were charged. Banks usually take 5 to 10 business days to show it, and your bank’s exchange rate may make the amount differ from the dollar price.",
        "When we refund a payment, the Pro access that payment covered ends.",
        `To ask, email ${LEGAL.email} from the address on your account and include the date of the charge. We reply within 5 business days.`,
      ],
      "Nothing here limits any rights you have as a consumer under the law where you live.",
    ],
  },
  {
    title: "Acceptable use by recruiters",
    blocks: [
      "If you use Groundtruth to evaluate candidates, you agree to the following.",
      [
        "Use reports only to evaluate candidates for the role they applied to.",
        "Follow the employment, anti-discrimination and data protection laws that apply to you. Don’t use reports to treat people unfairly because of a protected characteristic.",
        "Don’t reject a candidate solely because of a score. A person should review each decision.",
        "Don’t scrape or overload the Service, reverse engineer it, resell it, share your account, or work around plan limits.",
        "Use outreach drafts responsibly. Don’t send spam or harassing messages, and follow the email and anti-spam laws that apply to you.",
      ],
    ],
  },
  {
    title: "Candidates",
    blocks: [
      "By applying to a job, you ask us to analyze your public GitHub activity and to share the resulting report, along with your application details, with the recruiter who posted the job and anyone they share the report with. You can ask us to delete your data at any time. See our Privacy Policy for how.",
    ],
  },
  {
    title: "Scores and AI output",
    blocks: [
      "Scores, rankings and written reasons are generated automatically from public data and AI models. They can be incomplete, out of date or wrong, and public GitHub activity does not capture everything a person can do. Reports support a recruiter’s judgement and are not a hiring decision. You are responsible for the decisions you make. If you think a report about you is wrong, contact us and we will review it.",
    ],
  },
  {
    title: "Share links and public pages",
    blocks: [
      "A share link gives anyone who has it access to that report, so keep links private. You can revoke a link at any time. Public job pages and showcase reports can be seen by anyone.",
    ],
  },
  {
    title: "Content and ownership",
    blocks: [
      "You keep ownership of the content you submit. You give us a licence to host and process it so we can run the Service. Groundtruth, its code, branding and scoring methods belong to us. Public GitHub data stays with its owners, and we use it in line with GitHub’s terms.",
    ],
  },
  {
    title: "Third-party services",
    blocks: [
      "The Service relies on third parties such as GitHub, Google, Supabase, Paystack and AI model providers. Their own terms apply to their services, and we are not responsible for them.",
    ],
  },
  {
    title: "Availability and changes to the Service",
    blocks: [
      "We work to keep the Service running, but we don’t promise it will always be available or error-free. We may change, limit or stop features at any time.",
    ],
  },
  {
    title: "Suspension and ending your use",
    blocks: [
      "You can stop using the Service at any time. We may suspend or end your access if you break these Terms, misuse the Service, or put it or other people at risk. Sections that by their nature should continue after that point, such as ownership, disclaimers and liability, will continue.",
    ],
  },
  {
    title: "Disclaimers",
    blocks: [
      "The Service is provided “as is” and “as available”. To the extent the law allows, we give no warranty that reports are accurate or complete, or that the Service is suited to a particular purpose.",
    ],
  },
  {
    title: "Limit of liability",
    blocks: [
      "To the extent the law allows, we are not liable for indirect or consequential losses, lost profits, or hiring decisions made using a report. Our total liability for any claim is limited to the greater of the amount you paid us in the 12 months before the claim or USD 50. Nothing in these Terms limits liability that cannot be limited by law.",
      "You agree to cover claims that arise from your misuse of the Service or your breach of these Terms or the law.",
    ],
  },
  {
    title: "Changes to these Terms",
    blocks: [
      "We may update these Terms. For material changes we will notify you by email or on the site at least 14 days before they take effect. If you keep using the Service after that, you accept the new Terms.",
    ],
  },
  {
    title: "Governing law",
    blocks: [
      "These Terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Lagos State have jurisdiction. If you are a consumer, you keep any mandatory rights you have under the law of the country where you live.",
    ],
  },
  {
    title: "Contact",
    blocks: [`Questions about these Terms? Email ${LEGAL.email}.`],
  },
];

export default function TermsPage() {
  return <LegalLayout label="terms" title="Terms of Service" sections={SECTIONS} />;
}
