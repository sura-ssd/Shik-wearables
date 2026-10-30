import { Link, useParams } from "react-router-dom";
import { POLICIES, POLICY_LIST, isPolicySlug } from "../data/policies";
import { SHOP } from "../data/shopInfo";

export function PolicyPage() {
  const { slug } = useParams();

  if (!isPolicySlug(slug)) {
    return (
      <section className="mx-auto max-w-content px-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold tracking-tightest text-ink">We could not find that page</h1>
        <Link className="mt-6 inline-block text-sm font-semibold text-accent underline underline-offset-4" to="/">Back to the shop</Link>
      </section>
    );
  }

  const policy = POLICIES[slug];

  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6 lg:pt-14">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{SHOP.name}</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tightest text-ink">{policy.title}</h1>
      <p className="mt-2 text-xs text-muted">Last updated {SHOP.policiesUpdated}</p>
      <p className="mt-6 text-base leading-7 text-ink">{policy.intro}</p>

      <div className="mt-8 space-y-8">
        {policy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold tracking-tight text-ink">{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p className="mt-3 text-sm leading-7 text-muted" key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-muted marker:text-border">
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm font-semibold text-ink">Questions?</p>
        <p className="mt-1 text-sm text-muted">
          Email <a className="font-semibold text-accent underline-offset-4 hover:underline" href={`mailto:${SHOP.email}`}>{SHOP.email}</a> or call{" "}
          <a className="font-semibold text-accent underline-offset-4 hover:underline" href={`tel:${SHOP.phone.replace(/\s/g, "")}`}>{SHOP.phone}</a>.
        </p>
      </div>

      <nav aria-label="Other policies" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {POLICY_LIST.filter((item) => item.slug !== slug).map((item) => (
          <Link
            className="font-semibold text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            key={item.slug}
            to={`/policies/${item.slug}`}
          >
            {item.title}
          </Link>
        ))}
      </nav>
    </article>
  );
}
