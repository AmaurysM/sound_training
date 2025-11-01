import { Search, Filter, Plus, FileText, History, X, MessageSquare, Save, Archive, AlertCircle } from "lucide-react";
import { IUser, IUserModule, IUserSubmodule, Stat } from "@/models/types";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TrainingModulesView = ({
    currentUser,
    viewedUser,
    trainingData = [],
    setShowAddModal,
    loadingModules,
    fetchModules,
    stats,
    setTrainingData,
    setSelectedTraining,
    setShowHistoryModal,
    setSaving,
    setError,
    error,
    setOriginalData,
    setSaveSuccess,
    saving,
    isArchived = false
}: {
    currentUser: IUser
    viewedUser: IUser
    trainingData: IUserModule[]
    setShowAddModal: (show: boolean) => void
    loadingModules: boolean
    fetchModules: () => Promise<void>
    stats: Stat
    setTrainingData: React.Dispatch<React.SetStateAction<IUserModule[]>>
    setSelectedTraining: React.Dispatch<React.SetStateAction<IUserModule | null>>
    setShowHistoryModal: React.Dispatch<React.SetStateAction<boolean>>
    setSaving: React.Dispatch<React.SetStateAction<boolean>>
    setError: React.Dispatch<React.SetStateAction<string | null>>
    error: string | null
    setOriginalData: React.Dispatch<React.SetStateAction<IUserModule[]>>
    setSaveSuccess: React.Dispatch<React.SetStateAction<boolean>>
    saving: boolean
    isArchived?: boolean
}) => {
    const router = useRouter();

    const isEditable = currentUser && (currentUser.role === 'Coordinator' || currentUser.role === 'Trainer');
    const isCoordinator = currentUser?.role === 'Coordinator';
    const isTrainee = currentUser?.role === 'Trainee';
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress' | 'not-started'>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);
    const [noteText, setNoteText] = useState('');

    const isSubmoduleComplete = (submodule: IUserSubmodule) => {
        if (!submodule.ojt) return false;

        const sigs = submodule.signatures || [];
        const hasCoordinator = sigs.some(s => s.role === "Coordinator");
        const hasTrainer = sigs.some(s => s.role === "Trainer");
        const hasTrainee = sigs.some(s => s.role === "Trainee");

        if (!hasCoordinator || !hasTrainer || !hasTrainee) return false;

        if (submodule.tSubmodule && typeof submodule.tSubmodule !== "string") {
            if (submodule.tSubmodule.requiresPractical && !submodule.practical) {
                return false;
            }
        }

        return true;
    };

    const getFilteredTrainingData = () => {
        let filtered = trainingData;

        if (searchQuery) {
            filtered = filtered.filter(m => {
                const moduleName =
                    typeof m.tModule !== "string" ? m.tModule?.name ?? "" : "";
                const notes = m.notes?.toLowerCase() ?? "";
                return (
                    moduleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    notes.includes(searchQuery.toLowerCase())
                );
            });
        }

        if (filterStatus !== "all") {
            filtered = filtered.filter(m => {
                const submodules = m.submodules || [];

                const populatedSubmodules = submodules.filter(
                    (s): s is IUserSubmodule => typeof s !== "string"
                );

                const totalSubmodules = populatedSubmodules.length;
                const completedSubmodules = populatedSubmodules.filter(s => isSubmoduleComplete(s)).length;

                if (filterStatus === "completed") {
                    return totalSubmodules > 0 && completedSubmodules === totalSubmodules;
                } else if (filterStatus === "in-progress") {
                    return completedSubmodules > 0 && completedSubmodules < totalSubmodules;
                } else if (filterStatus === "not-started") {
                    return completedSubmodules === 0;
                }
                return true;
            });
        }

        return filtered;
    };

    const filteredData = getFilteredTrainingData();

    const handleOpenNoteModal = (index: number) => {
        const mod = filteredData[index];
        const actualIndex = trainingData.indexOf(mod);
        setSelectedNoteIndex(actualIndex);
        setNoteText(mod.notes || '');
        setShowNoteModal(true);
    };

    const handleSaveNote = async () => {
        if (selectedNoteIndex === null) return;

        const mod = trainingData[selectedNoteIndex];
        if (!mod._id) return;

        try {
            setSaving(true);

            const res = await fetch(`/api/users/${viewedUser._id}/modules/${mod._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: noteText }),
            });

            if (!res.ok) throw new Error('Failed to save note');

            const response = await res.json();
            const updated = response.data || response;

            setTrainingData((prev) => {
                const newData = [...prev];
                newData[selectedNoteIndex] = updated;
                return newData;
            });
            setOriginalData((prev) => {
                const newData = [...prev];
                newData[selectedNoteIndex] = updated;
                return newData;
            });

            setShowNoteModal(false);
            setSelectedNoteIndex(null);
            setNoteText('');

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);

        } catch (err) {
            console.error('Failed to save note:', err);
            setError('Failed to save note');
            setTimeout(() => setError(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveModule = useCallback(async (index: number) => {
        if (!isCoordinator) return;

        const mod = trainingData[index];
        if (!mod._id) return;

        if (!confirm('Are you sure you want to remove this training module?')) return;

        try {
            setSaving(true);
            setError(null);

            const res = await fetch(`/api/users/${viewedUser._id}/modules/${mod._id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to remove training module');

            setTrainingData((prev) => prev.filter((_, i) => i !== index));
            setOriginalData((prev) => prev.filter((_, i) => i !== index));

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove module');
        } finally {
            setSaving(false);
        }
    }, [isCoordinator, trainingData, viewedUser._id, setTrainingData, setError, setOriginalData, setSaveSuccess, setSaving]);

    useEffect(() => {
        fetchModules();
    }, [fetchModules]);

    const getModuleProgress = (module: IUserModule) => {
        const submodules = module.submodules || [];

        const populatedSubmodules = submodules.filter(
            (s): s is IUserSubmodule => typeof s !== "string"
        );

        const totalSubmodules = populatedSubmodules.length;
        const completedSubmodules = populatedSubmodules.filter(s => isSubmoduleComplete(s)).length;

        const percentage =
            totalSubmodules > 0
                ? Math.round((completedSubmodules / totalSubmodules) * 100)
                : 0;

        return { total: totalSubmodules, completed: completedSubmodules, percentage };
    };

    return (
        <>
            {/* Search and Filter Bar */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                <div className="flex flex-col gap-3">
                    {/* Search and Action Buttons Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search modules..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border text-gray-600 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {!isTrainee && (
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`px-4 py-2 border rounded-lg text-sm flex items-center gap-2 transition-colors ${showFilters
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <Filter className="w-4 h-4" />
                                    <span className="hidden sm:inline">Filters</span>
                                </button>
                            )}

                            {isCoordinator && !isArchived && (
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    disabled={loadingModules}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Assign</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    {(showFilters || isTrainee) && (
                        <div className="grid grid-cols-2 sm:flex gap-2 pt-3 border-t border-gray-200">
                            {([
                                { label: 'All', key: 'all', count: trainingData.length },
                                { label: 'Completed', key: 'completed', count: stats.completed },
                                { label: 'In Progress', key: 'in-progress', count: stats.inProgress },
                                { label: 'Not Started', key: 'not-started', count: stats.notStarted },
                            ] as const).map(({ label, key, count }) => (
                                <button
                                    key={key}
                                    onClick={() => setFilterStatus(key)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === key
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {label} ({count})
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Archived Notice for Coordinators/Trainers */}
            {isArchived && !isTrainee && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-900">Viewing Archived Training Cycle</p>
                        <p className="text-xs text-amber-700 mt-1">
                            These modules are from a past training cycle. {isCoordinator ? 'You can view history but cannot assign new modules or make changes.' : 'Changes cannot be made to archived modules.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Training Data Display */}
            <div className="overflow-show">
                {filteredData.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center">
                        <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                            {trainingData.length === 0 ? 'No training modules assigned' : 'No modules match your filters'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            {trainingData.length === 0 && isCoordinator && !isArchived
                                ? 'Click "Assign" to get started'
                                : trainingData.length === 0 && isCoordinator && isArchived
                                    ? 'No archived modules for this training cycle'
                                    : trainingData.length === 0 && isTrainee
                                        ? 'Your trainer will assign modules to you soon'
                                        : 'Try adjusting your search or filters'}
                        </p>
                        {searchQuery || filterStatus !== 'all' ? (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setFilterStatus('all');
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                            >
                                Clear Filters
                            </button>
                        ) : null}
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View (hidden on mobile) */}
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                            Module
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                                            Progress
                                        </th>
                                        {!isTrainee && (
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                                                Notes
                                            </th>
                                        )}
                                        {isCoordinator && (
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredData.map((m, idx) => {
                                        const actualIndex = trainingData.indexOf(m);
                                        const moduleName = typeof m.tModule === 'object' && 'name' in m.tModule
                                            ? m.tModule.name
                                            : 'Unknown Module';
                                        const progress = getModuleProgress(m);

                                        return (
                                            <tr 
                                                key={m._id?.toString() || idx} 
                                                className={`hover:bg-gray-50 transition-colors ${isArchived ? 'opacity-75' : ''}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {isArchived && (
                                                            <Archive className="w-4 h-4 text-amber-500 shrink-0" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <button
                                                                onClick={() => router.push(`/users/${viewedUser._id}/moduleInfo/${m._id}`)}
                                                                className="text-sm font-medium text-gray-900 hover:underline hover:text-blue-800 transition-colors text-left"
                                                            >
                                                                {moduleName}
                                                            </button>
                                                            {typeof m.tModule === 'object' && m.tModule.description && (
                                                                <p className="text-xs text-gray-500 mt-0.5">{m.tModule.description}</p>
                                                            )}
                                                            {isArchived && m.trainingYear && (
                                                                <p className="text-xs text-amber-600 mt-1 font-medium">
                                                                    Training Year: {m.trainingYear}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="w-full max-w-[120px] bg-gray-200 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className={`h-2 rounded-full transition-all ${
                                                                    isArchived ? 'bg-amber-500' : 'bg-blue-600'
                                                                }`}
                                                                style={{ width: `${progress.percentage}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-600">
                                                            {progress.completed}/{progress.total} ({progress.percentage}%)
                                                        </span>
                                                    </div>
                                                </td>
                                                {!isTrainee && (
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => handleOpenNoteModal(idx)}
                                                            disabled={isArchived}
                                                            className={`p-2 rounded-lg transition-colors ${
                                                                isArchived 
                                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                    : m.notes
                                                                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                            }`}
                                                            title={isArchived ? 'Cannot edit archived module' : m.notes || 'Add note'}
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                                {isCoordinator && (
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedTraining(m);
                                                                    setShowHistoryModal(true);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="View history"
                                                            >
                                                                <History className="w-4 h-4" />
                                                            </button>
                                                            {!isArchived && (
                                                                <button
                                                                    onClick={() => handleRemoveModule(actualIndex)}
                                                                    disabled={saving}
                                                                    className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                                    title="Remove module"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile/Tablet Card View */}
                        <div className="lg:hidden space-y-3">
                            {filteredData.map((m, idx) => {
                                const actualIndex = trainingData.indexOf(m);
                                const moduleName = typeof m.tModule === 'object' && 'name' in m.tModule
                                    ? m.tModule.name
                                    : 'Unknown Module';
                                const moduleDescription = typeof m.tModule === 'object' && m.tModule.description
                                    ? m.tModule.description
                                    : '';
                                const progress = getModuleProgress(m);

                                return (
                                    <div 
                                        key={m._id?.toString() || idx} 
                                        className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
                                            isArchived 
                                                ? 'border-amber-200 bg-amber-50/30' 
                                                : 'border-gray-200'
                                        }`}
                                    >
                                        {/* Header Section */}
                                        <div className={`p-4 border-b ${
                                            isArchived ? 'border-amber-100 bg-amber-50/50' : 'border-gray-100'
                                        }`}>
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <button
                                                    onClick={() => router.push(`/users/${viewedUser._id}/moduleInfo/${m._id}`)}
                                                    className="flex-1 min-w-0 text-left"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {isArchived && (
                                                            <Archive className="w-4 h-4 text-amber-500 shrink-0" />
                                                        )}
                                                        <h3 className="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors leading-tight">
                                                            {moduleName}
                                                        </h3>
                                                    </div>
                                                    {isArchived && (
                                                        <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                                            Archived {m.trainingYear && `• ${m.trainingYear}`}
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                            {moduleDescription && (
                                                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{moduleDescription}</p>
                                            )}
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-4 space-y-3">
                                            {/* Progress Bar */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-gray-700">Progress</span>
                                                    <span className="text-xs text-gray-600">{progress.completed}/{progress.total} ({progress.percentage}%)</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${
                                                            isArchived ? 'bg-amber-500' : 'bg-blue-600'
                                                        }`}
                                                        style={{ width: `${progress.percentage}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Show notes preview for trainees or view-only for archived */}
                                            {m.notes && (isTrainee || isArchived) && (
                                                <div className={`p-3 rounded-lg border ${
                                                    isArchived 
                                                        ? 'bg-amber-50 border-amber-100' 
                                                        : 'bg-blue-50 border-blue-100'
                                                }`}>
                                                    <div className="flex items-start gap-2">
                                                        <MessageSquare className={`w-4 h-4 shrink-0 mt-0.5 ${
                                                            isArchived ? 'text-amber-600' : 'text-blue-600'
                                                        }`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-semibold mb-1 ${
                                                                isArchived ? 'text-amber-900' : 'text-blue-900'
                                                            }`}>
                                                                Trainer Notes
                                                            </p>
                                                            <p className={`text-xs leading-relaxed line-clamp-3 ${
                                                                isArchived ? 'text-amber-700' : 'text-blue-700'
                                                            }`}>
                                                                {m.notes}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions Footer */}
                                        <div className={`px-4 py-3 border-t flex items-center justify-between ${
                                            isArchived 
                                                ? 'bg-amber-50/50 border-amber-100' 
                                                : 'bg-gray-50 border-gray-100'
                                        }`}>
                                            {!isTrainee && (
                                                <button
                                                    onClick={() => handleOpenNoteModal(idx)}
                                                    disabled={isArchived}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                        isArchived
                                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                            : m.notes
                                                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                                    }`}
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    <span>{m.notes ? 'View Note' : 'Add Note'}</span>
                                                </button>
                                            )}

                                            {isCoordinator && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTraining(m);
                                                            setShowHistoryModal(true);
                                                        }}
                                                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View history"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                    {!isArchived && (
                                                        <button
                                                            onClick={() => handleRemoveModule(actualIndex)}
                                                            disabled={saving}
                                                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                            title="Remove module"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {isTrainee && <div></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Note Modal */}
            {showNoteModal && selectedNoteIndex !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Training Notes</h3>
                                {isArchived && (
                                    <p className="text-xs text-amber-600 mt-1">Read-only • Archived module</p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setShowNoteModal(false);
                                    setSelectedNoteIndex(null);
                                    setNoteText('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Add notes about this training module..."
                                className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500"
                                disabled={!isEditable || isArchived}
                            />
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => {
                                    setShowNoteModal(false);
                                    setSelectedNoteIndex(null);
                                    setNoteText('');
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                {isArchived ? 'Close' : 'Cancel'}
                            </button>
                            {isEditable && !isArchived && (
                                <button
                                    onClick={handleSaveNote}
                                    disabled={saving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Note
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default TrainingModulesView;