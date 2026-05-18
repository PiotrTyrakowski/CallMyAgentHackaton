import { mockBrowserUse } from "./browseruse";
import { realBrowserUse } from "./browseruse.real";
import { mockAgentPhone } from "./agentphone";
import { realAgentPhone } from "./agentphone.real";
import { mockPayments } from "./payments";
import { realPayments } from "./payments.real";
import type {
  AgentPhoneProvider,
  BrowserUseProvider,
  PaymentsProvider,
} from "./types";

// Auto-detect: if the corresponding API key is present in env, use the real
// adapter. Otherwise fall back to the local mock so the demo always runs
// offline. Drop in keys → goes live; remove them → back to mock.

export const browseruse: BrowserUseProvider = process.env.BROWSERUSE_API_KEY
  ? realBrowserUse
  : mockBrowserUse;

export const agentphone: AgentPhoneProvider =
  process.env.AGENTPHONE_API_KEY && process.env.AGENTPHONE_AGENT_ID
    ? realAgentPhone
    : mockAgentPhone;

export const payments: PaymentsProvider = process.env.X402_API_KEY
  ? realPayments
  : mockPayments;
