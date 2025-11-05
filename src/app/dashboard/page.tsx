'use client'

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { IUser, ITrainingModule, IUserModule, IUserSubmodule, ISignature, ITrainingSubmodule } from '@/models/types';
import {
  Users, BookOpen, CheckCircle, Clock,
  GraduationCap,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Target,
  TrendingUp,
  UserCheck,
  Award,
  ClipboardCheck,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '../components/LoadingScreen';

// --- Interfaces ---

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  archivedUsers: number;
  totalModules: number;
  completedModules: number;
  inProgressModules: number;
  notStartedModules: number;
  pendingSignoffs: number;
  overallCompletionRate: number;
  averageProgress: number;
  totalSubmodulesCompleted: number;
  totalSubmodulesPending: number;
}

interface RecentActivity {
  userId: string;
  userName: string;
  userInitials: string;
  action: 'completed' | 'in-progress' | 'assigned';
  moduleName: string;
  moduleId: string;
  timestamp: Date;
  timeAgo: string;
  completionPercentage: number;
}

interface UserModulesForDashboard {
  userId: string;
  userName: string;
  modules: IUserModule[];
}

interface ModuleProgress {
  id: string;
  name: string;
  description: string;
  completionRate: number;
  enrolledUsers: number;
  totalSubmodules: number;
  completedSubmodules: number;
  category?: string;
}

// Helper to check if a submodule is properly signed off
const isSubmoduleSignedOff = (sub: IUserSubmodule): boolean => {
  const signatures = (sub.signatures || []) as ISignature[];
  const hasThreeSignatures = signatures.filter(s => !s.archived).length >= 3;
  const hasOJT = sub.ojt === true;
  const hasPractical = sub.practical === true;

  const tSubmodule = sub.tSubmodule as ITrainingSubmodule;
  const requiresPractical = tSubmodule?.requiresPractical === true;

  if (requiresPractical) {
    return hasThreeSignatures && hasOJT && hasPractical;
  } else {
    return hasThreeSignatures && hasOJT;
  }
};

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, fetchCurrentUser } = useDashboard();

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    archivedUsers: 0,
    totalModules: 0,
    completedModules: 0,
    inProgressModules: 0,
    notStartedModules: 0,
    pendingSignoffs: 0,
    overallCompletionRate: 0,
    averageProgress: 0,
    totalSubmodulesCompleted: 0,
    totalSubmodulesPending: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topModules, setTopModules] = useState<ModuleProgress[]>([]);
  const [userProgress, setUserProgress] = useState<{ completed: number; inProgress: number; notStarted: number }>({
    completed: 0,
    inProgress: 0,
    notStarted: 0
  });
  const [loading, setLoading] = useState(true);
  const [dataLastUpdated, setDataLastUpdated] = useState<Date | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        setLoading(true);
        if (!currentUser) {
          await fetchCurrentUser();
        }
        await fetchDashboardData();
        setDataLastUpdated(new Date());
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    initDashboard();
  }, [currentUser]);

  const fetchDashboardData = async (): Promise<void> => {
    try {
      // Fetch users and modules
      const [usersRes, modulesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/training-modules"),
      ]);

      let allUsers: IUser[] = [];
      let allModules: ITrainingModule[] = [];

      // Users
      if (usersRes.ok) {
        const usersJson: IUser[] = await usersRes.json();
        allUsers = usersJson ?? [];

        const activeUsers = allUsers.filter((u) => !u.archived);
        const archivedUsers = allUsers.filter((u) => u.archived);

        setStats((prev) => ({
          ...prev,
          totalUsers: allUsers.length,
          activeUsers: activeUsers.length,
          archivedUsers: archivedUsers.length,
        }));
      }

      // Modules
      if (modulesRes.ok) {
        const modulesJson: ITrainingModule[] = await modulesRes.json();
        allModules = modulesJson;

        setStats((prev) => ({
          ...prev,
          totalModules: allModules.length,
        }));
      }

      // User Modules
      const allUserModules: UserModulesForDashboard[] = await Promise.all(
        allUsers.map(async (user) => {
          try {
            const res = await fetch(`/api/users/${user._id}/modules`);
            if (!res.ok) {
              return { userId: user._id!.toString(), userName: user.name, modules: [] };
            }
            const json = await res.json();
            return { userId: user._id!.toString(), userName: user.name, modules: json };
          } catch {
            return { userId: user._id!.toString(), userName: user.name, modules: [] };
          }
        })
      );

      // Aggregate statistics
      let totalCompleted = 0;
      let totalInProgress = 0;
      let totalNotStarted = 0;
      let totalPendingSignoffs = 0;
      let totalProgress = 0;
      let usersWithModules = 0;
      let totalSubmodulesCompleted = 0;
      let totalSubmodulesPending = 0;
      const activityList: RecentActivity[] = [];

      for (const { userId, userName, modules } of allUserModules) {
        if (!modules.length) continue;
        usersWithModules++;

        let userCompleted = 0;
        let userInProgress = 0;
        let userNotStarted = 0;

        for (const userModule of modules) {
          const moduleObj = userModule.tModule as ITrainingModule;
          const moduleName = moduleObj?.name ?? 'Unknown Module';
          const moduleId = moduleObj?._id?.toString() ?? '';

          const subs = userModule.submodules as IUserSubmodule[];
          if (!subs?.length) {
            totalNotStarted++;
            userNotStarted++;
            continue;
          }

          // Count completed submodules using proper sign-off logic
          const completedSubs = subs.filter(s => isSubmoduleSignedOff(s)).length;
          const totalSubs = subs.length;

          totalSubmodulesCompleted += completedSubs;

          // Count pending (started but not completed)
          const pendingSubs = subs.filter(s => {
            if (isSubmoduleSignedOff(s)) return false;
            const signatures = (s.signatures || []) as ISignature[];
            const activeSignatures = signatures.filter(sig => !sig.archived).length;
            return activeSignatures > 0 || s.ojt || s.practical;
          }).length;

          totalSubmodulesPending += pendingSubs;
          totalPendingSignoffs += pendingSubs;

          let status: "completed" | "in-progress" | "assigned" = "assigned";
          const completionPercentage = Math.round((completedSubs / totalSubs) * 100);

          if (completedSubs === totalSubs) {
            totalCompleted++;
            userCompleted++;
            status = "completed";
          } else if (completedSubs > 0 || pendingSubs > 0) {
            totalInProgress++;
            userInProgress++;
            status = "in-progress";
          } else {
            totalNotStarted++;
            userNotStarted++;
          }

          if (userModule.updatedAt) {
            activityList.push({
              userId,
              userName,
              userInitials: userName.split(" ").map((n) => n[0]).join("").toUpperCase(),
              action: status,
              moduleName,
              moduleId,
              timestamp: new Date(userModule.updatedAt),
              timeAgo: getTimeAgo(new Date(userModule.updatedAt)),
              completionPercentage
            });
          }
        }

        const userTotal = modules.length;
        if (userTotal > 0) {
          const userProgressPercent = Math.round(((userCompleted + userInProgress * 0.5) / userTotal) * 100);
          totalProgress += userProgressPercent;
        }
      }

      const overallCompletionRate =
        usersWithModules > 0
          ? Math.round(totalProgress / usersWithModules)
          : 0;

      setStats((prev) => ({
        ...prev,
        completedModules: totalCompleted,
        inProgressModules: totalInProgress,
        notStartedModules: totalNotStarted,
        pendingSignoffs: totalPendingSignoffs,
        overallCompletionRate,
        averageProgress: overallCompletionRate,
        totalSubmodulesCompleted,
        totalSubmodulesPending
      }));

      // Sort activity by timestamp and completion percentage
      activityList.sort((a, b) => {
        const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.completionPercentage - a.completionPercentage;
      });
      setRecentActivity(activityList.slice(0, 4)); // Show fewer activities on mobile

      // Module Progress
      const moduleProgressData = await calculateModuleProgress(allModules, allUserModules);
      setTopModules(moduleProgressData.slice(0, 3)); // Show fewer modules on mobile

      // Current User's Progress
      if (currentUser) {
        const userData = allUserModules.find(
          (u) => u.userId === currentUser._id!.toString()
        );
        if (userData) {
          setUserProgress(calculateUserProgress(userData.modules));
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  // --- Helpers ---

  function getTimeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  const getActionIcon = (action: RecentActivity['action']) => {
    switch (action) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'assigned':
        return <BookOpen className="w-4 h-4 text-gray-500" />;
      default:
        return <BookOpen className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionText = (activity: RecentActivity) => {
    switch (activity.action) {
      case 'completed':
        return `completed ${activity.moduleName}`;
      case 'in-progress':
        return `${activity.completionPercentage}% through ${activity.moduleName}`;
      case 'assigned':
        return `assigned to ${activity.moduleName}`;
      default:
        return `working on ${activity.moduleName}`;
    }
  };

  const calculateModuleProgress = async (
    modules: ITrainingModule[],
    allUserModules: UserModulesForDashboard[]
  ): Promise<ModuleProgress[]> => {
    return modules.slice(0, 6).map(module => {
      let enrolledCount = 0;
      let completedCount = 0;
      let totalSubmodules = 0;
      let completedSubmodules = 0;

      allUserModules.forEach(({ modules: userMods }) => {
        const userModule = userMods.find(um => {
          const moduleId = typeof um.tModule === "object"
            ? (um.tModule as ITrainingModule)._id
            : um.tModule;
          return moduleId?.toString() === module._id?.toString();
        });

        if (!userModule) return;

        enrolledCount++;
        const subs = userModule.submodules as IUserSubmodule[] | undefined;
        if (!subs?.length) return;

        totalSubmodules += subs.length;
        const completed = subs.filter(sub => isSubmoduleSignedOff(sub)).length;
        completedSubmodules += completed;

        if (completed === subs.length) completedCount++;
      });

      const completionRate = enrolledCount ? Math.round((completedCount / enrolledCount) * 100) : 0;

      return {
        id: module._id!,
        name: module.name,
        description: module.description ?? 'No description available',
        completionRate,
        enrolledUsers: enrolledCount,
        totalSubmodules,
        completedSubmodules
      };
    });
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const res = await fetch('/api/logout', {
        method: 'POST',
      });

      if (res.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const calculateUserProgress = (userModules: IUserModule[]) => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    userModules.forEach(module => {
      const subs = module.submodules as IUserSubmodule[];
      if (!subs?.length) {
        notStarted++;
        return;
      }

      const completedSubs = subs.filter(s => isSubmoduleSignedOff(s)).length;
      const totalSubs = subs.length;

      if (completedSubs === totalSubs) {
        completed++;
      } else if (completedSubs > 0) {
        inProgress++;
      } else {
        // Check if any work has started
        const hasAnyProgress = subs.some(s => {
          const signatures = (s.signatures || []) as ISignature[];
          return signatures.some(sig => !sig.archived) || s.ojt || s.practical;
        });

        if (hasAnyProgress) {
          inProgress++;
        } else {
          notStarted++;
        }
      }
    });

    return { completed, inProgress, notStarted };
  };

  if (loading) { return <LoadingScreen message={"Loading training dashboard..."} />; }

  const isCoordinator = currentUser?.role === 'Coordinator';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Mobile Header */}
        <div className="lg:hidden mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-white border border-gray-200"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-xs text-gray-600">Welcome, {currentUser?.name || 'User'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              {isLoggingOut ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3 space-y-2">
              <button
                onClick={() => {
                  router.push(`/dashboard/users/${currentUser?._id}/modules`);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left"
              >
                <GraduationCap className="w-5 h-5 text-gray-700" />
                <div>
                  <p className="font-medium text-gray-900">My Training</p>
                  <p className="text-xs text-gray-600">{userProgress.completed} completed</p>
                </div>
              </button>

              <button
                onClick={() => {
                  router.push('/dashboard/modules');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left"
              >
                <BookOpen className="w-5 h-5 text-gray-700" />
                <div>
                  <p className="font-medium text-gray-900">All Modules</p>
                  <p className="text-xs text-gray-600">{stats.totalModules} modules</p>
                </div>
              </button>

              <button
                onClick={() => {
                  router.push('/dashboard/users');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left"
              >
                <UserCheck className="w-5 h-5 text-gray-700" />
                <div>
                  <p className="font-medium text-gray-900">Manage Users</p>
                  <p className="text-xs text-gray-600">{stats.activeUsers} active</p>
                </div>
              </button>


              <button
                onClick={() => {
                  router.push(`/dashboard/users/${currentUser?._id}/profile`);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left"
              >
                <Users className="w-5 h-5 text-gray-700" />
                <p className="font-medium text-gray-900">My Profile</p>
              </button>
            </div>
          )}
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                Training Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome back, <span className="font-semibold text-gray-900">{currentUser?.name || 'User'}</span>
                {dataLastUpdated && (
                  <span className="text-xs text-gray-500 ml-2">
                    • Updated {dataLastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>

        {/* Quick Actions - Desktop Only */}
        <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => router.push(`/dashboard/users/${currentUser?._id}/modules`)}
            className="group bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">My Training</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              {userProgress.completed} completed • {userProgress.inProgress} in progress
            </p>
          </button>

          <button
            onClick={() => router.push('/dashboard/modules')}
            className="group bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">All Modules</h3>
            <p className="text-xs sm:text-sm text-gray-600">{stats.totalModules} training modules</p>
          </button>

          <button
            onClick={() => router.push('/dashboard/users')}
            className="group bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <UserCheck className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">Manage Users</h3>
            <p className="text-xs sm:text-sm text-gray-600">{stats.activeUsers} active trainees</p>
          </button>

          <button
            onClick={() => router.push(`/dashboard/users/${currentUser?._id}/profile`)}
            className="group bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">My Profile</h3>
            <p className="text-xs sm:text-sm text-gray-600">View your details</p>
          </button>
        </div>

        {/* Quick Stats - Mobile Compact */}
        <div className="grid grid-cols-2 gap-3 mb-4 lg:hidden">
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-4 h-4 text-gray-500" />
              <TrendingUp className="w-3 h-3 text-green-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.activeUsers}</p>
            <p className="text-xs text-gray-600">Active Users</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-4 h-4 text-gray-500" />
              <Target className="w-3 h-3 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.totalModules}</p>
            <p className="text-xs text-gray-600">Modules</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-4 h-4 text-gray-500" />
              <Award className="w-3 h-3 text-green-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.completedModules}</p>
            <p className="text-xs text-gray-600">Completed</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <div className="text-xs font-medium text-green-600">Avg</div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.averageProgress}%</p>
            <p className="text-xs text-gray-600">Progress</p>
          </div>
        </div>

        {/* Enhanced Stats Grid - Desktop */}
        <div className="hidden lg:grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-5 h-5 text-gray-500" />
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.activeUsers}</p>
            <p className="text-xs sm:text-sm text-gray-600">Active Users</p>
            <p className="text-xs text-gray-500 mt-1">{stats.archivedUsers} archived</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <BookOpen className="w-5 h-5 text-gray-500" />
              <Target className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.totalModules}</p>
            <p className="text-xs sm:text-sm text-gray-600">Training Modules</p>
            <p className="text-xs text-gray-500 mt-1">Available</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-5 h-5 text-gray-500" />
              <Award className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.completedModules}</p>
            <p className="text-xs sm:text-sm text-gray-600">Modules Completed</p>
            <p className="text-xs text-gray-500 mt-1">{stats.totalSubmodulesCompleted} submodules</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.totalSubmodulesPending}</p>
            <p className="text-xs sm:text-sm text-gray-600">Items Pending</p>
            <p className="text-xs text-gray-500 mt-1">Requires completion</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Overall
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.averageProgress}%</p>
            <p className="text-xs sm:text-sm text-gray-600">Avg. Progress</p>
            <p className="text-xs text-gray-500 mt-1">Across all users</p>
          </div>
        </div>

        {/* Main Content Grid - Mobile Stack */}
        <div className="space-y-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          {/* Recent Activity - Mobile First */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>

            </div>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, idx) => (
                  <button
                    key={idx}
                    onClick={() => router.push(`/dashboard/users/${activity.userId}/modules`)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {activity.userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getActionIcon(activity.action)}
                        <p className="text-sm text-gray-900 truncate">
                          <span className="font-semibold">{activity.userName}</span>
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {getActionText(activity)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>{activity.timeAgo}</span>
                        {activity.action === 'in-progress' && (
                          <>
                            <span>•</span>
                            <div className="flex-1 max-w-[60px]">
                              <div className="w-full bg-gray-200 rounded-full h-1">
                                <div
                                  className="bg-blue-500 h-1 rounded-full"
                                  style={{ width: `${activity.completionPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-6">
                  <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary Stats - Mobile Compact */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Overview</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Program Completion</span>
                  <span className="text-sm font-semibold text-gray-900">{stats.overallCompletionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stats.overallCompletionRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Active Trainees</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.activeUsers}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">In Progress</p>
                  <p className="text-lg font-semibold text-blue-600">{stats.inProgressModules}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Completed</p>
                  <p className="text-lg font-semibold text-green-600">{stats.totalSubmodulesCompleted}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Pending</p>
                  <p className="text-lg font-semibold text-orange-600">{stats.totalSubmodulesPending}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Modules - Mobile Compact */}
        <div className="mt-4 lg:mt-6 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Featured Modules</h2>
              <p className="text-sm text-gray-600 hidden lg:block">Most popular training programs</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/modules')}
              className="text-sm text-gray-900 hover:text-gray-600 font-medium flex items-center gap-1 group"
            >
              <span className="hidden sm:inline">View All</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {topModules.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topModules.map((module, idx) => (
                <button
                  key={idx}
                  onClick={() => router.push(`/dashboard/modules/${module.id}`)}
                  className="group p-3 border border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition-colors pr-2 flex-1">
                      {module.name}
                    </h3>
                    <BookOpen className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors flex-shrink-0 mt-0.5" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Completion</span>
                      <span className="font-semibold">{module.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${module.completionRate}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{module.enrolledUsers} users</span>
                      <span>{module.completedSubmodules}/{module.totalSubmodules}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No training modules</p>
            </div>
          )}
        </div>

        {/* Footer - Mobile Compact */}
        <div className="mt-4 lg:mt-8 text-center">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900">Sound Aircraft Services FBO</p>
            <p className="text-xs text-gray-600 mt-1">NATA Certified Training Program</p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-xs text-gray-500">
              <span>Users: {stats.totalUsers}</span>
              <span>•</span>
              <span>Modules: {stats.totalModules}</span>
              <span>•</span>
              <span>Progress: {stats.overallCompletionRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}