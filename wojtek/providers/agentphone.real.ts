import type { AgentPhoneProvider } from "./types";

/**
 * REAL AgentPhone adapter — not yet implemented.
 *
 * To wire up (per YCHack brief tips):
 *   1. Use AgentPhone in WEBHOOK mode (not hosted) — more capabilities, harnesses
 *   2. Stream the transcript — translate each transcript event into a
 *      { type: 'transcript', chunk: { speaker, text, ts } } CallChunk yielded here
 *   3. Detect negotiated discount from the transcript / harness and yield
 *      { type: 'discount', percent }
 *   4. Env: AGENTPHONE_API_KEY, AGENTPHONE_WEBHOOK_URL
 *   5. Recommended: use Moss for retrieval on large data
 *      → https://github.com/usemoss/moss/tree/main/examples/cookbook/agentphone
 *   6. Task prompt should explicitly push for negotiation:
 *      "Your task is to negotiate the BEST possible price for the listing.
 *       Be friendly but firm. Mention slow season / multi-night stay / cash booking."
 */
export const realAgentPhone: AgentPhoneProvider = {
  async *call(_offer, _task) {
    throw new Error(
      "realAgentPhone not implemented — set PROVIDERS_AGENTPHONE=mock or wire it up in providers/agentphone.real.ts",
    );
  },
};
