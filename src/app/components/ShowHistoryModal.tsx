'use client';
import React from 'react';
import { X, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { ITraining } from '@/models/Training';

interface TrainingHistoryModalProps {
  show: boolean;
  training: ITraining | null;
  isCoordinator: boolean;
  onClose: () => void;
}

export default function TrainingHistoryModal({
  show,
  training,
  isCoordinator,
  onClose,
}: TrainingHistoryModalProps) {
  if (!show || !training || !isCoordinator) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Training History
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 wrap-break-word">
                {typeof training.module === "string"
                  ? training.module 
                  : training.module?.name 
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* Created */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900">
                  Created
                </p>
                <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                  {training.createdAt
                    ? new Date(training.createdAt).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Updated */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900">
                  Last Updated
                </p>
                <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                  {training.updatedAt
                    ? new Date(training.updatedAt).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Status */}
            {/* <div className="border-t border-gray-200 pt-4">
              <p className="text-xs sm:text-sm font-medium text-gray-900 mb-3">
                Current Status
              </p>
              <div className="space-y-2">
                {[
                  { label: 'OJT Completed', value: training.ojt },
                  { label: 'Practical Completed', value: training.practical },
                  { label: 'Signed Off', value: training.signedOff },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-xs sm:text-sm text-gray-700">
                      {label}
                    </span>
                    {value ? (
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div> */}

            {/* Notes */}
            {training.notes && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2">
                  Notes
                </p>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-700 wrap-break-word">
                    {training.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 sm:mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
