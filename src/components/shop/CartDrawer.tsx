"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useUi } from "@/store/ui";

const CartDrawerPanel = dynamic(() => import("./CartDrawerPanel").then((m) => m.CartDrawerPanel), { ssr: false });

/** The cart drawer: its panel's code loads the first time the drawer opens, then stays mounted. */
export function CartDrawer() {
  const open = useUi((s) => s.drawerOpen);
  const announcement = useUi((s) => s.announcement);
  const [wanted, setWanted] = useState(false);
  // Latch on the first open (adjusting state while rendering, React's documented pattern).
  if (open && !wanted) setWanted(true);

  return (
    <>
      {/* Always mounted, so additions are announced even while the drawer loads and animates in. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {wanted && <CartDrawerPanel />}
    </>
  );
}
