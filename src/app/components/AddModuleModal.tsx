'use client';
import React from 'react';
import { Plus, X, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { ITrainingModule } from '../dashboard/train/[id]/page';

// interface Module {
//     _id?: string;
//     name: string;
//     description?: string;
// }

interface AddModuleModalProps {
    show: boolean;
    isCoordinator: boolean;
    unassignedModules: ITrainingModule[];
    selectedModuleId: string;
    addingModule: boolean;
    onClose: () => void;
    onSelectModule: (id: string) => void;
    onAddModule: () => void;
}

const AddModuleModal: React.FC<AddModuleModalProps> = ({
    show,
    isCoordinator,
    unassignedModules,
    selectedModuleId,
    addingModule,
    onClose,
    onSelectModule,
    onAddModule,
}) => {
    if (!show || !isCoordinator) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-100">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 sm:px-6 sm:py-5 flex justify-between items-center">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-600" />
                        Assign Training Module
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={addingModule}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-5 sm:px-6 sm:py-6">
                    {unassignedModules.length === 0 ? (
                        // ✅ All modules assigned
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            <p className="text-gray-900 font-medium text-base mb-1">
                                All modules assigned!
                            </p>
                            <p className="text-gray-600 text-sm mb-6">
                                All available training modules have been assigned to this user.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        // ✅ Module select + actions
                        <>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Module
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedModuleId}
                                        onChange={(e) => onSelectModule(e.target.value)}
                                        className="w-full border text-gray-700 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                        disabled={addingModule}
                                    >
                                        <option value="">-- Choose a module --</option>
                                        {unassignedModules.map((module) => (
                                            <option
                                                key={module._id?.toString()}
                                                value={module._id?.toString()}
                                            >
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

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                <button
                                    onClick={onClose}
                                    disabled={addingModule}
                                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onAddModule}
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
    );
};

export default AddModuleModal;
