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

type Mode = "mock" | "real";
function mode(envVar: string): Mode {
  const v = process.env[envVar];
  return v === "real" ? "real" : "mock";
}

export const browseruse: BrowserUseProvider =
  mode("PROVIDERS_BROWSERUSE") === "real" ? realBrowserUse : mockBrowserUse;

export const agentphone: AgentPhoneProvider =
  mode("PROVIDERS_AGENTPHONE") === "real" ? realAgentPhone : mockAgentPhone;

export const payments: PaymentsProvider =
  mode("PROVIDERS_PAYMENTS") === "real" ? realPayments : mockPayments;
