'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function QuickSignup() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const { signUp, signIn } = useAuth()
    const router = useRouter()

    const handleQuickSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        try {
            // Try to sign up first
            const { data, error: signupError } = await signUp(email, password)

            if (signupError) {
                if (signupError.message.includes('User already registered')) {
                    // User exists, try to login
                    setMessage('User already exists, trying to login...')

                    const { data: loginData, error: loginError } = await signIn(email, password)

                    if (loginError) {
                        if (loginError.message.includes('Email not confirmed')) {
                            setError('Account exists but email not verified. Please check your email for verification link.')
                        } else {
                            setError(`Login failed: ${loginError.message}`)
                        }
                    } else {
                        setMessage('Login successful! Redirecting...')
                        setTimeout(() => router.push('/interview'), 1000)
                    }
                } else {
                    setError(`Signup failed: ${signupError.message}`)
                }
            } else {
                if (data.user && !data.user.email_confirmed_at) {
                    setMessage('Account created! Please check your email for verification link, then try logging in.')
                } else {
                    setMessage('Account created and verified! You can now login.')
                }
            }
        } catch (err: any) {
            setError(`Error: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            padding: '40px',
            maxWidth: '400px',
            margin: '0 auto',
            fontFamily: 'system-ui',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            marginTop: '100px'
        }}>
            <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Quick Account Setup</h1>

            <form onSubmit={handleQuickSignup}>
                <div style={{ marginBottom: '20px' }}>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '16px'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <input
                        type="password"
                        placeholder="Enter password (min 6 chars)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '16px'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: loading ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '16px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Processing...' : 'Create Account & Login'}
                </button>
            </form>

            {message && (
                <div style={{
                    marginTop: '20px',
                    padding: '10px',
                    background: '#d4edda',
                    color: '#155724',
                    borderRadius: '4px',
                    border: '1px solid #c3e6cb'
                }}>
                    {message}
                </div>
            )}

            {error && (
                <div style={{
                    marginTop: '20px',
                    padding: '10px',
                    background: '#f8d7da',
                    color: '#721c24',
                    borderRadius: '4px',
                    border: '1px solid #f5c6cb'
                }}>
                    {error}
                </div>
            )}

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
                <p>Already have an account?</p>
                <button
                    onClick={() => router.push('/login')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#007bff',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    Go to Login
                </button>
            </div>
        </div>
    )
}