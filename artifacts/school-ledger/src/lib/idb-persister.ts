import { createStore, get, set, del } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

const idbStore = createStore("school-ledger-db", "react-query-cache");

export function createIdbPersister(key = "rq-cache"): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(key, client, idbStore);
    },
    restoreClient: async () => {
      return await get<PersistedClient>(key, idbStore);
    },
    removeClient: async () => {
      await del(key, idbStore);
    },
  };
}
