"use client";

import React, { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  Trophy, 
  Activity, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  UserCheck,
  Check
} from "lucide-react";
import confetti from "canvas-confetti";

interface MatchDetails {
  id: string;
  opponent: string;
  venue: string;
  date: string;
  tournament: string;
  captain: string;
  viceCaptain: string;
  wicketKeeper?: string;
  opponentCaptain?: string;
  opponentViceCaptain?: string;
  opponentWicketKeeper?: string;
  playingXI: string[];
  opponentXI: string[];
  tossWinner: string;
  batFirst: boolean;
  status: "live" | "completed" | "upcoming";
  // Live Score variables
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  target?: number;
  striker: { name: string; runs: number; balls: number; fours: number; sixes: number };
  nonStriker: { name: string; runs: number; balls: number; fours: number; sixes: number };
  bowler: { name: string; overs: number; maidens: number; runs: number; wickets: number };
  partnershipRuns: number;
  partnershipBalls: number;
  timeline: string[];
}

export default function AdminScoringPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wicket Modal State
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [outBatsman, setOutBatsman] = useState("");
  const [incomingBatsman, setIncomingBatsman] = useState("");
  const [dismissalType, setDismissalType] = useState("Bowled");
  const [assistingFielder, setAssistingFielder] = useState("");

  // Mistake Logger Popup State
  const [isMistakeOpen, setIsMistakeOpen] = useState(false);
  const [mistakePlayer, setMistakePlayer] = useState("");
  const [mistakeCategory, setMistakeCategory] = useState("Poor Footwork");
  const [mistakeSeverity, setMistakeSeverity] = useState<"High" | "Medium" | "Low">("Medium");
  const [mistakeNotes, setMistakeNotes] = useState("");

  // Fetch match details
  useEffect(() => {
    async function fetchMatch() {
      try {
        const docRef = doc(db, "matches", matchId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMatch({ id: docSnap.id, ...docSnap.data() } as MatchDetails);
        } else {
          toast.error("Match record not found.");
          router.push("/live-score");
        }
      } catch (err) {
        toast.error("Failed to load match record.");
      } finally {
        setLoading(false);
      }
    }
    fetchMatch();
  }, [matchId]);

  if (loading) {
    return (
      <LayoutWrapper requireAdmin>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-t-[#0A3D91] border-slate-200 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 mt-2">Loading match scoring workspace...</p>
        </div>
      </LayoutWrapper>
    );
  }

  if (!match) return null;

  // Swap striker and non-striker helper
  const swapBatsmen = (currentMatch: MatchDetails) => {
    return {
      ...currentMatch,
      striker: currentMatch.nonStriker,
      nonStriker: currentMatch.striker,
    };
  };

  // Helper to handle over incrementation and ball counting
  const recordBallDetails = (currentMatch: MatchDetails, isExtraValidBall: boolean) => {
    let balls = currentMatch.balls;
    let overs = currentMatch.overs;

    if (isExtraValidBall) {
      balls += 1;
      if (balls === 6) {
        overs += 1;
        balls = 0;
        // Swap batsmen at the end of the over
        const swapped = swapBatsmen(currentMatch);
        return {
          ...swapped,
          overs,
          balls,
        };
      }
    }

    return {
      ...currentMatch,
      overs,
      balls,
    };
  };

  // Update Match state and save to Firestore
  const updateFirestoreMatch = async (updatedMatch: MatchDetails) => {
    try {
      const { id, ...payload } = updatedMatch;
      await updateDoc(doc(db, "matches", matchId), payload);
      setMatch(updatedMatch);
    } catch (err) {
      toast.error("Failed to sync score changes with Firestore");
    }
  };

  // Core Scoring Trigger
  const handleScoreBall = async (runs: number, extraType: "none" | "wd" | "nb" | "b" | "lb", isWicket: boolean = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    let updated = { ...match };

    // Set timeline text
    let timelineSymbol = runs.toString();
    if (isWicket) timelineSymbol = "W";
    else if (extraType === "wd") timelineSymbol = `${runs}wd`;
    else if (extraType === "nb") timelineSymbol = `${runs}nb`;
    else if (extraType === "b") timelineSymbol = `${runs}b`;
    else if (extraType === "lb") timelineSymbol = `${runs}lb`;

    // Add to timeline (keep only last 6 balls)
    const timeline = [...(updated.timeline || [])];
    timeline.push(timelineSymbol);
    if (timeline.length > 6) timeline.shift();
    updated.timeline = timeline;

    if (isWicket) {
      // Wicket logic is handled in a modal after selecting batsmen.
      setIsSubmitting(false);
      openWicketSelection();
      return;
    }

    // Runs logic
    const totalRunsThisBall = runs + (extraType === "wd" || extraType === "nb" ? 1 : 0);
    updated.runs += totalRunsThisBall;

    // Partnership runs
    updated.partnershipRuns += totalRunsThisBall;
    
    // Batsman stats updates (Wides do not count as balls faced or runs for batsman)
    if (extraType !== "wd") {
      updated.striker.balls += 1;
      updated.partnershipBalls += 1;
      
      if (extraType === "none") {
        updated.striker.runs += runs;
        if (runs === 4) updated.striker.fours += 1;
        if (runs === 6) updated.striker.sixes += 1;
      }
    }

    // Bowler stats updates
    updated.bowler.runs += totalRunsThisBall;

    // Over counting logic (Wides and No Balls are invalid balls, overs don't progress)
    const isExtraValidBall = (extraType !== "wd" && extraType !== "nb");
    
    // Bowler overs update
    if (isExtraValidBall) {
      let bOvers = updated.bowler.overs * 10; // represent in integers (3.4 overs -> 34 balls)
      let fullOvers = Math.floor(updated.bowler.overs);
      let currentOverBalls = Math.round((updated.bowler.overs - fullOvers) * 10);
      
      currentOverBalls += 1;
      if (currentOverBalls === 6) {
        fullOvers += 1;
        currentOverBalls = 0;
      }
      updated.bowler.overs = Number(`${fullOvers}.${currentOverBalls}`);
    }

    // Progress match overs
    updated = recordBallDetails(updated, isExtraValidBall);

    // Runs scored on valid balls require batsman swapping if odd (1, 3, 5)
    if (isExtraValidBall && (runs === 1 || runs === 3 || runs === 5)) {
      updated = swapBatsmen(updated);
    }

    await updateFirestoreMatch(updated);
    setIsSubmitting(false);

    // Open Mistake Logger Modal immediately
    openMistakeLogger();
  };

  // Wicket Trigger Functions
  const openWicketSelection = () => {
    setOutBatsman(match.striker.name);
    setIncomingBatsman("");
    setDismissalType("Bowled");
    setAssistingFielder("");
    setIsWicketModalOpen(true);
  };

  const handleWicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomingBatsman) {
      toast.error("Please select the incoming batsman");
      return;
    }

    let updated = { ...match };

    // Record wicket
    updated.wickets += 1;
    updated.striker.balls += 1; // Wicket delivery counts as a ball faced
    updated.partnershipBalls += 1;
    updated.bowler.wickets += 1;
    
    // Bowler overs update
    let fullOvers = Math.floor(updated.bowler.overs);
    let currentOverBalls = Math.round((updated.bowler.overs - fullOvers) * 10);
    currentOverBalls += 1;
    if (currentOverBalls === 6) {
      fullOvers += 1;
      currentOverBalls = 0;
    }
    updated.bowler.overs = Number(`${fullOvers}.${currentOverBalls}`);

    // Update match overs
    updated = recordBallDetails(updated, true);

    // Update Player DB directly for catches/runOuts if assistingFielder is set
    if (assistingFielder) {
      try {
        const q = query(collection(db, "players"), where("name", "==", assistingFielder));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const playerDoc = snap.docs[0];
          const data = playerDoc.data();
          const currentStats = data.stats || {};
          
          if (dismissalType === "Caught" || dismissalType === "Stumped" || dismissalType === "Caught & Bowled") {
            const currentCatches = currentStats.catches || 0;
            await updateDoc(doc(db, "players", playerDoc.id), {
              "stats.catches": currentCatches + 1,
            });
            toast.success(`Incremented catches stat for ${assistingFielder}`);
          } else if (dismissalType === "Run Out") {
            const currentRunOuts = currentStats.runOuts || 0;
            await updateDoc(doc(db, "players", playerDoc.id), {
              "stats.runOuts": currentRunOuts + 1,
            });
            toast.success(`Incremented run outs stat for ${assistingFielder}`);
          }
        }
      } catch (err) {
        console.error("Failed to update player stats for dismissal:", err);
      }
    }

    // Save dismissal detail to match document
    const newDismissal = {
      batsman: outBatsman,
      type: dismissalType,
      fielder: assistingFielder || null,
      bowler: updated.bowler.name,
      over: updated.overs,
      ball: updated.balls,
    };
    const currentDismissals = (updated as any).dismissals || [];
    (updated as any).dismissals = [...currentDismissals, newDismissal];

    // Replace out batsman with incoming batsman
    if (outBatsman === updated.striker.name) {
      updated.striker = { name: incomingBatsman, runs: 0, balls: 0, fours: 0, sixes: 0 };
    } else {
      updated.nonStriker = { name: incomingBatsman, runs: 0, balls: 0, fours: 0, sixes: 0 };
    }

    // Reset partnership
    updated.partnershipRuns = 0;
    updated.partnershipBalls = 0;

    await updateFirestoreMatch(updated);
    setIsWicketModalOpen(false);

    // Open Mistake Logger Modal immediately
    openMistakeLogger();
  };

  // Mistake Logger Logic
  const openMistakeLogger = () => {
    setMistakePlayer(match.striker.name);
    setMistakeNotes("");
    setIsMistakeOpen(true);
  };

  const handleSaveMistake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mistakePlayer) {
      toast.error("Please select a player");
      return;
    }

    try {
      // Pushes mistake log entry to Firebase
      await addDoc(collection(db, "mistake_logs"), {
        playerName: mistakePlayer,
        category: mistakeCategory,
        severity: mistakeSeverity,
        notes: mistakeNotes || "No notes provided.",
        over: match.overs,
        ball: match.balls,
        matchOpponent: match.opponent,
        matchId: matchId,
        timestamp: new Date().toISOString(),
      });

      // Update player profile mistakes count and overall rating
      const q = query(collection(db, "players"), where("name", "==", mistakePlayer));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const playerDoc = snap.docs[0];
        const data = playerDoc.data();
        const currentStats = data.stats || {};
        const mistakes = (currentStats.mistakesCount || 0) + 1;
        const currentRating = Math.max(0, (currentStats.rating || 60) - (mistakeSeverity === "High" ? 4 : mistakeSeverity === "Medium" ? 2 : 1));
        
        await updateDoc(doc(db, "players", playerDoc.id), {
          "stats.mistakesCount": mistakes,
          "stats.rating": currentRating,
        });
      }

      toast.success(`Mistake logged for ${mistakePlayer}.`);
      setIsMistakeOpen(false);
    } catch (err) {
      toast.error("Could not write mistake log");
    }
  };

  // Complete Game Flow
  const handleCompleteMatch = async () => {
    if (!window.confirm("Complete match? This will write final statistics to history.")) return;
    try {
      const result = match.runs >= (match.target || 0) ? "win" : "loss";
      
      await updateDoc(doc(db, "matches", matchId), {
        status: "completed",
        result: result,
        resultNotes: result === "win" ? `Stars won by ${10 - match.wickets} wickets` : `Stars lost by ${((match.target || 0) - match.runs)} runs`,
      });

      // Update statistics for all playing XI players in Firestore
      const updatePromises = match.playingXI.map(async (name) => {
        const q = query(collection(db, "players"), where("name", "==", name));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const playerDoc = snap.docs[0];
          const data = playerDoc.data();
          const stats = data.stats || {
            runs: 0,
            wickets: 0,
            average: 0,
            strikeRate: 0,
            matches: 0,
            fifties: 0,
            hundreds: 0,
            highestScore: 0,
            economy: 0,
            catches: 0,
            runOuts: 0,
            droppedCatches: 0,
            mistakesCount: 0,
            rating: 60,
          };

          // Increment matches played
          const newMatches = (stats.matches || 0) + 1;
          let newRuns = stats.runs || 0;
          let newFifties = stats.fifties || 0;
          let newHundreds = stats.hundreds || 0;
          let newHighest = stats.highestScore || 0;
          let newWickets = stats.wickets || 0;

          // Check if striker or non-striker in this match
          if (name === match.striker.name) {
            newRuns += match.striker.runs;
            newHighest = Math.max(newHighest, match.striker.runs);
            if (match.striker.runs >= 100) newHundreds += 1;
            else if (match.striker.runs >= 50) newFifties += 1;
          } else if (name === match.nonStriker.name) {
            newRuns += match.nonStriker.runs;
            newHighest = Math.max(newHighest, match.nonStriker.runs);
            if (match.nonStriker.runs >= 100) newHundreds += 1;
            else if (match.nonStriker.runs >= 50) newFifties += 1;
          }

          // Check if bowler in this match
          if (name === match.bowler.name) {
            newWickets += match.bowler.wickets;
          }

          // Recalculate average
          const newAverage = Number((newRuns / newMatches).toFixed(2));
          
          // Recalculate overall rating out of 100
          // Base rating (60) + runs score weight + wickets weight - mistakes weight
          const calculatedRating = Math.min(100, Math.max(0, 
            60 + Math.round(newRuns / 20) + (newWickets * 4) - ((stats.mistakesCount || 0) * 2)
          ));

          await updateDoc(doc(db, "players", playerDoc.id), {
            "stats.matches": newMatches,
            "stats.runs": newRuns,
            "stats.highestScore": newHighest,
            "stats.fifties": newFifties,
            "stats.hundreds": newHundreds,
            "stats.wickets": newWickets,
            "stats.average": newAverage,
            "stats.rating": calculatedRating,
          });
        }
      });

      await Promise.all(updatePromises);

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      toast.success("Match completed and statistics updated successfully!");
      router.push("/live-score");
    } catch (err) {
      console.error("Match completion error:", err);
      toast.error("Failed to finalize match statistics");
    }
  };

  // Swap Batsman positions manually
  const handleManualSwap = async () => {
    const swapped = swapBatsmen(match);
    await updateFirestoreMatch(swapped);
    toast.success("Batsman positions swapped.");
  };

  // Lists of available batsmen remaining in Playing XI to pick from on dismissals
  const remainingBatsmen = match.playingXI.filter(
    (name) => name !== match.striker.name && name !== match.nonStriker.name
  );

  const mistakeCategories = [
    // Batting
    "Wrong Shot",
    "Poor Footwork",
    "Dot Ball",
    "Bad Shot Selection",
    "Run Out Chance",
    "Communication Error",
    // Bowling
    "Bad Line",
    "Bad Length",
    "Wide",
    "No Ball",
    "Half Volley",
    "Short Ball",
    // Fielding
    "Dropped Catch",
    "Misfield",
    "Poor Throw",
    "Missed Run Out",
    "Wrong Position",
    // Fitness
    "Slow Running",
    "Low Energy",
    "Injury",
    // Mental
    "Pressure",
    "Lost Concentration",
    "Poor Decision",
  ];

  return (
    <LayoutWrapper requireAdmin>
      <div className="space-y-8 animate-fade-in">
        
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-[#002B7F] dark:text-white flex items-center">
              <Activity className="mr-3 text-[#FF6B00]" size={32} />
              Ball Scorer Console
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Active Game: Sachin Stars vs {match.opponent} ({match.tournament})
            </p>
          </div>
          <button
            onClick={handleCompleteMatch}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg"
          >
            Complete & Save Match
          </button>
        </div>

        {/* Live Scorecard widget */}
        <div className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Live score
            </h2>
            <div className="flex items-baseline space-x-3 mt-2">
              <span className="text-5xl font-black text-[#0A3D91] dark:text-white">
                {match.runs}/{match.wickets}
              </span>
              <span className="text-lg text-slate-400 font-bold">
                ({match.overs}.{match.balls} Overs)
              </span>
            </div>
            {match.target ? (
              <p className="text-xs text-[#FF6B00] font-bold mt-2">
                Chasing target: {match.target} (Need {match.target - match.runs} runs)
              </p>
            ) : null}
          </div>

          <div className="p-4 rounded-2xl bg-slate-500/5 text-center flex flex-col justify-center h-full">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Run Rate</p>
            <p className="text-2xl font-black mt-1 text-[#0A3D91] dark:text-[#D9ECFF]">
              {(match.runs / (match.overs + match.balls / 6 || 1)).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Batsmen & Bowlers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Batting Widget */}
          <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-[#002B7F] dark:text-white">Batting Roster</h3>
              <button 
                onClick={handleManualSwap}
                className="text-xs font-bold text-[#FF6B00] hover:text-[#E05E00] flex items-center"
              >
                <RotateCcw size={12} className="mr-1" />
                Swap Striker
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Striker */}
              <div className="p-3 bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 rounded-xl flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white">{match.striker.name} *</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Striker</p>
                </div>
                <div className="flex space-x-6 text-slate-500 font-bold">
                  <span><b className="text-slate-800 dark:text-white">{match.striker.runs}</b> runs</span>
                  <span>{match.striker.balls} balls</span>
                  <span>4s/6s: {match.striker.fours}/{match.striker.sixes}</span>
                </div>
              </div>

              {/* Non-Striker */}
              <div className="p-3 bg-white/20 dark:bg-slate-900/20 border border-white/5 rounded-xl flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white">{match.nonStriker.name}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Non-Striker</p>
                </div>
                <div className="flex space-x-6 text-slate-500 font-bold">
                  <span><b className="text-slate-800 dark:text-white">{match.nonStriker.runs}</b> runs</span>
                  <span>{match.nonStriker.balls} balls</span>
                  <span>4s/6s: {match.nonStriker.fours}/{match.nonStriker.sixes}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Active Partnership: {match.partnershipRuns} runs ({match.partnershipBalls} balls)
            </p>
          </div>

          {/* Bowler Widget */}
          <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md space-y-4">
            <h3 className="text-base font-bold text-[#002B7F] dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              Bowler Card
            </h3>
            <div className="p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 rounded-xl flex justify-between items-center text-sm">
              <div>
                <span className="font-bold text-slate-800 dark:text-white">{match.bowler.name}</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Active Bowler</p>
              </div>
              <div className="flex space-x-6 text-slate-500 font-bold">
                <span>Overs: <b className="text-slate-800 dark:text-white">{match.bowler.overs}</b></span>
                <span>Runs: <b className="text-slate-800 dark:text-white">{match.bowler.runs}</b></span>
                <span>Wkts: <b className="text-slate-800 dark:text-white">{match.bowler.wickets}</b></span>
              </div>
            </div>
            {/* Cricbuzz style timeline display */}
            <div className="flex items-center space-x-2 pt-2">
              <span className="text-xs text-slate-400 font-bold">Recent Timeline:</span>
              {match.timeline && match.timeline.map((val, idx) => (
                <span key={idx} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold flex items-center justify-center">
                  {val}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Ball scoring action console buttons */}
        <div className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl space-y-6">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-200/50 dark:border-slate-800">
            Select ball outcome
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <button onClick={() => handleScoreBall(0, "none")} className="p-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 rounded-xl text-sm font-black dark:text-white transition-colors">
              Dot Ball (0)
            </button>
            <button onClick={() => handleScoreBall(1, "none")} className="p-4 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 rounded-xl text-sm font-black dark:text-white transition-colors">
              1 Run
            </button>
            <button onClick={() => handleScoreBall(2, "none")} className="p-4 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 rounded-xl text-sm font-black dark:text-white transition-colors">
              2 Runs
            </button>
            <button onClick={() => handleScoreBall(3, "none")} className="p-4 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 rounded-xl text-sm font-black dark:text-white transition-colors">
              3 Runs
            </button>
            <button onClick={() => handleScoreBall(4, "none")} className="p-4 bg-[#0A3D91]/10 hover:bg-[#0A3D91]/25 text-[#0A3D91] dark:text-[#D9ECFF] rounded-xl text-sm font-black transition-colors">
              4 Runs (Four)
            </button>
            <button onClick={() => handleScoreBall(6, "none")} className="p-4 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/25 text-[#FF6B00] rounded-xl text-sm font-black transition-colors">
              6 Runs (Six)
            </button>
            <button onClick={() => handleScoreBall(0, "none", true)} className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-black transition-colors">
              Wicket (W)
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button onClick={() => handleScoreBall(0, "wd")} className="p-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 rounded-xl text-xs font-bold transition-colors">
              +1 Wide (WD)
            </button>
            <button onClick={() => handleScoreBall(0, "nb")} className="p-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 rounded-xl text-xs font-bold transition-colors">
              +1 No Ball (NB)
            </button>
            <button onClick={() => handleScoreBall(1, "b")} className="p-3 bg-slate-500/5 hover:bg-slate-500/15 rounded-xl text-xs font-bold transition-colors">
              Bye (B)
            </button>
            <button onClick={() => handleScoreBall(1, "lb")} className="p-3 bg-slate-500/5 hover:bg-slate-500/15 rounded-xl text-xs font-bold transition-colors">
              Leg Bye (LB)
            </button>
          </div>
        </div>

        {/* Squads Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md">
          <h3 className="text-xs font-black uppercase text-[#0A3D91] dark:text-[#D9ECFF] tracking-wider mb-4">
            Match Squads & Designations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stars Squad */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 flex justify-between">
                <span>Sachin Stars</span>
                <span className="text-[10px] text-slate-400">Roster</span>
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {match.playingXI.map(name => {
                  const isCaptain = match.captain === name;
                  const isVC = match.viceCaptain === name;
                  const isWK = match.wicketKeeper === name;
                  return (
                    <div key={name} className="flex items-center justify-between p-1.5 bg-slate-500/5 rounded-lg text-xs">
                      <span className="truncate max-w-[120px] font-medium text-slate-700 dark:text-slate-300">{name}</span>
                      <div className="flex space-x-0.5 shrink-0">
                        {isCaptain && <span className="px-1 text-[8px] bg-blue-500 text-white rounded font-black">C</span>}
                        {isVC && <span className="px-1 text-[8px] bg-indigo-500 text-white rounded font-black">VC</span>}
                        {isWK && <span className="px-1 text-[8px] bg-[#FF6B00] text-white rounded font-black">WK</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Opponent Squad */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 flex justify-between">
                <span>{match.opponent}</span>
                <span className="text-[10px] text-slate-400">Roster</span>
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {match.opponentXI.map(name => {
                  const isCaptain = match.opponentCaptain === name;
                  const isVC = match.opponentViceCaptain === name;
                  const isWK = match.opponentWicketKeeper === name;
                  return (
                    <div key={name} className="flex items-center justify-between p-1.5 bg-slate-500/5 rounded-lg text-xs">
                      <span className="truncate max-w-[120px] font-medium text-slate-700 dark:text-slate-300">{name}</span>
                      <div className="flex space-x-0.5 shrink-0">
                        {isCaptain && <span className="px-1 text-[8px] bg-blue-500 text-white rounded font-black">C</span>}
                        {isVC && <span className="px-1 text-[8px] bg-indigo-500 text-white rounded font-black">VC</span>}
                        {isWK && <span className="px-1 text-[8px] bg-[#FF6B00] text-white rounded font-black">WK</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Fall of Wickets Panel */}
        {(match as any).dismissals && (match as any).dismissals.length > 0 && (
          <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md animate-fade-in">
            <h3 className="text-xs font-black uppercase text-[#FF6B00] tracking-wider mb-4">
              Fall of Wickets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(match as any).dismissals.map((d: any, idx: number) => {
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
                      <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.25 rounded font-black uppercase">{d.type}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{details}</p>
                    <p className="text-[9px] text-slate-400 mt-2 text-right">Over {d.over}.{d.ball}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal: Wicket Dismissal configuration */}
        {isWicketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" />
            <div className="w-full max-w-sm glass-panel p-6 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 z-10">
              <h3 className="text-lg font-bold text-red-500 mb-2">Dismissal Setup</h3>
              <p className="text-xs text-slate-400 mb-6">Select out batsman and who walks in next</p>

              <form onSubmit={handleWicketSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Out Batsman</label>
                  <select
                    value={outBatsman}
                    onChange={(e) => setOutBatsman(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  >
                    <option value={match.striker.name}>{match.striker.name} (Striker)</option>
                    <option value={match.nonStriker.name}>{match.nonStriker.name} (Non-Striker)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dismissal Type</label>
                  <select
                    value={dismissalType}
                    onChange={(e) => {
                      setDismissalType(e.target.value);
                      if (e.target.value !== "Caught" && e.target.value !== "Stumped" && e.target.value !== "Run Out") {
                        setAssistingFielder("");
                      }
                    }}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  >
                    <option value="Bowled">Bowled</option>
                    <option value="Caught">Caught</option>
                    <option value="LBW">LBW</option>
                    <option value="Run Out">Run Out</option>
                    <option value="Stumped">Stumped</option>
                    <option value="Hit Wicket">Hit Wicket</option>
                    <option value="Caught & Bowled">Caught & Bowled</option>
                    <option value="Retired Hurt">Retired Hurt</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {(dismissalType === "Caught" || dismissalType === "Stumped" || dismissalType === "Run Out") && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assisted By (Fielder)</label>
                    <select
                      value={assistingFielder}
                      onChange={(e) => setAssistingFielder(e.target.value)}
                      className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                    >
                      <option value="">-- None / Opponent --</option>
                      {match.playingXI.map((name) => {
                        const isCaptain = match.captain === name;
                        const isVC = match.viceCaptain === name;
                        const isWK = match.wicketKeeper === name;
                        const roleLabel = isCaptain ? " (C)" : isVC ? " (VC)" : isWK ? " (WK)" : "";
                        return (
                          <option key={name} value={name}>
                            {name}{roleLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Incoming Batsman</label>
                  <select
                    value={incomingBatsman}
                    onChange={(e) => setIncomingBatsman(e.target.value)}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  >
                    <option value="">-- Choose Batsman --</option>
                    {remainingBatsmen.map((name) => {
                      const isCaptain = match.captain === name;
                      const isVC = match.viceCaptain === name;
                      const isWK = match.wicketKeeper === name;
                      const roleLabel = isCaptain ? " (C)" : isVC ? " (VC)" : isWK ? " (WK)" : "";
                      return (
                        <option key={name} value={name}>
                          {name}{roleLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex space-x-2 pt-2 justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Confirm Dismissal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Mistake Logger overlay popup (after every ball) */}
        {isMistakeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm animate-fade-in" />
            <div className="w-full max-w-md glass-panel p-6 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 z-10 animate-scale-up">
              
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-[#002B7F] dark:text-white flex items-center">
                  <AlertTriangle className="mr-2 text-[#FF6B00]" size={20} />
                  Tactical Performance Log
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">
                  Over {match.overs}.{match.balls}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Review this delivery. Log any mistakes made by Sachin Stars players, or skip if it was a clean play.
              </p>

              <form onSubmit={handleSaveMistake} className="space-y-4">
                {/* Player involved */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Athlete Involved</label>
                  <select
                    value={mistakePlayer}
                    onChange={(e) => setMistakePlayer(e.target.value)}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-semibold"
                  >
                    {match.playingXI.map(name => {
                      const isCaptain = match.captain === name;
                      const isVC = match.viceCaptain === name;
                      const isWK = match.wicketKeeper === name;
                      const roleLabel = isCaptain ? " (C)" : isVC ? " (VC)" : isWK ? " (WK)" : "";
                      return (
                        <option key={name} value={name}>
                          {name}{roleLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mistake Category</label>
                    <select
                      value={mistakeCategory}
                      onChange={(e) => setMistakeCategory(e.target.value)}
                      className="block w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                    >
                      {mistakeCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Severity</label>
                    <select
                      value={mistakeSeverity}
                      onChange={(e) => setMistakeSeverity(e.target.value as any)}
                      className="block w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-bold"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                {/* Coach notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Coach Notes</label>
                  <textarea
                    value={mistakeNotes}
                    onChange={(e) => setMistakeNotes(e.target.value)}
                    rows={2}
                    placeholder="Describe footwork error, bad line/length, misfield details..."
                    className="block w-full p-3 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>

                <div className="flex space-x-2 pt-2 justify-end border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsMistakeOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center"
                  >
                    <Check size={14} className="mr-1" />
                    Skip (Clean Ball)
                  </button>
                  
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-semibold rounded-lg flex items-center"
                  >
                    <AlertTriangle size={14} className="mr-1" />
                    Log Mistake
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </LayoutWrapper>
  );
}
