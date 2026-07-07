"use client";

import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  AddSkillPanel,
  SkillDetail,
  shortenPath,
  sourceLabel,
  useSkillsData,
  type Skill,
} from "./skills/skillsShared";

export function SkillsConfig({ cwd, onClose }: { cwd: string; onClose: () => void }) {
  const isMobile = useIsMobile();
  const data = useSkillsData(cwd);
  const [selected, setSelected] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);

  useEffect(() => { data.loadSkills(); }, [cwd]);

  useEffect(() => {
    if (data.skills.length > 0 && !selected && !addMode) {
      setSelected(data.skills[0].filePath);
    }
  }, [data.skills, selected, addMode]);

  const selectedSkill: Skill | null = data.skills.find((s) => s.filePath === selected) ?? null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: isMobile ? "calc(100vw - 16px)" : 860,
          maxWidth: "calc(100vw - 16px)",
          height: isMobile ? "calc(100dvh - 16px)" : "78vh",
          maxHeight: "calc(100dvh - 16px)",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Skills</span>
            <code style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {shortenPath(cwd)}
            </code>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden" }}>
          <div style={{
            width: isMobile ? "100%" : 210,
            maxHeight: isMobile ? "40vh" : undefined,
            borderRight: isMobile ? "none" : "1px solid var(--border)",
            borderBottom: isMobile ? "1px solid var(--border)" : "none",
            display: "flex", flexDirection: "column", flexShrink: 0, background: "var(--bg-panel)",
          }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
              {data.loading ? (
                <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--text-muted)" }}>Loading…</div>
              ) : data.error ? (
                <div style={{ padding: "10px 8px", fontSize: 11, color: "#f87171" }}>{data.error}</div>
              ) : data.skills.length === 0 ? (
                <div style={{ padding: "10px 8px", fontSize: 11, color: "var(--text-dim)" }}>No skills found</div>
              ) : (
                (() => {
                  const groups: { label: string; skills: Skill[] }[] = [];
                  for (const grpLabel of ["project", "global", "path"]) {
                    const grpSkills = data.skills.filter((s) => sourceLabel(s) === grpLabel);
                    if (grpSkills.length > 0) groups.push({ label: grpLabel, skills: grpSkills });
                  }
                  return groups.map(({ label: grpLabel, skills: grpSkills }) => (
                    <div key={grpLabel} style={{ marginBottom: 6 }}>
                      <div style={{ padding: "4px 8px 3px", fontSize: 10, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{grpLabel}</div>
                      {grpSkills.map((skill) => {
                        const isSelected = !addMode && selected === skill.filePath;
                        const disabled = skill.disableModelInvocation;
                        return (
                          <div
                            key={skill.filePath}
                            onClick={() => { setSelected(skill.filePath); setAddMode(false); }}
                            style={{
                              display: "flex", alignItems: "center", gap: 7, padding: "8px 8px",
                              borderRadius: 5, cursor: "pointer",
                              background: isSelected ? "var(--bg-selected)" : "none",
                            }}
                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--bg-hover)"; }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "none"; }}
                          >
                            <span style={{
                              flexShrink: 0, width: 7, height: 7, borderRadius: "50%",
                              background: disabled ? "var(--border)" : "var(--accent)",
                              boxShadow: disabled ? "none" : "0 0 4px var(--accent)",
                              transition: "background 0.15s, box-shadow 0.15s",
                            }} />
                            <span style={{
                              fontSize: 12, fontWeight: isSelected ? 600 : 400,
                              color: disabled ? "var(--text-dim)" : "var(--text)",
                              fontFamily: "var(--font-mono)",
                              flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {skill.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()
              )}
            </div>
            <div style={{ padding: "8px 6px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <div
                onClick={() => setAddMode(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 8px",
                  borderRadius: 5, cursor: "pointer",
                  background: addMode ? "var(--bg-selected)" : "none",
                  color: addMode ? "var(--accent)" : "var(--text-dim)",
                  fontSize: 12,
                }}
                onMouseEnter={(e) => { if (!addMode) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { if (!addMode) e.currentTarget.style.background = "none"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add skill
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {addMode ? (
              <AddSkillPanel cwd={cwd} onInstalled={() => data.loadSkills()} />
            ) : data.loading ? null : selectedSkill ? (
              <SkillDetail
                key={selectedSkill.filePath}
                skill={selectedSkill}
                cwd={cwd}
                onToggle={data.toggle}
                toggling={data.toggling.has(selectedSkill.filePath)}
                saveError={data.saveError}
              />
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 13 }}>
                Select a skill
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "10px 18px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "6px 14px", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}