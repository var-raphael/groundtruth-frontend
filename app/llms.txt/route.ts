import { getAllPosts } from "@/lib/blog";

// Place at app/llms.txt/route.ts, served at /llms.txt.
// A plain-text summary written for LLMs and AI search tools.

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

const posts = getAllPosts();

const blogSection = posts.length
  ? `\n- [Blog](${SITE_URL}/blog): articles on verifying developer candidates and evidence-based hiring.\n\n## Blog posts\n\n${posts
      .map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.description}`)
      .join("\n")}\n`
  : "";

const body = `# groundtruth

> Groundtruth is a hiring tool for engineering teams. It reads a candidate's GitHub activity, checks what is actually real, and produces a ranked report for each role where every line traces back to evidence. It replaces guessing from resumes.

## What it does

- Candidates apply by connecting GitHub. There is no resume. GitHub is the one source that can be verified against real commit history, repo activity and contributions.
- Groundtruth checks repos are not forks or abandoned pushes, looks for live deployments and releases, and counts merged pull requests to third-party open-source projects.
- Each candidate is scored 0-10 per job, not once for everyone. The score combines stack match, evidence strength, open-source contributions and an AI review. The same evidence can score differently for a backend role and a UI role.
- Private repositories cannot be verified, so they contribute nothing to the score. They are shown for transparency but never move the number up or down.
- Dead links and unverifiable claims are flagged, not hidden.
- It does not replace interviews. It replaces the time spent guessing whether a resume deserves a reply.

## Who it is for

Engineering teams, hiring managers and technical recruiters who receive many similar-looking, AI-polished applications and need a way to tell which candidates have real work behind them.

## Pricing

- Free: $0. 1 job, 20 candidates per job, 3 candidate rescans, 3 outreach drafts, JSON and CSV export.
- Pro: $59 per month. 4 jobs, 100 candidates per job, unlimited rescans, unlimited outreach drafts, JSON, CSV, Excel and PDF export.
- Checkout is processed in Nigerian naira, which is the conversion of the USD price.

## Pages

- [Home](${SITE_URL}/): what groundtruth is, how it works, and FAQs.
- [Pricing](${SITE_URL}/pricings): Free and Pro plans.${blogSection}`;

export function GET() {
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
