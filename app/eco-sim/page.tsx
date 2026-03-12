"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { coordToPixel } from "@/lib/utils";
import { TerritoryVerboseData } from "@/lib/connection-calculator";
import { parseTerritoryData, TerritoryData, getPrimaryResource } from "@/lib/eco-sim/data/territories";
import { useRouter } from "next/navigation";

interface SetupState {
  playerGuild: {
    name: string;
    prefix: string;
    color: string;
    territories: string[];
    hq: string;
  };
  aiGuild: {
    name: string;
    prefix: string;
    color: string;
    territories: string[];
    hq: string;
    role: "attacker" | "defender";
    difficulty: "easy" | "medium" | "hard";
  };
  allies: string[];
  speed: number;
  selectingFor: "player" | "ai";
}

const RESOURCE_COLORS: Record<string, string> = {
  ore: "#B0BEC5",
  crop: "#FFEB3B",
  wood: "#8D6E63",
  fish: "#2196F3",
};

export default function EcoSimSetupPage() {
  const router = useRouter();
  const [territoryData, setTerritoryData] = useState<Record<string, TerritoryData>>({});
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<SetupState>({
    playerGuild: { name: "The Aquarium", prefix: "TAq", color: "#2563eb", territories: [], hq: "" },
    aiGuild: { name: "Enemy Guild", prefix: "AI", color: "#ef4444", territories: [], hq: "", role: "attacker", difficulty: "medium" },
    allies: [],
    speed: 1,
    selectingFor: "player",
  });

  // Map interaction state
  const [scale, setScale] = useState(0.15);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredTerritory, setHoveredTerritory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load territory data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/territories_verbose.json");
        const raw: Record<string, TerritoryVerboseData> = await res.json();
        setTerritoryData(parseTerritoryData(raw));
      } catch (err) {
        console.error("Failed to load territory data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleTerritoryClick = useCallback((name: string) => {
    setSetup(prev => {
      const next = { ...prev };
      const target = prev.selectingFor === "player" ? "playerGuild" : "aiGuild";
      const other = prev.selectingFor === "player" ? "aiGuild" : "playerGuild";

      // Can't select if the other side owns it
      if (prev[other].territories.includes(name)) return prev;

      const guild = { ...prev[target] };
      if (guild.territories.includes(name)) {
        // Deselect
        guild.territories = guild.territories.filter(t => t !== name);
        if (guild.hq === name) guild.hq = guild.territories[0] || "";
      } else {
        // Select
        guild.territories = [...guild.territories, name];
        if (!guild.hq) guild.hq = name;
      }

      return { ...next, [target]: guild };
    });
  }, []);

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

  const canStart = setup.playerGuild.territories.length > 0 &&
    setup.playerGuild.hq &&
    setup.aiGuild.territories.length > 0 &&
    setup.aiGuild.hq;

  const handleStart = () => {
    if (!canStart) return;
    // Store setup in sessionStorage for the sim page
    sessionStorage.setItem("eco-sim-setup", JSON.stringify(setup));
    router.push("/eco-sim/sim");
  };

  // Compute territory colors for the map
  const getTerritoryFill = (name: string) => {
    if (setup.playerGuild.territories.includes(name)) {
      return setup.playerGuild.hq === name ? setup.playerGuild.color : setup.playerGuild.color + "99";
    }
    if (setup.aiGuild.territories.includes(name)) {
      return setup.aiGuild.hq === name ? setup.aiGuild.color : setup.aiGuild.color + "99";
    }
    if (hoveredTerritory === name) {
      return setup.selectingFor === "player" ? setup.playerGuild.color + "44" : setup.aiGuild.color + "44";
    }
    return "rgba(255,255,255,0.08)";
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-primary)" }}>
        Loading territory data...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 70px)", overflow: "hidden" }}>
      {/* Left panel - Setup controls */}
      <div style={{
        width: "360px",
        minWidth: "360px",
        background: "var(--bg-secondary, #1e293b)",
        borderRight: "1px solid var(--border-color, #334155)",
        padding: "1.5rem",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}>
        <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700 }}>
          Economy Simulator
        </h2>
        <p style={{ margin: 0, color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem" }}>
          Click territories on the map to claim them. Set one as HQ.
        </p>

        {/* Selecting for toggle */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["player", "ai"] as const).map(side => (
            <button
              key={side}
              onClick={() => setSetup(p => ({ ...p, selectingFor: side }))}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: setup.selectingFor === side
                  ? (side === "player" ? setup.playerGuild.color : setup.aiGuild.color)
                  : "var(--border-color, #334155)",
                background: setup.selectingFor === side
                  ? (side === "player" ? setup.playerGuild.color + "22" : setup.aiGuild.color + "22")
                  : "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontWeight: setup.selectingFor === side ? 700 : 400,
                fontSize: "0.875rem",
              }}
            >
              {side === "player" ? "Your Guild" : "AI Guild"}
            </button>
          ))}
        </div>

        {/* Player Guild config */}
        <fieldset style={{
          border: `1px solid ${setup.playerGuild.color}44`,
          borderRadius: "8px",
          padding: "1rem",
          margin: 0,
        }}>
          <legend style={{ color: setup.playerGuild.color, fontWeight: 600, padding: "0 8px" }}>Your Guild</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                placeholder="Guild Name"
                value={setup.playerGuild.name}
                onChange={e => setSetup(p => ({ ...p, playerGuild: { ...p.playerGuild, name: e.target.value } }))}
                style={inputStyle}
              />
              <input
                placeholder="Prefix"
                value={setup.playerGuild.prefix}
                onChange={e => setSetup(p => ({ ...p, playerGuild: { ...p.playerGuild, prefix: e.target.value } }))}
                style={{ ...inputStyle, width: "70px", flex: "none" }}
              />
              <input
                type="color"
                value={setup.playerGuild.color}
                onChange={e => setSetup(p => ({ ...p, playerGuild: { ...p.playerGuild, color: e.target.value } }))}
                style={{ width: "36px", height: "36px", border: "none", borderRadius: "6px", cursor: "pointer", padding: 0 }}
              />
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>
              Territories: {setup.playerGuild.territories.length} | HQ: {setup.playerGuild.hq || "None"}
            </div>
            {setup.playerGuild.territories.length > 0 && (
              <select
                value={setup.playerGuild.hq}
                onChange={e => setSetup(p => ({ ...p, playerGuild: { ...p.playerGuild, hq: e.target.value } }))}
                style={inputStyle}
              >
                {setup.playerGuild.territories.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
        </fieldset>

        {/* AI Guild config */}
        <fieldset style={{
          border: `1px solid ${setup.aiGuild.color}44`,
          borderRadius: "8px",
          padding: "1rem",
          margin: 0,
        }}>
          <legend style={{ color: setup.aiGuild.color, fontWeight: 600, padding: "0 8px" }}>AI Guild</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                placeholder="Guild Name"
                value={setup.aiGuild.name}
                onChange={e => setSetup(p => ({ ...p, aiGuild: { ...p.aiGuild, name: e.target.value } }))}
                style={inputStyle}
              />
              <input
                placeholder="Prefix"
                value={setup.aiGuild.prefix}
                onChange={e => setSetup(p => ({ ...p, aiGuild: { ...p.aiGuild, prefix: e.target.value } }))}
                style={{ ...inputStyle, width: "70px", flex: "none" }}
              />
              <input
                type="color"
                value={setup.aiGuild.color}
                onChange={e => setSetup(p => ({ ...p, aiGuild: { ...p.aiGuild, color: e.target.value } }))}
                style={{ width: "36px", height: "36px", border: "none", borderRadius: "6px", cursor: "pointer", padding: 0 }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <select
                value={setup.aiGuild.role}
                onChange={e => setSetup(p => ({ ...p, aiGuild: { ...p.aiGuild, role: e.target.value as "attacker" | "defender" } }))}
                style={{ ...inputStyle, flex: 1 }}
              >
                <option value="attacker">AI Attacker</option>
                <option value="defender">AI Defender</option>
              </select>
              <select
                value={setup.aiGuild.difficulty}
                onChange={e => setSetup(p => ({ ...p, aiGuild: { ...p.aiGuild, difficulty: e.target.value as "easy" | "medium" | "hard" } }))}
                style={{ ...inputStyle, flex: 1 }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>
              Territories: {setup.aiGuild.territories.length} | HQ: {setup.aiGuild.hq || "None"}
            </div>
            {setup.aiGuild.territories.length > 0 && (
              <select
                value={setup.aiGuild.hq}
                onChange={e => setSetup(p => ({ ...p, aiGuild: { ...p.aiGuild, hq: e.target.value } }))}
                style={inputStyle}
              >
                {setup.aiGuild.territories.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
        </fieldset>

        {/* Speed */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.875rem", minWidth: "45px" }}>Speed:</span>
          {[1, 2, 5, 10].map(s => (
            <button
              key={s}
              onClick={() => setSetup(p => ({ ...p, speed: s }))}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: setup.speed === s ? "1px solid #2563eb" : "1px solid var(--border-color, #334155)",
                background: setup.speed === s ? "#2563eb22" : "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontWeight: setup.speed === s ? 700 : 400,
                fontSize: "0.875rem",
              }}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!canStart}
          style={{
            padding: "12px 24px",
            borderRadius: "8px",
            border: "none",
            background: canStart
              ? "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)"
              : "#334155",
            color: canStart ? "white" : "#64748b",
            cursor: canStart ? "pointer" : "not-allowed",
            fontWeight: 700,
            fontSize: "1rem",
            marginTop: "auto",
          }}
        >
          Start Simulation
        </button>
      </div>

      {/* Right side - Map */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          cursor: isDragging ? "grabbing" : "grab",
          background: "#0f172a",
          position: "relative",
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
          {/* Map background */}
          <image href="/fruma_map.png" width="4262" height="6644" />

          {/* Territory rectangles */}
          {Object.entries(territoryData).map(([name, data]) => {
            const [px1, py1] = coordToPixel(data.location.start);
            const [px2, py2] = coordToPixel(data.location.end);
            const x = Math.min(px1, px2);
            const y = Math.min(py1, py2);
            const w = Math.abs(px2 - px1);
            const h = Math.abs(py2 - py1);

            const isPlayerHQ = setup.playerGuild.hq === name;
            const isAIHQ = setup.aiGuild.hq === name;

            return (
              <g key={name}>
                <rect
                  x={x} y={y} width={w} height={h}
                  fill={getTerritoryFill(name)}
                  stroke={isPlayerHQ || isAIHQ ? "#fff" : "rgba(255,255,255,0.2)"}
                  strokeWidth={isPlayerHQ || isAIHQ ? 3 : 1}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleTerritoryClick(name)}
                  onMouseEnter={() => setHoveredTerritory(name)}
                  onMouseLeave={() => setHoveredTerritory(null)}
                />
                {/* Territory name label */}
                {scale > 0.08 && (
                  <text
                    x={x + w / 2}
                    y={y + h / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={Math.max(8, 12 / scale)}
                    fontWeight={500}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {name.length > 15 ? name.slice(0, 13) + "..." : name}
                  </text>
                )}
                {/* HQ indicator */}
                {(isPlayerHQ || isAIHQ) && (
                  <text
                    x={x + w / 2}
                    y={y + h / 2 + 16 / scale}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize={Math.max(8, 10 / scale)}
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

        {/* Hover tooltip */}
        {hoveredTerritory && territoryData[hoveredTerritory] && (
          <div style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "white",
            fontSize: "0.8rem",
            pointerEvents: "none",
            zIndex: 10,
          }}>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>{hoveredTerritory}</div>
            <div>Emeralds: {territoryData[hoveredTerritory].baseProduction.emeralds}/hr</div>
            <div>Ore: {territoryData[hoveredTerritory].baseProduction.ore}/hr</div>
            <div>Crop: {territoryData[hoveredTerritory].baseProduction.crop}/hr</div>
            <div>Wood: {territoryData[hoveredTerritory].baseProduction.wood}/hr</div>
            <div>Fish: {territoryData[hoveredTerritory].baseProduction.fish}/hr</div>
            <div style={{ marginTop: "4px", color: "#94a3b8" }}>
              Connections: {territoryData[hoveredTerritory].tradingRoutes.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid var(--border-color, #334155)",
  background: "var(--bg-primary, #0f172a)",
  color: "var(--text-primary, #e2e8f0)",
  fontSize: "0.875rem",
  outline: "none",
};
