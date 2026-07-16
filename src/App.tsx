import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  User,
  Compass,
  Coins,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Clock,
  CloudSun,
  Dices,
  BookOpen,
  Send,
  Skull,
  Eye,
  Plus,
  Trash2,
  AlertTriangle,
  Play,
  ArrowLeft,
  Flame,
  Wand2,
  Apple
} from "lucide-react";
import {
  Character,
  InventoryItem,
  NPC,
  SimulationState,
  StoryMessage,
  StartingPreset
} from "./types";

export default function App() {
  // Navigation & Step State
  const [currentStep, setCurrentStep] = useState<
    "welcome" | "character" | "world" | "storyteller" | "scenario" | "simulation"
  >("welcome");

  // Character State
  const [character, setCharacter] = useState<Character>({
    name: "",
    gender: "Male",
    quirks: "",
    backstory: "",
    personality: "",
    appearance: "",
  });
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);

  // World Setting State
  const [worldSetting, setWorldSetting] = useState<string>("Classic Medieval");
  const [subClassOrOrigin, setSubClassOrOrigin] = useState<string>("Commoner");
  const [customWorldText, setCustomWorldText] = useState<string>("");

  // Storyteller State
  const [storyteller, setStoryteller] = useState<string>("Regular");
  const [customStorytellerText, setCustomStorytellerText] = useState<string>("");

  // Scenario presets state
  const [presets, setPresets] = useState<StartingPreset[]>([]);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [customStartText, setCustomStartText] = useState<string>("");
  const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);

  // Simulation State
  const [simulationState, setSimulationState] = useState<SimulationState>({
    status: {
      day: 1,
      timeOfDay: "Morning",
      activity: "Arriving in the world",
      emoji: "😊",
      currency: 100,
      location: "Initial Outpost",
      weather: "Mild and sunny",
    },
    inventory: [],
    npcs: [],
    thoughts: "This is a new beginning. Let's see what this world holds.",
  });
  const [messages, setMessages] = useState<StoryMessage[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedNpcName, setExpandedNpcName] = useState<string | null>(null);

  // Scroll ref
  const logEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of simulation log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSubmittingAction]);

  // Welcome Step -> Character Builder
  const handleStartGame = () => {
    setCurrentStep("character");
  };

  // Auto-Generate Character
  const generateRandomCharacter = async () => {
    setIsGeneratingCharacter(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/setup/generate-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to contact server");
      const data = await res.json();
      setCharacter(data);
    } catch (err: any) {
      setErrorMessage("Could not generate random character. Feel free to write your own below!");
    } finally {
      setIsGeneratingCharacter(false);
    }
  };

  // Navigate to World Settings
  const handleCharacterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!character.name.trim()) {
      setErrorMessage("Your character needs a name!");
      return;
    }
    setErrorMessage(null);
    setCurrentStep("world");
    // Pre-populate default subclass based on world
    setSubClassOrOrigin("Commoner");
  };

  // World Setting Card Select
  const selectWorldSetting = (world: string) => {
    setWorldSetting(world);
    if (world === "Classic Medieval" || world === "Victorian") {
      setSubClassOrOrigin("Commoner");
    } else if (world === "Cyberpunk") {
      setSubClassOrOrigin("Street Kid");
    } else if (world === "Galaxy") {
      setSubClassOrOrigin("Tatooine");
    } else {
      setSubClassOrOrigin("Unknown");
    }
  };

  // Submit World -> Storyteller Selection
  const handleWorldSubmit = () => {
    setErrorMessage(null);
    if (worldSetting === "Choose Your Own" && !customWorldText.trim()) {
      setErrorMessage("Please describe your custom world lore or setting details!");
      return;
    }
    setCurrentStep("storyteller");
  };

  // Submit Storyteller -> Starting Scenario
  const handleStorytellerSubmit = async () => {
    setErrorMessage(null);
    if (storyteller === "Custom" && !customStorytellerText.trim()) {
      setErrorMessage("Please describe your custom Storyteller personality!");
      return;
    }

    setCurrentStep("scenario");
    setIsGeneratingPresets(true);

    try {
      const finalWorld = worldSetting === "Choose Your Own" ? customWorldText : worldSetting;
      const finalStoryteller = storyteller === "Custom" ? customStorytellerText : storyteller;

      const res = await fetch("/api/setup/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character,
          worldSetting: finalWorld,
          subClassOrOrigin,
          storyteller: finalStoryteller,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate presets");
      const data = await res.json();
      if (data.presets && data.presets.length > 0) {
        setPresets(data.presets);
        // Default to first preset
        setSelectedPresetIndex(0);
      }
    } catch (err: any) {
      // Fallback presets if server fails
      setPresets([
        {
          title: "The Crossroads Tavern",
          location: "The Weary Traveler Inn",
          timeOfDay: "Evening",
          weather: "Rainy and dark",
          currency: 50,
          description: "You sit in the corner of a crowded, smokey tavern, nursing your last drink while looking at a mysterious map.",
        },
        {
          title: "The Outpost Gate",
          location: "Frontier Gate Alpha",
          timeOfDay: "Dawn",
          weather: "Crisp and foggy",
          currency: 80,
          description: "You stand before the high wooden walls of a border city, looking out into the wildlands that lay beyond.",
        },
        {
          title: "A Sudden Ambush",
          location: "The Sinuous Canyon Route",
          timeOfDay: "Midday",
          weather: "Scorching hot",
          currency: 30,
          description: "Your carriage has broken an axle. Strange rustles come from the cliffs nearby.",
        }
      ]);
      setSelectedPresetIndex(0);
    } finally {
      setIsGeneratingPresets(false);
    }
  };

  // Launch Simulation Game Loop
  const handleStartSimulation = async () => {
    setErrorMessage(null);
    let startLocation = "";
    let startTime = "Morning";
    let startWeather = "Overcast";
    let startCurrency = 100;
    let initialHook = "";

    if (selectedPresetIndex !== null && presets[selectedPresetIndex]) {
      const p = presets[selectedPresetIndex];
      startLocation = p.location;
      startTime = p.timeOfDay;
      startWeather = p.weather;
      startCurrency = p.currency;
      initialHook = `${p.description} (Starting at ${p.location}, ${p.timeOfDay})`;
    } else {
      if (!customStartText.trim()) {
        setErrorMessage("Please type a starting situation or choose one of the suggestions!");
        return;
      }
      startLocation = "A secret spot";
      startTime = "Midnight";
      startWeather = "Chilly and clear";
      startCurrency = worldSetting === "Classic Medieval" && subClassOrOrigin === "Noble" ? 300 : 50;
      initialHook = customStartText;
    }

    const initialStatus = {
      day: 1,
      timeOfDay: startTime,
      activity: "Waking up",
      emoji: "🤔",
      currency: startCurrency,
      location: startLocation,
      weather: startWeather,
    };

    // Construct the initial local state
    const firstState: SimulationState = {
      status: initialStatus,
      inventory: [
        { name: "Pouch", description: "Standard leather belt pouch for keeping coin.", status: "Good Condition" },
        ...(worldSetting === "Classic Medieval" || worldSetting === "Victorian"
          ? [{ name: "Loaf of Bread", description: "Slightly hard rye bread.", status: "Fresh" }]
          : []),
        ...(worldSetting === "Cyberpunk"
          ? [{ name: "Cracked Datapad", description: "Slow-response slate with some local mesh maps.", status: "Glitchy" }]
          : []),
        ...(worldSetting === "Galaxy"
          ? [{ name: "Thermal Canteen", description: "Keeps water cold in desert sands.", status: "Scratched" }]
          : [])
      ],
      npcs: [],
      thoughts: "The journey begins. I must stay alert.",
    };

    setSimulationState(firstState);
    setCurrentStep("simulation");
    setIsSubmittingAction(true);

    try {
      const finalWorld = worldSetting === "Choose Your Own" ? customWorldText : worldSetting;
      const finalStoryteller = storyteller === "Custom" ? customStorytellerText : storyteller;

      // Make initial system prompt to build the first narrative segment
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character,
          worldSetting: finalWorld,
          subClassOrOrigin,
          storyteller: finalStoryteller,
          history: [],
          currentState: firstState,
          action: `[Start Simulation: ${initialHook}]`,
        }),
      });

      if (!res.ok) throw new Error("Failed to boot up the guide engine.");
      const data = await res.json();

      setSimulationState({
        status: data.status,
        inventory: data.inventory || [],
        npcs: data.npcs || [],
        thoughts: data.thoughts || firstState.thoughts,
      });

      setMessages([
        {
          id: "init",
          role: "guide",
          text: data.narrative,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          stateSnap: {
            status: data.status,
            inventory: data.inventory || [],
            npcs: data.npcs || [],
            thoughts: data.thoughts || firstState.thoughts,
          }
        }
      ]);
    } catch (err: any) {
      setErrorMessage("System starting error: " + err.message);
      // Boot strap some mock data so it's fully playable regardless of network interruptions
      setMessages([
        {
          id: "init",
          role: "guide",
          text: `You open your eyes inside *${startLocation}*. The atmosphere is heavy with the scent of old iron and dust. The wind whispers of upcoming changes. A local merchant looks at you with curiosity.\n\n"First time here?" he queries.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          stateSnap: firstState
        }
      ]);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Submit Action in RPG Chat Terminal
  const submitAction = async (forcedAction?: string) => {
    const actionText = forcedAction !== undefined ? forcedAction : userInput;
    if (!actionText.trim() || isSubmittingAction) return;

    if (forcedAction === undefined) {
      setUserInput("");
    }

    const isOOC = actionText.startsWith("[") && actionText.endsWith("]");
    const userMsg: StoryMessage = {
      id: Math.random().toString(),
      role: "user",
      text: actionText,
      isOOC,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSubmittingAction(true);
    setErrorMessage(null);

    try {
      const finalWorld = worldSetting === "Choose Your Own" ? customWorldText : worldSetting;
      const finalStoryteller = storyteller === "Custom" ? customStorytellerText : storyteller;

      // Construct a simple chat history
      const hist = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character,
          worldSetting: finalWorld,
          subClassOrOrigin,
          storyteller: finalStoryteller,
          history: hist,
          currentState: simulationState,
          action: actionText,
        }),
      });

      if (!res.ok) throw new Error("The Guide engine did not respond.");
      const data = await res.json();

      const updatedState: SimulationState = {
        status: data.status,
        inventory: data.inventory || [],
        npcs: data.npcs || [],
        thoughts: data.thoughts || simulationState.thoughts,
      };

      setSimulationState(updatedState);

      const guideMsg: StoryMessage = {
        id: Math.random().toString(),
        role: "guide",
        text: data.narrative,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stateSnap: updatedState,
      };

      setMessages((prev) => [...prev, guideMsg]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Guide Interruption: " + err.message);

      // Fallback system response if API fails/reaches rate limits, keeping it fully bulletproof
      const fallbackMsg: StoryMessage = {
        id: Math.random().toString(),
        role: "guide",
        text: `The wind howls as you perform your action. The environment shifts subtly, but the heavy mists of the world prevent a complete response. [API Error fallback: Ensure GEMINI_API_KEY is configured in your Secrets]`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stateSnap: simulationState,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Helper template commands to test prompt guidelines
  const triggerQuickAction = (action: string) => {
    submitAction(action);
  };

  // Format rich paragraph text and highlight dialogues
  const formatNarrativeText = (text: string, isLatest: boolean = false) => {
    if (!text) return "";
    return text.split("\n\n").map((para, pIdx) => {
      // Bold NPC dialogues formatted like: **[Name]**: "Dialogue"
      // Or just standard double quotes "dialogue" inside narration
      const parts = para.split(/(".*?")/g);
      return (
        <p key={pIdx} className={`mb-4 leading-relaxed font-serif ${isLatest ? 'text-[#FFF] text-lg md:text-2xl border-l-2 border-[#F27D26] pl-8' : 'opacity-40 select-none text-[#999] text-sm md:text-base'}`}>
          {parts.map((part, index) => {
            if (part.startsWith('"') && part.endsWith('"')) {
              return <span key={index} className="text-[#F27D26] font-medium">{part}</span>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] flex flex-col font-sans selection:bg-[#F27D26]/30 selection:text-white">
      {/* Top Ambient Navigation Header */}
      <header className="h-14 border-b border-[#2A2A2A] bg-[#121212] sticky top-0 z-40 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26]">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base tracking-wider bg-gradient-to-r from-[#F27D26] to-amber-300 bg-clip-text text-transparent">
              BURNING SUN V2
            </h1>
            <p className="text-[10px] font-mono text-[#666] uppercase tracking-widest">
              State-of-the-Art RPG Simulation
            </p>
          </div>
        </div>

        {/* Current Stage Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono">
          <span className={`px-2 py-1 rounded ${currentStep === 'welcome' ? 'bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30' : 'text-[#666]'}`}>Welcome</span>
          <span className="text-[#333]">&rarr;</span>
          <span className={`px-2 py-1 rounded ${currentStep === 'character' ? 'bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30' : 'text-[#666]'}`}>Character</span>
          <span className="text-[#333]">&rarr;</span>
          <span className={`px-2 py-1 rounded ${currentStep === 'world' ? 'bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30' : 'text-[#666]'}`}>Setting</span>
          <span className="text-[#333]">&rarr;</span>
          <span className={`px-2 py-1 rounded ${currentStep === 'storyteller' ? 'bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30' : 'text-[#666]'}`}>Storyteller</span>
          <span className="text-[#333]">&rarr;</span>
          <span className={`px-2 py-1 rounded ${currentStep === 'scenario' ? 'bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30' : 'text-[#666]'}`}>Scenario</span>
          <span className="text-[#333]">&rarr;</span>
          <span className={`px-2 py-1 rounded ${currentStep === 'simulation' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-[#666]'}`}>Simulation</span>
        </div>

        {/* System Reset / New Game Button */}
        {currentStep !== "welcome" && (
          <button
            onClick={() => {
              if (confirm("Are you sure you want to exit the current game and restart?")) {
                setCurrentStep("welcome");
                setMessages([]);
                setPresets([]);
                setCharacter({ name: "", gender: "Male", quirks: "", backstory: "", personality: "", appearance: "" });
              }
            }}
            className="px-3 py-1.5 text-xs font-mono rounded bg-[#1A1A1A] border border-[#333] hover:bg-[#222] hover:border-[#444] text-[#888] hover:text-white transition"
          >
            Restart
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {/* STEP 1: WELCOME SCREEN */}
          {currentStep === "welcome" && (
            <motion.div
              id="step-welcome"
              key="welcome"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-2xl w-full text-center space-y-8 py-10 px-6 bg-[#121212] border border-[#2A2A2A] rounded-xl glow-box relative overflow-hidden"
            >
              {/* background grid decoration */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#222_1px,transparent_1px),linear-gradient(to_bottom,#222_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

              <div className="space-y-3 relative z-10">
                <div className="mx-auto w-16 h-16 rounded-full bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26] mb-2">
                  <Flame className="w-8 h-8 animate-pulse" />
                </div>
                <h2 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                  Greetings, Traveler.
                </h2>
                <p className="text-[#999] text-lg font-sans max-w-lg mx-auto">
                  Welcome to <span className="text-[#F27D26] font-semibold font-display">Burning Sun V2</span>, a state-of-the-art RPG Simulation engine powered by Gemini.
                </p>
              </div>

              <div className="border border-[#222] bg-[#1A1A1A]/40 rounded p-5 max-w-md mx-auto text-left space-y-3 relative z-10">
                <div className="flex gap-2.5 items-start">
                  <div className="h-2 w-2 rounded-full bg-[#F27D26] mt-2 shrink-0 animate-ping" />
                  <p className="text-xs text-[#E0E0E0] font-mono">
                    <span className="text-[#F27D26]">System Log:</span> The Guide is initialized. Build your unique character, configure your lore, select your storyteller, and let the world adapt dynamically around you.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="h-2 w-2 rounded-full bg-[#666] mt-2 shrink-0" />
                  <p className="text-xs text-[#999] font-mono">
                    <span className="text-[#E0E0E0]">Directive:</span> "Do not let the character happen to the world, but rather, have the world happen to the character."
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-4">
                <button
                  id="btn-start-game"
                  onClick={handleStartGame}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#F27D26] text-[#0A0A0A] font-display font-bold rounded hover:bg-[#ff903c] shadow-lg shadow-[#F27D26]/15 transition-all duration-200 cursor-pointer"
                >
                  Create Your Character
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CHARACTER CREATION */}
          {currentStep === "character" && (
            <motion.div
              id="step-character"
              key="character"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl w-full bg-[#121212] border border-[#2A2A2A] rounded-xl glow-box p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-6 border-b border-[#2A2A2A] pb-4">
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6 text-[#F27D26]" />
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white">Character Dossier</h2>
                    <p className="text-xs text-[#999] font-sans">Establish your name, traits, and background profile</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={generateRandomCharacter}
                  disabled={isGeneratingCharacter}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0F0F0F] hover:bg-[#1A1A1A] text-[#F27D26] border border-[#2A2A2A] rounded font-mono text-xs transition duration-150 cursor-pointer"
                >
                  <Dices className={`w-4 h-4 ${isGeneratingCharacter ? 'animate-spin' : ''}`} />
                  {isGeneratingCharacter ? "Rolling Traits..." : "Generate Concept"}
                </button>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 rounded bg-red-950/40 border border-red-500/20 text-red-300 text-sm flex gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleCharacterSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="block text-xs font-mono text-[#666] uppercase tracking-wider">Character Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alistair Vance, V-78, Sela"
                      value={character.name}
                      onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded focus:border-[#F27D26]/60 focus:outline-none transition text-[#E0E0E0] placeholder-[#444] font-sans"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="block text-xs font-mono text-[#666] uppercase tracking-wider">Gender / Pronouns</label>
                    <input
                      type="text"
                      placeholder="e.g. Male, Female, Non-binary"
                      value={character.gender}
                      onChange={(e) => setCharacter({ ...character, gender: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded focus:border-[#F27D26]/60 focus:outline-none transition text-[#E0E0E0] placeholder-[#444] font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Special Quirks, Talents or Abilities */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-[#666] uppercase tracking-wider">Special Quirks, Talents or Abilities</label>
                    <textarea
                      rows={2}
                      placeholder="Unique items, magical remnants, high-tier reflexes, or eccentric conversational habits..."
                      value={character.quirks}
                      onChange={(e) => setCharacter({ ...character, quirks: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded focus:border-[#F27D26]/60 focus:outline-none transition text-[#E0E0E0] placeholder-[#444] font-sans resize-none"
                    />
                  </div>

                  {/* Personality */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-[#666] uppercase tracking-wider">Personality Traits</label>
                    <input
                      type="text"
                      placeholder="e.g., Cynical and sarcastic, but fiercely protective of colleagues"
                      value={character.personality}
                      onChange={(e) => setCharacter({ ...character, personality: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded focus:border-[#F27D26]/60 focus:outline-none transition text-[#E0E0E0] placeholder-[#444] font-sans"
                    />
                  </div>

                  {/* Backstory */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-[#666] uppercase tracking-wider">Character Backstory</label>
                    <textarea
                      rows={3}
                      placeholder="A short description of where they originated and what haunts or motivates them..."
                      value={character.backstory}
                      onChange={(e) => setCharacter({ ...character, backstory: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded focus:border-[#F27D26]/60 focus:outline-none transition text-[#E0E0E0] placeholder-[#444] font-sans resize-none"
                    />
                  </div>

                  {/* Appearance */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-[#666] uppercase tracking-wider">Physical Appearance</label>
                    <input
                      type="text"
                      placeholder="e.g., Tall, gray eyes, wears a dusty oilskin coat with copper ornaments"
                      value={character.appearance}
                      onChange={(e) => setCharacter({ ...character, appearance: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded focus:border-[#F27D26]/60 focus:outline-none transition text-[#E0E0E0] placeholder-[#444] font-sans"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2A2A2A] flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F27D26] hover:bg-[#ff903c] text-[#0A0A0A] font-bold font-display rounded transition duration-150 cursor-pointer"
                  >
                    Confirm Character
                    <ArrowRight className="w-4 h-4 text-[#0A0A0A]" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STEP 3: WORLD SETTING CHOICE */}
          {currentStep === "world" && (
            <motion.div
              id="step-world"
              key="world"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl w-full bg-[#121212] border border-[#2A2A2A] rounded-xl glow-box p-6 md:p-8"
            >
              <div className="mb-6 border-b border-[#2A2A2A] pb-4">
                <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                  <Compass className="w-6 h-6 text-[#F27D26]" />
                  Choose Your Realm
                </h2>
                <p className="text-xs text-[#999] font-sans">Select which temporal plane or reality your story occupies.</p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 rounded bg-red-950/40 border border-red-500/20 text-red-300 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Setting Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  {
                    name: "Classic Medieval",
                    description: "High castles, thick woods, and old steel. Face dragons, guilds, and peasant rebellions.",
                    accent: "from-[#F27D26] to-amber-900"
                  },
                  {
                    name: "Victorian",
                    description: "Coal soot, steam carriages, high society tea, and fog-ridden slums harboring monsters.",
                    accent: "from-slate-600 to-slate-800"
                  },
                  {
                    name: "Cyberpunk",
                    description: "Neon rains, towering mega-corps, chrome augmentations, street netrunners, and black market dealers.",
                    accent: "from-[#F27D26] to-red-900"
                  },
                  {
                    name: "Galaxy",
                    description: "Sleek cruisers, arid dune outposts, thermal blasters, and a mysterious energy guiding galaxy order.",
                    accent: "from-[#F27D26] to-amber-800"
                  },
                  {
                    name: "Current Day",
                    description: "The complicated, intricate modern world. Subway stations, smartphones, coffee shops, and global logistics.",
                    accent: "from-[#F27D26] to-slate-700"
                  },
                  {
                    name: "Choose Your Own",
                    description: "Forge your own customized realm. Provide specific backstory, timeline, rules, and world lore.",
                    accent: "from-[#F27D26] to-red-900"
                  }
                ].map((realm) => (
                  <button
                    key={realm.name}
                    type="button"
                    onClick={() => selectWorldSetting(realm.name)}
                    className={`p-4 rounded-lg text-left border transition relative overflow-hidden group cursor-pointer ${
                      worldSetting === realm.name
                        ? "bg-[#1A1A1A] border-[#F27D26] shadow-lg shadow-[#F27D26]/5"
                        : "bg-[#0F0F0F] hover:bg-[#121212] border-[#2A2A2A] hover:border-[#333]"
                    }`}
                  >
                    <div className="relative z-10 space-y-2">
                      <h3 className="font-display font-bold text-slate-100 group-hover:text-[#F27D26] transition">
                        {realm.name}
                      </h3>
                      <p className="text-xs text-[#999] font-sans line-clamp-3 leading-relaxed">
                        {realm.description}
                      </p>
                    </div>
                    {/* Background visual cue for selected card */}
                    {worldSetting === realm.name && (
                      <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${realm.accent}`} />
                    )}
                  </button>
                ))}
              </div>

              {/* Subclasses, planet choices or guideline logs based on world selection */}
              <div className="bg-[#1A1A1A]/40 border border-[#2A2A2A] rounded p-5 mb-6">
                {worldSetting === "Classic Medieval" && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono text-[#F27D26] uppercase tracking-widest">Select Social Class</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { name: "Peasant", desc: "Start with 10 💰. Humble background, overlooked by authorities but holds deep street smarts." },
                        { name: "Commoner", desc: "Start with 100 💰. Skilled carpenter, blacksmith or tavern keeper. Balanced relations." },
                        { name: "Noble", desc: "Start with 400 💰. Inheritor of lands or badges. Respected but heavily targeted by cutthroats." }
                      ].map((cl) => (
                        <button
                          key={cl.name}
                          type="button"
                          onClick={() => setSubClassOrOrigin(cl.name)}
                          className={`p-3 rounded text-left border text-xs font-sans transition ${
                            subClassOrOrigin === cl.name
                              ? "bg-[#F27D26]/10 border-[#F27D26]/40 text-[#E0E0E0]"
                              : "bg-[#0F0F0F] border-[#2A2A2A] text-[#888] hover:text-[#E0E0E0] hover:border-[#333]"
                          }`}
                        >
                          <div className="font-bold mb-1 font-display">{cl.name}</div>
                          <div>{cl.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {worldSetting === "Victorian" && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono text-[#F27D26] uppercase tracking-widest">Select Social Wealth Class</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { name: "Peasant", desc: "Start with 15 💰. Factory line laborer or dock loader. Filthy clothing, familiar with dark alleys." },
                        { name: "Commoner", desc: "Start with 120 💰. Shopkeeper, junior detective or apothecary clerk. Decent standing." },
                        { name: "Noble", desc: "Start with 500 💰. Lady or gentleman of estate. Wears fine wool coats, has connection to high lords." }
                      ].map((cl) => (
                        <button
                          key={cl.name}
                          type="button"
                          onClick={() => setSubClassOrOrigin(cl.name)}
                          className={`p-3 rounded text-left border text-xs font-sans transition ${
                            subClassOrOrigin === cl.name
                              ? "bg-[#F27D26]/10 border-[#F27D26]/40 text-[#E0E0E0]"
                              : "bg-[#0F0F0F] border-[#2A2A2A] text-[#888] hover:text-[#E0E0E0] hover:border-[#333]"
                          }`}
                        >
                          <div className="font-bold mb-1 font-display">{cl.name}</div>
                          <div>{cl.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {worldSetting === "Cyberpunk" && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono text-[#F27D26] uppercase tracking-widest">Select Archetype Background</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { name: "Street Kid", desc: "Start with 20 💰. Born in the gutter. Know the fixers, the gangs, and shortcut routes." },
                        { name: "Nomad", desc: "Start with 150 💰. Outcast rover from the badlands. Good with vehicular engines and scrap tech." },
                        { name: "Corpo", desc: "Start with 600 💰. Castout middle manager of Arasaka-style entity. Tech credentials but highly untrusted." }
                      ].map((cl) => (
                        <button
                          key={cl.name}
                          type="button"
                          onClick={() => setSubClassOrOrigin(cl.name)}
                          className={`p-3 rounded text-left border text-xs font-sans transition ${
                            subClassOrOrigin === cl.name
                              ? "bg-[#F27D26]/10 border-[#F27D26]/40 text-[#E0E0E0]"
                              : "bg-[#0F0F0F] border-[#2A2A2A] text-[#888] hover:text-[#E0E0E0] hover:border-[#333]"
                          }`}
                        >
                          <div className="font-bold mb-1 font-display">{cl.name}</div>
                          <div>{cl.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {worldSetting === "Galaxy" && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono text-[#F27D26] uppercase tracking-widest">Planet of Origin</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {["Tatooine", "Coruscant", "Naboo", "Hoth", "Choose Your Own"].map((planet) => (
                        <button
                          key={planet}
                          type="button"
                          onClick={() => setSubClassOrOrigin(planet)}
                          className={`p-3 rounded text-left border text-xs font-sans transition ${
                            subClassOrOrigin === planet
                              ? "bg-[#F27D26]/10 border-[#F27D26]/40 text-[#E0E0E0]"
                              : "bg-[#0F0F0F] border-[#2A2A2A] text-[#888] hover:text-[#E0E0E0] hover:border-[#333]"
                          }`}
                        >
                          <div className="font-bold font-display">{planet}</div>
                          <div className="text-[10px] mt-1 text-[#666]">
                            {planet === "Tatooine" && "Desert dune outposts"}
                            {planet === "Coruscant" && "Megacity skyscrapers"}
                            {planet === "Naboo" && "Elegant lakes & temples"}
                            {planet === "Hoth" && "Dangerous tundra caves"}
                            {planet === "Choose Your Own" && "Input custom sector"}
                          </div>
                        </button>
                      ))}
                    </div>
                    {subClassOrOrigin === "Choose Your Own" && (
                      <div className="mt-3 p-3.5 rounded bg-[#0F0F0F] border border-[#2A2A2A] text-xs font-mono space-y-2">
                        <p className="text-[#F27D26] font-bold">&lsaquo; Planet of Origin Guidelines &rsaquo;</p>
                        <p className="text-[#999] leading-relaxed">
                          Define your unique homeworld lore: Name, solar system coordinates, environmental hazards (e.g. electromagnetic storm radiation), primary exports, and local space guilds. Describe it inside your start action or custom world block!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {worldSetting === "Current Day" && (
                  <div className="text-xs text-[#999] space-y-2">
                    <div className="font-mono text-[#F27D26] uppercase tracking-widest">Modern Grid Coordinates</div>
                    <p className="font-sans leading-relaxed">
                      You inhabit our current world layout. Subways rattle underneath concrete streets, traffic rolls lazily in rainy intersections, smartphones ping with corporate notifications, and everyone has a job, a bank account, and a tight schedule. Choose any city or location to begin your modern simulation!
                    </p>
                  </div>
                )}

                {worldSetting === "Choose Your Own" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded bg-[#0F0F0F] border border-[#2A2A2A] text-xs font-mono space-y-2.5">
                      <div className="text-[#F27D26] font-bold flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-[#F27D26] animate-pulse" />
                        Custom Realm Lore Blueprint Instructions
                      </div>
                      <p className="text-[#999] leading-relaxed">
                        To build a highly immersive, cohesive custom world, we suggest including details across these 4 categories in your text block:
                      </p>
                      <ul className="list-disc pl-5 text-[#999] space-y-1 leading-relaxed">
                        <li><span className="text-[#F27D26]">1. World Lore & History:</span> Has a great catastrophe occurred? Is there ancient forgotten magic?</li>
                        <li><span className="text-[#F27D26]">2. Power Structures:</span> Who governs? Is it a corrupt merchant guild, a dark monarchy, or clockwork machines?</li>
                        <li><span className="text-[#F27D26]">3. Environmental Oddities:</span> What weird rules exist? Are seasons measured in decades? Are stars made of gold?</li>
                        <li><span className="text-[#F27D26]">4. Starting Standing:</span> What is your character's class, currency type, and general reception by locals?</li>
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono text-[#666] uppercase tracking-wider">Custom World Description</label>
                      <textarea
                        rows={4}
                        required
                        placeholder="e.g., A floating steam-archipelago called 'The Aether Isles'. Driven by a magical resource called 'Chronos Crystals'. Relentless sky pirate fleets patrol the winds. Locals carry clockwork gears to trade..."
                        value={customWorldText}
                        onChange={(e) => setCustomWorldText(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded focus:border-[#F27D26]/50 focus:outline-none transition text-[#E0E0E0] font-sans"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#2A2A2A] flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep("character")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded font-mono text-xs text-[#888] hover:text-white hover:border-[#333] transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Character Dossier
                </button>
                <button
                  type="button"
                  onClick={handleWorldSubmit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F27D26] hover:bg-[#ff903c] text-[#0A0A0A] font-bold font-display rounded transition duration-150 cursor-pointer"
                >
                  Configure Storyteller
                  <ArrowRight className="w-4 h-4 text-[#0A0A0A]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: STORYTELLER SELECTION */}
          {currentStep === "storyteller" && (
            <motion.div
              id="step-storyteller"
              key="storyteller"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl w-full bg-[#121212] border border-[#2A2A2A] rounded-xl glow-box p-6 md:p-8"
            >
              <div className="mb-6 border-b border-[#2A2A2A] pb-4">
                <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                  <Wand2 className="w-6 h-6 text-[#F27D26]" />
                  Select Storyteller Style
                </h2>
                <p className="text-xs text-[#999] font-sans">Choose the narrative tone and level of unpredictability for your RPG.</p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 rounded bg-red-950/40 border border-red-500/20 text-red-300 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Storytellers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                  {
                    name: "Wrathful",
                    style: "A dark, gritty, punishing tale.",
                    effect: "Aggressive NPCs, heavy atmospheric tension, difficult currency routes, and dangerous coincidences. Weather changes are often harsh.",
                    border: "hover:border-red-500/30",
                    selectedBorder: "border-red-500/70"
                  },
                  {
                    name: "Regular",
                    style: "Balanced reality and organic outcomes.",
                    effect: "Fair consequences. NPC reactions match logic. Opportunities and dangers show a natural rhythm of cause and effect.",
                    border: "hover:border-[#F27D26]/30",
                    selectedBorder: "border-[#F27D26]"
                  },
                  {
                    name: "Peculiar",
                    style: "Eccentric, bizarre, and filled with anomalies.",
                    effect: "Weird occurrences, clockwork mechanics, strange weather events, and eccentric NPC quirks. The world has odd secrets.",
                    border: "hover:border-emerald-500/30",
                    selectedBorder: "border-emerald-500/70"
                  },
                  {
                    name: "Custom",
                    style: "Define your own Storyteller persona.",
                    effect: "Enter rules, prose style, or behaviors. E.g., 'A witty cyberpunk netrunner narration' or 'A dramatic, medieval bard'.",
                    border: "hover:border-blue-500/30",
                    selectedBorder: "border-blue-500/70"
                  }
                ].map((st) => (
                  <button
                    key={st.name}
                    type="button"
                    onClick={() => setStoryteller(st.name)}
                    className={`p-4 rounded-lg text-left border transition relative flex flex-col justify-between cursor-pointer ${
                      storyteller === st.name
                        ? `bg-[#1A1A1A] ${st.selectedBorder} shadow-lg shadow-[#F27D26]/5`
                        : `bg-[#0F0F0F] border-[#2A2A2A] ${st.border}`
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {st.name === "Wrathful" && <Skull className="w-4 h-4 text-red-400" />}
                        {st.name === "Regular" && <Flame className="w-4 h-4 text-[#F27D26]" />}
                        {st.name === "Peculiar" && <Sparkles className="w-4 h-4 text-emerald-400" />}
                        {st.name === "Custom" && <Wand2 className="w-4 h-4 text-blue-400" />}
                        <span className="font-display font-bold text-slate-100">{st.name}</span>
                      </div>
                      <p className="text-xs text-[#F27D26] font-mono">{st.style}</p>
                      <p className="text-xs text-[#999] leading-relaxed font-sans">{st.effect}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom input */}
              {storyteller === "Custom" && (
                <div className="p-4 rounded bg-[#0F0F0F] border border-[#2A2A2A] space-y-2.5 mb-6">
                  <label className="block text-xs font-mono text-[#F27D26] uppercase tracking-wider">Describe Custom Storyteller</label>
                  <input
                    type="text"
                    placeholder="e.g. Sarcastic AI console that drops industrial humor, or a classic gothic novelist"
                    value={customStorytellerText}
                    onChange={(e) => setCustomStorytellerText(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded focus:border-[#F27D26]/50 focus:outline-none transition text-[#E0E0E0] font-sans text-sm"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#2A2A2A] flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep("world")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded font-mono text-xs text-[#888] hover:text-white hover:border-[#333] transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Realm Selection
                </button>
                <button
                  type="button"
                  onClick={handleStorytellerSubmit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F27D26] hover:bg-[#ff903c] text-[#0A0A0A] font-bold font-display rounded transition duration-150 cursor-pointer"
                >
                  Construct Scenario
                  <ArrowRight className="w-4 h-4 text-[#0A0A0A]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: STARTING SCENARIO BUILDER */}
          {currentStep === "scenario" && (
            <motion.div
              id="step-scenario"
              key="scenario"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl w-full bg-[#121212] border border-[#2A2A2A] rounded-xl glow-box p-6 md:p-8"
            >
              <div className="mb-6 border-b border-[#2A2A2A] pb-4">
                <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-[#F27D26]" />
                  Enter the Simulation
                </h2>
                <p className="text-xs text-[#999] font-sans">Choose your specific starting coordinates and narrative events.</p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 rounded bg-red-950/40 border border-red-500/20 text-red-300 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Loader during API generation of custom presets */}
              {isGeneratingPresets ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-[#F27D26] animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-mono text-slate-300">Evaluating character parameters...</p>
                    <p className="text-xs text-[#666] font-sans mt-1">Generating custom tailored start coordinates...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Preset list */}
                  <div className="space-y-3">
                    <label className="block text-xs font-mono text-[#666] uppercase tracking-widest">Tailored Suggestion Presets</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {presets.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedPresetIndex(idx);
                            setCustomStartText("");
                          }}
                          className={`p-4 rounded-lg text-left border text-xs transition relative overflow-hidden flex flex-col justify-between min-h-[140px] cursor-pointer ${
                            selectedPresetIndex === idx
                              ? "bg-[#1A1A1A] border-[#F27D26] shadow-lg shadow-[#F27D26]/5 text-[#E0E0E0]"
                              : "bg-[#0F0F0F] border-[#2A2A2A] hover:bg-[#121212] text-[#888] hover:text-white"
                          }`}
                        >
                          <div className="space-y-1.5">
                            <span className="font-mono text-[10px] text-[#F27D26] uppercase">Suggestion {idx + 1}</span>
                            <h4 className="font-display font-bold text-sm text-slate-100">{preset.title}</h4>
                            <p className="font-sans leading-relaxed line-clamp-4 text-[#999]">{preset.description}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-[#2A2A2A] flex justify-between items-center text-[10px] font-mono text-[#666]">
                            <span>📍 {preset.location}</span>
                            <span>💰 {preset.currency}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-center font-mono text-xs text-[#333]">— OR —</div>

                  {/* Custom launch scenario */}
                  <div className="space-y-2">
                    <label className="block text-xs font-mono text-[#666] uppercase tracking-wider">Custom Starting Situation</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Waking up in a damp alleyway holding a glowing neon disk, with no recollection of how I got here and sirens echoing in the distance..."
                      value={customStartText}
                      onChange={(e) => {
                        setCustomStartText(e.target.value);
                        setSelectedPresetIndex(null); // Deselect presets
                      }}
                      className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded focus:border-[#F27D26]/50 focus:outline-none transition text-[#E0E0E0] font-sans resize-none"
                    />
                    <p className="text-[10px] text-[#555] font-sans">
                      Tip: Specify starting location, current time, and active event.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-[#2A2A2A] flex justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep("storyteller")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded font-mono text-xs text-[#888] hover:text-white hover:border-[#333] transition cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Storyteller
                    </button>
                    <button
                      type="button"
                      onClick={handleStartSimulation}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-[#0A0A0A] font-bold font-display rounded shadow-lg shadow-emerald-500/10 transition cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-[#0A0A0A] text-[#0A0A0A] animate-pulse" />
                      Boot Simulation
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 6: RPG CHAT SIMULATION SCREEN */}
          {currentStep === "simulation" && (
            <motion.div
              id="simulation-screen"
              key="simulation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-7xl flex flex-col lg:flex-row gap-5 h-[calc(100vh-85px)] shrink-0 overflow-hidden"
            >
              {/* LEFT COLUMN: NARRATIVE & INPUT CHAT CONTAINER (65%) */}
              <div className="flex-1 flex flex-col bg-[#121212] border border-[#2A2A2A] rounded-xl overflow-hidden relative">

                {/* DYNAMIC TOP STATS BAR HEADER (Absolute Prompt Mandate) */}
                <div className="sticky top-0 z-30 bg-[#121212] border-b border-[#2A2A2A] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[#F27D26]">
                      Day {simulationState.status.day}
                    </span>
                    <span className="text-[#333]">•</span>
                    <div className="flex items-center gap-1.5 text-[#E0E0E0]">
                      <Clock className="w-3.5 h-3.5 text-[#666]" />
                      <span className="font-medium">{simulationState.status.timeOfDay}</span>
                    </div>
                    <span className="text-[#333]">•</span>
                    <div className="flex items-center gap-1.5 text-[#E0E0E0]">
                      <Compass className="w-3.5 h-3.5 text-[#666]" />
                      <span className="font-medium truncate max-w-[120px] md:max-w-[200px]" title={simulationState.status.location}>
                        {simulationState.status.location}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-[#0F0F0F] border border-[#2A2A2A] px-2 py-0.5 rounded font-mono text-amber-400 font-bold">
                      <span>💰</span>
                      <span>{simulationState.status.currency}</span>
                    </div>
                    <span className="text-lg bg-[#0F0F0F] px-1.5 py-0.5 rounded border border-[#2A2A2A]" title="Current Vibe">
                      {simulationState.status.emoji}
                    </span>
                  </div>
                </div>

                {/* STORY EVENT STREAM AREA */}
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
                  {messages.map((msg, idx) => (
                    <div key={msg.id || idx} className="space-y-1 max-w-4xl mx-auto">
                      {msg.role === "user" ? (
                        /* User Turn Display */
                        <div className="flex justify-end">
                          <div className={`p-3.5 rounded text-sm max-w-[85%] ${
                            msg.isOOC
                              ? "bg-[#1A1125] text-[#D8B4FE] border border-[#4C1D95]/40 font-mono italic"
                              : "bg-[#1A1A1A] text-[#E0E0E0] border border-[#2A2A2A] font-sans"
                          }`}>
                            {msg.isOOC && (
                              <div className="text-[10px] uppercase font-mono text-purple-400 font-bold tracking-wider mb-1">
                                &lsaquo; Out of Character / Meta &rsaquo;
                              </div>
                            )}
                            {msg.text}
                          </div>
                        </div>
                      ) : (
                        /* Guide Turn Display */
                        <div className="space-y-4">
                          {/* Rich Paragraph Formatting */}
                          <div className="space-y-1">
                            {formatNarrativeText(msg.text, idx === messages.length - 1)}
                          </div>

                          {/* Snapshot of inner thoughts if available */}
                          {msg.stateSnap?.thoughts && (
                            <div className="p-3 bg-[#F27D26]/5 border border-[#F27D26]/10 rounded italic text-[#999] text-xs font-mono max-w-xl">
                              <span className="text-[#F27D26]/80 font-bold not-italic">Character Thoughts:</span> "{msg.stateSnap.thoughts}"
                            </div>
                          )}

                          {/* Divider */}
                          {idx < messages.length - 1 && (
                            <hr className="border-[#2A2A2A] my-6" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Active Generating Loader */}
                  {isSubmittingAction && (
                    <div className="space-y-3 max-w-xl py-2">
                      <div className="flex items-center gap-3 text-xs font-mono text-[#666]">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F27D26]" />
                        <span>The Guide is rendering local timeline...</span>
                      </div>
                      <div className="h-1 w-full bg-[#0F0F0F] rounded overflow-hidden">
                        <div className="h-full bg-[#F27D26] rounded" style={{ width: '45%' }} />
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="p-3 rounded bg-red-950/30 border border-red-500/20 text-red-300 text-xs font-mono max-w-3xl mx-auto flex items-center justify-between">
                      <span>{errorMessage}</span>
                      <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300 font-bold">dismiss</button>
                    </div>
                  )}

                  <div ref={logEndRef} />
                </div>

                {/* BOTTOM FLOATING INPUT TERMINAL PANEL */}
                <div className="border-t border-[#2A2A2A] p-4 bg-[#121212]/95 space-y-3">
                  {/* Quick Action Suggestion Bar (Promotes testing of user guidelines) */}
                  <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 text-xs">
                    <span className="text-[#666] font-mono py-1">Quick Actions:</span>
                    <button
                      onClick={() => triggerQuickAction("I buy an apple from a nearby merchant.")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0F0F0F] border border-[#2A2A2A] hover:bg-[#1A1A1A] text-[#888] hover:text-white transition text-[11px] font-sans shrink-0 cursor-pointer"
                    >
                      🍎 Buy Apple
                    </button>
                    <button
                      onClick={() => triggerQuickAction("I examine my surroundings meticulously to inspect details.")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0F0F0F] border border-[#2A2A2A] hover:bg-[#1A1A1A] text-[#888] hover:text-white transition text-[11px] font-sans shrink-0 cursor-pointer"
                    >
                      🔍 Search Surrounding Details
                    </button>
                    <button
                      onClick={() => triggerQuickAction("I check my current belongings and sit down to reflect on my journey.")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0F0F0F] border border-[#2A2A2A] hover:bg-[#1A1A1A] text-[#888] hover:text-white transition text-[11px] font-sans shrink-0 cursor-pointer"
                    >
                      💭 Rest & Reflect
                    </button>
                    <button
                      onClick={() => triggerQuickAction("[Change the weather to a heavy thunderstorm]")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1A1125] border border-[#4C1D95]/40 hover:bg-[#25163D] hover:border-[#6B21A8]/50 text-[#D8B4FE] transition text-[11px] font-mono shrink-0 cursor-pointer"
                      title="Test bracketed OOC actions"
                    >
                      ⚡ [Thunderstorm Weather]
                    </button>
                  </div>

                  {/* Main Action Input Box */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitAction();
                    }}
                    className="flex gap-2.5"
                  >
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={
                          userInput.startsWith("[")
                            ? "Entering Out-Of-Character meta guidance... (processed silently)"
                            : "Enter your character action, dialogue, or [meta guidance]..."
                        }
                        disabled={isSubmittingAction}
                        className={`w-full px-4 py-3 bg-[#0F0F0F] rounded border focus:outline-none transition font-sans text-sm pr-12 ${
                          userInput.startsWith("[")
                            ? "border-purple-500/40 text-purple-200 placeholder-purple-400/50"
                            : "border-[#2A2A2A] focus:border-[#F27D26]/50 text-[#E0E0E0] placeholder-[#444]"
                        }`}
                      />
                      {/* OOC visual tag */}
                      {userInput.startsWith("[") && (
                        <span className="absolute right-3 top-2.5 px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-[10px] font-mono text-purple-400">
                          OOC Meta
                        </span>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingAction || !userInput.trim()}
                      className="px-4.5 bg-[#F27D26] hover:bg-[#ff903c] disabled:bg-[#1A1A1A] disabled:text-[#444] rounded text-[#0A0A0A] font-bold transition flex items-center justify-center shrink-0 cursor-pointer animate-pulse-subtle"
                    >
                      <Send className="w-4 h-4 fill-current text-[#0A0A0A]" />
                    </button>
                  </form>
                  <div className="text-[10px] font-mono text-[#555] flex justify-between items-center px-1">
                    <span>Press Enter to dispatch character action</span>
                    <span>Brackets `[...]` represent meta-commands</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: CHARACTER CARD, INVENTORY, & NPCs (35%) */}
              <div className="w-full lg:w-[360px] flex flex-col gap-4 overflow-y-auto max-h-full">

                {/* Character Dossier Summary */}
                <div className="bg-[#121212] border border-[#2A2A2A] rounded-xl p-4.5 space-y-4">
                  <div className="flex items-center gap-3 border-b border-[#2A2A2A] pb-3">
                    <div className="w-10 h-10 rounded-full bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26] text-sm font-bold">
                      {character.gender.toLowerCase().includes("female") ? "👩" : "👨"}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-display font-bold text-sm text-slate-100 truncate" title={character.name}>
                        {character.name || "Unknown Wanderer"}
                      </h3>
                      <p className="text-[11px] font-mono text-[#666] truncate">
                        {subClassOrOrigin} • {character.gender}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs leading-relaxed font-sans">
                    <div>
                      <span className="text-[#666] font-mono block text-[10px] uppercase">Realm Grid</span>
                      <span className="text-[#E0E0E0] font-semibold">{worldSetting}</span>
                    </div>

                    <div>
                      <span className="text-[#666] font-mono block text-[10px] uppercase">Weather Ledger</span>
                      <div className="flex items-center gap-1.5 text-[#E0E0E0] font-semibold mt-0.5">
                        <CloudSun className="w-3.5 h-3.5 text-[#F27D26]" />
                        <span>{simulationState.status.weather}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[#666] font-mono block text-[10px] uppercase">Special Quirks & Talents</span>
                      <p className="text-[#999] mt-0.5 text-[11px] leading-relaxed line-clamp-3" title={character.quirks}>
                        {character.quirks || "No special quirks noted."}
                      </p>
                    </div>

                    <div>
                      <span className="text-[#666] font-mono block text-[10px] uppercase">Personality Aura</span>
                      <p className="text-[#999] mt-0.5 text-[11px] leading-relaxed line-clamp-2" title={character.personality}>
                        {character.personality || "No personality attributes."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ACTIVE INVENTORY TRACKER (Dynamic with prompt rules) */}
                <div className="bg-[#121212] border border-[#2A2A2A] rounded-xl p-4.5 space-y-3.5 flex-1 min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2.5">
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-[#F27D26]" />
                      Active Belongings ({simulationState.inventory.length})
                    </h4>
                    <span className="text-[10px] font-mono text-[#555]">Pouch Capacity: 15/150</span>
                  </div>

                  {simulationState.inventory.length === 0 ? (
                    <div className="py-8 text-center space-y-1">
                      <div className="text-2xl">🎒</div>
                      <p className="text-xs font-mono text-[#555]">Your satchel is entirely empty.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {simulationState.inventory.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded bg-[#0F0F0F] border border-[#2A2A2A]/60 flex items-start gap-2.5 hover:border-[#F27D26]/20 transition group"
                        >
                          <div className="text-lg mt-0.5">
                            {item.name.toLowerCase().includes("apple") ? "🍎" : "⚔️"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-bold text-xs text-[#E0E0E0] truncate group-hover:text-[#F27D26] transition">
                                {item.name}
                              </span>
                              <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                item.status.toLowerCase().includes("rot") || item.status.toLowerCase().includes("rust")
                                  ? "bg-red-950/50 text-red-400 border border-red-900/30 animate-pulse"
                                  : "bg-[#0A0A0A] text-[#666]"
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#999] mt-0.5 line-clamp-2">
                              {item.description}
                            </p>

                            {/* Interaction button for inventory items */}
                            <div className="mt-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150">
                              <button
                                onClick={() => triggerQuickAction(`I utilize my ${item.name} and apply it carefully.`)}
                                className="px-1.5 py-0.5 rounded bg-[#0A0A0A] border border-[#2A2A2A] text-[9px] font-mono text-slate-300 hover:bg-[#121212] transition cursor-pointer"
                              >
                                Use Item
                              </button>
                              <button
                                onClick={() => triggerQuickAction(`I examine my ${item.name} closely to study its details.`)}
                                className="px-1.5 py-0.5 rounded bg-[#0A0A0A] border border-[#2A2A2A] text-[9px] font-mono text-slate-300 hover:bg-[#121212] transition cursor-pointer"
                              >
                                Examine
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* LOCALLY TRACKED NPCs SIDEBAR */}
                <div className="bg-[#121212] border border-[#2A2A2A] rounded-xl p-4.5 space-y-3">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-[#2A2A2A] pb-2.5">
                    <User className="w-4 h-4 text-[#F27D26]" />
                    Encountered NPCs ({simulationState.npcs.length})
                  </h4>

                  {simulationState.npcs.length === 0 ? (
                    <p className="text-xs font-mono text-[#555] py-3 text-center italic">
                      No known NPCs nearby or remembered yet.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {simulationState.npcs.map((npc, idx) => {
                        const isExpanded = expandedNpcName === npc.name;
                        const affinityVal = npc.affinity !== undefined ? npc.affinity : 0;
                        const barPct = ((affinityVal + 100) / 200) * 100;
                        const barColor = affinityVal > 10 ? "bg-emerald-500" : affinityVal < -10 ? "bg-red-500" : "bg-zinc-500";
                        const relationshipColor = 
                          npc.relationship.toLowerCase().includes("soulbound") || npc.relationship.toLowerCase().includes("loyal") || npc.relationship.toLowerCase().includes("friendly")
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                            : npc.relationship.toLowerCase().includes("archnemesis") || npc.relationship.toLowerCase().includes("hostile")
                            ? "bg-red-950/40 text-red-400 border border-red-900/30"
                            : "bg-[#0A0A0A] text-[#888] border border-[#2A2A2A]";

                        return (
                          <div 
                            key={idx} 
                            className={`p-2.5 bg-[#0F0F0F]/60 rounded-lg border transition duration-200 text-xs ${
                              isExpanded ? "border-[#F27D26]/40 shadow-[0_0_12px_rgba(242,125,38,0.05)]" : "border-[#2A2A2A] hover:border-[#F27D26]/20"
                            }`}
                          >
                            <div 
                              onClick={() => setExpandedNpcName(isExpanded ? null : npc.name)}
                              className="flex justify-between items-start gap-2 cursor-pointer select-none"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-[#E0E0E0] block hover:text-[#F27D26] transition flex items-center gap-1.5">
                                  {npc.name}
                                  {isExpanded ? (
                                    <span className="text-[10px] text-[#555] font-normal">▲</span>
                                  ) : (
                                    <span className="text-[10px] text-[#555] font-normal">▼</span>
                                  )}
                                </span>
                                <span className="text-[10px] text-[#999] font-sans leading-tight block truncate mt-0.5">
                                  {npc.status}
                                </span>
                              </div>
                              <span className={`text-[9px] font-mono px-1 py-0.5 rounded shrink-0 ${relationshipColor}`}>
                                {npc.relationship}
                              </span>
                            </div>

                            {/* Expanded NPC State Panel */}
                            {isExpanded && (
                              <div className="mt-3.5 pt-3.5 border-t border-[#222] space-y-3.5 animate-fadeIn">
                                {/* Affinity Slider Meter */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-[#666]">Affinity Rating</span>
                                    <span className={affinityVal > 10 ? "text-emerald-400 font-bold" : affinityVal < -10 ? "text-red-400 font-bold" : "text-[#999]"}>
                                      {affinityVal > 0 ? `+${affinityVal}` : affinityVal}
                                    </span>
                                  </div>
                                  <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden relative border border-[#222]">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                      style={{ width: `${barPct}%` }}
                                    />
                                    {/* Center line representation for Neutral/Zero */}
                                    <div className="absolute left-1/2 top-0 w-0.5 h-full bg-[#333] -translate-x-1/2" />
                                  </div>
                                </div>

                                {/* Memories & Deeds */}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono text-[#666] uppercase block">Memory Records</span>
                                  {npc.memories && npc.memories.length > 0 ? (
                                    <ul className="space-y-1 text-[11px] text-[#BBB]">
                                      {npc.memories.map((memory, mIdx) => (
                                        <li key={mIdx} className="bg-[#0A0A0A]/80 p-1.5 rounded border border-[#222] flex items-start gap-2 leading-relaxed">
                                          <span className="text-[#F27D26] mt-0.5 shrink-0 text-[10px]">📜</span>
                                          <span className="flex-1">{memory}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-[10px] italic text-[#555] font-sans pl-1">No major conversations or actions remembered yet.</p>
                                  )}
                                </div>

                                {/* Quests offered or active */}
                                {npc.quests && npc.quests.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-mono text-[#666] uppercase block">Quest-line Availability</span>
                                    <div className="space-y-2">
                                      {npc.quests.map((quest) => {
                                        const isQuestAvailable = affinityVal >= quest.requiredAffinity;
                                        return (
                                          <div 
                                            key={quest.id} 
                                            className={`p-2 rounded border text-[11px] ${
                                              quest.status === "completed"
                                                ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300"
                                                : quest.status === "failed"
                                                ? "bg-red-950/20 border-red-900/40 text-red-400"
                                                : quest.status === "active"
                                                ? "bg-[#1E1A12] border-[#F27D26]/40 text-[#E0E0E0]"
                                                : isQuestAvailable
                                                ? "bg-[#0A0A0A] border-[#2A2A2A] text-[#CCC]"
                                                : "bg-[#0A0A0A]/40 border-[#222]/40 text-[#555] opacity-60"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between gap-1.5 mb-1">
                                              <span className="font-bold flex items-center gap-1">
                                                {quest.status === "completed" ? "✅" : quest.status === "active" ? "⚔️" : "⭐"} {quest.title}
                                              </span>
                                              <span className={`text-[8px] font-mono uppercase px-1 rounded ${
                                                quest.status === "completed"
                                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                                  : quest.status === "failed"
                                                  ? "bg-red-950 text-red-400 border border-red-900"
                                                  : quest.status === "active"
                                                  ? "bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/40"
                                                  : isQuestAvailable
                                                  ? "bg-amber-950/40 text-amber-400 border border-amber-900/30"
                                                  : "bg-[#111] text-[#444] border border-[#222]"
                                              }`}>
                                                {quest.status}
                                              </span>
                                            </div>
                                            <p className="text-[10px] text-[#999] leading-tight mb-1">{quest.description}</p>
                                            <div className="flex items-center justify-between text-[9px] font-mono mt-1 pt-1 border-t border-[#222]/40 text-[#666]">
                                              <span>Reward: <span className="text-[#F27D26]">{quest.reward}</span></span>
                                              {!isQuestAvailable && (
                                                <span className="text-red-400/80">Affinity required: {quest.requiredAffinity}</span>
                                              )}
                                            </div>

                                            {/* Action triggers */}
                                            {quest.status === "available" && isQuestAvailable && (
                                              <button
                                                onClick={() => triggerQuickAction(`I ask ${npc.name} to accept the quest: "${quest.title}".`)}
                                                className="mt-2 w-full py-0.5 rounded bg-[#111] border border-[#333] hover:border-[#F27D26]/40 text-[#E0E0E0] font-mono hover:text-[#F27D26] transition text-[9px] cursor-pointer"
                                              >
                                                Accept Quest
                                              </button>
                                            )}
                                            {quest.status === "active" && (
                                              <div className="flex gap-1 mt-2">
                                                <button
                                                  onClick={() => triggerQuickAction(`I report back to ${npc.name} regarding active quest: "${quest.title}".`)}
                                                  className="flex-1 py-0.5 rounded bg-[#111] border border-[#333] hover:border-emerald-500/40 hover:text-emerald-400 text-[#E0E0E0] font-mono transition text-[9px] cursor-pointer"
                                                >
                                                  Turn In / Progress
                                                </button>
                                                <button
                                                  onClick={() => triggerQuickAction(`I ask ${npc.name} for clarification or help on: "${quest.title}".`)}
                                                  className="flex-1 py-0.5 rounded bg-[#111] border border-[#333] hover:border-[#F27D26]/40 text-[#E0E0E0] font-mono transition text-[9px] cursor-pointer"
                                                >
                                                  Details
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Quick interactions */}
                                <div className="pt-3 border-t border-[#222] space-y-1.5">
                                  <span className="text-[9px] font-mono text-[#555] uppercase block">Quick Interactions</span>
                                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                                    <button
                                      onClick={() => triggerQuickAction(`I approach ${npc.name} and strike up a conversation.`)}
                                      className="p-1.5 rounded bg-[#0A0A0A] border border-[#222] text-[#BBB] hover:border-[#F27D26]/40 hover:text-[#F27D26] transition text-left cursor-pointer flex items-center gap-1"
                                    >
                                      <span>💬</span> <span>Inquire / Talk</span>
                                    </button>
                                    <button
                                      onClick={() => triggerQuickAction(`I offer ${npc.name} a gift or bribe to curry favor.`)}
                                      className="p-1.5 rounded bg-[#0A0A0A] border border-[#222] text-[#BBB] hover:border-[#F27D26]/40 hover:text-[#F27D26] transition text-left cursor-pointer flex items-center gap-1"
                                    >
                                      <span>🎁</span> <span>Offer Gift</span>
                                    </button>
                                    <button
                                      onClick={() => triggerQuickAction(`I threaten or demand answers from ${npc.name}.`)}
                                      className="p-1.5 rounded bg-[#0A0A0A] border border-[#222] text-[#BBB] hover:border-red-500/30 hover:text-red-400 transition text-left cursor-pointer flex items-center gap-1"
                                    >
                                      <span>⚡</span> <span>Threaten</span>
                                    </button>
                                    <button
                                      onClick={() => triggerQuickAction(`I examine ${npc.name} closely to read their body language.`)}
                                      className="p-1.5 rounded bg-[#0A0A0A] border border-[#222] text-[#BBB] hover:border-[#F27D26]/40 hover:text-[#F27D26] transition text-left cursor-pointer flex items-center gap-1"
                                    >
                                      <span>🔍</span> <span>Observe</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
