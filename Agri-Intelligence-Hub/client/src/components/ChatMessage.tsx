import { memo, useState } from "react";
import { motion } from "framer-motion";
import {
  User, Sparkles, CheckCircle2, AlertTriangle, BookOpen, ChevronRight,
  ThumbsUp, ThumbsDown, Copy, Clock, Globe2, Database
} from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/lib/kisan-context";
import { useFeedback } from "@/hooks/use-kisan";
import { useKisanState } from "@/lib/kisan-context";

export const ChatMessage = memo(function ChatMessage({
  message,
}: {
  message: ChatMessageType;
}) {
  const isUser = message.type === "user";
  const [feedbackState, setFeedbackState] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);
  const feedbackMutation = useFeedback();
  const { language } = useKisanState();

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex w-full justify-end mb-6"
      >
        <div className="max-w-[85%] md:max-w-[70%] flex gap-3 flex-row-reverse">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0 shadow-lg">
            <User className="w-5 h-5 text-emerald-100" />
          </div>
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-2xl rounded-tr-sm shadow-[0_8px_30px_rgba(16,185,129,0.3)] border border-emerald-500/50">
            <p className="text-[15px] leading-relaxed font-medium">
              {message.text}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const { data } = message;

  const handleFeedback = (type: "up" | "down") => {
    setFeedbackState(type);
    feedbackMutation.mutate({ queryId: data.id, feedback: type });
  };

  const handleCopy = () => {
    const textToCopy = data.aiEnhanced || data.offlineInsight;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, x: -10 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex w-full justify-start mb-8"
    >
      <div className="max-w-[95%] md:max-w-[85%] flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-white shadow-xl shadow-black/10 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-20" />
          <span className="text-xl relative z-10">🤖</span>
        </div>

        <div className="bg-white rounded-2xl rounded-tl-sm shadow-2xl shadow-black/5 border border-emerald-100/50 overflow-hidden flex flex-col w-full">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-slate-700 font-display">
                KrishiSahay Analysis
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* ⏱ Response Time Display */}
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {data.responseTimeMs < 1000
                  ? `${data.responseTimeMs}ms`
                  : `${(data.responseTimeMs / 1000).toFixed(1)}s`}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                {data.mode} mode
              </span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Translation Indicator */}
            {language !== "English" && (
              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 w-fit">
                <Globe2 className="w-3 h-3" />
                <span className="font-semibold">Translated from {language}</span>
              </div>
            )}

            {/* Offline Insight */}
            <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-start gap-3 relative z-10">
                <div className="mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 mb-1">
                    📡 Offline Insight (FAISS Retrieval)
                  </h4>
                  <p className="text-amber-800 text-[15px] leading-relaxed whitespace-pre-line">
                    {data.offlineInsight}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Enhanced */}
            {data.aiEnhanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/60 rounded-xl p-4 relative overflow-hidden group hover:shadow-lg hover:shadow-emerald-500/5 transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className="mt-0.5">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 mb-1">
                      ✨ IBM Granite Enhanced Analysis
                    </h4>
                    <p className="text-emerald-800 text-[15px] leading-relaxed whitespace-pre-line">
                      {data.aiEnhanced}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Confidence Score with Tooltip */}
              <div
                className="bg-slate-50 border border-slate-100 rounded-xl p-4 cursor-help"
                data-tooltip="Confidence based on semantic similarity between your query and Kisan Call Centre data."
              >
                <div className="flex justify-between items-end mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Confidence Level
                  </h4>
                  <span className="text-lg font-bold text-slate-700 font-display leading-none">
                    {data.confidenceScore}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.confidenceScore}%` }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                    className={`h-full rounded-full ${data.confidenceScore > 80
                        ? "bg-emerald-500"
                        : data.confidenceScore > 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                  />
                </div>
              </div>

              {/* Related Questions */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <BookOpen className="w-3.5 h-3.5" /> Related Topics
                </h4>
                <div className="space-y-2">
                  {data.relatedQuestions.slice(0, 3).map((q, i) => (
                    <button
                      key={i}
                      className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-sm text-slate-600 hover:text-emerald-700 transition-colors group"
                    >
                      <span className="truncate pr-2">{q}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Source Attribution */}
            {data.sources && data.sources.length > 0 && (
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4">
                <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Database className="w-3.5 h-3.5" /> Matched KCC Entries
                </h4>
                <div className="space-y-2">
                  {data.sources.map((src, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-white border border-purple-100 text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-purple-900 text-xs">
                          Source {i + 1}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold">
                          {(src.similarity * 100).toFixed(0)}% match
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs line-clamp-2">
                        {src.question}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions: Feedback + Copy */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 mr-2 font-medium">
                  Was this helpful?
                </span>
                <button
                  onClick={() => handleFeedback("up")}
                  className={`p-2 rounded-lg transition-all ${feedbackState === "up"
                      ? "bg-emerald-100 text-emerald-600 scale-110"
                      : "hover:bg-slate-100 text-slate-400 hover:text-emerald-500"
                    }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleFeedback("down")}
                  className={`p-2 rounded-lg transition-all ${feedbackState === "down"
                      ? "bg-red-100 text-red-600 scale-110"
                      : "hover:bg-slate-100 text-slate-400 hover:text-red-500"
                    }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
