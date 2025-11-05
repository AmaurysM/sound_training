'use client'

import React, { useState, useEffect } from 'react';
import { BookOpen, ArrowLeft, Search, Filter, CheckCircle, Clock, AlertCircle, Loader2, List, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { IUserSubmodule } from '@/models';
import LoadingScreen from '@/app/components/LoadingScreen';

// Types based on your models
interface ITrainingModule {
  _id: string;
  name: string;
  description?: string;
  submodules?: ITrainingSubmodule[];
}

interface ITrainingSubmodule {
  _id: string;
  code?: string;
  title: string;
  description?: string;
  requiresPractical?: boolean;
  order?: number;
}

interface SubmoduleStats {
  totalUsers: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
}

interface IUser {
  _id: string;
  name: string;
}

interface IUserModule {
  _id: string;
  tModule: ITrainingSubmodule;
  submodules?: IUserSubmodule[];
}

export default function SubmodulesPage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = params?.moduleId as string;

  const [module, setModule] = useState<ITrainingModule | null>(null);
  const [submodules, setSubmodules] = useState<ITrainingSubmodule[]>([]);
  const [filteredSubmodules, setFilteredSubmodules] = useState<ITrainingSubmodule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'practical' | 'non-practical'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'title' | 'code'>('order');
  const [expandedSubmodule, setExpandedSubmodule] = useState<string | null>(null);
  const [submoduleStats, setSubmoduleStats] = useState<Record<string, SubmoduleStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchModuleData();
  }, [moduleId]);

  useEffect(() => {
    filterAndSortSubmodules();
  }, [submodules, searchTerm, filterType, sortBy]);

  const fetchModuleData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch module details
      const moduleRes = await fetch(`/api/training-modules/${moduleId}`);
      if (!moduleRes.ok) throw new Error('Failed to fetch module');
      const moduleData = await moduleRes.json();
      const moduleInfo: ITrainingModule = moduleData.data || moduleData;
      setModule(moduleInfo);

      // Handle submodules
      let submodulesList: ITrainingSubmodule[] = [];
      if (moduleInfo.submodules && Array.isArray(moduleInfo.submodules)) {
        if (typeof moduleInfo.submodules[0] === 'object' && moduleInfo.submodules[0] !== null) {
          submodulesList = moduleInfo.submodules as ITrainingSubmodule[];
        }
      }
      setSubmodules(submodulesList);

      // Fetch stats for submodules
      if (submodulesList.length > 0) {
        await fetchSubmoduleStats(submodulesList);
      }

    } catch (err) {
      console.error('Error fetching module data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load submodules');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmoduleStats = async (subs: ITrainingSubmodule[]) => {
    setStatsLoading(true);
    try {
      // Fetch all users
      const usersRes = await fetch('/api/users');
      if (!usersRes.ok) {
        setStatsLoading(false);
        return;
      }
      const allUsers: IUser[] = await usersRes.json();

      const stats: Record<string, SubmoduleStats> = {};

      // For each submodule, calculate stats
      for (const sub of subs) {
        const submoduleId = sub._id.toString();

        // Fetch user modules for all users and check this submodule
        const enrollmentPromises = allUsers.map(async (user) => {
          try {
            const userModulesRes = await fetch(`/api/users/${user._id}/modules`);
            if (userModulesRes.ok) {
              const modulesData = await userModulesRes.json();
              const userModules: IUserModule[] = modulesData.data || modulesData;

              // Find if this user has the current module
              const userModule = userModules.find(um => {
                const modId = typeof um.tModule === 'object' ? um.tModule._id : um.tModule;
                return modId?.toString() === moduleId;
              });

              if (userModule && userModule.submodules && Array.isArray(userModule.submodules)) {
                // Find this specific submodule in user's submodules
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const userSubmodule = userModule.submodules.find((us: any) => {
                  const usId = typeof us.tSubmodule === 'object' ? us.tSubmodule._id : us.tSubmodule;
                  return usId?.toString() === submoduleId;
                });

                if (userSubmodule) {
                  return {
                    enrolled: true,
                    completed: typeof userSubmodule === 'object' && userSubmodule.signedOff
                  };
                }
              }
            }
          } catch (err) {
            console.error(`Error fetching modules for user ${user._id}:`, err);
          }
          return { enrolled: false, completed: false };
        });

        const results = await Promise.all(enrollmentPromises);
        const enrolledUsers = results.filter(r => r.enrolled);
        const totalUsers = enrolledUsers.length;
        const completed = enrolledUsers.filter(r => r.completed).length;
        const inProgress = totalUsers - completed;
        const notStarted = 0;
        const completionRate = totalUsers > 0 ? Math.round((completed / totalUsers) * 100) : 0;

        stats[submoduleId] = {
          totalUsers,
          completed,
          inProgress,
          notStarted,
          completionRate
        };
      }

      setSubmoduleStats(stats);
    } catch (err) {
      console.error('Error fetching submodule stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const filterAndSortSubmodules = () => {
    let filtered = [...submodules];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(sub =>
        sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType === 'practical') {
      filtered = filtered.filter(sub => sub.requiresPractical);
    } else if (filterType === 'non-practical') {
      filtered = filtered.filter(sub => !sub.requiresPractical);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'order') {
        return (a.order || 0) - (b.order || 0);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'code') {
        return (a.code || '').localeCompare(b.code || '');
      }
      return 0;
    });

    setFilteredSubmodules(filtered);
  };

  const toggleSubmodule = (submoduleId: string) => {
    setExpandedSubmodule(expandedSubmodule === submoduleId ? null : submoduleId);
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-100';
    if (rate >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) { return <LoadingScreen message={"Loading submodules..."} />; }

  if (error || !module) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load</h3>
          <p className="text-sm text-gray-600 mb-4">{error || 'Module not found'}</p>
          <button
            onClick={() => router.push(`/dashboard/modules/${moduleId}`)}
            className="text-sm text-gray-900 hover:text-gray-600 font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const totalSubmodules = submodules.length;
  const practicalRequired = submodules.filter(s => s.requiresPractical).length;
  const theoryOnly = totalSubmodules - practicalRequired;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/dashboard/modules/${moduleId}`)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Module
        </button>

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-gray-100 rounded-lg">
              <List className="w-6 h-6 sm:w-8 sm:h-8 text-gray-900" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {module.name} - Submodules
              </h1>
              {module.description && (
                <p className="text-sm sm:text-base text-gray-600">
                  {module.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{totalSubmodules}</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Total Submodules</p>
            </div>
            <div className="text-center border-l border-gray-200">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{practicalRequired}</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Practical Required</p>
            </div>
            <div className="text-center border-l border-gray-200">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{theoryOnly}</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Theory Only</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search submodules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Filter Type */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Type
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterType}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm appearance-none bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="practical">Practical Required</option>
                  <option value="non-practical">Theory Only</option>
                </select>
              </div>
            </div>

            {/* Sort */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm appearance-none bg-white"
              >
                <option value="order">Order</option>
                <option value="title">Title</option>
                <option value="code">Code</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredSubmodules.length}</span> of <span className="font-semibold text-gray-900">{totalSubmodules}</span> submodules
            </p>
          </div>
        </div>

        {/* Submodules List */}
        <div className="space-y-3">
          {filteredSubmodules.length > 0 ? (
            filteredSubmodules.map((submodule) => {
              const stats = submoduleStats[submodule._id];
              const isExpanded = expandedSubmodule === submodule._id;

              return (
                <div
                  key={submodule._id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-900 transition-colors"
                >
                  {/* Main Content */}
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      {/* Order Number */}
                      {/* <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-900">
                          {submodule.order || '-'}
                        </span>
                      </div> */}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {submodule.code && (
                                <span className="text-xs font-mono font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                  {submodule.code}
                                </span>
                              )}
                              {submodule.requiresPractical ? (
                                <span className="text-xs font-medium text-white bg-gray-900 px-2 py-1 rounded">
                                  Practical Required
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-gray-700 bg-gray-200 px-2 py-1 rounded">
                                  Theory Only
                                </span>
                              )}
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                              {submodule.title}
                            </h3>
                            {submodule.description && (
                              <p className="text-sm text-gray-600">
                                {submodule.description}
                              </p>
                            )}
                          </div>

                          {/* Stats Summary */}
                          {stats && !statsLoading && (
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <p className={`text-xl sm:text-2xl font-bold ${getStatusColor(stats.completionRate)}`}>
                                  {stats.completionRate}%
                                </p>
                                <p className="text-xs text-gray-500">Complete</p>
                              </div>
                              <button
                                onClick={() => toggleSubmodule(submodule._id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-600" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-600" />
                                )}
                              </button>
                            </div>
                          )}
                          {statsLoading && (
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Stats */}
                  {isExpanded && stats && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 sm:p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-600">Total Users</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                        </div>

                        <div className={`rounded-lg p-4 border ${getStatusBg(100)}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-gray-600">Completed</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                        </div>

                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-yellow-600" />
                            <span className="text-xs text-gray-600">In Progress</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                        </div>

                        <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-600">Not Started</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{stats.notStarted}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600">Completion Progress</span>
                          <span className="text-xs font-semibold text-gray-900">{stats.completionRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gray-900 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${stats.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No submodules found</h3>
              <p className="text-sm text-gray-600 mb-4">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No submodules have been added to this module yet'}
              </p>
              {(searchTerm || filterType !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                  }}
                  className="text-sm text-gray-900 hover:text-gray-600 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}