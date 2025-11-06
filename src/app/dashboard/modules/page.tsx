'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { ITrainingModule } from '@/models/types';
import { 
  BookOpen, 
  Search, 
  ChevronRight, 
  Loader2, 
  ArrowLeft,
  Filter,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ModulesFilter {
  search: string;
  hasDescription: boolean;
  hasSubmodules: boolean;
}

export default function ModulesPage() {
  const router = useRouter();
  const { 
    currentUser, 
    fetchCurrentUser, 
    availableModules, 
    setAvailableModules, 
    loadingModules, 
    setLoadingModules 
  } = useDashboard();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ModulesFilter>({
    search: '',
    hasDescription: false,
    hasSubmodules: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string>('');

  // Memoized filtered modules
  const filteredModules = useMemo(() => {
    if (!availableModules.length) return [];

    return availableModules.filter(module => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          module.name.toLowerCase().includes(searchLower) ||
          (module.description && module.description.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Description filter
      if (filters.hasDescription && !module.description) {
        return false;
      }

      // Submodules filter
      if (filters.hasSubmodules && (!module.submodules || module.submodules.length === 0)) {
        return false;
      }

      return true;
    });
  }, [availableModules, filters]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setError('');
        if (!currentUser) {
          await fetchCurrentUser();
        }
        if (availableModules.length === 0) {
          await fetchModules();
        }
      } catch (err) {
        setError('Failed to load modules');
        console.error('Initialization error:', err);
      }
    };

    initializeData();
  }, [currentUser]);

  const fetchModules = async () => {
    try {
      setLoadingModules(true);
      setError('');
      const response = await fetch('/api/training-modules/submodules');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch modules: ${response.status}`);
      }
      
      const data = await response.json();
      const modules: ITrainingModule[] = data.data || data;
      
      setAvailableModules(modules);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching modules:', error);
    } finally {
      setLoadingModules(false);
    }
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setFilters(prev => ({ ...prev, search: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilters({
      search: '',
      hasDescription: false,
      hasSubmodules: false
    });
  }, []);

  const hasActiveFilters = filters.search || filters.hasDescription || filters.hasSubmodules;

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
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                Training Modules
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Browse all available training modules
              </p>
            </div>
            
            {/* {isCoordinator && (
              <button
                onClick={() => router.push('/dashboard/modules/create')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Module
              </button>
            )} */}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search modules by name or description..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="bg-white text-gray-900 rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {[filters.search, filters.hasDescription, filters.hasSubmodules].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={filters.hasDescription}
                      onChange={(e) => setFilters(prev => ({ ...prev, hasDescription: e.target.checked }))}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    Has Description
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={filters.hasSubmodules}
                      onChange={(e) => setFilters(prev => ({ ...prev, hasSubmodules: e.target.checked }))}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    Has Submodules
                  </label>
                </div>
              </div>
            )}

            {/* Active Filters Indicator */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Active filters:</span>
                <div className="flex flex-wrap gap-2">
                  {filters.search && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      Search: &quot;{filters.search}&quot;
                      <button onClick={() => handleSearchChange('')}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.hasDescription && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      Has Description
                      <button onClick={() => setFilters(prev => ({ ...prev, hasDescription: false }))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.hasSubmodules && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      Has Submodules
                      <button onClick={() => setFilters(prev => ({ ...prev, hasSubmodules: false }))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={clearFilters}
                    className="text-gray-600 hover:text-gray-900 text-xs font-medium"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredModules.length} of {availableModules.length} modules
          </p>
        </div>

        {/* Modules Grid */}
        {filteredModules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredModules.map((module) => (
              <div
                key={module._id!.toString()}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-900 hover:shadow-sm transition-all duration-200 group cursor-pointer"
                onClick={() => router.push(`/dashboard/modules/${module._id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-3">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors line-clamp-2">
                      {module.name}
                    </h3>
                    {/* {module.description ? (
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {module.description}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No description provided</p>
                    )} */}
                  </div>
                  <BookOpen className="w-5 h-5 text-gray-400 shrink-0" />
                </div>

                {/* Module Meta Info */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {module.submodules && Array.isArray(module.submodules) && (
                      <span className={module.submodules.length === 0 ? 'text-gray-400' : ''}>
                        {module.submodules.length} {module.submodules.length === 1 ? 'submodule' : 'submodules'}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {hasActiveFilters ? 'No modules match your filters' : 'No modules available'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results'
                : 'Training modules will appear here once they are added to the system'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Sound Aircraft Services FBO • NATA Certified Training
          </p>
        </div>
      </div>
    </div>
  );
}