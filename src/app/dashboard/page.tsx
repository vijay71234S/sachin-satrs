"use client";

import React, { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { collection, query, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Trophy,
  Users,
  Activity,
  Flame,
  Award,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import Link from "next/link";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Fallback Mock Data for immediate demo
const mockStats = {
  totalMatches: 24,
  wins: 18,
  losses: 6,
  winPercentage: 75,
  totalPlayers: 15,
  teamRuns: 4235,
  teamWickets: 168,
  currentTournament: "Mumbai Club T20 Championship",
  bestPlayer: "Rohan Sharma",
  mvp: "Amit Tendulkar",
  orangeCap: "Rohan Sharma (612 runs)",
  purpleCap: "Vikram Kumar (28 wickets)",
};

const mockRecentMatches = [
  { id: "m1", opponent: "Strikers CC", date: "2026-07-10", result: "Win", margin: "by 4 wickets", tournament: "Championship" },
  { id: "m2", opponent: "Royal Challengers", date: "2026-07-04", result: "Win", margin: "by 32 runs", tournament: "Championship" },
  { id: "m3", opponent: "Knights XI", date: "2026-06-28", result: "Loss", margin: "by 5 wickets", tournament: "Club T20" },
];

const mockUpcomingMatches = [
  { id: "um1", opponent: "Warriors CC", date: "2026-07-18", time: "16:00", venue: "Wankhede Stadium, Mumbai" },
  { id: "um2", opponent: "Super Kings", date: "2026-07-24", time: "14:30", venue: "DY Patil Ground, Navi Mumbai" },
];

const mockMistakes = [
  { id: "ms1", player: "Rohan Sharma", category: "Poor Footwork", severity: "High", over: "4.2", note: "Played across the line to an outswinger." },
  { id: "ms2", player: "Karan Johar", category: "No Ball", severity: "Medium", over: "12.4", note: "Overstepped by 3 inches. Bowled free hit next." },
  { id: "ms3", player: "Sanjay Patel", category: "Dropped Catch", severity: "High", over: "18.3", note: "Dropped simple sitter at long-on." },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(mockStats);
  const [recentMatches, setRecentMatches] = useState(mockRecentMatches);
  const [upcomingMatches, setUpcomingMatches] = useState(mockUpcomingMatches);
  const [recentMistakes, setRecentMistakes] = useState(mockMistakes);
  const [isRealData, setIsRealData] = useState(false);

  const [lineChartData, setLineChartData] = useState<any>({
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    datasets: [
      {
        label: "Team Run Rate (Average)",
        data: [6.8, 7.2, 7.5, 7.1, 7.9, 8.2, 8.5],
        borderColor: "#0A3D91",
        backgroundColor: "rgba(10, 61, 145, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Opponent Run Rate (Average)",
        data: [7.1, 7.0, 7.2, 7.4, 7.3, 7.1, 6.9],
        borderColor: "#FF6B00",
        backgroundColor: "rgba(255, 107, 0, 0.05)",
        fill: true,
        tension: 0.4,
      },
    ],
  });

  const [barChartData, setBarChartData] = useState<any>({
    labels: ["Match 1", "Match 2", "Match 3", "Match 4", "Match 5", "Match 6"],
    datasets: [
      {
        label: "Runs Scored",
        data: [168, 192, 145, 204, 182, 215],
        backgroundColor: "rgba(10, 61, 145, 0.85)",
        borderRadius: 8,
      },
    ],
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch matches
        const matchesRef = collection(db, "matches");
        const matchesSnap = await getDocs(query(matchesRef, orderBy("date", "desc"), limit(5)));
        
        // Fetch players
        const playersSnap = await getDocs(collection(db, "players"));
        
        // Fetch mistakes
        const mistakesRef = collection(db, "mistake_logs");
        const mistakesSnap = await getDocs(query(mistakesRef, orderBy("timestamp", "desc"), limit(5)));

        if (!matchesSnap.empty || !playersSnap.empty) {
          const allMatches = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          const completed = allMatches.filter((m: any) => m.status === "completed");
          const upcoming = allMatches.filter((m: any) => m.status === "upcoming" || m.status === "live");
          
          const winsCount = completed.filter((m: any) => m.result === "win").length;
          const lossesCount = completed.length - winsCount;
          
          const totalPlayersCount = playersSnap.size;
          
          // Calculate caps if players exist
          let bestPlayerName = mockStats.bestPlayer;
          let mvpName = mockStats.mvp;
          let orangeCapText = mockStats.orangeCap;
          let purpleCapText = mockStats.purpleCap;
          let calculatedRuns = 0;
          let calculatedWickets = 0;

          if (totalPlayersCount > 0) {
            const players = playersSnap.docs.map(d => d.data());
            
            // Sort by runs for Orange Cap
            const sortedByRuns = [...players].sort((a, b) => (b.stats?.runs || 0) - (a.stats?.runs || 0));
            if (sortedByRuns[0]) {
              orangeCapText = `${sortedByRuns[0].name} (${sortedByRuns[0].stats?.runs || 0} runs)`;
              bestPlayerName = sortedByRuns[0].name;
            }

            // Sort by wickets for Purple Cap
            const sortedByWickets = [...players].sort((a, b) => (b.stats?.wickets || 0) - (a.stats?.wickets || 0));
            if (sortedByWickets[0]) {
              purpleCapText = `${sortedByWickets[0].name} (${sortedByWickets[0].stats?.wickets || 0} wickets)`;
            }

            // Calculate totals
            players.forEach(p => {
              calculatedRuns += (p.stats?.runs || 0);
              calculatedWickets += (p.stats?.wickets || 0);
            });
            
            // Best overall rating
            const sortedByRating = [...players].sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0));
            if (sortedByRating[0]) {
              mvpName = sortedByRating[0].name;
            }
          }

          setStats({
            totalMatches: completed.length,
            wins: winsCount,
            losses: lossesCount,
            winPercentage: completed.length > 0 ? Math.round((winsCount / completed.length) * 100) : 0,
            totalPlayers: totalPlayersCount || mockStats.totalPlayers,
            teamRuns: calculatedRuns || mockStats.teamRuns,
            teamWickets: calculatedWickets || mockStats.teamWickets,
            currentTournament: allMatches[0]?.tournament || "Active League",
            bestPlayer: bestPlayerName,
            mvp: mvpName,
            orangeCap: orangeCapText,
            purpleCap: purpleCapText,
          });

          if (completed.length > 0) {
            setRecentMatches(completed.slice(0, 3).map((m: any) => ({
              id: m.id,
              opponent: m.opponent,
              date: m.date,
              result: m.result === "win" ? "Win" : "Loss",
              margin: m.resultNotes || "",
              tournament: m.tournament,
            })));

            // Construct runs scored bar chart dynamically
            const last6Completed = [...completed].reverse().slice(-6); // chronological order
            const runLabels = last6Completed.map((m: any) => `vs ${m.opponent.split(" ")[0]}`);
            const runsData = last6Completed.map((m: any) => m.runs || 0);

            setBarChartData({
              labels: runLabels,
              datasets: [
                {
                  label: "Runs Scored",
                  data: runsData,
                  backgroundColor: "rgba(10, 61, 145, 0.85)",
                  borderRadius: 8,
                },
              ],
            });

            // Construct run rate monthly line chart dynamically
            const monthRunRates: { [month: string]: { totalRuns: number; totalOvers: number } } = {};
            completed.forEach((m: any) => {
              if (!m.date) return;
              try {
                const dateObj = new Date(m.date);
                if (isNaN(dateObj.getTime())) return;
                const monthLabel = dateObj.toLocaleString('default', { month: 'short' });
                if (!monthRunRates[monthLabel]) {
                  monthRunRates[monthLabel] = { totalRuns: 0, totalOvers: 0 };
                }
                monthRunRates[monthLabel].totalRuns += (m.runs || 0);
                monthRunRates[monthLabel].totalOvers += (m.overs || 20); // default to 20 overs
              } catch (e) {}
            });

            const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const presentMonths = allMonths.filter(m => monthRunRates[m] !== undefined);
            if (presentMonths.length > 0) {
              const rrData = presentMonths.map(m => {
                const runs = monthRunRates[m].totalRuns;
                const overs = monthRunRates[m].totalOvers;
                return Number((runs / (overs || 1)).toFixed(2));
              });

              setLineChartData({
                labels: presentMonths,
                datasets: [
                  {
                    label: "Team Run Rate (Average)",
                    data: rrData,
                    borderColor: "#0A3D91",
                    backgroundColor: "rgba(10, 61, 145, 0.1)",
                    fill: true,
                    tension: 0.4,
                  },
                ],
              });
            }
          }

          if (upcoming.length > 0) {
            setUpcomingMatches(upcoming.slice(0, 3).map((m: any) => ({
              id: m.id,
              opponent: m.opponent,
              date: m.date,
              time: m.time || "TBD",
              venue: m.venue,
            })));
          }

          if (!mistakesSnap.empty) {
            setRecentMistakes(mistakesSnap.docs.slice(0, 3).map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                player: data.playerName || "Unknown Player",
                category: data.category || "General",
                severity: data.severity || "Medium",
                over: `${data.over || 0}.${data.ball || 0}`,
                note: data.notes || "",
              };
            }));
          }

          setIsRealData(true);
        }
      } catch (err) {
        console.warn("Failed to load live Firestore stats, using high-fidelity mock indicators:", err);
      }
    };

    fetchDashboardData();
  }, []);


  return (
    <LayoutWrapper requireAdmin>
      <div className="space-y-8 animate-fade-in">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-[#002B7F] dark:text-white">Admin Control Tower</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time analytics, caps standings, and scoring logs for Sachin Stars
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
              isRealData 
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                : "bg-[#FF6B00]/10 text-[#FF6B00] border-[#FF6B00]/20 animate-pulse"
            }`}>
              {isRealData ? "● Firestore Connected" : "▲ Demo Data Active"}
            </span>
          </div>
        </div>

        {/* Highlight Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/20 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Matches</span>
              <Trophy className="h-5 w-5 text-[#0A3D91]" />
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{stats.totalMatches}</p>
            <p className="text-[10px] text-slate-400 mt-1">Wins: {stats.wins} | Losses: {stats.losses}</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/20 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Win Ratio</span>
              <TrendingUp className="h-5 w-5 text-[#FF6B00]" />
            </div>
            <p className="text-3xl font-bold text-[#FF6B00] mt-2">{stats.winPercentage}%</p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#FF6B00] to-orange-400 h-1.5 rounded-full" 
                style={{ width: `${stats.winPercentage}%` }}
              />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/20 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Squad Strength</span>
              <Users className="h-5 w-5 text-[#0A3D91]" />
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{stats.totalPlayers}</p>
            <p className="text-[10px] text-slate-400 mt-1">Total registered athletes</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/20 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Runs</span>
              <Activity className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{stats.teamRuns}</p>
            <p className="text-[10px] text-slate-400 mt-1">Wickets claimed: {stats.teamWickets}</p>
          </div>
        </div>

        {/* Cricket Caps standings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white font-black">
              <Award size={20} />
            </div>
            <div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Orange Cap (Most Runs)</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{stats.orangeCap}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white font-black">
              <Award size={20} />
            </div>
            <div>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Purple Cap (Most Wkts)</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{stats.purpleCap}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orange-500 text-white font-black">
              <Flame size={20} />
            </div>
            <div>
              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">Best Striker</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{stats.bestPlayer}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white font-black">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Most Valuable Player (MVP)</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{stats.mvp}</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md">
            <h3 className="text-base font-bold text-[#002B7F] dark:text-white mb-4">Run Rate Comparison</h3>
            <div className="h-64">
              <Line 
                data={lineChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { labels: { color: "gray" } } },
                  scales: {
                    x: { ticks: { color: "gray" }, grid: { display: false } },
                    y: { ticks: { color: "gray" } }
                  }
                }} 
              />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md">
            <h3 className="text-base font-bold text-[#002B7F] dark:text-white mb-4">Recent Match Scores</h3>
            <div className="h-64">
              <Bar 
                data={barChartData} 
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
        </div>

        {/* Matches & Mistakes Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Match Logs */}
          <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-[#002B7F] dark:text-white">Recent Matches</h3>
                <Link href="/live-score" className="text-xs font-bold text-[#FF6B00] flex items-center">
                  Score Live <ChevronRight size={14} className="ml-0.5" />
                </Link>
              </div>
              <div className="space-y-3">
                {recentMatches.map((m) => (
                  <div key={m.id} className="p-3 bg-white/40 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">{m.date} - {m.tournament}</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">vs {m.opponent}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.result === "Win" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
                      }`}>
                        {m.result}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">{m.margin}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Matches */}
          <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-[#002B7F] dark:text-white">Upcoming Fixtures</h3>
                <Link href="/live-score" className="text-xs font-bold text-[#0A3D91] dark:text-blue-400 flex items-center">
                  Schedule Match <ChevronRight size={14} className="ml-0.5" />
                </Link>
              </div>
              <div className="space-y-3">
                {upcomingMatches.map((m) => (
                  <div key={m.id} className="p-3 bg-white/40 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/40">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">vs {m.opponent}</p>
                      <span className="text-[10px] font-bold bg-[#FF6B00]/10 text-[#FF6B00] px-2 py-0.5 rounded-lg">
                        {m.date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center">
                      <Activity size={12} className="mr-1.5 text-slate-400" />
                      {m.venue}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Start Time: {m.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Mistakes List */}
          <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-[#002B7F] dark:text-white">Recent Mistake Log</h3>
                <span className="text-[10px] bg-red-500/10 text-red-500 font-bold px-2 py-0.5 rounded-full flex items-center">
                  <AlertTriangle size={10} className="mr-1" />
                  Coach Watch
                </span>
              </div>
              <div className="space-y-3">
                {recentMistakes.map((m) => (
                  <div key={m.id} className="p-3 bg-white/40 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/40">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{m.player}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Category: {m.category} (Over {m.over})</p>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                        m.severity === "High" ? "bg-red-500/15 text-red-500" : "bg-yellow-500/15 text-yellow-600"
                      }`}>
                        {m.severity}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-2 border-t border-slate-100 dark:border-slate-800/50 pt-1">
                      "{m.note}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </LayoutWrapper>
  );
}
