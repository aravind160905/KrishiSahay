import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Wifi, WifiOff, Activity, History, BarChart3, Globe,
  PlusCircle, Sprout, ChevronRight, GitBranch, Zap
} from "lucide-react";
import { useKisanState } from "@/lib/kisan-context";
import { useQueryHistory } from "@/hooks/use-kisan";
import { useState } from "react";

export function Sidebar() {
  const [location] = useLocation();
  const { mode, setMode, language, setLanguage, clearSession, demoMode, toggleDemoMode } =
    useKisanState();
  const { data: history, isLoading } = useQueryHistory();
  const [clickCount, setClickCount] = useState(0);

  const isAnalytics = location === "/analytics";
  const isArchitecture = location === "/architecture";

  // Hidden demo mode: triple-click the logo
  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 3) {
      toggleDemoMode();
      setClickCount(0);
    }
    setTimeout(() => setClickCount(0), 1500);
  };

  return (
    <div className={`w-full md:w-80 h-full flex flex-col glass-panel md:rounded-r-[2.5rem] relative z-10 overflow-hidden ${demoMode ? "demo-active" : ""}`}>
      {/* Brand */}
      <div className="p-8 pb-6 border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleLogoClick}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 data-node">
            <Sprout className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none font-display">
              KrishiSahay
            </h1>
            <p className="text-[10px] text-emerald-200/60 font-medium tracking-wider uppercase mt-0.5">
              AI Agricultural Assistant
            </p>
          </div>
        </div>
        {/* Low Connectivity Badge */}
        {mode === "offline" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center gap-2 glow-badge"
          >
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-300 tracking-wide">
              🌐 Low Connectivity Optimized
            </span>
          </motion.div>
        )}
        {mode === "online" && (
          <div className="mt-4 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-200/80 font-semibold tracking-wide uppercase">
              Cloud Connected • Granite LLM Active
            </span>
          </div>
        )}
        {/* Demo Mode Badge */}
        {demoMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-2 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center gap-2"
          >
            <Zap className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
              Demo Mode Active
            </span>
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {/* New Consultation */}
        <button
          onClick={() => {
            clearSession();
            if (isAnalytics || isArchitecture) window.location.href = "/";
          }}
          className="w-full py-3.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98]"
        >
          <PlusCircle className="w-5 h-5" />
          New Consultation
        </button>

        {/* Controls */}
        <div className="space-y-5">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              Operating Mode
            </label>
            <div className="flex p-1 rounded-xl bg-black/20 border border-white/5 relative">
              <div
                className="absolute inset-y-1 w-[calc(50%-4px)] bg-emerald-500 rounded-lg shadow-lg transition-all duration-300 ease-out"
                style={{
                  left: mode === "offline" ? "4px" : "calc(50%)",
                }}
              />
              <button
                onClick={() => setMode("offline")}
                className={`flex-1 py-2 text-sm font-semibold z-10 flex items-center justify-center gap-2 transition-colors ${mode === "offline"
                    ? "text-white"
                    : "text-white/60 hover:text-white/80"
                  }`}
              >
                <WifiOff className="w-4 h-4" /> Offline
              </button>
              <button
                onClick={() => setMode("online")}
                className={`flex-1 py-2 text-sm font-semibold z-10 flex items-center justify-center gap-2 transition-colors ${mode === "online"
                    ? "text-white"
                    : "text-white/60 hover:text-white/80"
                  }`}
              >
                <Wifi className="w-4 h-4" /> Online
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 appearance-none transition-all cursor-pointer"
            >
              <option value="English" className="bg-[#032314]">English</option>
              <option value="Hindi" className="bg-[#032314]">हिन्दी (Hindi)</option>
              <option value="Telugu" className="bg-[#032314]">తెలుగు (Telugu)</option>
            </select>
          </div>
        </div>

        {/* Navigation */}
        <div className="pt-4 border-t border-white/5 space-y-2">
          <Link
            href="/analytics"
            className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 group ${isAnalytics
                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                : "hover:bg-white/5 text-white/70 hover:text-white"
              }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5" />
              <span className="font-semibold">Analytics Hub</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
          <Link
            href="/architecture"
            className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 group ${isArchitecture
                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                : "hover:bg-white/5 text-white/70 hover:text-white"
              }`}
          >
            <div className="flex items-center gap-3">
              <GitBranch className="w-5 h-5" />
              <span className="font-semibold">Architecture</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* History */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <History className="w-3.5 h-3.5" />
            Recent Queries
          </label>
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
              ))
            ) : !history || history.length === 0 ? (
              <p className="text-sm text-white/40 italic">No previous queries.</p>
            ) : (
              history.slice(0, 5).map((q) => (
                <div
                  key={q.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <p className="text-sm text-white/90 line-clamp-1 font-medium group-hover:text-emerald-300 transition-colors">
                    {q.text}
                  </p>
                  <div className="flex gap-2 mt-1.5 opacity-60 text-[10px] font-medium uppercase tracking-wider">
                    <span>{q.mode}</span>
                    <span>•</span>
                    <span>{q.language}</span>
                    <span>•</span>
                    <span>{q.responseTimeMs}ms</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
