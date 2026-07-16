"use client";

import React, { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  ChevronRight,
  TrendingDown
} from "lucide-react";
import toast from "react-hot-toast";

interface MistakeLog {
  id: string;
  playerName: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  notes: string;
  over: number;
  ball: number;
  matchOpponent: string;
  timestamp: string;
  matchId: string;
}

const mockMistakeLogs: MistakeLog[] = [
  {
    id: "ms1",
    playerName: "Rohan Sharma",
    category: "Poor Footwork",
    severity: "High",
    notes: "Played across the line to an outswinger. Got caught at second slip. Needs to transfer weight forward.",
    over: 4,
    ball: 2,
    matchOpponent: "Warriors CC",
    timestamp: "2026-07-10T16:20:00Z",
    matchId: "m1",
  },
  {
    id: "ms2",
    playerName: "Karan Johar",
    category: "No Ball",
    severity: "Medium",
    notes: "Overstepped by 3 inches on the crease. Bowled a free-hit which went for six. Discipline issue.",
    over: 12,
    ball: 4,
    matchOpponent: "Royal Challengers",
    timestamp: "2026-07-04T15:45:00Z",
    matchId: "m2",
  },
  {
    id: "ms3",
    playerName: "Sanjay Patel",
    category: "Dropped Catch",
    severity: "High",
    notes: "Dropped a simple sitter at long-on. Lack of concentration under pressure.",
    over: 18,
    ball: 3,
    matchOpponent: "Knights XI",
    timestamp: "2026-06-28T17:10:00Z",
    matchId: "m3",
  },
  {
    id: "ms4",
    playerName: "Amit Tendulkar",
    category: "Communication Error",
    severity: "Medium",
    notes: "Misjudged a single, leading to a close run-out call. Communication with partner was low.",
    over: 8,
    ball: 5,
    matchOpponent: "Warriors CC",
    timestamp: "2026-07-10T16:40:00Z",
    matchId: "m1",
  },
  {
    id: "ms5",
    playerName: "Vikram Kumar",
    category: "Half Volley",
    severity: "Low",
    notes: "Bowled a half volley on leg stump. Dispatched for four. Needs to pull back length.",
    over: 14,
    ball: 1,
    matchOpponent: "Knights XI",
    timestamp: "2026-06-28T16:50:00Z",
    matchId: "m3",
  }
];

export default function MistakesLogPage() {
  const [logs, setLogs] = useState<MistakeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [isRealData, setIsRealData] = useState(false);

  useEffect(() => {
    async function fetchMistakes() {
      try {
        setLoading(true);
        const q = query(collection(db, "mistake_logs"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const fetchedLogs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as MistakeLog[];
          setLogs(fetchedLogs);
          setIsRealData(true);
        } else {
          // Fallback to high-quality mocks
          setLogs(mockMistakeLogs);
        }
      } catch (err) {
        console.warn("Firestore error reading mistakes collection, falling back to mock logs:", err);
        setLogs(mockMistakeLogs);
      } finally {
        setLoading(false);
      }
    }

    fetchMistakes();
  }, []);

  // Filter logs based on filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.playerName.toLowerCase().includes(search.toLowerCase()) || 
                          log.notes.toLowerCase().includes(search.toLowerCase()) ||
                          log.matchOpponent.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || log.category === selectedCategory;
    const matchesSeverity = selectedSeverity === "all" || log.severity === selectedSeverity;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const categories = [
    "all",
    "Wrong Shot",
    "Poor Footwork",
    "Dot Ball",
    "Bad Shot Selection",
    "Run Out Chance",
    "Communication Error",
    "Bad Line",
    "Bad Length",
    "Wide",
    "No Ball",
    "Half Volley",
    "Short Ball",
    "Dropped Catch",
    "Misfield",
    "Poor Throw",
    "Missed Run Out",
    "Slow Running",
    "Low Energy",
    "Lost Concentration",
    "Poor Decision",
  ];

  return (
    <LayoutWrapper>
      <div className="space-y-8 animate-fade-in">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-[#002B7F] dark:text-white flex items-center">
              <AlertTriangle className="mr-3 text-[#FF6B00]" size={32} />
              Coach's Mistakes Ledger
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Read-only feed of tactical mistakes logged during games to facilitate player improvements
            </p>
          </div>
          <div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
              isRealData 
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
            }`}>
              {isRealData ? "● Live Database Connected" : "▲ Simulation Mode"}
            </span>
          </div>
        </div>

        {/* Search and Filters panel */}
        <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md space-y-4">
          <div className="flex items-center bg-slate-500/5 px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
            <Search size={18} className="text-slate-400 mr-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by player name, opponent, notes..."
              className="block w-full bg-transparent border-none text-sm outline-none text-slate-800 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs font-semibold px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c === "all" ? "All Categories" : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="text-xs font-semibold px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
              >
                <option value="all">All Severity</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Counter */}
            <div className="ml-auto text-xs text-slate-400 font-semibold">
              Showing {filteredLogs.length} logged incidents
            </div>
          </div>
        </div>

        {/* Mistakes List Feed */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-t-[#0A3D91] border-slate-200 rounded-full animate-spin" />
            <p className="text-xs text-slate-400 mt-2">Loading tactical records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-500/5">
            <TrendingDown size={32} className="mx-auto text-slate-350 mb-3" />
            <p className="text-sm font-semibold">No Mistakes Logged</p>
            <p className="text-xs mt-1 text-slate-500">All set! No tactical errors match your filter selections.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => {
              let severityColor = "bg-green-500/10 text-green-600 border border-green-500/20";
              if (log.severity === "High") severityColor = "bg-red-500/10 text-red-500 border border-red-500/20";
              else if (log.severity === "Medium") severityColor = "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20";
              
              return (
                <div 
                  key={log.id} 
                  className="glass-panel p-5 md:p-6 rounded-2xl border border-white/20 shadow-md flex flex-col md:flex-row md:items-start justify-between space-y-4 md:space-y-0 hover:border-slate-200/80 dark:hover:border-slate-700/80 transition-all duration-300"
                >
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex flex-wrap gap-2 items-center">
                      <h3 className="font-extrabold text-slate-800 dark:text-white text-base">{log.playerName}</h3>
                      <span className="text-xs text-slate-400">|</span>
                      <span className="text-xs font-bold text-[#0A3D91] dark:text-[#D9ECFF] bg-[#0A3D91]/10 px-2 py-0.5 rounded-md">
                        {log.category}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${severityColor}`}>
                        {log.severity} Severity
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-[#F7FAFF] dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                      {log.notes}
                    </p>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400 font-semibold pt-1">
                      <span className="flex items-center">
                        <Clock size={12} className="mr-1.5" />
                        Match: vs {log.matchOpponent}
                      </span>
                      <span className="flex items-center">
                        <ChevronRight size={12} className="mr-1" />
                        Timeline: Over {log.over}.{log.ball}
                      </span>
                      <span className="flex items-center">
                        <Calendar size={12} className="mr-1.5" />
                        Logged: {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                      Coach Note
                    </span>
                    <span className="mt-0.5 text-xs text-[#FF6B00] font-extrabold bg-[#FF6B00]/10 px-2.5 py-1 rounded-xl">
                      Review Needed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </LayoutWrapper>
  );
}
