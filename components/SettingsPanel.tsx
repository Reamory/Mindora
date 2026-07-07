"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { AddProviderPicker } from "./models/AddProviderPicker";
import { ProviderIcon } from "./models/modelIcons";
import {
  renderModelsDetail,
  useModelsActions,
  useModelsData,
  type Selection as ModelSelection,
} from "./models/ModelsSettings";
import {
  AddSkillPanel,
  SkillDetail,
  sourceLabel,
  useSkillsData,
  type Skill,
} from "./skills/skillsShared";
import {
  AddPluginPanel,
  PackageDetail,
  packageKey as pluginPackageKey,
  resourceSummary as pluginResourceSummary,
  shortenPath as pluginShortenPath,
  statusColor as pluginStatusColor,
  versionSummary as pluginVersionSummary,
  usePluginsData,
  type PluginScope,
} from "./plugins/pluginsShared";
import { SettingCard, SettingSection, SettingsHeader, SettingsView } from "./settings/SettingsView";
import { useLocale, LOCALES, type Locale } from "@/hooks/useLocale";

type SettingsTab = "models" | "skills" | "plugins" | "appearance";

interface SettingsPanelProps {
  activeCwd?: string | null;
  selectedSessionId?: string | null;
  newSessionCwd?: string | null;
  initialTab?: SettingsTab;
  onClose: () => void;
  onModelsRefresh?: () => void;
  onSessionReload?: () => void;
}

const TAB_TITLE_KEYS: Record<SettingsTab, string> = {
  models: "settings.tab.models",
  skills: "settings.tab.skills",
  plugins: "settings.tab.plugins",
  appearance: "settings.tab.appearance",
};

const TAB_SUBTITLE_KEYS: Record<SettingsTab, string> = {
  models: "settings.subtitle.models",
  skills: "settings.subtitle.skills",
  plugins: "settings.subtitle.plugins",
  appearance: "settings.subtitle.appearance",
};

const TAB_ICONS: Record<SettingsTab, React.ReactNode> = {
  models: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  ),
  skills: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  plugins: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 7V2" />
      <path d="M15 7V2" />
      <path d="M6 13V8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5a6 6 0 0 1-12 0Z" />
      <path d="M12 19v3" />
    </svg>
  ),
  appearance: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
};

export function SettingsPanel({
  activeCwd,
  selectedSessionId,
  newSessionCwd,
  initialTab,
  onClose,
  onModelsRefresh,
  onSessionReload,
}: SettingsPanelProps) {
  const isMobile = useIsMobile();
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab ?? "models");
  const [modelsDirty, setModelsDirty] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const requestClose = useCallback(() => {
    if (modelsDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    onClose();
  }, [modelsDirty, onClose]);

  const handleClose = useCallback(() => {
    requestClose();
  }, [requestClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const cwd = activeCwd || newSessionCwd || selectedSessionId || null;
  const tabs = (["models", "skills", "plugins", "appearance"] as SettingsTab[]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        style={{
          width: isMobile ? "calc(100vw - 16px)" : "min(1100px, 95vw)",
          height: isMobile ? "calc(100dvh - 16px)" : "min(720px, 90vh)",
          maxHeight: "calc(100dvh - 16px)",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {!isMobile && (
          <div style={{
            width: 220,
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            padding: "10px 0 8px",
            background: "var(--bg-panel)",
            flexShrink: 0,
          }}>
            <div style={{ padding: "10px 16px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{t("settings.title")}</span>
            </div>

            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    background: isActive ? "var(--bg-selected)" : "none",
                    border: "none",
                    borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    color: isActive ? "var(--text)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    textAlign: "left",
                    transition: "background 0.12s, color 0.12s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text)"; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; } }}
                >
                  <span style={{ color: isActive ? "var(--accent)" : "var(--text-dim)", flexShrink: 0 }}>{TAB_ICONS[tab]}</span>
                  {t(TAB_TITLE_KEYS[tab])}
                </button>
              );
            })}

            <div style={{
              padding: "12px 16px",
              marginTop: "auto",
              borderTop: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Version</div>
              <div style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                lineHeight: 1.4,
              }}>
                <span>web <span style={{ color: "var(--text)" }}>v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"}</span></span>
                <span style={{ opacity: 0.55 }}>·</span>
                <span>pi <span style={{ color: "var(--text)" }}>v{process.env.NEXT_PUBLIC_PI_VERSION ?? "0.0.0"}</span></span>
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "12px 14px" : "14px 22px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
            gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
              {isMobile && (
                <span style={{ color: "var(--accent)", flexShrink: 0 }}>{TAB_ICONS[activeTab]}</span>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t(TAB_TITLE_KEYS[activeTab])}
                </div>
                {!isMobile && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t(TAB_SUBTITLE_KEYS[activeTab])}</div>
                )}
              </div>
            </div>
            {isMobile && (
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as SettingsTab)}
                style={{ padding: "5px 8px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text)", fontSize: 12 }}
              >
                {tabs.map((tt) => <option key={tt} value={tt}>{t(TAB_TITLE_KEYS[tt])}</option>)}
              </select>
            )}
            <button
              onClick={handleClose}
              aria-label="Close settings"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 30, height: 30, background: "none", border: "none", borderRadius: 6,
                color: "var(--text-muted)", cursor: "pointer", transition: "background 0.12s, color 0.12s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            overflow: "hidden",
            minHeight: 0,
          }}>
            {activeTab === "models" && (
              <ModelsSettingsView cwd={cwd} onSaved={() => onModelsRefresh?.()} onDirtyChange={setModelsDirty} />
            )}
            {activeTab === "skills" && (
              cwd ? <SkillsSettingsView cwd={cwd} onReload={onSessionReload} /> : <NoCwdMessage tab="skills" />
            )}
            {activeTab === "plugins" && (
              cwd ? <PluginsSettingsView cwd={cwd} sessionId={selectedSessionId ?? null} onReload={onSessionReload} /> : <NoCwdMessage tab="plugins" />
            )}
            {activeTab === "appearance" && <AppearanceSettings />}
          </div>
        </div>
      </div>
      {confirmCloseOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmCloseOpen(false); }}
        >
          <div style={{ width: 380, maxWidth: "calc(100vw - 32px)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 22, boxShadow: "0 16px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Unsaved changes</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 18 }}>
              {t("common.unsaved.body")}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setConfirmCloseOpen(false)}
                style={{ padding: "7px 14px", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}
              >Keep editing</button>
              <button
                onClick={() => { setConfirmCloseOpen(false); onClose(); }}
                style={{ padding: "7px 14px", background: "#ef4444", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >Discard & close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoCwdMessage({ tab }: { tab: string }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
      Open or create a session with a working directory to configure {tab}.
    </div>
  );
}

function ModelsSettingsView({ onSaved, onDirtyChange }: { cwd: string | null; onSaved: () => void; onDirtyChange?: (dirty: boolean) => void }) {
  const { t } = useLocale();
  const data = useModelsData();
  const actions = useModelsActions(data.config, data.setConfig);
  const [initialConfig, setInitialConfig] = useState<typeof data.config | null>(null);
  const [selection, setSelection] = useState<ModelSelection | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!data.loading && initialConfig === null) {
      setInitialConfig(data.config);
    }
  }, [data.loading, data.config, initialConfig]);

  const dirty = useMemo(() => {
    if (initialConfig === null) return false;
    return JSON.stringify(data.config) !== JSON.stringify(initialConfig);
  }, [data.config, initialConfig]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const activeOAuth = useMemo(() => data.oauthProviders.filter((p) => p.loggedIn), [data.oauthProviders]);
  const activeApiKey = useMemo(() => data.apiKeyProviders.filter((p) => p.configured), [data.apiKeyProviders]);
  const providers = useMemo(() => Object.entries(data.config.providers ?? {}), [data.config.providers]);

  const q = filter.trim().toLowerCase();

  const groups = useMemo(() => {
    const result: { id: string; label: string; items: { id: string; primary: string; secondary?: React.ReactNode; icon?: React.ReactNode; selected: boolean; onClick: () => void }[] }[] = [];
    const matchesText = (text: string | undefined) => !q || (text ?? "").toLowerCase().includes(q);

    if (activeOAuth.length > 0) {
      result.push({
        id: "oauth",
        label: "Subscriptions",
        items: activeOAuth
          .filter((p) => matchesText(p.name) || matchesText(p.id))
          .map((p) => ({
            id: `oauth:${p.id}`,
            primary: p.name,
            secondary: "OAuth",
            icon: <ProviderIcon id={p.id} size={16} />,
            selected: !!selection && selection.type === "oauth" && selection.providerId === p.id,
            onClick: () => setSelection({ type: "oauth", providerId: p.id }),
          })),
      });
    }

    if (activeApiKey.length > 0) {
      result.push({
        id: "apikey",
        label: "API Key",
        items: activeApiKey
          .filter((p) => matchesText(p.displayName) || matchesText(p.id))
          .map((p) => ({
            id: `apikey:${p.id}`,
            primary: p.displayName,
            secondary: `${p.modelCount} model${p.modelCount !== 1 ? "s" : ""}`,
            icon: <ProviderIcon id={p.id} size={16} />,
            selected: !!selection && selection.type === "apikey" && selection.providerId === p.id,
            onClick: () => setSelection({ type: "apikey", providerId: p.id }),
          })),
      });
    }

    providers.forEach(([pName, pData]) => {
      const providerMatches = matchesText(pName);
      const items = (pData.models ?? [])
        .filter((m) => providerMatches || matchesText(m.id) || matchesText(m.name))
        .map((m, i) => ({
          id: `model:${pName}:${i}`,
          primary: m.id || "new model",
          secondary: m.name && m.name !== m.id ? m.name : undefined,
          icon: <ProviderIcon id={pName} size={16} />,
          selected: !!selection && selection.type === "model" && selection.providerName === pName && selection.index === i,
          onClick: () => setSelection({ type: "model", providerName: pName, index: i }),
        }));
      const showProvider = providerMatches || items.length > 0;
      if (!showProvider) return;
      result.push({
        id: `provider:${pName}`,
        label: "Custom",
        items: [
          {
            id: `provider:${pName}`,
            primary: pName,
            secondary: pData.api ?? undefined,
            icon: <ProviderIcon id={pName} size={16} />,
            selected: !!selection && selection.type === "provider" && selection.name === pName,
            onClick: () => setSelection({ type: "provider", name: pName }),
          },
          ...items,
        ],
      });
    });

    return result;
  }, [activeOAuth, activeApiKey, providers, selection, q]);

  const groupsForView = useMemo(() => groups.map((g) => ({ ...g, items: g.items })), [groups]);

  const detail = selection ? renderModelsDetail(
    selection,
    data.config,
    data.oauthProviders,
    data.apiKeyProviders,
    actions,
    { loadOAuthProviders: data.loadOAuthProviders, loadApiKeyProviders: data.loadApiKeyProviders },
  ) : null;

  const detailFooter = (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center", width: "100%" }}>
      {saveError && (
        <span
          title={saveError}
          style={{
            fontSize: 12,
            color: "#fca5a5",
            maxWidth: 360,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {saveError}
        </span>
      )}
      <button onClick={async () => {
        setSaving(true);
        setSaveError(null);
        try {
          const res = await fetch("/api/models-config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data.config),
          });
          const d = await res.json() as { success?: boolean; error?: string };
          if (!res.ok || d.error) setSaveError(d.error ?? `HTTP ${res.status}`);
          else {
            setSavedOk(true);
            setTimeout(() => setSavedOk(false), 2000);
            setInitialConfig(data.config);
            onSaved();
          }
        } catch (e) {
          setSaveError(String(e));
        } finally {
          setSaving(false);
        }
      }} disabled={saving || savedOk} style={{
        padding: "6px 16px", minWidth: 96,
        background: savedOk ? "#16a34a" : saving ? "var(--bg-panel)" : "var(--accent)",
        border: "none", borderRadius: 6,
        color: savedOk ? "#fff" : saving ? "var(--text-muted)" : "#fff",
        cursor: saving || savedOk ? "default" : "pointer",
        fontSize: 13, fontWeight: 600,
        display: "inline-flex", alignItems: "center", gap: 6,
      }}>
        {savedOk && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        <span>{savedOk ? t("models.detail.saved") : saving ? t("models.detail.saving") : t("models.detail.save")}</span>
      </button>
    </div>
  );

  return (
    <>
      <SettingsView
        title={t(TAB_TITLE_KEYS.models)}
        groups={groupsForView}
        searchPlaceholder="Search providers & models"
        searchValue={filter}
        onSearchChange={setFilter}
        emptyMessage="No providers configured yet"
        detail={detail}
        hasSelection={!!selection}
        onBackToList={() => setSelection(null)}
        addButton={
          <button
            onClick={() => setPickerOpen(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              width: "100%", padding: "6px 0", background: "none",
              border: "1px dashed var(--border)", borderRadius: 5,
              color: "var(--text-muted)", cursor: "pointer", fontSize: 12,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            {t("models.add")}
          </button>
        }
        footer={detailFooter}
        width={250}
      />
      {pickerOpen && (
        <AddProviderPicker
          oauthProviders={data.oauthProviders}
          apiKeyProviders={data.apiKeyProviders}
          onSelectOAuth={(id) => { setSelection({ type: "oauth", providerId: id }); setPickerOpen(false); }}
          onSelectApiKey={(id) => { setSelection({ type: "apikey", providerId: id }); setPickerOpen(false); }}
          onAddCustom={() => {
            const newName = actions.addCustomProvider();
            setSelection({ type: "provider", name: newName });
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

function SkillsSettingsView({ cwd }: { cwd: string; onReload?: () => void }) {
  const { t } = useLocale();
  const data = useSkillsData(cwd);
  const [selected, setSelected] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => { data.loadSkills(); }, [cwd]);
  useEffect(() => {
    if (data.skills.length > 0 && !selected && !addMode) {
      setSelected(data.skills[0].filePath);
    }
  }, [data.skills, selected, addMode]);

  const q = filter.trim().toLowerCase();
  const selectedSkill: Skill | null = data.skills.find((s) => s.filePath === selected) ?? null;

  const groups = useMemo(() => {
    const result: { id: string; label: string; items: { id: string; primary: string; secondary?: React.ReactNode; icon?: React.ReactNode; selected: boolean; onClick: () => void }[] }[] = [];
    for (const grpLabel of ["project", "global", "path"]) {
      const grpSkills = data.skills.filter((s) => sourceLabel(s) === grpLabel && (!q || s.name.toLowerCase().includes(q)));
      if (grpSkills.length > 0) {
        result.push({
          id: grpLabel,
          label: grpLabel,
          items: grpSkills.map((s) => ({
            id: s.filePath,
            primary: s.name,
            secondary: s.filePath.split(/[\\/]/).slice(-2).join("/"),
            icon: (
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: s.disableModelInvocation ? "var(--border)" : "var(--accent)",
                boxShadow: s.disableModelInvocation ? "none" : "0 0 4px var(--accent)",
                flexShrink: 0,
              }} />
            ),
            selected: !addMode && selected === s.filePath,
            onClick: () => { setSelected(s.filePath); setAddMode(false); },
          })),
        });
      }
    }
    return result;
  }, [data.skills, q, selected, addMode]);

  const detail = addMode ? (
    <AddSkillPanel cwd={cwd} onInstalled={() => data.loadSkills()} />
  ) : data.loading ? null : selectedSkill ? (
    <div>
      <SettingsHeader
        title={selectedSkill.name}
        subtitle={selectedSkill.filePath}
      />
      <SkillDetail
        skill={selectedSkill}
        cwd={cwd}
        onToggle={data.toggle}
        toggling={data.toggling.has(selectedSkill.filePath)}
        saveError={data.saveError}
      />
    </div>
  ) : null;

  return (
    <SettingsView
      title={t(TAB_TITLE_KEYS.skills)}
      subtitle={<span style={{ fontFamily: "var(--font-mono)" }}>{cwd}</span>}
      groups={groups}
      searchPlaceholder="Search skills"
      searchValue={filter}
      onSearchChange={setFilter}
      emptyMessage={data.loading ? t("skills.empty.loading") : t("skills.empty")}
      detail={detail}
      hasSelection={!!selected || addMode}
      onBackToList={() => { setSelected(null); setAddMode(false); }}
      addButton={
        <button
          onClick={() => { setAddMode(true); setSelected(null); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: "100%", padding: "6px 0", background: "none",
            border: "1px dashed var(--border)", borderRadius: 5,
            color: addMode ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontSize: 12,
            borderColor: addMode ? "var(--accent)" : "var(--border)",
          }}
        >
          + Add skill
        </button>
      }
      width={220}
    />
  );
}

function PluginsSettingsView({ cwd, sessionId, onReload }: { cwd: string; sessionId: string | null; onReload?: () => void }) {
  const { t } = useLocale();
  const data = usePluginsData(cwd, sessionId, onReload);
  const [filter, setFilter] = useState("");
  const [scope, setScope] = useState<PluginScope | "all">("all");

  useEffect(() => { void data.loadPlugins(); }, [cwd]);

  const packages = useMemo(() => data.data?.packages ?? [], [data.data?.packages]);
  const selectedPackage = packages.find((pkg) => pluginPackageKey(pkg) === data.selected) ?? null;

  const q = filter.trim().toLowerCase();
  const groups = useMemo(() => {
    const result: { id: string; label: string; items: { id: string; primary: string; secondary?: React.ReactNode; icon?: React.ReactNode; selected: boolean; onClick: () => void }[] }[] = [];
    for (const s of ["project", "global"] as PluginScope[]) {
      if (scope !== "all" && scope !== s) continue;
      const pkgs = packages.filter((p) => p.scope === s && (!q || p.source.toLowerCase().includes(q)));
      if (pkgs.length === 0) continue;
      result.push({
        id: s,
        label: s,
        items: pkgs.map((p) => {
          const key = pluginPackageKey(p);
          return {
            id: key,
            primary: p.source,
            secondary: `${pluginResourceSummary(p)}${p.version ? ` · ${p.version}` : ""}`,
            icon: <span style={{ width: 8, height: 8, borderRadius: "50%", background: pluginStatusColor(p.status), flexShrink: 0 }} />,
            selected: !data.addMode && data.selected === key,
            onClick: () => { data.setSelected(key); data.setAddMode(false); data.setActionError(null); data.setActionMessage(null); },
          };
        }),
      });
    }
    return result;
  }, [packages, q, data, scope]);

  const detail = data.addMode ? (
    <div>
      <SettingsHeader title={t("plugins.add.title")} subtitle={cwd} />
      <AddPluginPanel
        cwd={cwd}
        source={data.installSource}
        scope={data.installScope}
        busy={data.busyKey?.startsWith("install:") ?? false}
        actionError={data.actionError}
        onSourceChange={data.setInstallSource}
        onScopeChange={data.setInstallScope}
        onInstall={data.installPlugin}
      />
    </div>
  ) : data.loading ? null : selectedPackage ? (
    <div>
      <SettingsHeader
        title={selectedPackage.source}
        subtitle={`${pluginResourceSummary(selectedPackage)} · ${pluginVersionSummary(selectedPackage)}`}
      />
      <PackageDetail
        pkg={selectedPackage}
        cwd={cwd}
        busyKey={data.busyKey}
        actionError={data.actionError}
        actionMessage={data.actionMessage}
        sessionId={sessionId}
        onAction={data.runAction}
        onReloadSession={data.reloadSession}
      />
    </div>
  ) : null;

  const footer = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%" }}>
      <div style={{ flex: 1, fontSize: 11, color: "var(--text-dim)" }}>
        {data.data?.diagnostics.length ? (
          <span style={{ color: data.data.diagnostics.some((d) => d.type === "error") ? "#ef4444" : "#d97706" }}>
            {data.data.diagnostics.length} diagnostic{data.data.diagnostics.length === 1 ? "" : "s"}
          </span>
        ) : data.data ? (
          <span>{data.data.totals.extensions} ext · {data.data.totals.skills} skills · {data.data.totals.prompts} prompts · {data.data.totals.themes} themes</span>
        ) : null}
      </div>
      <button onClick={() => void data.loadPlugins()} disabled={data.loading || data.busyKey !== null} style={{
        padding: "5px 11px", background: "none", border: "1px solid var(--border)", borderRadius: 5,
        color: data.loading || data.busyKey !== null ? "var(--text-dim)" : "var(--text-muted)",
        cursor: data.loading || data.busyKey !== null ? "not-allowed" : "pointer", fontSize: 12,
      }}>{t("plugins.refresh")}</button>
    </div>
  );

  return (
    <SettingsView
      title={t(TAB_TITLE_KEYS.plugins)}
      subtitle={<span style={{ fontFamily: "var(--font-mono)" }}>{pluginShortenPath(cwd)}</span>}
      groups={groups}
      searchPlaceholder="Search plugins"
      searchValue={filter}
      onSearchChange={setFilter}
      filterOptions={[
        { id: "all", label: "All" },
        { id: "global", label: "Global" },
        { id: "project", label: "Project" },
      ]}
      filterValue={scope}
      onFilterChange={(id) => setScope(id as PluginScope | "all")}
      emptyMessage={data.loading ? "Loading…" : data.error ?? "No plugins configured"}
      detail={detail}
      hasSelection={!!selectedPackage || data.addMode}
      onBackToList={() => { data.setSelected(null); data.setAddMode(false); }}
      addButton={
        <button
          onClick={() => { data.setAddMode(true); data.setSelected(null); data.setActionError(null); data.setActionMessage(null); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: "100%", padding: "6px 0", background: "none",
            border: "1px dashed", borderRadius: 5, cursor: "pointer", fontSize: 12,
            borderColor: data.addMode ? "var(--accent)" : "var(--border)",
            color: data.addMode ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          {t("plugins.add")}
        </button>
      }
      footer={footer}
      width={260}
    />
  );
}

function AppearanceSettings() {
  const { mode, setMode, resolved } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const chooseMode = (next: ThemeMode, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMode(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  const currentLocale = LOCALES.find((l) => l.id === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!langPickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangPickerOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [langPickerOpen]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
      <SettingsHeader
        title={t("settings.tab.appearance")}
        subtitle={t("settings.subtitle.appearance")}
      />

      <SettingSection title={t("general.language")}>
        <SettingCard
          title={currentLocale.native}
          subtitle={t("general.language.help")}
          onClick={() => setLangPickerOpen((v) => !v)}
          trailing={
            <div ref={langRef} style={{ position: "relative" }}>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={langPickerOpen}
                onClick={(e) => { e.stopPropagation(); setLangPickerOpen((v) => !v); }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 160,
                  padding: "7px 11px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  color: "var(--text)",
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <GlobeIcon />
                <span style={{ flex: 1, textAlign: "left" }}>{currentLocale.native}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.55, transform: langPickerOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {langPickerOpen && (
                <div role="listbox" style={{
                  position: "absolute", right: 0, top: "calc(100% + 6px)",
                  minWidth: 180, zIndex: 200,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 4,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                }}>
                  {LOCALES.map((l) => {
                    const active = l.id === locale;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => { setLocale(l.id); setLangPickerOpen(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          width: "100%", padding: "7px 10px",
                          background: active ? "var(--bg-selected)" : "none",
                          border: "none", borderRadius: 5,
                          color: "var(--text)", fontSize: 13, textAlign: "left",
                          cursor: "pointer",
                          fontWeight: active ? 600 : 400,
                        }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-hover)"; }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "none"; }}
                      >
                        <span style={{ flex: 1 }}>{l.native}</span>
                        {active && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          }
        />
      </SettingSection>

      <SettingSection title={t("general.theme")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 10 }}>
          <ThemeCard
            label={t("general.theme.light.label")}
            description={t("general.theme.light.desc")}
            selected={mode === "light"}
            onClick={(e) => chooseMode("light", e)}
            icon={<SunIcon />}
            preview="light"
          />
          <ThemeCard
            label={t("general.theme.dark.label")}
            description={t("general.theme.dark.desc")}
            selected={mode === "dark"}
            onClick={(e) => chooseMode("dark", e)}
            icon={<MoonIcon />}
            preview="dark"
          />
          <ThemeCard
            label={t("general.theme.system.label")}
            description={t("general.theme.system.desc")}
            selected={mode === "system"}
            onClick={(e) => chooseMode("system", e)}
            icon={<MonitorIcon />}
            preview="system"
          />
        </div>
      </SettingSection>

      <SettingSection title={t("general.preview")}>
        <div style={{
          padding: 20,
          border: "1px solid var(--border)",
          borderRadius: 10,
          background: "var(--bg-panel)",
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: 14,
        }}>
          <div style={{
            height: 80,
            borderRadius: 8,
            background: resolved === "dark"
              ? "linear-gradient(135deg, #1f2937 0%, #111827 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: resolved === "dark" ? "#e5e7eb" : "#111827",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}>
            {resolved === "dark" ? t("general.theme.dark.label") : t("general.theme.light.label")}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{t("general.about.name")}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
              {t("general.preview.body")}
            </div>
          </div>
        </div>
      </SettingSection>

      <SettingSection title={t("general.about")}>
        <SettingCard
          title={t("general.about.name")}
          subtitle={t("general.about.body")}
        />
      </SettingSection>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ThemeCard({
  label, description, selected, onClick, icon, preview,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon: React.ReactNode;
  preview: "light" | "dark" | "system";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10,
        padding: 16,
        background: selected ? "var(--bg-selected)" : "var(--bg-panel)",
        border: selected ? "2px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        color: "var(--text)",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
        <span style={{
          width: 30, height: 30, borderRadius: 7,
          background: preview === "dark" ? "#1f2937" : preview === "light" ? "#f3f4f6" : "linear-gradient(135deg, #1f2937 50%, #f3f4f6 50%)",
          border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center",
          color: preview === "dark" ? "#fbbf24" : "#0ea5e9",
        }}>{icon}</span>
      </div>
      <div style={{
        fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5,
        width: 80, height: 40, borderRadius: 6,
        background: preview === "dark" ? "#111827" : preview === "light" ? "#ffffff" : "linear-gradient(135deg, #111827 50%, #ffffff 50%)",
        border: "1px solid var(--border)",
      }} />
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{description}</div>
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}