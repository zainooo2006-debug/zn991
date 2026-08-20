import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/layout/Shell";
import { Target, Heart, Users } from "lucide-react";
import { useSiteContentValue } from "@/lib/site-content";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — زين" },
      { name: "description", content: "زين - مركز متكامل للعناية بالسيارات في صنعاء يقدم خدمات احترافية وقطع وإكسسوارات أصلية." },
      { property: "og:title", content: "من نحن — زين" },
      { property: "og:description", content: "زين - مركز متكامل للعناية بالسيارات في صنعاء يقدم خدمات احترافية وقطع وإكسسوارات أصلية." },
      { property: "og:url", content: "https://zn991.lovable.app/about" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const c = useSiteContentValue("about_page");
  return (
    <Shell>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-black">من نحن</h1>
        <p className="text-[var(--color-ink-soft)] mt-4 leading-loose">
          <span className="font-bold text-[var(--color-gold)]">زين</span> {c.intro1}
        </p>
        <p className="text-[var(--color-ink-soft)] mt-4 leading-loose">
          {c.intro2}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          {[
            { Icon: Target, t: c.missionTitle, d: c.missionText },
            { Icon: Heart, t: c.valuesTitle, d: c.valuesText },
            { Icon: Users, t: c.teamTitle, d: c.teamText },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="card-clean p-5">
              <Icon className="w-7 h-7 text-[var(--color-gold)]" />
              <h3 className="font-bold mt-3">{t}</h3>
              <p className="text-sm text-[var(--color-ink-soft)] mt-1">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
