"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { coordToPixel } from "@/lib/utils";
import { TerritoryVerboseData } from "@/lib/connection-calculator";
import { parseTerritoryData, TerritoryData } from "@/lib/eco-sim/data/territories";
import { SimulationState, SimTerritory, RESOURCE_KEYS, ResourceKey, SimSetupConfig } from "@/lib/eco-sim/engine/types";
import { createInitialState } from "@/lib/eco-sim/engine/state";
import { SimulationRunner } from "@/lib/eco-sim/sim/runner";
import { formatSimTime } from "@/lib/eco-sim/engine/tick";
import { getEffectiveProduction, getNetProduction, getGuildTotalProduction, getGuildTotalCosts, getGuildTotalStored } from "@/lib/eco-sim/engine/economy";
import { canAttack, initiateAttack } from "@/lib/eco-sim/engine/combat";
import { applyUpgrade, applyDowngrade, getUpgradeInfo, moveHQ, UpgradeKey } from "@/lib/eco-sim/engine/upgrades";
import { getRecentEvents, formatEvent, getEventSeverity } from "@/lib/eco-sim/sim/events";

const RESOURCE_ICONS: Record<ResourceKey, string> = {
  emeralds: "E",
  ore: "O",
  crop: "C",
  wood: "W",
  fish: "F",
};

const RESOURCE_COLORS: Record<ResourceKey, string> = {
  emeralds: "#4CAF50",
  ore: "#B0BEC5",
  crop: "#FFEB3B",
  wood: "#8D6E63",
  fish: "#2196F3",
};

export default function EcoSimPage() {
  const router = useRouter();
  const [territoryData, setTerritoryData] = useState<Record<string, TerritoryData>>({});
  const [state, setState] = useState<SimulationState | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [frameCount, setFrameCount] = useState(0);
  const runnerRef = useRef<SimulationRunner | null>(null);

  // Map state
  const [scale, setScale] = useState(0.15);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Initialize
  useEffect(() => {
    async function init() {
      try {
        // Load setup config
        const setupJson = sessionStorage.getItem("eco-sim-setup");
        if (!setupJson) {
          router.push("/eco-sim");
          return;
        }
        const setup = JSON.parse(setupJson);

        // Load territory data
        const res = await fetch("/territories_verbose.json");
        const raw: Record<string, TerritoryVerboseData> = await res.json();
        const tData = parseTerritoryData(raw);
        setTerritoryData(tData);

        // Create initial state
        const config: SimSetupConfig = {
          playerGuild: setup.playerGuild,
          aiGuild: setup.aiGuild,
          allies: setup.allies || [],
          speed: setup.speed || 1,
        };

        const initialState = createInitialState(config, tData);
        setState(initialState);

        // Create runner
        const runner = new SimulationRunner(initialState);
        runnerRef.current = runner;

        // Subscribe to updates (throttled to ~20fps for rendering)
        let lastRender = 0;
        runner.subscribe((s) => {
          const now = performance.now();
          if (now - lastRender > 50) {
            lastRender = now;
            setState({ ...s });
            setFrameCount(f => f + 1);
          }
        });
      } catch (err) {
        console.error("Failed to initialize simulation:", err);
      } finally {
        setLoading(false);
      }
    }
    init();

    return () => {
      runnerRef.current?.destroy();
    };
  }, [router]);

  // Map handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.03, Math.min(2, s * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // Action handlers
  const handleAttack = useCallback((target: string) => {
    if (!state) return;
    const runner = runnerRef.current;
    if (!runner) return;
    const s = runner.getState();
    const playerGuild = Object.values(s.guilds).find(g => !g.isAI);
    if (!playerGuild) return;
    initiateAttack(s, playerGuild.name, target);
  }, [state]);

  const handleUpgrade = useCallback((territory: string, upgrade: UpgradeKey) => {
    const runner = runnerRef.current;
    if (!runner) return;
    const s = runner.getState();
    const playerGuild = Object.values(s.guilds).find(g => !g.isAI);
    if (!playerGuild) return;
    applyUpgrade(s, territory, upgrade, playerGuild.name);
  }, []);

  const handleDowngrade = useCallback((territory: string, upgrade: UpgradeKey) => {
    const runner = runnerRef.current;
    if (!runner) return;
    const s = runner.getState();
    const playerGuild = Object.values(s.guilds).find(g => !g.isAI);
    if (!playerGuild) return;
    applyDowngrade(s, territory, upgrade, playerGuild.name);
  }, []);

  if (loading || !state) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-primary)" }}>
        Loading simulation...
      </div>
    );
  }

  const playerGuild = Object.values(state.guilds).find(g => !g.isAI);
  const aiGuild = Object.values(state.guilds).find(g => g.isAI);
  const playerName = playerGuild?.name || "";
  const aiName = aiGuild?.name || "";
  const selectedTerr = selectedTerritory ? state.territories[selectedTerritory] : null;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 70px)", overflow: "hidden", color: "var(--text-primary)" }}>
      {/* Left panel - Territory detail */}
      <div style={{
        width: "320px",
        minWidth: "320px",
        background: "var(--bg-secondary, #1e293b)",
        borderRight: "1px solid var(--border-color, #334155)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Guild overview */}
        <div style={{ padding: "12px", borderBottom: "1px solid var(--border-color, #334155)" }}>
          {playerGuild && <GuildSummary state={state} guildName={playerName} color={playerGuild.color} />}
          {aiGuild && <GuildSummary state={state} guildName={aiName} color={aiGuild.color} />}
        </div>

        {/* Selected territory */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {selectedTerr ? (
            <TerritoryDetail
              territory={selectedTerr}
              state={state}
              playerGuild={playerName}
              onUpgrade={handleUpgrade}
              onDowngrade={handleDowngrade}
              onAttack={handleAttack}
            />
          ) : (
            <div style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", textAlign: "center", marginTop: "2rem" }}>
              Click a territory on the map to view details
            </div>
          )}
        </div>
      </div>

      {/* Center - Map */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar - Time controls */}
        <div style={{
          padding: "8px 16px",
          background: "var(--bg-secondary, #1e293b)",
          borderBottom: "1px solid var(--border-color, #334155)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => {
                const runner = runnerRef.current;
                if (!runner) return;
                runner.toggle();
                setState({ ...runner.getState() });
              }}
              style={controlBtnStyle}
            >
              {state.paused ? "Play" : "Pause"}
            </button>

            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => {
                  const runner = runnerRef.current;
                  if (!runner) return;
                  runner.setSpeed(s);
                }}
                style={{
                  ...controlBtnStyle,
                  background: state.speed === s ? "#2563eb" : "transparent",
                  borderColor: state.speed === s ? "#2563eb" : "#334155",
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "monospace" }}>
            {formatSimTime(state.simTimeMs)}
          </div>

          <button
            onClick={() => {
              runnerRef.current?.destroy();
              router.push("/eco-sim");
            }}
            style={{ ...controlBtnStyle, color: "#ef4444", borderColor: "#ef444444" }}
          >
            Exit
          </button>
        </div>

        {/* Map canvas */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            cursor: isDragging ? "grabbing" : "grab",
            background: "#0f172a",
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            width="4262"
            height="6644"
            viewBox="0 0 4262 6644"
            style={{
              position: "absolute",
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "0 0",
            }}
          >
            <image href="/fruma_map.png" width="4262" height="6644" />

            {Object.entries(territoryData).map(([name, data]) => {
              const t = state.territories[name];
              if (!t) return null;
              const [px1, py1] = coordToPixel(data.location.start);
              const [px2, py2] = coordToPixel(data.location.end);
              const x = Math.min(px1, px2);
              const y = Math.min(py1, py2);
              const w = Math.abs(px2 - px1);
              const h = Math.abs(py2 - py1);

              const guildState = t.owner ? state.guilds[t.owner] : null;
              const fill = guildState ? guildState.color + (t.hq ? "cc" : "77") : "rgba(255,255,255,0.05)";
              const isSelected = selectedTerritory === name;
              const hasPity = t.pityTimerUntil > state.simTimeMs;
              const underAttack = state.attacks.some(a =>
                a.targetTerritory === name && a.status !== "completed" && a.status !== "cancelled"
              );

              return (
                <g key={name}>
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill={fill}
                    stroke={
                      isSelected ? "#fff" :
                      underAttack ? "#ef4444" :
                      hasPity ? "#fbbf24" :
                      "rgba(255,255,255,0.15)"
                    }
                    strokeWidth={isSelected ? 3 : underAttack ? 2 : 1}
                    strokeDasharray={hasPity ? "6 3" : underAttack ? "4 2" : "none"}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedTerritory(name)}
                  />
                  {scale > 0.08 && (
                    <text
                      x={x + w / 2} y={y + h / 2}
                      textAnchor="middle" dominantBaseline="central"
                      fill="white"
                      fontSize={Math.max(8, 11 / scale)}
                      fontWeight={500}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {name.length > 15 ? name.slice(0, 13) + "..." : name}
                    </text>
                  )}
                  {t.hq && (
                    <text
                      x={x + w / 2} y={y + h / 2 + 14 / scale}
                      textAnchor="middle"
                      fill="#fbbf24"
                      fontSize={Math.max(6, 9 / scale)}
                      fontWeight={700}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      HQ
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Right panel - Event log */}
      <div style={{
        width: "300px",
        minWidth: "300px",
        background: "var(--bg-secondary, #1e293b)",
        borderLeft: "1px solid var(--border-color, #334155)",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{
          padding: "12px",
          borderBottom: "1px solid var(--border-color, #334155)",
          fontWeight: 700,
          fontSize: "0.875rem",
        }}>
          Event Log
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px", display: "flex", flexDirection: "column-reverse" }}>
          {getRecentEvents(state, 100).reverse().map(event => {
            const severity = getEventSeverity(event.type);
            const severityColor = {
              info: "#94a3b8",
              warning: "#fbbf24",
              success: "#4ade80",
              danger: "#ef4444",
            }[severity];

            return (
              <div key={event.id} style={{
                padding: "6px 8px",
                fontSize: "0.75rem",
                borderLeft: `2px solid ${severityColor}`,
                marginBottom: "4px",
                color: "var(--text-secondary, #94a3b8)",
              }}>
                {formatEvent(event)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Guild summary bar
function GuildSummary({ state, guildName, color }: { state: SimulationState; guildName: string; color: string }) {
  const stored = getGuildTotalStored(state, guildName);
  const territoryCount = Object.values(state.territories).filter(t => t.owner === guildName).length;

  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: color }} />
        <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{guildName}</span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)", marginLeft: "auto" }}>
          {territoryCount} territories
        </span>
      </div>
      <div style={{ display: "flex", gap: "8px", fontSize: "0.7rem" }}>
        {RESOURCE_KEYS.map(key => (
          <span key={key} style={{ color: RESOURCE_COLORS[key] }}>
            {RESOURCE_ICONS[key]}: {Math.floor(stored[key])}
          </span>
        ))}
      </div>
    </div>
  );
}

// Territory detail panel
function TerritoryDetail({
  territory,
  state,
  playerGuild,
  onUpgrade,
  onDowngrade,
  onAttack,
}: {
  territory: SimTerritory;
  state: SimulationState;
  playerGuild: string;
  onUpgrade: (territory: string, upgrade: UpgradeKey) => void;
  onDowngrade: (territory: string, upgrade: UpgradeKey) => void;
  onAttack: (target: string) => void;
}) {
  const isOwned = territory.owner === playerGuild;
  const prod = getEffectiveProduction(territory);
  const net = getNetProduction(territory);
  const upgrades = getUpgradeInfo(territory);
  const hasPity = territory.pityTimerUntil > state.simTimeMs;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem" }}>{territory.name}</h3>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>
          Owner: {territory.owner || "Unclaimed"}
          {territory.hq && " (HQ)"}
          {hasPity && ` | Pity: ${formatSimTime(territory.pityTimerUntil - state.simTimeMs)}`}
        </div>
      </div>

      {/* Resources */}
      <div>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary, #94a3b8)" }}>
          STORAGE / PRODUCTION
        </div>
        {RESOURCE_KEYS.map(key => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "2px 0" }}>
            <span style={{ color: RESOURCE_COLORS[key] }}>
              {RESOURCE_ICONS[key]} {key}
            </span>
            <span>
              {Math.floor(territory.stored[key])}
              <span style={{ color: net[key] >= 0 ? "#4ade80" : "#ef4444", marginLeft: "8px" }}>
                {net[key] >= 0 ? "+" : ""}{Math.round(net[key])}/hr
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Attack button (if enemy territory) */}
      {territory.owner && territory.owner !== playerGuild && (
        <button
          onClick={() => onAttack(territory.name)}
          disabled={!canAttack(state, playerGuild, territory.name).ok}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "1px solid #ef4444",
            background: canAttack(state, playerGuild, territory.name).ok ? "#ef444422" : "transparent",
            color: canAttack(state, playerGuild, territory.name).ok ? "#ef4444" : "#64748b",
            cursor: canAttack(state, playerGuild, territory.name).ok ? "pointer" : "not-allowed",
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          Attack Territory
        </button>
      )}

      {/* Upgrades (if owned) */}
      {isOwned && (
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary, #94a3b8)" }}>
            UPGRADES
          </div>
          {upgrades.map(u => (
            <div key={u.key} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.75rem",
              padding: "3px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span style={{ flex: 1 }}>{u.name}</span>
              <span style={{ width: "35px", textAlign: "center", color: "var(--text-secondary, #94a3b8)" }}>
                {u.level}/{u.maxLevel}
              </span>
              <div style={{ display: "flex", gap: "2px" }}>
                <button
                  onClick={() => onDowngrade(territory.name, u.key)}
                  disabled={u.level <= 0}
                  style={upgradeBtnStyle(u.level > 0)}
                >
                  -
                </button>
                <button
                  onClick={() => onUpgrade(territory.name, u.key)}
                  disabled={u.level >= u.maxLevel}
                  style={upgradeBtnStyle(u.level < u.maxLevel)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const controlBtnStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: "6px",
  border: "1px solid var(--border-color, #334155)",
  background: "transparent",
  color: "var(--text-primary, #e2e8f0)",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.8rem",
};

function upgradeBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    width: "22px",
    height: "22px",
    borderRadius: "4px",
    border: "1px solid #33415544",
    background: enabled ? "#33415544" : "transparent",
    color: enabled ? "var(--text-primary, #e2e8f0)" : "#334155",
    cursor: enabled ? "pointer" : "not-allowed",
    fontSize: "0.75rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };
}
