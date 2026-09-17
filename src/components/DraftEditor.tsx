"use client";

import type { PlatformDraft } from "@/lib/types";

const CONDITIONS = [
  "New with tags",
  "New without tags",
  "Like new",
  "Good",
  "Used - Good",
  "Satisfactory",
  "For parts",
];

type Props = {
  label: string;
  accent: string;
  value: PlatformDraft;
  onChange: (next: PlatformDraft) => void;
};

export function DraftEditor({ label, accent, value, onChange }: Props) {
  const set = <K extends keyof PlatformDraft>(key: K, v: PlatformDraft[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Title</span>
          <input
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Description
          </span>
          <textarea
            value={value.description}
            onChange={(e) => set("description", e.target.value)}
            rows={8}
            className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Category
            </span>
            <input
              value={value.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Price (GBP)
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={value.price}
              onChange={(e) => set("price", Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Condition
          </span>
          <select
            value={value.condition}
            onChange={(e) => set("condition", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            {!CONDITIONS.includes(value.condition) && value.condition && (
              <option value={value.condition}>{value.condition}</option>
            )}
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
