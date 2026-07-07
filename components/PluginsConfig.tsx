"use client";

import { useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  AddPluginPanel,
  PackageDetail,
  buttonStyle,
  packageKey,
  resourceSummary,
  shortenPath,
  statusColor,
  usePluginsData,
  versionSummary,
  type PluginScope,
} from "./plugins/pluginsShared";
import type { PluginPackageInfo } from "@/app/api/plugins/route";

export function PluginsConfig({
  cwd, sessionId, onClose, onReloaded,
}: {
  cwd: string;
  sessionId: string | null;
  onClose: () => void;
  onReloaded?: () => void;
}) {
  const isMobile = useIsMobile();
  const data = usePluginsData(cwd, sessionId, onReloaded);

  useEffect(() => { void data.loadPlugins(); }, [cwd]);

  const packages = useMemo(() => data.data?.packages ?? [], [data.data?.packages]);
  const selectedPackage: PluginPackageInfo | null = packages.find((pkg) => packageKey(pkg) === data.selected) ?? null;
  const groupedPackages = useMemo(() => {
    return (["project", "global"] as PluginScope[])
      .map((scope) => ({ scope, packages: packages.filter((pkg) => pkg.scope === scope) }))
      .filter((g) => g.packages.length > 0);
  }, [packages]);
  const addBusy = data.busyKey?.startsWith("install:") ?? false;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: isMobile ? "calc(100vw - 16px)" : 860,
          maxWidth: "calc(100vw - 16px)",
          height: isMobile ? "calc(100dvh - 16px)" : "76vh",
          maxHeight: "calc(100dvh - 16px)",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Plugins</span>
            <code style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortenPath(cwd)}</code>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden" }}>
          <div style={{
            width: isMobile ? "100%" : 245,
            maxHeight: isMobile ? "40vh" : undefined,
            borderRight: isMobile ? "none" : "1px solid var(--border)",
            borderBottom: isMobile ? "1px solid var(--border)" : "none",
            display: "flex", flexDirection: "column", flexShrink: 0, background: "var(--bg-panel)",
          }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
              {data.loading ? (
                <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--text-muted)" }}>Loading...</div>
              ) : data.error ? (
                <div style={{ padding: "10px 8px", fontSize: 11, color: "#ef4444" }}>{data.error}</div>
              ) : packages.length === 0 ? (
                <div style={{ padding: "10px 8px", fontSize: 11, color: "var(--text-dim)" }}>No plugins configured</div>
              ) : (
                groupedPackages.map((group) => (
                  <div key={group.scope} style={{ marginBottom: 6 }}>
                    <div style={{ padding: "4px 8px 3px", fontSize: 10, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase" }}>{group.scope}</div>
                    {group.packages.map((pkg) => {
                      const key = packageKey(pkg);
                      const isSelected = !data.addMode && data.selected === key;
                      return (
                        <div
                          key={key}
                          onClick={() => {
                            data.setSelected(key);
                            data.setAddMode(false);
                            data.setActionError(null);
                            data.setActionMessage(null);
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: 7, padding: "8px 8px",
                            borderRadius: 5, cursor: "pointer",
                            background: isSelected ? "var(--bg-selected)" : "none",
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--bg-hover)"; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "none"; }}
                        >
                          <span style={{ flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: statusColor(pkg.status) }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: "var(--text)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pkg.source}</div>
                            <div style={{ fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{resourceSummary(pkg)}</div>
                            {(pkg.version || pkg.configuredVersion) && (
                              <div style={{ fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{versionSummary(pkg)}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: "8px 6px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  data.setAddMode(true);
                  data.setActionError(null);
                  data.setActionMessage(null);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 8px",
                  borderRadius: 5, border: "none", width: "100%", cursor: "pointer",
                  background: data.addMode ? "var(--bg-selected)" : "none",
                  color: data.addMode ? "var(--accent)" : "var(--text-dim)",
                  fontSize: 12,
                }}
                onMouseEnter={(e) => { if (!data.addMode) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { if (!data.addMode) e.currentTarget.style.background = "none"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add plugin
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {data.addMode ? (
              <AddPluginPanel
                cwd={cwd}
                source={data.installSource}
                scope={data.installScope}
                busy={addBusy}
                actionError={data.actionError}
                onSourceChange={data.setInstallSource}
                onScopeChange={data.setInstallScope}
                onInstall={data.installPlugin}
              />
            ) : data.loading ? null : selectedPackage ? (
              <PackageDetail
                key={packageKey(selectedPackage)}
                pkg={selectedPackage}
                cwd={cwd}
                busyKey={data.busyKey}
                actionError={data.actionError}
                actionMessage={data.actionMessage}
                sessionId={sessionId}
                onAction={data.runAction}
                onReloadSession={data.reloadSession}
              />
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 13 }}>Select a package</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 18px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ minWidth: 0, flex: 1, fontSize: 11, color: "var(--text-dim)", overflow: "hidden" }}>
            {data.data?.diagnostics.length ? (
              <span
                title={data.data.diagnostics.map((d) => `${d.type}: ${d.source ? `${d.source}: ` : ""}${d.message}`).join("\n")}
                style={{ color: data.data.diagnostics.some((d) => d.type === "error") ? "#ef4444" : "#d97706" }}
              >
                {data.data.diagnostics.length} diagnostic{data.data.diagnostics.length === 1 ? "" : "s"}
              </span>
            ) : (
              <span>
                {data.data ? `${data.data.totals.extensions} ext · ${data.data.totals.skills} skills · ${data.data.totals.prompts} prompts · ${data.data.totals.themes} themes` : ""}
              </span>
            )}
          </div>
          <button onClick={() => void data.loadPlugins()} disabled={data.loading || data.busyKey !== null} style={buttonStyle(data.loading || data.busyKey !== null)}>Refresh</button>
          <button onClick={onClose} style={buttonStyle(false)}>Close</button>
        </div>
      </div>
    </div>
  );
}