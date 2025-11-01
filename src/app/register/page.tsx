'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Eye, EyeOff, Mail, Lock, User, Clock } from 'lucide-react';

export default function RegisterPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [tokenExpired, setTokenExpired] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [resendingEmail, setResendingEmail] = useState(false);
    const [emailResent, setEmailResent] = useState(false);

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });

    const [errors, setErrors] = useState({
        password: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (!token) {
            setLoading(false);
            setValidating(false);
            return;
        }

        validateToken();
    }, [token]);

    const validateToken = async () => {
        try {
            const res = await fetch('/api/register/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await res.json();

            if (res.ok) {
                setTokenValid(true);
                setUserData(data.user);
            } else if (data.expired) {
                setTokenExpired(true);
                setUserData(data.user);
            } else {
                setTokenValid(false);
            }
        } catch (error) {
            console.error('Error validating token:', error);
            setTokenValid(false);
        } finally {
            setValidating(false);
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        if (!userData?.email) return;

        setResendingEmail(true);
        try {
            const res = await fetch('/api/register/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userData.email }),
            });

            if (res.ok) {
                setEmailResent(true);
                setTimeout(() => setEmailResent(false), 5000);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to resend email');
            }
        } catch (error) {
            console.error('Error resending email:', error);
            alert('Failed to resend email');
        } finally {
            setResendingEmail(false);
        }
    };

    const validatePassword = (password: string) => {
        if (password.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/[A-Z]/.test(password)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/[a-z]/.test(password)) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!/[0-9]/.test(password)) {
            return 'Password must contain at least one number';
        }
        return '';
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const password = e.target.value;
        setFormData({ ...formData, password });
        
        const error = validatePassword(password);
        setErrors({ ...errors, password: error });
    };

    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const confirmPassword = e.target.value;
        setFormData({ ...formData, confirmPassword });
        
        const error = confirmPassword !== formData.password ? 'Passwords do not match' : '';
        setErrors({ ...errors, confirmPassword: error });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const passwordError = validatePassword(formData.password);
        const confirmError = formData.password !== formData.confirmPassword ? 'Passwords do not match' : '';

        if (passwordError || confirmError) {
            setErrors({
                password: passwordError,
                confirmPassword: confirmError,
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/register/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password: formData.password,
                }),
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } else {
                const data = await res.json();
                alert(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Error completing registration:', error);
            alert('Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || validating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Validating registration link...</p>
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
                    <p className="text-gray-600 mb-6">
                        This registration link is invalid. Please contact your administrator.
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (tokenExpired) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
                    <div className="text-center mb-6">
                        <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
                        <p className="text-gray-600">
                            This registration link has expired. Registration links are valid for 24 hours.
                        </p>
                    </div>

                    {emailResent && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-green-900 mb-1">Email Sent!</h3>
                                <p className="text-sm text-green-700">
                                    A new registration link has been sent to {userData?.email}
                                </p>
                            </div>
                        </div>
                    )}

                    {userData?.email && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Mail className="w-4 h-4 text-blue-600" />
                                <p className="text-sm font-medium text-blue-900">
                                    Request a new registration link
                                </p>
                            </div>
                            <p className="text-sm text-blue-700 mb-4">
                                We&apos;ll send a new registration link to {userData.email}
                            </p>
                            <button
                                onClick={handleResendEmail}
                                disabled={resendingEmail || emailResent}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {resendingEmail ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Sending...
                                    </>
                                ) : emailResent ? (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Email Sent
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4" />
                                        Send New Link
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => router.push('/login')}
                        className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Token</h1>
                    <p className="text-gray-600 mb-6">
                        This registration link is invalid or has already been used. Please contact your administrator.
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h1>
                    <p className="text-gray-600 mb-6">
                        Your account has been successfully created. Redirecting to login...
                    </p>
                    <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Registration</h1>
                    <p className="text-gray-600">
                        Welcome, <span className="font-medium">{userData?.name}</span>!
                    </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="text-blue-900 font-medium mb-1">Account Details</p>
                            <p className="text-blue-700">Email: {userData?.email}</p>
                            <p className="text-blue-700">Role: {userData?.role}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Create Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={handlePasswordChange}
                                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                                    errors.password ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Enter your password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                        )}
                        <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-500">Password must contain:</p>
                            <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5">
                                <li className={formData.password.length >= 8 ? 'text-green-600' : ''}>
                                    At least 8 characters
                                </li>
                                <li className={/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}>
                                    One uppercase letter
                                </li>
                                <li className={/[a-z]/.test(formData.password) ? 'text-green-600' : ''}>
                                    One lowercase letter
                                </li>
                                <li className={/[0-9]/.test(formData.password) ? 'text-green-600' : ''}>
                                    One number
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={handleConfirmPasswordChange}
                                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Confirm your password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !!errors.password || !!errors.confirmPassword}
                        className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Creating Account...
                            </>
                        ) : (
                            'Complete Registration'
                        )}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Already have an account?{' '}
                    <button
                        onClick={() => router.push('/login')}
                        className="text-gray-900 font-medium hover:underline"
                    >
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
}