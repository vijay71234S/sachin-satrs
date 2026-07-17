"use client";

import React, { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  PlayCircle, 
  ShieldAlert, 
  Search, 
  User, 
  Shield, 
  Check, 
  Users, 
  Award, 
  UserCheck 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";

interface DbPlayer {
  id: string;
  name: string;
  role: string;
  jerseyNumber: string;
  photo?: string;
  suspended?: boolean;
}

const matchSetupSchema = z.object({
  opponent: z.string().min(2, "Opponent name must be at least 2 characters"),
  venue: z.string().min(2, "Venue is required"),
  date: z.string().min(1, "Select date"),
  time: z.string().min(1, "Select start time"),
  tournament: z.string().min(2, "Tournament name required"),
  captain: z.string().min(2, "Captain is required"),
  viceCaptain: z.string().min(2, "Vice captain is required"),
  wicketKeeper: z.string().min(2, "Wicketkeeper is required"),
  tossWinner: z.string().min(1, "Select toss winner"),
  batFirst: z.string().min(1, "Select who bats first"),
  opponentXIRaw: z.string().min(10, "List opponent XI separated by commas"),
  opponentSubsRaw: z.string().optional().default(""),
  opponentCaptain: z.string().min(2, "Opponent Captain is required"),
  opponentViceCaptain: z.string().min(2, "Opponent Vice Captain is required"),
  opponentWicketKeeper: z.string().min(2, "Opponent Wicketkeeper is required"),
  target: z.coerce.number(),
});

type MatchSetupValues = z.input<typeof matchSetupSchema>;

export default function AdminLiveScoreSetup() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMatchExists, setActiveMatchExists] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState("");
  
  // Players from database
  const [dbPlayers, setDbPlayers] = useState<DbPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  
  // Selected Sachin Stars players (Exactly 11)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Check if there is already an active match live
  useEffect(() => {
    async function checkActiveMatch() {
      try {
        const q = query(collection(db, "matches"), where("status", "==", "live"));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setActiveMatchExists(true);
          setActiveMatchId(snap.docs[0].id);
        }
      } catch (err) {
        console.warn("Could not check active matches:", err);
      }
    }
    checkActiveMatch();
  }, []);

  // Fetch players from database
  useEffect(() => {
    async function fetchPlayers() {
      try {
        setLoadingPlayers(true);
        const querySnapshot = await getDocs(collection(db, "players"));
        const list = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as DbPlayer[];
        // Filter out suspended players
        const activeList = list.filter(p => !p.suspended);
        setDbPlayers(activeList);
      } catch (err) {
        toast.error("Failed to load player database");
      } finally {
        setLoadingPlayers(false);
      }
    }
    fetchPlayers();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MatchSetupValues>({
    resolver: zodResolver(matchSetupSchema),
    defaultValues: {
      opponent: "",
      venue: "",
      date: new Date().toISOString().split("T")[0],
      time: "10:00",
      tournament: "Mumbai Club T20 Championship",
      captain: "",
      viceCaptain: "",
      wicketKeeper: "",
      tossWinner: "Sachin Stars",
      batFirst: "Stars",
      opponentXIRaw: "J. Root, J. Bairstow, B. Stokes, J. Buttler, L. Livingstone, M. Ali, S. Curran, C. Woakes, A. Rashid, J. Archer, M. Wood",
      opponentSubsRaw: "H. Brook, D. Malan, P. Salt",
      opponentCaptain: "B. Stokes",
      opponentViceCaptain: "J. Buttler",
      opponentWicketKeeper: "J. Buttler",
      target: 0,
    },
  });

  // Watch Opponent playing XI to parse players on-the-spot
  const opponentXIRaw = watch("opponentXIRaw") || "";
  const parsedOpponentPlayers = opponentXIRaw
    .split(",")
    .map(name => name.trim())
    .filter(name => name.length > 0);

  const opponentSubsRaw = watch("opponentSubsRaw") || "";
  const parsedOpponentSubs = opponentSubsRaw
    .split(",")
    .map(name => name.trim())
    .filter(name => name.length > 0);

  // Watch selected Captain, VC, WK to validate they are not identical
  const selectedCaptain = watch("captain");
  const selectedViceCaptain = watch("viceCaptain");
  const selectedWicketKeeper = watch("wicketKeeper");

  const selectedOpponentCaptain = watch("opponentCaptain");
  const selectedOpponentViceCaptain = watch("opponentViceCaptain");
  const selectedOpponentWicketKeeper = watch("opponentWicketKeeper");

  const handleTogglePlayer = (name: string) => {
    if (selectedPlayers.includes(name)) {
      const updated = selectedPlayers.filter(p => p !== name);
      setSelectedPlayers(updated);
      // Reset roles if the deselected player held them
      if (selectedCaptain === name) setValue("captain", "");
      if (selectedViceCaptain === name) setValue("viceCaptain", "");
      if (selectedWicketKeeper === name) setValue("wicketKeeper", "");
    } else if (selectedSubs.includes(name)) {
      const updated = selectedSubs.filter(p => p !== name);
      setSelectedSubs(updated);
    } else {
      if (selectedPlayers.length < 11) {
        setSelectedPlayers([...selectedPlayers, name]);
      } else {
        if (selectedSubs.length >= 5) {
          toast.error("You can select a maximum of 5 substitutes.");
          return;
        }
        setSelectedSubs([...selectedSubs, name]);
      }
    }
  };

  const filteredPlayers = dbPlayers.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = async (data: MatchSetupValues) => {
    if (selectedPlayers.length !== 11) {
      toast.error(`Please select exactly 11 players. Current: ${selectedPlayers.length}`);
      return;
    }
    if (data.captain === data.viceCaptain) {
      toast.error("Captain and Vice-Captain cannot be the same player.");
      return;
    }
    if (data.opponentCaptain === data.opponentViceCaptain) {
      toast.error("Opponent Captain and Vice-Captain cannot be the same player.");
      return;
    }

    setIsSubmitting(true);
    try {
      const playingXI = selectedPlayers;
      const opponentXI = parsedOpponentPlayers;
      const substitutes = selectedSubs;
      const opponentSubs = parsedOpponentSubs;
      
      const matchDoc = {
        opponent: data.opponent,
        venue: data.venue,
        date: data.date,
        time: data.time,
        tournament: data.tournament,
        captain: data.captain,
        viceCaptain: data.viceCaptain,
        wicketKeeper: data.wicketKeeper,
        opponentCaptain: data.opponentCaptain,
        opponentViceCaptain: data.opponentViceCaptain,
        opponentWicketKeeper: data.opponentWicketKeeper,
        tossWinner: data.tossWinner,
        batFirst: data.batFirst === "Stars",
        playingXI,
        opponentXI,
        substitutes,
        opponentSubs,
        status: "live",
        // Scorecard stats
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        target: Number(data.target) || 0,
        striker: { name: playingXI[0] || "Batsman 1", runs: 0, balls: 0, fours: 0, sixes: 0 },
        nonStriker: { name: playingXI[1] || "Batsman 2", runs: 0, balls: 0, fours: 0, sixes: 0 },
        bowler: { name: opponentXI[0] || "Bowler 1", overs: 0, maidens: 0, runs: 0, wickets: 0 },
        partnershipRuns: 0,
        partnershipBalls: 0,
        timeline: [],
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "matches"), matchDoc);
      toast.success("Match created! Redirecting to scoreboard...");
      router.push(`/admin/live-score/${docRef.id}/scoring`);
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize live match");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LayoutWrapper requireAdmin>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-[#002B7F] dark:text-white flex items-center">
            <PlayCircle className="mr-3 text-[#FF6B00]" size={32} />
            Live Match Dispatch
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build squads, specify venues, toss status, and launch a new live scorecard broadcast
          </p>
        </div>

        {/* Warning if a match is already live */}
        {activeMatchExists && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center space-x-3 text-red-500 text-sm">
            <ShieldAlert size={20} />
            <div className="flex-1">
              <span className="font-bold">Caution:</span> There is already a live match active. Creating a new match will overwrite the active scoreboard view on the homepage.
            </div>
            <button
              onClick={() => router.push(`/admin/live-score/${activeMatchId}/scoring`)}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold text-xs rounded-lg shadow-sm"
            >
              Resume Existing Scorer
            </button>
          </div>
        )}

        {/* Setup Form */}
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/20 shadow-md">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Section 1: Basic Details */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-sm font-black uppercase text-[#0A3D91] dark:text-[#D9ECFF] tracking-wider mb-4">
                1. Match Context
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Opponent Team Name
                  </label>
                  <input
                    type="text"
                    {...register("opponent")}
                    className="block w-full px-3 py-2.5 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-semibold"
                    placeholder="e.g. Warriors CC"
                  />
                  {errors.opponent && <p className="text-[10px] text-red-500 mt-0.5">{errors.opponent.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Tournament / League
                  </label>
                  <input
                    type="text"
                    {...register("tournament")}
                    className="block w-full px-3 py-2.5 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                    placeholder="e.g. Mumbai T20 League"
                  />
                  {errors.tournament && <p className="text-[10px] text-red-500 mt-0.5">{errors.tournament.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Venue Stadium
                  </label>
                  <input
                    type="text"
                    {...register("venue")}
                    className="block w-full px-3 py-2.5 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                    placeholder="e.g. Wankhede Stadium"
                  />
                  {errors.venue && <p className="text-[10px] text-red-500 mt-0.5">{errors.venue.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    {...register("date")}
                    className="block w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    {...register("time")}
                    className="block w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Sachin Stars Roster (From database) */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-black uppercase text-[#0A3D91] dark:text-[#D9ECFF] tracking-wider">
                  2. Sachin Stars Squad (Select 11 Players)
                </h3>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  selectedPlayers.length === 11 ? "bg-emerald-500/15 text-emerald-600" : "bg-orange-500/15 text-orange-500"
                }`}>
                  Selected: {selectedPlayers.length} / 11
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Select exactly 11 active squad members. Only players added by the admin to the Player Database are available.
              </p>

              {loadingPlayers ? (
                <div className="flex flex-col items-center py-6 text-slate-400">
                  <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin mb-1" />
                  <span className="text-[10px]">Loading player database...</span>
                </div>
              ) : dbPlayers.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-400">
                  No active players found in the database. 
                  <div className="mt-2">
                    <Link href="/players/edit" className="text-blue-500 font-bold underline hover:text-blue-600">
                      Go Add Players First
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search squad database by name or position..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-9 pr-4 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                    />
                  </div>

                  {/* Grid of Players */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-xl">
                    {filteredPlayers.map((player) => {
                      const isPlaying = selectedPlayers.includes(player.name);
                      const isSub = selectedSubs.includes(player.name);
                      const isSelected = isPlaying || isSub;
                      return (
                        <div
                          key={player.id}
                          onClick={() => handleTogglePlayer(player.name)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                            isPlaying 
                              ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 shadow-sm" 
                              : isSub
                                ? "border-orange-500 bg-orange-500/5 dark:bg-orange-500/10 shadow-sm"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-2">
                              {player.photo ? (
                                <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                <User size={16} className="text-slate-400" />
                              )}
                            </div>
                            {isPlaying && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-500 text-white absolute top-2 right-2 uppercase">
                                XI
                              </span>
                            )}
                            {isSub && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-orange-500 text-white absolute top-2 right-2 uppercase">
                                SUB
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-left">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate pr-5">
                              {player.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              #{player.jerseyNumber} - {player.role}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Horizontal list of selected players and substitutes */}
                  {(selectedPlayers.length > 0 || selectedSubs.length > 0) && (
                    <div className="p-4 bg-slate-500/5 dark:bg-slate-950/20 rounded-xl space-y-3">
                      {selectedPlayers.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Playing XI Roster ({selectedPlayers.length} / 11):</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPlayers.map((name, i) => (
                              <span 
                                key={name}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0A3D91]/10 text-[#0A3D91] dark:text-[#D9ECFF]"
                              >
                                <span className="text-[9px] mr-1 opacity-60 font-black">{i + 1}</span>
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedSubs.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Substitutes ({selectedSubs.length} / 5):</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSubs.map((name, i) => (
                              <span 
                                key={name}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600 dark:text-orange-355"
                              >
                                <span className="text-[9px] mr-1 opacity-60 font-black">{i + 1}</span>
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sachin Stars Team Roles Setup */}
              {selectedPlayers.length === 11 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <div>
                    <label className="block text-xs font-bold text-[#0A3D91] dark:text-[#D9ECFF] uppercase mb-1">
                      Stars Captain
                    </label>
                    <select
                      {...register("captain")}
                      className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-bold text-slate-800"
                    >
                      <option value="">-- Choose Captain --</option>
                      {selectedPlayers.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    {errors.captain && <p className="text-[10px] text-red-500 mt-0.5">{errors.captain.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A3D91] dark:text-[#D9ECFF] uppercase mb-1">
                      Stars Vice-Captain
                    </label>
                    <select
                      {...register("viceCaptain")}
                      className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-bold text-slate-800"
                    >
                      <option value="">-- Choose Vice-Captain --</option>
                      {selectedPlayers.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    {errors.viceCaptain && <p className="text-[10px] text-red-500 mt-0.5">{errors.viceCaptain.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A3D91] dark:text-[#D9ECFF] uppercase mb-1">
                      Stars Wicketkeeper
                    </label>
                    <select
                      {...register("wicketKeeper")}
                      className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-bold text-slate-800"
                    >
                      <option value="">-- Choose Wicketkeeper --</option>
                      {selectedPlayers.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    {errors.wicketKeeper && <p className="text-[10px] text-red-500 mt-0.5">{errors.wicketKeeper.message}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Opponent Team (On the spot) */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
              <h3 className="text-sm font-black uppercase text-[#FF6B00] tracking-wider mb-2">
                3. Opponent Team Configuration (On the Spot)
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Define the opponent playing roster right here. Enter player names separated by commas.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Opponent Playing XI (Comma separated)
                </label>
                <textarea
                  {...register("opponentXIRaw")}
                  rows={2}
                  className="block w-full p-3 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-semibold"
                />
                {errors.opponentXIRaw && <p className="text-[10px] text-red-500 mt-0.5">{errors.opponentXIRaw.message}</p>}
              </div>

              {/* Parsed Roster Checklist */}
              {parsedOpponentPlayers.length > 0 && (
                <div className="mt-3 p-3 bg-orange-500/5 dark:bg-orange-950/20 rounded-xl">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Parsed Opponent Squad ({parsedOpponentPlayers.length} players):</p>
                  <div className="flex flex-wrap gap-1">
                    {parsedOpponentPlayers.map((name, i) => (
                      <span key={name} className="px-2 py-0.5 bg-[#FF6B00]/10 text-[#FF6B00] text-xs rounded-full font-bold">
                        <span className="text-[9px] opacity-60 mr-1">{i + 1}</span>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Opponent Substitutes (Comma separated)
                </label>
                <textarea
                  {...register("opponentSubsRaw")}
                  rows={2}
                  className="block w-full p-3 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-semibold"
                  placeholder="e.g. H. Brook, D. Malan, P. Salt"
                />
              </div>

              {/* Parsed Opponent Substitutes Checklist */}
              {parsedOpponentSubs.length > 0 && (
                <div className="mt-3 p-3 bg-slate-500/5 dark:bg-slate-955/20 rounded-xl">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Parsed Opponent Substitutes ({parsedOpponentSubs.length} players):</p>
                  <div className="flex flex-wrap gap-1">
                    {parsedOpponentSubs.map((name, i) => (
                      <span key={name} className="px-2 py-0.5 bg-slate-450/10 text-slate-500 text-xs rounded-full font-bold">
                        <span className="text-[9px] opacity-60 mr-1">{i + 1}</span>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Opponent Team Roles Setup */}
              {parsedOpponentPlayers.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <div>
                    <label className="block text-xs font-bold text-[#FF6B00] uppercase mb-1">
                      Opponent Captain
                    </label>
                    <select
                      {...register("opponentCaptain")}
                      className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-bold text-slate-800"
                    >
                      <option value="">-- Choose Captain --</option>
                      {parsedOpponentPlayers.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    {errors.opponentCaptain && <p className="text-[10px] text-red-500 mt-0.5">{errors.opponentCaptain.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#FF6B00] uppercase mb-1">
                      Opponent Vice-Captain
                    </label>
                    <select
                      {...register("opponentViceCaptain")}
                      className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-bold text-slate-800"
                    >
                      <option value="">-- Choose Vice-Captain --</option>
                      {parsedOpponentPlayers.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    {errors.opponentViceCaptain && <p className="text-[10px] text-red-500 mt-0.5">{errors.opponentViceCaptain.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#FF6B00] uppercase mb-1">
                      Opponent Wicketkeeper
                    </label>
                    <select
                      {...register("opponentWicketKeeper")}
                      className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-bold text-slate-800"
                    >
                      <option value="">-- Choose Wicketkeeper --</option>
                      {parsedOpponentPlayers.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    {errors.opponentWicketKeeper && <p className="text-[10px] text-red-500 mt-0.5">{errors.opponentWicketKeeper.message}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Toss & Miscellaneous */}
            <div>
              <h3 className="text-sm font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-4">
                4. Match Rules & Live Parameters
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Toss Winner
                  </label>
                  <select
                    {...register("tossWinner")}
                    className="block w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-bold"
                  >
                    <option value="Sachin Stars">Sachin Stars</option>
                    <option value={watch("opponent") || "Opponent Team"}>{watch("opponent") || "Opponent Team"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    First Innings Batting Team
                  </label>
                  <select
                    {...register("batFirst")}
                    className="block w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white font-bold"
                  >
                    <option value="Stars">Sachin Stars</option>
                    <option value="Opponent">Opponent Team</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Target Score (Chasing Only)
                  </label>
                  <input
                    type="number"
                    {...register("target")}
                    className="block w-full px-3 py-2.5 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                    placeholder="0 for 1st Innings"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 btn-orange text-sm font-semibold rounded-xl flex items-center shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-55"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-white rounded-full animate-spin mr-2" />
                    Initializing Field...
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2" size={18} />
                    Initialize Scoreboard & Play
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

      </div>
    </LayoutWrapper>
  );
}
