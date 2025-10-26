'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, Save } from 'lucide-react';
import { IUser } from '@/models/User';
import { ITraining } from '@/models/Training';

export default function TrainingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = searchParams?.get('userId');

    const [currentUser, setCurrentUser] = useState<IUser | null>(null);
    const [viewedUser, setViewedUser] = useState<IUser | null>(null);
    const [trainingData, setTrainingData] = useState<ITraining[]>([]);
    const [originalData, setOriginalData] = useState<ITraining[]>([]);
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

    // Fetch viewed user with populated trainings/modules
    useEffect(() => {
        const fetchViewedUserAndTraining = async () => {
            if (!currentUser) return;
            try {
                setLoading(true);
                setError(null);

                const url =
                    userId && currentUser.role !== 'Trainee'
                        ? `/api/users/${userId}`
                        : '/api/me';

                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to fetch viewed user');

                const user: IUser = await res.json();
                setViewedUser(user);

                // trainings already populated with module info
                const trainings = (user.trainings || []) as ITraining[];
                setTrainingData(trainings);
                setOriginalData(JSON.parse(JSON.stringify(trainings)));
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

    const isEditable =
        currentUser && (currentUser.role === 'Coordinator' || currentUser.role === 'Trainer');

    // Toggle logic
    const handleToggle = useCallback(
        (index: number, field: keyof ITraining) => {
            if (!isEditable) return;

            setTrainingData((prev) => {
                const updated = [...prev];
                const item = updated[index];

                if (field === 'signedOff' && (!item.ojt || !item.practical)) {
                    return prev;
                }

                const newValue = !item[field as keyof Pick<ITraining, 'ojt' | 'practical' | 'signedOff'>];
                (item[field as 'ojt' | 'practical' | 'signedOff'] as boolean) = newValue as boolean;

                if ((field === 'ojt' || field === 'practical') && !newValue) {
                    item.signedOff = false;
                }

                return updated;
            });
        },
        [isEditable]
    );

    const handleNotesChange = useCallback((index: number, value: string) => {
        setTrainingData((prev) => {
            const updated = [...prev];
            updated[index].notes = value;
            return updated;
        });
    }, []); 
    
    const handleNotesChangeWithCheck = useCallback((index: number, value: string) => {
        if (!isEditable) return;

        setTrainingData((prev) => {
            const updated = [...prev];
            updated[index].notes = value;
            return updated;
        });
    }, [isEditable]);

    const handleSave = async () => {
        if (!viewedUser || !isEditable) return;

        try {
            setSaving(true);
            setError(null);
            setSaveSuccess(false);

            const res = await fetch(`/api/users/${viewedUser._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trainings: trainingData }),
            });

            if (!res.ok) throw new Error('Failed to save training data');

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

    const getProgressStats = () => {
        const completed = trainingData.filter((m) => m.signedOff).length;
        const total = trainingData.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, total, percentage };
    };

    const stats = getProgressStats();

    if (loading)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
            </div>
        );

    if (error && !currentUser)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white border border-red-200 p-6 rounded-lg">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-center text-red-700">{error}</p>
                </div>
            </div>
        );

    if (!currentUser || !viewedUser) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            {userId && (
                                <button
                                    onClick={() => router.back()}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                                </button>
                            )}
                            <h1 className="text-2xl font-semibold">
                                {isEditable ? 'Trainee Training' : 'My Training'}
                            </h1>
                        </div>
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">{viewedUser.name}</span> • {viewedUser.role}
                        </p>
                    </div>

                    <div className="flex gap-6">
                        <div className="text-right">
                            <p className="text-2xl font-bold">{stats.percentage}%</p>
                            <p className="text-xs text-gray-600">Complete</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold">
                                {stats.completed}/{stats.total}
                            </p>
                            <p className="text-xs text-gray-600">Modules</p>
                        </div>
                    </div>
                </div>

                {/* Error / Success Alerts */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}
                {saveSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <p className="text-green-700 text-sm">Training data saved successfully!</p>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Module
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    OJT
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Practical
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Sign Off
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Notes
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {trainingData.map((t, idx) => (
                                <tr key={t._id?.toString()} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {typeof t.module === 'object' && 'name' in t.module
                                            ? t.module.name
                                            : 'Unknown Module'}
                                    </td>
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={t.ojt}
                                            onChange={() => handleToggle(idx, 'ojt')}
                                            disabled={!isEditable}
                                        />
                                    </td>
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={t.practical}
                                            onChange={() => handleToggle(idx, 'practical')}
                                            disabled={!isEditable}
                                        />
                                    </td>
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={t.signedOff}
                                            onChange={() => handleToggle(idx, 'signedOff')}
                                            disabled={!isEditable || !t.ojt || !t.practical}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            value={t.notes}
                                            onChange={(e) => handleNotesChange(idx, e.target.value)}
                                            className="w-full border rounded-md px-3 py-2 text-sm"
                                            disabled={!isEditable}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Save / Cancel */}
                {isEditable && hasChanges && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                        <p className="text-sm text-gray-600">You have unsaved changes</p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
