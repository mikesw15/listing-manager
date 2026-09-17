import type { PlatformDraft } from "./types";

export function mockDrafts(notes?: string): {
  facebook: PlatformDraft;
  vinted: PlatformDraft;
} {
  const hint = notes?.trim()
    ? notes.trim().slice(0, 80)
    : "Item from photos";

  return {
    facebook: {
      title: `${hint} — Facebook Marketplace`,
      description: [
        `Selling: ${hint}`,
        "",
        "Condition as shown in photos. Happy to answer questions.",
        "Collection preferred; postage available at cost.",
        "",
        "(Demo draft — n8n webhook not configured)",
      ].join("\n"),
      category: "Goods",
      price: 25,
      condition: "Used - Good",
      currency: "GBP",
    },
    vinted: {
      title: `${hint}`.slice(0, 80),
      description: [
        hint,
        "",
        "From a smoke-free home. Bundle discounts available.",
        "Postage via Royal Mail / Evri.",
        "",
        "(Demo draft — n8n webhook not configured)",
      ].join("\n"),
      category: "Other",
      price: 22,
      condition: "Good",
      currency: "GBP",
    },
  };
}
