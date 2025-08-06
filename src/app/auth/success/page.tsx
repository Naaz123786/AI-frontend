'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthSuccess() {
    const { user, loading } = useAuth()

    useEffect(() => {
        console.log('🎉 Auth success page loaded')
        console.log('👤 User:', user?.email)
        console.log('⏳ Loading:', loading)

        // Wait for auth state to be ready, then redirect
        if (!loading) {
            if (user) {
                console.log('✅ User authenticated, redirecting to home...')
                // Force redirect to home page
                setTimeout(() => {
                    window.location.href = '/'
                }, 1000)
            } else {
                console.log('❌ No user found, redirecting to login...')
                // No user, redirect to login
                setTimeout(() => {
                    window.location.href = '/login'
                }, 1000)
            }
        }
    }, [user, loading])

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontFamily: 'system-ui'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                padding: '40px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>
                    {loading ? '⏳' : user ? '✅' : '❌'}
                </div>

                <h1 style={{ margin: '0 0 10px 0', fontSize: '1.5rem' }}>
                    {loading ? 'Checking Authentication...' :
                        user ? 'Login Successful!' : 'Authentication Failed'}
                </h1>

                <p style={{ margin: '0 0 20px 0', opacity: 0.8 }}>
                    {loading ? 'Please wait while we verify your account' :
                        user ? 'Redirecting to home page...' : 'Redirecting to login page...'}
                </p>

                {user && (
                    <p style={{ margin: '0', fontSize: '0.9rem', opacity: 0.7 }}>
                        Welcome, {user.email}!
                    </p>
                )}

                <div style={{ marginTop: '30px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '3px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                    }}></div>
                </div>
            </div>

            <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}