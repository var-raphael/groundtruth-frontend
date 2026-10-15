import SiteNav from "./SiteNav";

// Fill these in once. Both legal pages read from here.
export const LEGAL = {
  product: "Groundtruth",
  operator: "Samuel Raphael",
  email: "samuelraphael925@gmail.com",
  site: "https://ground-truth-app.vercel.app",
  updated: "October 15, 2026",
};

// A string is a paragraph. An array of strings is a bullet list.
export type LegalBlock = string | string[];
export type LegalSection = { title: string; blocks: LegalBlock[] };

export default function LegalLayout({
  label,
  title,
  sections,
}: {
  label: string;
  title: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-24">
        <SiteNav />

        <div className="mb-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-3">{label}</div>
          <h1 className="text-[26px] font-bold tracking-tight mb-2">{title}</h1>
          <p className="font-mono text-[11px] text-white/40">Last updated {LEGAL.updated}</p>
        </div>

        <div className="flex flex-col gap-8">
          {sections.map((s, i) => (
            <section key={s.title}>
              <h2 className="text-[15px] font-semibold mb-3">
                {i + 1}. {s.title}
              </h2>
              <div className="flex flex-col gap-3">
                {s.blocks.map((b, j) =>
                  typeof b === "string" ? (
                    <p key={j} className="text-[13px] text-white/70 leading-relaxed">
                      {b}
                    </p>
                  ) : (
                    <ul key={j} className="flex flex-col gap-2">
                      {b.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-[13px] text-white/70 leading-relaxed">
                          <span className="mt-2 h-1 w-1 rounded-full bg-white/40 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
