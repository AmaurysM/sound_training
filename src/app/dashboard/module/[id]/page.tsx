// src/app/users/[userId]/modules/[moduleId]/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    FileText,
    Download,
    Trash2,
    User,
    Calendar,
    ArrowLeft,
    Save,
    ClipboardList,
    Loader2,
    Shield,
    FileCheck,
    ChevronRight,
    Clock,
} from "lucide-react";
import { IUserModule, IUser, Roles } from "@/models/types";

interface UploadedFile {
    _id: string;
    fileName: string;
    fileType: string;
    url: string;
    moduleId: string;
    createdAt: string;
}

export default function UserModulePage() {
  const params = useParams();
  const router = useRouter();

  const [userModule, setUserModule] = useState<IUserModule | null>(null);
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moduleUser, setModuleUser] = useState<IUser | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch current user
      const meRes = await fetch("/api/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const userData = await meRes.json();
      setCurrentUser(userData);

      // Fetch user module
      const moduleRes = await fetch(`/api/users/${params.userId}/modules/${params.moduleId}`);
      if (!moduleRes.ok) throw new Error("Failed to load module");

      const moduleResponse = await moduleRes.json();
      const moduleData = moduleResponse.data;

      setUserModule(moduleData);
      setNotes(moduleData.notes || "");

      // Fetch module owner
      const userRes = await fetch(`/api/users/${params.userId}`);
      if (userRes.ok) {
        const userResponse = await userRes.json();
        setModuleUser(userResponse.data || userResponse);
      }

      // Fetch files
      const filesRes = await fetch(`/api/users/${params.userId}/modules/${params.moduleId}/files`);
      if (filesRes.ok) {
        const filesResponse = await filesRes.json();
        setFiles(filesResponse.data || filesResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [params.userId, params.moduleId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!currentUser || !currentUser._id) {
            alert("You must be logged in to upload files");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("moduleId", params.moduleId as string);
            formData.append("uploadedBy", currentUser.name);
            formData.append("uploadedById", currentUser._id.toString());

            const res = await fetch(`/api/users/${params.userId}/modules/${params.moduleId}/files`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const response = await res.json();
            const newFile = response.data || response;
            setFiles([...files, newFile]);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleSaveNotes = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/users/${params.userId}/modules/${params.moduleId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes }),
            });

            if (!res.ok) throw new Error("Failed to save notes");

            const response = await res.json();
            setUserModule(response.data);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to save notes");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!confirm("Are you sure you want to delete this file?")) return;

        try {
            const res = await fetch(`/api/users/${params.userId}/modules/${params.moduleId}/files/${fileId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete file");

            setFiles(files.filter(f => f._id !== fileId));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete file");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 text-lg font-medium">Loading module...</p>
                </div>
            </div>
        );
    }

    if (error || !userModule) {
        return (
            <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
                <div className="max-w-7xl mx-auto p-8">
                    <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-lg">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-red-600 font-semibold text-lg mb-6">{error || "Module not found"}</p>
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium shadow-md hover:shadow-lg"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    //userModule.submodules?.filter(s => s.signedOff).length ||
    const completedSubmodules = 0;
    const totalSubmodules = userModule.submodules?.length || 0;
    const progressPercentage = totalSubmodules > 0 ? Math.round((completedSubmodules / totalSubmodules) * 100) : 0;

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
            <div className="max-w-7xl mx-auto p-6 lg:p-8">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="mb-8 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors group"
                >
                    <div className="p-2 rounded-lg group-hover:bg-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </div>
                    <span className="font-medium">Back to Dashboard</span>
                </button>

                {/* Header Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-slate-200">
                    <div className="bg-linear-to-r from-slate-900 via-blue-900 to-slate-900 p-4 sm:p-6 lg:p-10 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-white/[0.05] bg-size-[20px_20px]"></div>
                        <div className="relative z-10">
                            <div className="flex items-start justify-between gap-3 sm:gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-3 sm:mb-4">
                                        <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="text-xs sm:text-sm font-medium">NATA Certified Training</span>
                                    </div>

                                    <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-3 leading-tight wrap-break-word">
                                        {typeof userModule.tModule !== "string"
                                            ? userModule.tModule?.name
                                            : "Unknown Module"}
                                    </h1>

                                    <p className="text-slate-200 text-sm sm:text-base lg:text-lg mb-2">
                                        National Aviation Training Association Module
                                    </p>

                                    {typeof userModule.tModule !== "string" && userModule.tModule?.description && (
                                        <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                                            {userModule.tModule.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Trainee Info */}
                    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 border-t border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                            <div className="flex items-center gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="p-2 sm:p-3 bg-blue-50 rounded-xl shrink-0">
                                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 sm:mb-1">Trainee</p>
                                    <p className="font-bold text-sm sm:text-base text-slate-900 truncate">{moduleUser?.name}</p>
                                    <p className="text-xs sm:text-sm text-slate-500">@{moduleUser?.username}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="p-2 sm:p-3 bg-emerald-50 rounded-xl shrink-0">
                                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 sm:mb-1">Started</p>
                                    <p className="font-bold text-sm sm:text-base text-slate-900">
                                        {userModule.createdAt
                                            ? new Date(userModule.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })
                                            : 'No date'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="p-2 sm:p-3 bg-purple-50 rounded-xl shrink-0">
                                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 sm:mb-1">Last Updated</p>
                                    <p className="font-bold text-sm sm:text-base text-slate-900">
                                        {userModule.updatedAt
                                            ? new Date(userModule.updatedAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })
                                            : 'No date'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submodules Section */}
                    {userModule.submodules && userModule.submodules.length > 0 && (
                        <div className="border-t border-slate-200">
                            <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="p-2 sm:p-3 bg-purple-50 rounded-lg shrink-0">
                                        <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm sm:text-base text-slate-900">Module Curriculum</h3>

                                        {/* Progress bar */}
                                        <div className="mt-1 w-40 sm:w-52 bg-slate-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-purple-600 h-2 rounded-full transition-all"
                                                style={{ width: `${progressPercentage}%` }}
                                            />
                                        </div>

                                        {/* Progress text */}
                                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                            {completedSubmodules} of {totalSubmodules} submodules completed ({progressPercentage}%)
                                        </p>
                                    </div>
                                </div>

                                {/* Button to navigate */}
                                <button
                                    onClick={() => router.push(`/users/${params.userId}/modules/${params.moduleId}/submodules`)}
                                    className="p-2 sm:p-3 rounded-lg hover:bg-purple-100 transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                        {/* Notes Section */}
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-slate-200">
                            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                                <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg shrink-0">
                                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Training Notes</h2>
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-40 sm:h-48 p-3 sm:p-5 border-2 border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 font-mono text-xs sm:text-sm"
                                placeholder="Document trainee progress, performance observations, areas for improvement, and additional notes..."
                                disabled={currentUser?.role === Roles.Student}
                            />
                            {currentUser?.role !== Roles.Student && (
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={saving}
                                    className="mt-3 sm:mt-4 px-4 py-2.5 sm:px-6 sm:py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm sm:text-base"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                                            Save Notes
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Files Section */}
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-slate-200">
                            <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3 sm:gap-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="p-1.5 sm:p-2 bg-purple-50 rounded-lg shrink-0">
                                        <FileCheck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Documents & Files</h2>
                                </div>
                                {currentUser?.role !== Roles.Student && (
                                    <label className="flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-700 cursor-pointer transition-all font-semibold shadow-lg hover:shadow-xl text-sm sm:text-base">
                                        {uploading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                                <span>Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                                                <span>Upload File</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                    </label>
                                )}
                            </div>

                            {files.length === 0 ? (
                                <div className="text-center py-12 sm:py-16 bg-slate-50 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-300">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                                    </div>
                                    <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-semibold">No files uploaded yet</p>
                                    <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2 px-4">Upload training materials, certificates, and documentation</p>
                                </div>
                            ) : (
                                <div className="space-y-2 sm:space-y-3">
                                    {files.map((file) => (
                                        <div
                                            key={file._id}
                                            className="flex items-center justify-between p-3 sm:p-5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 hover:shadow-md group"
                                        >
                                            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl shrink-0">
                                                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm sm:text-base text-slate-900 truncate">{file.fileName}</p>
                                                    <p className="text-xs sm:text-sm text-slate-500">
                                                        {file.fileType} • {new Date(file.createdAt).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 sm:gap-2 ml-2 sm:ml-4 shrink-0">
                                                <button
                                                    onClick={() => window.open(file.url, "_blank")}
                                                    className="p-2 sm:p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                                    title="Download file"
                                                >
                                                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </button>
                                                {currentUser?.role !== Roles.Student && (
                                                    <button
                                                        onClick={() => handleDeleteFile(file._id)}
                                                        className="p-2 sm:p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                        title="Delete file"
                                                    >
                                                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}