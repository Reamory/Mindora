"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiKeyDetail } from "./ApiKeyDetail";
import { ModelDetail } from "./ModelDetail";
import { OAuthDetail } from "./OAuthDetail";
import { ProviderDetail } from "./ProviderDetail";
import { ProviderIcon } from "./modelIcons";
import { type ApiKeyProvider, type ModelsJson, type OAuthProvider, type ProviderEntry, type Selection, type ModelEntry } from "./modelTypes";

export type { ModelsJson, ProviderEntry, ModelEntry, Selection, OAuthProvider, ApiKeyProvider };

export function useModelsData() {
  const [config, setConfig] = useState<ModelsJson>({ providers: {} });
  const [loading, setLoading] = useState(true);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [apiKeyProviders, setApiKeyProviders] = useState<ApiKeyProvider[]>([]);

  const loadOAuthProviders = useCallback(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((d: { providers: OAuthProvider[] }) => setOauthProviders(d.providers))
      .catch(() => {});
  }, []);

  const loadApiKeyProviders = useCallback(() => {
    fetch("/api/auth/all-providers")
      .then((r) => r.json())
      .then((d: { providers: ApiKeyProvider[] }) => setApiKeyProviders(d.providers))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/models-config")
      .then((r) => r.json())
      .then((d: ModelsJson) => {
        const normalized = d.providers ? d : { ...d, providers: {} };
        setConfig(normalized);
      })
      .catch(() => setConfig({ providers: {} }))
      .finally(() => setLoading(false));
    loadOAuthProviders();
    loadApiKeyProviders();
  }, [loadOAuthProviders, loadApiKeyProviders]);

  return {
    config, setConfig,
    loading,
    oauthProviders, loadOAuthProviders,
    apiKeyProviders, loadApiKeyProviders,
  };
}

export function useModelsActions(
  config: ModelsJson,
  setConfig: React.Dispatch<React.SetStateAction<ModelsJson>>,
) {
  const addCustomProvider = useCallback(() => {
    let finalName = "new-provider";
    let n = 1;
    while (config.providers?.[finalName]) finalName = `new-provider-${n++}`;
    const newName = finalName;
    setConfig((prev) => ({
      ...prev,
      providers: { ...(prev.providers ?? {}), [newName]: { api: "openai-completions" } },
    }));
    return newName;
  }, [setConfig, config.providers]);

  const updateProvider = useCallback((name: string, p: ProviderEntry) => {
    setConfig((prev) => ({ ...prev, providers: { ...(prev.providers ?? {}), [name]: p } }));
  }, [setConfig]);

  const renameProvider = useCallback((oldName: string, newName: string) => {
    setConfig((prev) => {
      const entries = Object.entries(prev.providers ?? {});
      const idx = entries.findIndex(([k]) => k === oldName);
      if (idx === -1) return prev;
      entries[idx] = [newName, entries[idx][1]];
      return { ...prev, providers: Object.fromEntries(entries) };
    });
  }, [setConfig]);

  const deleteProvider = useCallback((name: string) => {
    setConfig((prev) => {
      const providers = { ...(prev.providers ?? {}) };
      delete providers[name];
      return { ...prev, providers };
    });
  }, [setConfig]);

  const addModel = useCallback((providerName: string) => {
    const current = config.providers?.[providerName]?.models ?? [];
    const newIndex = current.length;
    setConfig((prev) => {
      const provider = prev.providers?.[providerName] ?? {};
      const models = [...(provider.models ?? []), { id: "" }];
      return { ...prev, providers: { ...(prev.providers ?? {}), [providerName]: { ...provider, models } } };
    });
    return newIndex;
  }, [setConfig, config.providers]);

  const updateModel = useCallback((providerName: string, index: number, m: ModelEntry) => {
    setConfig((prev) => {
      const provider = prev.providers?.[providerName] ?? {};
      const models = [...(provider.models ?? [])];
      models[index] = m;
      return { ...prev, providers: { ...(prev.providers ?? {}), [providerName]: { ...provider, models } } };
    });
  }, [setConfig]);

  const removeModel = useCallback((providerName: string, index: number) => {
    setConfig((prev) => {
      const provider = prev.providers?.[providerName] ?? {};
      const models = [...(provider.models ?? [])];
      models.splice(index, 1);
      return { ...prev, providers: { ...(prev.providers ?? {}), [providerName]: { ...provider, models: models.length ? models : undefined } } };
    });
  }, [setConfig]);

  return {
    addCustomProvider,
    updateProvider,
    renameProvider,
    deleteProvider,
    addModel,
    updateModel,
    removeModel,
  };
}

export function renderModelsDetail(
  selection: Selection | null,
  config: ModelsJson,
  oauthProviders: OAuthProvider[],
  apiKeyProviders: ApiKeyProvider[],
  actions: ReturnType<typeof useModelsActions>,
  callbacks: { loadOAuthProviders: () => void; loadApiKeyProviders: () => void },
) {
  if (!selection) return null;
  if (selection.type === "oauth") {
    const p = oauthProviders.find((p) => p.id === selection.providerId);
    if (!p) return null;
    return <OAuthDetail key={p.id} provider={p} onRefresh={callbacks.loadOAuthProviders} />;
  }
  if (selection.type === "apikey") {
    const p = apiKeyProviders.find((p) => p.id === selection.providerId);
    if (!p) return null;
    return <ApiKeyDetail key={p.id} provider={p} onRefresh={callbacks.loadApiKeyProviders} />;
  }
  if (selection.type === "provider") {
    const provider = config.providers?.[selection.name];
    if (!provider) return null;
    return (
      <ProviderDetail
        key={selection.name}
        name={selection.name}
        provider={provider}
        onChange={(p) => actions.updateProvider(selection.name, p)}
        onRename={(n) => actions.renameProvider(selection.name, n)}
        onDelete={() => actions.deleteProvider(selection.name)}
      />
    );
  }
  const provider = config.providers?.[selection.providerName];
  const model = provider?.models?.[selection.index];
  if (!model || !provider) return null;
  return (
    <ModelDetail
      key={`${selection.providerName}-${selection.index}`}
      providerName={selection.providerName}
      provider={provider}
      model={model}
      onChange={(m) => actions.updateModel(selection.providerName, selection.index, m)}
      onDelete={() => actions.removeModel(selection.providerName, selection.index)}
    />
  );
}

export function computeActiveOAuth(oauthProviders: OAuthProvider[]) {
  return oauthProviders.filter((p) => p.loggedIn);
}

export function computeActiveApiKey(apiKeyProviders: ApiKeyProvider[]) {
  return apiKeyProviders.filter((p) => p.configured);
}

export function providerProviders(oauthProviders: OAuthProvider[], apiKeyProviders: ApiKeyProvider[]) {
  return {
    activeOAuth: computeActiveOAuth(oauthProviders),
    activeApiKey: computeActiveApiKey(apiKeyProviders),
  };
}

export { ProviderIcon };