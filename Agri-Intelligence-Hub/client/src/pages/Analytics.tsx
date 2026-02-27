import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, TrendingUp, Users, Zap, ShieldCheck, Clock, ThumbsUp, Globe2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { useAnalytics } from "@/hooks/use-kisan";
import { FloatingBackground } from "@/components/FloatingBackground";

const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#6366f1", "#ec4899"];

export function Analytics() {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#032314] flex items-center justify-center">
        <FloatingBackground />
        <div className="glass-panel p-8 rounded-3xl flex flex-col items-center z-10">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
          <p className="text-emerald-100 font-display font-bold text-xl">Loading Intelligence...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#032314] p-8 relative z-10 flex items-center justify-center">
        <div className="glass-panel p-8 rounded-3xl text-center max-w-md">
          <p className="text-red-400 mb-4">Unable to load analytics.</p>
          <Link href="/" className="px-6 py-2 bg-emerald-500 text-white rounded-xl inline-block font-semibold">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: "Offline", value: data.offlineUsage || 1 },
    { name: "Online", value: data.onlineUsage || 1 },
  ];

  const langData = data.languageDistribution.length > 0
    ? data.languageDistribution
    : [{ language: "English", count: 0 }, { language: "Hindi", count: 0 }];

  return (
    <div className="min-h-screen w-full bg-[#032314] relative overflow-hidden flex flex-col">
      <FloatingBackground />

      <header className="relative z-10 p-6 md:p-10 pb-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-white hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white font-display tracking-tight">Intelligence Dashboard</h1>
              <p className="text-emerald-200/70 font-medium mt-1">Platform usage and performance metrics</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 glass-panel px-5 py-3 rounded-2xl">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-bold tracking-wide">LIVE</span>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 rounded-3xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-1">Total Consultations</h3>
              <p className="text-4xl font-black text-slate-800 font-display">{data.totalQueries}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 rounded-3xl">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-1">Avg Confidence</h3>
              <p className="text-4xl font-black text-slate-800 font-display">{Math.round(data.averageConfidence)}%</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 rounded-3xl">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-1">Avg Response Time</h3>
              <p className="text-4xl font-black text-slate-800 font-display">
                {data.averageResponseTime < 1000
                  ? `${data.averageResponseTime}ms`
                  : `${(data.averageResponseTime / 1000).toFixed(1)}s`}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 rounded-3xl">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <ThumbsUp className="w-6 h-6" />
              </div>
              <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-1">User Satisfaction</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-slate-800 font-display">
                  {data.feedbackStats.positive + data.feedbackStats.negative > 0
                    ? Math.round(
                      (data.feedbackStats.positive /
                        (data.feedbackStats.positive + data.feedbackStats.negative)) *
                      100
                    )
                    : 0}%
                </p>
                <span className="text-xs text-slate-400 font-semibold">
                  ({data.feedbackStats.positive}👍 {data.feedbackStats.negative}👎)
                </span>
              </div>
            </motion.div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
            {/* Bar Chart */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="glass-card p-6 rounded-3xl lg:col-span-2 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 font-display">Most Asked Topics</h3>
                <TrendingUp className="text-emerald-500 w-5 h-5" />
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.mostAskedCrops} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="crop" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8" }} />
                    <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", fontWeight: "bold" }} />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {data.mostAskedCrops.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Pie Chart */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="glass-card p-6 rounded-3xl shadow-2xl flex flex-col">
              <h3 className="text-xl font-bold text-slate-800 font-display mb-2">Mode Distribution</h3>
              <p className="text-slate-500 text-sm font-medium mb-6">Offline vs Online usage</p>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", fontWeight: "bold" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm font-bold text-slate-600">Offline ({data.offlineUsage})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-slate-600">Online ({data.onlineUsage})</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Language Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-card p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <Globe2 className="w-5 h-5 text-blue-500" />
              <h3 className="text-xl font-bold text-slate-800 font-display">Language Distribution</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {langData.map((lang, i) => (
                <div key={i} className="flex-1 min-w-[150px] p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-sm font-bold text-slate-700">{lang.language}</p>
                  <p className="text-3xl font-black text-slate-800 font-display">{lang.count}</p>
                  <p className="text-xs text-slate-400 font-medium">queries</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
