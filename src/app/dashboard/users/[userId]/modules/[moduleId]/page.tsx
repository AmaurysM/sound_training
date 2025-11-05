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
    Loader2,
    Shield,
    FileCheck,
    ChevronRight,
    Clock,
    Archive,
    BookOpen,
    AlertCircle,
} from "lucide-react";
import { IUserModule, IUserSubmodule, Roles } from "@/models/types";
import { useDashboard } from "@/contexts/dashboard-context";
import LoadingScreen from "@/app/components/LoadingScreen";

interface UploadedFile {
    _id: string;
    fileName: string;
    fileType: string;
    url: string;
    moduleId: string;
    createdAt: string;
}

export default function ModuleInfo() {
    const params = useParams();
    const router = useRouter();
    const {
        currentUser,
        viewedUser,
        fetchCurrentUser,
        //fetchViewedUserAndModules
    } = useDashboard();

    const [userModule, setUserModule] = useState<IUserModule | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notes, setNotes] = useState("");
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch current user from context or API
            if (!currentUser) {
                await fetchCurrentUser();
            }

            // Fetch user module
            const moduleRes = await fetch(`/api/users/${params.userId}/modules/${params.moduleId}`);
            if (!moduleRes.ok) throw new Error("Failed to load module");

            const moduleResponse = await moduleRes.json();
            const moduleData = moduleResponse.data;

            setUserModule(moduleData);
            setNotes(moduleData.notes || "");

            // // Fetch the user who owns this module from context
            // if (!viewedUser || viewedUser._id !== params.userId) {
            //     await fetchViewedUserAndModules(params.userId as string);
            // }

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
    }, [params.userId, params.moduleId, currentUser, fetchCurrentUser]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const isSubmoduleComplete = (submodule: IUserSubmodule) => {
        if (!submodule.ojt) return false;

        const sigs = submodule.signatures || [];
        const hasCoordinator = sigs.some(s => s.role === Roles.Coordinator);
        const hasTrainer = sigs.some(s => s.role === Roles.Trainer);
        const hasTrainee = sigs.some(s => s.role === Roles.Student);

        if (!hasCoordinator || !hasTrainer || !hasTrainee) return false;

        if (submodule.tSubmodule && typeof submodule.tSubmodule !== "string") {
            if (submodule.tSubmodule.requiresPractical && !submodule.practical) {
                return false;
            }
        }

        return true;
    };

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

            // Refresh the viewed user modules in context
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

    if (loading) { return <LoadingScreen message={"Loading module..."} />; }

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
                            onClick={() => router.push(`/dashboard/users/${params.userId}/modules`)}
                            className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium shadow-md hover:shadow-lg"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isUserArchived = viewedUser?.archived || false;
        const isCoordinator = currentUser?.role === Roles.Coordinator;
    

    const completedSubmodules =
        userModule.submodules?.filter(
            (s): s is IUserSubmodule => typeof s !== "string" && isSubmoduleComplete(s)
        ).length || 0;
    const totalSubmodules = userModule.submodules?.length || 0;
    const progressPercentage = totalSubmodules > 0 ? Math.round((completedSubmodules / totalSubmodules) * 100) : 0;

    const moduleLocked = userModule.archived || viewedUser?.archived;
    const canUploadFiles =
        !moduleLocked && currentUser?.role === Roles.Coordinator;
    const canDeleteFiles = !moduleLocked && currentUser?.role === Roles.Coordinator;
    const canEditNotes =
        !moduleLocked && currentUser?.role !== Roles.Student;

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
            <div className="max-w-7xl mx-auto p-6 lg:p-8">
                {/* Back Button */}
                <button
                    onClick={() => router.push(`/dashboard/users/${params.userId}/modules`)}
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
                                    <div className="flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                                            <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                                            <span className="text-xs sm:text-sm font-medium">NATA Certified Training</span>
                                        </div>
                                        {(userModule.archived || viewedUser?.archived) && (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 bg-amber-500/20 backdrop-blur-sm rounded-full border border-amber-300/30">
                                                <Archive className="w-3 h-3 sm:w-4 sm:h-4 text-amber-300" />
                                                <span className="text-xs sm:text-sm font-medium text-amber-100">
                                                    {userModule.archived ? "Module Archived" : "User Archived"}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-3 leading-tight wrap-break-word">
                                        {typeof userModule.tModule !== "string"
                                            ? userModule.tModule?.name
                                            : "Unknown Module"}
                                    </h1>

                                    <div className="flex items-center gap-4 text-slate-300 text-sm sm:text-base mb-2">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            <span>Trainee: <strong className="text-white">{viewedUser?.name}</strong></span>
                                        </div>
                                        <span className="text-slate-400">•</span>
                                        <div className="flex items-center gap-2">
                                            <span>Status: </span>
                                            <span className={`font-semibold ${moduleLocked ? 'text-amber-300' : 'text-green-300'}`}>
                                                {moduleLocked ? 'Archived' : 'Active'}
                                            </span>
                                        </div>
                                    </div>

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
                                    <p className="font-bold text-sm sm:text-base text-slate-900 truncate">{viewedUser?.name}</p>
                                    <p className="text-xs sm:text-sm text-slate-500">@{viewedUser?.username}</p>
                                    <p className="text-xs text-slate-400 capitalize">{viewedUser?.role?.toLowerCase()}</p>
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

                    {/* Enhanced Submodules Section */}
                    {userModule.submodules && userModule.submodules.length > 0 && (
                        <div className="border-t border-slate-200">
                            <button
                                onClick={() => router.push(`/dashboard/users/${params.userId}/modules/${params.moduleId}/submodules`)}
                                className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer"
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="p-2 sm:p-3 bg-purple-50 rounded-lg shrink-0 group-hover:bg-purple-100 transition-colors">
                                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                                            View Submodules & Curriculum
                                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                                                {completedSubmodules}/{totalSubmodules} Complete
                                            </span>
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                            Click to view all submodules, track progress, and manage training activities
                                        </p>

                                        {/* Progress bar */}
                                        <div className="mt-2 w-full max-w-xs bg-slate-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-purple-600 h-2 rounded-full transition-all"
                                                style={{ width: `${progressPercentage}%` }}
                                            />
                                        </div>

                                        {/* Progress text */}
                                        <p className="text-xs text-slate-500 mt-1">
                                            {progressPercentage}% complete • {completedSubmodules} of {totalSubmodules} submodules finished
                                        </p>
                                    </div>
                                </div>

                                {/* Enhanced button with clear call-to-action */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-purple-600 hidden sm:inline">Open Curriculum</span>
                                    <div className="p-2 sm:p-3 rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors">
                                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {isUserArchived && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3 mb-5">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-900">User Account Archived</p>
                            <p className="text-xs text-red-700 mt-1">
                                This user has been archived. {isCoordinator ? 'You can view notes and fils but cannot make any changes.' : 'No changes can be made to archived user accounts or their information.'}
                            </p>
                        </div>
                    </div>
                )}

                <div className="lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                        {/* Notes Section */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <FileText className="w-6 h-6 text-blue-600" />
                                <h2 className="text-2xl font-bold text-slate-900">Training Notes</h2>
                                {moduleLocked && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                                        Read-only (Archived)
                                    </span>
                                )}
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                disabled={!canEditNotes}
                                className="w-full h-40 p-4 border-2 border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="Document trainee progress, performance observations, and notes..."
                            />
                            {canEditNotes && (
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={saving}
                                    className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Save Notes
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Files Section */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                                <div className="flex items-center gap-3">
                                    <FileCheck className="w-6 h-6 text-purple-600" />
                                    <h2 className="text-2xl font-bold text-slate-900">
                                        Documents & Files
                                    </h2>
                                    {moduleLocked && (
                                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                                            Read-only
                                        </span>
                                    )}
                                </div>

                                {canUploadFiles && (
                                    <label className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-700 cursor-pointer transition-all font-semibold shadow-lg hover:shadow-xl">
                                        {uploading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-5 h-5" />
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
                                <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                                    <p className="text-lg text-slate-600 font-semibold">
                                        No files uploaded yet
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {files.map((file) => (
                                        <div
                                            key={file._id}
                                            className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all group"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="p-3 bg-blue-100 rounded-xl shrink-0">
                                                    <FileText className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-base text-slate-900 truncate">
                                                        {file.fileName}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {file.fileType} •{" "}
                                                        {new Date(file.createdAt).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 ml-4 shrink-0">
                                                <button
                                                    onClick={() => window.open(file.url, "_blank")}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Download file"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>

                                                {canDeleteFiles && (
                                                    <button
                                                        onClick={() => handleDeleteFile(file._id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete file"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
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