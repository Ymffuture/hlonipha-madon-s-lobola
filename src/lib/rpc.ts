import { supabase } from "@/integrations/supabase/client";

/**
 * Calls a database function that the generated Supabase types don't know about yet.
 *
 * Two things this guarantees, because the guest pages depend on them:
 *  1. rpc is called AS A METHOD of the client. Pulling `supabase.rpc` out into a
 *     variable and calling it loses `this`, and Supabase then throws
 *     "Cannot read properties of undefined (reading 'rest')".
 *  2. It never throws and never hangs. A crash, a network failure or no answer
 *     after 15 seconds all come back as `{ data: null, error }`, so a screen can
 *     always leave its "loading" state and show a message.
 */
export type RpcResult<T> = { data: T | null; error: { message: string } | null };

export const RPC_TIMEOUT_MS = 15_000;

type LooseClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult<unknown>>;
};

export async function callRpc<T>(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<RpcResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const client = supabase as unknown as LooseClient;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), RPC_TIMEOUT_MS);
    });
    const result = await Promise.race([client.rpc(fn, args), timeout]);
    return result as RpcResult<T>;
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : "NETWORK_ERROR" } };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
