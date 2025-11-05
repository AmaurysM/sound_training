'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Eye, EyeOff, Mail, Lock, User, Clock, Plane, Shield, ArrowRight } from 'lucide-react';

function RegisterForm() {
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [tokenExpired, setTokenExpired] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const validateToken = async (tokenValue: string) => {
        try {
            const res = await fetch('/api/register/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: tokenValue }),
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

    useEffect(() => {
        const t = searchParams.get('token');
        setToken(t);

        if (!t) {
            setLoading(false);
            setValidating(false);
            return;
        }

        validateToken(t);
    }, [searchParams]);

    const handleResendEmail = async () => {
        if (!userData?.email) return;

        setResendingEmail(true);
        try {
            const res = await fetch('/api/register/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userData.email, username: userData.username }),
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

    // Loading State
    if (loading || validating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                <div className="relative text-center">
                    <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-blue-200 text-lg">Validating registration link...</p>
                </div>
            </div>
        );
    }

    // Invalid Link State
    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                <div className="relative max-w-md w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-3">Invalid Link</h1>
                        <p className="text-gray-600 mb-8">
                            This registration link is invalid. Please contact your administrator for a new invitation.
                        </p>
                        <button
                            onClick={() => router.push('/login')}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
                        >
                            Go to Login
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Token Expired State
    if (tokenExpired) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                <div className="relative max-w-md w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-10 h-10 text-amber-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-3">Link Expired</h1>
                        <p className="text-gray-600">
                            This registration link has expired. Registration links are valid for 24 hours.
                        </p>
                    </div>

                    {emailResent && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3 animate-slide-in">
                            <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-bold text-green-900 mb-1">Email Sent!</h3>
                                <p className="text-sm text-green-700">
                                    A new registration link has been sent to {userData?.email}
                                </p>
                            </div>
                        </div>
                    )}

                    {userData?.email && (
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Mail className="w-5 h-5 text-blue-600" />
                                <p className="text-sm font-bold text-blue-900">
                                    Request a new registration link
                                </p>
                            </div>
                            <p className="text-sm text-blue-700 mb-4">
                                We&apos;ll send a new registration link to <span className="font-semibold">{userData.email}</span>
                            </p>
                            <button
                                onClick={handleResendEmail}
                                disabled={resendingEmail || emailResent}
                                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {resendingEmail ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Sending...
                                    </>
                                ) : emailResent ? (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Email Sent
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-5 h-5" />
                                        Send New Link
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => router.push('/login')}
                        className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    // Invalid Token State
    if (!tokenValid) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                <div className="relative max-w-md w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-3">Invalid Token</h1>
                        <p className="text-gray-600 mb-8">
                            This registration link is invalid or has already been used. Please contact your administrator.
                        </p>
                        <button
                            onClick={() => router.push('/login')}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
                        >
                            Go to Login
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Success State
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                <div className="relative max-w-md w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-3">Registration Complete!</h1>
                        <p className="text-gray-600 mb-8">
                            Your account has been successfully created. Redirecting to login...
                        </p>
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Main Registration Form
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8 animate-fade-in">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl shadow-2xl mb-4">
                            <Plane className="w-10 h-10 text-white" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Sound Aircraft Services</h1>
                        <p className="text-blue-200 font-medium">NATA Training Portal</p>
                    </div>

                    {/* Registration Card */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20 animate-slide-up">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <User className="w-8 h-8 text-blue-600" />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Complete Your Registration</h2>
                            <p className="text-gray-600">
                                Welcome, <span className="font-bold text-blue-600">{userData?.name}</span>!
                            </p>
                        </div>

                        {/* User Info Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="text-blue-900 font-bold mb-2">Account Details</p>
                                    <div className="space-y-1">
                                        <p className="text-blue-700"><span className="font-semibold">Email:</span> {userData?.email}</p>
                                        <p className="text-blue-700"><span className="font-semibold">Role:</span> {userData?.role}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Password Field */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">
                                    Create Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={handlePasswordChange}
                                        className={`w-full pl-12 pr-12 py-3.5 text-gray-700 bg-gray-50 border-2 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-200 ${
                                            errors.password ? 'border-red-500' : 'border-gray-200'
                                        }`}
                                        placeholder="Enter your password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-red-600 text-sm font-medium flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {errors.password}
                                    </p>
                                )}
                                
                                {/* Password Requirements */}
                                <div className="bg-gray-50 rounded-lg p-3 mt-3">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Password must contain:</p>
                                    <ul className="space-y-1.5">
                                        <li className={`text-xs flex items-center gap-2 transition-colors ${
                                            formData.password.length >= 8 ? 'text-green-600 font-semibold' : 'text-gray-600'
                                        }`}>
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                                formData.password.length >= 8 ? 'bg-green-100' : 'bg-gray-200'
                                            }`}>
                                                {formData.password.length >= 8 && <CheckCircle className="w-3 h-3" />}
                                            </div>
                                            At least 8 characters
                                        </li>
                                        <li className={`text-xs flex items-center gap-2 transition-colors ${
                                            /[A-Z]/.test(formData.password) ? 'text-green-600 font-semibold' : 'text-gray-600'
                                        }`}>
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                                /[A-Z]/.test(formData.password) ? 'bg-green-100' : 'bg-gray-200'
                                            }`}>
                                                {/[A-Z]/.test(formData.password) && <CheckCircle className="w-3 h-3" />}
                                            </div>
                                            One uppercase letter
                                        </li>
                                        <li className={`text-xs flex items-center gap-2 transition-colors ${
                                            /[a-z]/.test(formData.password) ? 'text-green-600 font-semibold' : 'text-gray-600'
                                        }`}>
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                                /[a-z]/.test(formData.password) ? 'bg-green-100' : 'bg-gray-200'
                                            }`}>
                                                {/[a-z]/.test(formData.password) && <CheckCircle className="w-3 h-3" />}
                                            </div>
                                            One lowercase letter
                                        </li>
                                        <li className={`text-xs flex items-center gap-2 transition-colors ${
                                            /[0-9]/.test(formData.password) ? 'text-green-600 font-semibold' : 'text-gray-600'
                                        }`}>
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                                /[0-9]/.test(formData.password) ? 'bg-green-100' : 'bg-gray-200'
                                            }`}>
                                                {/[0-9]/.test(formData.password) && <CheckCircle className="w-3 h-3" />}
                                            </div>
                                            One number
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Confirm Password Field */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">
                                    Confirm Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={handleConfirmPasswordChange}
                                        className={`w-full pl-12 pr-12 py-3.5 text-gray-700 bg-gray-50 border-2 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-200 ${
                                            errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                                        }`}
                                        placeholder="Confirm your password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-red-600 text-sm font-medium flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {errors.confirmPassword}
                                    </p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting || !!errors.password || !!errors.confirmPassword}
                                className="w-full group relative px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                <span className="relative flex items-center justify-center gap-2">
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Creating Account...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Complete Registration</span>
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <p className="text-center text-sm text-gray-500">
                                Already have an account?{' '}
                                <button
                                    onClick={() => router.push('/login')}
                                    className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
                                >
                                    Sign in
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes scale-in {
                    from {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes slide-in {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.6s ease-out;
                }

                .animate-slide-up {
                    animation: slide-up 0.6s ease-out 0.2s both;
                }

                .animate-scale-in {
                    animation: scale-in 0.5s ease-out;
                }

                .animate-slide-in {
                    animation: slide-in 0.4s ease-out;
                }
            `}</style>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                <div className="relative text-center">
                    <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-blue-200 text-lg">Loading...</p>
                </div>
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}