// src/app/dashboard/page.tsx

'use client';
import React, { useEffect, useState, startTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Archive, ArchiveRestore, Users, LogOut, User as UserIcon, BookOpen, Settings, ChevronDown, Menu, X } from 'lucide-react';

interface User {
    _id: string;
    name: string;
    username: string;
    role: 'Coordinator' | 'Trainer' | 'Trainee';
    archived?: boolean;
    createdAt?: string;
}

const roleOptions = [
    { value: 'Trainee', label: 'Trainee' },
    { value: 'Trainer', label: 'Trainer' },
    { value: 'Coordinator', label: 'Coordinator' },
];

export default function DashboardPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [showAddUserForm, setShowAddUserForm] = useState(false);
    const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
    const [searchRoleDropdownOpen, setSearchRoleDropdownOpen] = useState(false);
    const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const roleDropdownRef = useRef<HTMLDivElement>(null);
    const searchRoleDropdownRef = useRef<HTMLDivElement>(null);
    const settingsDropdownRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const [newUserForm, setNewUserForm] = useState({
        name: '',
        username: '',
        password: '',
        role: 'Trainee' as 'Trainee' | 'Trainer' | 'Coordinator',
    });

    const fetchUsers = async (query = '') => {
        try {
            const res = await fetch(`/api/users?q=${query}`);
            if (!res.ok) return;
            const data: User[] = await res.json();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
                setRoleDropdownOpen(false);
            }
            if (searchRoleDropdownRef.current && !searchRoleDropdownRef.current.contains(event.target as Node)) {
                setSearchRoleDropdownOpen(false);
            }
            if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
                setSettingsDropdownOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const res = await fetch('/api/me');
                if (!res.ok) return;
                const user: User = await res.json();
                setCurrentUser(user);
            } catch (err) {
                console.error('Failed to fetch current user', err);
            }
        };

        startTransition(async () => {
            await fetchCurrentUser();
            fetchUsers();
        });
    }, [router]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        fetchUsers(value);
    };

    const handleAddUser = async () => {
        if (!newUserForm.name.trim() || !newUserForm.username.trim() || !newUserForm.password.trim()) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUserForm),
            });

            if (res.ok) {
                setNewUserForm({ name: '', username: '', password: '', role: 'Trainee' });
                setShowAddUserForm(false);
                fetchUsers();
            } else {
                const error = await res.json();
                alert(error.message || 'Failed to add user');
            }
        } catch (err) {
            console.error('Failed to add user', err);
            alert('Failed to add user');
        }
    };

    const handleToggleArchive = async (user: User) => {
        try {
            await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: user._id, archived: !user.archived }),
            });
            fetchUsers();
        } catch (err) {
            console.error('Failed to update user', err);
        }
    };

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

    const handleViewMyTraining = () => {
        if (currentUser) {
            router.push(`/dashboard/train/${currentUser._id}`);
        }
    };

    const handleUserClick = (user: User) => {
        if (currentUser?.role === 'Coordinator') {
            router.push(`/dashboard/train/${user._id}`);
            return;
        }

        if (currentUser?.role === 'Trainer' && user.role === 'Trainee') {
            router.push(`/dashboard/train/${user._id}`);
            return;
        }
    };

    if (!currentUser) return null;

    if (currentUser.role === 'Trainee') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-gray-600">Access Denied</p>
                    <button
                        onClick={handleLogout}
                        className="mt-4 px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
                    >
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    const filteredUsers = users.filter((u) => {
        if (u._id === currentUser._id) return false;

        const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesArchive = showArchived ? u.archived : !u.archived;
        const matchesRole = selectedRole ? u.role === selectedRole : true;
        const matchesPermission = currentUser.role === 'Coordinator' || u.role === 'Trainee';

        return matchesSearch && matchesArchive && matchesRole && matchesPermission;
    });

    const stats = {
        total: users.filter(u => !u.archived).length,
        trainees: users.filter(u => u.role === 'Trainee' && !u.archived ).length,
        trainers: users.filter(u => u.role === 'Trainer' && !u.archived ).length,
        coordinators: users.filter(u => u.role === 'Coordinator' && !u.archived ).length,
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">NATA Training Dashboard</h1>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1 flex items-center gap-1">
                            <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span className="truncate">{currentUser.name}</span>
                            <span className="text-gray-400">•</span>
                            <span>{currentUser.role}</span>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="sm:hidden">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 rounded-md text-gray-700 hover:bg-gray-100 transition"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Desktop Stats and Settings */}
                    <div className="hidden sm:flex sm:items-center gap-4 sm:gap-6">
                        <div className="hidden md:flex md:gap-6 text-sm">
                            <div className="text-right">
                                <p className="text-gray-500 text-xs">Total Users</p>
                                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-500 text-xs">Trainees</p>
                                <p className="text-xl font-semibold text-gray-900">{stats.trainees}</p>
                            </div>
                            {currentUser.role === 'Coordinator' && (
                                <>
                                    <div className="text-right">
                                        <p className="text-gray-500 text-xs">Trainers</p>
                                        <p className="text-xl font-semibold text-gray-900">{stats.trainers}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-500 text-xs">Coordinators</p>
                                        <p className="text-xl font-semibold text-gray-900">{stats.coordinators}</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Desktop Settings Dropdown */}
                        <div ref={settingsDropdownRef} className="hidden sm:block relative">
                            <button
                                onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
                            >
                                <Settings className="w-4 h-4" />
                                <span className="hidden lg:inline">Menu</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${settingsDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {settingsDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                                    <button
                                        onClick={() => {
                                            handleViewMyTraining();
                                            setSettingsDropdownOpen(false);
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        My Training
                                    </button>

                                    {currentUser.role === 'Coordinator' && !showArchived && (
                                        <button
                                            onClick={() => {
                                                setShowAddUserForm(true);
                                                setSettingsDropdownOpen(false);
                                            }}
                                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Add New User
                                        </button>
                                    )}

                                    <div className="border-t border-gray-100 my-1"></div>

                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setSettingsDropdownOpen(false);
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div ref={mobileMenuRef} className="sm:hidden bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                        {/* Mobile Stats */}
                        <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-100">
                            <div className="text-center">
                                <p className="text-gray-500 text-xs">Total Users</p>
                                <p className="text-lg font-semibold text-gray-900">{stats.total}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-500 text-xs">Trainees</p>
                                <p className="text-lg font-semibold text-gray-900">{stats.trainees}</p>
                            </div>
                            {currentUser.role === 'Coordinator' && (
                                <>
                                    <div className="text-center">
                                        <p className="text-gray-500 text-xs">Trainers</p>
                                        <p className="text-lg font-semibold text-gray-900">{stats.trainers}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-gray-500 text-xs">Coordinators</p>
                                        <p className="text-lg font-semibold text-gray-900">{stats.coordinators}</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Actions */}
                        <button
                            onClick={() => {
                                handleViewMyTraining();
                                setMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                            <BookOpen className="w-4 h-4" />
                            My Training Modules
                        </button>

                        {currentUser.role === 'Coordinator' && !showArchived && (
                            <button
                                onClick={() => {
                                    setShowAddUserForm(true);
                                    setMobileMenuOpen(false);
                                }}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add New User
                            </button>
                        )}

                        <button
                            onClick={() => {
                                handleLogout();
                                setMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                )}

                {/* Add New User Form */}
                {showAddUserForm && currentUser.role === 'Coordinator' && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900">Add New User</h3>
                            <button
                                onClick={() => setShowAddUserForm(false)}
                                className="text-sm text-gray-500 hover:text-gray-900"
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                        value={newUserForm.name}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Username</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                        value={newUserForm.username}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
                                    <input
                                        type="password"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                        value={newUserForm.password}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                    />
                                </div>

                                <div ref={searchRoleDropdownRef} className="relative">
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>

                                    <div
                                        onClick={() => setSearchRoleDropdownOpen((prev) => !prev)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white cursor-pointer flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-gray-900"
                                    >
                                        {newUserForm.role || 'Select Role'}
                                        <svg
                                            className={`w-4 h-4 transform transition-transform ${searchRoleDropdownOpen ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>

                                    {searchRoleDropdownOpen && (
                                        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                                            {roleOptions.map((opt) => (
                                                <li
                                                    key={opt.value}
                                                    onClick={() => {
                                                        setNewUserForm({ ...newUserForm, role: opt.value as 'Trainee' | 'Trainer' | 'Coordinator' });
                                                        setSearchRoleDropdownOpen(false);
                                                    }}
                                                    className={`px-3 py-2 text-sm cursor-pointer ${newUserForm.role === opt.value
                                                        ? 'bg-gray-900 text-white'
                                                        : 'hover:bg-gray-50 text-gray-900'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleAddUser}
                                className="w-full px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm font-medium transition"
                            >
                                Add User
                            </button>
                        </div>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="flex flex-col gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div ref={roleDropdownRef} className="relative z-40 flex-1">
                            <div
                                onClick={() => setRoleDropdownOpen((prev) => !prev)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white cursor-pointer flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-gray-900"
                            >
                                <span className="truncate">{selectedRole || 'All Roles'}</span>
                                <svg
                                    className={`w-4 h-4 transform transition-transform shrink-0 ml-2 ${roleDropdownOpen ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {roleDropdownOpen && (
                                <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                                    <li
                                        onClick={() => {
                                            setSelectedRole(null);
                                            setRoleDropdownOpen(false);
                                        }}
                                        className={`px-3 py-2 text-sm cursor-pointer ${!selectedRole ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-900'}`}
                                    >
                                        All Roles
                                    </li>

                                    {roleOptions.map((opt) => {
                                        if ((opt.value === 'Trainer' || opt.value === 'Coordinator') && currentUser?.role !== 'Coordinator') return null;

                                        return (
                                            <li
                                                key={opt.value}
                                                onClick={() => {
                                                    setSelectedRole(opt.value);
                                                    setRoleDropdownOpen(false);
                                                }}
                                                className={`px-3 py-2 text-sm cursor-pointer ${selectedRole === opt.value ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-900'}`}
                                            >
                                                {opt.label}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {currentUser.role === 'Coordinator' && (
                            <button
                                onClick={() => setShowArchived(!showArchived)}
                                className={`flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium transition whitespace-nowrap ${showArchived
                                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {showArchived ? (
                                    <>
                                        <ArchiveRestore className="w-4 h-4" />
                                        <span>View Active</span>
                                    </>
                                ) : (
                                    <>
                                        <Archive className="w-4 h-4" />
                                        <span>View Archived</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* User List */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Username
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    {currentUser.role === 'Coordinator' && (
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredUsers.map((user) => {
                                    const canAccess = currentUser.role === 'Coordinator' ||
                                        (currentUser.role === 'Trainer' && user.role === 'Trainee');

                                    return (
                                        <tr
                                            key={user._id}
                                            onClick={() => canAccess && handleUserClick(user)}
                                            className={canAccess ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50'}
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{user.username}</div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                                                    {user.role}
                                                </span>
                                            </td>
                                            {currentUser.role === 'Coordinator' && (
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleArchive(user);
                                                        }}
                                                        className="text-sm text-gray-600 hover:text-gray-900 font-medium px-2 py-1"
                                                    >
                                                        {user.archived ? 'Restore' : 'Archive'}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden">
                        {filteredUsers.map((user) => {
                            const canAccess = currentUser.role === 'Coordinator' ||
                                (currentUser.role === 'Trainer' && user.role === 'Trainee');

                            return (
                                <div
                                    key={user._id}
                                    onClick={() => canAccess && handleUserClick(user)}
                                    className={`p-4 border-b border-gray-200 last:border-b-0 ${canAccess ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                <span className="inline-flex px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                                                    {user.role}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 mb-2">@{user.username}</div>
                                        </div>
                                        {currentUser.role === 'Coordinator' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleArchive(user);
                                                }}
                                                className="text-sm text-gray-600 hover:text-gray-900 font-medium px-2 py-1 ml-2"
                                            >
                                                {user.archived ? 'Restore' : 'Archive'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-8">
                            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                                {showArchived
                                    ? 'No archived users found'
                                    : 'No users found'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Mobile Stats Footer */}
                <div className="sm:hidden bg-white border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p className="text-gray-500 text-xs">Total Users</p>
                            <p className="text-lg font-semibold text-gray-900">{stats.total}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Trainees</p>
                            <p className="text-lg font-semibold text-gray-900">{stats.trainees}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}