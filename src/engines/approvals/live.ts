import type { ApprovalsEnginePort } from './types'
import { supabase } from '../../lib/supabase'

const SUPABASE_ANY = supabase as any

export class LiveApprovalsEngine implements ApprovalsEnginePort {
  async approveEvaluation(evaluationId: string, note?: string): Promise<boolean> {
    const result = await SUPABASE_ANY.rpc('approve_evaluation', {
      evaluation_id: evaluationId,
      note: note ?? null,
    })

    if (result.error) {
      throw new Error(`approve_evaluation RPC failed: ${result.error.message ?? String(result.error)}`)
    }

    return true
  }

  async rejectEvaluation(evaluationId: string, note?: string): Promise<boolean> {
    const result = await SUPABASE_ANY.rpc('reject_evaluation', {
      evaluation_id: evaluationId,
      note: note ?? null,
    })

    if (result.error) {
      throw new Error(`reject_evaluation RPC failed: ${result.error.message ?? String(result.error)}`)
    }

    return true
  }
}

export const liveApprovalsEngine = new LiveApprovalsEngine()