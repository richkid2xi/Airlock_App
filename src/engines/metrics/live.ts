import type { DashboardMetrics, MetricsEnginePort } from './types'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''

export class LiveMetricsEngine implements MetricsEnginePort {
  private supa: ReturnType<typeof createClient>

  constructor() {
    this.supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const { data, error } = await this.supa.rpc('get_dashboard_metrics')

    if (error || !data) {
      throw new Error('Dashboard data could not be loaded')
    }

    const metrics = data as DashboardMetrics

    // Ensure numeric strings even if RPC returned empty/invalid shapes
    if (!metrics.amount_authorized_today_minor) {
      metrics.amount_authorized_today_minor = '0'
    }
    if (!metrics.daily_cap_minor) {
      metrics.daily_cap_minor = '0'
    }

    return metrics
  }
}

export const liveMetricsEngine = new LiveMetricsEngine()