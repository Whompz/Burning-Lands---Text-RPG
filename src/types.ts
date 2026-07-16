export interface Character {
  name: string;
  gender: string;
  quirks: string;
  backstory: string;
  personality: string;
  appearance: string;
}

export interface InventoryItem {
  name: string;
  description: string;
  status: string; // e.g. "Fresh", "Rotting", "Brand New", "Rusted"
}

export interface NPCQuest {
  id: string;
  title: string;
  status: "available" | "active" | "completed" | "failed";
  description: string;
  reward: string;
  requiredAffinity: number;
}

export interface NPC {
  name: string;
  relationship: string; // "Archnemesis" | "Hostile" | "Suspicious" | "Neutral" | "Friendly" | "Loyal Ally"
  affinity: number; // -100 to 100
  status: string;
  memories?: string[];
  quests?: NPCQuest[];
}

export interface SimulationStatus {
  day: number;
  timeOfDay: string; // Morning, Afternoon, Evening, Night, etc.
  activity: string;
  emoji: string;
  currency: number;
  location: string;
  weather: string;
}

export interface SimulationState {
  status: SimulationStatus;
  inventory: InventoryItem[];
  npcs: NPC[];
  thoughts: string;
}

export interface StoryMessage {
  id: string;
  role: "user" | "guide";
  text: string;
  isOOC?: boolean;
  timestamp: string;
  stateSnap?: SimulationState;
}

export interface StartingPreset {
  title: string;
  location: string;
  timeOfDay: string;
  weather: string;
  currency: number;
  description: string;
}
