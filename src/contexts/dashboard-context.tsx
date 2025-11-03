// src/contexts/DashboardContext.tsx
"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { IUser, IUserModule, ITrainingModule } from '@/models/types';

interface DashboardContextType {
  // User state
  currentUser: IUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<IUser | null>>;
  viewedUser: IUser | null;
  setViewedUser: React.Dispatch<React.SetStateAction<IUser | null>>;
  
  // Users list state
  users: IUser[];
  setUsers: React.Dispatch<React.SetStateAction<IUser[]>>;
  
  // Training modules state
  userModules: IUserModule[];
  setUserModules: React.Dispatch<React.SetStateAction<IUserModule[]>>;
  originalData: IUserModule[];
  setOriginalData: React.Dispatch<React.SetStateAction<IUserModule[]>>;
  availableModules: ITrainingModule[];
  setAvailableModules: React.Dispatch<React.SetStateAction<ITrainingModule[]>>;
  
  // UI state - Users page
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  selectedRole: string | null;
  setSelectedRole: React.Dispatch<React.SetStateAction<string | null>>;
  showAddUserForm: boolean;
  setShowAddUserForm: React.Dispatch<React.SetStateAction<boolean>>;
  showSuccessMessage: boolean;
  setShowSuccessMessage: React.Dispatch<React.SetStateAction<boolean>>;
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  
  // UI state - Modules page
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loadingModules: boolean;
  setLoadingModules: React.Dispatch<React.SetStateAction<boolean>>;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  saveSuccess: boolean;
  setSaveSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  hasChanges: boolean;
  setHasChanges: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Modal state
  showAddModal: boolean;
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedModuleIds: string[];
  setSelectedModuleIds: React.Dispatch<React.SetStateAction<string[]>>;
  addingModule: boolean;
  setAddingModule: React.Dispatch<React.SetStateAction<boolean>>;
  showHistoryModal: boolean;
  setShowHistoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedUserModule: IUserModule | null;
  setSelectedUserModule: React.Dispatch<React.SetStateAction<IUserModule | null>>;
  showMobileMenu: boolean;
  setShowMobileMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showEditModal: boolean;
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Training cycle state
  selectedYear: number | 'all';
  setSelectedYear: React.Dispatch<React.SetStateAction<number | 'all'>>;
  showActiveCycles: boolean;
  setShowActiveCycles: React.Dispatch<React.SetStateAction<boolean>>;
  showCycleFilter: boolean;
  setShowCycleFilter: React.Dispatch<React.SetStateAction<boolean>>;
  availableYears: number[];
  setAvailableYears: React.Dispatch<React.SetStateAction<number[]>>;
  
  // Shared functions
  fetchUsers: (query?: string) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  fetchModules: () => Promise<void>;
  fetchViewedUserAndModules: (userId: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardContextProvider');
  }
  return context;
}

export default function DashboardContextProvider({ children }: { children: ReactNode }) {
  // User state
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [viewedUser, setViewedUser] = useState<IUser | null>(null);
  const [users, setUsers] = useState<IUser[]>([]);
  
  // Training modules state
  const [userModules, setUserModules] = useState<IUserModule[]>([]);
  const [originalData, setOriginalData] = useState<IUserModule[]>([]);
  const [availableModules, setAvailableModules] = useState<ITrainingModule[]>([]);
  
  // UI state - Users page
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // UI state - Modules page
  const [loading, setLoading] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [addingModule, setAddingModule] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUserModule, setSelectedUserModule] = useState<IUserModule | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Training cycle state
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [showActiveCycles, setShowActiveCycles] = useState(true);
  const [showCycleFilter, setShowCycleFilter] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const fetchUsers = async (query = '') => {
    try {
      const res = await fetch(`/api/users?q=${query}`);
      if (!res.ok) return;
      const data: IUser[] = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) throw new Error('Failed to fetch user');
      const user: IUser = await res.json();
      setCurrentUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    if (!currentUser) return;
    try {
      setLoadingModules(true);
      const res = await fetch(`/api/training-modules`);
      if (!res.ok) throw new Error('Failed to fetch modules');
      const response = await res.json();
      const modules: ITrainingModule[] = response.data || response;
      setAvailableModules(modules);
    } catch (err) {
      console.error('Failed to load training modules:', err);
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchViewedUserAndModules = async (userId: string) => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);

      const targetUserId = userId ? userId : currentUser._id;

      const userRes = await fetch(`/api/users/${targetUserId}`);
      if (!userRes.ok) throw new Error('Failed to fetch user data');

      const userResponse = await userRes.json();
      const user: IUser = userResponse.data || userResponse;
      setViewedUser(user);

      const modulesRes = await fetch(`/api/users/${targetUserId}/modules`);
      if (!modulesRes.ok) throw new Error('Failed to fetch modules');

      const modulesResponse = await modulesRes.json();
      const modules: IUserModule[] = modulesResponse.data || modulesResponse;

      const validModules = modules.filter(m =>
        m.tModule && (typeof m.tModule === 'object' ? 'name' in m.tModule : true)
      );

      setUserModules(validModules);
      setOriginalData(JSON.parse(JSON.stringify(validModules)));
      setHasChanges(false);

      // Extract unique years from modules
      const years = [...new Set(validModules.map(m => m.trainingYear).filter(Boolean))] as number[];
      years.sort((a, b) => b - a);
      setAvailableYears(years);

      // Set default year if current year not in list
      if (years.length > 0 && !years.includes(new Date().getFullYear())) {
        setSelectedYear(years[0]);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  const value: DashboardContextType = {
    currentUser,
    setCurrentUser,
    viewedUser,
    setViewedUser,
    users,
    setUsers,
    userModules,
    setUserModules,
    originalData,
    setOriginalData,
    availableModules,
    setAvailableModules,
    searchQuery,
    setSearchQuery,
    showArchived,
    setShowArchived,
    selectedRole,
    setSelectedRole,
    showAddUserForm,
    setShowAddUserForm,
    showSuccessMessage,
    setShowSuccessMessage,
    isSubmitting,
    setIsSubmitting,
    loading,
    setLoading,
    loadingModules,
    setLoadingModules,
    saving,
    setSaving,
    error,
    setError,
    saveSuccess,
    setSaveSuccess,
    hasChanges,
    setHasChanges,
    showAddModal,
    setShowAddModal,
    selectedModuleIds,
    setSelectedModuleIds,
    addingModule,
    setAddingModule,
    showHistoryModal,
    setShowHistoryModal,
    selectedUserModule,
    setSelectedUserModule,
    showMobileMenu,
    setShowMobileMenu,
    showEditModal,
    setShowEditModal,
    selectedYear,
    setSelectedYear,
    showActiveCycles,
    setShowActiveCycles,
    showCycleFilter,
    setShowCycleFilter,
    availableYears,
    setAvailableYears,
    fetchUsers,
    fetchCurrentUser,
    fetchModules,
    fetchViewedUserAndModules,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}