'use client'

import { useEffect } from 'react'

export default function AuthRedirect() {
    useEffect(() => {
        // Multiple redirect methods to ensure it works
        console.log('🔄 Auth redirect page - forcing redirect to home')

        // Method 1: Immediate redirect
        window.location.replace('/')

        // Method 2: Fallback after 100ms
        setTimeout(() => {
            if (window.location.pathname !== '/') {
                window.location.href = '/'
            }
        }, 100)

        // Method 3: Final fallback after 500ms
        setTimeout(() => {
            if (window.location.pathname !== '/') {
                window.location.assign('/')
            }
        }, 500)
    }, [])

    // Return HTML with meta redirect as backup
    return (
        <>
            <meta httpEquiv="refresh" content="0;url=/" />
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontFamily: 'system-ui'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '20px' }}>✅</div>
                    <h1>Login Successful!</h1>
                    <p>Redirecting to home page...</p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '20px' }}>
                        If you are not redirected automatically, <a href="/" style={{ color: 'white' }}>click here</a>
                    </p>
                </div>
            </div>
        </>
    )
}