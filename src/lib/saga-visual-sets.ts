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

const SAGA_VISUAL_SETS: SagaVisualSet[] = [
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

export function listSagaVisualSets(): SagaVisualSet[] {
  return SAGA_VISUAL_SETS.filter((item) => item.active);
}

export function getSagaVisualSet(sagaSlug: string): SagaVisualSet | null {
  const target = String(sagaSlug || "").trim().toLowerCase();
  return listSagaVisualSets().find((item) => item.saga_slug === target) ?? null;
}
