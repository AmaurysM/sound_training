import { Award, Clock, Edit, Home, LogOut, Menu, RefreshCw, TrendingUp, User } from "lucide-react";
import { IUser, Stat } from "@/models/types";

import { useRouter } from 'next/navigation';

const TrainingHeader = ({
    currentUser,
    viewedUser,
    handleRefresh,
    loading,
    setShowEditModal,
    setShowMobileMenu,
    showMobileMenu,
    stats
}: {
    currentUser: IUser,
    viewedUser: IUser,
    handleRefresh: () => void,
    loading: boolean,
    setShowEditModal: (show: boolean) => void,
    setShowMobileMenu: (show: boolean) => void,
    showMobileMenu: boolean,
    stats: Stat
}) => {
    const router = useRouter();

    const isEditable = currentUser && (currentUser.role === 'Coordinator' || currentUser.role === 'Trainer');
    const isCoordinator = currentUser?.role === 'Coordinator';
    const isTrainee = currentUser?.role === 'Trainee';
    const isViewingOwnProfile = currentUser?._id === viewedUser?._id;

    const handleLogout = async () => {
        try {
            const res = await fetch('/api/logout', {
                method: 'POST',
            });

            if (res.ok) {
                router.push('/login');
            }
        } catch (err) {
            console.error('Logout failed', err);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
            <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
                    {!isTrainee && currentUser._id && (
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                            title="Back to dashboard"
                        >
                            <Home className="w-5 h-5 text-gray-600" />
                        </button>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-nowrap">
                            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                                {isTrainee ? 'My Training Progress' : (isEditable ? 'Training Management' : 'My Training')}
                            </h1>
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                                title="Refresh data"
                            >
                                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 flex-wrap">
                            <User className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                            <span className="font-medium text-gray-900 truncate">{viewedUser.name}</span>
                            <span>•</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap">
                                {viewedUser.role}
                            </span>{isCoordinator && !isViewingOwnProfile && (
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Edit user"
                                >
                                    <Edit className="w-4 h-4 text-gray-600" />
                                </button>
                            )}
                        </div>

                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isTrainee && (
                        <button
                            onClick={handleLogout}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Menu className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            <div className={`${showMobileMenu ? 'block' : 'hidden'} lg:block mt-4`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                            <p className="text-xs font-medium text-blue-900">Progress</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.percentage}%</p>
                    </div>
                    <div className="bg-linear-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Award className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                            <p className="text-xs font-medium text-green-900">Completed</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-green-900">
                            {stats.completed}/{stats.total}
                        </p>
                    </div>
                    <div className="bg-linear-to-br from-amber-50 to-amber-100 rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                            <p className="text-xs font-medium text-amber-900">In Progress</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-amber-900">{stats.inProgress}</p>
                    </div>
                </div>

                {isTrainee && (
                    <button
                        onClick={handleLogout}
                        className="sm:hidden w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                )}
            </div>

            <div className="mt-4 sm:mt-6">
                <div className="flex justify-between items-center mb-2 text-xs sm:text-sm">
                    <span className="font-medium text-gray-700">Overall Progress</span>
                    <span className="text-gray-600">{stats.completed} of {stats.total} modules</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                    <div
                        className="bg-linear-to-r from-blue-500 to-blue-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                        style={{ width: `${stats.percentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export default TrainingHeader;
