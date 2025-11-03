// src/app/dashboard/users/[userId]/modules/page.tsx

'use client';
import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    AlertCircle, CheckCircle2, Loader2, Save, X, RotateCcw,
    Archive
} from 'lucide-react';
import TrainingHistoryModal from '@/app/components/ShowHistoryModal';
import AddModuleModal from '@/app/components/AddModuleModal';
import EditUserModal from '@/app/components/EditUserModal';
import TrainingHeader from '@/app/components/TrainingHeader';
import TrainingModulesView from '@/app/components/TrainingModulesView';
import { Stat, IUserSubmodule, Roles } from "@/models/types";
import { useDashboard } from '@/contexts/dashboard-context';

export default function Modules() {
    const params = useParams();
    const userId = params.userId as string;

    const {
        currentUser,
        viewedUser,
        userModules,
        setUserModules,
        originalData,
        setOriginalData,
        availableModules,
        loading,
        saving,
        setSaving,
        error,
        setError,
        saveSuccess,
        setSaveSuccess,
        hasChanges,
        setHasChanges,
        setShowAddModal,
        selectedModuleIds,
        setSelectedModuleIds,
        setAddingModule,
        selectedYear,
        setSelectedYear,
        showActiveCycles,
        setShowActiveCycles,
        showCycleFilter,
        setShowCycleFilter,
        availableYears,
        fetchCurrentUser,
        fetchModules,
        fetchViewedUserAndModules,
    } = useDashboard();

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

    // Fetch current user only once on mount
    useEffect(() => {
        fetchCurrentUser();
    }, []); // Empty dependency array - only run once

    // Fetch modules once when currentUser becomes available
    useEffect(() => {
        if (currentUser) {
            fetchModules();
        }
    }, [currentUser]); // Only depend on currentUser, not fetchModules

    // Fetch viewed user and their modules once when currentUser is available
    useEffect(() => {
        if (currentUser && userId) {
            fetchViewedUserAndModules(userId);
        }
    }, [currentUser, userId]); // Only depend on currentUser and userId

    useEffect(() => {
        const changed = JSON.stringify(userModules) !== JSON.stringify(originalData);
        setHasChanges(changed);
    }, [userModules, originalData, setHasChanges]);

    const isEditable = currentUser && (currentUser.role === 'Coordinator' || currentUser.role === 'Trainer');
    const isCoordinator = currentUser?.role === 'Coordinator';
    const isUserArchived = viewedUser?.archived || false;

    // Filter modules based on selected year and cycle status
    const filteredModules = useMemo(() => {
        return userModules.filter(m => {
            const yearMatch = selectedYear === 'all' || m.trainingYear === selectedYear;
            const cycleMatch = m.activeCycle === showActiveCycles;
            return yearMatch && cycleMatch;
        });
    }, [userModules, selectedYear, showActiveCycles]);

    const handleToggleModule = (id: string) => {
        setSelectedModuleIds((prev) =>
            prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
        );
    };

    const handleAddModules = async () => {
        if (selectedModuleIds.length === 0 || !viewedUser || !isCoordinator) return;

        if (isUserArchived) {
            setError('Cannot assign modules - user is archived');
            setTimeout(() => setError(null), 3000);
            return;
        }

        try {
            setAddingModule(true);
            setError(null);

            const targetUserId = viewedUser._id?.toString();
            if (!targetUserId) throw new Error('Invalid user ID');

            const newModules = selectedModuleIds.filter(
                (id) =>
                    !userModules.some(
                        (m) =>
                            (typeof m.tModule === 'object' ? m.tModule._id : m.tModule)?.toString() === id &&
                            m.trainingYear === selectedYear &&
                            m.activeCycle === showActiveCycles
                    )
            );

            if (newModules.length === 0) {
                setError('All selected modules are already assigned for this training cycle');
                setTimeout(() => setError(null), 3000);
                return;
            }

            await Promise.all(
                newModules.map((moduleId) =>
                    fetch(`/api/users/${targetUserId}/modules`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tModule: moduleId,
                            notes: '',
                            submodules: [],
                            trainingYear: selectedYear === 'all' ? new Date().getFullYear() : selectedYear,
                            activeCycle: showActiveCycles,
                        }),
                    })
                )
            );

            setShowAddModal(false);
            setSelectedModuleIds([]);
            await fetchViewedUserAndModules(userId);

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add modules');
        } finally {
            setAddingModule(false);
        }
    };

    const handleSave = async () => {
        if (!viewedUser || !isEditable) return;

        if (isUserArchived) {
            setError('Cannot save changes - user is archived');
            setTimeout(() => setError(null), 3000);
            return;
        }

        try {
            setSaving(true);
            setError(null);
            setSaveSuccess(false);

            const updatePromises = userModules.map(async (module) => {
                if (!module._id) return;

                const res = await fetch(`/api/users/${viewedUser._id}/modules/${module._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notes: module.notes,
                    }),
                });

                if (!res.ok) throw new Error('Failed to update module');
            });

            await Promise.all(updatePromises);

            setOriginalData(JSON.parse(JSON.stringify(userModules)));
            setHasChanges(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setUserModules(JSON.parse(JSON.stringify(originalData)));
        setHasChanges(false);
    };

    const handleRefresh = async () => {
        await fetchViewedUserAndModules(userId);
        await fetchModules();
    };

    const handleArchiveCycle = async () => {
        if (!isCoordinator || !viewedUser) return;

        if (isUserArchived) {
            setError('Cannot archive cycle - user is archived');
            setTimeout(() => setError(null), 3000);
            return;
        }

        if (!confirm(`Archive all modules for ${selectedYear === 'all' ? 'all years' : selectedYear}? This will mark them as inactive.`)) return;

        try {
            setSaving(true);
            setError(null);

            const modulesToArchive = filteredModules.filter(m => m.activeCycle);

            const updatePromises = modulesToArchive.map(async (module) => {
                if (!module._id) return;

                const res = await fetch(`/api/users/${viewedUser._id}/modules/${module._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activeCycle: false }),
                });

                if (!res.ok) throw new Error('Failed to archive module');
            });

            await Promise.all(updatePromises);
            await fetchViewedUserAndModules(userId);

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to archive cycle');
        } finally {
            setSaving(false);
        }
    };

    const handleRestoreCycle = async () => {
        if (!isCoordinator || !viewedUser) return;

        if (isUserArchived) {
            setError('Cannot restore cycle - user is archived');
            setTimeout(() => setError(null), 3000);
            return;
        }

        if (!confirm(`Restore all modules for ${selectedYear === 'all' ? 'all years' : selectedYear}? This will mark them as active.`)) return;

        try {
            setSaving(true);
            setError(null);

            const modulesToRestore = filteredModules.filter(m => !m.activeCycle);

            const updatePromises = modulesToRestore.map(async (module) => {
                if (!module._id) return;

                const res = await fetch(`/api/users/${viewedUser._id}/modules/${module._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activeCycle: true }),
                });

                if (!res.ok) throw new Error('Failed to restore module');
            });

            await Promise.all(updatePromises);
            await fetchViewedUserAndModules(userId);

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to restore cycle');
        } finally {
            setSaving(false);
        }
    };

    const getProgressStats = () => {
        let completed = 0;
        let inProgress = 0;
        let notStarted = 0;

        filteredModules.forEach(module => {
            const submodules = module.submodules || [];

            const populatedSubmodules = submodules.filter(
                (s): s is IUserSubmodule => typeof s !== "string"
            );

            const totalSubmodules = populatedSubmodules.length;
            const completedSubmodules = populatedSubmodules.filter(s => isSubmoduleComplete(s)).length;

            if (totalSubmodules === 0) {
                notStarted++;
            } else if (completedSubmodules === totalSubmodules) {
                completed++;
            } else if (completedSubmodules > 0) {
                inProgress++;
            } else {
                notStarted++;
            }
        });

        const total = filteredModules.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { completed, inProgress, notStarted, total, percentage };
    };

    const getUnassignedModules = () => {
        const assignedModuleIds = userModules
            .filter(m =>
                (selectedYear === 'all' || m.trainingYear === selectedYear) &&
                m.activeCycle === showActiveCycles
            )
            .map((m) => (typeof m.tModule === 'object' ? m.tModule._id : m.tModule)?.toString());

        return availableModules.filter((m) => !assignedModuleIds.includes(m._id?.toString()));
    };

    const getCycleSummary = () => {
        const activeCycleModules = userModules.filter(m => m.activeCycle);
        const archivedCycleModules = userModules.filter(m => !m.activeCycle);

        return {
            activeCount: activeCycleModules.length,
            archivedCount: archivedCycleModules.length,
            totalCount: userModules.length
        };
    };

    const stats: Stat = getProgressStats();
    const unassignedModules = getUnassignedModules();
    const cycleSummary = getCycleSummary();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading training data...</p>
                </div>
            </div>
        );
    }

    if (error && !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white border border-red-200 p-8 rounded-lg max-w-md w-full">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-center text-red-700 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!currentUser || !viewedUser) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                <TrainingHeader
                    handleRefresh={handleRefresh}
                    stats={stats}
                />

                {/* Training Cycle Filter */}
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm shadow-gray-200/60 overflow-show">
                    <div className="p-4">
                        <button
                            onClick={() => setShowCycleFilter(!showCycleFilter)}
                            className="flex items-center justify-between w-full text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-linear-to-br from-blue-50 to-blue-100 rounded-lg group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-200 shadow-sm">
                                    <Archive className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800">Training Cycles</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {showActiveCycles ? 'Active' : 'Archived'} • {selectedYear === 'all' ? 'All Years' : selectedYear}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="hidden sm:flex items-center gap-3 text-xs">
                                    <span className="text-gray-500 bg-green-50 px-2 py-1 rounded-md">
                                        <span className="font-medium text-green-600">{cycleSummary.activeCount}</span>
                                    </span>
                                    <span className="text-gray-500 bg-amber-50 px-2 py-1 rounded-md">
                                        <span className="font-medium text-amber-600">{cycleSummary.archivedCount}</span>
                                    </span>
                                </div>
                                <div className={`transform transition-transform duration-200 ${showCycleFilter ? 'rotate-180' : ''}`}>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </button>

                        {showCycleFilter && (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-in fade-in duration-200">
                                {/* Year Selector */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Training Year</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white/50 backdrop-blur-sm transition-colors"
                                    >
                                        <option value="all">All Years</option>
                                        {availableYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Cycle Status Toggle */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowActiveCycles(true)}
                                            className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${showActiveCycles
                                                ? 'bg-linear-to-r from-green-500 to-green-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                                                }`}
                                        >
                                            <span className="flex items-center justify-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Active
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setShowActiveCycles(false)}
                                            className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${!showActiveCycles
                                                ? 'bg-linear-to-r from-amber-500 to-amber-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                                                }`}
                                        >
                                            <span className="flex items-center justify-center gap-1.5">
                                                <Archive className="w-3.5 h-3.5" />
                                                Archived
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Coordinator Actions */}
                                {isCoordinator && !isUserArchived && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <label className="block text-xs font-medium text-gray-600 mb-2">Bulk Actions</label>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            {showActiveCycles ? (
                                                <button
                                                    onClick={handleArchiveCycle}
                                                    disabled={saving || stats.total === 0}
                                                    className="flex-1 px-4 py-2 bg-linear-to-r from-amber-500 to-amber-600 text-white rounded-lg text-xs font-medium hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm"
                                                >
                                                    <Archive className="w-3.5 h-3.5" />
                                                    Archive {stats.total} Module{stats.total !== 1 ? 's' : ''}
                                                    {saving && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleRestoreCycle}
                                                    disabled={saving || stats.total === 0}
                                                    className="flex-1 px-4 py-2 bg-linear-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    Restore {stats.total} Module{stats.total !== 1 ? 's' : ''}
                                                    {saving && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Status Banner */}
                    {!showActiveCycles && (
                        <div className="bg-linear-to-r from-amber-50 to-amber-100/80 border-t border-amber-200/50 px-4 py-2.5 flex items-center gap-2">
                            <Archive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700">
                                <span className="font-medium">Viewing archived modules</span>
                            </p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-linear-to-r from-red-50 to-red-100/80 border border-red-200 rounded-lg p-3 flex items-start gap-2 shadow-sm animate-in fade-in duration-200">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-red-700 text-xs font-medium">{error}</p>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="p-1 text-red-400 hover:text-red-600 rounded transition-colors duration-200"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                <TrainingModulesView
                    stats={stats}
                    isArchived={!showActiveCycles}
                    filteredModules={filteredModules}
                />

                {saveSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-green-700 text-xs sm:text-sm font-medium">Changes saved successfully!</p>
                    </div>
                )}

                {isEditable && hasChanges && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-lg sticky bottom-4">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                            <p className="text-xs sm:text-sm font-medium text-gray-900">You have unsaved changes</p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <AddModuleModal
                isCoordinator={isCoordinator}
                modules={unassignedModules}
                onToggleModule={handleToggleModule}
                onAddModules={handleAddModules}
            />

            <TrainingHistoryModal />

            <EditUserModal />
        </div>
    );
}