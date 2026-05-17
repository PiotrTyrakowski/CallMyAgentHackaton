import { createContext, type ReactNode, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createFlowStore, type FlowStore } from './create-flow-store';
import type { FlowInit, FlowState } from './types';

const FlowCtx = createContext<FlowStore | null>(null);

export function FlowStoreProvider({
  init,
  children,
}: {
  init: FlowInit;
  children: ReactNode;
}) {
  const ref = useRef<FlowStore | null>(null);
  if (ref.current === null) ref.current = createFlowStore(init);
  return <FlowCtx.Provider value={ref.current}>{children}</FlowCtx.Provider>;
}

function useFlowStoreCtx(hookName: string): FlowStore {
  const store = useContext(FlowCtx);
  if (!store) {
    throw new Error(`${hookName} must be used inside <FlowStoreProvider />`);
  }
  return store;
}

export function useFlow<T>(selector: (s: FlowState) => T): T {
  const store = useFlowStoreCtx('useFlow');
  return useStore(store, selector);
}

export function useFlowShallow<T>(selector: (s: FlowState) => T): T {
  const store = useFlowStoreCtx('useFlowShallow');
  return useStore(store, useShallow(selector));
}
