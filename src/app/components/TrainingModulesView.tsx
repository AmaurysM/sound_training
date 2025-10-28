import { Search, Filter, Download, Plus, FileText, CheckCircle2, Clock, AlertCircle, History, X, MessageSquare, Save, UserCheck } from "lucide-react";
import { ISignature, ITraining, IUser, Role, Stat } from "@/models/types";
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
    saving
}: {
    currentUser: IUser
    viewedUser: IUser
    trainingData: ITraining[]
    setShowAddModal: (show: boolean) => void
    loadingModules: boolean
    fetchModules: () => Promise<void>
    stats: Stat
    setTrainingData: React.Dispatch<React.SetStateAction<ITraining[]>>
    setSelectedTraining: React.Dispatch<React.SetStateAction<ITraining | null>>
    setShowHistoryModal: React.Dispatch<React.SetStateAction<boolean>>
    setSaving: React.Dispatch<React.SetStateAction<boolean>>
    setError: React.Dispatch<React.SetStateAction<string | null>>
    error: string | null
    setOriginalData: React.Dispatch<React.SetStateAction<ITraining[]>>
    setSaveSuccess: React.Dispatch<React.SetStateAction<boolean>>
    saving: boolean
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
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [selectedSignatureIndex, setSelectedSignatureIndex] = useState<number | null>(null);

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

    const filteredData = getFilteredTrainingData();

    const handleExportData = () => {
        const csvContent = [
            ['Module', 'OJT', 'Practical', 'Signed Off', 'Trainer Signature', 'Coordinator Signature', 'Trainee Signature', 'Notes', 'Created'],
            ...trainingData.map(t => {
                const moduleName = typeof t.module === 'object' ? t.module.name : 'Unknown';
                const hasTrainerSig = (t.signatures || []).some(s => s.role === 'Trainer') ? 'Yes' : 'No';
                const hasCoordSig = (t.signatures || []).some(s => s.role === 'Coordinator') ? 'Yes' : 'No';
                const hasTraineeSig = (t.signatures || []).some(s => s.role === 'Trainee') ? 'Yes' : 'No';
                return [
                    moduleName,
                    t.ojt ? 'Yes' : 'No',
                    t.practical ? 'Yes' : 'No',
                    t.signedOff ? 'Yes' : 'No',
                    hasTrainerSig,
                    hasCoordSig,
                    hasTraineeSig,
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

    const handleToggle = useCallback(async (index: number, field: keyof ITraining) => {
        if (!isEditable) return;

        const training = trainingData[index];
        if (!training._id) return;

        const newValue = !training[field as keyof typeof training];
        setTrainingData((prev: ITraining[]) => {
            const updated = [...prev];
            const item = { ...updated[index] };

            if (field === 'ojt' || field === 'practical') {
                item[field] = newValue as boolean;

                if (!newValue) {
                    item.signedOff = false;
                    item.signatures = [];
                }
            }

            updated[index] = item;
            return updated;
        });

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatePayload: any = { [field]: newValue };

            if (!newValue && (field === 'ojt' || field === 'practical')) {
                updatePayload.signatures = [];
                updatePayload.signedOff = false;
            }

            const res = await fetch(`/api/trainings/${training._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (!res.ok) throw new Error('Failed to update training');

            const updated = await res.json();

            setTrainingData((prev) => {
                const newData = [...prev];
                newData[index] = updated;
                return newData;
            });
            setOriginalData((prev) => {
                const newData = [...prev];
                newData[index] = updated;
                return newData;
            });

        } catch (err) {
            console.error('Failed to toggle field:', err);
            setError('Failed to update training');
            setTimeout(() => setError(null), 3000);

            setTrainingData((prev) => {
                const updated = [...prev];
                updated[index] = training;
                return updated;
            });
        }
    }, [isEditable, trainingData, setTrainingData, setError, setOriginalData]);

    const handleOpenNoteModal = (index: number) => {
        const training = filteredData[index];
        const actualIndex = trainingData.indexOf(training);
        setSelectedNoteIndex(actualIndex);
        setNoteText(training.notes || '');
        setShowNoteModal(true);
    };

    const handleOpenSignatureModal = (index: number) => {
        const training = filteredData[index];
        const actualIndex = trainingData.indexOf(training);

        if (!training.ojt || !training.practical) {
            setError('Complete OJT and Practical before signing off');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setSelectedSignatureIndex(actualIndex);
        setShowSignatureModal(true);
    };

    const handleSaveNote = async () => {
        if (selectedNoteIndex === null) return;

        const training = trainingData[selectedNoteIndex];
        if (!training._id) return;

        try {
            setSaving(true);

            const res = await fetch(`/api/trainings/${training._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: noteText }),
            });

            if (!res.ok) throw new Error('Failed to save note');

            const updated = await res.json();

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

    const addSignature = async (role: Role) => {
        if (selectedSignatureIndex === null || !currentUser) return;

        setSaving(true);
        setError(null);

        try {
            const training = trainingData[selectedSignatureIndex];
            if (!training._id) {
                throw new Error('Training ID not found');
            }

            const existingSignatures = training.signatures || [];
            const existingUserIds = existingSignatures.map(s => s.userId);

            if (existingUserIds.includes(currentUser._id || '')) {
                throw new Error('You have already signed this training');
            }

            const newSignature: ISignature = {
                userId: currentUser._id || '',
                userName: currentUser.name,
                role,
                signedAt: new Date(),
            };

            setTrainingData((prev) => {
                const updated = [...prev];
                const item = { ...updated[selectedSignatureIndex] };

                if (!item.signatures) item.signatures = [];
                item.signatures = [...item.signatures, newSignature];

                const trainerSig = item.signatures.some(s => s.role === 'Trainer');
                const coordSig = item.signatures.some(s => s.role === 'Coordinator');
                const traineeSig = item.signatures.some(s => s.role === 'Trainee');

                if (trainerSig && coordSig && traineeSig) {
                    item.signedOff = true;
                }

                updated[selectedSignatureIndex] = item;
                return updated;
            });

            const updatedSignatures = [...(training.signatures || []), newSignature];

            const trainerSig = updatedSignatures.some(s => s.role === 'Trainer');
            const coordSig = updatedSignatures.some(s => s.role === 'Coordinator');
            const traineeSig = updatedSignatures.some(s => s.role === 'Trainee');
            const shouldSignOff = trainerSig && coordSig && traineeSig;

            const updatePayload = {
                signatures: updatedSignatures,
                signedOff: shouldSignOff
            };

            const res = await fetch(`/api/trainings/${training._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to add signature: ${res.status}`);
            }

            const serverUpdated: ITraining = await res.json();

            setTrainingData(prev => {
                const updated = [...prev];
                if (updated[selectedSignatureIndex]) {
                    updated[selectedSignatureIndex] = serverUpdated;
                }
                return updated;
            });

            setOriginalData(prev => {
                const updated = [...prev];
                if (updated[selectedSignatureIndex]) {
                    updated[selectedSignatureIndex] = serverUpdated;
                }
                return updated;
            });

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);

            if (shouldSignOff) {
                setShowSignatureModal(false);
            }

        } catch (err) {
            console.error('Failed to add signature:', err);
            setError(err instanceof Error ? err.message : 'Failed to add signature');
            setTimeout(() => setError(null), 3000);

            fetchModules();
        } finally {
            setSaving(false);
        }
    };

    const removeSignature = async (signatureIndex: number) => {
        if (selectedSignatureIndex === null) return;

        const training = trainingData[selectedSignatureIndex];
        if (!training._id) return;

        try {
            setSaving(true);

            const updatedSignatures = training.signatures.filter((_, i) => i !== signatureIndex);

            const res = await fetch(`/api/trainings/${training._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signatures: updatedSignatures }),
            });

            if (!res.ok) throw new Error('Failed to remove signature');

            const updated = await res.json();

            setTrainingData((prev) => {
                const newData = [...prev];
                newData[selectedSignatureIndex] = updated;
                return newData;
            });
            setOriginalData((prev) => {
                const newData = [...prev];
                newData[selectedSignatureIndex] = updated;
                return newData;
            });

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);

        } catch (err) {
            console.error('Failed to remove signature:', err);
            setError('Failed to remove signature');
            setTimeout(() => setError(null), 3000);
        } finally {
            setSaving(false);
        }
    };

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
    }, [isCoordinator, trainingData, setTrainingData, setError, setOriginalData, setSaveSuccess, setSaving]);

    useEffect(() => {
        fetchModules();
    }, [fetchModules]);

    const getStatusBadge = (t: ITraining) => {
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

                            <button
                                onClick={handleExportData}
                                disabled={trainingData.length === 0}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Export</span>
                            </button>

                            {isCoordinator && (
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

            {/* Training Data Display */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {filteredData.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center">
                        <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                            {trainingData.length === 0 ? 'No training modules assigned' : 'No modules match your filters'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            {trainingData.length === 0 && isCoordinator
                                ? 'Click "Assign" to get started'
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
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                            Module
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                                            OJT
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                                            Practical
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                                            Signatures
                                        </th>
                                        {!isTrainee && (
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                                                Notes
                                            </th>
                                        )}
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                                            Status
                                        </th>
                                        {isCoordinator && (
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
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

                                        const trainerSignatures = (t.signatures || []).filter(s => s.role === 'Trainer').length;
                                        const hasCoordinatorSignature = (t.signatures || []).some(s => s.role === 'Coordinator');
                                        const hasTraineeSignature = (t.signatures || []).some(s => s.role === 'Trainee');

                                        return (
                                            <tr key={t._id?.toString() || idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => router.push(`/dashboard/module/${t._id}`)}
                                                        className="text-sm font-medium text-gray-900 hover:underline hover:text-blue-800 transition-colors text-left"
                                                    >
                                                        {moduleName}
                                                    </button>
                                                    {typeof t.module === 'object' && t.module.description && (
                                                        <p className="text-xs text-gray-500 mt-0.5">{t.module.description}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={t.ojt}
                                                        onChange={() => handleToggle(actualIndex, 'ojt')}
                                                        disabled={!isEditable}
                                                        className="w-5 h-5 cursor-pointer disabled:cursor-not-allowed text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={t.practical}
                                                        onChange={() => handleToggle(actualIndex, 'practical')}
                                                        disabled={!isEditable}
                                                        className="w-5 h-5 cursor-pointer disabled:cursor-not-allowed text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {isEditable ? (
                                                        <button
                                                            onClick={() => handleOpenSignatureModal(idx)}
                                                            disabled={!t.ojt || !t.practical}
                                                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                                                        >
                                                            <UserCheck className="w-3 h-3" />
                                                            T:{trainerSignatures > 0 ? '✓' : '✗'} C:{hasCoordinatorSignature ? '✓' : '✗'} S:{hasTraineeSignature ? '✓' : '✗'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-600">
                                                            T:{trainerSignatures > 0 ? '✓' : '✗'} C:{hasCoordinatorSignature ? '✓' : '✗'} S:{hasTraineeSignature ? '✓' : '✗'}
                                                        </span>
                                                    )}
                                                </td>
                                                {!isTrainee && (
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => handleOpenNoteModal(idx)}
                                                            className={`p-2 rounded-lg transition-colors ${t.notes
                                                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                                }`}
                                                            title={t.notes || 'Add note'}
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-center">
                                                    {getStatusBadge(t)}
                                                </td>
                                                {isCoordinator && (
                                                    <td className="px-4 py-3 text-center">
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

                        {/* Mobile/Tablet Card View */}
                        <div className="lg:hidden divide-y divide-gray-200">
                            {filteredData.map((t, idx) => {
                                const actualIndex = trainingData.indexOf(t);
                                const moduleName = typeof t.module === 'object' && 'name' in t.module
                                    ? t.module.name
                                    : 'Unknown Module';
                                const moduleDescription = typeof t.module === 'object' && t.module.description
                                    ? t.module.description
                                    : '';

                                const trainerSignatures = (t.signatures || []).filter(s => s.role === 'Trainer').length;
                                const hasCoordinatorSignature = (t.signatures || []).some(s => s.role === 'Coordinator');
                                const hasTraineeSignature = (t.signatures || []).some(s => s.role === 'Trainee');

                                return (
                                    <div key={t._id?.toString() || idx} className="p-4 hover:bg-gray-50 transition-colors">
                                        {/* Header with Module Name and Status */}
                                        <div className="flex justify-between items-start gap-3 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <button
                                                    onClick={() => router.push(`/dashboard/module/${t._id}`)}
                                                    className="text-sm font-medium text-gray-900 hover:underline hover:text-blue-800 transition-colors block"
                                                >
                                                    {moduleName}
                                                </button>
                                                {moduleDescription && (
                                                    <p className="text-xs text-gray-500 mt-1">{moduleDescription}</p>
                                                )}
                                            </div>
                                            {getStatusBadge(t)}
                                        </div>

                                        {/* Progress Checkboxes */}
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                                <input
                                                    type="checkbox"
                                                    checked={t.ojt}
                                                    onChange={() => handleToggle(actualIndex, 'ojt')}
                                                    disabled={!isEditable}
                                                    className="w-5 h-5 cursor-pointer disabled:cursor-not-allowed text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                                                />
                                                <span className="text-sm text-gray-700 font-medium">OJT</span>
                                            </div>
                                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                                <input
                                                    type="checkbox"
                                                    checked={t.practical}
                                                    onChange={() => handleToggle(actualIndex, 'practical')}
                                                    disabled={!isEditable}
                                                    className="w-5 h-5 cursor-pointer disabled:cursor-not-allowed text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                                                />
                                                <span className="text-sm text-gray-700 font-medium">Practical</span>
                                            </div>
                                        </div>

                                        {/* Signatures Section */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-gray-500 uppercase">Signatures</span>
                                                {isEditable && (
                                                    <button
                                                        onClick={() => handleOpenSignatureModal(idx)}
                                                        disabled={!t.ojt || !t.practical}
                                                        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                                    >
                                                        Manage
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex gap-2 text-xs">
                                                <div className={`flex-1 p-2 rounded-lg text-center ${trainerSignatures > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                                                    <div className="font-medium">Trainer</div>
                                                    <div className="text-lg">{trainerSignatures > 0 ? '✓' : '✗'}</div>
                                                </div>
                                                <div className={`flex-1 p-2 rounded-lg text-center ${hasCoordinatorSignature ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                                                    <div className="font-medium">Coord</div>
                                                    <div className="text-lg">{hasCoordinatorSignature ? '✓' : '✗'}</div>
                                                </div>
                                                <div className={`flex-1 p-2 rounded-lg text-center ${hasTraineeSignature ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                                                    <div className="font-medium">Trainee</div>
                                                    <div className="text-lg">{hasTraineeSignature ? '✓' : '✗'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notes and Actions */}
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                            {!isTrainee && (
                                                <button
                                                    onClick={() => handleOpenNoteModal(idx)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${t.notes
                                                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    <span>{t.notes ? 'View Note' : 'Add Note'}</span>
                                                </button>
                                            )}
                                            
                                            {isCoordinator && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTraining(t);
                                                            setShowHistoryModal(true);
                                                        }}
                                                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View history"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveModule(actualIndex)}
                                                        disabled={saving}
                                                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Remove module"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Show notes preview for trainees */}
                                        {isTrainee && t.notes && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <p className="text-xs text-gray-500 mb-1">Notes:</p>
                                                <p className="text-sm text-gray-700">{t.notes}</p>
                                            </div>
                                        )}
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
                            <h3 className="text-lg font-semibold text-gray-900">Training Notes</h3>
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
                                className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                disabled={!isEditable}
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
                                Cancel
                            </button>
                            {isEditable && (
                                <button
                                    onClick={handleSaveNote}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Note
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Modal */}
            {showSignatureModal && selectedSignatureIndex !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Sign Off Training</h3>
                            <button
                                onClick={() => {
                                    setShowSignatureModal(false);
                                    setSelectedSignatureIndex(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Requirements:</strong> 1 Trainer + 1 Coordinator + 1 Trainee signature
                                </p>
                            </div>

                            {/* Current Signatures */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Current Signatures</h4>
                                {(() => {
                                    const training = trainingData[selectedSignatureIndex];
                                    const signatures = training?.signatures || [];

                                    return signatures.length > 0 ? (
                                        <div className="space-y-2">
                                            {signatures.map((sig, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <UserCheck className={`w-5 h-5 ${sig.role === 'Coordinator' ? 'text-purple-600' :
                                                            sig.role === 'Trainer' ? 'text-blue-600' :
                                                                'text-green-600'
                                                            }`} />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{sig.userName}</p>
                                                            <p className="text-xs text-gray-500">{sig.role} • {new Date(sig.signedAt).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    {isEditable && (
                                                        <button
                                                            onClick={() => removeSignature(idx)}
                                                            className="text-red-600 hover:text-red-800 p-1"
                                                            title="Remove signature"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 text-center py-4">No signatures yet</p>
                                    );
                                })()}
                            </div>

                            {/* Add Signature Buttons */}
                            {isEditable && (
                                <div>
                                    {error && (
                                        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {error}
                                        </div>
                                    )}

                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Add Signature</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {(() => {
                                            const training = trainingData[selectedSignatureIndex];
                                            const signatures = training?.signatures || [];
                                            const hasTrainerSig = signatures.some(s => s.role === 'Trainer');

                                            return (
                                                <button
                                                    onClick={() => addSignature('Trainer')}
                                                    disabled={hasTrainerSig}
                                                    className="px-4 py-3 border-2 border-blue-300 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                    <span>Trainer</span>
                                                    {hasTrainerSig && (
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })()}

                                        {isCoordinator && (() => {
                                            const training = trainingData[selectedSignatureIndex];
                                            const signatures = training?.signatures || [];
                                            const hasCoordinatorSig = signatures.some(s => s.role === 'Coordinator');

                                            return (
                                                <button
                                                    onClick={() => addSignature('Coordinator')}
                                                    disabled={hasCoordinatorSig}
                                                    className="px-4 py-3 border-2 border-purple-300 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                    <span>Coordinator</span>
                                                    {hasCoordinatorSig && (
                                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })()}

                                        {(() => {
                                            const training = trainingData[selectedSignatureIndex];
                                            const signatures = training?.signatures || [];
                                            const hasTraineeSig = signatures.some(s => s.role === 'Trainee');
                                            const isTraineeForThisTraining = training.user === currentUser._id;

                                            return (
                                                <button
                                                    onClick={() => addSignature('Trainee')}
                                                    disabled={hasTraineeSig || !isTraineeForThisTraining}
                                                    className="px-4 py-3 border-2 border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                    <span>Trainee</span>
                                                    {hasTraineeSig && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => {
                                    setShowSignatureModal(false);
                                    setSelectedSignatureIndex(null);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default TrainingModulesView;