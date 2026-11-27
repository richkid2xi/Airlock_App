export interface ApprovalsEnginePort {
  approveEvaluation(evaluationId: string, note?: string): Promise<boolean>
  rejectEvaluation(evaluationId: string, note?: string): Promise<boolean>
}