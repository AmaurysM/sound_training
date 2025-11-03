'use client'

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { IUser, ITrainingModule, IUserModule } from '@/models/types';
import { 
  Users, BookOpen, CheckCircle, Clock, ArrowRight, GraduationCap, 
  UserCheck, TrendingUp, AlertCircle, Target, BarChart3 
} from 'lucide-react';
import { redirect, useRouter } from 'next/navigation';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  archivedUsers: number;
  totalModules: number;
  completedModules: number;
  inProgressModules: number;
  pendingSignoffs: number;
  overallCompletionRate: number;
  averageProgress: number;
}

interface RecentActivity {
  userId: string;
  userName: string;
  userInitials: string;
  action: 'completed' | 'started' | 'in-progress' | 'assigned';
  moduleName: string;
  moduleId: string;
  timestamp: Date;
  timeAgo: string;
}

interface ModuleProgress {
  id: string;
  name: string;
  description: string;
  completionRate: number;
  enrolledUsers: number;
  category?: string;
}

export default function Dashboard() {
  //const router = useRouter();
    redirect('/dashboard/users');
  
//   const { currentUser, fetchCurrentUser } = useDashboard();
//   const [stats, setStats] = useState<DashboardStats>({
//     totalUsers: 0,
//     activeUsers: 0,
//     archivedUsers: 0,
//     totalModules: 0,
//     completedModules: 0,
//     inProgressModules: 0,
//     pendingSignoffs: 0,
//     overallCompletionRate: 0,
//     averageProgress: 0
//   });
  
//   const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
//   const [topModules, setTopModules] = useState<ModuleProgress[]>([]);
//   const [userProgress, setUserProgress] = useState<{completed: number; inProgress: number; notStarted: number}>({
//     completed: 0,
//     inProgress: 0,
//     notStarted: 0
//   });
//   const [loading, setLoading] = useState(true);
//   const [dataLastUpdated, setDataLastUpdated] = useState<Date | null>(null);

//   useEffect(() => {
//     const initDashboard = async () => {
//       try {
//         setLoading(true);
//         if (!currentUser) {
//           await fetchCurrentUser();
//         }
//         await fetchDashboardData();
//         setDataLastUpdated(new Date());
//       } catch (error) {
//         console.error('Error initializing dashboard:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     initDashboard();
//   }, [currentUser]);

//   const fetchDashboardData = async () => {
//     try {
//       // Fetch users and modules
//       const [usersRes, modulesRes] = await Promise.all([
//         fetch('/api/users'),
//         fetch('/api/training-modules')
//       ]);

//       let allUsers: IUser[] = [];
//       let allModules: ITrainingModule[] = [];

//       // Process users data
//       if (usersRes.ok) {
//         allUsers = await usersRes.json();
//         const activeUsers = allUsers.filter(u => !u.archived);
//         const archivedUsers = allUsers.filter(u => u.archived);
        
//         setStats(prev => ({
//           ...prev,
//           totalUsers: allUsers.length,
//           activeUsers: activeUsers.length,
//           archivedUsers: archivedUsers.length
//         }));
//       }

//       // Process modules data
//       if (modulesRes.ok) {
//         const response = await modulesRes.json();
//         allModules = response.data || response;
        
//         setStats(prev => ({ 
//           ...prev, 
//           totalModules: allModules.length 
//         }));
//       }

//       // Fetch all user modules to calculate real statistics
//       const userModulesPromises = allUsers.map(user => 
//         fetch(`/api/users/${user._id}/modules`)
//           .then(res => res.ok ? res.json() : null)
//           .then(data => ({ userId: user._id, userName: user.name, modules: data?.data || data || [] }))
//           .catch(() => ({ userId: user._id, userName: user.name, modules: [] }))
//       );

//       const allUserModules = await Promise.all(userModulesPromises);

//       // Calculate real statistics
//       let totalCompleted = 0;
//       let totalInProgress = 0;
//       let totalPendingSignoffs = 0;
//       let totalProgress = 0;
//       let usersWithModules = 0;

//       const activityList: RecentActivity[] = [];

//       allUserModules.forEach(({ userId, userName, modules }) => {
//         if (!Array.isArray(modules) || modules.length === 0) return;

//         usersWithModules++;
//         let userCompleted = 0;
//         let userInProgress = 0;
//         let userTotal = modules.length;

//         modules.forEach((userModule: IUserModule) => {
//           const moduleName = typeof userModule.tModule === 'object' 
//             ? userModule.tModule.name 
//             : 'Unknown Module';
//           const moduleId = typeof userModule.tModule === 'object'
//             ? userModule.tModule._id
//             : userModule.tModule;

//           // Check submodules status
//           if (userModule.submodules && Array.isArray(userModule.submodules)) {
//             const submodules = userModule.submodules;
//             const totalSubs = submodules.length;
            
//             if (totalSubs > 0) {
//               const completedSubs = submodules.filter(sub => {
//                 if (typeof sub === 'object' && sub !== null) {
//                   return sub.signedOff === true;
//                 }
//                 return false;
//               }).length;

//               const pendingSubs = submodules.filter(sub => {
//                 if (typeof sub === 'object' && sub !== null) {
//                   return !sub.signedOff && (sub.ojt || sub.practical);
//                 }
//                 return false;
//               }).length;

//               totalPendingSignoffs += pendingSubs;

//               // Determine status
//               let status: 'completed' | 'in-progress' | 'assigned' = 'assigned';
//               if (completedSubs === totalSubs) {
//                 totalCompleted++;
//                 userCompleted++;
//                 status = 'completed';
//               } else if (completedSubs > 0) {
//                 totalInProgress++;
//                 userInProgress++;
//                 status = 'in-progress';
//               }

//               // Add to activity
//               if (userModule.updatedAt) {
//                 activityList.push({
//                   userId: userId?.toString(),
//                   userName,
//                   userInitials: userName.split(' ').map(n => n[0]).join('').toUpperCase(),
//                   action: status,
//                   moduleName,
//                   moduleId: moduleId?.toString() || '',
//                   timestamp: new Date(userModule.updatedAt),
//                   timeAgo: getTimeAgo(new Date(userModule.updatedAt))
//                 });
//               }
//             }
//           }
//         });

//         if (userTotal > 0) {
//           const userProgressPercent = ((userCompleted + userInProgress * 0.5) / userTotal) * 100;
//           totalProgress += userProgressPercent;
//         }
//       });

//       // Calculate averages and rates
//       const overallCompletionRate = usersWithModules > 0 
//         ? Math.round(totalProgress / usersWithModules) 
//         : 0;

//       setStats(prev => ({
//         ...prev,
//         completedModules: totalCompleted,
//         inProgressModules: totalInProgress,
//         pendingSignoffs: totalPendingSignoffs,
//         overallCompletionRate,
//         averageProgress: overallCompletionRate
//       }));

//       // Sort and set recent activity
//       activityList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
//       setRecentActivity(activityList.slice(0, 6));

//       // Calculate module progress
//       const moduleProgressData = await calculateModuleProgress(allModules, allUserModules);
//       setTopModules(moduleProgressData);

//       // Calculate current user's progress
//       if (currentUser) {
//         const currentUserData = allUserModules.find(u => u.userId!.toString() === currentUser._id!.toString());
//         if (currentUserData) {
//           const progress = calculateUserProgress(currentUserData.modules);
//           setUserProgress(progress);
//         }
//       }

//     } catch (error) {
//       console.error('Error fetching dashboard data:', error);
//     }
//   };

//   const getTimeAgo = (date: Date): string => {
//     const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
//     if (seconds < 60) return 'Just now';
//     if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
//     if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
//     if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
//     return date.toLocaleDateString();
//   };

//   const calculateModuleProgress = async (
//     modules: ITrainingModule[], 
//     allUserModules: any[]
//   ): Promise<ModuleProgress[]> => {
//     return modules.slice(0, 6).map(module => {
//       let enrolledCount = 0;
//       let completedCount = 0;

//       allUserModules.forEach(({ modules: userMods }) => {
//         const userModule = userMods.find((um: IUserModule) => {
//           const modId = typeof um.tModule === 'object' ? um.tModule._id : um.tModule;
//           return modId?.toString() === module._id!.toString();
//         });

//         if (userModule) {
//           enrolledCount++;
          
//           // Check if completed
//           if (userModule.submodules && Array.isArray(userModule.submodules)) {
//             const totalSubs = userModule.submodules.length;
//             if (totalSubs > 0) {
//               const completedSubs = userModule.submodules.filter((sub: any) => 
//                 typeof sub === 'object' && sub.signedOff === true
//               ).length;
//               if (completedSubs === totalSubs) completedCount++;
//             }
//           }
//         }
//       });

//       const completionRate = enrolledCount > 0 
//         ? Math.round((completedCount / enrolledCount) * 100) 
//         : 0;

//       return {
//         id: module._id!.toString(),
//         name: module.name,
//         description: module.description || 'No description available',
//         completionRate,
//         enrolledUsers: enrolledCount
//       };
//     });
//   };

//   const calculateUserProgress = (userModules: IUserModule[]) => {
//     let completed = 0;
//     let inProgress = 0;
//     let notStarted = 0;

//     userModules.forEach(userModule => {
//       if (userModule.submodules && Array.isArray(userModule.submodules)) {
//         const totalSubs = userModule.submodules.length;
//         if (totalSubs > 0) {
//           const completedSubs = userModule.submodules.filter((sub: any) => 
//             typeof sub === 'object' && sub.signedOff === true
//           ).length;

//           if (completedSubs === totalSubs) {
//             completed++;
//           } else if (completedSubs > 0) {
//             inProgress++;
//           } else {
//             notStarted++;
//           }
//         } else {
//           notStarted++;
//         }
//       } else {
//         notStarted++;
//       }
//     });

//     return { completed, inProgress, notStarted };
//   };

//   const getActionIcon = (action: RecentActivity['action']) => {
//     switch (action) {
//       case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
//       case 'in-progress': return <Clock className="w-4 h-4 text-blue-500" />;
//       case 'started': return <Clock className="w-4 h-4 text-blue-500" />;
//       case 'assigned': return <BookOpen className="w-4 h-4 text-orange-500" />;
//       default: return <BookOpen className="w-4 h-4 text-gray-500" />;
//     }
//   };

//   const getActionText = (activity: RecentActivity) => {
//     switch (activity.action) {
//       case 'completed': return `completed ${activity.moduleName}`;
//       case 'in-progress': return `is working on ${activity.moduleName}`;
//       case 'started': return `started ${activity.moduleName}`;
//       case 'assigned': return `was assigned ${activity.moduleName}`;
//       default: return `interacted with ${activity.moduleName}`;
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
//         <div className="text-center">
//           <div className="w-12 h-12 border-3 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-sm text-gray-600">Loading training dashboard...</p>
//           <p className="text-xs text-gray-500 mt-1">Preparing your insights</p>
//         </div>
//       </div>
//     );
//   }

//   const isCoordinator = currentUser?.role === 'Coordinator';

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
//         {/* Header */}
//         <div className="mb-6 sm:mb-8">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
//             <div>
//               <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
//                 Training Dashboard
//               </h1>
//               <p className="text-sm sm:text-base text-gray-600">
//                 Welcome back, <span className="font-semibold text-gray-900">{currentUser?.name || 'User'}</span>
//                 {dataLastUpdated && (
//                   <span className="text-xs text-gray-500 ml-2">
//                     • Updated {dataLastUpdated.toLocaleTimeString()}
//                   </span>
//                 )}
//               </p>
//             </div>
//             <div className="mt-2 sm:mt-0">
//               <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
//                 <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//                 System Operational
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Quick Actions */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
//           <button
//             onClick={() => router.push(`/dashboard/users/${currentUser?._id}/modules`)}
//             className="group bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left"
//           >
//             <div className="flex items-center justify-between mb-3">
//               <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 group-hover:scale-110 transition-transform" />
//               <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
//             </div>
//             <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">My Training</h3>
//             <p className="text-xs sm:text-sm text-gray-600">
//               {userProgress.completed} completed • {userProgress.inProgress} in progress
//             </p>
//           </button>

//           <button
//             onClick={() => router.push('/dashboard/modules')}
//             className="group bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left"
//           >
//             <div className="flex items-center justify-between mb-3">
//               <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 group-hover:scale-110 transition-transform" />
//               <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
//             </div>
//             <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">All Modules</h3>
//             <p className="text-xs sm:text-sm text-gray-600">{stats.totalModules} training modules available</p>
//           </button>

//           {isCoordinator && (
//             <button
//               onClick={() => router.push('/dashboard/users')}
//               className="group bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left"
//             >
//               <div className="flex items-center justify-between mb-3">
//                 <UserCheck className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 group-hover:scale-110 transition-transform" />
//                 <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
//               </div>
//               <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">Manage Users</h3>
//               <p className="text-xs sm:text-sm text-gray-600">{stats.activeUsers} active trainees</p>
//             </button>
//           )}

//           <button
//             onClick={() => router.push(`/dashboard/users/${currentUser?._id}/profile`)}
//             className="group bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left"
//           >
//             <div className="flex items-center justify-between mb-3">
//               <Users className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 group-hover:scale-110 transition-transform" />
//               <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
//             </div>
//             <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">My Profile</h3>
//             <p className="text-xs sm:text-sm text-gray-600">View and update your details</p>
//           </button>
//         </div>

//         {/* Enhanced Stats Grid */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
//           <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow">
//             <div className="flex items-center justify-between mb-3">
//               <Users className="w-5 h-5 text-gray-500" />
//               <TrendingUp className="w-4 h-4 text-green-500" />
//             </div>
//             <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.activeUsers}</p>
//             <p className="text-xs sm:text-sm text-gray-600">Active Users</p>
//             <p className="text-xs text-gray-500 mt-1">{stats.archivedUsers} archived</p>
//           </div>

//           <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow">
//             <div className="flex items-center justify-between mb-3">
//               <BookOpen className="w-5 h-5 text-gray-500" />
//               <Target className="w-4 h-4 text-blue-500" />
//             </div>
//             <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.totalModules}</p>
//             <p className="text-xs sm:text-sm text-gray-600">Training Modules</p>
//             <p className="text-xs text-gray-500 mt-1">Available for enrollment</p>
//           </div>

//           <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow">
//             <div className="flex items-center justify-between mb-3">
//               <CheckCircle className="w-5 h-5 text-gray-500" />
//               <BarChart3 className="w-4 h-4 text-green-500" />
//             </div>
//             <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.completedModules}</p>
//             <p className="text-xs sm:text-sm text-gray-600">Completed</p>
//             <p className="text-xs text-gray-500 mt-1">{stats.overallCompletionRate}% completion rate</p>
//           </div>

//           <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow">
//             <div className="flex items-center justify-between mb-3">
//               <Clock className="w-5 h-5 text-gray-500" />
//               <AlertCircle className="w-4 h-4 text-orange-500" />
//             </div>
//             <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.pendingSignoffs}</p>
//             <p className="text-xs sm:text-sm text-gray-600">Pending Sign-offs</p>
//             <p className="text-xs text-gray-500 mt-1">Requires attention</p>
//           </div>

//           <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
//             <div className="flex items-center justify-between mb-3">
//               <TrendingUp className="w-5 h-5 text-gray-500" />
//               <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
//                 Overall
//               </div>
//             </div>
//             <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.averageProgress}%</p>
//             <p className="text-xs sm:text-sm text-gray-600">Avg. Progress</p>
//             <p className="text-xs text-gray-500 mt-1">Across all users</p>
//           </div>
//         </div>

//         {/* Main Content Grid */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
//           {/* Recent Activity */}
//           <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Activity</h2>
//               <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
//                 Live
//               </span>
//             </div>
//             <div className="space-y-3">
//               {recentActivity.length > 0 ? (
//                 recentActivity.map((activity, idx) => (
//                   <button
//                     key={idx}
//                     onClick={() => router.push(`/dashboard/users/${activity.userId}/modules`)}
//                     className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
//                   >
//                     <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
//                       {activity.userInitials}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <div className="flex items-center gap-2 mb-1">
//                         {getActionIcon(activity.action)}
//                         <p className="text-sm text-gray-900 truncate">
//                           <span className="font-semibold">{activity.userName}</span>
//                           <span className="text-gray-600"> {getActionText(activity)}</span>
//                         </p>
//                       </div>
//                       <div className="flex items-center gap-2 text-xs text-gray-500">
//                         <span className="truncate">{activity.moduleName}</span>
//                         <span>•</span>
//                         <span className="whitespace-nowrap">{activity.timeAgo}</span>
//                       </div>
//                     </div>
//                     <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors flex-shrink-0" />
//                   </button>
//                 ))
//               ) : (
//                 <div className="text-center py-8">
//                   <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
//                   <p className="text-sm text-gray-500">No recent activity</p>
//                   <p className="text-xs text-gray-400 mt-1">Activity will appear here as users progress</p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Enhanced Summary Stats */}
//           <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
//             <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Training Overview</h2>
//             <div className="space-y-4">
//               <div>
//                 <div className="flex items-center justify-between mb-3">
//                   <span className="text-sm font-medium text-gray-900">Program Completion</span>
//                   <span className="text-sm font-semibold text-gray-900">{stats.overallCompletionRate}%</span>
//                 </div>
//                 <div className="w-full bg-gray-200 rounded-full h-2">
//                   <div 
//                     className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500" 
//                     style={{ width: `${stats.overallCompletionRate}%` }}
//                   ></div>
//                 </div>
//                 <p className="text-xs text-gray-500 mt-2">{stats.completedModules} modules completed</p>
//               </div>

//               <div className="pt-4 border-t border-gray-200">
//                 <div className="flex items-center justify-between mb-2">
//                   <span className="text-sm text-gray-600">Active Trainees</span>
//                   <span className="text-lg font-semibold text-gray-900">{stats.activeUsers}</span>
//                 </div>
//                 <p className="text-xs text-gray-500">Currently engaged in training</p>
//               </div>

//               <div className="pt-4 border-t border-gray-200">
//                 <div className="flex items-center justify-between mb-2">
//                   <span className="text-sm text-gray-600">Modules in Progress</span>
//                   <span className="text-lg font-semibold text-gray-900">{stats.inProgressModules}</span>
//                 </div>
//                 <p className="text-xs text-gray-500">Across all users</p>
//               </div>

//               <div className="pt-4 border-t border-gray-200">
//                 <div className="flex items-center justify-between mb-2">
//                   <span className="text-sm text-gray-600">Requiring Attention</span>
//                   <span className="text-lg font-semibold text-orange-600">{stats.pendingSignoffs}</span>
//                 </div>
//                 <p className="text-xs text-gray-500">Pending sign-offs and reviews</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Enhanced Available Modules */}
//         <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Featured Training Modules</h2>
//               <p className="text-sm text-gray-600 mt-1">Most popular and critical training materials</p>
//             </div>
//             <button
//               onClick={() => router.push('/dashboard/modules')}
//               className="text-sm text-gray-900 hover:text-gray-600 font-medium flex items-center gap-2 group"
//             >
//               View All Modules
//               <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
//             </button>
//           </div>
          
//           {topModules.length > 0 ? (
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//               {topModules.map((module, idx) => (
//                 <button
//                   key={idx}
//                   onClick={() => router.push(`/dashboard/modules/${module.id}`)}
//                   className="group p-4 border border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left"
//                 >
//                   <div className="flex items-start justify-between mb-3">
//                     <div className="flex-1">
//                       <h3 className="text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors pr-2">
//                         {module.name}
//                       </h3>
//                       {module.category && (
//                         <span className="inline-block text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full mt-1">
//                           {module.category}
//                         </span>
//                       )}
//                     </div>
//                     <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors flex-shrink-0" />
//                   </div>
                  
//                   <p className="text-sm text-gray-600 line-clamp-2 mb-4">{module.description}</p>
                  
//                   <div className="space-y-2">
//                     <div className="flex items-center justify-between text-xs text-gray-600">
//                       <span>Completion Rate</span>
//                       <span className="font-semibold">{module.completionRate}%</span>
//                     </div>
//                     <div className="w-full bg-gray-200 rounded-full h-1.5">
//                       <div 
//                         className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500" 
//                         style={{ width: `${module.completionRate}%` }}
//                       ></div>
//                     </div>
//                     <div className="flex items-center justify-between text-xs text-gray-500">
//                       <span>{module.enrolledUsers} enrolled</span>
//                       <span>Active</span>
//                     </div>
//                   </div>
//                 </button>
//               ))}
//             </div>
//           ) : (
//             <div className="text-center py-8">
//               <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
//               <p className="text-sm text-gray-500">No training modules available</p>
//               <p className="text-xs text-gray-400 mt-1">Modules will appear here once created</p>
//             </div>
//           )}
//         </div>

//         {/* Enhanced Footer */}
//         <div className="mt-8 text-center">
//           <div className="bg-white border border-gray-200 rounded-xl p-6">
//             <p className="text-sm font-semibold text-gray-900">Sound Aircraft Services FBO</p>
//             <p className="text-sm text-gray-600 mt-1">NATA Certified Training Program</p>
//             <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
//               <span>Total Users: {stats.totalUsers}</span>
//               <span>•</span>
//               <span>Active Modules: {stats.totalModules}</span>
//               <span>•</span>
//               <span>Completion Rate: {stats.overallCompletionRate}%</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
}