"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

export interface SettingsGroup {
  id: string;
  label: string;
  items: { id: string; primary: string; secondary?: ReactNode; icon?: ReactNode; selected: boolean; onClick: () => void; disabled?: boolean }[];
}

export interface SettingsViewProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  filterValue?: string;
  filterOptions?: { id: string; label: string }[];
  onFilterChange?: (id: string) => void;
  groups: SettingsGroup[];
  emptyMessage?: ReactNode;
  footer?: ReactNode;
  detail: ReactNode;
  hasSelection: boolean;
  onBackToList?: () => void;
  addButton?: ReactNode;
  width?: number;
  detailPadding?: number;
}

export function SettingsView({
  title,
  subtitle,
  actions,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filterValue,
  filterOptions,
  onFilterChange,
  groups,
  emptyMessage,
  footer,
  detail,
  hasSelection,
  onBackToList,
  addButton,
  width,
  detailPadding,
}: SettingsViewProps) {
  const isMobile = useIsMobile();
  const [listVisibleMobile, setListVisibleMobile] = useState(true);

  useEffect(() => {
    if (!isMobile && listVisibleMobile) setListVisibleMobile(true);
  }, [isMobile, listVisibleMobile]);

  useEffect(() => {
    if (!hasSelection) setListVisibleMobile(true);
  }, [hasSelection]);

  const sidebarStyle: CSSProperties = useMemo(() => ({
    width: isMobile ? "100%" : width ?? 240,
    flexShrink: 0,
    background: "var(--bg-panel)",
    borderRight: isMobile ? "none" : "1px solid var(--border)",
    borderBottom: isMobile ? "1px solid var(--border)" : "none",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  }), [isMobile, width]);

  const handleSelect = (onClick: () => void) => {
    onClick();
    if (isMobile) setListVisibleMobile(false);
  };

  const handleBack = () => {
    setListVisibleMobile(true);
    onBackToList?.();
  };

  const showList = !isMobile || listVisibleMobile;

  return (
    <>
      <div style={sidebarStyle}>
        {(searchPlaceholder || filterOptions) && (
          <div style={{ padding: "8px 8px 6px", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {searchPlaceholder && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 7px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-dim)", flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={searchValue ?? ""}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder={searchPlaceholder}
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--text)", fontSize: 12 }}
                />
              </div>
            )}
            {filterOptions && (
              <div style={{ display: "flex", gap: 4 }}>
                {filterOptions.map((opt) => {
                  const active = (filterValue ?? filterOptions[0].id) === opt.id;
                  return (
                    <button key={opt.id} onClick={() => onFilterChange?.(opt.id)} style={{
                      flex: 1, padding: "4px 6px", fontSize: 11, borderRadius: 4, border: "1px solid var(--border)",
                      background: active ? "var(--bg-selected)" : "none",
                      color: active ? "var(--text)" : "var(--text-muted)", cursor: "pointer",
                    }}>{opt.label}</button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "6px" }}>
          {groups.every((g) => g.items.length === 0) ? (
            <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--text-dim)", textAlign: "center" }}>
              {emptyMessage ?? "Nothing here yet"}
            </div>
          ) : (
            groups.map((g) => g.items.length === 0 ? null : (
              <div key={g.id} style={{ marginBottom: 8 }}>
                <div style={{ padding: "4px 8px 3px", fontSize: 10, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{g.label}</div>
                {g.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => !item.disabled && handleSelect(item.onClick)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "7px 8px", borderRadius: 5,
                      cursor: item.disabled ? "not-allowed" : "pointer",
                      background: item.selected ? "var(--bg-selected)" : "none",
                      opacity: item.disabled ? 0.55 : 1,
                    }}
                    onMouseEnter={(e) => { if (!item.selected && !item.disabled) e.currentTarget.style.background = "var(--bg-hover)"; }}
                    onMouseLeave={(e) => { if (!item.selected) e.currentTarget.style.background = "none"; }}
                  >
                    {item.icon}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontFamily: "var(--font-mono)",
                        fontWeight: item.selected ? 600 : 400,
                        color: item.disabled ? "var(--text-dim)" : "var(--text)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{item.primary}</div>
                      {item.secondary && (
                        <div style={{
                          fontSize: 10, color: "var(--text-dim)", marginTop: 2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{item.secondary}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {addButton && (
          <div style={{ borderTop: "1px solid var(--border)", padding: "8px 8px", flexShrink: 0 }}>
            {addButton}
          </div>
        )}
      </div>

      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: detailPadding ?? 20,
        display: isMobile && !showList ? "flex" : "block",
        flexDirection: "column",
        minHeight: 0,
      }}>
        {isMobile && !showList && (
          <button
            onClick={handleBack}
            style={{
              alignSelf: "flex-start",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 9px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderRadius: 5,
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        )}
        {detail ?? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 13 }}>
            Select an item to see details
          </div>
        )}
      </div>

      {footer && (
        <div style={{
          position: isMobile ? "sticky" : "static",
          bottom: 0,
          padding: "10px 20px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg)",
          flexShrink: 0,
        }}>{footer}</div>
      )}
    </>
  );
}

export function SettingsHeader({
  title, subtitle, actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  void title; void subtitle; void actions;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>{title}</div>
        {subtitle && <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-dim)" }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

export function SettingSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{title}</div>
      {children}
    </section>
  );
}

export function SettingCard({ title, subtitle, children, onClick, trailing }: {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 16px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        cursor: interactive ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        transition: interactive ? "border-color 0.12s, background 0.12s" : undefined,
      }}
      onMouseEnter={interactive ? (e) => { e.currentTarget.style.borderColor = "var(--accent)"; } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.borderColor = "var(--border)"; } : undefined}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.5 }}>{subtitle}</div>}
        {children}
      </div>
      {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
    </div>
  );
}