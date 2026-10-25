"use client";

import { useFilm } from "@/components/Film";
import { Drift, MaskLine, Reveal } from "@/components/ScrollMotion";
import { Eyebrow } from "@/components/ui";
import { SUPPORT_DELAY, useSceneRange } from "./choreography";

const STATS = ["15 g coffee", "250 g water", "1 : 16 ratio", "93 °C"];

export function PourCopy() {
  const { film, reduced } = useFilm();
  const pour = useSceneRange(2);

  return (
    <>
      <Reveal value={film} inAt={pour(-0.05, 0.12)} outAt={pour(0.86, 0.98)} reduced={reduced} rise={0} aria-hidden="true" className="scrim pointer-events-none absolute inset-0" />
      <div className="scene-copy">
        <div className="max-w-xl">
          <Reveal value={film} inAt={pour(0.08, 0.22)} outAt={pour(0.82, 0.92)} reduced={reduced}>
            <Eyebrow>03 — Bloom &amp; pour</Eyebrow>
          </Reveal>
          <Drift value={film} range={pour(0, 1)} reduced={reduced}>
            <h2 id="pour-title" className="display mt-4 text-espresso">
              <MaskLine value={film} inAt={pour(0.1, 0.26)} outAt={pour(0.8, 0.92)} reduced={reduced}>
                Pour
              </MaskLine>
            </h2>
          </Drift>
          <Reveal value={film} inAt={pour(0.1, 0.26, SUPPORT_DELAY)} outAt={pour(0.82, 0.94)} reduced={reduced}>
            <p className="body-copy mt-6">
              Heat water to 92–96 °C. Pour 30 g first and let the coffee bloom for 30–40 seconds. Then pour slowly
              in small spirals until you reach 250 g.
            </p>
            <ul className="mt-7 flex flex-wrap gap-2" aria-label="Recipe at a glance">
              {STATS.map((stat, i) => (
                <li key={stat}>
                  {/* One by one, tied to scroll — no timers. */}
                  <Reveal value={film} inAt={pour(0.34, 0.4, i * 0.06)} reduced={reduced} rise={16}>
                    <span className="inline-flex h-10 items-center rounded-full border border-espresso/15 bg-cream-light/90 px-4 text-sm font-medium whitespace-nowrap text-espresso">
                      {stat}
                    </span>
                  </Reveal>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </>
  );
}
