'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { signIn, signInWithGoogle, resetPassword } = useAuth()

  // Add state for forgot password
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (!password) {
      setError('Password is required')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await signIn(email.trim().toLowerCase(), password)

      if (error) {
        // Handle specific Supabase errors
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. If you haven\'t signed up yet, please create an account first.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the verification link before signing in.')
        } else if (error.message.includes('Too many requests')) {
          setError('Too many login attempts. Please wait a moment and try again.')
        } else if (error.message.includes('User not found')) {
          setError('No account found with this email. Please sign up first.')
        } else {
          setError(error.message || 'Failed to sign in')
        }
      } else {
<<<<<<< HEAD
        // ✅ LOGIN SUCCESS - IMMEDIATE REDIRECT
        console.log('✅ LOGIN SUCCESS - REDIRECTING NOW')
        alert('Login successful! Redirecting to home page...')
        window.location = '/' as any
=======
        // Successful login - redirect to home page
        console.log('Login successful, redirecting to home page...')

        // Small delay to ensure session is set
        setTimeout(() => {
          router.push('/')
          // Force page refresh to ensure auth state is updated
          window.location.href = '/'
        }, 500)
>>>>>>> 31531e0 (update)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'An unexpected error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await signInWithGoogle()
      if (error) {
        console.error('Google login error:', error)
        setError(error.message || 'Failed to sign in with Google')
        setLoading(false)
      } else {
        // Don't set loading to false here - let the redirect handle it
        console.log('Google login initiated, redirecting...')
        // The redirect will happen automatically via Supabase
      }
    } catch (error: any) {
      console.error('Google login exception:', error)
      setError(error.message || 'An error occurred during Google login')
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await resetPassword(resetEmail)
      if (error) {
        setError(error.message)
      } else {
        alert('Password reset link sent! Check your email.')
        setIsForgotPassword(false)
        setResetEmail('')
      }
    } catch (error) {
      setError('An error occurred while sending reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to your Interview AI account</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="form-group">
              <input
                type="email"
                placeholder="Enter your email to reset password"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="auth-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="auth-button primary"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="auth-link"
            >
              Back to login
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailLogin} className="auth-form">
            <div className="form-group">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="auth-button primary"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="auth-link"
            >
              Forgot Password?
            </button>
          </form>
        )}

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="social-buttons">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="social-button google"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
        </div>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="auth-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
