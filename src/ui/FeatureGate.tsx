import { FEATURES, type FeatureName } from '../config/features'
import { InProgress } from './InProgress'

interface FeatureGateProps {
  feature: FeatureName
  children?: React.ReactNode
}

export function FeatureGate({ feature, children }: FeatureGateProps) {
  const isLive = FEATURES[feature] === 'live'

  if (isLive) {
    return <>{children}</>
  }

  return <InProgress module={feature} />
}