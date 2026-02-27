import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Leaf, Loader2 } from "lucide-react";
import { useKisanState, DEMO_QUERIES } from "@/lib/kisan-context";
import { useChat } from "@/hooks/use-kisan";
import { Sidebar } from "@/components/Sidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { FloatingBackground } from "@/components/FloatingBackground";

export function Home() {
  const { mode, language, chatSession, addMessage, demoMode } = useKisanState();
  const [input, setInput] = useState("");
  const chatMutation = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatSession, chatMutation.isPending]);

  // Voice input using Web Speech API
  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang =
      language === "Hindi" ? "hi-IN" : language === "Telugu" ? "te-IN" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, language]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userText = input.trim();
    setInput("");

    addMessage({ type: "user", text: userText, timestamp: new Date() });

    chatMutation.mutate(
      { text: userText, mode, language },
      {
        onSuccess: (data) => {
          addMessage({ type: "ai", data });
        },
      }
    );
  };

  // Demo mode: preload example queries
  const demoQueries = demoMode ? DEMO_QUERIES : [];

  const suggestionCards = [
    {
      emoji: "🌱",
      title: "Crop Advice",
      query: "What is the best fertilizer for wheat in summer?",
      color: "text-emerald-500",
    },
    {
      emoji: "🐛",
      title: "Pest Control",
      query: "How to control aphids in mustard crop?",
      color: "text-red-500",
    },
    {
      emoji: "🏛️",
      title: "Govt. Schemes",
      query: "How to apply for PM Kisan Samman Nidhi scheme?",
      color: "text-blue-500",
    },
    {
      emoji: "💊",
      title: "Disease Control",
      query: "How to treat blight disease in potato crops?",
      color: "text-purple-500",
    },
  ];

  return (
    <div
      className={`min-h-screen w-full flex flex-col md:flex-row relative bg-[#032314] ${demoMode ? "demo-active" : ""}`}
    >
      <FloatingBackground />

      {/* Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 glass-panel rounded-b-3xl relative z-20 mb-4 mx-2 mt-2">
        <div className="flex items-center gap-2">
          <Leaf className="text-emerald-400 w-6 h-6" />
          <h1 className="text-xl font-bold text-white font-display">
            KrishiSahay
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {mode === "offline" && (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-400/20 glow-badge">
              🌐 Low Connectivity
            </span>
          )}
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-100 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
            <span
              className={`w-2 h-2 rounded-full ${mode === "online" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}
            />
            {mode.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative z-10 h-[calc(100vh-80px)] md:h-screen">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
          <div className="max-w-4xl mx-auto w-full pb-32">
            <AnimatePresence mode="popLayout">
              {chatSession.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl rotate-12 mb-8 flex items-center justify-center shadow-2xl shadow-emerald-500/20 border-4 border-white/10">
                    <div className="-rotate-12 text-5xl">🌾</div>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-3 font-display tracking-tight text-glow">
                    KrishiSahay
                  </h2>
                  <p className="text-emerald-300/70 text-sm font-medium uppercase tracking-widest mb-2">
                    Generative AI Agricultural Query Resolution System
                  </p>
                  <p className="text-emerald-100/70 text-lg md:text-xl max-w-lg mx-auto mb-10 font-medium">
                    Powered by IBM Watsonx Granite LLM & FAISS Semantic Search.
                    Ask about crops, pests, fertilizers, or government schemes.
                  </p>

                  {/* Suggestion Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                    {suggestionCards.map((card, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i }}
                        onClick={() => setInput(card.query)}
                        className="glass-card hover:bg-white/90 p-4 rounded-2xl text-left group transition-all duration-300"
                      >
                        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                          <span
                            className={`${card.color} group-hover:scale-110 transition-transform`}
                          >
                            {card.emoji}
                          </span>
                          {card.title}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium">
                          {card.query}
                        </p>
                      </motion.button>
                    ))}
                  </div>

                  {/* Demo Mode Quick Queries */}
                  {demoMode && demoQueries.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-8 w-full max-w-2xl"
                    >
                      <p className="text-xs text-purple-300 font-bold uppercase tracking-widest mb-3">
                        🎬 Demo Queries (Click to auto-fill)
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {demoQueries.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => setInput(q)}
                            className="px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold hover:bg-purple-500/30 transition-all"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                chatSession.map((msg, i) => (
                  <ChatMessage key={i} message={msg} />
                ))
              )}

              {chatMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 max-w-[85%]"
                >
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl animate-pulse">🤖</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl rounded-tl-sm flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                    <span className="text-emerald-100 font-medium text-sm">
                      {mode === "online"
                        ? "Querying FAISS + Granite LLM..."
                        : "Searching knowledge base..."}
                    </span>
                    <div className="typing-dots flex gap-1 ml-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full p-4 md:p-8 bg-gradient-to-t from-[#032314] via-[#032314]/90 to-transparent pointer-events-none">
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
            <form
              onSubmit={handleSend}
              className="bg-white p-2 pl-6 rounded-3xl shadow-2xl shadow-black/20 flex items-center gap-3 border-[3px] border-emerald-100/50 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-300"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about crops, pests, fertilizers, or schemes..."
                className="flex-1 bg-transparent text-slate-800 text-[15px] md:text-base font-medium placeholder:text-slate-400 focus:outline-none"
                disabled={chatMutation.isPending}
              />
              <div className="flex items-center gap-1.5 pr-1">
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${isListening
                      ? "bg-red-50 text-red-500 animate-pulse"
                      : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                    }`}
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || chatMutation.isPending}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </div>
            </form>
            <div className="text-center mt-3">
              <p className="text-[11px] text-emerald-200/50 font-medium uppercase tracking-widest">
                KrishiSahay • {mode} mode • IBM Watsonx Granite + FAISS
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
