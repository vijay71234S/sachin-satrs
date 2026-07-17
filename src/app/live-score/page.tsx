"use client";

import React, { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  orderBy,
  limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { 
  Trophy, 
  Activity, 
  Calendar, 
  MapPin, 
  User, 
  Play, 
  Clock, 
  ListOrdered,
  AlertTriangle,
  Users
} from "lucide-react";

interface LiveMatch {
  id: string;
  opponent: string;
  venue: string;
  date: string;
  time: string;
  tournament: string;
  captain: string;
  viceCaptain: string;
  wicketKeeper?: string;
  opponentCaptain?: string;
  opponentViceCaptain?: string;
  opponentWicketKeeper?: string;
  dismissals?: any[];
  tossWinner: string;
  batFirst: boolean; // true if Stars bat first, false if opponent bats first
  playingXI: string[];
  opponentXI: string[];
  substitutes?: string[];
  opponentSubs?: string[];
  status: "live" | "completed" | "upcoming";
  // Scores
  runs: number;
  wickets: number;
  overs: number;
  balls: number; // balls in current over
  target?: number;
  firstInningsRuns?: number;
  firstInningsWickets?: number;
  firstInningsOvers?: number;
  // Batsmen
  striker: { name: string; runs: number; balls: number; fours: number; sixes: number };
  nonStriker: { name: string; runs: number; balls: number; fours: number; sixes: number };
  // Bowler
  bowler: { name: string; overs: number; maidens: number; runs: number; wickets: number };
  // Partnership
  partnershipRuns: number;
  partnershipBalls: number;
  // Timeline of last 6 balls
  timeline: string[]; // e.g. ["1", "4", "W", "2", "6", "0"]
}

// Fallback Mock Live Match
const mockLiveMatch: LiveMatch = {
  id: "demo-live",
  opponent: "Warriors Cricket Club",
  venue: "Wankhede Stadium, Mumbai",
  date: new Date().toLocaleDateString(),
  time: "15:30",
  tournament: "Mumbai Club T20 Championship",
  captain: "Rohan Sharma",
  viceCaptain: "Amit Tendulkar",
  wicketKeeper: "MS Dhoni",
  opponentCaptain: "B. Stokes",
  opponentViceCaptain: "J. Buttler",
  opponentWicketKeeper: "J. Buttler",
  tossWinner: "Sachin Stars",
  batFirst: true,
  playingXI: ["Rohan Sharma", "Amit Tendulkar", "Karan Johar", "Sanjay Patel", "Vikram Kumar", "Devendra Jha", "Anil Kumble", "Zaheer Khan", "Harbhajan Singh", "Javagal Srinath", "MS Dhoni"],
  opponentXI: ["J. Root", "J. Bairstow", "B. Stokes", "J. Buttler", "L. Livingstone", "M. Ali", "S. Curran", "C. Woakes", "A. Rashid", "J. Archer", "M. Wood"],
  substitutes: ["Sachin Tendulkar", "Sourav Ganguly", "Rahul Dravid", "VVS Laxman"],
  opponentSubs: ["H. Brook", "D. Malan", "P. Salt", "D. Willey"],
  status: "live",
  dismissals: [
    { batsman: "Anil Kumble", type: "Caught", fielder: "J. Buttler", bowler: "J. Archer", over: 12, ball: 4 },
    { batsman: "Zaheer Khan", type: "Bowled", bowler: "M. Wood", over: 14, ball: 1 },
    { batsman: "Harbhajan Singh", type: "Run Out", fielder: "B. Stokes", over: 15, ball: 5 },
  ],
  runs: 148,
  wickets: 3,
  overs: 16,
  balls: 4,
  target: 198,
  striker: { name: "Rohan Sharma", runs: 74, balls: 46, fours: 8, sixes: 3 },
  nonStriker: { name: "Amit Tendulkar", runs: 42, balls: 28, fours: 4, sixes: 1 },
  bowler: { name: "J. Archer", overs: 3.4, maidens: 0, runs: 32, wickets: 2 },
  partnershipRuns: 82,
  partnershipBalls: 52,
  timeline: ["1", "4", "W", "2", "6", "0"],
};

export default function LiveScorePage() {
  const { profile } = useAuth();
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [pastMatches, setPastMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Subscribe to Live Match from Firestore
  useEffect(() => {
    const q = query(collection(db, "matches"), where("status", "==", "live"), limit(1));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setLiveMatch({
          id: snapshot.docs[0].id,
          ...docData,
        } as LiveMatch);
        setIsDemoMode(false);
      } else {
        setLiveMatch(null);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Firestore live subscription error, using demo toggle support:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch completed matches for list
  useEffect(() => {
    async function fetchPastMatches() {
      try {
        const q = query(
          collection(db, "matches"), 
          orderBy("date", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(match => match.status === "completed")
          .slice(0, 3);
        setPastMatches(list);
      } catch (err) {
        console.warn("Could not load past matches: ", err);
      }
    }
    fetchPastMatches();
  }, [liveMatch]);

  // Calculate metrics
  const activeMatch = liveMatch || (isDemoMode ? mockLiveMatch : null);
  
  const currentRunRate = activeMatch 
    ? Number((activeMatch.runs / (activeMatch.overs + activeMatch.balls / 6)).toFixed(2)) || 0
    : 0;

  const targetRuns = activeMatch?.target || 0;
  const runsNeeded = activeMatch && targetRuns ? targetRuns - activeMatch.runs : 0;
  const totalBalls = 120; // Assuming T20 for simplicity
  const ballsBowled = activeMatch ? (activeMatch.overs * 6 + activeMatch.balls) : 0;
  const ballsRemaining = totalBalls - ballsBowled;
  const requiredRate = activeMatch && targetRuns && ballsRemaining > 0
    ? Number(((runsNeeded / ballsRemaining) * 6).toFixed(2))
    : 0;

  const handleStartDemo = () => {
    setIsDemoMode(true);
  };

  return (
    <LayoutWrapper>
      <div className="space-y-8 animate-fade-in">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-[#002B7F] dark:text-white flex items-center">
              <Trophy className="mr-3 text-[#FF6B00]" size={32} />
              Live Arena
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {activeMatch ? "Stay updated with real-time ball-by-ball updates" : "No live matches running at this moment"}
            </p>
          </div>

          {/* Admin Setup Link */}
          {profile?.role === "admin" && (
            <div className="flex space-x-2">
              {activeMatch && activeMatch.id !== "demo-live" ? (
                <Link 
                  href={`/admin/live-score/${activeMatch.id}/scoring`}
                  className="flex items-center px-4 py-2.5 btn-primary text-sm font-semibold rounded-xl"
                >
                  <Play size={14} className="mr-2" />
                  Open Scorer Board
                </Link>
              ) : (
                <Link 
                  href="/admin/live-score"
                  className="flex items-center px-4 py-2.5 btn-primary text-sm font-semibold rounded-xl"
                >
                  <Play size={14} className="mr-2" />
                  Configure Match Setup
                </Link>
              )}
            </div>
          )}
        </div>
        

        {/* Live Score Block */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-t-[#0A3D91] border-slate-200 rounded-full animate-spin" />
            <p className="text-xs text-slate-400 mt-3">Connecting to scoreboard...</p>
          </div>
        ) : activeMatch ? (
          <div className="space-y-6">
            
            {/* Main Score Glass Card */}
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/20 shadow-xl relative overflow-hidden">
              {/* Decorative Stripe */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#0A3D91] via-[#FF6B00] to-[#002B7F]"></div>
              
              {/* Match Header */}
              <div className="flex flex-col md:flex-row md:justify-between border-b border-slate-200 dark:border-slate-800/60 pb-4 mb-6">
                <div>
                  <span className="text-xs bg-[#FF6B00] text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse inline-block">
                    LIVE
                  </span>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-3 uppercase">
                    {activeMatch.tournament}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-2 md:mt-0 flex items-center space-x-4">
                  <span className="flex items-center">
                    <MapPin size={12} className="mr-1" />
                    {activeMatch.venue}
                  </span>
                  <span className="flex items-center">
                    <Clock size={12} className="mr-1" />
                    {activeMatch.time}
                  </span>
                </div>
              </div>

              {/* Big Score Render */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                {/* Team Names and Live Run Count */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-2xl font-black text-[#002B7F] dark:text-white">
                      Sachin Stars
                    </h2>
                    <span className="text-xs text-slate-400">vs</span>
                    <h2 className="text-xl font-bold text-slate-500 dark:text-slate-400">
                      {activeMatch.opponent}
                    </h2>
                  </div>

                  <div className="flex items-baseline space-x-3">
                    <span className="text-5xl md:text-6xl font-black text-[#0A3D91] dark:text-white">
                      {activeMatch.runs}/{activeMatch.wickets}
                    </span>
                    <span className="text-lg md:text-xl text-slate-400 font-bold">
                      ({activeMatch.overs}.{activeMatch.balls} Overs)
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold italic">
                    Toss won by {activeMatch.tossWinner}, choosing to {activeMatch.batFirst ? "Bat" : "Bowl"} first.
                  </p>
                </div>

                {/* Rates Panel */}
                <div className="p-5 rounded-2xl bg-slate-500/5 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Current Run Rate (CRR)</span>
                    <span className="font-bold text-[#0A3D91] dark:text-[#D9ECFF]">{currentRunRate}</span>
                  </div>
                  {targetRuns > 0 && (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Target</span>
                        <span className="font-bold text-slate-800 dark:text-white">{targetRuns}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Required Run Rate (RRR)</span>
                        <span className="font-bold text-[#FF6B00]">{requiredRate}</span>
                      </div>
                      <p className="text-xs text-[#FF6B00] font-bold border-t border-slate-100 dark:border-slate-800 pt-2 text-center">
                        Need {runsNeeded} runs from {ballsRemaining} balls
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Batsmen & Bowlers Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/60">
                {/* Batting Card */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-[#0A3D91] dark:text-[#D9ECFF] tracking-wider flex items-center">
                    <User size={14} className="mr-1.5" />
                    Batsmen
                  </h4>
                  <div className="space-y-2">
                    {/* Striker */}
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/40 dark:bg-slate-900/40 text-xs border border-white/10">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white">{activeMatch.striker.name} *</span>
                      </div>
                      <div className="flex space-x-6 text-slate-500 dark:text-slate-400">
                        <span><b className="text-slate-800 dark:text-white">{activeMatch.striker.runs}</b>({activeMatch.striker.balls})</span>
                        <span>4s: {activeMatch.striker.fours} | 6s: {activeMatch.striker.sixes}</span>
                        <span>SR: {activeMatch.striker.balls > 0 ? ((activeMatch.striker.runs / activeMatch.striker.balls) * 100).toFixed(1) : "0.0"}</span>
                      </div>
                    </div>
                    {/* Non-Striker */}
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/20 dark:bg-slate-900/20 text-xs border border-white/5">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white">{activeMatch.nonStriker.name}</span>
                      </div>
                      <div className="flex space-x-6 text-slate-500 dark:text-slate-400">
                        <span><b className="text-slate-800 dark:text-white">{activeMatch.nonStriker.runs}</b>({activeMatch.nonStriker.balls})</span>
                        <span>4s: {activeMatch.nonStriker.fours} | 6s: {activeMatch.nonStriker.sixes}</span>
                        <span>SR: {activeMatch.nonStriker.balls > 0 ? ((activeMatch.nonStriker.runs / activeMatch.nonStriker.balls) * 100).toFixed(1) : "0.0"}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Active Partnership: {activeMatch.partnershipRuns} runs ({activeMatch.partnershipBalls} balls)
                  </p>
                </div>

                {/* Bowlers Card */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-[#FF6B00] tracking-wider flex items-center">
                    <Activity size={14} className="mr-1.5" />
                    Bowler
                  </h4>
                  <div className="p-2.5 rounded-xl bg-white/40 dark:bg-slate-900/40 text-xs border border-white/10 flex justify-between items-center">
                    <span className="font-bold text-slate-800 dark:text-white">{activeMatch.bowler.name}</span>
                    <div className="flex space-x-4 text-slate-500 dark:text-slate-400">
                      <span>Overs: <b className="text-slate-800 dark:text-white">{activeMatch.bowler.overs}</b></span>
                      <span>Mdns: {activeMatch.bowler.maidens}</span>
                      <span>Runs: {activeMatch.bowler.runs}</span>
                      <span>Wkts: <b className="text-slate-800 dark:text-white">{activeMatch.bowler.wickets}</b></span>
                      <span>Econ: {activeMatch.bowler.overs > 0 ? (activeMatch.bowler.runs / activeMatch.bowler.overs).toFixed(2) : "0.00"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cricbuzz Style Over Timeline */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/60 flex items-center space-x-4">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center">
                  <ListOrdered size={14} className="mr-1.5" />
                  Recent Balls:
                </span>
                <div className="flex items-center space-x-2">
                  {activeMatch.timeline && activeMatch.timeline.map((ball, idx) => {
                    let ballBg = "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
                    if (ball === "W") ballBg = "bg-red-500 text-white font-black animate-bounce";
                    else if (ball === "4") ballBg = "bg-[#0A3D91] text-white font-bold";
                    else if (ball === "6") ballBg = "bg-[#FF6B00] text-white font-black animate-pulse";
                    else if (ball.includes("wd") || ball.includes("nb")) ballBg = "bg-yellow-500/20 text-yellow-600 border border-yellow-500/20";
                    
                    return (
                      <span 
                        key={idx} 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${ballBg}`}
                      >
                        {ball}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Squads Panel */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/60">
                <h3 className="text-xs font-black uppercase text-[#0A3D91] dark:text-[#D9ECFF] tracking-wider mb-4 flex items-center">
                  <Users size={14} className="mr-1.5 text-[#FF6B00]" />
                  Playing XIs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sachin Stars Squad */}
                  <div className="p-4 rounded-xl bg-slate-500/5 border border-slate-200 dark:border-slate-800/50 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-extrabold text-[#0A3D91] dark:text-white text-xs">
                        Sachin Stars
                      </span>
                      <span className="text-[9px] bg-[#0A3D91] text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        Stars
                      </span>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {activeMatch.playingXI && activeMatch.playingXI.map((name) => {
                        const isCaptain = activeMatch.captain === name;
                        const isVC = activeMatch.viceCaptain === name;
                        const isWK = activeMatch.wicketKeeper === name;
                        return (
                          <li key={name} className="flex items-center justify-between p-2 rounded-lg bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40">
                            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                              {name}
                            </span>
                            <div className="flex items-center space-x-1 shrink-0">
                              {isCaptain && (
                                <span className="px-1.5 py-0.5 text-[8px] font-black bg-blue-500 text-white rounded cursor-default" title="Captain">
                                  C
                                </span>
                              )}
                              {isVC && (
                                <span className="px-1.5 py-0.5 text-[8px] font-black bg-indigo-500 text-white rounded cursor-default" title="Vice-Captain">
                                  VC
                                </span>
                              )}
                              {isWK && (
                                <span className="px-1.5 py-0.5 text-[8px] font-black bg-[#FF6B00] text-white rounded cursor-default" title="Wicketkeeper">
                                  WK
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {activeMatch.substitutes && activeMatch.substitutes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/40">
                        <p className="text-[9px] font-black uppercase text-slate-450 mb-1.5 tracking-wider">Substitutes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeMatch.substitutes.map(name => (
                            <span key={name} className="px-2 py-0.5 rounded bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Opponent Squad */}
                  <div className="p-4 rounded-xl bg-slate-500/5 border border-slate-200 dark:border-slate-800/50 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-extrabold text-slate-700 dark:text-white text-xs truncate max-w-[150px]">
                        {activeMatch.opponent}
                      </span>
                      <span className="text-[9px] bg-slate-400 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        OPP
                      </span>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {activeMatch.opponentXI && activeMatch.opponentXI.map((name) => {
                        const isCaptain = activeMatch.opponentCaptain === name;
                        const isVC = activeMatch.opponentViceCaptain === name;
                        const isWK = activeMatch.opponentWicketKeeper === name;
                        return (
                          <li key={name} className="flex items-center justify-between p-2 rounded-lg bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40">
                            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                              {name}
                            </span>
                            <div className="flex items-center space-x-1 shrink-0">
                              {isCaptain && (
                                <span className="px-1.5 py-0.5 text-[8px] font-black bg-blue-500 text-white rounded cursor-default" title="Captain">
                                  C
                                </span>
                              )}
                              {isVC && (
                                <span className="px-1.5 py-0.5 text-[8px] font-black bg-indigo-500 text-white rounded cursor-default" title="Vice-Captain">
                                  VC
                                </span>
                              )}
                              {isWK && (
                                <span className="px-1.5 py-0.5 text-[8px] font-black bg-[#FF6B00] text-white rounded cursor-default" title="Wicketkeeper">
                                  WK
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {activeMatch.opponentSubs && activeMatch.opponentSubs.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/40">
                        <p className="text-[9px] font-black uppercase text-slate-455 mb-1.5 tracking-wider">Substitutes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeMatch.opponentSubs.map(name => (
                            <span key={name} className="px-2 py-0.5 rounded bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fall of Wickets Panel */}
              {activeMatch.dismissals && activeMatch.dismissals.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/60">
                  <h3 className="text-xs font-black uppercase text-[#FF6B00] tracking-wider mb-4 flex items-center">
                    <ListOrdered size={14} className="mr-1.5 text-red-500" />
                    Fall of Wickets
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {activeMatch.dismissals.map((d: any, idx: number) => {
                      let details = "";
                      if (d.type === "Bowled") details = `b. ${d.bowler}`;
                      else if (d.type === "LBW") details = `lbw b. ${d.bowler}`;
                      else if (d.type === "Caught") details = `c. ${d.fielder || "fielder"} b. ${d.bowler}`;
                      else if (d.type === "Stumped") details = `st. ${d.fielder || "keeper"} b. ${d.bowler}`;
                      else if (d.type === "Caught & Bowled") details = `c&b. ${d.bowler}`;
                      else if (d.type === "Run Out") details = `run out (${d.fielder || "fielder"})`;
                      else details = `${d.type.toLowerCase()}`;
                      
                      return (
                        <div key={idx} className="p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/40 text-xs flex flex-col justify-between">
                          <div className="font-bold text-slate-800 dark:text-white flex justify-between items-center mb-1">
                            <span>{idx + 1}. {d.batsman}</span>
                            <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 py-0.25 rounded font-black uppercase">{d.type}</span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{details}</p>
                          <p className="text-[9px] text-slate-400 mt-2 text-right">Over {d.over}.{d.ball}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          /* No active match view */
          <div className="space-y-6">
            <div className="glass-panel p-8 rounded-2xl border border-white/20 shadow-md text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">No Live Action</h3>
              <p className="text-sm text-slate-400 mt-2">
                There is currently no official match broadcast live on the platform. Try entering demo simulation mode to inspect the interface layout.
              </p>
              <div className="mt-6 flex justify-center space-x-4">
                <button 
                  onClick={handleStartDemo}
                  className="px-5 py-2.5 btn-orange text-sm font-semibold rounded-xl"
                >
                  Simulate Live Arena
                </button>
              </div>
            </div>

            {/* Past completed matches list */}
            {pastMatches.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-4 mt-8">
                <h3 className="text-lg font-bold text-[#002B7F] dark:text-white flex items-center">
                  <Calendar size={18} className="mr-2 text-slate-400" />
                  Recent Game Results
                </h3>
                <div className="space-y-3">
                  {pastMatches.map((m) => (
                    <div key={m.id} className="glass-panel p-5 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center">
                      <div>
                        <p className="text-xs text-slate-400">{m.date} - {m.tournament}</p>
                        <p className="text-sm font-bold mt-1 text-slate-800 dark:text-white">
                          Sachin Stars vs {m.opponent}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center">
                          <MapPin size={12} className="mr-1 text-slate-400" />
                          {m.venue}
                        </p>
                      </div>
                      <div className="mt-4 md:mt-0 text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                          m.result === "win" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
                        }`}>
                          {m.result === "win" ? "Stars Won" : "Stars Lost"}
                        </span>
                        <p className="text-xs text-slate-500 mt-1 italic">
                          {m.resultNotes || `${m.ourRuns}/${m.ourWickets} vs ${m.opponentRuns}/${m.opponentWickets}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </LayoutWrapper>
  );
}
