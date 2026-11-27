export interface DashboardMetrics {
  suppliers_by_status: Record<string, number>
  invoice_counts_by_status: Record<string, { count: number; total_minor: number }>
  today_requests_by_decision: Record<string, number>
  blocked_count: number
  held_count: number
  receipts_issued: number
  amount_authorized_today_minor: string
  daily_cap_minor: string
  last_evaluations: Array<{
    evaluation_id: string
    invoice_id: string
    agent_id: string
    decision: string
    status: string
    evaluated_at: string
  }>
}

export interface MetricsEnginePort {
  getDashboardMetrics(): Promise<DashboardMetrics>
}

export interface MetricsEngineError {
  code: 'not_found' | 'unauthorized' | 'forbidden' | 'network' | 'validation'
  message: string
}