"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DeliveryMethod } from "@/lib/money";

export type OrderItem = {
  slug: string;
  name: string;
  image: string;
  variantLabel: string;
  grind: string;
  qty: number;
  unitCents: number;
};

export type Order = {
  /** e.g. GP-7KQ2XD */
  id: string;
  createdAt: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  promo: string | null;
  contact: { email: string; fullName: string; phone: string };
  address: { country: string; city: string; address: string; postalCode?: string };
  delivery: DeliveryMethod;
  payment: "card" | "cod";
  /** Delivery window, ISO dates. */
  estimate: { from: string; to: string };
};

type OrdersState = {
  orders: Order[];
  addOrder: (order: Order) => void;
};

/** Past demo orders on this device only. Card details are never part of an order. */
export const useOrders = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: (order) => set({ orders: [order, ...get().orders] }),
    }),
    { name: "gp-orders", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I lookalikes
export function newOrderId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `GP-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}
