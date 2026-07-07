"use client";

import { useEffect, useRef, useState } from "react";
import { sendAgentCommand } from "@/lib/agent-client";
import type { PluginPackageInfo, PluginsResponse } from "@/app/api/plugins/route";

export type PluginScope = PluginPackageInfo["scope"];
export type PluginAction = "install" | "remove" | "update" | "disable" | "enable";

export function shortenPath(path: string): string {
  return path.replace(/^\/(?:Users|home)\/[^/]+/, "~");
}

export function packageKey(pkg: Pick<PluginPackageInfo, "source" | "scope">): string {
  return `${pkg.scope}\0${pkg.source}`;
}

export function resourceSummary(pkg: PluginPackageInfo): string {
  if (pkg.disabled) return "Disabled";
  const parts = [
    pkg.counts.extensions ? `${pkg.counts.extensions} ext` : "",
    pkg.counts.skills ? `${pkg.counts.skills} skills` : "",
    pkg.counts.prompts ? `${pkg.counts.prompts} prompts` : "",
    pkg.counts.themes ? `${pkg.counts.themes} themes` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No resources";
}

export function versionSummary(pkg: PluginPackageInfo): string {
  const parts = [];
  if (pkg.version) parts.push(`installed ${pkg.version}`);
  if (pkg.configuredVersion) parts.push(`configured ${pkg.configuredVersion}`);
  return parts.length ? parts.join(" · ") : "Unknown";
}

export function installLocation(scope: PluginScope, cwd: string): string {
  return scope === "project"
    ? `${shortenPath(cwd)}/.pi/agent/{npm,git}`
    : "~/.pi/agent/{npm,git}";
}

export function findInstalledPackage(
  packages: PluginPackageInfo[],
  source: string,
  scope: PluginScope,
): PluginPackageInfo | undefined {
  const trimmed = source.trim();
  const withoutNpmPrefix = trimmed.startsWith("npm:") ? trimmed.slice(4) : trimmed;
  return packages.find((pkg) => pkg.scope === scope && pkg.source === trimmed)
    ?? packages.find((pkg) => pkg.scope === scope && pkg.source === `npm:${withoutNpmPrefix}`)
    ?? packages.find((pkg) => pkg.scope === scope && pkg.source.endsWith(trimmed));
}

export function statusColor(status: PluginPackageInfo["status"]): string {
  if (status === "loaded") return "var(--accent)";
  if (status === "installed") return "#f59e0b";
  if (status === "disabled") return "var(--text-dim)";
  return "#ef4444"; // missing / unknown
}

export function ResourceList({ pkg }: { pkg: PluginPackageInfo }) {
  const groups = ([
    ["extension", "Extensions"],
    ["skill", "Skills"],
    ["prompt", "Prompts"],
    ["theme", "Themes"],
  ] as const)
    .map(([kind, label]) => ({
      kind,
      label,
      resources: pkg.resources.filter((r) => r.kind === kind),
    }))
    .filter((g) => g.resources.length > 0);

  if (groups.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
        {pkg.disabled ? "Package disabled" : "No resolved resources"}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {groups.map((group, groupIndex) => (
        <div key={group.kind} style={{ borderTop: groupIndex === 0 ? "none" : "1px solid var(--border)", paddingTop: groupIndex === 0 ? 0 : 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>
            {group.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {group.resources.map((resource) => (
              <div key={`${resource.kind}:${resource.path}`} style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--text)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={resource.path}>
                  {resource.name}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }} title={resource.path}>
                  {resource.relativePath}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScopeTag({ scope }: { scope: PluginScope }) {
  return (
    <span style={{
      fontSize: 10, padding: "1px 5px", borderRadius: 3, flexShrink: 0,
      background: scope === "project" ? "rgba(99,102,241,0.12)" : "rgba(120,120,120,0.12)",
      color: scope === "project" ? "rgba(99,102,241,0.85)" : "var(--text-dim)",
    }}>
      {scope}
    </span>
  );
}

export function buttonStyle(disabled?: boolean, danger?: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    background: danger ? "rgba(239,68,68,0.08)" : "none",
    border: "1px solid var(--border)",
    borderRadius: 6,
    color: danger ? "#ef4444" : "var(--text-muted)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 12,
    opacity: disabled ? 0.5 : 1,
  };
}

export function Toggle({ enabled, loading, onToggle, label }: { enabled: boolean; loading: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" onClick={onToggle} disabled={loading} title={label} aria-label={label} aria-pressed={enabled} style={{
      flexShrink: 0, width: 40, height: 22, borderRadius: 11, border: "none", padding: 0,
      cursor: loading ? "wait" : "pointer",
      background: enabled ? "var(--accent)" : "var(--border)",
      position: "relative", transition: "background 0.18s", outline: "none",
      opacity: loading ? 0.65 : 1,
    }}>
      <span style={{
        position: "absolute", top: 3, left: enabled ? 21 : 3, width: 16, height: 16,
        borderRadius: "50%", background: "var(--bg)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
        transition: "left 0.18s cubic-bezier(.4,0,.2,1)",
      }} />
    </button>
  );
}

export function SegmentedScope({ value, onChange }: { value: PluginScope; onChange: (scope: PluginScope) => void }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden", height: 30 }}>
      {(["global", "project"] as PluginScope[]).map((scope) => {
        const active = value === scope;
        return (
          <button key={scope} onClick={() => onChange(scope)} style={{
            width: 76, border: "none",
            borderRight: scope === "global" ? "1px solid var(--border)" : "none",
            background: active ? "var(--bg-selected)" : "none",
            color: active ? "var(--text)" : "var(--text-muted)",
            cursor: "pointer", fontSize: 12,
          }}>{scope}</button>
        );
      })}
    </div>
  );
}

export function AddPluginPanel({
  cwd, source, scope, busy, actionError, onSourceChange, onScopeChange, onInstall,
}: {
  cwd: string;
  source: string;
  scope: PluginScope;
  busy: boolean;
  actionError: string | null;
  onSourceChange: (value: string) => void;
  onScopeChange: (scope: PluginScope) => void;
  onInstall: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const examples = ["npm:@scope/pi-plugin", "git:https://github.com/user/repo", "/absolute/path/to/plugin"];

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 660, minHeight: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Add Plugin</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{installLocation(scope, cwd)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <label htmlFor="plugin-source" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Source</label>
        <input
          id="plugin-source"
          ref={inputRef}
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          placeholder="npm:@scope/package"
          style={{ width: "100%", height: 36, padding: "0 11px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-panel)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13, outline: "none" }}
          onKeyDown={(e) => { if (e.key === "Enter" && source.trim() && !busy) onInstall(); }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <SegmentedScope value={scope} onChange={onScopeChange} />
        <button
          type="button"
          onClick={onInstall}
          disabled={busy || !source.trim()}
          style={{ ...buttonStyle(busy || !source.trim()), background: "var(--accent)", color: "white", borderColor: "var(--accent)" }}
        >
          {busy ? "Installing..." : "Install"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Examples</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => onSourceChange(example)} style={{
              width: "100%", minHeight: 30, textAlign: "left", padding: "6px 9px",
              border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-panel)",
              color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-panel)"; e.currentTarget.style.color = "var(--text-dim)"; }}>
              {example}
            </button>
          ))}
        </div>
      </div>
      {actionError && <div style={{ fontSize: 12, color: "#ef4444", whiteSpace: "pre-wrap" }}>{actionError}</div>}
    </div>
  );
}

export function PackageDetail({
  pkg, cwd, busyKey, actionError, actionMessage, sessionId, onAction, onReloadSession,
}: {
  pkg: PluginPackageInfo;
  cwd: string;
  busyKey: string | null;
  actionError: string | null;
  actionMessage: string | null;
  sessionId: string | null;
  onAction: (action: PluginAction, pkg: PluginPackageInfo) => void;
  onReloadSession: () => void;
}) {
  const key = packageKey(pkg);
  const busy = busyKey?.endsWith(key) ?? false;
  const reloadBusy = busyKey === "reload";
  const enabled = !pkg.disabled;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 680 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, minWidth: 0, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 180, flex: 1 }}>
          <Toggle enabled={enabled} loading={busy || reloadBusy} onToggle={() => onAction(pkg.disabled ? "enable" : "disable", pkg)} label={pkg.disabled ? "Enable package" : "Disable package"} />
          <ScopeTag scope={pkg.scope} />
          {pkg.disabled ? (
            <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "rgba(120,120,120,0.12)", color: "var(--text-dim)" }}>disabled</span>
          ) : pkg.filtered && (
            <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "rgba(245,158,11,0.12)", color: "#d97706" }}>filtered</span>
          )}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pkg.source}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => onAction("update", pkg)} disabled={busy || reloadBusy} style={buttonStyle(busy || reloadBusy)}>
            {busyKey === `update:${key}` ? "Updating..." : "Update"}
          </button>
          <button onClick={onReloadSession} disabled={!sessionId || reloadBusy || busy} style={buttonStyle(!sessionId || reloadBusy || busy)} title={sessionId ? "Reload current session" : "Open a session to reload"}>
            {reloadBusy ? "Reloading..." : "Reload session"}
          </button>
          <button onClick={() => onAction("remove", pkg)} disabled={busy || reloadBusy} style={buttonStyle(busy || reloadBusy, true)}>
            {busyKey === `remove:${key}` ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(96px, 130px) minmax(0, 1fr)", gap: "9px 14px", fontSize: 12, lineHeight: 1.45 }}>
        <div style={{ color: "var(--text-dim)" }}>Status</div>
        <div style={{ color: statusColor(pkg.status), textTransform: "capitalize" }}>{pkg.status}</div>
        <div style={{ color: "var(--text-dim)" }}>Version</div>
        <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{versionSummary(pkg)}</div>
        <div style={{ color: "var(--text-dim)" }}>Package</div>
        <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", overflowWrap: "anywhere" }}>{pkg.packageName ?? "Unknown"}</div>
        <div style={{ color: "var(--text-dim)" }}>Resources</div>
        <div style={{ color: "var(--text-muted)" }}>{resourceSummary(pkg)}</div>
        <div style={{ color: "var(--text-dim)" }}>Installed path</div>
        <div style={{ color: pkg.installedPath ? "var(--text-muted)" : "#ef4444", fontFamily: "var(--font-mono)", overflowWrap: "anywhere" }}>{pkg.installedPath ? shortenPath(pkg.installedPath) : "Not found"}</div>
        <div style={{ color: "var(--text-dim)" }}>Cwd</div>
        <div style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", overflowWrap: "anywhere" }}>{shortenPath(cwd)}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Resolved Resources</div>
        <ResourceList pkg={pkg} />
      </div>

      {actionMessage && <div style={{ fontSize: 12, color: "#16a34a" }}>{actionMessage}</div>}
      {actionError && <div style={{ fontSize: 12, color: "#ef4444", whiteSpace: "pre-wrap" }}>{actionError}</div>}
    </div>
  );
}

export function usePluginsData(cwd: string, sessionId: string | null, onReloaded?: () => void) {
  const [data, setData] = useState<PluginsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [installSource, setInstallSource] = useState("");
  const [installScope, setInstallScope] = useState<PluginScope>("global");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadPlugins = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plugins?cwd=${encodeURIComponent(cwd)}`);
      const next = (await res.json()) as PluginsResponse & { error?: string };
      if (!res.ok || next.error) throw new Error(next.error ?? `HTTP ${res.status}`);
      setData(next);
      setAddMode((current) => next.packages.length === 0 || current);
      setSelected((current) => {
        if (current && next.packages.some((pkg) => packageKey(pkg) === current)) return current;
        return next.packages[0] ? packageKey(next.packages[0]) : null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action: PluginAction, pkg: PluginPackageInfo) => {
    const key = packageKey(pkg);
    setBusyKey(`${action}:${key}`);
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, source: pkg.source, scope: pkg.scope, cwd }),
      });
      const next = (await res.json()) as PluginsResponse & { error?: string };
      if (!res.ok || next.error) throw new Error(next.error ?? `HTTP ${res.status}`);
      setData(next);
      if (action === "remove") {
        setSelected(next.packages[0] ? packageKey(next.packages[0]) : null);
        if (next.packages.length === 0) setAddMode(true);
        setActionMessage("Package removed.");
      } else {
        const messages: Record<Exclude<PluginAction, "remove">, string> = {
          install: "Package installed.",
          update: "Package updated.",
          disable: "Package disabled.",
          enable: "Package enabled.",
        };
        setActionMessage(messages[action]);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyKey(null);
    }
  };

  const installPlugin = async () => {
    const source = installSource.trim();
    if (!source) return;
    const key = `${installScope}\0${source}`;
    setBusyKey(`install:${key}`);
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", source, scope: installScope, cwd }),
      });
      const next = (await res.json()) as PluginsResponse & { error?: string };
      if (!res.ok || next.error) throw new Error(next.error ?? `HTTP ${res.status}`);
      setData(next);
      const installed = findInstalledPackage(next.packages, source, installScope);
      setSelected(installed ? packageKey(installed) : key);
      setAddMode(false);
      setInstallSource("");
      setActionMessage("Package installed.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyKey(null);
    }
  };

  const reloadSession = async () => {
    if (!sessionId) return;
    setBusyKey("reload");
    setActionError(null);
    setActionMessage(null);
    try {
      await sendAgentCommand(sessionId, { type: "reload" });
      onReloaded?.();
      await loadPlugins();
      setActionMessage("Session reloaded.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyKey(null);
    }
  };

  return {
    data, loading, error,
    selected, setSelected,
    addMode, setAddMode,
    installSource, setInstallSource,
    installScope, setInstallScope,
    busyKey,
    actionError, setActionError,
    actionMessage, setActionMessage,
    loadPlugins, runAction, installPlugin, reloadSession,
  };
}