'use client';
import React, { useEffect, useState, startTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Archive, ArchiveRestore, Users, LogOut, User as UserIcon } from 'lucide-react';

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

    const roleDropdownRef = useRef<HTMLDivElement>(null);
    const searchRoleDropdownRef = useRef<HTMLDivElement>(null);

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
        total: users.filter(u => !u.archived && u._id !== currentUser._id).length,
        trainees: users.filter(u => u.role === 'Trainee' && !u.archived && u._id !== currentUser._id).length,
        trainers: users.filter(u => u.role === 'Trainer' && !u.archived && u._id !== currentUser._id).length,
        coordinators: users.filter(u => u.role === 'Coordinator' && !u.archived && u._id !== currentUser._id).length,
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 sm:pb-6 border-b border-gray-200 gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">NATA Training Dashboard</h1>
                        <button
                            onClick={handleViewMyTraining}
                            className="text-sm text-gray-600 mt-1 hover:text-gray-900 transition flex items-center gap-1 group"
                        >
                            <UserIcon className="w-3.5 h-3.5" />
                            <span className="group-hover:underline">{currentUser.name}</span>
                            <span className="text-gray-400">•</span>
                            <span>{currentUser.role}</span>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                        <div className="grid grid-cols-2 sm:flex sm:gap-6 gap-4 text-sm w-full sm:w-auto">
                            <div className="text-left sm:text-right">
                                <p className="text-gray-500 text-xs sm:text-sm">Total Users</p>
                                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.total}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-gray-500 text-xs sm:text-sm">Trainees</p>
                                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.trainees}</p>
                            </div>
                            {currentUser.role === 'Coordinator' && (
                                <>
                                    <div className="text-left sm:text-right">
                                        <p className="text-gray-500 text-xs sm:text-sm">Trainers</p>
                                        <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.trainers}</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className="text-gray-500 text-xs sm:text-sm">Coordinators</p>
                                        <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.coordinators}</p>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition text-sm font-medium w-full sm:w-auto"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>

                {/* Add New User */}
                {!showArchived && currentUser.role === 'Coordinator' && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {!showAddUserForm ? (
                            <button
                                onClick={() => setShowAddUserForm(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-50 text-sm font-medium transition"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add New User
                            </button>
                        ) : (
                            <div className="p-4 sm:p-6 bg-gray-50">
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Full Name
                                            </label>
                                            <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                                onInput={(e) =>
                                                    setNewUserForm({ ...newUserForm, name: (e.target as HTMLDivElement).innerText })
                                                }
                                            >
                                                {newUserForm.name}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Username
                                            </label>
                                            <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                                onInput={(e) =>
                                                    setNewUserForm({ ...newUserForm, username: (e.target as HTMLDivElement).innerText })
                                                }
                                            >
                                                {newUserForm.username}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Password
                                            </label>
                                            <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                                onInput={(e) =>
                                                    setNewUserForm({ ...newUserForm, password: (e.target as HTMLDivElement).innerText })
                                                }
                                            >
                                                {newUserForm.password}
                                            </div>
                                        </div>
                                        <div ref={searchRoleDropdownRef} className="relative z-50">
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Role
                                            </label>

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
                    </div>
                )}

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
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

                    <div className="flex gap-3">
                        <div ref={roleDropdownRef} className="relative z-40 flex-1 sm:flex-none sm:w-40">
                            <div
                                onClick={() => setRoleDropdownOpen((prev) => !prev)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white cursor-pointer flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-gray-900"
                            >
                                <span className="truncate">{selectedRole || 'All Roles'}</span>
                                <svg
                                    className={`w-4 h-4 transform transition-transform flex-shrink-0 ml-2 ${roleDropdownOpen ? 'rotate-180' : ''}`}
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
                                className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded text-sm font-medium transition whitespace-nowrap ${showArchived
                                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {showArchived ? (
                                    <>
                                        <ArchiveRestore className="w-4 h-4" />
                                        <span className="hidden sm:inline">View Active</span>
                                    </>
                                ) : (
                                    <>
                                        <Archive className="w-4 h-4" />
                                        <span className="hidden sm:inline">View Archived</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* User List */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Username
                                    </th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    {currentUser.role === 'Coordinator' && (
                                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{user.username}</div>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                                                    {user.role}
                                                </span>
                                            </td>
                                            {currentUser.role === 'Coordinator' && (
                                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleArchive(user);
                                                        }}
                                                        className="text-sm text-gray-600 hover:text-gray-900 font-medium"
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

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">
                                {showArchived
                                    ? 'No archived users found'
                                    : 'No users found'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}