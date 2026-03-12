// Event log utilities for the simulation

import { SimulationState, SimEvent, SimEventType } from '../engine/types';
import { formatSimTime } from '../engine/tick';

// Get events filtered by type
export function getEventsByType(state: SimulationState, type: SimEventType): SimEvent[] {
  return state.eventLog.filter(e => e.type === type);
}

// Get events for a specific guild
export function getGuildEvents(state: SimulationState, guildName: string): SimEvent[] {
  return state.eventLog.filter(e => e.guild === guildName);
}

// Get events for a specific territory
export function getTerritoryEvents(state: SimulationState, territoryName: string): SimEvent[] {
  return state.eventLog.filter(e => e.territory === territoryName);
}

// Get recent events (last N)
export function getRecentEvents(state: SimulationState, count: number = 50): SimEvent[] {
  return state.eventLog.slice(-count);
}

// Format an event for display
export function formatEvent(event: SimEvent): string {
  const time = formatSimTime(event.timestamp);
  return `[${time}] ${event.message}`;
}

// Get event icon/emoji based on type
export function getEventIcon(type: SimEventType): string {
  switch (type) {
    case 'territory_captured': return 'flag';
    case 'attack_queued': return 'swords';
    case 'attack_cancelled': return 'cancel';
    case 'war_started': return 'battle';
    case 'war_ended': return 'shield';
    case 'upgrade_changed': return 'arrow-up';
    case 'hq_moved': return 'home';
    case 'resources_taxed': return 'coins';
    case 'ai_decision': return 'brain';
    case 'pity_expired': return 'clock';
    case 'territory_drained': return 'warning';
    default: return 'info';
  }
}

// Get event severity for styling
export function getEventSeverity(type: SimEventType): 'info' | 'warning' | 'success' | 'danger' {
  switch (type) {
    case 'territory_captured': return 'success';
    case 'attack_queued': return 'warning';
    case 'war_started': return 'danger';
    case 'war_ended': return 'info';
    case 'territory_drained': return 'danger';
    case 'ai_decision': return 'info';
    default: return 'info';
  }
}
