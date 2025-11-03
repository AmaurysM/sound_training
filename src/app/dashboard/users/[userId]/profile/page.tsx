// app/dashboard/users/[userId]/profile/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/dashboard-context';
import { IUser, IUserModule, ITrainingModule } from '@/models/types';
import { 
  ArrowLeft, User, Mail, Calendar, Shield, 
  Edit, Save, X, Lock, Eye, EyeOff,
  BookOpen, CheckCircle, Clock, TrendingUp,
  Award, BarChart3, UserCheck, Archive
} from 'lucide-react';
import { IUserSubmodule } from '@/models';

interface UserStats {
  totalModules: number;
  completedModules: number;
  inProgressModules: number;
  completionRate: number;
  averageScore: number;
  pendingSignoffs: number;
}

interface ProfileFormData {
  name: string;
  nickname: string;
  email: string;
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, fetchCurrentUser } = useDashboard();
  const userId = params.userId as string;

  const [user, setUser] = useState<IUser | null>(null);
  const [userModules, setUserModules] = useState<IUserModule[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalModules: 0,
    completedModules: 0,
    inProgressModules: 0,
    completionRate: 0,
    averageScore: 0,
    pendingSignoffs: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    nickname: '',
    email: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [userRes, modulesRes] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch(`/api/users/${userId}/modules`)
      ]);

      if (!userRes.ok) {
        throw new Error('User not found');
      }

      const userData = await userRes.json();
      setUser(userData);
      
      // Initialize form data
      setFormData({
        name: userData.name || '',
        nickname: userData.nickname || '',
        email: userData.email || '',
        username: userData.username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      if (modulesRes.ok) {
        const modulesData = await modulesRes.json();
        const modules = modulesData.data || modulesData;
        setUserModules(modules);
        calculateStats(modules);
      }

    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (modules: IUserModule[]) => {
    const totalModules = modules.length;
    const completedModules = modules.filter(module => 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      module.submodules?.every((submod: any) => submod.signedOff)
    ).length;
    const inProgressModules = modules.filter(module => 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      module.submodules?.some((submod: any) => !submod.signedOff) && 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      module.submodules?.some((submod: any) => submod.signedOff)
    ).length;
    const pendingSignoffs = modules.reduce((count, module) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pending = module.submodules?.filter((submod: any) => 
        submod.requiresPractical && !submod.practical
      ).length || 0;
      return count + pending;
    }, 0);
    
    const completionRate = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    setStats({
      totalModules,
      completedModules,
      inProgressModules,
      completionRate,
      averageScore: 85, // This would be calculated from actual scores
      pendingSignoffs
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = {
        name: formData.name.trim(),
        nickname: formData.nickname.trim(),
        email: formData.email.trim(),
        username: formData.username.trim()
      };

      // Only include password if changing password
      if (isChangingPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        if (formData.newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        updates.password = formData.newPassword;
        updates.currentPassword = formData.currentPassword;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      
      // Update current user if it's the same user
      if (currentUser?._id === userId) {
        fetchCurrentUser();
      }

      setSaveMessage({
        type: 'success',
        message: 'Profile updated successfully'
      });

      setIsEditing(false);
      setIsChangingPassword(false);
      
      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);

    } catch (err) {
      console.error('Error updating profile:', err);
      setSaveMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update profile'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsChangingPassword(false);
    setFormData({
      name: user?.name || '',
      nickname: user?.nickname || '',
      email: user?.email || '',
      username: user?.username || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setSaveMessage(null);
  };

  const canEditProfile = currentUser?.role === 'Coordinator' || currentUser?._id === userId;
  const isOwnProfile = currentUser?._id === userId;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested profile could not be found.'}</p>
          <button
            onClick={() => router.push('/dashboard/users')}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(isOwnProfile ? '/dashboard' : `/dashboard/users/${userId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isOwnProfile ? 'Back to Dashboard' : 'Back to User Details'}
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{user.name}</h1>
                <p className="text-gray-600 mt-1">
                  {user.nickname && `"${user.nickname}" • `}
                  {user.role} {user.archived && '• Archived'}
                </p>
              </div>
            </div>

            {canEditProfile && (
              <div className="flex gap-3">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            saveMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {saveMessage.message}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Total Modules</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalModules}</p>
            <p className="text-xs text-gray-500 mt-1">Assigned training</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Completed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.completedModules}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.completionRate}% completion rate</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-600">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.inProgressModules}</p>
            <p className="text-xs text-gray-500 mt-1">Active training</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <UserCheck className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">Pending Sign-offs</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingSignoffs}</p>
            <p className="text-xs text-gray-500 mt-1">Requires attention</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Avg. Score</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
            <p className="text-xs text-gray-500 mt-1">Performance</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">Status</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 capitalize">
              {user.archived ? 'Archived' : 'Active'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Account status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter full name"
                  />
                ) : (
                  <p className="text-gray-900">{user.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nickname
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter nickname (optional)"
                  />
                ) : (
                  <p className="text-gray-900">{user.nickname || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email address"
                  />
                ) : (
                  <p className="text-gray-900">{user.email || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter username"
                  />
                ) : (
                  <p className="text-gray-900 font-mono">{user.username}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Role
                </label>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'Coordinator' 
                      ? 'bg-purple-100 text-purple-800'
                      : user.role === 'Trainer'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                  {user.archived && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
                      <Archive className="w-3 h-3" />
                      Archived
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Member Since
                </label>
                <p className="text-gray-900">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'}
                </p>
              </div>
            </div>

            {/* Password Change Section */}
            {isEditing && isOwnProfile && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Change Password
                  </h3>
                  <button
                    onClick={() => setIsChangingPassword(!isChangingPassword)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {isChangingPassword ? 'Cancel Password Change' : 'Change Password'}
                  </button>
                </div>

                {isChangingPassword && (
                  <div className="space-y-4 animate-fadeIn">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Training Overview */}
          <div className="space-y-6">
            {/* Progress Chart */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Training Progress
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Overall Completion</span>
                    <span className="text-sm font-semibold text-gray-900">{stats.completionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${stats.completionRate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{stats.completedModules}</div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-500">{stats.inProgressModules}</div>
                    <div className="text-xs text-gray-600">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-400">
                      {stats.totalModules - stats.completedModules - stats.inProgressModules}
                    </div>
                    <div className="text-xs text-gray-600">Not Started</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/dashboard/users/${userId}/modules`)}
                  className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">View Training Modules</div>
                    <div className="text-sm text-gray-600">{stats.totalModules} assigned modules</div>
                  </div>
                </button>

                <button
                  onClick={() => router.push(`/dashboard/users/${userId}/history`)}
                  className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <Award className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">Training History</div>
                    <div className="text-sm text-gray-600">View completion history</div>
                  </div>
                </button>

                {currentUser?.role === 'Coordinator' && !isOwnProfile && (
                  <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                    <Edit className="w-5 h-5 text-purple-500" />
                    <div>
                      <div className="font-medium text-gray-900">Manage Training</div>
                      <div className="text-sm text-gray-600">Assign modules & track progress</div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {userModules
                  .filter(module => module.updatedAt)
                  .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
                  .slice(0, 3)
                  .map((module, index) => (
                    <div key={module._id!.toString()} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        module.submodules?.every((sm: any) => sm.signedOff) 
                          ? 'bg-green-500' 
                          : 'bg-blue-500'
                      }`}>
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {(module.tModule as ITrainingModule)?.name || 'Training Module'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Updated {module.updatedAt ? new Date(module.updatedAt).toLocaleDateString() : 'recently'}
                        </div>
                      </div>
                    </div>
                  ))}
                
                {userModules.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No training activity yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}