'use client'

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { ITrainingModule } from '@/models/types';
import { BookOpen, Search, Plus, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ModulesPage() {
  const router = useRouter();
  const { currentUser, fetchCurrentUser, availableModules, setAvailableModules, loadingModules, setLoadingModules } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredModules, setFilteredModules] = useState<ITrainingModule[]>([]);

  useEffect(() => {
    const init = async () => {
      if (!currentUser) {
        await fetchCurrentUser();
      }
      if (availableModules.length === 0) {
        await fetchModules();
      } else {
        setFilteredModules(availableModules);
      }
    };
    init();
  }, [currentUser]);

  useEffect(() => {
    if (availableModules.length > 0) {
      filterModules(searchQuery);
    }
  }, [searchQuery, availableModules]);

  const fetchModules = async () => {
    try {
      setLoadingModules(true);
      const res = await fetch('/api/training-modules');
      if (!res.ok) throw new Error('Failed to fetch modules');
      const response = await res.json();
      const modules: ITrainingModule[] = response.data || response;
      setAvailableModules(modules);
      setFilteredModules(modules);
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoadingModules(false);
    }
  };

  const filterModules = (query: string) => {
    if (!query.trim()) {
      setFilteredModules(availableModules);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = availableModules.filter(module => 
      module.name.toLowerCase().includes(lowercaseQuery) ||
      (module.description && module.description.toLowerCase().includes(lowercaseQuery))
    );
    setFilteredModules(filtered);
  };

  const isCoordinator = currentUser?.role === 'Coordinator';

  if (loadingModules) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Training Modules
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Browse all available training modules
          </p>
        </div>

        {/* Search and Actions Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            {/* Add Module Button (Coordinators only) */}
            {isCoordinator && (
              <button
                onClick={() => {/* Handle add module */}}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Module
              </button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              {availableModules.length}
            </p>
            <p className="text-xs sm:text-sm text-gray-600">Total Modules</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              {filteredModules.length}
            </p>
            <p className="text-xs sm:text-sm text-gray-600">Showing</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 col-span-2 sm:col-span-1">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              {availableModules.filter(m => m.submodules && Array.isArray(m.submodules) && m.submodules.length > 0).length}
            </p>
            <p className="text-xs sm:text-sm text-gray-600">With Submodules</p>
          </div>
        </div>

        {/* Modules List */}
        {filteredModules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredModules.map((module) => (
              <button
                key={module._id!.toString()}
                onClick={() => router.push(`/dashboard/modules/${module._id}`)}
                className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 hover:border-gray-900 hover:shadow-sm transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors">
                      {module.name}
                    </h3>
                    {module.description && (
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                        {module.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Module Meta Info */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {module.submodules && Array.isArray(module.submodules) && (
                      <span>
                        {module.submodules.length} {module.submodules.length === 1 ? 'submodule' : 'submodules'}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-8 sm:p-12 text-center">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No modules found' : 'No modules available'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search query' 
                : 'Training modules will appear here once added'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm text-gray-900 hover:text-gray-600 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            Sound Aircraft Services FBO • NATA Certified Training
          </p>
        </div>
      </div>
    </div>
  );
}