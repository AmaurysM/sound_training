'use client'

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { ITrainingModule, ITrainingSubmodule, IUser, IUserModule } from '@/models/types';
import { BookOpen, ArrowLeft, Users, CheckCircle, Clock, ChevronRight, Loader2, AlertCircle, List } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { IUserSubmodule } from '@/models';

export default function ModuleDetailPage() {
//   const router = useRouter();
//   const params = useParams();
//   const moduleId = params?.moduleId as string;
  
//   const { currentUser, fetchCurrentUser } = useDashboard();
//   const [module, setModule] = useState<ITrainingModule | null>(null);
//   const [submodules, setSubmodules] = useState<ITrainingSubmodule[]>([]);
//   const [enrolledUsers, setEnrolledUsers] = useState<IUser[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [stats, setStats] = useState({
//     totalEnrolled: 0,
//     completed: 0,
//     inProgress: 0,
//     notStarted: 0,
//     completionRate: 0,
//     totalSubmodules: 0
//   });

//   useEffect(() => {
//     const init = async () => {
//       if (!currentUser) {
//         await fetchCurrentUser();
//       }
//       await fetchModuleData();
//     };
//     init();
//   }, [moduleId, currentUser]);

//   const fetchModuleData = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       // Fetch module details
//       const moduleRes = await fetch(`/api/training-modules/${moduleId}`);
//       if (!moduleRes.ok) throw new Error('Failed to fetch module');
//       const moduleData = await moduleRes.json();
//       const moduleInfo: ITrainingModule = moduleData.data || moduleData;
//       setModule(moduleInfo);

//       // Handle submodules
//       let submodulesList: ITrainingSubmodule[] = [];
//       if (moduleInfo.submodules && Array.isArray(moduleInfo.submodules)) {
//         if (typeof moduleInfo.submodules[0] === 'object' && moduleInfo.submodules[0] !== null) {
//           submodulesList = moduleInfo.submodules as ITrainingSubmodule[];
//         }
//         setSubmodules(submodulesList);
//       }

//       // Fetch all users to find who has this module
//       const usersRes = await fetch('/api/users');
//       if (usersRes.ok) {
//         const allUsers: IUser[] = await usersRes.json();
        
//         // Fetch user modules for each user to check enrollment
//         const enrollmentPromises = allUsers.map(async (user) => {
//           try {
//             const userModulesRes = await fetch(`/api/users/${user._id}/modules`);
//             if (userModulesRes.ok) {
//               const modulesData = await userModulesRes.json();
//               const userModules: IUserModule[] = modulesData.data || modulesData;
              
//               // Find if this user has the current module
//               const hasModule = userModules.find(um => {
//                 const modId = typeof um.tModule === 'object' ? um.tModule._id : um.tModule;
//                 return modId?.toString() === moduleId;
//               });
              
//               if (hasModule) {
//                 // Calculate status based on submodules completion
//                 let status = 'not-started';
//                 if (hasModule.submodules && Array.isArray(hasModule.submodules)) {
//                   const totalSubs = hasModule.submodules.length;
//                   if (totalSubs > 0) {
//                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                     const completedSubs = hasModule.submodules.filter((sub: any) => {
//                       return typeof sub === 'object' && sub.signedOff;
//                     }).length;
                    
//                     if (completedSubs === totalSubs) {
//                       status = 'completed';
//                     } else if (completedSubs > 0) {
//                       status = 'in-progress';
//                     }
//                   }
//                 }
                
//                 return {
//                   userId: user._id,
//                   name: user.name,
//                   status
//                 };
//               }
//             }
//           } catch (err) {
//             console.error(`Error fetching modules for user ${user._id}:`, err);
//           }
//           return null;
//         });

//         const enrollmentResults = await Promise.all(enrollmentPromises);
//         const enrolled = enrollmentResults.filter(result => result !== null);
//         setEnrolledUsers(enrolled);

//         // Calculate stats
//         const total = enrolled.length;
//         const completed = enrolled.filter(u => u.status === 'completed').length;
//         const inProgress = enrolled.filter(u => u.status === 'in-progress').length;
//         const notStarted = total - completed - inProgress;
//         const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

//         setStats({
//           totalEnrolled: total,
//           completed,
//           inProgress,
//           notStarted,
//           completionRate,
//           totalSubmodules: submodulesList.length
//         });
//       }

//     } catch (err) {
//       console.error('Error fetching module data:', err);
//       setError(err instanceof Error ? err.message : 'Failed to load module');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const isCoordinator = currentUser?.role === 'Coordinator';

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//         <div className="text-center">
//           <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
//           <p className="text-sm text-gray-600">Loading module...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error || !module) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//         <div className="text-center">
//           <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//           <h3 className="text-lg font-semibold text-gray-900 mb-2">Module Not Found</h3>
//           <p className="text-sm text-gray-600 mb-4">{error || 'This module does not exist'}</p>
//           <button
//             onClick={() => router.push('/dashboard/modules')}
//             className="text-sm text-gray-900 hover:text-gray-600 font-medium"
//           >
//             Back to Modules
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
//         {/* Back Button */}
//         <button
//           onClick={() => router.push('/dashboard/modules')}
//           className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors"
//         >
//           <ArrowLeft className="w-4 h-4" />
//           Back to Modules
//         </button>

//         {/* Header */}
//         <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 mb-4 sm:mb-6">
//           <div className="flex items-start gap-4 mb-4">
//             <div className="p-3 bg-gray-100 rounded-lg">
//               <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-gray-900" />
//             </div>
//             <div className="flex-1">
//               <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
//                 {module.name}
//               </h1>
//               {module.description && (
//                 <p className="text-sm sm:text-base text-gray-600">
//                   {module.description}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Action Buttons */}
//           <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
//             {isCoordinator && (
//               <>
//                 <button
//                   onClick={() => router.push(`/dashboard/modules/${moduleId}/users`)}
//                   className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
//                 >
//                   <Users className="w-4 h-4" />
//                   View Enrolled Users
//                 </button>
//                 {stats.totalSubmodules > 0 && (
//                   <button
//                     onClick={() => router.push(`/dashboard/modules/${moduleId}/submodules`)}
//                     className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-900 rounded-lg hover:border-gray-900 transition-colors text-sm font-medium"
//                   >
//                     <List className="w-4 h-4" />
//                     View Submodules
//                   </button>
//                 )}
//                 <button
//                   onClick={() => {/* Handle edit */}}
//                   className="px-4 py-2 border border-gray-200 text-gray-900 rounded-lg hover:border-gray-900 transition-colors text-sm font-medium"
//                 >
//                   Edit Module
//                 </button>
//               </>
//             )}
//             {!isCoordinator && (
//               <button
//                 onClick={() => router.push(`/dashboard/users/${currentUser?._id}/modules`)}
//                 className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
//               >
//                 View My Training
//               </button>
//             )}
//           </div>
//         </div>

//         {/* Stats Grid */}
//         <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
//           <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
//             <Users className="w-5 h-5 text-gray-500 mb-2" />
//             <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.totalEnrolled}</p>
//             <p className="text-xs sm:text-sm text-gray-600">Total Enrolled</p>
//           </div>

//           <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
//             <CheckCircle className="w-5 h-5 text-gray-500 mb-2" />
//             <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.completed}</p>
//             <p className="text-xs sm:text-sm text-gray-600">Completed</p>
//           </div>

//           <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
//             <Clock className="w-5 h-5 text-gray-500 mb-2" />
//             <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.inProgress}</p>
//             <p className="text-xs sm:text-sm text-gray-600">In Progress</p>
//           </div>

//           <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
//             <List className="w-5 h-5 text-gray-500 mb-2" />
//             <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.totalSubmodules}</p>
//             <p className="text-xs sm:text-sm text-gray-600">Submodules</p>
//           </div>

//           <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 col-span-2 lg:col-span-1">
//             <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.completionRate}%</div>
//             <p className="text-xs sm:text-sm text-gray-600 mb-2">Completion Rate</p>
//             <div className="w-full bg-gray-200 rounded-full h-1.5">
//               <div 
//                 className="bg-gray-900 h-1.5 rounded-full transition-all" 
//                 style={{ width: `${stats.completionRate}%` }}
//               ></div>
//             </div>
//           </div>
//         </div>

//         {/* Main Content Grid */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
//           {/* Submodules Preview */}
//           <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
//                 Submodules {stats.totalSubmodules > 0 && `(${stats.totalSubmodules})`}
//               </h2>
//               {isCoordinator && stats.totalSubmodules > 0 && (
//                 <button
//                   onClick={() => router.push(`/dashboard/modules/${moduleId}/submodules`)}
//                   className="text-sm text-gray-900 hover:text-gray-600 font-medium flex items-center gap-1"
//                 >
//                   View All
//                   <ChevronRight className="w-4 h-4" />
//                 </button>
//               )}
//             </div>
            
//             {submodules.length > 0 ? (
//               <div className="space-y-2 sm:space-y-3">
//                 {submodules.slice(0, 5).map((submodule) => (
//                   <div
//                     key={submodule._id!.toString()}
//                     className="p-4 border border-gray-200 rounded-lg hover:border-gray-900 transition-colors"
//                   >
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="flex-1">
//                         <div className="flex items-center gap-2 mb-1 flex-wrap">
//                           {submodule.code && (
//                             <span className="text-xs font-mono font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
//                               {submodule.code}
//                             </span>
//                           )}
//                           {submodule.requiresPractical && (
//                             <span className="text-xs font-medium text-gray-700 bg-gray-200 px-2 py-1 rounded">
//                               Practical Required
//                             </span>
//                           )}
//                         </div>
//                         <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1">
//                           {submodule.title}
//                         </h3>
//                         {submodule.description && (
//                           <p className="text-xs sm:text-sm text-gray-600">
//                             {submodule.description}
//                           </p>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//                 {submodules.length > 5 && (
//                   <button
//                     onClick={() => router.push(`/dashboard/modules/${moduleId}/submodules`)}
//                     className="w-full py-3 text-sm text-gray-600 hover:text-gray-900 font-medium"
//                   >
//                     View {submodules.length - 5} more submodules
//                   </button>
//                 )}
//               </div>
//             ) : (
//               <div className="text-center py-8 sm:py-12">
//                 <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
//                 <p className="text-sm text-gray-500">No submodules available</p>
//                 <p className="text-xs text-gray-400 mt-1">Submodules will appear here once added</p>
//               </div>
//             )}
//           </div>

//           {/* Sidebar */}
//           <div className="space-y-4 sm:space-y-6">
//             {/* Progress Summary */}
//             <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
//               <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Progress Summary</h2>
//               <div className="space-y-4">
//                 <div>
//                   <div className="flex items-center justify-between mb-2">
//                     <span className="text-sm text-gray-600">Completed</span>
//                     <span className="text-sm font-semibold text-gray-900">{stats.completed}</span>
//                   </div>
//                   {stats.totalEnrolled > 0 && (
//                     <div className="w-full bg-gray-200 rounded-full h-1.5">
//                       <div 
//                         className="bg-gray-900 h-1.5 rounded-full transition-all" 
//                         style={{ width: `${(stats.completed / stats.totalEnrolled) * 100}%` }}
//                       ></div>
//                     </div>
//                   )}
//                 </div>

//                 <div className="pt-4 border-t border-gray-200">
//                   <div className="flex items-center justify-between mb-1">
//                     <span className="text-sm text-gray-600">In Progress</span>
//                     <span className="text-sm font-semibold text-gray-900">{stats.inProgress}</span>
//                   </div>
//                 </div>

//                 <div className="pt-4 border-t border-gray-200">
//                   <div className="flex items-center justify-between mb-1">
//                     <span className="text-sm text-gray-600">Not Started</span>
//                     <span className="text-sm font-semibold text-gray-900">{stats.notStarted}</span>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Recent Users */}
//             {enrolledUsers.length > 0 && (
//               <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
//                 <div className="flex items-center justify-between mb-4">
//                   <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Users</h2>
//                   {isCoordinator && (
//                     <button
//                       onClick={() => router.push(`/dashboard/modules/${moduleId}/users`)}
//                       className="text-xs sm:text-sm text-gray-900 hover:text-gray-600 font-medium"
//                     >
//                       View All
//                     </button>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   {enrolledUsers.slice(0, 5).map((user, idx) => (
//                     <button
//                       key={idx}
//                       onClick={() => isCoordinator && router.push(`/dashboard/users/${user.userId}/modules`)}
//                       disabled={!isCoordinator}
//                       className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:cursor-default"
//                     >
//                       <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
//                         {user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="text-sm font-medium text-gray-900 truncate">
//                           {user.name || 'Unknown User'}
//                         </p>
//                         <p className="text-xs text-gray-500 capitalize">
//                           {user.status?.replace('-', ' ') || 'Not started'}
//                         </p>
//                       </div>
//                       {isCoordinator && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="mt-8 text-center">
//           <p className="text-xs sm:text-sm text-gray-500">
//             Sound Aircraft Services FBO • NATA Certified Training
//           </p>
//         </div>
//       </div>
//     </div>
//   );
}