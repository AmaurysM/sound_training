'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
    AlertCircle, CheckCircle2, Loader2, Save, X
} from 'lucide-react';
import TrainingHistoryModal from '@/app/components/ShowHistoryModal';
import AddModuleModal from '@/app/components/AddModuleModal';
import EditUserModal from '@/app/components/EditUserModal';
import TrainingHeader from '@/app/components/TrainingHeader';
import TrainingModulesView from '@/app/components/TrainingModulesView';
import { IUserModule, ITrainingModule, IUser, Stat, IUserSubmodule } from "@/models/types";

export default function UserTrainingPage() {
    const params = useParams();
    const userId = params.id as string;

    const [currentUser, setCurrentUser] = useState<IUser | null>(null);
    const [viewedUser, setViewedUser] = useState<IUser | null>(null);
    const [userModules, setUserModules] = useState<IUserModule[]>([]);
    const [originalData, setOriginalData] = useState<IUserModule[]>([]);
    const [availableModules, setAvailableModules] = useState<ITrainingModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingModules, setLoadingModules] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedModuleId, setSelectedModuleId] = useState<string>('');
    const [addingModule, setAddingModule] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedUserModule, setSelectedUserModule] = useState<IUserModule | null>(null);

    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const res = await fetch('/api/me');
                if (!res.ok) throw new Error('Failed to fetch user');
                const user: IUser = await res.json();
                setCurrentUser(user);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load user');
                setLoading(false);
            }
        };
        fetchCurrentUser();
    }, []);

    const fetchModules = useCallback(async () => {
        if (!currentUser) return;
        try {
            setLoadingModules(true);
            const res = await fetch(`/api/training-modules`);
            if (!res.ok) throw new Error('Failed to fetch modules');
            const response = await res.json();
            const modules: ITrainingModule[] = response.data || response;
            setAvailableModules(modules);
        } catch (err) {
            console.error('Failed to load training modules:', err);
        } finally {
            setLoadingModules(false);
        }
    }, [currentUser]);

    const fetchViewedUserAndModules = useCallback(async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            setError(null);

            const targetUserId = userId ? userId : currentUser._id;
            
            // Fetch user details
            const userRes = await fetch(`/api/users/${targetUserId}`);
            if (!userRes.ok) throw new Error('Failed to fetch user data');

            const userResponse = await userRes.json();
            const user: IUser = userResponse.data || userResponse;
            setViewedUser(user);

            // Fetch user's modules
            const modulesRes = await fetch(`/api/users/${targetUserId}/modules`);
            if (!modulesRes.ok) throw new Error('Failed to fetch modules');

            const modulesResponse = await modulesRes.json();
            const modules: IUserModule[] = modulesResponse.data || modulesResponse;
            
            const validModules = modules.filter(m =>
                m.tModule && (typeof m.tModule === 'object' ? 'name' in m.tModule : true)
            );

            setUserModules(validModules);
            setOriginalData(JSON.parse(JSON.stringify(validModules)));
            setHasChanges(false);
        } catch (err) {
            console.error('Error fetching user:', err);
            setError(err instanceof Error ? err.message : 'Failed to load training data');
        } finally {
            setLoading(false);
        }
    }, [currentUser, userId]);

    useEffect(() => {
        fetchViewedUserAndModules();
    }, [fetchViewedUserAndModules]);

    useEffect(() => {
        const changed = JSON.stringify(userModules) !== JSON.stringify(originalData);
        setHasChanges(changed);
    }, [userModules, originalData]);

    const isEditable = currentUser && (currentUser.role === 'Coordinator' || currentUser.role === 'Trainer');
    const isCoordinator = currentUser?.role === 'Coordinator';

    const handleAddModule = async () => {
        if (!selectedModuleId || !viewedUser || !isCoordinator) return;

        const alreadyAssigned = userModules.some(
            (m) => (typeof m.tModule === 'object' ? m.tModule._id : m.tModule)?.toString() === selectedModuleId
        );

        if (alreadyAssigned) {
            setError('This module is already assigned to the user');
            setTimeout(() => setError(null), 3000);
            return;
        }

        try {
            setAddingModule(true);
            setError(null);

            const targetUserId = viewedUser._id?.toString();
            if (!targetUserId) throw new Error('Invalid user ID');

            const res = await fetch(`/api/users/${targetUserId}/modules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tModule: selectedModuleId,
                    notes: '',
                    submodules: []
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to add training module');
            }

            setShowAddModal(false);
            setSelectedModuleId('');
            await fetchViewedUserAndModules();

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add module');
        } finally {
            setAddingModule(false);
        }
    };

    const handleSave = async () => {
        if (!viewedUser || !isEditable) return;

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
        await fetchViewedUserAndModules();
        await fetchModules();
    };

const getProgressStats = () => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    userModules.forEach(module => {
        const submodules = module.submodules || [];

        // Only count real submodule objects, not string IDs
        const populatedSubmodules = submodules.filter(
            (s): s is IUserSubmodule => typeof s !== "string"
        );

        const totalSubmodules = populatedSubmodules.length;
        const completedSubmodules = populatedSubmodules.filter(s => s.signedOff).length;

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

    const total = userModules.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, inProgress, notStarted, total, percentage };
};


    const getUnassignedModules = () => {
        const assignedModuleIds = userModules.map((m) =>
            (typeof m.tModule === 'object' ? m.tModule._id : m.tModule)?.toString()
        );
        return availableModules.filter((m) => !assignedModuleIds.includes(m._id?.toString()));
    };

    const stats: Stat = getProgressStats();
    const unassignedModules = getUnassignedModules();

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
                {/* Header */}
                <TrainingHeader
                    currentUser={currentUser}
                    viewedUser={viewedUser}
                    handleRefresh={handleRefresh}
                    loading={loading}
                    setShowEditModal={setShowEditModal}
                    setShowMobileMenu={setShowMobileMenu}
                    showMobileMenu={showMobileMenu}
                    stats={stats}
                />

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3 shadow-sm">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-red-700 text-xs sm:text-sm font-medium wrap-break-word">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <TrainingModulesView
                    currentUser={currentUser}
                    viewedUser={viewedUser}
                    trainingData={userModules}
                    setShowAddModal={setShowAddModal}
                    loadingModules={loadingModules}
                    fetchModules={fetchModules}
                    stats={stats}
                    setTrainingData={setUserModules}
                    setSelectedTraining={setSelectedUserModule}
                    setShowHistoryModal={setShowHistoryModal}
                    setSaving={setSaving}
                    setError={setError}
                    error={error}
                    setOriginalData={setOriginalData}
                    setSaveSuccess={setSaveSuccess}
                    saving={saving}
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
                show={showAddModal}
                isCoordinator={isCoordinator}
                unassignedModules={unassignedModules}
                selectedModuleId={selectedModuleId}
                addingModule={addingModule}
                onClose={() => {
                    setShowAddModal(false);
                    setSelectedModuleId('');
                }}
                onSelectModule={setSelectedModuleId}
                onAddModule={handleAddModule}
            />

            <TrainingHistoryModal
                show={showHistoryModal}
                training={selectedUserModule}
                isCoordinator={isCoordinator}
                onClose={() => {
                    setShowHistoryModal(false);
                    setSelectedUserModule(null);
                }}
            />

            <EditUserModal
                show={showEditModal}
                user={viewedUser}
                onClose={() => setShowEditModal(false)}
                onSave={() => {
                    fetchViewedUserAndModules();
                    setShowEditModal(false);
                }}
            />
        </div>
    );
}