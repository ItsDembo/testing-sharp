// client/src/lib/featureFlags.ts
export const FEATURE_FLAGS = {
  STRICT_STATUS_LABELS:
    (import.meta.env.STRICT_STATUS_LABELS as string) === 'true' ||
    import.meta.env.NODE_ENV === 'development',
  NEW_TERMINAL: (import.meta.env.VITE_NEW_TERMINAL as string) === 'true'
} as const;

export function validateStrictStatusLabels() {
  if (!FEATURE_FLAGS.STRICT_STATUS_LABELS) return;
  
  console.info('[FEATURE-FLAG] STRICT_STATUS_LABELS enabled - enforcing truthStatus-only labeling');
}