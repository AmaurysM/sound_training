"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
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

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Fetch current user
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                setUserLoading(true);
                const res = await fetch('/api/me');
                if (!res.ok) throw new Error("Failed to fetch current user");
                const userData = await res.json();
                setCurrentUser(userData);
            } catch (err) {
                console.error("Error fetching current user:", err);
            } finally {
                setUserLoading(false);
            }
        };
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        const fetchSubmodules = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/users/${userId}/modules/${moduleId}/submodules`);
                if (!res.ok) throw new Error("Failed to fetch submodules");
                const response = await res.json();
                setSubmodules(response.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSubmodules();
    }, [userId, moduleId]);

    const hasAllSignatures = (submodule: IUserSubmodule) => {
        const status = getSignatureStatus(submodule);
        return status.coordinator && status.trainer && status.trainee;
    };

    const filteredAndSortedSubmodules = useMemo(() => {
        let filtered = [...submodules];

        // Apply filters
        if (searchQuery) {
            filtered = filtered.filter(
                s =>
                    s.tSubmodule?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.tSubmodule?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.tSubmodule?.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (statusFilter === "completed") {
            filtered = filtered.filter(s => s.signedOff);
        } else if (statusFilter === "incomplete") {
            filtered = filtered.filter(s => !s.signedOff);
        }

        if (practicalFilter !== null) {
            filtered = filtered.filter(s => s.tSubmodule?.requiresPractical === practicalFilter);
        }

        // Apply sorting
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

    const hasRole = (sigs: ISignature[], role: string) =>
        sigs.some(s => typeof s.user !== "string" && s.user.role === role);

    const getSignatureStatus = (submodule: IUserSubmodule) => {
        const sigs = submodule.signatures || [];
        const coordinator = hasRole(sigs, "Coordinator");
        const trainer = hasRole(sigs, "Trainer");
        const trainee = hasRole(sigs, "Trainee");
        const count = [coordinator, trainer, trainee].filter(Boolean).length;
        return { coordinator, trainer, trainee, count };
    };


    const toggleField = async (submoduleId: string, field: "ojt" | "practical", current: boolean) => {
        try {
            const res = await fetch(`/api/users/${userId}/modules/${moduleId}/submodules/${submoduleId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: !current }),
            });
            if (!res.ok) throw new Error(`Failed to update ${field}`);

            const response = await res.json();
            setSubmodules(prev =>
                prev.map(s => (s._id === submoduleId ? response.data : s))
            );
        } catch (err) {
            console.error(err);
            alert(`Failed to update ${field}`);
        }
    };

    const openSignOffModal = async (submodule: IUserSubmodule) => {
        try {
            const res = await fetch(`/api/users/${userId}/modules/${moduleId}/submodules/${submodule._id}`);
            if (!res.ok) throw new Error("Failed to fetch submodule details");
            const response = await res.json();
            setSignOffModal({ open: true, submodule: response.data });
        } catch (err) {
            console.error(err);
            alert("Failed to load signature details");
        }
    };

    const closeSignOffModal = () => {
        setSignOffModal({ open: false, submodule: null });
    };

    const addSignature = async (role: "Coordinator" | "Trainer" | "Trainee") => {
        if (!signOffModal.submodule?._id) return;

        if (!currentUser) {
            alert("You must be logged in to sign off");
            return;
        }

        // Check if user's role matches the role they're trying to sign
        if (currentUser.role !== role) {
            alert(`You cannot sign as ${role}. Your role is ${currentUser.role}.`);
            return;
        }

        try {
            const currentSigs = signOffModal.submodule.signatures || [];

            // Check if user already signed this role
            const existingSig = currentSigs.find(sig => {
                if (typeof sig.user === "string") return false; // skip if user is just an ID
                return sig.user.role === role && sig.user._id === currentUser._id;
            });

            if (existingSig) {
                alert(`You have already signed as ${role} for this submodule.`);
                return;
            }


            // Ensure _id is undefined so Mongoose will create one automatically
            const newSig: ISignature = {
                user: currentUser._id,
                attachedTo: signOffModal.submodule._id,
                deleted: false,
                role: role
            };

            const updatedSigs = [...currentSigs, newSig];

            const res = await fetch(`/api/users/${userId}/modules/${moduleId}/submodules/${signOffModal.submodule._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signatures: updatedSigs }),
            });

            if (!res.ok) throw new Error("Failed to add signature");

            const response = await res.json();
            setSubmodules(prev =>
                prev.map(s => (s._id === signOffModal.submodule?._id ? response.data : s))
            );
            setSignOffModal({ open: true, submodule: response.data });
        } catch (err) {
            console.error(err);
            alert("Failed to add signature");
        }
    };

    const removeSignature = async (sigId: string) => {
        if (!signOffModal.submodule?._id) return;

        try {
            const updatedSigs = signOffModal.submodule.signatures.filter(s => s._id !== sigId);

            const res = await fetch(`/api/users/${userId}/modules/${moduleId}/submodules/${signOffModal.submodule._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signatures: updatedSigs }),
            });

            if (!res.ok) throw new Error("Failed to remove signature");

            const response = await res.json();
            setSubmodules(prev =>
                prev.map(s => (s._id === signOffModal.submodule?._id ? response.data : s))
            );
            setSignOffModal({ open: true, submodule: response.data });
        } catch (err) {
            console.error(err);
            alert("Failed to remove signature");
        }
    };

    const canUserSignRole = (role: "Coordinator" | "Trainer" | "Trainee") => {
        if (!currentUser) return false;

        switch (currentUser.role) {
            case "Coordinator":
                // Coordinators can sign as Coordinator or Trainer
                return role === "Coordinator" || role === "Trainer";
            case "Trainer":
                // Trainers can only sign as Trainer
                return role === "Trainer";
            case "Trainee":
                // Trainees can only sign as Trainee
                return role === "Trainee";
            default:
                return false;
        }
    };

    const hasUserSignedRole = (role: "Coordinator" | "Trainer" | "Trainee") => {
        if (!signOffModal.submodule || !currentUser) return false;

        return signOffModal.submodule.signatures?.some(sig => {
            if (typeof sig.user === "string") return false; // skip if just an ID
            return sig.user.role === role && sig.user._id === currentUser._id;
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
                {/* User Info Banner */}
                {currentUser && (
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Welcome, {currentUser.name}
                                </h2>
                                <p className="text-slate-600">
                                    Role: <span className="font-medium capitalize">{currentUser.role.toLowerCase()}</span>
                                    {currentUser.studentId && ` • Student ID: ${currentUser.studentId}`}
                                </p>
                            </div>
                            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                {currentUser.role}
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Cards - Stack on mobile */}
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
                                    {submodules.filter(s => s.signedOff).length}
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
                                    {submodules.filter(s => !s.signedOff).length}
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

                {/* Filters - Stack on mobile */}
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
                            const allSigned = hasAllSignatures(submodule);

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
                                                    {allSigned ? (
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
                                            className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${submodule.ojt
                                                ? "bg-green-100 text-green-800"
                                                : "bg-slate-100 text-slate-800"
                                                }`}
                                        >
                                            OJT: {submodule.ojt ? "✓" : "Pending"}
                                        </button>

                                        {submodule.tSubmodule?.requiresPractical ? (
                                            <button
                                                onClick={() => toggleField(submodule._id || "", "practical", submodule.practical)}
                                                className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${submodule.practical
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-slate-100 text-slate-800"
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
                                            const allSigned = hasAllSignatures(submodule);

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
                                                            className={`w-20 px-2 py-1 rounded-full text-xs font-medium transition-all ${submodule.ojt
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
                                                                className={`w-20 px-2 py-1 rounded-full text-xs font-medium transition-all ${submodule.practical
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
                                                        {allSigned ? (
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

            {/* Sign Off Modal - Updated with user-based signing */}
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
                            {(["Coordinator", "Trainer", "Trainee"] as const).map(role => {
                                const sig = signOffModal.submodule?.signatures.find(s =>
                                    typeof s.user !== "string" && s.user.role === role
                                );

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
                                                            className="text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium"
                                                        >
                                                            Remove My Signature
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                canSign && (
                                                    <button
                                                        onClick={() => addSignature(role)}
                                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors"
                                                    >
                                                        Sign as {currentUser?.name}
                                                    </button>
                                                )
                                            )}
                                        </div>

                                        {sig ? (
                                            <div className="text-sm text-slate-600">
                                                <p className="font-medium">
                                                    {typeof sig.user !== "string" ? sig.user.username : "Unknown User"}
                                                    {userHasSigned && " (You)"}
                                                </p>
                                                <p className="text-xs">
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


                            {hasAllSignatures(signOffModal.submodule) && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-green-600 mx-auto mb-2" />
                                    <p className="font-semibold text-green-900 text-sm sm:text-base">All signatures complete!</p>
                                    <p className="text-xs sm:text-sm text-green-700">This submodule is signed off.</p>
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