"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { useCart } from "./cart";
import { useOrders } from "./orders";

type UiState = {
  drawerOpen: boolean;
  /** Polite live-region text, e.g. "Added Sky Drift (250 g) to your cart." */
  announcement: string;
  openDrawer: () => void;
  closeDrawer: () => void;
  announce: (text: string) => void;
};

export const useUi = create<UiState>()((set) => ({
  drawerOpen: false,
  announcement: "",
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  // A trailing zero-width space makes repeated identical messages still announce.
  announce: (text) => set((s) => ({ announcement: s.announcement === text ? `${text}​` : text })),
}));

/** Loads the persisted cart and orders once, after the first client render. */
export function StoreHydration() {
  useEffect(() => {
    useCart.persist.rehydrate();
    useOrders.persist.rehydrate();
  }, []);
  return null;
}

const subscribeHydration = (cb: () => void) => {
  const a = useCart.persist.onFinishHydration(cb);
  const b = useOrders.persist.onFinishHydration(cb);
  return () => {
    a();
    b();
  };
};

/** False on the server and until localStorage has been read. */
export function useStoresHydrated() {
  return useSyncExternalStore(
    subscribeHydration,
    () => useCart.persist.hasHydrated() && useOrders.persist.hasHydrated(),
    () => false,
  );
}
