// src/app/users/[userId]/modules/[moduleId]

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ClipboardList,
    Award,
    CheckCircle,
    Search,
    X,
    Users,
    ChevronUp,
    ChevronDown,
    Filter,
    ArrowLeft,
    Download,
} from "lucide-react";
import { ISignature, IUserSubmodule } from "@/models/types";

interface SortConfig {
    key: keyof IUserSubmodule | 'signatureStatus';
    direction: 'asc' | 'desc';
}

interface CurrentUser {
    _id: string;
    name: string;
    username: string;
    role: "Coordinator" | "Trainer" | "Trainee";
    studentId?: string;
}

export default function SubmodulesPage() {
    const { userId, moduleId } = useParams();
    const [submodules, setSubmodules] = useState<IUserSubmodule[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [userLoading, setUserLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "incomplete">("all");
    const [practicalFilter, setPracticalFilter] = useState<boolean | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'tSubmodule', direction: 'asc' });
    const [signOffModal, setSignOffModal] = useState<{ open: boolean; submodule: IUserSubmodule | null }>({
        open: false,
        submodule: null,
    });
    const [isMobile, setIsMobile] = useState(false);
    const [isSignatureLoading, setIsSignatureLoading] = useState(false);
    const [moduleOwner, setModuleOwner] = useState<{ name: string; username: string; studentId?: string } | null>(null);

    const router = useRouter();

    // ✅ FIXED: Fetch current user with abort controller
    useEffect(() => {
        const abortController = new AbortController();

        const fetchCurrentUser = async () => {
            try {
                setUserLoading(true);
                const res = await fetch('/api/me', {
                    signal: abortController.signal
                });

                if (!res.ok) throw new Error("Failed to fetch current user");
                const userData = await res.json();
                setCurrentUser(userData);
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    console.log('Fetch aborted');
                    return;
                }
                console.error("Error fetching current user:", err);
            } finally {
                if (!abortController.signal.aborted) {
                    setUserLoading(false);
                }
            }
        };

        fetchCurrentUser();

        return () => {
            abortController.abort();
        };
    }, []);

    // ✅ Fetch module owner information
    useEffect(() => {
        const abortController = new AbortController();

        const fetchModuleOwner = async () => {
            try {
                const res = await fetch(`/api/users/${userId}`, {
                    signal: abortController.signal
                });

                if (!res.ok) throw new Error("Failed to fetch user details");
                const userData = await res.json();
                setModuleOwner({
                    name: userData.name,
                    username: userData.username,
                    studentId: userData.studentId
                });
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    return;
                }
                console.error("Error fetching module owner:", err);
            }
        };

        if (userId) {
            fetchModuleOwner();
        }

        return () => {
            abortController.abort();
        };
    }, [userId]);

    // ✅ FIXED: Fetch submodules with abort controller
    useEffect(() => {
        const abortController = new AbortController();

        const fetchSubmodules = async () => {
            try {
                setLoading(true);
                const res = await fetch(
                    `/api/users/${userId}/modules/${moduleId}/submodules`,
                    { signal: abortController.signal }
                );

                console.log("We got something from the api. ", res)

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || "Failed to fetch submodules");
                }

                const response = await res.json();
                console.log(response)

                if (!response.data || !Array.isArray(response.data)) {
                    console.error("Invalid data format received:", response);
                    setSubmodules([]);
                } else {
                    setSubmodules(response.data);
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    console.log('Fetch aborted');
                    return;
                }
                console.error("Error fetching submodules:", err);
                alert(err instanceof Error ? err.message : "Failed to load submodules");
                setSubmodules([]);
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        if (userId && moduleId) {
            fetchSubmodules();
        }

        return () => {
            abortController.abort();
        };
    }, [userId, moduleId]);

    // ✅ CSV Download Function
    const downloadCSV = () => {
        if (submodules.length === 0) {
            alert("No data to download");
            return;
        }

        // CSV Headers
        const headers = [
            "Submodule Code",
            "Submodule Title",
            "Submodule Description",
            "Type",
            "OJT Status",
            "Practical Status",
            "Practical Required",
            "Completion Status",
            "Coordinator Signed By",
            "Coordinator Signed At",
            "Trainer Signed By",
            "Trainer Signed At",
            "Trainee Signed By",
            "Trainee Signed At",
            "Total Signatures",
        ];

        // Build CSV rows
        const rows = submodules.map(submodule => {
            const signatureStatus = getSignatureStatus(submodule);
            const isComplete = isSubmoduleComplete(submodule);
            
            // Find signatures by role
            const coordSig = submodule.signatures?.find(s => s.role === "Coordinator");
            const trainerSig = submodule.signatures?.find(s => s.role === "Trainer");
            const traineeSig = submodule.signatures?.find(s => s.role === "Trainee");

            const getSignerName = (sig: ISignature | undefined) => {
                if (!sig) return "";
                if (typeof sig.user === "string") return "Unknown User";
                return sig.user.name || sig.user.username || "Unknown User";
            };

            const getSignedDate = (sig: ISignature | undefined) => {
                if (!sig || !sig.createdAt) return "";
                return new Date(sig.createdAt).toLocaleString();
            };

            return [
                submodule.tSubmodule?.code || "",
                submodule.tSubmodule?.title || "",
                (submodule.tSubmodule?.description || "").replace(/"/g, '""'), // Escape quotes
                submodule.tSubmodule?.requiresPractical ? "Practical" : "Theory",
                submodule.ojt ? "Completed" : "Pending",
                submodule.tSubmodule?.requiresPractical 
                    ? (submodule.practical ? "Completed" : "Pending")
                    : "N/A",
                submodule.tSubmodule?.requiresPractical ? "Yes" : "No",
                isComplete ? "Complete" : "In Progress",
                getSignerName(coordSig),
                getSignedDate(coordSig),
                getSignerName(trainerSig),
                getSignedDate(trainerSig),
                getSignerName(traineeSig),
                getSignedDate(traineeSig),
                `${signatureStatus.count}/3`,
            ];
        });

        // Combine headers and rows
        const csvContent = [
            headers.map(h => `"${h}"`).join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        // Create blob and download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `submodules_${moduleOwner?.username || userId}_${timestamp}.csv`;
        
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ✅ FIXED: openSignOffModal with abort controller
    const openSignOffModal = async (submodule: IUserSubmodule) => {
        try {
            const res = await fetch(
                `/api/users/${userId}/modules/${moduleId}/submodules/${submodule._id}`
            );

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to fetch submodule details");
            }

            const response = await res.json();

            if (!response.data) {
                throw new Error("No submodule data received");
            }

            setSignOffModal({ open: true, submodule: response.data });
        } catch (err) {
            console.error("Error loading signature details:", err);
            alert(err instanceof Error ? err.message : "Failed to load signature details");
        }
    };

    // FIXED: Updated completion logic to check OJT, signatures, and practical (if required)
    const isSubmoduleComplete = (submodule: IUserSubmodule) => {
        if (!submodule.ojt) return false;

        const status = getSignatureStatus(submodule);
        if (!status.coordinator || !status.trainer || !status.trainee) return false;

        if (submodule.tSubmodule?.requiresPractical && !submodule.practical) return false;

        return true;
    };

    const hasAllSignatures = (submodule: IUserSubmodule) => {
        const status = getSignatureStatus(submodule);
        return status.coordinator && status.trainer && status.trainee;
    };

    const filteredAndSortedSubmodules = useMemo(() => {
        let filtered = [...submodules];

        if (searchQuery) {
            filtered = filtered.filter(
                s =>
                    s.tSubmodule?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.tSubmodule?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.tSubmodule?.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (statusFilter === "completed") {
            filtered = filtered.filter(s => isSubmoduleComplete(s));
        } else if (statusFilter === "incomplete") {
            filtered = filtered.filter(s => !isSubmoduleComplete(s));
        }

        if (practicalFilter !== null) {
            filtered = filtered.filter(s => s.tSubmodule?.requiresPractical === practicalFilter);
        }

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let aValue: any = a[sortConfig.key as keyof IUserSubmodule];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let bValue: any = b[sortConfig.key as keyof IUserSubmodule];

                if (sortConfig.key === 'signatureStatus') {
                    aValue = hasAllSignatures(a) ? 2 : getSignatureStatus(a).count;
                    bValue = hasAllSignatures(b) ? 2 : getSignatureStatus(b).count;
                } else if (sortConfig.key === 'tSubmodule') {
                    aValue = a.tSubmodule?.code || '';
                    bValue = b.tSubmodule?.code || '';
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [submodules, searchQuery, statusFilter, practicalFilter, sortConfig]);

    const handleSort = (key: SortConfig['key']) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const canEditFields = () => {
        if (!currentUser) return false;
        const isViewingOwnModules = currentUser._id === userId;
        if (currentUser.role === "Trainee") return false;
        return !isViewingOwnModules;
    };

    const toggleField = async (submoduleId: string, field: "ojt" | "practical", current: boolean) => {
        if (!canEditFields()) {
            alert("You don't have permission to edit this field");
            return;
        }

        try {
            const res = await fetch(`/api/users/${userId}/modules/${moduleId}/submodules/${submoduleId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: !current }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Failed to update ${field}`);
            }

            const response = await res.json();
            setSubmodules(prev =>
                prev.map(s => (s._id === submoduleId ? response.data : s))
            );
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : `Failed to update ${field}`);
        }
    };

    const closeSignOffModal = () => {
        setSignOffModal({ open: false, submodule: null });
    };

    const removeSignature = async (sigId: string) => {
        if (!signOffModal.submodule?._id) return;

        if (!confirm("Are you sure you want to remove this signature?")) {
            return;
        }

        try {
            setIsSignatureLoading(true);
            const res = await fetch(`/api/signature/${sigId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to remove signature");
            }

            setSubmodules(prev =>
                prev.map(s => {
                    if (s._id === signOffModal.submodule?._id) {
                        return {
                            ...s,
                            signatures: s.signatures.filter(sig => sig._id !== sigId),
                        };
                    }
                    return s;
                })
            );

            setSignOffModal(prev => {
                if (!prev.submodule) return prev;
                return {
                    ...prev,
                    submodule: {
                        ...prev.submodule,
                        signatures: prev.submodule.signatures.filter(sig => sig._id !== sigId),
                    },
                };
            });
        } catch (err) {
            console.error("Error removing signature:", err);
            alert(err instanceof Error ? err.message : "Failed to remove signature");
        } finally {
            setIsSignatureLoading(false);
        }
    };

    const hasCurrentUserSigned = () => {
        if (!signOffModal.submodule || !currentUser) return false;

        return signOffModal.submodule.signatures?.some(sig => {
            if (typeof sig.user === "string") return false;
            return sig.user._id === currentUser._id;
        }) ?? false;
    };

    const hasRole = (sigs: ISignature[], role: string) =>
        sigs.some(s => s.role === role);

    const getSignatureStatus = (submodule: IUserSubmodule) => {
        const sigs = submodule.signatures || [];
        const coordinator = sigs.some(s => s.role === "Coordinator");
        const trainer = sigs.some(s => s.role === "Trainer");
        const trainee = sigs.some(s => s.role === "Trainee");
        const count = [coordinator, trainer, trainee].filter(Boolean).length;
        return { coordinator, trainer, trainee, count };
    };

    const getSignedRoles = () => {
        if (!signOffModal.submodule) return { coordinator: false, trainer: false, trainee: false };

        const sigs = signOffModal.submodule.signatures || [];
        return {
            coordinator: sigs.some(sig => sig.role === "Coordinator"),
            trainer: sigs.some(sig => sig.role === "Trainer"),
            trainee: sigs.some(sig => sig.role === "Trainee"),
        };
    };

    const canUserSignRole = (role: "Coordinator" | "Trainer" | "Trainee") => {
        if (!currentUser) return false;

        const isViewingOwnModules = currentUser._id === userId;
        const signedRoles = getSignedRoles();
        const userHasAlreadySigned = hasCurrentUserSigned();

        if (isViewingOwnModules) {
            return role === "Trainee" && !signedRoles.trainee;
        }

        switch (currentUser.role) {
            case "Coordinator":
                if (role === "Coordinator") {
                    return !signedRoles.coordinator && !userHasAlreadySigned;
                }
                if (role === "Trainer") {
                    return !signedRoles.trainer && !userHasAlreadySigned;
                }
                return false;

            case "Trainer":
                if (role === "Trainer") {
                    return !signedRoles.trainer && !userHasAlreadySigned;
                }
                return false;

            case "Trainee":
                return false;

            default:
                return false;
        }
    };

    const addSignature = async (role: "Coordinator" | "Trainer" | "Trainee") => {
        if (!signOffModal.submodule?._id) return;

        if (!currentUser) {
            alert("You must be logged in to sign off");
            return;
        }

        if (!canUserSignRole(role)) {
            alert(`You cannot sign as ${role}.`);
            return;
        }

        try {
            setIsSignatureLoading(true);
            const res = await fetch(
                `/api/users/${userId}/modules/${moduleId}/submodules/${signOffModal.submodule._id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        addSignature: {
                            userId: currentUser._id,
                            signAsRole: role
                        }
                    }),
                }
            );

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to add signature");
            }

            const response = await res.json();

            if (!response.data) {
                throw new Error("Invalid response data");
            }

            setSubmodules(prev =>
                prev.map(s => (s._id === signOffModal.submodule?._id ? response.data : s))
            );
            setSignOffModal({ open: true, submodule: response.data });
        } catch (err) {
            console.error("Error adding signature:", err);
            alert(err instanceof Error ? err.message : "Failed to add signature");
        } finally {
            setIsSignatureLoading(false);
        }
    };

    const hasUserSignedRole = (role: "Coordinator" | "Trainer" | "Trainee") => {
        if (!signOffModal.submodule || !currentUser) return false;

        return signOffModal.submodule.signatures?.some(sig => {
            if (typeof sig.user === "string") return false;
            return sig.role === role && sig.user._id === currentUser._id;
        }) ?? false;
    };

    const SortableHeader = ({
        children,
        sortKey,
        className = ""
    }: {
        children: React.ReactNode;
        sortKey: SortConfig['key'];
        className?: string;
    }) => (
        <th
            className={`p-2 md:p-3 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors ${className}`}
            onClick={() => handleSort(sortKey)}
        >
            <div className="flex items-center gap-1 text-xs md:text-sm">
                {children}
                {sortConfig.key === sortKey && (
                    sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 md:w-4 md:h-4" /> : <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
                )}
            </div>
        </th>
    );

    if (loading || userLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Loading submodules...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all border border-slate-200 bg-white shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-medium">Back to Modules</span>
                    </button>

                    <button
                        onClick={downloadCSV}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Download CSV</span>
                        <span className="sm:hidden">CSV</span>
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                    <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs md:text-sm text-slate-600 font-medium truncate">Total</p>
                                <p className="text-lg md:text-xl font-bold text-slate-900 truncate">{submodules.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs md:text-sm text-slate-600 font-medium truncate">Completed</p>
                                <p className="text-lg md:text-xl font-bold text-green-600 truncate">
                                    {submodules.filter(s => isSubmoduleComplete(s)).length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Award className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs md:text-sm text-slate-600 font-medium truncate">Remaining</p>
                                <p className="text-lg md:text-xl font-bold text-amber-600 truncate">
                                    {submodules.filter(s => !isSubmoduleComplete(s)).length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Filter className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs md:text-sm text-slate-600 font-medium truncate">Showing</p>
                                <p className="text-lg md:text-xl font-bold text-purple-600 truncate">
                                    {filteredAndSortedSubmodules.length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 md:p-4 mb-4 md:mb-6">
                    <div className="flex flex-col gap-3">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search submodules..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 md:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm md:text-base"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                value={statusFilter}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="flex-1 px-3 py-2.5 md:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white text-sm"
                            >
                                <option value="all">All Status</option>
                                <option value="completed">Completed</option>
                                <option value="incomplete">Incomplete</option>
                            </select>

                            <select
                                value={practicalFilter === null ? "all" : practicalFilter.toString()}
                                onChange={e => setPracticalFilter(e.target.value === "all" ? null : e.target.value === "true")}
                                className="flex-1 px-3 py-2.5 md:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white text-sm"
                            >
                                <option value="all">All Types</option>
                                <option value="true">Practical Required</option>
                                <option value="false">No Practical</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Mobile Card View */}
                {isMobile ? (
                    <div className="space-y-3">
                        {filteredAndSortedSubmodules.map((submodule) => {
                            const signatureStatus = getSignatureStatus(submodule);
                            const isComplete = isSubmoduleComplete(submodule);

                            return (
                                <div key={submodule._id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                                                {submodule.tSubmodule?.code}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                                                    {submodule.tSubmodule?.title}
                                                </h3>
                                                <div className="flex items-center gap-1 mt-1">
                                                    {submodule.tSubmodule?.requiresPractical ? (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">
                                                            <Award className="w-3 h-3" />
                                                            Practical
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-xs">
                                                            Theory
                                                        </span>
                                                    )}
                                                    {isComplete ? (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Complete
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">
                                                            In Progress
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <button
                                            onClick={() => toggleField(submodule._id || "", "ojt", submodule.ojt)}
                                            disabled={!canEditFields()}
                                            className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${!canEditFields()
                                                ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                                                : submodule.ojt
                                                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                                                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                                                }`}
                                        >
                                            OJT: {submodule.ojt ? "✓" : "Pending"}
                                        </button>

                                        {submodule.tSubmodule?.requiresPractical ? (
                                            <button
                                                onClick={() => toggleField(submodule._id || "", "practical", submodule.practical)}
                                                disabled={!canEditFields()}
                                                className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${!canEditFields()
                                                    ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                                                    : submodule.practical
                                                        ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                                                    }`}
                                            >
                                                Practical: {submodule.practical ? "✓" : "Pending"}
                                            </button>
                                        ) : (
                                            <div className="px-2 py-1.5 rounded text-xs text-slate-500 bg-slate-50">
                                                Practical: N/A
                                            </div>
                                        )}
                                    </div>

                                    {/* Signatures */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-1">
                                                {['Coordinator', 'Trainer', 'Trainee'].map((role) => (
                                                    <div
                                                        key={role}
                                                        className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs ${signatureStatus[role.toLowerCase() as keyof typeof signatureStatus]
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-slate-300 text-slate-600'
                                                            }`}
                                                        title={role}
                                                    >
                                                        {role.charAt(0)}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-xs text-slate-600">
                                                {signatureStatus.count}/3
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <button
                                        onClick={() => openSignOffModal(submodule)}
                                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Users className="w-4 h-4" />
                                        Manage Signatures
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Desktop Table View */
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        {filteredAndSortedSubmodules.length === 0 ? (
                            <div className="p-8 md:p-12 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">No submodules found</h3>
                                <p className="text-slate-600">Try adjusting your search or filters</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <SortableHeader sortKey="tSubmodule" className="w-20">Code</SortableHeader>
                                            <SortableHeader sortKey="tSubmodule">Title</SortableHeader>
                                            <th className="p-2 md:p-3 text-left font-semibold text-slate-700 w-32 text-xs md:text-sm">Type</th>
                                            <SortableHeader sortKey="ojt" className="w-24">OJT</SortableHeader>
                                            <SortableHeader sortKey="practical" className="w-24">Practical</SortableHeader>
                                            <SortableHeader sortKey="signatureStatus" className="w-32">Signatures</SortableHeader>
                                            <SortableHeader sortKey="signedOff" className="w-32">Status</SortableHeader>
                                            <th className="p-2 md:p-3 text-left font-semibold text-slate-700 w-24 text-xs md:text-sm">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {filteredAndSortedSubmodules.map((submodule) => {
                                            const signatureStatus = getSignatureStatus(submodule);
                                            const isComplete = isSubmoduleComplete(submodule);

                                            return (
                                                <tr key={submodule._id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-2 md:p-3">
                                                        <div className="font-mono font-bold text-blue-600 text-sm">
                                                            {submodule.tSubmodule?.code}
                                                        </div>
                                                    </td>
                                                    <td className="p-2 md:p-3">
                                                        <div className="font-medium text-slate-900 text-sm">{submodule.tSubmodule?.title}</div>
                                                        {submodule.tSubmodule?.description && (
                                                            <div className="text-sm text-slate-600 mt-1 line-clamp-2 hidden lg:block">
                                                                {submodule.tSubmodule?.description}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2 md:p-3">
                                                        {submodule.tSubmodule?.requiresPractical ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                                                                <Award className="w-3 h-3" />
                                                                Practical
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-medium">
                                                                Theory
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 md:p-3">
                                                        <button
                                                            onClick={() => toggleField(submodule._id || "", "ojt", submodule.ojt)}
                                                            disabled={!canEditFields()}
                                                            className={`w-20 px-2 py-1 rounded-full text-xs font-medium transition-all ${!canEditFields()
                                                                ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                                                                : submodule.ojt
                                                                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                                                                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                                                                }`}
                                                        >
                                                            {submodule.ojt ? "Completed" : "Pending"}
                                                        </button>
                                                    </td>
                                                    <td className="p-2 md:p-3">
                                                        {submodule.tSubmodule?.requiresPractical ? (
                                                            <button
                                                                onClick={() => toggleField(submodule._id || "", "practical", submodule.practical)}
                                                                disabled={!canEditFields()}
                                                                className={`w-20 px-2 py-1 rounded-full text-xs font-medium transition-all ${!canEditFields()
                                                                    ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                                                                    : submodule.practical
                                                                        ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                                                                    }`}
                                                            >
                                                                {submodule.practical ? "Completed" : "Pending"}
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 md:p-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex -space-x-1">
                                                                {['Coordinator', 'Trainer', 'Trainee'].map((role) => (
                                                                    <div
                                                                        key={role}
                                                                        className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white flex items-center justify-center text-xs ${signatureStatus[role.toLowerCase() as keyof typeof signatureStatus]
                                                                            ? 'bg-green-500 text-white'
                                                                            : 'bg-slate-300 text-slate-600'
                                                                            }`}
                                                                        title={role}
                                                                    >
                                                                        {role.charAt(0)}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <span className="text-xs text-slate-600">
                                                                {signatureStatus.count}/3
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 md:p-3">
                                                        {isComplete ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Complete
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                                                                In Progress
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 md:p-3">
                                                        <button
                                                            onClick={() => openSignOffModal(submodule)}
                                                            className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <Users className="w-3 h-3 md:w-4 md:h-4" />
                                                            Sign
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sign Off Modal */}
            {signOffModal.open && signOffModal.submodule && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-2">
                        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 truncate">
                                    Sign Off: {signOffModal.submodule.tSubmodule?.title}
                                </h2>
                                <p className="text-sm text-slate-600 mt-1">All three signatures required for completion</p>
                                {currentUser && (
                                    <p className="text-xs text-blue-600 mt-1">
                                        You are signed in as: {currentUser.name} ({currentUser.role})
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={closeSignOffModal}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0 ml-2"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                            {isSignatureLoading && (
                                <div className="flex items-center justify-center py-4">
                                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                </div>
                            )}

                            {(["Coordinator", "Trainer", "Trainee"] as const).map(role => {
                                const sig = signOffModal.submodule?.signatures.find(s => s.role === role);

                                const canSign = canUserSignRole(role);
                                const userHasSigned = hasUserSignedRole(role);

                                return (
                                    <div key={role} className="border border-slate-200 rounded-lg p-3 sm:p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{role}</h3>
                                            {sig ? (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                                    {userHasSigned && (
                                                        <button
                                                            onClick={() => removeSignature(sig._id ? sig._id : "")}
                                                            disabled={isSignatureLoading}
                                                            className={`text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium ${isSignatureLoading ? 'opacity-50 cursor-not-allowed' : ''
                                                                }`}
                                                        >
                                                            Remove My Signature
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                canSign && (
                                                    <button
                                                        onClick={() => addSignature(role)}
                                                        disabled={isSignatureLoading}
                                                        className={`px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors ${isSignatureLoading ? 'opacity-50 cursor-not-allowed' : ''
                                                            }`}
                                                    >
                                                        Sign as {currentUser?.name}
                                                    </button>
                                                )
                                            )}
                                        </div>

                                        {sig ? (
                                            <div className="text-sm text-slate-600">
                                                <p className="font-medium">
                                                    {typeof sig.user !== "string"
                                                        ? `${sig.user.name || sig.user.username}${userHasSigned ? " (You)" : ""}`
                                                        : "Unknown User"}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Signed: {sig.createdAt ? new Date(sig.createdAt).toLocaleString() : "Unknown Date"}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-600">
                                                {canSign ? (
                                                    <p className="text-amber-600">Waiting for your signature</p>
                                                ) : (
                                                    <p className="text-slate-500 italic">Not signed</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {isSubmoduleComplete(signOffModal.submodule) ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-green-600 mx-auto mb-2" />
                                    <p className="font-semibold text-green-900 text-sm sm:text-base">All requirements complete!</p>
                                    <p className="text-xs sm:text-sm text-green-700">This submodule is fully signed off.</p>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <p className="font-semibold text-amber-900 text-sm mb-2">Completion Requirements:</p>
                                    <ul className="text-xs sm:text-sm text-amber-800 space-y-1">
                                        <li className="flex items-center gap-2">
                                            {signOffModal.submodule.ojt ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <X className="w-4 h-4 text-amber-600" />
                                            )}
                                            OJT Completion
                                        </li>
                                        {signOffModal.submodule.tSubmodule?.requiresPractical && (
                                            <li className="flex items-center gap-2">
                                                {signOffModal.submodule.practical ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <X className="w-4 h-4 text-amber-600" />
                                                )}
                                                Practical Completion
                                            </li>
                                        )}
                                        <li className="flex items-center gap-2">
                                            {getSignatureStatus(signOffModal.submodule).count === 3 ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <X className="w-4 h-4 text-amber-600" />
                                            )}
                                            All 3 Signatures ({getSignatureStatus(signOffModal.submodule).count}/3)
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button
                                onClick={closeSignOffModal}
                                className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors text-sm sm:text-base"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}