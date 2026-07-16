"use client";

import React, { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PlayCircle, ShieldAlert, Award, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const matchSetupSchema = z.object({
  opponent: z.string().min(2, "Opponent name must be at least 2 characters"),
  venue: z.string().min(2, "Venue is required"),
  date: z.string().min(1, "Select date"),
  time: z.string().min(1, "Select start time"),
  tournament: z.string().min(2, "Tournament name required"),
  captain: z.string().min(2, "Captain is required"),
  viceCaptain: z.string().min(2, "Vice captain is required"),
  tossWinner: z.string().min(1, "Select toss winner"),
  batFirst: z.string().min(1, "Select who bats first"),
  playingXIRaw: z.string().min(10, "List playing XI separated by commas"),
  opponentXIRaw: z.string().min(10, "List opponent XI separated by commas"),
  target: z.coerce.number().optional().default(0),
});

type MatchSetupValues = z.infer<typeof matchSetupSchema>;

export default function AdminLiveScoreSetup() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMatchExists, setActiveMatchExists] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState("");

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

  const {
    register,
    handleSubmit,
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
      tossWinner: "Sachin Stars",
      batFirst: "Stars",
      playingXIRaw: "Rohan Sharma, Amit Tendulkar, Karan Johar, Sanjay Patel, Vikram Kumar, Devendra Jha, Anil Kumble, Zaheer Khan, Harbhajan Singh, Javagal Srinath, MS Dhoni",
      opponentXIRaw: "J. Root, J. Bairstow, B. Stokes, J. Buttler, L. Livingstone, M. Ali, S. Curran, C. Woakes, A. Rashid, J. Archer, M. Wood",
      target: 0,
    },
  });

  const onSubmit = async (data: MatchSetupValues) => {
    setIsSubmitting(true);
    try {
      const playingXI = data.playingXIRaw.split(",").map(name => name.trim());
      const opponentXI = data.opponentXIRaw.split(",").map(name => name.trim());
      
      const matchDoc = {
        opponent: data.opponent,
        venue: data.venue,
        date: data.date,
        time: data.time,
        tournament: data.tournament,
        captain: data.captain,
        viceCaptain: data.viceCaptain,
        tossWinner: data.tossWinner,
        batFirst: data.batFirst === "Stars",
        playingXI,
        opponentXI,
        status: "live",
        // Scorecard stats
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        target: Number(data.target) || 0,
        striker: { name: playingXI[0] || "Batsman 1", runs: 0, balls: 0, fours: 0, sixes: 0 },
        nonStriker: { name: playingXI[1] || "Batsman 2", runs: 0, balls: 0, fours: 0, sixes: 0 },
        bowler: { name: opponentXI[9] || "Bowler 1", overs: 0, maidens: 0, runs: 0, wickets: 0 },
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
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-[#002B7F] dark:text-white flex items-center">
            <PlayCircle className="mr-3 text-[#FF6B00]" size={32} />
            Live Match Dispatch
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Setup teams, playing XIs, and toss results to launch a new ball-by-ball score tracking stream
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
            
            {/* Row 1: Opponent & Tournament */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Opponent Team Name
                </label>
                <input
                  type="text"
                  {...register("opponent")}
                  className="block w-full px-3 py-2.5 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
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

            {/* Row 2: Venue, Date, Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
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

            {/* Row 3: Capt, VC, Target */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Stars Captain
                </label>
                <input
                  type="text"
                  {...register("captain")}
                  className="block w-full px-3 py-2.5 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  placeholder="Rohan Sharma"
                />
                {errors.captain && <p className="text-[10px] text-red-500 mt-0.5">{errors.captain.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Stars Vice-Captain
                </label>
                <input
                  type="text"
                  {...register("viceCaptain")}
                  className="block w-full px-3 py-2.5 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  placeholder="Amit Tendulkar"
                />
                {errors.viceCaptain && <p className="text-[10px] text-red-500 mt-0.5">{errors.viceCaptain.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  First Innings Target (if chasing)
                </label>
                <input
                  type="number"
                  {...register("target")}
                  className="block w-full px-3 py-2.5 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  placeholder="0 for 1st Innings"
                />
              </div>
            </div>

            {/* Row 4: Toss & Batting Decision */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Toss Winner
                </label>
                <select
                  {...register("tossWinner")}
                  className="block w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                >
                  <option value="Sachin Stars">Sachin Stars</option>
                  <option value="Opponent">Opponent Team</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  First Innings Batting Team
                </label>
                <select
                  {...register("batFirst")}
                  className="block w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                >
                  <option value="Stars">Sachin Stars</option>
                  <option value="Opponent">Opponent Team</option>
                </select>
              </div>
            </div>

            {/* Playing XI Roster definitions */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Sachin Stars Playing XI (Comma separated)
              </label>
              <textarea
                {...register("playingXIRaw")}
                rows={3}
                className="block w-full p-3 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
              />
              {errors.playingXIRaw && <p className="text-[10px] text-red-500 mt-0.5">{errors.playingXIRaw.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Opponent Playing XI (Comma separated)
              </label>
              <textarea
                {...register("opponentXIRaw")}
                rows={3}
                className="block w-full p-3 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
              />
              {errors.opponentXIRaw && <p className="text-[10px] text-red-500 mt-0.5">{errors.opponentXIRaw.message}</p>}
            </div>

            {/* Submit */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 btn-orange text-sm font-semibold rounded-xl"
              >
                {isSubmitting ? "Configuring Field..." : "Initialize Scoreboard & Play"}
              </button>
            </div>

          </form>
        </div>

      </div>
    </LayoutWrapper>
  );
}
