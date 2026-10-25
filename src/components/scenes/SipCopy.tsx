"use client";

import { useFilm } from "@/components/Film";
import { Drift, MaskLine, Reveal } from "@/components/ScrollMotion";
import { Eyebrow } from "@/components/ui";
import { SUPPORT_DELAY, useSceneRange } from "./choreography";

export function SipCopy() {
  const { film, reduced } = useFilm();
  const sip = useSceneRange(3);

  // Sip's segment is followed by the fade to cream; the copy leaves with it (f > 1).
  return (
    <>
      <Reveal value={film} inAt={sip(-0.05, 0.14)} outAt={sip(1, 1.16)} reduced={reduced} rise={0} aria-hidden="true" className="scrim-strong pointer-events-none absolute inset-0" />
      <div className="scene-copy scene-copy-top">
        <div className="max-w-md">
          <Reveal value={film} inAt={sip(0.1, 0.24)} outAt={sip(1, 1.12)} reduced={reduced}>
            <Eyebrow>04 — Sip</Eyebrow>
          </Reveal>
          <Drift value={film} range={sip(0, 1.19)} reduced={reduced}>
            <h2 id="sip-title" className="display mt-4 text-espresso">
              <MaskLine value={film} inAt={sip(0.12, 0.28)} outAt={sip(1, 1.14)} reduced={reduced}>
                Sip
              </MaskLine>
            </h2>
          </Drift>
          <Reveal value={film} inAt={sip(0.12, 0.28, SUPPORT_DELAY)} outAt={sip(1.02, 1.16)} reduced={reduced}>
            <p className="body-copy mt-6">
              Total brew time: 2:30 to 3:30. Swirl the server, let it cool for a minute, and taste. Too bitter?
              Grind coarser. Too sour? Grind finer.
            </p>
          </Reveal>
        </div>
      </div>
    </>
  );
}
