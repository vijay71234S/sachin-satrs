"use client";

import React, { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Line, Doughnut } from "react-chartjs-2";
import { 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  AlertTriangle,
  Award,
  BookOpen
} from "lucide-react";
import toast from "react-hot-toast";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

// Register ChartJS elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PlayerReportStat {
  name: string;
  matches: number;
  runs: number;
  wickets: number;
  rating: number;
  mistakes: number;
}

export default function ReportsAdminPage() {
  const [selectedReportType, setSelectedReportType] = useState("squad");
  const [loading, setLoading] = useState(true);

  // Dynamic report stats
  const [teamMetrics, setTeamMetrics] = useState({
    winPercentage: 75,
    averageRuns: 172.4,
    averageWickets: 7.2,
    teamStrength: "Strong middle-order batting & excellent spinners",
    weakness: "Powerplay bowling economy & death-overs run leakage",
    bestBatter: "Rohan Sharma",
    bestBowler: "Vikram Kumar",
    bestFielder: "Sanjay Patel",
    bestAllRounder: "Amit Tendulkar",
    mostImproved: "Devendra Jha",
    mostMistakesPlayer: "Karan Johar (12 mistakes logged)",
  });

  const [playerStats, setPlayerStats] = useState<PlayerReportStat[]>([
    { name: "Rohan Sharma", matches: 20, runs: 612, wickets: 2, rating: 92, mistakes: 4 },
    { name: "Amit Tendulkar", matches: 22, runs: 518, wickets: 14, rating: 88, mistakes: 5 },
    { name: "Karan Johar", matches: 18, runs: 285, wickets: 0, rating: 58, mistakes: 12 },
    { name: "Sanjay Patel", matches: 24, runs: 124, wickets: 0, rating: 78, mistakes: 2 },
    { name: "Vikram Kumar", matches: 22, runs: 45, wickets: 28, rating: 85, mistakes: 6 },
    { name: "Devendra Jha", matches: 15, runs: 310, wickets: 6, rating: 72, mistakes: 4 },
  ]);

  // Chart configuration: Monthly trends
  const [monthlyData, setMonthlyData] = useState<any>({
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    datasets: [
      {
        label: "Runs Scored (Avg)",
        data: [154, 162, 178, 165, 185, 192, 172],
        borderColor: "#0A3D91",
        backgroundColor: "rgba(10, 61, 145, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  });

  // Chart configuration: Mistakes distribution
  const [mistakeData, setMistakeData] = useState<any>({
    labels: ["Batting Errors", "Bowling Line/Length", "Fielding Drops/Misfields", "Fitness", "Mental/Concentration"],
    datasets: [
      {
        data: [14, 22, 18, 5, 9],
        backgroundColor: [
          "#0A3D91",
          "#FF6B00",
          "#E2E8F0",
          "#FF8C39",
          "#002B7F",
        ],
        hoverOffset: 4,
      },
    ],
  });

  useEffect(() => {
    async function fetchReportData() {
      try {
        setLoading(true);
        // 1. Fetch Players
        const playersSnap = await getDocs(collection(db, "players"));
        
        // 2. Fetch Matches
        const matchesQuery = query(collection(db, "matches"), where("status", "==", "completed"));
        const matchesSnap = await getDocs(matchesQuery);
        
        // 3. Fetch Mistakes
        const mistakesSnap = await getDocs(collection(db, "mistake_logs"));

        const playersList = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const completedMatches = matchesSnap.docs.map(doc => doc.data() as any);
        const mistakeLogsList = mistakesSnap.docs.map(doc => doc.data() as any);

        if (playersList.length > 0 || completedMatches.length > 0) {
          // Process Players
          const mappedPlayers = playersList.map(p => ({
            name: p.name || "Unnamed Athlete",
            matches: p.stats?.matches ?? 0,
            runs: p.stats?.runs ?? 0,
            wickets: p.stats?.wickets ?? 0,
            rating: p.stats?.rating ?? 60,
            mistakes: p.stats?.mistakesCount ?? 0,
            catches: p.stats?.catches ?? 0,
            runOuts: p.stats?.runOuts ?? 0,
          }));

          setPlayerStats(mappedPlayers);

          // Elite Standings Calculations
          let bestBatter = "None";
          let bestBowler = "None";
          let bestFielder = "None";
          let bestAllRounder = "None";
          let mostImproved = "None";
          let mostMistakesPlayer = "None";

          if (mappedPlayers.length > 0) {
            const sortedByRuns = [...mappedPlayers].sort((a, b) => b.runs - a.runs);
            if (sortedByRuns[0] && sortedByRuns[0].runs > 0) bestBatter = sortedByRuns[0].name;

            const sortedByWickets = [...mappedPlayers].sort((a, b) => b.wickets - a.wickets);
            if (sortedByWickets[0] && sortedByWickets[0].wickets > 0) bestBowler = sortedByWickets[0].name;

            const sortedByFielding = [...mappedPlayers].sort((a, b) => (b.catches + b.runOuts) - (a.catches + a.runOuts));
            if (sortedByFielding[0] && (sortedByFielding[0].catches + sortedByFielding[0].runOuts) > 0) {
              bestFielder = sortedByFielding[0].name;
            }

            const sortedByAllRound = [...mappedPlayers].sort((a, b) => (b.runs * 0.04 + b.wickets * 1.5) - (a.runs * 0.04 + a.wickets * 1.5));
            if (sortedByAllRound[0] && (sortedByAllRound[0].runs > 0 || sortedByAllRound[0].wickets > 0)) {
              bestAllRounder = sortedByAllRound[0].name;
            }

            const sortedByRating = [...mappedPlayers].sort((a, b) => b.rating - a.rating);
            if (sortedByRating[0]) mostImproved = sortedByRating[0].name;

            const sortedByMistakes = [...mappedPlayers].sort((a, b) => b.mistakes - a.mistakes);
            if (sortedByMistakes[0] && sortedByMistakes[0].mistakes > 0) {
              mostMistakesPlayer = `${sortedByMistakes[0].name} (${sortedByMistakes[0].mistakes} mistakes)`;
            }
          }

          // Team metrics
          const totalMatches = completedMatches.length;
          const wins = completedMatches.filter(m => m.result === "win").length;
          const winPercentage = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 75; // fallback to 75
          const averageRuns = totalMatches > 0 
            ? Number((completedMatches.reduce((acc, m) => acc + (m.runs || 0), 0) / totalMatches).toFixed(1)) 
            : 172.4;
          const averageWickets = totalMatches > 0 
            ? Number((completedMatches.reduce((acc, m) => acc + (m.wickets || 0), 0) / totalMatches).toFixed(1)) 
            : 7.2;

          setTeamMetrics({
            winPercentage,
            averageRuns,
            averageWickets,
            teamStrength: averageRuns > 160 ? "Strong middle-order batting & consistent high-scoring capabilities" : "Strong squad coordination and batting depth",
            weakness: averageWickets > 6 ? "Middle-overs batting collapses & soft dismissals" : "Powerplay boundary control & death-overs run leakage",
            bestBatter,
            bestBowler,
            bestFielder,
            bestAllRounder,
            mostImproved,
            mostMistakesPlayer: mostMistakesPlayer !== "None" ? mostMistakesPlayer : "None logged yet",
          });

          // Monthly trends dynamic calculation
          const monthAverages: { [month: string]: { totalRuns: number; count: number } } = {};
          completedMatches.forEach(m => {
            if (!m.date) return;
            try {
              const dateObj = new Date(m.date);
              if (isNaN(dateObj.getTime())) return;
              const monthLabel = dateObj.toLocaleString('default', { month: 'short' });
              if (!monthAverages[monthLabel]) {
                monthAverages[monthLabel] = { totalRuns: 0, count: 0 };
              }
              monthAverages[monthLabel].totalRuns += (m.runs || 0);
              monthAverages[monthLabel].count += 1;
            } catch (e) {}
          });

          const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const presentMonths = allMonths.filter(m => monthAverages[m] !== undefined);
          
          if (presentMonths.length > 0) {
            setMonthlyData({
              labels: presentMonths,
              datasets: [
                {
                  label: "Runs Scored (Avg)",
                  data: presentMonths.map(m => Number((monthAverages[m].totalRuns / monthAverages[m].count).toFixed(1))),
                  borderColor: "#0A3D91",
                  backgroundColor: "rgba(10, 61, 145, 0.1)",
                  tension: 0.3,
                  fill: true,
                },
              ],
            });
          }

          // Mistakes distribution doughnut chart
          const categoryCounts: { [category: string]: number } = {};
          mistakeLogsList.forEach(log => {
            const cat = log.category || "General Error";
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });

          const categories = Object.keys(categoryCounts);
          if (categories.length > 0) {
            setMistakeData({
              labels: categories,
              datasets: [
                {
                  data: categories.map(cat => categoryCounts[cat]),
                  backgroundColor: [
                    "#0A3D91",
                    "#FF6B00",
                    "#3B82F6",
                    "#EF4444",
                    "#10B981",
                    "#F59E0B",
                    "#8B5CF6",
                    "#EC4899",
                  ].slice(0, categories.length),
                  hoverOffset: 4,
                },
              ],
            });
          }
        }
      } catch (err) {
        console.error("Error fetching database reports:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReportData();
  }, []);

  // Export to CSV Function
  const exportToCSV = () => {
    try {
      const headers = ["Player Name,Matches,Runs,Wickets,Coach Rating,Logged Mistakes\n"];
      const rows = playerStats.map(
        p => `${p.name},${p.matches},${p.runs},${p.wickets},${p.rating},${p.mistakes}\n`
      );
      
      const csvBlob = new Blob([headers.concat(rows).join("")], { type: "text/csv;charset=utf-8;" });
      const csvUrl = URL.createObjectURL(csvBlob);
      const link = document.createElement("a");
      link.href = csvUrl;
      link.setAttribute("download", "Sachin_Stars_Roster_Report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Roster statistics exported as CSV.");
    } catch (err) {
      toast.error("CSV export failed.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <LayoutWrapper requireAdmin>
      <div className="space-y-8 animate-fade-in print:p-0">
        
        {/* Header (Hidden on Print) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 print:hidden">
          <div>
            <h1 className="text-3xl font-extrabold text-[#002B7F] dark:text-white flex items-center">
              <FileText className="mr-3 text-[#FF6B00]" size={32} />
              Performance & Reports Center
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Extract roster statistics, evaluate tactical mistake counts, and export tables for season reviews
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={exportToCSV}
              className="flex items-center px-4 py-2 bg-[#0A3D91] hover:bg-[#002B7F] text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              <Download size={14} className="mr-1.5" />
              Export CSV Table
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center px-4 py-2 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition-all"
            >
              <Printer size={14} className="mr-1.5" />
              Print / PDF
            </button>
          </div>
        </div>

        {/* Print Only Header branding */}
        <div className="hidden print:block border-b-2 border-[#0A3D91] pb-4 mb-6">
          <h1 className="text-3xl font-black uppercase text-[#0A3D91]">Sachin Stars Cricket Club</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">Official Season Performance & Analytics Dossier</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Date generated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-t-[#0A3D91] border-slate-200 rounded-full animate-spin" />
            <p className="text-xs text-slate-400 mt-3">Compiling database analytics...</p>
          </div>
        ) : (
          <>
            {/* Section A: Team Strengths & Weaknesses */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Strategic Metrics card */}
              <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md lg:col-span-2 space-y-4">
                <h3 className="text-base font-bold text-[#002B7F] dark:text-white flex items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <TrendingUp className="mr-2 text-[#0A3D91] dark:text-[#D9ECFF]" size={16} />
                  Strategic Analytics Summary
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-500/5">
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Team Strength</span>
                    <p className="text-sm font-semibold text-slate-850 dark:text-slate-200 mt-1">{teamMetrics.teamStrength}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-500/5">
                    <span className="text-[10px] font-black uppercase text-red-500">Systemic Weakness</span>
                    <p className="text-sm font-semibold text-slate-850 dark:text-slate-200 mt-1">{teamMetrics.weakness}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Win Percentage</p>
                    <p className="text-2xl font-black text-[#FF6B00] mt-0.5">{teamMetrics.winPercentage}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Avg Runs/Innings</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{teamMetrics.averageRuns}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Avg Wkts Taken</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{teamMetrics.averageWickets}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Most Mistakes</p>
                    <p className="text-xs font-bold text-red-500 mt-1 truncate" title={teamMetrics.mostMistakesPlayer}>
                      {teamMetrics.mostMistakesPlayer.split(" (")[0]}
                    </p>
                  </div>
                </div>
              </div>

              {/* Awards Panel */}
              <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md space-y-4">
                <h3 className="text-base font-bold text-[#002B7F] dark:text-white flex items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Award className="mr-2 text-[#FF6B00]" size={16} />
                  Elite Standings
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-450">Top Batsman</span>
                    <span className="font-bold text-slate-800 dark:text-white">{teamMetrics.bestBatter}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-450">Top Bowler</span>
                    <span className="font-bold text-slate-800 dark:text-white">{teamMetrics.bestBowler}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-450">Best Fielder</span>
                    <span className="font-bold text-slate-800 dark:text-white">{teamMetrics.bestFielder}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-450">All-Rounder standing</span>
                    <span className="font-bold text-slate-800 dark:text-white">{teamMetrics.bestAllRounder}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 dark:border-slate-800/50">
                    <span className="text-slate-450">Most Improved player</span>
                    <span className="font-bold text-emerald-500">{teamMetrics.mostImproved}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Section B: Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
              
              {/* Chart 1: Monthly Score trends */}
              <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md lg:col-span-2">
                <h3 className="text-sm font-bold text-[#002B7F] dark:text-white mb-4">Monthly Batting Trends (Avg Scores)</h3>
                <div className="h-60">
                  <Line 
                    data={monthlyData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { ticks: { color: "gray" }, grid: { display: false } },
                        y: { ticks: { color: "gray" } }
                      }
                    }} 
                  />
                </div>
              </div>

              {/* Chart 2: Mistakes Doughnut */}
              <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md">
                <h3 className="text-sm font-bold text-[#002B7F] dark:text-white mb-4">Mistake Log Categories</h3>
                <div className="h-60 flex items-center justify-center">
                  <div className="w-48 h-48">
                    <Doughnut 
                      data={mistakeData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                      }} 
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Section C: Player Detailed Report Grid */}
            <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md">
              <h3 className="text-base font-bold text-[#002B7F] dark:text-white mb-4 flex items-center">
                <BookOpen className="mr-2 text-slate-400" size={16} />
                Squad Roster Metrics
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-450">
                      <th className="pb-3">Athlete</th>
                      <th className="pb-3 text-center">Matches</th>
                      <th className="pb-3 text-center">Runs</th>
                      <th className="pb-3 text-center">Wickets</th>
                      <th className="pb-3 text-center">Logged Mistakes</th>
                      <th className="pb-3 text-right">Qualitative Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats.map((p, idx) => {
                      let ratingText = "Average";
                      let ratingColor = "text-yellow-600";
                      
                      if (p.rating >= 90) {
                        ratingText = "Excellent";
                        ratingColor = "text-emerald-500 font-extrabold";
                      } else if (p.rating >= 80) {
                        ratingText = "Very Good";
                        ratingColor = "text-teal-500 font-bold";
                      } else if (p.rating >= 70) {
                        ratingText = "Good";
                        ratingColor = "text-[#0A3D91] dark:text-[#D9ECFF] font-bold";
                      } else if (p.rating < 60) {
                        ratingText = "Needs Improvement";
                        ratingColor = "text-red-500 font-bold";
                      }
                      
                      return (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-500/5 transition-colors">
                          <td className="py-3 font-bold text-slate-800 dark:text-white">{p.name}</td>
                          <td className="py-3 text-center">{p.matches}</td>
                          <td className="py-3 text-center font-semibold text-[#0A3D91] dark:text-[#D9ECFF]">{p.runs}</td>
                          <td className="py-3 text-center font-semibold text-[#FF6B00]">{p.wickets}</td>
                          <td className="py-3 text-center text-red-500 font-semibold">{p.mistakes}</td>
                          <td className={`py-3 text-right ${ratingColor}`}>
                            {p.rating} ({ratingText})
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </LayoutWrapper>
  );
}
