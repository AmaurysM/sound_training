'use client';
import React from 'react';
import { Plus, X, CheckCircle2, FileText, Loader2, Check } from 'lucide-react';
import { ITrainingModule } from "@/models/types";
import { useDashboard } from '@/contexts/dashboard-context';

interface AddModuleModalProps {
  isCoordinator: boolean;
  modules: ITrainingModule[];
  onToggleModule: (id: string) => void;
  onAddModules: () => void;
}

const AddModuleModal: React.FC<AddModuleModalProps> = ({
  isCoordinator,
  modules,
  onToggleModule,
  onAddModules,
}) => {
  const {
    showAddModal,
    setShowAddModal,
    selectedModuleIds,
    addingModule,
  } = useDashboard();

  if (!showAddModal || !isCoordinator) return null;

  const isSelected = (id: string) => selectedModuleIds.includes(id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-100">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 sm:px-6 sm:py-5 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Assign Training Modules
          </h2>
          <button
            onClick={()=>setShowAddModal(false)}
            disabled={addingModule}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          {modules.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-900 font-medium text-base mb-1">
                All modules assigned!
              </p>
              <p className="text-gray-600 text-sm mb-6">
                All available training modules have been assigned to this user.
              </p>
              <button
                onClick={()=>setShowAddModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Tap modules to select or deselect:
                </p>
                <div className="flex flex-col gap-2">
                  {modules.map((module) => {
                    const id = module._id?.toString() || '';
                    const selected = isSelected(id);
                    return (
                      <button
                        key={id}
                        onClick={() => onToggleModule(id)}
                        disabled={addingModule}
                        className={`w-full flex items-start gap-3 border rounded-xl px-4 py-3 text-left transition-all ${selected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        <div
                          className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${selected
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300 bg-white'
                            }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{module.name}</p>
                          {module.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {module.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {selectedModuleIds.length > 0
                      ? `${selectedModuleIds.length} selected`
                      : `${modules.length} available`}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={()=>setShowAddModal(false)}
                  disabled={addingModule}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onAddModules}
                  disabled={selectedModuleIds.length === 0 || addingModule}
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
                      Assign {selectedModuleIds.length > 1 ? 'Modules' : 'Module'}
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
