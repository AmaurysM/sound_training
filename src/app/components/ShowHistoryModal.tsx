'use client';
import React, { useEffect, useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  FileText,
  Award,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import { IUserModule, IUserSubmodule } from '@/models/types';

interface TrainingHistoryModalProps {
  show: boolean;
  training: IUserModule | null;
  isCoordinator: boolean;
  onClose: () => void;
}

export default function TrainingHistoryModal({
  show,
  training,
  isCoordinator,
  onClose,
}: TrainingHistoryModalProps) {
  const [submodules, setSubmodules] = useState<IUserSubmodule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
      const [showDeleted, setShowDeleted] = useState(false);

  const isSubmoduleComplete = (submodule: IUserSubmodule) => {
    if (!submodule.ojt) return false;

    const sigs = submodule.signatures || [];
    const hasCoordinator = sigs.some(s => s.role === 'Coordinator' && !s.deleted);
    const hasTrainer = sigs.some(s => s.role === 'Trainer' && !s.deleted);
    const hasTrainee = sigs.some(s => s.role === 'Trainee' && !s.deleted);

    if (!hasCoordinator || !hasTrainer || !hasTrainee) return false;

    if (submodule.tSubmodule && typeof submodule.tSubmodule !== 'string') {
      if (submodule.tSubmodule.requiresPractical && !submodule.practical) {
        return false;
      }
    }

    return true;
  };

  useEffect(() => {
    if (show && training && training._id) {
      fetchSubmodules();
    }
  }, [show, training]);

  const fetchSubmodules = async () => {
    if (!training?._id) return;

    setLoading(true);
    setError(null);

    try {
      const userId =
        typeof training.user === 'string' ? training.user : training.user?._id;

      if (!userId) throw new Error('User ID not found');

      const res = await fetch(
        `/api/users/${userId}/modules/${training._id}/submodules/history`
      );

      if (!res.ok) throw new Error('Failed to fetch submodule history');

      const response = await res.json();
      const data = response.data || response;

      setSubmodules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching submodules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load history');
      setSubmodules([]);
    } finally {
      setLoading(false);
    }
  };

  if (!show || !training || !isCoordinator) return null;

  const moduleName =
    typeof training.tModule === 'string'
      ? 'Unknown Module'
      : training.tModule?.name || 'Unknown Module';

  const totalSubmodules = submodules.length;
  const completedSubmodules = submodules.filter(s => isSubmoduleComplete(s)).length;
  const progressPercentage =
    totalSubmodules > 0
      ? Math.round((completedSubmodules / totalSubmodules) * 100)
      : 0;
      

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-5xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900">
                Training History — <span className="text-blue-700">{moduleName}</span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors shrink-0"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="space-y-4">
            {/* Compact Summary Section */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-center">
                <Calendar className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-blue-900 font-semibold">Assigned</p>
                <p className="text-xs text-blue-700">
                  {training.createdAt
                    ? new Date(training.createdAt).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>

              <div className="p-2 bg-green-50 rounded-lg border border-green-100 text-center">
                <Clock className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-green-900 font-semibold">Last Activity</p>
                <p className="text-xs text-green-700">
                  {training.updatedAt
                    ? new Date(training.updatedAt).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>

              <div className="p-2 bg-purple-50 rounded-lg border border-purple-100 text-center">
                <Award className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                <p className="text-xs text-purple-900 font-semibold">Progress</p>
                <p className="text-xs text-purple-700 font-bold">
                  {progressPercentage}% ({completedSubmodules}/{totalSubmodules})
                </p>
              </div>
            </div>

            {/* Notes Section (Collapsed Look) */}
            {training.notes && (
              <div className="border border-gray-200 rounded-md p-3 bg-gray-50 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <p className="font-semibold text-gray-900">Trainer Notes</p>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{training.notes}</p>
              </div>
            )}

            {/* History Section — Now Prominent */}
            <div className="border-t border-gray-300 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-gray-800" />
                <h3 className="text-lg font-bold text-gray-900">
                  Submodule Sign-off History
                </h3>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : error ? (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ) : submodules.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    No submodules found for this module
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submodules.map((submodule, idx) => {
                    const isComplete = isSubmoduleComplete(submodule);
                    const submoduleName =
                      typeof submodule.tSubmodule !== 'string'
                        ? submodule.tSubmodule?.title || 'Unknown Submodule'
                        : 'Unknown Submodule';
                    const submoduleCode =
                      typeof submodule.tSubmodule !== 'string'
                        ? submodule.tSubmodule?.code || '---'
                        : '---';
                    const requiresPractical =
                      typeof submodule.tSubmodule !== 'string'
                        ? submodule.tSubmodule?.requiresPractical || false
                        : false;

                    const signatures = submodule.signatures || [];

                    return (
                      <div
                        key={submodule._id || idx}
                        className={`border rounded-lg overflow-hidden ${
                          isComplete
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <div
                                className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  isComplete
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {submoduleCode}
                              </div>
                              <h4 className="font-semibold text-gray-900 text-sm">
                                {submoduleName}
                              </h4>
                              {requiresPractical && (
                                <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px]">
                                  Practical Required
                                </span>
                              )}
                            </div>
                            {isComplete ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <span className="text-xs text-gray-500">
                                {signatures.filter(s => !s.deleted).length}/3
                              </span>
                            )}
                          </div>

                          {/* Signatures */}
{/* Signatures */}
{signatures.length > 0 ? (
  <div className="mt-3 pt-2 border-t border-gray-200 space-y-2">
    {(() => {
      const activeSigs = signatures.filter(s => !s.deleted);
      const deletedSigs = signatures.filter(s => s.deleted);

      return (
        <>
          {/* Active Signatures */}
          {activeSigs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">
                Active Signatures
              </p>
              <div className="space-y-1.5">
                {activeSigs.map((sig, sigIdx) => {
                  const userName =
                    typeof sig.user !== 'string'
                      ? sig.user?.name || sig.user?.username || 'Unknown User'
                      : 'Unknown User';
                  const signDate = sig.createdAt
                    ? new Date(sig.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Date unknown';
                  const roleColor =
                    sig.role === 'Coordinator'
                      ? 'bg-purple-100 text-purple-700'
                      : sig.role === 'Trainer'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700';

                  return (
                    <div
                      key={sig._id || sigIdx}
                      className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md hover:shadow-sm transition"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${roleColor}`}
                        >
                          {sig.role?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-gray-900">
                            {userName}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {sig.role} • {signDate}
                          </p>
                        </div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deleted Signatures Dropdown */}
          {deletedSigs.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowDeleted(!showDeleted)}
                className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 mb-1 px-2 py-1 bg-gray-100 rounded-md hover:bg-gray-200 transition"
              >
                <span>Deleted Signatures ({deletedSigs.length})</span>
                <span className="transform transition-transform duration-200">
                  {showDeleted ? '▲' : '▼'}
                </span>
              </button>

              {showDeleted && (
                <div className="space-y-1.5 mt-1">
                  {deletedSigs.map((sig, sigIdx) => {
                    const userName =
                      typeof sig.user !== 'string'
                        ? sig.user?.name || sig.user?.username || 'Unknown User'
                        : 'Unknown User';
                    const signDate = sig.createdAt
                      ? new Date(sig.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Date unknown';

                    return (
                      <div
                        key={sig._id || sigIdx}
                        className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-md opacity-70 italic"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 bg-gray-200 text-gray-500">
                            {sig.role?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate line-through text-gray-500">
                              {userName}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {sig.role} • {signDate} • Deleted
                            </p>
                          </div>
                        </div>
                        <Trash2 className="w-4 h-4 text-gray-400 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      );
    })()}
  </div>
) : (
  <p className="text-xs text-gray-500 italic text-center py-2">
    No signatures yet
  </p>
)}

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
