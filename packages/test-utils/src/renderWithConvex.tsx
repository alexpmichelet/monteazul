import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { ConvexProvider, type ConvexReactClient } from "convex/react";
import { getFunctionName, type FunctionReference } from "convex/server";
import type { ReactElement, ReactNode } from "react";

type FunctionImpl = (args: Record<string, unknown>) => unknown;

export class ConvexReactClientFake {
  private queries = new Map<string, FunctionImpl>();
  private mutations = new Map<string, FunctionImpl>();
  private actions = new Map<string, FunctionImpl>();
  private listeners = new Set<() => void>();

  registerQueryFake<F extends FunctionReference<"query">>(
    funcRef: F,
    impl: (args: F["_args"]) => F["_returnType"],
  ): void {
    this.queries.set(getFunctionName(funcRef), impl as FunctionImpl);
  }

  registerMutationFake<F extends FunctionReference<"mutation">>(
    funcRef: F,
    impl: (args: F["_args"]) => F["_returnType"],
  ): void {
    this.mutations.set(getFunctionName(funcRef), impl as FunctionImpl);
  }

  registerActionFake<F extends FunctionReference<"action">>(
    funcRef: F,
    impl: (args: F["_args"]) => F["_returnType"],
  ): void {
    this.actions.set(getFunctionName(funcRef), impl as FunctionImpl);
  }

  watchQuery(
    query: FunctionReference<"query">,
    args?: Record<string, unknown>,
  ) {
    const name = getFunctionName(query);
    return {
      localQueryResult: () => {
        const impl = this.queries.get(name);
        if (!impl) {
          throw new Error(
            `Unexpected query: ${name}. Try registering it with registerQueryFake().`,
          );
        }
        return impl(args ?? {});
      },
      onUpdate: (callback: () => void) => {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
      },
      localQueryLogs: () => undefined,
      journal: () => undefined,
    };
  }

  /** One-shot imperative query (the `useConvex().query(...)` path). */
  query(
    query: FunctionReference<"query">,
    args?: Record<string, unknown>,
  ): Promise<unknown> {
    const name = getFunctionName(query);
    const impl = this.queries.get(name);
    if (!impl) {
      throw new Error(
        `Unexpected query: ${name}. Try registering it with registerQueryFake().`,
      );
    }
    return Promise.resolve(impl(args ?? {}));
  }

  mutation(
    mutation: FunctionReference<"mutation">,
    args?: Record<string, unknown>,
  ): Promise<unknown> {
    const name = getFunctionName(mutation);
    const impl = this.mutations.get(name);
    if (!impl) {
      throw new Error(
        `Unexpected mutation: ${name}. Try registering it with registerMutationFake().`,
      );
    }
    return Promise.resolve(impl(args ?? {}));
  }

  action(
    action: FunctionReference<"action">,
    args?: Record<string, unknown>,
  ): Promise<unknown> {
    const name = getFunctionName(action);
    const impl = this.actions.get(name);
    if (!impl) {
      throw new Error(
        `Unexpected action: ${name}. Try registering it with registerActionFake().`,
      );
    }
    return Promise.resolve(impl(args ?? {}));
  }

  notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  connectionState() {
    return { hasInflightRequests: false, isWebSocketConnected: true };
  }

  setAuth(): never {
    throw new Error("Auth is not implemented in ConvexReactClientFake.");
  }

  clearAuth(): never {
    throw new Error("Auth is not implemented in ConvexReactClientFake.");
  }

  close(): Promise<void> {
    this.listeners.clear();
    return Promise.resolve();
  }
}

export interface RenderWithConvexOptions extends RenderOptions {
  client?: ConvexReactClientFake;
}

export interface RenderWithConvexResult extends RenderResult {
  client: ConvexReactClientFake;
}

export function renderWithConvex(
  ui: ReactElement,
  {
    client = new ConvexReactClientFake(),
    wrapper: InnerWrapper,
    ...renderOptions
  }: RenderWithConvexOptions = {},
): RenderWithConvexResult {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ConvexProvider client={client as unknown as ConvexReactClient}>
        {InnerWrapper ? <InnerWrapper>{children}</InnerWrapper> : children}
      </ConvexProvider>
    );
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });
  return { ...result, client };
}
