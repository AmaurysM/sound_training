import { Search, Filter, Download, Plus, FileText, CheckCircle2, Clock, AlertCircle, History, X, MessageSquare, Save, UserCheck } from "lucide-react";
import { ISignature, ITraining, IUser, Stat } from "@/models/types";
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

    const filteredData = getFilteredTrainingData(); // ✅ MOVED: Define filteredData here

    const handleExportData = () => {
        const csvContent = [
            ['Module', 'OJT', 'Practical', 'Signed Off', 'Trainer Signatures', 'Coordinator Signature', 'Notes', 'Created'],
            ...trainingData.map(t => {
                const moduleName = typeof t.module === 'object' ? t.module.name : 'Unknown';
                const trainerSigs = (t.signatures || []).filter(s => s.role === 'Trainer').length;
                const coordSig = (t.signatures || []).filter(s => s.role === 'Coordinator').length > 0 ? 'Yes' : 'No';
                return [
                    moduleName,
                    t.ojt ? 'Yes' : 'No',
                    t.practical ? 'Yes' : 'No',
                    t.signedOff ? 'Yes' : 'No',
                    `${trainerSigs}/2`,
                    coordSig,
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

    // ✅ UPDATE: Properly sync OJT/Practical changes with backend
    const handleToggle = useCallback(async (index: number, field: keyof ITraining) => {
        if (!isEditable) return;

        const training = trainingData[index];
        if (!training._id) return;

        // Optimistically update UI
        const newValue = !training[field as keyof typeof training];
        setTrainingData((prev: ITraining[]) => {
            const updated = [...prev];
            const item = { ...updated[index] };

            if (field === 'ojt' || field === 'practical') {
                item[field] = newValue as boolean;

                // If turning off OJT or Practical, reset signatures and sign-off
                if (!newValue) {
                    item.signedOff = false;
                    item.signatures = [];
                }
            }

            updated[index] = item;
            return updated;
        });

        // Sync with backend
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatePayload: any = { [field]: newValue };

            // If turning off, also clear signatures
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

            // Update with server response
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

            // Revert optimistic update
            setTrainingData((prev) => {
                const updated = [...prev];
                updated[index] = training;
                return updated;
            });
        }
    }, [isEditable, trainingData, setTrainingData, setError, setOriginalData]);

    // ✅ FIXED: Use filteredData which is now defined
    const handleOpenNoteModal = (index: number) => {
        const training = filteredData[index];
        const actualIndex = trainingData.indexOf(training);
        setSelectedNoteIndex(actualIndex);
        setNoteText(training.notes || '');
        setShowNoteModal(true);
    };

    // ✅ FIXED: Use filteredData which is now defined
    const handleOpenSignatureModal = (index: number) => {
        const training = filteredData[index];
        const actualIndex = trainingData.indexOf(training);

        // Check prerequisites
        if (!training.ojt || !training.practical) {
            setError('Complete OJT and Practical before signing off');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setSelectedSignatureIndex(actualIndex);
        setShowSignatureModal(true);
    };

    // ✅ UPDATE: Sync notes with backend
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

    // ✅ FIXED: Proper signature logic with consistent state management
    const addSignature = async (role: 'Trainer' | 'Coordinator') => {
        if (selectedSignatureIndex === null || !currentUser) return;

        setSaving(true);
        setError(null);

        try {
            const training = trainingData[selectedSignatureIndex];
            if (!training._id) {
                throw new Error('Training ID not found');
            }

            // Create the new signature
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

                // Check if all signatures are complete
                const trainerSigs = item.signatures.filter(s => s.role === 'Trainer').length;
                const coordSig = item.signatures.some(s => s.role === 'Coordinator');

                if (trainerSigs >= 2 && coordSig) {
                    item.signedOff = true;
                }

                updated[selectedSignatureIndex] = item;
                return updated;
            });

            // Create updated signatures array
            const updatedSignatures = [...(training.signatures || []), newSignature];

            // Calculate signedOff status
            const trainerSigs = updatedSignatures.filter(s => s.role === 'Trainer').length;
            const coordSig = updatedSignatures.some(s => s.role === 'Coordinator');
            const shouldSignOff = trainerSigs >= 2 && coordSig;

            // Prepare the update payload - send the entire signatures array
            const updatePayload = {
                signatures: updatedSignatures,
                signedOff: shouldSignOff
            };

            // Make API call
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

            // Update state with server response
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

            // Close modal if signed off or if coordinator signed
            if (shouldSignOff) {
                setShowSignatureModal(false);
            }

        } catch (err) {
            console.error('Failed to add signature:', err);
            setError(err instanceof Error ? err.message : 'Failed to add signature');
            setTimeout(() => setError(null), 3000);

            // Revert optimistic updates by refreshing data
            fetchModules();
        } finally {
            setSaving(false);
        }
    };

    // ✅ UPDATE: Sync signature removal with backend
    const removeSignature = async (signatureIndex: number) => {
        if (selectedSignatureIndex === null) return;

        const training = trainingData[selectedSignatureIndex];
        if (!training._id) return;

        try {
            setSaving(true);

            // Remove signature locally first
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

    // ✅ UPDATE: Sync "Sign as All" with backend
    const handleSignAsAll = async () => {
        if (selectedSignatureIndex === null || !currentUser || !isCoordinator) return;

        const training = trainingData[selectedSignatureIndex];
        if (!training._id) return;

        try {
            setSaving(true);

            const allSignatures: ISignature[] = [
                {
                    userId: currentUser._id || '',
                    userName: currentUser.name,
                    role: 'Trainer',
                    signedAt: new Date()
                },
                {
                    userId: currentUser._id || '',
                    userName: currentUser.name,
                    role: 'Trainer',
                    signedAt: new Date()
                },
                {
                    userId: currentUser._id || '',
                    userName: currentUser.name,
                    role: 'Coordinator',
                    signedAt: new Date()
                }
            ];

            const res = await fetch(`/api/trainings/${training._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signatures: allSignatures,
                    signedOff: true
                }),
            });

            if (!res.ok) throw new Error('Failed to sign off');

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

            setShowSignatureModal(false);

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);

        } catch (err) {
            console.error('Failed to sign as all:', err);
            setError('Failed to complete sign off');
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
    return (
        <>
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

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                                            Signatures
                                        </th>
                                        {!isTrainee && (
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
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

                                        const trainerSignatures = (t.signatures || []).filter(s => s.role === 'Trainer').length;
                                        const hasCoordinatorSignature = (t.signatures || []).some(s => s.role === 'Coordinator');

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
                                                            {/* <p className="text-sm font-medium text-gray-900">{moduleName}</p>
                                                            {typeof t.module === 'object' && t.module.description && (
                                                                <p className="text-xs text-gray-500 mt-0.5">{t.module.description}</p>
                                                            )} */}
                                                            <button
                                                                onClick={() => router.push(`/dashboard/module/${t._id}`)}
                                                                className="text-sm font-medium text-gray-900 hover:underline hover:text-blue-800 transition-colors"
                                                            >
                                                                {moduleName}
                                                            </button>

                                                            {/* Description below */}
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
                                                        {isEditable ? (
                                                            <button
                                                                onClick={() => handleOpenSignatureModal(idx)}
                                                                disabled={!t.ojt || !t.practical}
                                                                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 whitespace-nowrap"
                                                            >
                                                                {/* Full label on medium+ screens */}
                                                                <span className="hidden md:flex items-center gap-1">
                                                                    <UserCheck className="w-3 h-3" />
                                                                    {trainerSignatures}/2 + {hasCoordinatorSignature ? '✓' : '✗'}
                                                                </span>

                                                                {/* Compact version on small screens */}
                                                                <span className="flex md:hidden items-center gap-1">
                                                                    <UserCheck className="w-3 h-3" />
                                                                    {trainerSignatures}/2
                                                                    {hasCoordinatorSignature ? '✓' : '✗'}
                                                                </span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-600">
                                                                {trainerSignatures}/2 Trainers, {hasCoordinatorSignature ? '✓' : '✗'} Coord
                                                            </span>
                                                        )}
                                                        {(!t.ojt || !t.practical) && (
                                                            <span className="text-xs text-gray-400">Prerequisites required</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {!isTrainee && (
                                                    <td className="px-6 py-4 text-center">
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

                                    const trainerSignatures = (t.signatures || []).filter(s => s.role === 'Trainer').length;
                                    const hasCoordinatorSignature = (t.signatures || []).some(s => s.role === 'Coordinator');

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
                                                    <p className="text-xs text-gray-500 mb-1">Signatures</p>
                                                    <div className="flex justify-center">
                                                        <span className="text-xs text-gray-700">
                                                            {trainerSignatures}/2 + {hasCoordinatorSignature ? '✓' : '✗'}
                                                        </span>
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
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
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
                                    <strong>Requirements:</strong> 2 Trainer signatures + 1 Coordinator signature
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
                                                        <UserCheck className={`w-5 h-5 ${sig.role === 'Coordinator' ? 'text-purple-600' : 'text-blue-600'}`} />
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
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Add Signature</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(() => {
                                            const training = trainingData[selectedSignatureIndex];
                                            const signatures = training?.signatures || [];
                                            const trainerSignatures = signatures.filter(s => s.role === 'Trainer').length;

                                            return (
                                                <button
                                                    onClick={() => addSignature('Trainer')}
                                                    disabled={trainerSignatures >= 2}
                                                    className="px-4 py-3 border-2 border-blue-300 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                    Sign as Trainer
                                                    {trainerSignatures > 0 && (
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                            {trainerSignatures}/2
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
                                                    Sign as Coordinator
                                                    {hasCoordinatorSig && (
                                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                                            Signed
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })()}
                                    </div>

                                    {isCoordinator && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <button
                                                onClick={handleSignAsAll}
                                                className="w-full px-4 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Sign Off Completely (All Signatures)
                                            </button>
                                            <p className="text-xs text-gray-500 text-center mt-2">
                                                This will add all required signatures and complete the training
                                            </p>
                                        </div>
                                    )}
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