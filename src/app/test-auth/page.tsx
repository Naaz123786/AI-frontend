'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function TestAuth() {
    const [testResults, setTestResults] = useState<any>({})
    const [loading, setLoading] = useState(false)
    const { user, signIn, signUp, signInWithGoogle, signOut } = useAuth()

    const runTests = async () => {
        setLoading(true)
        const results: any = {}

        try {
            // Test 1: Environment Variables
            results.env = {
                supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
                hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                apiUrl: process.env.NEXT_PUBLIC_API_URL,
            }

            // Test 2: Supabase Connection
            try {
                const { data, error } = await supabase.auth.getSession()
                results.supabaseConnection = {
                    success: !error,
                    error: error?.message,
                    hasSession: !!data.session
                }
            } catch (err: any) {
                results.supabaseConnection = {
                    success: false,
                    error: err.message
                }
            }

            // Test 3: Test Signup
            try {
                const testEmail = `test-${Date.now()}@example.com`
                const { data, error } = await signUp(testEmail, 'password123')
                results.signup = {
                    success: !error,
                    error: error?.message,
                    needsVerification: data.user && !data.user.email_confirmed_at
                }
            } catch (err: any) {
                results.signup = {
                    success: false,
                    error: err.message
                }
            }

            setTestResults(results)
        } catch (err: any) {
            setTestResults({ error: err.message })
        } finally {
            setLoading(false)
        }
    }

    const testGoogleAuth = async () => {
        try {
            const { data, error } = await signInWithGoogle()
            console.log('Google auth result:', { data, error })
        } catch (err) {
            console.error('Google auth error:', err)
        }
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Authentication Test Page</h1>

            <div style={{ marginBottom: '20px' }}>
                <h2>Current User</h2>
                <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <button onClick={runTests} disabled={loading}>
                    {loading ? 'Running Tests...' : 'Run Auth Tests'}
                </button>
                <button onClick={testGoogleAuth} style={{ marginLeft: '10px' }}>
                    Test Google Auth
                </button>
                {user && (
                    <button onClick={signOut} style={{ marginLeft: '10px' }}>
                        Sign Out
                    </button>
                )}
            </div>

            <div>
                <h2>Test Results</h2>
                <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
                    {JSON.stringify(testResults, null, 2)}
                </pre>
            </div>

            <div style={{ marginTop: '20px' }}>
                <h2>Quick Login Test</h2>
                <form onSubmit={async (e) => {
                    e.preventDefault()
                    const formData = new FormData(e.target as HTMLFormElement)
                    const email = formData.get('email') as string
                    const password = formData.get('password') as string

                    try {
                        const { data, error } = await signIn(email, password)
                        console.log('Login result:', { data, error })
                        alert(error ? `Error: ${error.message}` : 'Login successful!')
                    } catch (err: any) {
                        console.error('Login error:', err)
                        alert(`Error: ${err.message}`)
                    }
                }}>
                    <input name="email" type="email" placeholder="Email" required style={{ marginRight: '10px', padding: '5px' }} />
                    <input name="password" type="password" placeholder="Password" required style={{ marginRight: '10px', padding: '5px' }} />
                    <button type="submit">Test Login</button>
                </form>
            </div>
        </div>
    )
}