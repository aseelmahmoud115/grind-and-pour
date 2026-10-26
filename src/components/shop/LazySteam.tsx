"use client";

import dynamic from "next/dynamic";
import { useState, type ComponentProps } from "react";
import type { SteamCanvas as SteamCanvasComponent } from "./SteamCanvas";

const SteamCanvas = dynamic(() => import("./SteamCanvas").then((m) => m.SteamCanvas), { ssr: false });

/** <SteamCanvas>, fetched the first time it's asked to steam (it waits ~390 ms for the wipe anyway). */
export function LazySteam(props: ComponentProps<typeof SteamCanvasComponent>) {
  const [wanted, setWanted] = useState(false);
  // Latch on the first reveal (adjusting state while rendering, React's documented pattern).
  if (props.active && !wanted) setWanted(true);
  return wanted ? <SteamCanvas {...props} /> : null;
}
