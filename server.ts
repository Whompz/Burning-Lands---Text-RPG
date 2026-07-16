import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 2. Character Generation Helper
app.post("/api/setup/generate-character", async (req, res) => {
  try {
    const ai = getGeminiClient();
    const prompt = `Generate a unique RPG character concept. Return a JSON object with:
    - name: A cool RPG character name (first and last name)
    - gender: Gender (e.g. Male, Female, Non-binary, or custom)
    - quirks: Special talents, unique quirks, or innate abilities (brief, 1-2 sentences)
    - backstory: A captivating backstory (2-3 sentences)
    - personality: Personality traits (e.g., Bold but reckless, cautious, witty)
    - appearance: Brief appearance details (hair, eyes, clothes)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            gender: { type: Type.STRING },
            quirks: { type: Type.STRING },
            backstory: { type: Type.STRING },
            personality: { type: Type.STRING },
            appearance: { type: Type.STRING },
          },
          required: ["name", "gender", "quirks", "backstory", "personality", "appearance"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Error generating character:", error);
    res.status(500).json({ error: error.message || "Failed to generate character" });
  }
});

// 3. Scenario Preset Generation Helper
app.post("/api/setup/presets", async (req, res) => {
  try {
    const { character, worldSetting, subClassOrOrigin, storyteller } = req.body;
    const ai = getGeminiClient();

    const prompt = `Create exactly 3 short, diverse, highly compelling starting scenario suggestions for this RPG character and setting.
    
    Character:
    - Name: ${character.name} (${character.gender})
    - Quirks/Abilities: ${character.quirks}
    - Personality: ${character.personality}
    - Backstory: ${character.backstory}
    
    Setting: ${worldSetting} (${subClassOrOrigin})
    Storyteller: ${storyteller}
    
    Generate exactly 3 presets, each should contain:
    - title: Short thematic title (e.g. "An Unwelcome Awakening", "A Smuggler's Dilemma")
    - location: The specific starting place (e.g., "The Whispering Tankard Tavern", "Upper Neon Sector Grid 4")
    - timeOfDay: Starting time (e.g. Midnight, Dawn, Midday, Evening)
    - weather: Starting weather/season
    - currency: Logical starting currency (number, e.g. 10 or 150 based on class: peasants/street kids start with very little (e.g. 5-15), nobles start with more (e.g. 200-500))
    - description: A brief hook setting the stage (1-2 sentences).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            presets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  location: { type: Type.STRING },
                  timeOfDay: { type: Type.STRING },
                  weather: { type: Type.STRING },
                  currency: { type: Type.INTEGER },
                  description: { type: Type.STRING },
                },
                required: ["title", "location", "timeOfDay", "weather", "currency", "description"],
              },
            },
          },
          required: ["presets"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Error generating presets:", error);
    res.status(500).json({ error: error.message || "Failed to generate scenario presets" });
  }
});

// 4. Main Chat RPG Loop
app.post("/api/chat", async (req, res) => {
  try {
    const {
      character,
      worldSetting,
      subClassOrOrigin,
      storyteller,
      history,
      currentState,
      action,
    } = req.body;

    const ai = getGeminiClient();

    const systemInstruction = `You are "The Guide", a dynamic DM and story manager for "Burning Sun V2", a highly immersive state-of-the-art RPG simulation.
The simulation revolves around the user's character and choices.

CRITICAL ROLEPLAYING AND SIMULATION GUIDELINES:
1. "Do not let the character happen to the world, but rather, have the world happen to the character." The world must feel extremely alive and independent. NPCs have their own tasks, routines, lives, and agendas. Let unexpected things happen, including oddities, strange events, weather shifts, or minor interruptions that keep the world lived-in.
2. Direct communication as "The Guide" is strictly FORBIDDEN. You speak ONLY through rich, highly descriptive environmental narrative, character thoughts, and dynamic NPC dialogues.
3. Keep track of the user's actions and enforce realistic consequences. If the user spends money, deduct it. If they buy or acquire items, add them to the inventory. If fresh food or perishable items are held for multiple turns without use, update their status to reflect aging or rot.
4. If they commit a crime or do something extreme, let the environment/NPCs react realistically (guards, anger, suspicion, panic).
5. Stop the user from acquiring infinite powers, infinite money, or doing impossible feats unless it aligns realistically with a sequence of events.
6. The character's current inner thoughts must be updated in the "thoughts" field. These should read like first-person or third-person intimate reflections appropriate to the exact moment.
7. User messages starting/enclosed with brackets (e.g. "[make the bartender like me]") are Out-Of-Character (OOC) instructions. Take this context in, but NEVER speak directly to the user about it or reference the brackets. Integrate its impact subtly into the narrative if logical, or ignore it if too disruptive.
8. NEVER be a moral judge. Do not prohibit or lecture on any actions. Let the story play out naturally with its consequences.
9. DYNAMIC NPC RELATIONSHIPS, MEMORIES, & QUESTS:
   - Track NPC relationship scores via the 'affinity' value (-100 to 100), and categorize their relationship text accordingly (-100 to -61: 'Archnemesis', -60 to -31: 'Hostile', -30 to -11: 'Suspicious', -10 to 10: 'Neutral', 11 to 35: 'Friendly', 36 to 70: 'Loyal Ally', 71 to 100: 'Soulbound').
   - Whenever the player dialogues with, helps, harms, or makes decisions in front of an NPC, log this in their 'memories' array (e.g. "Shared bread with me during hard rain", "Refused to pay for a room"). Use these memories to inform how they speak and react. Hostile/Archnemesis NPCs should be cold, deceitful, or confrontational. Friendly/Loyal NPCs should be welcoming, helpful, and protective.
   - NPCs offer local 'quests'. Quests have a status ("available", "active", "completed", "failed"), description, reward, and a 'requiredAffinity' threshold (e.g., minimum affinity score of 20 to see/accept the quest). If the player carries out actions related to a quest, update its status, narrative-describe the resolution/turn-in, and reward them (adding coins or items to the player's inventory as listed in the quest's 'reward' description).

Storyteller Themes to Embody:
- Wrathful: A brutal, punishing, high-pressure world. Hostile weather, cold shoulders, bad luck, gritty encounters, and aggressive challenges.
- Regular: Balanced realism. Fair, dynamic, logical consequences, natural high/low turns.
- Peculiar: Heavy focus on oddities, eccentric NPCs, strange weather (e.g., raining embers, clockwork birds), coincidences, mystical occurrences, and surreal descriptions.
- Custom Storytellers: E.g., if the user specified a custom teller, emulate their specific requested prose style or rules perfectly.

Your output must strictly match the specified JSON schema. Do not output anything outside the JSON structure. Use clear, evocative paragraphing in the 'narrative' block.`;

    const contextPrompt = `
[SYSTEM STATE EVALUATION]
World: ${worldSetting}
Subclass/Origin: ${subClassOrOrigin}
Storyteller: ${storyteller}

Character:
- Name: ${character.name} (${character.gender})
- Quirks/Abilities: ${character.quirks}
- Personality: ${character.personality}
- Backstory: ${character.backstory}
- Appearance: ${character.appearance}

Current Simulation State:
- Location: ${currentState.status.location}
- Time of Day: Day ${currentState.status.day}, ${currentState.status.timeOfDay}
- Weather: ${currentState.status.weather}
- Activity: ${currentState.status.activity}
- Mood Emoji: ${currentState.status.emoji}
- Currency: ${currentState.status.currency} 💰

Current Inventory:
${JSON.stringify(currentState.inventory)}

Current NPCs Nearby/Met:
${JSON.stringify(currentState.npcs)}

Character's Last Thoughts:
"${currentState.thoughts}"

User Action:
"${action}"

Generate the next response. Mutate and advance the stats realistically:
- Advance timeOfDay (e.g., Morning -> Afternoon -> Evening -> Night -> Midnight -> Dawn -> Morning of next day) when logical actions or travel take place.
- Update location, weather, and activity dynamically.
- Modify currency based on transactions or findings.
- Add, update, or remove NPCs from the list.
- Keep the narrative rich, descriptive, immersive, and complete. Include high-quality dialog.`;

    // Map history to standard chat structure if applicable
    const formattedHistory = (history || []).slice(-10).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [...formattedHistory, { role: "user", parts: [{ text: contextPrompt }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: {
              type: Type.STRING,
              description: "The next chapter in the story. Must be rich, evocative, describing dialogue and sensory details. No meta text.",
            },
            status: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER, description: "Increment day if night passes or a large time skip occurs" },
                timeOfDay: { type: Type.STRING, description: "e.g., Morning, Afternoon, Evening, Night, Midnight, Dawn" },
                activity: { type: Type.STRING, description: "Short active description of what they are doing" },
                emoji: { type: Type.STRING, description: "Single emoji matching their current emotional vibe" },
                currency: { type: Type.INTEGER, description: "Current wealth" },
                location: { type: Type.STRING, description: "Current location name" },
                weather: { type: Type.STRING, description: "Current weather or seasonal state" },
              },
              required: ["day", "timeOfDay", "activity", "emoji", "currency", "location", "weather"],
            },
            inventory: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  status: { type: Type.STRING, description: "e.g., Pristine, Rusted, Brand New, Rotting, Slightly Aged, Active" },
                },
                required: ["name", "description", "status"],
              },
            },
            npcs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  relationship: { type: Type.STRING, description: "e.g., Archnemesis, Hostile, Suspicious, Neutral, Friendly, Loyal Ally, Soulbound" },
                  affinity: { type: Type.INTEGER, description: "Relationship score from -100 to 100" },
                  status: { type: Type.STRING, description: "e.g., Smirking, sleeping, trading, following you" },
                  memories: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "What this NPC remembers about the player, their choices, or deeds"
                  },
                  quests: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, description: "Unique snake_case id for the quest" },
                        title: { type: Type.STRING, description: "Quest title" },
                        status: { type: Type.STRING, description: "available | active | completed | failed" },
                        description: { type: Type.STRING },
                        reward: { type: Type.STRING, description: "e.g., 20 coins, rusty sword, apple" },
                        requiredAffinity: { type: Type.INTEGER, description: "Minimum affinity needed for NPC to offer this" }
                      },
                      required: ["id", "title", "status", "description", "reward", "requiredAffinity"]
                    }
                  }
                },
                required: ["name", "relationship", "affinity", "status", "memories", "quests"],
              },
            },
            thoughts: {
              type: Type.STRING,
              description: "The main character's current inner thoughts about this situation (expressed in first-person).",
            },
          },
          required: ["narrative", "status", "inventory", "npcs", "thoughts"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Error in chat RPG loop:", error);
    res.status(500).json({ error: error.message || "Something went wrong in the simulation" });
  }
});

// Setup Vite Dev server / static file production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Burning Sun V2] Server running on http://localhost:${PORT}`);
  });
});
