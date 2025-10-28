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

            // Ensure module and submodules are typed correctly
            const moduleData =
                typeof trainingData.module === "string"
                    ? { name: "Unknown Module", description: "", submodules: [] }
                    : trainingData.module;

            setTraining(trainingData);
            setNotes(trainingData.notes || "");
            setModules(moduleData); // ✅ module includes submodules already

            setTrainingUser(trainingData.user || null);

            console.log("Module:", moduleData);
            console.log("Submodules:", moduleData.submodules);

            // Fetch training files
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

        // ⚡ Check that currentUser exists
        if (!currentUser || !currentUser._id) {
            alert("You must be logged in to upload files");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("trainingId", params.id as string);

            // Append uploader info safely
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
            // Find the signature to remove
            const signatureToRemove = training.signatures.find(sig => sig._id === signatureId);
            if (!signatureToRemove) return;

            // Check if the current user can remove this signature
            if (signatureToRemove.userId !== currentUser._id) {
                alert('You can only remove your own signatures.');
                return;
            }

            if (!confirm('Are you sure you want to remove your signature?')) return;

            // Optimistic update: remove the signature
            const updatedSignatures = training.signatures.filter(sig => sig._id !== signatureId);

            // Recalculate signedOff status
            const hasTrainer = updatedSignatures.some(sig => sig.role === 'Trainer');
            const hasCoordinator = updatedSignatures.some(sig => sig.role === 'Coordinator');
            const hasTrainee = updatedSignatures.some(sig => sig.role === 'Trainee');
            const signedOff = hasTrainer && hasCoordinator && hasTrainee;

            // Update state optimistically
            setTraining(prev => prev ? {
                ...prev,
                signatures: updatedSignatures,
                signedOff,
                updatedAt: new Date() // <- Date object, not string
            } : null);


            // Prepare update payload for API
            const updatePayload = {
                signatures: updatedSignatures,
                signedOff: signedOff
            };

            // API call
            const res = await fetch(`/api/trainings/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to remove signature: ${res.status}`);
            }

            // Update with server data
            const serverUpdated = await res.json();
            setTraining(serverUpdated);

        } catch (err) {
            console.error('Failed to remove signature:', err);
            // Revert optimistic update on error
            fetchData();
            alert(err instanceof Error ? err.message : 'Failed to remove signature');
        }
    };

    const handleSign = async (role: "Trainer" | "Coordinator" | "Trainee") => {
        if (!currentUser || !training || !currentUser._id) return;


        try {
            // Prevent same user from signing multiple times for the same role
            const existingUserSignatures = training.signatures.filter(
                sig => sig.userId === currentUser._id && sig.role === role
            );

            if (existingUserSignatures.length > 0) {
                alert('You have already signed this training in this role');
                return;
            }

            // Prevent coordinator from signing both roles
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

            const tempId = `temp-${Date.now()}`; // Temporary ID for optimistic update only
            const newSignature: ISignature = {
                // tempId: tempId,
                userId: currentUser._id,
                userName: currentUser.name,
                role,
                signedAt: new Date(),
            };

            // Optimistic update with temp ID (for React key only)
            const updatedSignatures = [...training.signatures, { ...newSignature, _id: tempId }];

            // Check if all required signatures are present
            const hasTrainer = updatedSignatures.some(sig => sig.role === 'Trainer');
            const hasCoordinator = updatedSignatures.some(sig => sig.role === 'Coordinator');
            const hasTrainee = updatedSignatures.some(sig => sig.role === 'Trainee');
            const signedOff = hasTrainer && hasCoordinator && hasTrainee;


            // Update state optimistically
            setTraining(prev => prev ? {
                ...prev,
                signatures: updatedSignatures,
                signedOff,
                updatedAt: new Date()
            } : null);

            // Prepare update payload - remove temp IDs for API call
            const apiSignatures = updatedSignatures.map(sig => {
                const { _id, ...sigWithoutId } = sig;
                return sigWithoutId;
            });

            const updatePayload = {
                signatures: apiSignatures,
                signedOff: signedOff
            };

            // API call
            const res = await fetch(`/api/trainings/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to add signature: ${res.status}`);
            }

            // Update with server data to get proper IDs
            const serverUpdated = await res.json();
            setTraining(serverUpdated);

        } catch (err) {
            console.error('Failed to add signature:', err);
            // Revert optimistic update on error
            fetchData();
            alert(err instanceof Error ? err.message : 'Failed to add signature');
        }
    };

    // Updated canSign function with coordinator restrictions
    const canSign = (role: Role) => {
        if (!currentUser || !training) return false;

        // Check if user has already signed in this role
        const hasSigned = training.signatures.some(
            sig => sig.userId === currentUser._id && sig.role === role
        );
        if (hasSigned) return false;

        // Role-based permission checks with coordinator restrictions
        switch (role) {
            case "Trainee":
                // Only the trainee themselves can sign as trainee
                return currentUser._id === training.user;

            case "Trainer":
                // Trainers and Coordinators can sign as trainer, but coordinators can't sign both
                if (!["Trainer", "Coordinator"].includes(currentUser.role)) return false;

                // Coordinator restriction: can't sign as trainer if already signed as coordinator
                if (currentUser.role === "Coordinator") {
                    const hasSignedAsCoordinator = training.signatures.some(
                        sig => sig.userId === currentUser._id && sig.role === "Coordinator"
                    );
                    return !hasSignedAsCoordinator;
                }
                return true;

            case "Coordinator":
                // Only Coordinators can sign as coordinator
                if (currentUser.role !== "Coordinator") return false;

                // Coordinator restriction: can't sign as coordinator if already signed as trainer
                const hasSignedAsTrainer = training.signatures.some(
                    sig => sig.userId === currentUser._id && sig.role === "Trainer"
                );
                return !hasSignedAsTrainer;

            default:
                return false;
        }
    };

    // Helper function to get available signing options for coordinator
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

            // Remove file from state
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading training module...</p>
                </div>
            </div>
        );
    }

    if (error || !training) {
        return (
            <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
                <div className="max-w-7xl mx-auto p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <p className="text-red-600 font-semibold">{error || "Training not found"}</p>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Go Back
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
        <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
            <div className="max-w-7xl mx-auto p-6">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to Dashboard</span>
                </button>

                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6 border border-gray-100">
                    <div className="bg-linear-to-r from-blue-600 to-purple-600 p-8 text-white">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <h1 className="text-3xl font-bold">
                                        {typeof training.module !== "string" ? training.module.name : "Unknown Module"}
                                    </h1>
                                </div>
                                <p className="text-blue-100 text-lg mb-4">
                                    National Aviation Training Association (NATA) Module
                                </p>
                                {typeof training.module !== "string" && training.module.description && (
                                    <p className="text-blue-50 mb-4">{training.module.description}</p>
                                )}
                                {/* {training.module.description && (
                                    <p className="text-blue-50 mb-4">{training.module.description}</p>
                                )} */}
                            </div>
                            {fullySigned && (
                                <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full flex items-center gap-2 border border-white/30">
                                    <Award className="w-6 h-6" />
                                    <span className="font-semibold text-lg">Certified</span>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-100">Overall Progress</span>
                                <span className="text-sm font-bold">{progress}%</span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-green-500 h-full rounded-full transition-all duration-500 shadow-lg"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Trainee Info */}
                    <div className="p-6 bg-gray-50 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Trainee</p>
                                    <p className="font-semibold text-gray-900">{trainingUser?.name}</p>
                                    <p className="text-xs text-gray-500">@{trainingUser?.username}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <Calendar className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Started</p>
                                    <p className="font-semibold text-gray-900">
                                        {training.createdAt
                                            ? new Date(training.createdAt).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })
                                            : 'No date'}
                                    </p>

                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <Clock className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Last Updated</p>
                                    <p className="font-semibold text-gray-900">
                                        {training.updatedAt
                                            ? new Date(
                                                typeof training.updatedAt === 'string'
                                                    ? training.updatedAt
                                                    : training.updatedAt.toISOString()
                                            ).toLocaleDateString('en-US', {
                                                month: 'long',
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
                        <div className="border-t border-gray-200">
                            <button
                                onClick={() => setShowSubmodules(!showSubmodules)}
                                className="w-full px-8 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <ClipboardList className="w-5 h-5 text-purple-600" />
                                    <span className="font-semibold text-gray-900">
                                        Module Curriculum ({modules.submodules.length} submodules)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500 group-hover:text-gray-700">
                                        {showSubmodules ? 'Hide' : 'Show'}
                                    </span>
                                    {showSubmodules ? (
                                        <ChevronUp className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                                    )}
                                </div>
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${showSubmodules ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="px-8 pb-6 pt-2 bg-gradient-to-br from-gray-50 to-white">
                                    <div className="space-y-3">
                                        {modules?.submodules.map((submodule, index) => (
                                            <div
                                                key={submodule._id || index}
                                                className="p-5 bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-purple-300 transition-all group"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition-transform">
                                                        {submodule.code}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                                                            {submodule.title}
                                                        </h3>
                                                        {submodule.description && (
                                                            <p className="text-sm text-gray-600 mb-2">
                                                                {submodule.description}
                                                            </p>
                                                        )}
                                                        {submodule.requiresPractical && (
                                                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">
                                                                <Award className="w-3 h-3" />
                                                                Practical Required
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

                    {/* Training Requirements */}
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                            <h2 className="text-2xl font-bold text-gray-900">Training Requirements</h2>
                        </div>

                        <div className="space-y-4">
                            <div
                                onClick={() => currentUser?.role !== "Trainee" && handleToggleCheckbox("ojt")}
                                className={`p-5 rounded-xl border-2 transition-all ${training.ojt
                                    ? "bg-green-50 border-green-300"
                                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                    } ${currentUser?.role !== "Trainee" ? "cursor-pointer" : ""}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${training.ojt
                                        ? "bg-green-500 border-green-500"
                                        : "bg-white border-gray-300"
                                        }`}>
                                        {training.ojt && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                                            On-the-Job Training (OJT)
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Complete hands-on training under supervision of a qualified trainer
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div
                                onClick={() => currentUser?.role !== "Trainee" && handleToggleCheckbox("practical")}
                                className={`p-5 rounded-xl border-2 transition-all ${training.practical
                                    ? "bg-green-50 border-green-300"
                                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                    } ${currentUser?.role !== "Trainee" ? "cursor-pointer" : ""}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${training.practical
                                        ? "bg-green-500 border-green-500"
                                        : "bg-white border-gray-300"
                                        }`}>
                                        {training.practical && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                                            Practical Assessment
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Demonstrate proficiency through practical examination
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Training Requirements */}
                        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                            <div className="flex items-center gap-3 mb-6">
                                <ClipboardList className="w-6 h-6 text-blue-600" />
                                <h2 className="text-2xl font-bold text-gray-900">Training Requirements</h2>
                            </div>

                            <div className="space-y-4">
                                <div
                                    onClick={() => currentUser?.role !== "Trainee" && handleToggleCheckbox("ojt")}
                                    className={`p-5 rounded-xl border-2 transition-all ${training.ojt
                                        ? "bg-green-50 border-green-300"
                                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                        } ${currentUser?.role !== "Trainee" ? "cursor-pointer" : ""}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${training.ojt
                                            ? "bg-green-500 border-green-500"
                                            : "bg-white border-gray-300"
                                            }`}>
                                            {training.ojt && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg text-gray-900 mb-1">
                                                On-the-Job Training (OJT)
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Complete hands-on training under supervision of a qualified trainer
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => currentUser?.role !== "Trainee" && handleToggleCheckbox("practical")}
                                    className={`p-5 rounded-xl border-2 transition-all ${training.practical
                                        ? "bg-green-50 border-green-300"
                                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                        } ${currentUser?.role !== "Trainee" ? "cursor-pointer" : ""}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${training.practical
                                            ? "bg-green-500 border-green-500"
                                            : "bg-white border-gray-300"
                                            }`}>
                                            {training.practical && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg text-gray-900 mb-1">
                                                Practical Assessment
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Demonstrate proficiency through practical examination
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Training Notes</h2>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="Add detailed notes about the trainee's progress, areas of improvement, and observations..."
                                disabled={currentUser?.role === "Trainee"}
                            />
                            {currentUser?.role !== "Trainee" && (
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={saving}
                                    className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold disabled:opacity-50"
                                >
                                    <Save className="w-5 h-5" />
                                    {saving ? "Saving..." : "Save Notes"}
                                </button>
                            )}
                        </div>

                        {/* Files Section */}
                        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Documents & Files</h2>
                                {currentUser?.role !== "Trainee" && (
                                    <label className="flex items-center gap-2 px-5 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 cursor-pointer transition-all font-semibold shadow-md">
                                        <span>{uploading ? "Uploading..." : "Upload File"}</span>
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
                                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">No files uploaded yet</p>
                                    <p className="text-sm text-gray-400 mt-1">Upload training materials and documentation</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {files.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-blue-100 rounded-lg">
                                                    <FileText className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{file.fileName}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {file.fileType} • {new Date(file.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => window.open(file.url, "_blank")}
                                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>
                                                {currentUser?.role !== "Trainee" && (
                                                    <button
                                                        onClick={() => handleDeleteFile(file._id)}
                                                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
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
                        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 sticky top-6">
                            <div className="flex items-center gap-3 mb-6">
                                <Award className="w-6 h-6 text-purple-600" />
                                <h2 className="text-2xl font-bold text-gray-900">Certifications</h2>
                            </div>

                            {/* Signature Requirements */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-3">Signature Requirements</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${signingRequirements.trainer ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className={signingRequirements.trainer ? 'text-green-700 font-medium' : 'text-gray-600'}>
                                            Trainer Signature
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${signingRequirements.coordinator ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className={signingRequirements.coordinator ? 'text-green-700 font-medium' : 'text-gray-600'}>
                                            Coordinator Signature
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${signingRequirements.trainee ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className={signingRequirements.trainee ? 'text-green-700 font-medium' : 'text-gray-600'}>
                                            Trainee Acknowledgement
                                        </span>
                                    </div>
                                </div>

                                {/* Coordinator Restriction Notice */}
                                {currentUser?.role === "Coordinator" && (
                                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-xs text-blue-700 text-center">
                                            <strong>Note:</strong> As a coordinator, you can sign as either Trainer or Coordinator, but not both.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {training.signatures.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 mb-6">
                                    <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">No signatures yet</p>
                                    <p className="text-sm text-gray-400 mt-1">Awaiting required signatures</p>
                                </div>
                            ) : (
                                <div className="space-y-3 mb-6">
                                    {training.signatures.map((sig) => (
                                        <div
                                            key={sig._id}
                                            className="p-4 bg-linear-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 relative group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                                    <CheckCircle2 className="w-6 h-6 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900">{sig.userName}</p>
                                                    <p className="text-sm text-green-700 font-semibold">{sig.role}</p>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {new Date(sig.signedAt).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: 'numeric',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                {/* Delete button - only show if current user owns this signature */}
                                                {currentUser && sig._id && sig.userId === currentUser._id && (
                                                    <button
                                                        onClick={() => handleRemoveSignature(sig._id!)}
                                                        className="absolute top-3 right-3 p-1 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
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
                                <div className="space-y-3 pt-4 border-t border-gray-200">
                                    <p className="text-sm font-semibold text-gray-700 mb-3">Sign as:</p>

                                    {/* Special handling for coordinators */}
                                    {currentUser.role === "Coordinator" ? (
                                        <div className="space-y-3">
                                            {getCoordinatorSigningOptions().map((option) => (
                                                <button
                                                    key={option.role}
                                                    onClick={() => handleSign(option.role as "Trainer" | "Coordinator")}
                                                    className={`w-full px-4 py-3 bg-${option.color}-600 text-white rounded-xl hover:bg-${option.color}-700 transition-colors font-semibold shadow-md`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                            {getCoordinatorSigningOptions().length === 0 && (
                                                <p className="text-sm text-gray-500 text-center py-2">
                                                    You have already signed this module
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        /* Regular signing for non-coordinators */
                                        <>
                                            {canSign("Trainee") && (
                                                <button
                                                    onClick={() => handleSign("Trainee")}
                                                    className="w-full px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-700  font-semibold shadow-md"
                                                >
                                                    Trainee Acknowledgement
                                                </button>
                                            )}
                                            {canSign("Trainer") && (
                                                <button
                                                    onClick={() => handleSign("Trainer")}
                                                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-md"
                                                >
                                                    Trainer
                                                </button>
                                            )}
                                            {canSign("Coordinator") && (
                                                <button
                                                    onClick={() => handleSign("Coordinator")}
                                                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold shadow-md"
                                                >
                                                    Coordinator
                                                </button>
                                            )}
                                            {!canSign("Trainee") && !canSign("Trainer") && !canSign("Coordinator") && (
                                                <p className="text-sm text-gray-500 text-center py-2">
                                                    You have already signed this module
                                                </p>
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