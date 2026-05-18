declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type OfferId = Brand<string, 'OfferId'>;
export type RunId = Brand<string, 'RunId'>;
export type ConfirmationCode = Brand<string, 'ConfirmationCode'>;

export const offerId = (s: string): OfferId => s as OfferId;
export const runId = (s: string): RunId => s as RunId;
export const confirmationCode = (s: string): ConfirmationCode => s as ConfirmationCode;
