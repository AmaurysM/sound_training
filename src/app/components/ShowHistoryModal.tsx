'use client';
import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, CheckCircle2, Users, FileText, Award, AlertCircle, Loader2 } from 'lucide-react';
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

  // FIXED: Added completion logic to check OJT, signatures, and practical (if required)
  const isSubmoduleComplete = (submodule: IUserSubmodule) => {
    // Must have OJT completed
    if (!submodule.ojt) return false;
    
    // Must have all 3 signatures (Coordinator, Trainer, Trainee)
    const sigs = submodule.signatures || [];
    const hasCoordinator = sigs.some(s => s.role === "Coordinator");
    const hasTrainer = sigs.some(s => s.role === "Trainer");
    const hasTrainee = sigs.some(s => s.role === "Trainee");
    
    if (!hasCoordinator || !hasTrainer || !hasTrainee) return false;
    
    // If practical is required, it must be completed
    if (submodule.tSubmodule && typeof submodule.tSubmodule !== "string") {
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
      // Assuming the training has a user reference
      const userId = typeof training.user === 'string' ? training.user : training.user?._id;
      
      if (!userId) {
        throw new Error('User ID not found');
      }

      const res = await fetch(`/api/users/${userId}/modules/${training._id}/submodules`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch submodule history');
      }

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

  const moduleName = typeof training.tModule === 'string' 
    ? 'Unknown Module' 
    : training.tModule?.name || 'Unknown Module';

  // Calculate statistics
  const totalSubmodules = submodules.length;
  const completedSubmodules = submodules.filter(s => isSubmoduleComplete(s)).length;
  const progressPercentage = totalSubmodules > 0 
    ? Math.round((completedSubmodules / totalSubmodules) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">
                Training Module History
              </h2>
              <p className="text-sm sm:text-base text-gray-700 font-medium wrap-break-word">
                {moduleName}
              </p>
              {typeof training.tModule !== 'string' && training.tModule?.description && (
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {training.tModule.description}
                </p>
              )}
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6">
            {/* Timeline Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Created */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-900">
                    Module Assigned
                  </p>
                  <p className="text-sm text-blue-700 wrap-break-word">
                    {training.createdAt
                      ? new Date(training.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Updated */}
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="p-2 bg-green-100 rounded-lg shrink-0">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-900">
                    Last Activity
                  </p>
                  <p className="text-sm text-green-700 wrap-break-word">
                    {training.updatedAt
                      ? new Date(training.updatedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 sm:p-5 border border-purple-100">
              <div className="flex items-center gap-3 mb-3">
                <Award className="w-6 h-6 text-purple-600" />
                <h3 className="text-base sm:text-lg font-bold text-purple-900">
                  Overall Progress
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-purple-700 font-medium">
                    Completion Rate
                  </span>
                  <span className="text-purple-900 font-bold">
                    {completedSubmodules} / {totalSubmodules} ({progressPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {training.notes && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <p className="text-sm font-semibold text-gray-900">
                    Trainer Notes
                  </p>
                </div>
                <div className="p-3 bg-white rounded border border-gray-200">
                  <p className="text-sm text-gray-700 wrap-break-word whitespace-pre-wrap">
                    {training.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Submodules History */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gray-700" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
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
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">No submodules found for this module</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {submodules.map((submodule, idx) => {
                    const isComplete = isSubmoduleComplete(submodule);
                    const submoduleName = typeof submodule.tSubmodule !== 'string'
                      ? submodule.tSubmodule?.title || 'Unknown Submodule'
                      : 'Unknown Submodule';
                    const submoduleCode = typeof submodule.tSubmodule !== 'string'
                      ? submodule.tSubmodule?.code || '---'
                      : '---';
                    const requiresPractical = typeof submodule.tSubmodule !== 'string'
                      ? submodule.tSubmodule?.requiresPractical || false
                      : false;

                    const signatures = submodule.signatures || [];
                    const signatureCount = signatures.length;

                    return (
                      <div
                        key={submodule._id || idx}
                        className={`border rounded-lg overflow-hidden transition-all ${
                          isComplete
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Submodule Header */}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`px-2 py-1 rounded font-mono text-xs font-bold shrink-0 ${
                                isComplete
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {submoduleCode}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                                  {submoduleName}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  {requiresPractical && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                      Practical Required
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded-full ${
                                    submodule.ojt
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    OJT: {submodule.ojt ? '✓' : 'Pending'}
                                  </span>
                                  {requiresPractical && (
                                    <span className={`px-2 py-0.5 rounded-full ${
                                      submodule.practical
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      Practical: {submodule.practical ? '✓' : 'Pending'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isComplete ? (
                              <div className="shrink-0">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                              </div>
                            ) : (
                              <div className="shrink-0 text-xs font-medium text-gray-500">
                                {signatureCount}/3
                              </div>
                            )}
                          </div>

                          {/* Signatures */}
                          {signatures.length > 0 ? (
                            <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-700 mb-2">
                                Sign-off History:
                              </p>
                              {signatures.map((sig, sigIdx) => {
                                const userName = typeof sig.user !== 'string'
                                  ? sig.user?.name || sig.user?.username || 'Unknown User'
                                  : 'Unknown User';
                                const signDate = sig.createdAt
                                  ? new Date(sig.createdAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Date unknown';

                                return (
                                  <div
                                    key={sig._id || sigIdx}
                                    className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                        sig.role === 'Coordinator'
                                          ? 'bg-purple-100 text-purple-700'
                                          : sig.role === 'Trainer'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-green-100 text-green-700'
                                      }`}>
                                        {sig.role?.charAt(0)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 truncate">
                                          {userName}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {sig.role} • {signDate}
                                        </p>
                                      </div>
                                    </div>
                                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 italic text-center py-2">
                                No signatures yet
                              </p>
                            </div>
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
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}