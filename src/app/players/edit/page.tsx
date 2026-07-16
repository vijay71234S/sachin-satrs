"use client";

import React, { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  UserPlus, 
  BarChart, 
  UserMinus,
  Briefcase,
  UserCheck,
  Upload,
  Camera,
  Image as ImageIcon
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Zod schemas for player profile and stats
const playerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.string().min(1, "Role is required"),
  jerseyNumber: z.string().min(1, "Jersey number is required"),
  age: z.string().min(1, "Age is required"),
  battingStyle: z.string().default("Right-hand bat"),
  bowlingStyle: z.string().default("Right-arm bowler"),
  debut: z.string().min(4, "Enter debut year"),
  phone: z.string().optional(),
  email: z.string().email("Enter valid email"),
  photo: z.string().optional(),
  // Stats
  runs: z.coerce.number().default(0),
  wickets: z.coerce.number().default(0),
  average: z.coerce.number().default(0),
  strikeRate: z.coerce.number().default(0),
  matches: z.coerce.number().default(0),
  fifties: z.coerce.number().default(0),
  hundreds: z.coerce.number().default(0),
  highestScore: z.coerce.number().default(0),
  economy: z.coerce.number().default(0),
  catches: z.coerce.number().default(0),
  runOuts: z.coerce.number().default(0),
  droppedCatches: z.coerce.number().default(0),
  mistakesCount: z.coerce.number().default(0),
  rating: z.coerce.number().min(0).max(100).default(60),
});

type PlayerFormValues = z.infer<typeof playerSchema>;

interface PlayerProfile {
  id: string;
  name: string;
  role: string;
  jerseyNumber: string;
  age: string;
  battingStyle: string;
  bowlingStyle: string;
  debut: string;
  phone?: string;
  email: string;
  photo?: string;
  suspended?: boolean;
  stats?: {
    runs: number;
    wickets: number;
    average: number;
    strikeRate: number;
    matches: number;
    fifties: number;
    hundreds: number;
    highestScore: number;
    economy: number;
    catches: number;
    runOuts: number;
    droppedCatches: number;
    mistakesCount: number;
    rating: number;
  };
}

export default function PlayersEditPage() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "players"));
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PlayerProfile[];
      setPlayers(list);
    } catch (err) {
      toast.error("Failed to load player database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlayerFormValues>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      battingStyle: "Right-hand bat",
      bowlingStyle: "Right-arm fast",
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
    },
  });

  const currentPhoto = watch("photo");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (image only)
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    // Limit size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    const toastId = toast.loading("Uploading profile image...");

    try {
      const uniqueFileName = `players/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, uniqueFileName);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      setValue("photo", downloadUrl);
      toast.success("Profile image uploaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error("Image upload failed:", err);
      toast.error("Failed to upload image: " + err.message, { id: toastId });
    } finally {
      setUploadingImage(false);
    }
  };

  // Pre-fill values when editing
  const openEditModal = (player: PlayerProfile) => {
    setEditingPlayer(player);
    setValue("name", player.name);
    setValue("role", player.role);
    setValue("jerseyNumber", player.jerseyNumber);
    setValue("age", player.age);
    setValue("battingStyle", player.battingStyle);
    setValue("bowlingStyle", player.bowlingStyle);
    setValue("debut", player.debut);
    setValue("phone", player.phone || "");
    setValue("email", player.email);
    setValue("photo", player.photo || "");
    
    // Stats
    setValue("runs", player.stats?.runs || 0);
    setValue("wickets", player.stats?.wickets || 0);
    setValue("average", player.stats?.average || 0);
    setValue("strikeRate", player.stats?.strikeRate || 0);
    setValue("matches", player.stats?.matches || 0);
    setValue("fifties", player.stats?.fifties || 0);
    setValue("hundreds", player.stats?.hundreds || 0);
    setValue("highestScore", player.stats?.highestScore || 0);
    setValue("economy", player.stats?.economy || 0);
    setValue("catches", player.stats?.catches || 0);
    setValue("runOuts", player.stats?.runOuts || 0);
    setValue("droppedCatches", player.stats?.droppedCatches || 0);
    setValue("mistakesCount", player.stats?.mistakesCount || 0);
    setValue("rating", player.stats?.rating || 60);

    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingPlayer(null);
    reset({
      name: "",
      role: "Batsman",
      jerseyNumber: "",
      age: "",
      battingStyle: "Right-hand bat",
      bowlingStyle: "Right-arm bowler",
      debut: new Date().getFullYear().toString(),
      phone: "",
      email: "",
      photo: "",
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
    });
    setIsModalOpen(true);
  };

  // Helper to map rating out of 100 to descriptive label
  const getRatingLabel = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "bg-emerald-500/10 text-emerald-600" };
    if (score >= 80) return { label: "Very Good", color: "bg-teal-500/10 text-teal-600" };
    if (score >= 70) return { label: "Good", color: "bg-[#0A3D91]/10 text-[#0A3D91] dark:text-[#D9ECFF]" };
    if (score >= 60) return { label: "Average", color: "bg-yellow-500/10 text-yellow-600" };
    if (score >= 50) return { label: "Needs Improvement", color: "bg-orange-500/10 text-orange-500" };
    return { label: "Poor", color: "bg-red-500/10 text-red-500" };
  };

  // Submit profile add/edit to Firestore
  const onSubmit = async (data: PlayerFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        role: data.role,
        jerseyNumber: data.jerseyNumber,
        age: data.age,
        battingStyle: data.battingStyle,
        bowlingStyle: data.bowlingStyle,
        debut: data.debut,
        phone: data.phone || "",
        email: data.email,
        photo: data.photo || "",
        suspended: editingPlayer ? !!editingPlayer.suspended : false,
        stats: {
          runs: Number(data.runs),
          wickets: Number(data.wickets),
          average: Number(data.average),
          strikeRate: Number(data.strikeRate),
          matches: Number(data.matches),
          fifties: Number(data.fifties),
          hundreds: Number(data.hundreds),
          highestScore: Number(data.highestScore),
          economy: Number(data.economy),
          catches: Number(data.catches),
          runOuts: Number(data.runOuts),
          droppedCatches: Number(data.droppedCatches),
          mistakesCount: Number(data.mistakesCount),
          rating: Number(data.rating),
        },
      };

      if (editingPlayer) {
        // Update document
        await setDoc(doc(db, "players", editingPlayer.id), payload, { merge: true });
        toast.success(`${data.name}'s profile updated!`);
      } else {
        // Add new document
        await addDoc(collection(db, "players"), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        toast.success(`Profile created for ${data.name}!`);
      }
      setIsModalOpen(false);
      fetchPlayers();
    } catch (err) {
      toast.error("Failed to save player details");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Player document
  const handleDeletePlayer = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}'s profile from database?`)) return;
    try {
      await deleteDoc(doc(db, "players", id));
      toast.success("Profile deleted successfully.");
      fetchPlayers();
    } catch (err) {
      toast.error("Could not delete profile");
    }
  };

  // Toggle Suspend Status
  const handleToggleSuspend = async (player: PlayerProfile) => {
    const nextState = !player.suspended;
    const word = nextState ? "suspend" : "reinstate";
    
    if (!window.confirm(`Are you sure you want to ${word} ${player.name}?`)) return;

    try {
      await updateDoc(doc(db, "players", player.id), { suspended: nextState });
      toast.success(`Player has been ${nextState ? "suspended" : "activated"}.`);
      fetchPlayers();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Filter player lists
  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase()) ||
    p.jerseyNumber.includes(search)
  );

  return (
    <LayoutWrapper requireAdmin>
      <div className="space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-[#002B7F] dark:text-white flex items-center">
              <Users className="mr-3 text-[#FF6B00]" size={32} />
              Roster Manager
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Create and configure player profiles, bio metrics, batting stats, and squad standing ratings
            </p>
          </div>
          <button onClick={openAddModal} className="flex items-center px-4 py-2.5 btn-orange text-sm font-semibold rounded-xl focus:outline-none">
            <Plus size={16} className="mr-2" />
            Add Athlete Profile
          </button>
        </div>

        {/* Search Panel */}
        <div className="glass-panel p-4 rounded-xl border border-white/20 flex items-center">
          <Search size={18} className="text-slate-400 mr-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roster by name, role, or jersey number..."
            className="block w-full bg-transparent border-none text-sm outline-none text-slate-800 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* Players Card List Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-[#0A3D91]/20 animate-ping"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-[#0A3D91] animate-spin"></div>
            </div>
            <p className="text-xs text-slate-400 mt-3">Loading squad files...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-20">No player profiles found matching the query.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlayers.map((player) => {
              const ratingData = getRatingLabel(player.stats?.rating || 60);
              return (
                <div 
                  key={player.id} 
                  className={`glass-card p-6 rounded-2xl flex flex-col justify-between border relative overflow-hidden ${
                    player.suspended ? "opacity-60 grayscale border-red-500/20" : "border-white/10"
                  }`}
                >
                  {/* Bio Header */}
                  <div>
                    <div className="flex items-start space-x-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0A3D91]/15 to-[#FF6B00]/10 flex items-center justify-center text-[#0A3D91] dark:text-white text-2xl font-black border border-white/20">
                        {player.photo ? (
                          <img src={player.photo} alt={player.name} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          player.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate max-w-[120px]">{player.name}</h3>
                          <span className="text-xs font-black text-slate-400">#{player.jerseyNumber}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{player.role}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Debut year: {player.debut} (Age: {player.age})</p>
                      </div>
                    </div>

                    {/* Stats Dashboard summary */}
                    <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-xl bg-slate-500/5 text-center">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Matches</p>
                        <p className="text-sm font-bold mt-0.5">{player.stats?.matches || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Runs</p>
                        <p className="text-sm font-bold mt-0.5 text-[#0A3D91] dark:text-[#D9ECFF]">{player.stats?.runs || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Wickets</p>
                        <p className="text-sm font-bold mt-0.5 text-[#FF6B00]">{player.stats?.wickets || 0}</p>
                      </div>
                    </div>

                    {/* Qualititative Standing */}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-slate-400 flex items-center">
                        <BarChart size={12} className="mr-1" />
                        Coach Rating:
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${ratingData.color}`}>
                        {player.stats?.rating || 0} - {ratingData.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/40 flex justify-between items-center">
                    <button
                      onClick={() => handleToggleSuspend(player)}
                      className={`text-xs font-bold flex items-center px-2 py-1 rounded-lg transition-colors ${
                        player.suspended 
                          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" 
                          : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      }`}
                    >
                      {player.suspended ? (
                        <>
                          <UserCheck size={14} className="mr-1" />
                          Activate
                        </>
                      ) : (
                        <>
                          <UserMinus size={14} className="mr-1" />
                          Suspend
                        </>
                      )}
                    </button>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(player)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#0A3D91] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Profile"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(player.id, player.name)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                        title="Delete Profile"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal dialog for creating/editing athlete profiles */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            
            <div className="w-full max-w-2xl bg-white dark:bg-[#121824] p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-10 my-8 overflow-y-auto max-h-[85vh]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[#002B7F] dark:text-white flex items-center">
                  <Briefcase size={20} className="mr-2 text-[#FF6B00]" />
                  {editingPlayer ? "Modify Athlete Profile" : "Create Athlete Profile"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Section A: Bio Details */}
                <div>
                  <h4 className="text-xs font-black uppercase text-[#0A3D91] dark:text-[#D9ECFF] mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
                    A. Biological & Bio Metrics
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name</label>
                      <input
                        type="text"
                        {...register("name")}
                        className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                        placeholder="Rahul Dravid"
                      />
                      {errors.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.name.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Team Position / Role</label>
                      <select
                        {...register("role")}
                        className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                      >
                        <option value="Batsman">Batsman</option>
                        <option value="Bowler">Bowler</option>
                        <option value="All-Rounder">All-Rounder</option>
                        <option value="Wicket-Keeper Batsman">Wicket-Keeper Batsman</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Jersey Number</label>
                        <input
                          type="text"
                          {...register("jerseyNumber")}
                          className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                          placeholder="e.g. 18"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Age</label>
                        <input
                          type="text"
                          {...register("age")}
                          className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                          placeholder="e.g. 26"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Debut Year</label>
                        <input
                          type="text"
                          {...register("debut")}
                          className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                          placeholder="e.g. 2021"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Profile Image</label>
                        <div className="flex items-center space-x-4 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-500/5">
                          {/* Image preview */}
                          <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                            {currentPhoto ? (
                              <img src={currentPhoto} alt="Player Preview" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          
                          {/* Upload controls */}
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center space-x-2">
                              <label className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0A3D91] text-white hover:bg-[#002B7F] transition-all flex items-center ${uploadingImage ? "opacity-50 pointer-events-none" : ""}`}>
                                <Upload size={14} className="mr-1.5" />
                                {uploadingImage ? "Uploading..." : "Upload Photo"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleImageUpload}
                                  disabled={uploadingImage}
                                />
                              </label>
                              
                              {currentPhoto && (
                                <button
                                  type="button"
                                  onClick={() => setValue("photo", "")}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">PNG, JPG or WEBP (Max 5MB)</p>
                          </div>
                        </div>
                        {/* Hidden input for react-hook-form to register photo URL */}
                        <input type="hidden" {...register("photo")} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Batting Style</label>
                        <select
                          {...register("battingStyle")}
                          className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                        >
                          <option value="Right-hand bat">Right-hand bat</option>
                          <option value="Left-hand bat">Left-hand bat</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Bowling Style</label>
                        <select
                          {...register("bowlingStyle")}
                          className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                        >
                          <option value="Right-arm fast">Right-arm fast</option>
                          <option value="Right-arm spin">Right-arm spin</option>
                          <option value="Left-arm fast">Left-arm fast</option>
                          <option value="Left-arm spin">Left-arm spin</option>
                          <option value="Right-arm bowler">Right-arm bowler</option>
                          <option value="Left-arm bowler">Left-arm bowler</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone</label>
                        <input
                          type="text"
                          {...register("phone")}
                          className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                          placeholder="+919999999999"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
                        <input
                          type="email"
                          {...register("email")}
                          className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                          placeholder="rahul@stars.com"
                        />
                        {errors.email && <p className="text-[10px] text-red-500 mt-0.5">{errors.email.message}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Statistics */}
                <div>
                  <h4 className="text-xs font-black uppercase text-[#FF6B00] mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
                    B. Performance Statistics & Standing Rating
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Matches Played</label>
                      <input
                        type="number"
                        {...register("matches")}
                        className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Total Runs</label>
                      <input
                        type="number"
                        {...register("runs")}
                        className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Batting Average</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register("average")}
                        className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Strike Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register("strikeRate")}
                        className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Total Wickets</label>
                      <input
                        type="number"
                        {...register("wickets")}
                        className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Bowling Economy</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register("economy")}
                        className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Fifties / 100s</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="50s"
                          {...register("fifties")}
                          className="block w-full px-2 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                        />
                        <input
                          type="number"
                          placeholder="100s"
                          {...register("hundreds")}
                          className="block w-full px-2 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Highest Score</label>
                      <input
                        type="number"
                        {...register("highestScore")}
                        className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Catches Claimed</label>
                      <input
                        type="number"
                        {...register("catches")}
                        className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Run Outs</label>
                      <input
                        type="number"
                        {...register("runOuts")}
                        className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Mistakes Count</label>
                      <input
                        type="number"
                        {...register("mistakesCount")}
                        className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Overall Rating (0 - 100)
                      </label>
                      <input
                        type="number"
                        {...register("rating")}
                        className="block w-full px-3 py-2 bg-[#FF6B00]/5 border border-[#FF6B00]/30 rounded-xl text-sm font-bold focus:outline-none dark:text-white text-[#FF6B00]"
                      />
                      {errors.rating && <p className="text-[10px] text-red-500 mt-0.5">{errors.rating.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 btn-primary text-xs font-semibold rounded-xl flex items-center justify-center disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Athlete Standing"}
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
