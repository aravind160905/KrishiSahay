import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Database, Cpu, Globe2, Search, Brain, Monitor, Zap } from "lucide-react";
import { FloatingBackground } from "@/components/FloatingBackground";

const nodes = [
    {
        id: "input",
        icon: Monitor,
        label: "User Query",
        desc: "Farmer inputs agricultural question via text or voice in English, Hindi, or Telugu",
        color: "from-blue-500 to-cyan-500",
        x: "50%",
        y: "8%",
    },
    {
        id: "embed",
        icon: Cpu,
        label: "Query Embedding",
        desc: "Query is converted to a 384-dim vector using Sentence Transformer (all-MiniLM-L6-v2)",
        color: "from-violet-500 to-purple-500",
        x: "25%",
        y: "30%",
    },
    {
        id: "faiss",
        icon: Search,
        label: "FAISS Vector Search",
        desc: "Cosine similarity search over pre-computed KCC embeddings. Retrieves top-5 most similar Q&A pairs",
        color: "from-amber-500 to-orange-500",
        x: "75%",
        y: "30%",
    },
    {
        id: "kcc",
        icon: Database,
        label: "KCC Knowledge Base",
        desc: "60+ curated Q&A pairs from Kisan Call Centre covering pest control, fertilizers, diseases, and schemes",
        color: "from-emerald-500 to-teal-500",
        x: "75%",
        y: "52%",
    },
    {
        id: "granite",
        icon: Brain,
        label: "IBM Granite LLM",
        desc: "ibm/granite-3-8b-instruct model via Watsonx API. Enhances retrieved context into natural language advice",
        color: "from-red-500 to-pink-500",
        x: "25%",
        y: "52%",
    },
    {
        id: "firebase",
        icon: Zap,
        label: "Firebase Firestore",
        desc: "Stores query history, analytics, and user feedback for persistent data tracking",
        color: "from-yellow-500 to-amber-500",
        x: "25%",
        y: "76%",
    },
    {
        id: "output",
        icon: Globe2,
        label: "Response Display",
        desc: "Offline Insight + AI Enhanced answer with confidence score, sources, and related questions",
        color: "from-emerald-500 to-green-500",
        x: "50%",
        y: "92%",
    },
];

export function Architecture() {
    return (
        <div className="min-h-screen w-full bg-[#032314] relative overflow-hidden">
            <FloatingBackground />

            <header className="relative z-10 p-6 md:p-10 pb-0">
                <div className="max-w-6xl mx-auto flex items-center gap-6">
                    <Link
                        href="/"
                        className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white font-display tracking-tight">
                            RAG Pipeline Architecture
                        </h1>
                        <p className="text-emerald-200/70 font-medium mt-1">
                            Retrieval-Augmented Generation flow for KrishiSahay
                        </p>
                    </div>
                </div>
            </header>

            <main className="relative z-10 p-6 md:p-10">
                <div className="max-w-6xl mx-auto">
                    {/* Pipeline Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                        {nodes.map((node, i) => {
                            const Icon = node.icon;
                            return (
                                <motion.div
                                    key={node.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="glass-card p-6 rounded-3xl group hover:shadow-2xl transition-all duration-300"
                                >
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${node.color} flex items-center justify-center shadow-lg flex-shrink-0 data-node`}
                                        >
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                                                    Step {i + 1}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-800 font-display">
                                                {node.label}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                                {node.desc}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Flow Diagram */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-10 glass-card p-8 rounded-3xl"
                    >
                        <h3 className="text-xl font-bold text-slate-800 font-display mb-6">
                            Data Flow
                        </h3>
                        <div className="flex flex-col items-center gap-3">
                            {[
                                { from: "User Query", arrow: "↓", to: "Query Embedding (384-dim Vector)" },
                                { from: "Query Embedding", arrow: "↓", to: "FAISS Cosine Similarity Search" },
                                { from: "FAISS Search", arrow: "↓", to: "Top-5 KCC Q&A Pairs Retrieved" },
                                { from: "Retrieved Context", arrow: "↓ (Online Mode)", to: "IBM Granite-3-8b-instruct LLM" },
                                { from: "LLM + FAISS Results", arrow: "↓", to: "Response w/ Confidence Score" },
                                { from: "Response", arrow: "↓", to: "Firebase Storage + UI Display" },
                            ].map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.9 + i * 0.1 }}
                                    className="flex items-center gap-4 w-full max-w-xl"
                                >
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 py-3 px-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-sm font-semibold text-slate-700">
                                            {step.from}
                                        </span>
                                        <span className="text-emerald-500 mx-2 font-bold">{step.arrow}</span>
                                        <span className="text-sm text-slate-500">{step.to}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Tech Stack */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5 }}
                        className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        {[
                            { name: "IBM Watsonx", desc: "Granite-3-8b", color: "bg-red-500" },
                            { name: "FAISS", desc: "Vector Search", color: "bg-amber-500" },
                            { name: "Firebase", desc: "Firestore DB", color: "bg-yellow-500" },
                            { name: "React + Vite", desc: "Frontend", color: "bg-blue-500" },
                        ].map((tech, i) => (
                            <div
                                key={i}
                                className="glass-panel p-4 rounded-2xl flex items-center gap-3"
                            >
                                <div className={`w-3 h-3 rounded-full ${tech.color}`} />
                                <div>
                                    <p className="text-white font-bold text-sm">{tech.name}</p>
                                    <p className="text-white/50 text-xs">{tech.desc}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
