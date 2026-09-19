'use client';

import { useActionState, useState } from "react";
import type { BuilderState } from "./actions";
import { saveStoreBuilder } from "./actions";

const DEFAULT_SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "featured_products", label: "Featured products" },
  { id: "about", label: "About" },
  { id: "faq", label: "FAQ" },
] as const;

export default function BuilderForm({
  storeId,
  initial,
}: {
  storeId: string;
  initial: {
    name: string;
    description: string;
    heroTitle: string;
    heroSubtitle: string;
    announcement: string;
    preset: string;
    accent: string;
    sections: string[];
  };
}) {
  const [state, action, pending] = useActionState<BuilderState, FormData>(saveStoreBuilder, {});
  const [sections, setSections] = useState(
    DEFAULT_SECTIONS.map((section) => ({
      ...section,
      enabled: initial.sections.includes(section.id),
    })),
  );

  function move(index: number, direction: -1 | 1) {
    const next = [...sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
  }

  function toggle(index: number) {
    setSections((current) => current.map((section, i) => i === index
      ? { ...section, enabled: !section.enabled }
      : section
    ));
  }

  const serialized = JSON.stringify(sections.filter((section) => section.enabled).map((section) => section.id));

  return (
    <form action={action} className="store-form builder-form">
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="sections" value={serialized} />

      <div className="form-section-title">Store identity</div>
      <div className="form-grid">
        <label>
          <span>Store name</span>
          <input name="store_name" defaultValue={initial.name} maxLength={80} required />
        </label>
        <label>
          <span>Theme preset</span>
          <select name="preset" defaultValue={initial.preset}>
            <option value="aura">Aura</option>
            <option value="minimal">Minimal</option>
            <option value="noir">Noir</option>
            <option value="editorial">Editorial</option>
          </select>
        </label>
      </div>

      <label>
        <span>Store description</span>
        <textarea name="description" rows={4} defaultValue={initial.description} maxLength={500} />
      </label>

      <div className="form-section-title">Hero & announcement</div>
      <div className="form-grid">
        <label>
          <span>Hero title</span>
          <input name="hero_title" defaultValue={initial.heroTitle} maxLength={120} />
        </label>
        <label>
          <span>Accent color</span>
          <input name="accent" type="text" defaultValue={initial.accent} pattern="#[0-9a-fA-F]{6}" maxLength={7} />
        </label>
      </div>
      <label>
        <span>Hero subtitle</span>
        <textarea name="hero_subtitle" rows={4} defaultValue={initial.heroSubtitle} maxLength={240} />
      </label>
      <label>
        <span>Announcement bar</span>
        <input name="announcement" defaultValue={initial.announcement} placeholder="Free delivery this week" maxLength={180} />
      </label>

      <div className="form-section-title">Homepage sections</div>
      <p className="checkout-note">Enable sections and arrange their order. This configuration is stored per store, not globally.</p>
      <div className="builder-section-list">
        {sections.map((section, index) => (
          <div className={section.enabled ? "builder-section-row active" : "builder-section-row"} key={section.id}>
            <div>
              <strong>{section.label}</strong>
              <small>{section.enabled ? "Visible" : "Hidden"}</small>
            </div>
            <div className="builder-section-actions">
              <button type="button" className="button" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
              <button type="button" className="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1}>↓</button>
              <button type="button" className="button" onClick={() => toggle(index)}>
                {section.enabled ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      {state.success && <div className="alert success" role="status">{state.success}</div>}

      <button className="button primary auth-submit" type="submit" disabled={pending}>
        {pending ? "Publishing storefront…" : "Save storefront"}
      </button>
    </form>
  );
}
