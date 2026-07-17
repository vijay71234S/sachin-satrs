"use client";

import React, { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import toast from "react-hot-toast";
import { 
  UserPlus, 
  Trash2, 
  ShieldAlert, 
  Edit3, 
  KeyRound, 
  RefreshCw, 
  UserX, 
  CheckCircle,
  Phone,
  Mail,
  User,
  Hash
} from "lucide-react";

// Validation schema for creating a user
const createUserSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  playerName: z.string().min(2, "Player name must be at least 2 characters"),
  phoneNumber: z.string().optional(),
  role: z.enum(["admin", "member"]),
  playerId: z.string().min(1, "Player ID/Jersey is required"),
});

// Validation schema for updating user
const editUserSchema = z.object({
  playerName: z.string().min(2, "Player name must be at least 2 characters"),
  phoneNumber: z.string().optional(),
  role: z.enum(["admin", "member"]),
  playerId: z.string().min(1, "Player ID/Jersey is required"),
});

type CreateUserValues = z.infer<typeof createUserSchema>;
type EditUserValues = z.infer<typeof editUserSchema>;

interface DbUser {
  uid: string;
  email: string;
  role: "admin" | "member";
  playerName: string;
  phoneNumber?: string;
  playerId?: string;
  disabled?: boolean;
}

export default function CreateUserPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<DbUser | null>(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState<DbUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isPwSubmitting, setIsPwSubmitting] = useState(false);

  // Load all users from route handler
  const fetchUsers = async () => {
    try {
      setLoading(true);
      if (!user) return;
      
      const token = await user.getIdToken();
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user accounts (Status ${response.status})`);
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (error: any) {
      toast.error(error.message || "Could not retrieve team accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  // Create Form Hook
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      playerName: "",
      phoneNumber: "",
      role: "member",
      playerId: "",
    },
  });

  // Edit Form Hook
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    setValue: setEditValue,
    formState: { errors: editErrors },
  } = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
  });

  // Load editing user data into edit form
  useEffect(() => {
    if (editingUser) {
      setEditValue("playerName", editingUser.playerName);
      setEditValue("phoneNumber", editingUser.phoneNumber || "");
      setEditValue("role", editingUser.role);
      setEditValue("playerId", editingUser.playerId || "");
    }
  }, [editingUser, setEditValue]);

  // Submit Create User
  const handleCreateUser = async (data: CreateUserValues) => {
    setIsSubmitting(true);
    try {
      if (!user) return;
      const token = await user.getIdToken();
      
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMsg = "Failed to create user account";
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          errorMsg = `Server Error: Request failed with status ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      const resData = await response.json();

      toast.success(`Account created for ${data.playerName}!`);
      reset();
      fetchUsers(); // Refresh listings
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit User
  const handleEditUser = async (data: EditUserValues) => {
    if (!editingUser || !user) return;
    setIsSubmitting(true);
    
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${editingUser.uid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMsg = "Failed to update profile";
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          errorMsg = `Server Error: Request failed with status ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      const resData = await response.json();

      toast.success("Profile updated successfully!");
      setEditingUser(null);
      fetchUsers(); // Refresh listings
    } catch (err: any) {
      toast.error(err.message || "Failed to edit user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (uid: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${name}'s account? This action is permanent.`)) {
      return;
    }
    
    try {
      if (!user) return;
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${uid}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMsg = "Failed to delete account";
        try {
          const resData = await response.json();
          errorMsg = resData.error || errorMsg;
        } catch {
          errorMsg = `Server Error: Request failed with status ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      toast.success("Account deleted successfully.");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  // Toggle Account Active / Suspended State
  const handleToggleStatus = async (dbUser: DbUser) => {
    const newDisabledState = !dbUser.disabled;
    const actionText = newDisabledState ? "disable / suspend" : "enable / activate";
    
    if (!window.confirm(`Confirm action to ${actionText} ${dbUser.playerName}'s access?`)) {
      return;
    }

    try {
      if (!user) return;
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${dbUser.uid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ disabled: newDisabledState }),
      });

      if (!response.ok) {
        let errorMsg = "Failed to alter account status";
        try {
          const resData = await response.json();
          errorMsg = resData.error || errorMsg;
        } catch {
          errorMsg = `Server Error: Request failed with status ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      toast.success(`Account status modified successfully.`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  // Submit Password Force Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPasswordUser || !user || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsPwSubmitting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${changingPasswordUser.uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        let errorMsg = "Failed to change password";
        try {
          const resData = await response.json();
          errorMsg = resData.error || errorMsg;
        } catch {
          errorMsg = `Server Error: Request failed with status ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      toast.success(`Password updated for ${changingPasswordUser.playerName}!`);
      setChangingPasswordUser(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsPwSubmitting(false);
    }
  };

  return (
    <LayoutWrapper requireAdmin>
      <div className="space-y-8">
        
        {/* Header Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-[#002B7F] dark:text-white flex items-center">
            <UserPlus className="mr-3 text-[#FF6B00]" size={32} />
            User Account Controller
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Provision logins, edit profiles, toggle active status, and force password resets for athletes and staff
          </p>
        </div>

        {/* Create User Form & Current Users Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Create User Column */}
          <div className="xl:col-span-1">
            <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md">
              <h3 className="text-lg font-bold text-[#002B7F] dark:text-white mb-4 flex items-center">
                <UserPlus className="mr-2 text-[#0A3D91] dark:text-[#D9ECFF]" size={18} />
                Register New User
              </h3>

              <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4">
                {/* Player Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Player/User Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      {...register("playerName")}
                      className="block w-full pl-9 pr-3 py-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                      placeholder="e.g. Rahul Dravid"
                    />
                  </div>
                  {errors.playerName && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.playerName.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      {...register("email")}
                      className="block w-full pl-9 pr-3 py-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                      placeholder="rahul@team.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.email.message}</p>
                  )}
                </div>

                {/* Temporary Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Initial Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      {...register("password")}
                      className="block w-full pl-9 pr-3 py-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                      placeholder="•••••••• (Min 6 chars)"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.password.message}</p>
                  )}
                </div>

                {/* Phone & Jersey/Player ID Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        {...register("phoneNumber")}
                        className="block w-full pl-9 pr-2 py-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                        placeholder="+919876543210"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Player ID/Jersey
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        {...register("playerId")}
                        className="block w-full pl-9 pr-2 py-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                        placeholder="Jersey Num"
                      />
                    </div>
                    {errors.playerId && (
                      <p className="text-[10px] text-red-500 mt-0.5">{errors.playerId.message}</p>
                    )}
                  </div>
                </div>

                {/* Role selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    System Access Role
                  </label>
                  <select
                    {...register("role")}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                  >
                    <option value="member">Team Member (Read-Only Viewer)</option>
                    <option value="admin">Administrator / Coach (Full Access)</option>
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 flex items-center justify-center py-2.5 btn-primary text-sm font-semibold rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="animate-spin mr-2" size={16} />
                  ) : (
                    "Provision Credentials"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* User Account Registry listings */}
          <div className="xl:col-span-2 space-y-4">
            <div className="glass-panel p-6 rounded-2xl border border-white/20 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[#002B7F] dark:text-white">Active Registry</h3>
                <span className="text-xs bg-[#0A3D91]/10 text-[#0A3D91] dark:bg-[#D9ECFF]/15 dark:text-[#D9ECFF] font-semibold px-2.5 py-1 rounded-xl">
                  {users.length} accounts loaded
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="animate-spin text-[#0A3D91] h-10 w-10" />
                  <p className="text-xs text-slate-400 mt-2">Loading credentials registry...</p>
                </div>
              ) : users.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-12">No credentials registered yet. Use the panel on the left to add team members.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                        <th className="pb-3">Player Info</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3">Contact</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((dbUser) => (
                        <tr 
                          key={dbUser.uid} 
                          className="border-b border-slate-100 dark:border-slate-800/40 text-sm hover:bg-slate-500/5 transition-colors"
                        >
                          <td className="py-3.5 pr-2">
                            <p className="font-bold text-slate-800 dark:text-white">{dbUser.playerName}</p>
                            <p className="text-xs text-slate-400 flex items-center mt-0.5">
                              ID: {dbUser.playerId || "N/A"}
                            </p>
                          </td>
                          <td className="py-3.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              dbUser.role === "admin" 
                                ? "bg-indigo-500/10 text-indigo-500" 
                                : "bg-[#FF6B00]/10 text-[#FF6B00]"
                            }`}>
                              {dbUser.role === "admin" ? "Admin" : "Member"}
                            </span>
                          </td>
                          <td className="py-3.5 text-xs">
                            <p className="text-slate-600 dark:text-slate-300">{dbUser.email}</p>
                            <p className="text-slate-400 mt-0.5">{dbUser.phoneNumber || "No Phone"}</p>
                          </td>
                          <td className="py-3.5 text-center">
                            <button
                              onClick={() => handleToggleStatus(dbUser)}
                              className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                                dbUser.disabled 
                                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                                  : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                              }`}
                              title={dbUser.disabled ? "Click to Activate" : "Click to Suspend"}
                            >
                              {dbUser.disabled ? "Suspended" : "Active"}
                            </button>
                          </td>
                          <td className="py-3.5 text-right space-x-1">
                            {/* Reset Password Icon Button */}
                            <button
                              onClick={() => setChangingPasswordUser(dbUser)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block"
                              title="Reset Password"
                            >
                              <KeyRound size={16} />
                            </button>
                            {/* Edit Button */}
                            <button
                              onClick={() => setEditingUser(dbUser)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block"
                              title="Edit User Profile"
                            >
                              <Edit3 size={16} />
                            </button>
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteUser(dbUser.uid, dbUser.playerName)}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-500/10 transition-colors inline-block"
                              title="Delete Account"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal: Edit User Profile */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
            <div className="w-full max-w-md glass-panel p-6 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 z-10">
              <h3 className="text-lg font-bold text-[#002B7F] dark:text-white mb-2">Edit Account Profile</h3>
              <p className="text-xs text-slate-400 mb-6">Modify details for {editingUser.email}</p>

              <form onSubmit={handleSubmitEdit(handleEditUser)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Player/User Name</label>
                  <input
                    type="text"
                    {...registerEdit("playerName")}
                    className="block w-full px-3 py-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                  />
                  {editErrors.playerName && <p className="text-[10px] text-red-500 mt-0.5">{editErrors.playerName.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      {...registerEdit("phoneNumber")}
                      className="block w-full px-3 py-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Player ID</label>
                    <input
                      type="text"
                      {...registerEdit("playerId")}
                      className="block w-full px-3 py-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                    />
                    {editErrors.playerId && <p className="text-[10px] text-red-500 mt-0.5">{editErrors.playerId.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Access Role</label>
                  <select
                    {...registerEdit("role")}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                  >
                    <option value="member">Team Member (Read-Only)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>

                <div className="flex space-x-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#0A3D91] hover:bg-[#002B7F] text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Change Password Forcefully */}
        {changingPasswordUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setChangingPasswordUser(null)} />
            <div className="w-full max-w-sm glass-panel p-6 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 z-10">
              <h3 className="text-lg font-bold text-[#002B7F] dark:text-white mb-2">Force Password Reset</h3>
              <p className="text-xs text-slate-400 mb-6">Manually overwrite login password for {changingPasswordUser.playerName}</p>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#0A3D91] dark:text-white"
                    placeholder="Min 6 characters"
                    required
                  />
                </div>

                <div className="flex space-x-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setChangingPasswordUser(null);
                      setNewPassword("");
                    }}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPwSubmitting || newPassword.length < 6}
                    className="px-4 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                  >
                    {isPwSubmitting ? "Changing..." : "Overwrite Password"}
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
