'use client';
import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, User } from 'lucide-react';
import { IUser } from '../dashboard/train/[id]/page';
import { Role } from '@/models/types';


interface EditUserModalProps {
    show: boolean;
    user: IUser | null;
    onClose: () => void;
    onSave: () => void;
}

type UserUpdate = Omit<IUser, 'archived' | 'password'> & { password?: string };

export default function EditUserModal({ show, user, onClose, onSave }: EditUserModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        role: 'Trainee' as 'Coordinator' | 'Trainer' | 'Trainee',
        password: '',
        changePassword: false,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                username: user.username,
                role: user.role,
                password: '',
                changePassword: false,
            });
            setError(null);
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?._id) return;

        setError(null);

        // Validation
        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }
        if (!formData.username.trim()) {
            setError('Username is required');
            return;
        }
        if (formData.changePassword && formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            setSaving(true);

            const updates: UserUpdate = {
                name: formData.name.trim(),
                username: formData.username.trim(),
                role: formData.role,

            };

            if (formData.changePassword && formData.password) {
                updates.password = formData.password;
            }

            const res = await fetch(`/api/users/${user._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to update user');
            }

            onSave();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update user');
        } finally {
            setSaving(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter full name"
                            disabled={saving}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Username <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter username"
                            disabled={saving}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    role: e.target.value as Role ,
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={saving}
                            required
                        >
                            <option value="Trainee">Trainee</option>
                            <option value="Trainer">Trainer</option>
                            <option value="Coordinator">Coordinator</option>
                        </select>

                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        <label className="flex items-center gap-2 mb-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.changePassword}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    changePassword: e.target.checked,
                                    password: e.target.checked ? formData.password : ''
                                })}
                                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                                disabled={saving}
                            />
                            <span className="text-sm font-medium text-gray-700">Change Password</span>
                        </label>

                        {formData.changePassword && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter new password (min 6 characters)"
                                    disabled={saving}
                                    minLength={6}
                                    required={formData.changePassword}
                                />
                                <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}