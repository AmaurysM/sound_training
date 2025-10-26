'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Save, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

interface User {
    _id: string;
    name: string;
    username: string;
    role: 'Coordinator' | 'Trainer' | 'Trainee';
    archived?: boolean;
}

interface ModuleTraining {
    module: string;
    ojt: boolean;
    practical: boolean;
    signedOff: boolean;
    notes: string;
}

const nataModules = ['Module 1', 'Module 2', 'Module 3', 'Module 4'];

export default function TrainingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = searchParams?.get('userId');

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [viewedUser, setViewedUser] = useState<User | null>(null);
    const [trainingData, setTrainingData] = useState<ModuleTraining[]>([]);
    const [originalData, setOriginalData] = useState<ModuleTraining[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch current user
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const res = await fetch('/api/me');
                if (!res.ok) {
                    throw new Error('Failed to fetch user data');
                }
                const user: User = await res.json();
                setCurrentUser(user);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load user');
                setLoading(false);
            }
        };

        fetchCurrentUser();
    }, []);

    // Fetch viewed user and their training data
    useEffect(() => {
        const fetchViewedUserAndTraining = async () => {
            if (!currentUser) return;

            try {
                setLoading(true);
                setError(null);

                // Determine which user to fetch
                let url = '/api/me';
                if (userId && currentUser.role !== 'Trainee') {
                    url = `/api/users/${userId}`;
                }

                const userRes = await fetch(url);
                if (!userRes.ok) {
                    throw new Error('Failed to fetch user data');
                }
                const user: User = await userRes.json();
                setViewedUser(user);

                // Fetch training data for the user
                const trainingRes = await fetch(`/api/training/${user._id}`);
                let modules: ModuleTraining[];

                if (trainingRes.ok) {
                    const data = await trainingRes.json();
                    modules = data.modules || initializeModules();
                } else {
                    // Initialize empty training data if none exists
                    modules = initializeModules();
                }

                setTrainingData(modules);
                setOriginalData(JSON.parse(JSON.stringify(modules)));
                setHasChanges(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load training data');
            } finally {
                setLoading(false);
            }
        };

        fetchViewedUserAndTraining();
    }, [currentUser, userId]);

    // Check for changes
    useEffect(() => {
        const changed = JSON.stringify(trainingData) !== JSON.stringify(originalData);
        setHasChanges(changed);
    }, [trainingData, originalData]);

    const initializeModules = (): ModuleTraining[] => {
        return nataModules.map((mod) => ({
            module: mod,
            ojt: false,
            practical: false,
            signedOff: false,
            notes: '',
        }));
    };

    const isEditable = currentUser && (currentUser.role === 'Coordinator' || currentUser.role === 'Trainer');

    const handleToggle = useCallback((index: number, field: keyof ModuleTraining) => {
        if (!isEditable) return;

        setTrainingData((prev) => {
            const updated = [...prev];
            const modules = updated[index];

            // Allow practical to be toggled independently
            if (field === 'signedOff' && (!modules.ojt || !modules.practical)) return prev;

            // Toggle the field
            updated[index] = { ...modules, [field]: !modules[field] };

            // Auto-uncheck dependent fields when unchecking a prerequisite
            if (field === 'ojt' && modules.ojt) {
                // Unchecking OJT still unchecks signOff only, leave practical as is
                updated[index].signedOff = false;
            } else if (field === 'practical' && modules.practical) {
                // Unchecking practical unchecks signOff
                updated[index].signedOff = false;
            }

            return updated;
        });
    }, [isEditable]);


    const handleNotesChange = useCallback((index: number, value: string) => {
        if (!isEditable) return;
        setTrainingData((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], notes: value };
            return updated;
        });
    }, [isEditable]);

    const handleSave = async () => {
        if (!viewedUser || !isEditable) return;

        try {
            setSaving(true);
            setError(null);
            setSaveSuccess(false);

            const res = await fetch(`/api/training/${viewedUser._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modules: trainingData }),
            });

            if (!res.ok) {
                throw new Error('Failed to save training data');
            }

            setOriginalData(JSON.parse(JSON.stringify(trainingData)));
            setHasChanges(false);
            setSaveSuccess(true);

            // Hide success message after 3 seconds
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

    const getProgressStats = () => {
        const completed = trainingData.filter(m => m.signedOff).length;
        const total = trainingData.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, total, percentage };
    };

    const stats = getProgressStats();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-600">Loading training data...</p>
                </div>
            </div>
        );
    }

    if (error && !currentUser) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-700 text-center">{error}</p>
                </div>
            </div>
        );
    }

    if (!currentUser || !viewedUser) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                {userId && (
                                    <button
                                        onClick={() => router.back()}
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        aria-label="Go back"
                                    >
                                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                                    </button>
                                )}
                                <h1 className="text-2xl font-semibold text-gray-900">
                                    {isEditable ? 'Trainee Training' : 'My Training'}
                                </h1>
                            </div>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">{viewedUser.name}</span> • {viewedUser.role}
                            </p>
                        </div>

                        {/* Progress Stats */}
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">{stats.percentage}%</p>
                                <p className="text-xs text-gray-600">Complete</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.completed}/{stats.total}
                                </p>
                                <p className="text-xs text-gray-600">Modules</p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${stats.percentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {/* Success Alert */}
                {saveSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-green-700 text-sm">Training data saved successfully!</p>
                    </div>
                )}

                {/* Training Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Module
                                    </th>
                                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        OJT
                                    </th>
                                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Practical
                                    </th>
                                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sign Off
                                    </th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Notes
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {trainingData.map((mod, idx) => (
                                    <tr key={mod.module} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {mod.module}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={mod.ojt}
                                                onChange={() => handleToggle(idx, 'ojt')}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                disabled={!isEditable}
                                                aria-label={`${mod.module} OJT`}
                                            />
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={mod.practical}
                                                onChange={() => handleToggle(idx, 'practical')}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                disabled={!isEditable}
                                                aria-label={`${mod.module} Practical`}
                                            />
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={mod.signedOff}
                                                onChange={() => handleToggle(idx, 'signedOff')}
                                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                disabled={!isEditable || !mod.ojt || !mod.practical}
                                                aria-label={`${mod.module} Sign Off`}
                                            />
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            <input
                                                type="text"
                                                value={mod.notes}
                                                onChange={(e) => handleNotesChange(idx, e.target.value)}
                                                placeholder={isEditable ? "Add notes..." : "No notes"}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                                                disabled={!isEditable}
                                                aria-label={`${mod.module} Notes`}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Action Buttons */}
                {isEditable && hasChanges && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
                        <p className="text-sm text-gray-600">
                            You have unsaved changes
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
        </div>
    );
}