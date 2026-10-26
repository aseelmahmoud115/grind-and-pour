"use client";

import { useEffect } from "react";
import { motion, useMotionValue } from "motion/react";
import { useFilm } from "@/components/Film";
import { Drift, MaskLine, Reveal } from "@/components/ScrollMotion";
import { CircleArrowLink, Eyebrow, PillLink } from "@/components/ui";
import { useNavHeight } from "@/lib/hooks";
import { clipRect, frameAt } from "@/lib/timeline";
import { LINE_STAGGER, SUPPORT_DELAY, useSceneRange } from "./choreography";

/**
 * Callout anchors in frame-space px (1248×704), measured on 2-exploded frames
 * 1, 96 and 192. The parts drift upward as the grinder separates, so anchors
 * are interpolated between those keyframes.
 */
const KEYFRAMES = [0, 95, 191];
const CALLOUTS = [
  { label: "Hopper", x: [708, 706, 700], y: [100, 50, 22] },
  { label: "Burr set", x: [668, 668, 668], y: [275, 215, 160] },
  { label: "Motor", x: [702, 702, 702], y: [420, 350, 280] },
  // Below lg the copy sits at the bottom, beside the grounds bin, so this one waits for lg.
  { label: "Grounds", x: [690, 690, 690], y: [590, 590, 590], className: "hidden lg:block" },
];

function interp(frame: number, values: number[]) {
  if (frame <= KEYFRAMES[0]) return values[0];
  for (let k = 1; k < KEYFRAMES.length; k++) {
    if (frame <= KEYFRAMES[k]) {
      const t = (frame - KEYFRAMES[k - 1]) / (KEYFRAMES[k] - KEYFRAMES[k - 1]);
      return values[k - 1] + (values[k] - values[k - 1]) * t;
    }
  }
  return values[values.length - 1];
}

const EXPLODED = 1;

function Callout({ index }: { index: number }) {
  const { film, position, size, reduced, tl } = useFilm();
  const dial = useSceneRange(EXPLODED);
  const c = CALLOUTS[index];
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const clear = useMotionValue(1);
  const navClearance = useNavHeight() + 12;

  // Follow the part through the same cover + camera transform the canvas uses.
  useEffect(() => {
    const update = (v: number) => {
      const frame = frameAt(tl, EXPLODED, v);
      const r = clipRect(tl, EXPLODED, v, size.w, size.h);
      const top = r.y + interp(frame, c.y) * r.scale;
      x.set(r.x + interp(frame, c.x) * r.scale);
      y.set(top);
      // Fade out as the anchor drifts up under the navbar.
      clear.set(Math.min(1, Math.max(0, (top - navClearance) / 24)));
    };
    update(position.get());
    return position.on("change", update);
  }, [position, size, tl, c, x, y, clear, navClearance]);

  return (
    <motion.div className={`absolute top-0 left-0 will-change-transform ${c.className ?? ""}`} style={{ x, y, opacity: clear }}>
      <Reveal value={film} inAt={dial(0.34, 0.4, index * 0.07)} outAt={dial(0.8, 0.88)} reduced={reduced} rise={12}>
        <div className="flex -translate-y-1/2 items-center">
          <span className="size-2 rounded-full bg-espresso ring-4 ring-cream-light/70" />
          <span className="h-px w-14 bg-espresso lg:w-20" />
          <span className="eyebrow rounded-full bg-cream-light/85 px-3 py-1.5 text-espresso">{c.label}</span>
        </div>
      </Reveal>
    </motion.div>
  );
}

export function GrindCopy() {
  const { film, reduced } = useFilm();
  const grind = useSceneRange(0);
  const dial = useSceneRange(EXPLODED);

  return (
    <>
      <Reveal value={film} outAt={dial(0.84, 0.97)} reduced={reduced} rise={0} aria-hidden="true" className="scrim pointer-events-none absolute inset-0" />

      {/* 01 — GRIND (hero): visible on arrival, slides out as the grinder fills. */}
      <div className="scene-copy">
        <div className="max-w-xl">
          <Reveal value={film} outAt={grind(0.6, 0.72, SUPPORT_DELAY)} reduced={reduced}>
            <Eyebrow>01 — Grind</Eyebrow>
          </Reveal>
          {/* The hero is already in on arrival, so its drift is centred there (0 → +3vw as it leaves). */}
          <Drift value={film} range={grind(-1, 1)} reduced={reduced}>
            <h1 id="grind-title" className="display mt-4 text-espresso phone:mt-2 phone:flex phone:flex-wrap phone:gap-x-[0.2em]">
              <MaskLine value={film} outAt={grind(0.6, 0.76)} reduced={reduced}>
                Grind
              </MaskLine>
              <MaskLine value={film} outAt={grind(0.6, 0.76, LINE_STAGGER)} reduced={reduced} className="whitespace-nowrap text-terracotta">
                <span className="mr-[0.08em] inline-block align-[0.32em] text-[0.55em]">&amp;</span>Pour
              </MaskLine>
            </h1>
          </Drift>
          <Reveal value={film} outAt={grind(0.62, 0.78, SUPPORT_DELAY)} reduced={reduced}>
            <p className="body-copy mt-6 phone:mt-3">
              Start with 15 g of freshly roasted whole beans. Grind them medium-fine, like coarse sea salt, right
              before you brew.
            </p>
            <div className="mt-8 flex items-center gap-3 phone:mt-4">
              <PillLink href="#dial-in">Start brewing</PillLink>
              <CircleArrowLink href="#dial-in" label="Scroll to the next step" />
            </div>
          </Reveal>
        </div>
      </div>

      {/* 02 — DIAL IN */}
      <div className="scene-copy">
        <div className="max-w-xl">
          <Reveal value={film} inAt={dial(0.1, 0.24)} outAt={dial(0.82, 0.92)} reduced={reduced}>
            <Eyebrow>02 — Dial in</Eyebrow>
          </Reveal>
          <Drift value={film} range={dial(0, 1)} reduced={reduced}>
            <h2 id="dial-in-title" className="display mt-4 flex flex-wrap gap-x-[0.25em] text-espresso phone:mt-2 lg:block">
              <MaskLine value={film} inAt={dial(0.12, 0.28)} outAt={dial(0.8, 0.92)} reduced={reduced}>
                Dial
              </MaskLine>
              <MaskLine value={film} inAt={dial(0.12, 0.28, LINE_STAGGER)} outAt={dial(0.8, 0.92, LINE_STAGGER)} reduced={reduced}>
                in
              </MaskLine>
            </h2>
          </Drift>
          <Reveal value={film} inAt={dial(0.12, 0.28, SUPPORT_DELAY)} outAt={dial(0.82, 0.94)} reduced={reduced}>
            <p className="body-copy mt-6 phone:mt-3">
              Steel burrs crush the beans evenly, so every particle extracts at the same pace. Go finer for a
              stronger, heavier cup; go coarser for a brighter, lighter one.
            </p>
          </Reveal>
        </div>
      </div>

      <div aria-hidden="true" className="absolute inset-0 hidden md:block">
        {CALLOUTS.map((c, i) => (
          <Callout key={c.label} index={i} />
        ))}
      </div>
    </>
  );
}
