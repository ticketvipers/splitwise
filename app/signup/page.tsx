'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function passwordStrength(password: string): { label: string; color: string } {
  if (password.length === 0) return { label: '', color: '' };
  if (password.length < 8) return { label: 'Too short', color: 'text-red-500' };
  if (password.length < 10 || !/[^a-zA-Z0-9]/.test(password)) return { label: 'Weak', color: 'text-yellow-500' };
  if (/[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) {
    return { label: 'Strong', color: 'text-green-600' };
  }
  return { label: 'Moderate', color: 'text-blue-500' };
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!email) {
      setError('Email is required.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Could not create account. Please try again.');
        return;
      }

      const data = await res.json();
      const token = data.access_token || data.token;
      if (!token) {
        setError('Account created but login failed. Please log in.');
        router.push('/login');
        return;
      }

      localStorage.setItem('splitwise_token', token);
      router.push('/');
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: '#5BC5A7' }}>
          💸 Splitwise
        </h1>
        <h2 className="text-lg font-semibold text-gray-700 mb-6 text-center">Create your account</h2>

        {error && (
          <div className="mb-4">
            <ErrorState inline message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="Name"
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
          />

          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <div className="space-y-1">
            <Input
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            {strength.label && (
              <p className={`text-xs ${strength.color}`}>Password strength: {strength.label}</p>
            )}
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Sign Up
          </Button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--color-brand)] font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
