// src/app/trainings/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    FileText,
    Download,
    Trash2,
    CheckCircle2,
    Clock,
    User,
    Calendar,
    ArrowLeft,
    Save,
    Award,
    ClipboardList,
    Loader2,
    ChevronUp,
    ChevronDown,
    Shield,
    FileCheck,
} from "lucide-react";
import { ITraining, ITrainingModule, IUser, Role, ISignature } from "@/models/types";

interface UploadedFile {
    _id: string;
    fileName: string;
    fileType: string;
    url: string;
    trainingId: string;
    createdAt: string;
}

export default function TrainingModulePage() {
    const params = useParams();
    const router = useRouter();
    const [training, setTraining] = useState<ITraining | null>(null);
    const [currentUser, setCurrentUser] = useState<IUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notes, setNotes] = useState("");
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modules, setModules] = useState<ITrainingModule>();
    const [trainingUser, setTrainingUser] = useState<IUser | null>(null);
    const [showSubmodules, setShowSubmodules] = useState(false);

    useEffect(() => {
        fetchData();
    }, [params.id]);

    const fetchData = async () => {
        try {
            setLoading(true);

            const meRes = await fetch("/api/me");
            if (!meRes.ok) {
                router.push("/login");
                return;
            }
            const userData = await meRes.json();
            setCurrentUser(userData);

            const trainingRes = await fetch(`/api/trainings/${params.id}`);
            if (!trainingRes.ok) throw new Error("Failed to load training");

            const trainingData: any = await trainingRes.json();

            const moduleData =
                typeof trainingData.module === "string"
                    ? { name: "Unknown Module", description: "", submodules: [] }
                    : trainingData.module;

            setTraining(trainingData);
            setNotes(trainingData.notes || "");
            setModules(moduleData);
            setTrainingUser(trainingData.user || null);

            const filesRes = await fetch(`/api/trainings/${params.id}/files`);
            if (filesRes.ok) {
                const filesData = await filesRes.json();
                setFiles(filesData);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
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
            formData.append("trainingId", params.id as string);
            formData.append("uploadedBy", currentUser.name);
            formData.append("uploadedById", currentUser._id.toString());

            const res = await fetch(`/api/trainings/${params.id}/files`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const newFile = await res.json();
            setFiles([...files, newFile]);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleToggleCheckbox = async (field: "ojt" | "practical") => {
        if (!training) return;

        try {
            const res = await fetch(`/api/trainings/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: !training[field] }),
            });

            if (!res.ok) throw new Error("Update failed");

            const updated = await res.json();
            setTraining(updated);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Update failed");
        }
    };

    const handleSaveNotes = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/trainings/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes }),
            });

            if (!res.ok) throw new Error("Failed to save notes");

            const updated = await res.json();
            setTraining(updated);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to save notes");
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveSignature = async (signatureId: string) => {
        if (!training || !currentUser) return;

        try {
            const signatureToRemove = training.signatures.find(sig => sig._id === signatureId);
            if (!signatureToRemove) return;

            if (signatureToRemove.userId !== currentUser._id) {
                alert('You can only remove your own signatures.');
                return;
            }

            if (!confirm('Are you sure you want to remove your signature?')) return;

            const updatedSignatures = training.signatures.filter(sig => sig._id !== signatureId);

            const hasTrainer = updatedSignatures.some(sig => sig.role === 'Trainer');
            const hasCoordinator = updatedSignatures.some(sig => sig.role === 'Coordinator');
            const hasTrainee = updatedSignatures.some(sig => sig.role === 'Trainee');
            const signedOff = hasTrainer && hasCoordinator && hasTrainee;

            setTraining(prev => prev ? {
                ...prev,
                signatures: updatedSignatures,
                signedOff,
                updatedAt: new Date()
            } : null);

            const updatePayload = {
                signatures: updatedSignatures,
                signedOff: signedOff
            };

            const res = await fetch(`/api/trainings/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to remove signature: ${res.status}`);
            }

            const serverUpdated = await res.json();
            setTraining(serverUpdated);

        } catch (err) {
            console.error('Failed to remove signature:', err);
            fetchData();
            alert(err instanceof Error ? err.message : 'Failed to remove signature');
        }
    };

    const handleSign = async (role: "Trainer" | "Coordinator" | "Trainee") => {
        if (!currentUser || !training || !currentUser._id) return;

        try {
            const existingUserSignatures = training.signatures.filter(
                sig => sig.userId === currentUser._id && sig.role === role
            );

            if (existingUserSignatures.length > 0) {
                alert('You have already signed this training in this role');
                return;
            }

            if (currentUser.role === "Coordinator") {
                const hasSignedAsTrainer = training.signatures.some(
                    sig => sig.userId === currentUser._id && sig.role === "Trainer"
                );
                const hasSignedAsCoordinator = training.signatures.some(
                    sig => sig.userId === currentUser._id && sig.role === "Coordinator"
                );

                if (role === "Trainer" && hasSignedAsCoordinator) {
                    alert('You have already signed as Coordinator. You cannot sign as Trainer.');
                    return;
                }
                if (role === "Coordinator" && hasSignedAsTrainer) {
                    alert('You have already signed as Trainer. You cannot sign as Coordinator.');
                    return;
                }
            }

            const tempId = `temp-${Date.now()}`;
            const newSignature: ISignature = {
                userId: currentUser._id,
                userName: currentUser.name,
                role,
                signedAt: new Date(),
            };

            const updatedSignatures = [...training.signatures, { ...newSignature, _id: tempId }];

            const hasTrainer = updatedSignatures.some(sig => sig.role === 'Trainer');
            const hasCoordinator = updatedSignatures.some(sig => sig.role === 'Coordinator');
            const hasTrainee = updatedSignatures.some(sig => sig.role === 'Trainee');
            const signedOff = hasTrainer && hasCoordinator && hasTrainee;

            setTraining(prev => prev ? {
                ...prev,
                signatures: updatedSignatures,
                signedOff,
                updatedAt: new Date()
            } : null);

            const apiSignatures = updatedSignatures.map(sig => {
                const { _id, ...sigWithoutId } = sig;
                return sigWithoutId;
            });

            const updatePayload = {
                signatures: apiSignatures,
                signedOff: signedOff
            };

            const res = await fetch(`/api/trainings/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to add signature: ${res.status}`);
            }

            const serverUpdated = await res.json();
            setTraining(serverUpdated);

        } catch (err) {
            console.error('Failed to add signature:', err);
            fetchData();
            alert(err instanceof Error ? err.message : 'Failed to add signature');
        }
    };

    const canSign = (role: Role) => {
        if (!currentUser || !training) return false;

        const hasSigned = training.signatures.some(
            sig => sig.userId === currentUser._id && sig.role === role
        );
        if (hasSigned) return false;

        switch (role) {
            case "Trainee":
                return currentUser._id === training.user;

            case "Trainer":
                if (!["Trainer", "Coordinator"].includes(currentUser.role)) return false;

                if (currentUser.role === "Coordinator") {
                    const hasSignedAsCoordinator = training.signatures.some(
                        sig => sig.userId === currentUser._id && sig.role === "Coordinator"
                    );
                    return !hasSignedAsCoordinator;
                }
                return true;

            case "Coordinator":
                if (currentUser.role !== "Coordinator") return false;

                const hasSignedAsTrainer = training.signatures.some(
                    sig => sig.userId === currentUser._id && sig.role === "Trainer"
                );
                return !hasSignedAsTrainer;

            default:
                return false;
        }
    };

    const getCoordinatorSigningOptions = () => {
        if (!currentUser || currentUser.role !== "Coordinator") return [];

        const options = [];

        if (canSign("Trainer")) {
            options.push({ role: "Trainer", label: "Trainer", color: "blue" });
        }

        if (canSign("Coordinator")) {
            options.push({ role: "Coordinator", label: "Coordinator", color: "purple" });
        }

        return options;
    };

    const getSigningRequirements = () => {
        if (!training) return { trainer: false, coordinator: false, trainee: false };

        const signatures = training.signatures;

        return {
            trainer: signatures.some(sig => sig.role === "Trainer"),
            coordinator: signatures.some(sig => sig.role === "Coordinator"),
            trainee: signatures.some(sig => sig.role === "Trainee")
        };
    };

    const isFullySigned = () => {
        const requirements = getSigningRequirements();
        return requirements.trainer && requirements.coordinator && requirements.trainee;
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!confirm("Are you sure you want to delete this file?")) return;

        try {
            const res = await fetch(`/api/trainings/${params.id}/files/${fileId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete file");

            setFiles(files.filter(f => f._id !== fileId));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete file");
        }
    };

    const getProgressPercentage = () => {
        if (!training) return 0;
        let completed = 0;
        if (training.ojt) completed++;
        if (training.practical) completed++;
        if (isFullySigned()) completed++;
        return Math.round((completed / 3) * 100);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 text-lg font-medium">Loading training module...</p>
                </div>
            </div>
        );
    }

    if (error || !training) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="max-w-7xl mx-auto p-8">
                    <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-lg">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-red-600 font-semibold text-lg mb-6">{error || "Training not found"}</p>
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

    const progress = getProgressPercentage();
    const signingRequirements = getSigningRequirements();
    const fullySigned = isFullySigned();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
                    <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 p-8 lg:p-10 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
                        <div className="relative z-10">
                            <div className="flex items-start justify-between flex-wrap gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-4">
                                        <Shield className="w-4 h-4" />
                                        <span className="text-sm font-medium">NATA Certified Training</span>
                                    </div>
                                    <h1 className="text-4xl lg:text-5xl font-bold mb-3 leading-tight">
                                        {typeof training.module !== "string" ? training.module.name : "Unknown Module"}
                                    </h1>
                                    <p className="text-slate-200 text-lg mb-2">
                                        National Aviation Training Association Module
                                    </p>
                                    {typeof training.module !== "string" && training.module.description && (
                                        <p className="text-slate-300 max-w-3xl leading-relaxed">
                                            {training.module.description}
                                        </p>
                                    )}
                                </div>
                                {fullySigned && (
                                    <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 px-6 py-4 rounded-2xl flex items-center gap-3 border-2 border-white/30 shadow-2xl">
                                        <Award className="w-7 h-7 text-white" />
                                        <div>
                                            <div className="font-bold text-lg text-white">Certified</div>
                                            <div className="text-xs text-white/80">Fully Signed Off</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-8">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-slate-200">Training Completion</span>
                                    <span className="text-2xl font-bold">{progress}%</span>
                                </div>
                                <div className="w-full bg-white/10 backdrop-blur-sm rounded-full h-4 overflow-hidden border border-white/20">
                                    <div
                                        className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-700 shadow-lg relative"
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trainee Info */}
                    <div className="p-6 lg:p-8 bg-slate-50 border-t border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <User className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Trainee</p>
                                    <p className="font-bold text-slate-900 truncate">{trainingUser?.name}</p>
                                    <p className="text-sm text-slate-500">@{trainingUser?.username}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="p-3 bg-emerald-50 rounded-xl">
                                    <Calendar className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Started</p>
                                    <p className="font-bold text-slate-900">
                                        {training.createdAt
                                            ? new Date(training.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })
                                            : 'No date'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="p-3 bg-purple-50 rounded-xl">
                                    <Clock className="w-6 h-6 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Last Updated</p>
                                    <p className="font-bold text-slate-900">
                                        {training.updatedAt
                                            ? new Date(
                                                typeof training.updatedAt === 'string'
                                                    ? training.updatedAt
                                                    : training.updatedAt.toISOString()
                                            ).toLocaleDateString('en-US', {
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

                    {/* Collapsible Submodules Section */}
                    {modules?.submodules && modules?.submodules.length > 0 && (
                        <div className="border-t border-slate-200">
                            <button
                                onClick={() => setShowSubmodules(!showSubmodules)}
                                className="w-full px-6 lg:px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 rounded-lg">
                                        <ClipboardList className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div className="text-left">
                                        <span className="font-bold text-slate-900 block">Module Curriculum</span>
                                        <span className="text-sm text-slate-500">{modules.submodules.length} submodules included</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-500 group-hover:text-slate-700">
                                        {showSubmodules ? 'Hide' : 'Show'} Details
                                    </span>
                                    {showSubmodules ? (
                                        <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                                    )}
                                </div>
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${showSubmodules ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="px-6 lg:px-8 pb-8 pt-2 bg-slate-50">
                                    <div className="space-y-3">
                                        {modules?.submodules.map((submodule, index) => (
                                            <div
                                                key={submodule._id || index}
                                                className="p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-lg hover:border-purple-300 transition-all group"
                                            >
                                                <div className="flex items-start gap-5">
                                                    <div className="shrink-0 w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
                                                        {submodule.code}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-xl text-slate-900 mb-2">
                                                            {submodule.title}
                                                        </h3>
                                                        {submodule.description && (
                                                            <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                                                                {submodule.description}
                                                            </p>
                                                        )}
                                                        {submodule.requiresPractical && (
                                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold border border-amber-200">
                                                                <Award className="w-3.5 h-3.5" />
                                                                Practical Assessment Required
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                        {/* Training Requirements */}
                        <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">Training Requirements</h2>
                            </div>

                            <div className="space-y-4">
                                <div
                                    onClick={() => currentUser?.role !== "Trainee" && handleToggleCheckbox("ojt")}
                                    className={`p-6 rounded-2xl border-2 transition-all ${training.ojt
                                        ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300 shadow-md"
                                        : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:shadow-sm"
                                        } ${currentUser?.role !== "Trainee" ? "cursor-pointer" : ""}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${training.ojt
                                            ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200"
                                            : "bg-white border-slate-300"
                                            }`}>
                                            {training.ojt && <CheckCircle2 className="w-5 h-5 text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-slate-900 mb-2">
                                                On-the-Job Training (OJT)
                                            </h3>
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                Complete hands-on training under the direct supervision of a qualified trainer
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => currentUser?.role !== "Trainee" && handleToggleCheckbox("practical")}
                                    className={`p-6 rounded-2xl border-2 transition-all ${training.practical
                                        ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300 shadow-md"
                                        : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:shadow-sm"
                                        } ${currentUser?.role !== "Trainee" ? "cursor-pointer" : ""}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${training.practical
                                            ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200"
                                            : "bg-white border-slate-300"
                                            }`}>
                                            {training.practical && <CheckCircle2 className="w-5 h-5 text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-slate-900 mb-2">
                                                Practical Assessment
                                            </h3>
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                Demonstrate proficiency through comprehensive practical examination
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">Training Notes</h2>
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-48 p-5 border-2 border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 font-mono text-sm"
                                placeholder="Document trainee progress, performance observations, areas for improvement, and additional notes..."
                                disabled={currentUser?.role === "Trainee"}
                            />
                            {currentUser?.role !== "Trainee" && (
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={saving}
                                    className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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
                        <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border border-slate-200">
                            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 rounded-lg">
                                        <FileCheck className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900">Documents & Files</h2>
                                </div>
                                {currentUser?.role !== "Trainee" && (
                                    <label className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-700 cursor-pointer transition-all font-semibold shadow-lg hover:shadow-xl">
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
                                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-600 font-semibold text-lg">No files uploaded yet</p>
                                    <p className="text-sm text-slate-500 mt-2">Upload training materials, certificates, and documentation</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {files.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 hover:shadow-md group"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="p-3 bg-blue-100 rounded-xl">
                                                    <FileText className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-900 truncate">{file.fileName}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {file.fileType} • {new Date(file.createdAt).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <button
                                                    onClick={() => window.open(file.url, "_blank")}
                                                    className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                                    title="Download file"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>
                                                {currentUser?.role !== "Trainee" && (
                                                    <button
                                                        onClick={() => handleDeleteFile(file._id)}
                                                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
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

                    {/* Right Column - Signatures */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border border-slate-200 sticky top-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-50 rounded-lg">
                                    <Award className="w-6 h-6 text-purple-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">Certifications</h2>
                            </div>

                            {/* Signature Requirements */}
                            <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-slate-600" />
                                    Required Signatures
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                        <div className={`w-4 h-4 rounded-full ${signingRequirements.trainer ? 'bg-emerald-500' : 'bg-slate-300'} transition-colors`}></div>
                                        <span className={`font-medium ${signingRequirements.trainer ? 'text-emerald-700' : 'text-slate-600'}`}>
                                            Trainer Signature
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                        <div className={`w-4 h-4 rounded-full ${signingRequirements.coordinator ? 'bg-emerald-500' : 'bg-slate-300'} transition-colors`}></div>
                                        <span className={`font-medium ${signingRequirements.coordinator ? 'text-emerald-700' : 'text-slate-600'}`}>
                                            Coordinator Signature
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                        <div className={`w-4 h-4 rounded-full ${signingRequirements.trainee ? 'bg-emerald-500' : 'bg-slate-300'} transition-colors`}></div>
                                        <span className={`font-medium ${signingRequirements.trainee ? 'text-emerald-700' : 'text-slate-600'}`}>
                                            Trainee Acknowledgement
                                        </span>
                                    </div>
                                </div>

                                {/* Coordinator Restriction Notice */}
                                {currentUser?.role === "Coordinator" && (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-xs text-blue-700 leading-relaxed">
                                            <strong>Note:</strong> Coordinators may sign as either Trainer or Coordinator, but not both roles.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {training.signatures.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 mb-6">
                                    <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Award className="w-7 h-7 text-slate-400" />
                                    </div>
                                    <p className="text-slate-600 font-semibold">No signatures yet</p>
                                    <p className="text-sm text-slate-500 mt-1">Awaiting required signatures</p>
                                </div>
                            ) : (
                                <div className="space-y-3 mb-6">
                                    {training.signatures.map((sig) => (
                                        <div
                                            key={sig._id}
                                            className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-200 relative group hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="shrink-0 w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                                                    <CheckCircle2 className="w-6 h-6 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-900 truncate">{sig.userName}</p>
                                                    <p className="text-sm text-emerald-700 font-bold">{sig.role}</p>
                                                    <p className="text-xs text-slate-600 mt-1.5">
                                                        {new Date(sig.signedAt).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: 'numeric',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                {currentUser && sig._id && sig.userId === currentUser._id && (
                                                    <button
                                                        onClick={() => handleRemoveSignature(sig._id!)}
                                                        className="absolute top-3 right-3 p-1.5 text-red-500  rounded-lg  opacity-100 transition-all border border-red-200 hover:bg-red-300"
                                                        title="Remove your signature"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {currentUser && (
                                <div className="space-y-3 pt-6 border-t-2 border-slate-200">
                                    <p className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Sign as:</p>

                                    {/* Special handling for coordinators */}
                                    {currentUser.role === "Coordinator" ? (
                                        <div className="space-y-3">
                                            {getCoordinatorSigningOptions().map((option) => (
                                                <button
                                                    key={option.role}
                                                    onClick={() => handleSign(option.role as "Trainer" | "Coordinator")}
                                                    className={`w-full px-5 py-4 ${option.color === 'blue' 
                                                        ? 'bg-blue-600 hover:bg-blue-700' 
                                                        : 'bg-purple-600 hover:bg-purple-700'
                                                    } text-white rounded-xl transition-all font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                            {getCoordinatorSigningOptions().length === 0 && (
                                                <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
                                                    <p className="text-sm text-slate-600 font-medium">
                                                        You have already signed this module
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {canSign("Trainee") && (
                                                <button
                                                    onClick={() => handleSign("Trainee")}
                                                    className="w-full px-5 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                                                >
                                                    Trainee Acknowledgement
                                                </button>
                                            )}
                                            {canSign("Trainer") && (
                                                <button
                                                    onClick={() => handleSign("Trainer")}
                                                    className="w-full px-5 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                                                >
                                                    Trainer
                                                </button>
                                            )}
                                            {canSign("Coordinator") && (
                                                <button
                                                    onClick={() => handleSign("Coordinator")}
                                                    className="w-full px-5 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                                                >
                                                    Coordinator
                                                </button>
                                            )}
                                            {!canSign("Trainee") && !canSign("Trainer") && !canSign("Coordinator") && (
                                                <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
                                                    <p className="text-sm text-slate-600 font-medium">
                                                        You have already signed this module
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}