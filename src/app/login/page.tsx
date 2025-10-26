'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      if (res.ok) {
        const data = await res.json();

        // Force a router refresh to pick up the new cookie
        router.refresh();

        // Small delay to ensure cookie is set
        await new Promise(resolve => setTimeout(resolve, 100));

        // Redirect based on role
        if (data.user.role === 'Trainee') {
          router.push('/dashboard/trainee');
        } else {
          router.push('/dashboard');
        }
      } else {
        const err = await res.json();
        setLoginError(err.error || 'Login failed');
        setIsLoading(false);
      }
    } catch {
      setLoginError('An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 md:p-10 w-full max-w-md my-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            NATA Training Tracker
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Sign in to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              className="w-full px-4 py-3 sm:py-3.5 text-base border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              placeholder="Enter username"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              className="w-full px-4 py-3 sm:py-3.5 text-base border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              placeholder="Enter password"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm sm:text-base">{loginError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-3 sm:py-3.5 text-base sm:text-lg bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}