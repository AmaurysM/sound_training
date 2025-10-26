'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    AlertCircle, CheckCircle2, Loader2, ArrowLeft, Save, Plus, X,
    RefreshCw, Filter, Search, Download, Calendar, User, Award,
    Clock, TrendingUp, FileText, History, Menu, LogOut, Home
} from 'lucide-react';

interface IUser {
    _id?: string;
    username: string;
    password: string;
    role: 'Coordinator' | 'Trainer' | 'Trainee';
    name: string;
    archived: boolean;
    trainings?: ITraining[];
    createdAt?: Date;
    updatedAt?: Date;
}

interface ITrainingModule {
    _id?: string;
    name: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ITraining {
    _id?: string;
    user: string;
    module: string | ITrainingModule;
    ojt: boolean;
    practical: boolean;
    signedOff: boolean;
    notes: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export default function TrainingPage() {
    const params = useParams();
    const userId = params.id as string;
    const router = useRouter();

    const [currentUser, setCurrentUser] = useState<IUser | null>(null);
    const [viewedUser, setViewedUser] = useState<IUser | null>(null);
    const [trainingData, setTrainingData] = useState<ITraining[]>([]);
    const [originalData, setOriginalData] = useState<ITraining[]>([]);
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
    const [selectedTraining, setSelectedTraining] = useState<ITraining | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress' | 'not-started'>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

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
        if (!currentUser || currentUser.role !== 'Coordinator') return;
        try {
            setLoadingModules(true);
            const res = await fetch('/api/training-modules');
            if (!res.ok) throw new Error('Failed to fetch modules');
            const modules: ITrainingModule[] = await res.json();
            setAvailableModules(modules);
        } catch (err) {
            console.error('Failed to load training modules:', err);
        } finally {
            setLoadingModules(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchModules();
    }, [fetchModules]);

    const fetchViewedUserAndTraining = useCallback(async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            setError(null);

            const canViewOthers = currentUser.role === 'Coordinator' || currentUser.role === 'Trainer';
            const targetUserId = userId && canViewOthers ? userId : null;
            const url = targetUserId ? `/api/users/${targetUserId}` : '/api/me';

            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch user data');

            const user: IUser = await res.json();
            setViewedUser(user);

            const trainings = (user.trainings || []) as ITraining[];
            const validTrainings = trainings.filter(t =>
                t.module && (typeof t.module === 'object' ? 'name' in t.module : true)
            );

            setTrainingData(validTrainings);
            setOriginalData(JSON.parse(JSON.stringify(validTrainings)));
            setHasChanges(false);
        } catch (err) {
            console.error('Error fetching user:', err);
            setError(err instanceof Error ? err.message : 'Failed to load training data');
        } finally {
            setLoading(false);
        }
    }, [currentUser, userId]);

    useEffect(() => {
        fetchViewedUserAndTraining();
    }, [fetchViewedUserAndTraining]);

    useEffect(() => {
        const changed = JSON.stringify(trainingData) !== JSON.stringify(originalData);
        setHasChanges(changed);
    }, [trainingData, originalData]);

    const isEditable = currentUser && (currentUser.role === 'Coordinator' || currentUser.role === 'Trainer');
    const isCoordinator = currentUser?.role === 'Coordinator';
    const isTrainee = currentUser?.role === 'Trainee';
    const isViewingOwnProfile = currentUser?._id === viewedUser?._id;

    const handleToggle = useCallback((index: number, field: keyof ITraining) => {
        if (!isEditable) return;

        setTrainingData((prev) => {
            const updated = [...prev];
            const item = { ...updated[index] };

            if (field === 'signedOff' && (!item.ojt || !item.practical)) {
                return prev;
            }

            if (field === 'ojt' || field === 'practical' || field === 'signedOff') {
                item[field] = !item[field];
            }

            if ((field === 'ojt' || field === 'practical') && !item[field]) {
                item.signedOff = false;
            }

            updated[index] = item;
            return updated;
        });
    }, [isEditable]);

    const handleNotesChange = useCallback((index: number, value: string) => {
        setTrainingData((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], notes: value };
            return updated;
        });
    }, []);

    const handleRemoveModule = useCallback(async (index: number) => {
        if (!isCoordinator) return;

        const training = trainingData[index];
        if (!training._id) return;

        if (!confirm('Are you sure you want to remove this training module?')) return;

        try {
            setSaving(true);
            setError(null);

            const res = await fetch(`/api/trainings/${training._id}`, {
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
    }, [isCoordinator, trainingData]);

    const handleAddModule = async () => {
        if (!selectedModuleId || !viewedUser || !isCoordinator) return;

        const alreadyAssigned = trainingData.some(
            (t) => (typeof t.module === 'object' ? t.module._id : t.module)?.toString() === selectedModuleId
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

            const res = await fetch('/api/trainings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user: targetUserId,
                    module: selectedModuleId,
                    ojt: false,
                    practical: false,
                    signedOff: false,
                    notes: '',
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to add training module');
            }

            setShowAddModal(false);
            setSelectedModuleId('');
            await fetchViewedUserAndTraining();

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

            const updatePromises = trainingData.map(async (training) => {
                if (!training._id) return;

                const res = await fetch(`/api/trainings/${training._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ojt: training.ojt,
                        practical: training.practical,
                        signedOff: training.signedOff,
                        notes: training.notes,
                    }),
                });

                if (!res.ok) throw new Error('Failed to update training');
            });

            await Promise.all(updatePromises);

            setOriginalData(JSON.parse(JSON.stringify(trainingData)));
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
        setTrainingData(JSON.parse(JSON.stringify(originalData)));
        setHasChanges(false);
    };

    const handleRefresh = async () => {
        await fetchViewedUserAndTraining();
        await fetchModules();
    };

    const handleLogout = async () => {
        try {
            const res = await fetch('/api/logout', {
                method: 'POST',
            });

            if (res.ok) {
                router.push('/login');
            }
        } catch (err) {
            console.error('Logout failed', err);
        }
    };

    const handleExportData = () => {
        const csvContent = [
            ['Module', 'OJT', 'Practical', 'Signed Off', 'Notes', 'Created'],
            ...trainingData.map(t => {
                const moduleName = typeof t.module === 'object' ? t.module.name : 'Unknown';
                return [
                    moduleName,
                    t.ojt ? 'Yes' : 'No',
                    t.practical ? 'Yes' : 'No',
                    t.signedOff ? 'Yes' : 'No',
                    t.notes || '',
                    t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''
                ];
            })
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${viewedUser?.name || 'training'}_data.csv`;
        a.click();
    };

    const getProgressStats = () => {
        const completed = trainingData.filter((m) => m.signedOff).length;
        const inProgress = trainingData.filter((m) => (m.ojt || m.practical) && !m.signedOff).length;
        const notStarted = trainingData.filter((m) => !m.ojt && !m.practical).length;
        const total = trainingData.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, inProgress, notStarted, total, percentage };
    };

    const getFilteredTrainingData = () => {
        let filtered = trainingData;

        if (searchQuery) {
            filtered = filtered.filter(t => {
                const moduleName = typeof t.module === 'object' ? t.module.name : '';
                return moduleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.notes.toLowerCase().includes(searchQuery.toLowerCase());
            });
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(t => {
                if (filterStatus === 'completed') return t.signedOff;
                if (filterStatus === 'in-progress') return (t.ojt || t.practical) && !t.signedOff;
                if (filterStatus === 'not-started') return !t.ojt && !t.practical;
                return true;
            });
        }

        return filtered;
    };

    const getUnassignedModules = () => {
        const assignedModuleIds = trainingData.map((t) =>
            (typeof t.module === 'object' ? t.module._id : t.module)?.toString()
        );
        return availableModules.filter((m) => !assignedModuleIds.includes(m._id?.toString()));
    };

    const stats = getProgressStats();
    const filteredData = getFilteredTrainingData();
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
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
                            {!isTrainee && userId && !isViewingOwnProfile && (
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                                    title="Back to dashboard"
                                >
                                    <Home className="w-5 h-5 text-gray-600" />
                                </button>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                                    <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
                                        {isTrainee ? 'My Training Progress' : (isEditable ? 'Training Management' : 'My Training')}
                                    </h1>
                                    <button
                                        onClick={handleRefresh}
                                        disabled={loading}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Refresh data"
                                    >
                                        <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 flex-wrap">
                                    <User className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                                    <span className="font-medium text-gray-900 truncate">{viewedUser.name}</span>
                                    <span>•</span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap">
                                        {viewedUser.role}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isTrainee && (
                                <button
                                    onClick={handleLogout}
                                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Logout</span>
                                </button>
                            )}
                            <button
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <Menu className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                    </div>

                    <div className={`${showMobileMenu ? 'block' : 'hidden'} lg:block mt-4`}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                                    <p className="text-xs font-medium text-blue-900">Progress</p>
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.percentage}%</p>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Award className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                    <p className="text-xs font-medium text-green-900">Completed</p>
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold text-green-900">
                                    {stats.completed}/{stats.total}
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                                    <p className="text-xs font-medium text-amber-900">In Progress</p>
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold text-amber-900">{stats.inProgress}</p>
                            </div>
                        </div>

                        {isTrainee && (
                            <button
                                onClick={handleLogout}
                                className="sm:hidden w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Logout</span>
                            </button>
                        )}
                    </div>

                    <div className="mt-4 sm:mt-6">
                        <div className="flex justify-between items-center mb-2 text-xs sm:text-sm">
                            <span className="font-medium text-gray-700">Overall Progress</span>
                            <span className="text-gray-600">{stats.completed} of {stats.total} modules</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                                style={{ width: `${stats.percentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3 shadow-sm">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-red-700 text-xs sm:text-sm font-medium break-words">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {saveSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-green-700 text-xs sm:text-sm font-medium">Changes saved successfully!</p>
                    </div>
                )}

                {!isTrainee && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                            <div className="flex flex-1 min-w-[250px] items-center gap-2 sm:gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search modules..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border text-gray-600 border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`px-3 sm:px-4 py-2 border rounded-lg text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${showFilters
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <Filter className="w-4 h-4" />
                                    <span className="hidden sm:inline">Filters</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                <button
                                    onClick={handleExportData}
                                    disabled={trainingData.length === 0}
                                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Export CSV</span>
                                </button>

                                {isCoordinator && (
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        disabled={loadingModules}
                                        className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden sm:inline">Assign Module</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {showFilters && (
                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                                <div className="grid grid-cols-2 sm:flex gap-2">
                                    {([
                                        { label: 'All', key: 'all', count: trainingData.length },
                                        { label: 'Completed', key: 'completed', count: stats.completed },
                                        { label: 'In Progress', key: 'in-progress', count: stats.inProgress },
                                        { label: 'Not Started', key: 'not-started', count: stats.notStarted },
                                    ] as const).map(({ label, key, count }) => (
                                        <button
                                            key={key}
                                            onClick={() => setFilterStatus(key)}
                                            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filterStatus === key
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {label} ({count})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isTrainee && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search modules..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border text-gray-600 border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-2 sm:flex gap-2">
                                {([
                                    { label: 'All', key: 'all', count: trainingData.length },
                                    { label: 'Completed', key: 'completed', count: stats.completed },
                                    { label: 'In Progress', key: 'in-progress', count: stats.inProgress },
                                    { label: 'Not Started', key: 'not-started', count: stats.notStarted },
                                ] as const).map(({ label, key, count }) => (
                                    <button
                                        key={key}
                                        onClick={() => setFilterStatus(key)}
                                        className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filterStatus === key
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {label} ({count})
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {filteredData.length === 0 ? (
                        <div className="p-8 sm:p-12 text-center">
                            <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                                {trainingData.length === 0 ? 'No training modules assigned' : 'No modules match your filters'}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 mb-4">
                                {trainingData.length === 0 && isCoordinator
                                    ? 'Click "Assign Module" to get started'
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
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm hover:bg-gray-200"
                                >
                                    Clear Filters
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <>
                            <div className={`overflow-x-auto ${isTrainee ? 'hidden md:block' : ''}`}>
                                <table className="w-full min-w-[800px]">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Module Name
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                OJT
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Practical
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Sign Off
                                            </th>
                                            {!isTrainee && (
                                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                    Notes
                                                </th>
                                            )}
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Status
                                            </th>
                                            {isCoordinator && (
                                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredData.map((t, idx) => {
                                            const actualIndex = trainingData.indexOf(t);
                                            const moduleName = typeof t.module === 'object' && 'name' in t.module
                                                ? t.module.name
                                                : 'Unknown Module';

                                            const getStatusBadge = () => {
                                                if (t.signedOff) {
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium whitespace-nowrap">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span>Completed</span>
                                                        </span>
                                                    );
                                                }
                                                if (t.ojt || t.practical) {
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium whitespace-nowrap">
                                                            <Clock className="w-3 h-3" />
                                                            <span>In Progress</span>
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium whitespace-nowrap">
                                                        <AlertCircle className="w-3 h-3" />
                                                        <span>Not Started</span>
                                                    </span>
                                                );
                                            };

                                            return (
                                                <tr key={t._id?.toString() || idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{moduleName}</p>
                                                                {typeof t.module === 'object' && t.module.description && (
                                                                    <p className="text-xs text-gray-500 mt-0.5">{t.module.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={t.ojt}
                                                            onChange={() => handleToggle(actualIndex, 'ojt')}
                                                            disabled={!isEditable}
                                                            className="w-5 h-5 cursor-pointer disabled:cursor-not-allowed text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={t.practical}
                                                            onChange={() => handleToggle(actualIndex, 'practical')}
                                                            disabled={!isEditable}
                                                            className="w-5 h-5 cursor-pointer disabled:cursor-not-allowed text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={t.signedOff}
                                                                onChange={() => handleToggle(actualIndex, 'signedOff')}
                                                                disabled={!isEditable || !t.ojt || !t.practical}
                                                                className="w-5 h-5 cursor-pointer disabled:cursor-not-allowed text-green-600 focus:ring-2 focus:ring-green-500 rounded"
                                                                title={!t.ojt || !t.practical ? "Complete OJT and Practical first" : ""}
                                                            />
                                                            {!t.ojt || !t.practical ? (
                                                                <span className="text-xs text-gray-400">Prerequisites required</span>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    {!isTrainee && (
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="text"
                                                                value={t.notes}
                                                                onChange={(e) => handleNotesChange(actualIndex, e.target.value)}
                                                                className="w-full border text-gray-600 border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                disabled={!isEditable}
                                                                placeholder="Add notes..."
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 text-center">
                                                        {getStatusBadge()}
                                                    </td>
                                                    {isCoordinator && (
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedTraining(t);
                                                                        setShowHistoryModal(true);
                                                                    }}
                                                                    className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="View history"
                                                                >
                                                                    <History className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveModule(actualIndex)}
                                                                    disabled={saving}
                                                                    className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                                    title="Remove module"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {isTrainee && (
                                <div className="md:hidden divide-y divide-gray-200">
                                    {filteredData.map((t, idx) => {
                                        const moduleName = typeof t.module === 'object' && 'name' in t.module
                                            ? t.module.name
                                            : 'Unknown Module';
                                        const moduleDescription = typeof t.module === 'object' && t.module.description
                                            ? t.module.description
                                            : '';

                                        const getStatusBadge = () => {
                                            if (t.signedOff) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>Completed</span>
                                                    </span>
                                                );
                                            }
                                            if (t.ojt || t.practical) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                                        <Clock className="w-3 h-3" />
                                                        <span>In Progress</span>
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                                    <AlertCircle className="w-3 h-3" />
                                                    <span>Not Started</span>
                                                </span>
                                            );
                                        };

                                        return (
                                            <div key={t._id?.toString() || idx} className="p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-semibold text-gray-900 mb-1">{moduleName}</h3>
                                                        {moduleDescription && (
                                                            <p className="text-xs text-gray-500">{moduleDescription}</p>
                                                        )}
                                                    </div>
                                                    {getStatusBadge()}
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-500 mb-1">OJT</p>
                                                        <div className="flex justify-center">
                                                            {t.ojt ? (
                                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                            ) : (
                                                                <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-500 mb-1">Practical</p>
                                                        <div className="flex justify-center">
                                                            {t.practical ? (
                                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                            ) : (
                                                                <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-500 mb-1">Sign Off</p>
                                                        <div className="flex justify-center">
                                                            {t.signedOff ? (
                                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                            ) : (
                                                                <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {t.notes && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <p className="text-xs text-gray-500 mb-1">Notes:</p>
                                                        <p className="text-xs text-gray-700">{t.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

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

            {showAddModal && isCoordinator && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-100">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 sm:px-6 sm:py-5 flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" />
                                Assign Training Module
                            </h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setSelectedModuleId('');
                                }}
                                disabled={addingModule}
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="px-5 py-5 sm:px-6 sm:py-6">
                            {unassignedModules.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                    <p className="text-gray-900 font-medium text-base mb-1">All modules assigned!</p>
                                    <p className="text-gray-600 text-sm mb-6">
                                        All available training modules have been assigned to this user.
                                    </p>
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors font-medium"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Module
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedModuleId}
                                                onChange={(e) => setSelectedModuleId(e.target.value)}
                                                className="w-full border text-gray-700 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                                disabled={addingModule}
                                            >
                                                <option value="">-- Choose a module --</option>
                                                {unassignedModules.map((module) => (
                                                    <option key={module._id?.toString()} value={module._id?.toString()}>
                                                        {module.name}
                                                        {module.description && ` - ${module.description}`}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                                                ▼
                                            </div>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>
                                                {unassignedModules.length} module
                                                {unassignedModules.length !== 1 ? 's' : ''} available
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => {
                                                setShowAddModal(false);
                                                setSelectedModuleId('');
                                            }}
                                            disabled={addingModule}
                                            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddModule}
                                            disabled={!selectedModuleId || addingModule}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                        >
                                            {addingModule ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Assigning...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-4 h-4" />
                                                    Assign Module
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showHistoryModal && selectedTraining && isCoordinator && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Training History</h2>
                                    <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                                        {typeof selectedTraining.module === 'object' ? selectedTraining.module.name : 'Unknown Module'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowHistoryModal(false);
                                        setSelectedTraining(null);
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-medium text-gray-900">Created</p>
                                        <p className="text-xs sm:text-sm text-gray-600 break-words">
                                            {selectedTraining.createdAt
                                                ? new Date(selectedTraining.createdAt).toLocaleString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg shrink-0">
                                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-medium text-gray-900">Last Updated</p>
                                        <p className="text-xs sm:text-sm text-gray-600 break-words">
                                            {selectedTraining.updatedAt
                                                ? new Date(selectedTraining.updatedAt).toLocaleString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-4">
                                    <p className="text-xs sm:text-sm font-medium text-gray-900 mb-3">Current Status</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                            <span className="text-xs sm:text-sm text-gray-700">OJT Completed</span>
                                            {selectedTraining.ojt ? (
                                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                                            ) : (
                                                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                            <span className="text-xs sm:text-sm text-gray-700">Practical Completed</span>
                                            {selectedTraining.practical ? (
                                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                                            ) : (
                                                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                            <span className="text-xs sm:text-sm text-gray-700">Signed Off</span>
                                            {selectedTraining.signedOff ? (
                                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                                            ) : (
                                                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {selectedTraining.notes && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Notes</p>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs sm:text-sm text-gray-700 break-words">{selectedTraining.notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 sm:mt-6 flex justify-end">
                                <button
                                    onClick={() => {
                                        setShowHistoryModal(false);
                                        setSelectedTraining(null);
                                    }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}