'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'

export default function DebugAuth() {
    const { user, session, loading, refreshSession } = useAuth()
    const [debugInfo, setDebugInfo] = useState<any>({})

    useEffect(() => {
        const updateDebugInfo = () => {
            setDebugInfo({
                user: user ? {
                    id: user.id,
                    email: user.email,
                    confirmed: user.email_confirmed_at
                } : null,
                session: session ? {
                    access_token: session.access_token ? 'Present' : 'Missing',
                    expires_at: session.expires_at,
                    user_id: session.user?.id
                } : null,
                loading,
                timestamp: new Date().toISOString()
            })
        }

        updateDebugInfo()
        const interval = setInterval(updateDebugInfo, 1000)
        return () => clearInterval(interval)
    }, [user, session, loading])

    const testRedirects = () => {
        console.log('Testing redirects...')
        console.log('User:', user)
        console.log('Session:', session)
        console.log('Loading:', loading)

        if (user) {
            console.log('User is logged in, should redirect to interview')
            window.location.href = '/interview'
        } else {
            console.log('User not logged in, should redirect to login')
            window.location.href = '/login'
        }
    }

    const forceRefresh = async () => {
        console.log('Force refreshing session...')
        const result = await refreshSession()
        console.log('Refresh result:', result)
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>🚨 Auth Debug Page</h1>

            <div style={{ marginBottom: '20px' }}>
                <button onClick={testRedirects} style={{
                    padding: '10px 20px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    marginRight: '10px'
                }}>
                    Test Get Started Logic
                </button>

                <button onClick={forceRefresh} style={{
                    padding: '10px 20px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    marginRight: '10px'
                }}>
                    Force Refresh Session
                </button>

                <button onClick={() => window.location.href = '/'} style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                }}>
                    Go to Home
                </button>
            </div>

            <div style={{
                background: '#f8f9fa',
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px'
            }}>
                <h3>Current Auth State:</h3>
                <pre style={{ fontSize: '12px' }}>
                    {JSON.stringify(debugInfo, null, 2)}
                </pre>
            </div>

            <div style={{
                background: loading ? '#fff3cd' : user ? '#d4edda' : '#f8d7da',
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px'
            }}>
                <h3>Status:</h3>
                <p>
                    {loading ? '⏳ Loading...' : user ? `✅ Logged in as ${user.email}` : '❌ Not logged in'}
                </p>
            </div>

            <div style={{
                background: '#e2e3e5',
                padding: '15px',
                borderRadius: '4px'
            }}>
                <h3>Expected Behavior:</h3>
                <ul>
                    <li>If logged in: "Test Get Started Logic" should go to /interview</li>
                    <li>If not logged in: "Test Get Started Logic" should go to /login</li>
                    <li>Login/Signup should redirect to home page (/)</li>
                </ul>
            </div>
        </div>
    )
}