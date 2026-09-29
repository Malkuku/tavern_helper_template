export const QUEST_CLAIM_REQUEST = 'mag_quest_claim_request';
export const QUEST_CLAIM_RESULT = 'mag_quest_claim_result';

export interface QuestClaimRequest {
  id: string;
  name: string;
  chatId: string;
  messageId: number;
}

export interface QuestClaimResult {
  id: string;
  error?: string;
}
