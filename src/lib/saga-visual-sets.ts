export type SagaVisualSlot = {
  path: string;
  mime_type: string;
  contexts: string[];
};

export type SagaVisualSet = {
  id: string;
  saga_slug: string;
  display_name: string;
  active: boolean;
  version: number;
  source_of_truth: string;
  slots: Record<string, SagaVisualSlot>;
  rotation_policy: Record<string, string[] | boolean>;
};

const LOCAL_SAGA_VISUAL_SETS: SagaVisualSet[] = [
  {
    id: "baribudos-v1",
    saga_slug: "baribudos",
    display_name: "Baribudos",
    active: true,
    version: 1,
    source_of_truth: "studio",
    slots: {
      hero_video: {
        path: "/media/sagas/baribudos/baribudos-hero-intro-main-20s.mp4",
        mime_type: "video/mp4",
        contexts: ["homepage", "saga_page", "campaign_entry"],
      },
      hero_video_alt: {
        path: "/media/sagas/baribudos/baribudos-hero-intro-alt-13s.mp4",
        mime_type: "video/mp4",
        contexts: ["homepage", "saga_page", "rotation"],
      },
      mobile_teaser: {
        path: "/media/sagas/baribudos/baribudos-mobile-teaser-vertical-5s.mp4",
        mime_type: "video/mp4",
        contexts: ["mobile", "promo", "short_teaser"],
      },
    },
    rotation_policy: {
      hero: ["hero_video", "hero_video_alt"],
      mobile: ["mobile_teaser"],
      cross_saga_mix: false,
    },
  },
];

export function normalizeSagaVisualSet(value: any): SagaVisualSet | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    id: String(value.id || value.visual_set_id || "").trim(),
    saga_slug: String(value.saga_slug || value.sagaSlug || "").trim().toLowerCase(),
    display_name: String(value.display_name || value.displayName || "").trim(),
    active: Boolean(value.active),
    version: Number(value.version || 1),
    source_of_truth: String(value.source_of_truth || value.sourceSystem || "studio").trim() || "studio",
    slots: value.slots && typeof value.slots === "object" ? value.slots : {},
    rotation_policy:
      value.rotation_policy && typeof value.rotation_policy === "object"
        ? value.rotation_policy
        : {},
  };
}

export function listLocalSagaVisualSets(): SagaVisualSet[] {
  return LOCAL_SAGA_VISUAL_SETS.filter((item) => item.active);
}

export function getLocalSagaVisualSet(sagaSlug: string): SagaVisualSet | null {
  const target = String(sagaSlug || "").trim().toLowerCase();
  return listLocalSagaVisualSets().find((item) => item.saga_slug === target) ?? null;
}
