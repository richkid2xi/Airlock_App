/**
 * Feature gate configuration.
 * Each feature is either 'live' (fully implemented, real data) or 'in_progress' (gated).
 * No mock data is ever shown behind a gate.
 */

export type FeatureName =
  | 'auth'
  | 'onboarding'
  | 'registry'
  | 'evaluation'
  | 'requests'
  | 'approvals'
  | 'chain'
  | 'metrics';

export type FeatureState = 'live' | 'in_progress';

export const FEATURES: Record<FeatureName, FeatureState> = {
  auth: 'live',
  onboarding: 'live',
  registry: 'live',
  evaluation: 'in_progress',
  requests: 'in_progress',
  approvals: 'in_progress',
  chain: 'in_progress',
  metrics: 'in_progress',
} as const;

export function isFeatureLive(feature: FeatureName): boolean {
  return FEATURES[feature] === 'live';
}

export function getFeatureState(feature: FeatureName): FeatureState {
  return FEATURES[feature];
}

export const FEATURE_LABELS: Array<{ key: FeatureName; label: string }> = [
  { key: 'auth', label: 'Authentication' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'registry', label: 'Invoices & Suppliers' },
  { key: 'evaluation', label: 'Evaluation & Attack Lab' },
  { key: 'requests', label: 'Payment requests & Activity' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'chain', label: 'On-chain settlement' },
  { key: 'metrics', label: 'Dashboard metrics' },
];