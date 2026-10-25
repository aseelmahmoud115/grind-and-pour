const ROWS = [
  { cups: "1 cup", coffee: 15, water: 250 },
  { cups: "2 cups", coffee: 30, water: 500 },
  { cups: "3 cups", coffee: 45, water: 750 },
];

export function Ratios() {
  return (
    <section id="ratios" aria-labelledby="ratios-title" className="scroll-mt-[var(--nav-h)] bg-cream-light px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow text-roast">Cheat sheet · 1 : 16</p>
        <h2 id="ratios-title" className="font-display mt-3 text-5xl leading-none font-black text-espresso [font-variation-settings:'SOFT'_100,'WONK'_1] sm:text-6xl">
          Ratios
        </h2>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-espresso/10 sm:grid-cols-3">
          {ROWS.map((r) => (
            <li key={r.cups} className="bg-cream-light p-8 sm:p-10">
              <h3 className="eyebrow text-roast">{r.cups}</h3>
              <dl className="mt-6 grid grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm text-roast">Coffee</dt>
                  <dd className="font-display mt-1 text-5xl font-black text-espresso [font-variation-settings:'SOFT'_100]">
                    {r.coffee}
                    <span className="ml-1 text-2xl font-semibold">g</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-roast">Water</dt>
                  <dd className="font-display mt-1 text-5xl font-black text-espresso [font-variation-settings:'SOFT'_100]">
                    {r.water}
                    <span className="ml-1 text-2xl font-semibold">g</span>
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
