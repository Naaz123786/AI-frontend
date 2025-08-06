'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthDebug() {
    const [debugInfo, setDebugInfo] = useState<any>({})

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Check environment variables
                const envCheck = {
                    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
                    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                    apiUrl: process.env.NEXT_PUBLIC_API_URL,
                }

                // Check Supabase connection
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                const { data: { user }, error: userError } = await supabase.auth.getUser()

                setDebugInfo({
                    env: envCheck,
                    session: session ? 'Active' : 'None',
                    user: user ? user.email : 'None',
                    sessionError: sessionError?.message,
                    userError: userError?.message,
                    timestamp: new Date().toISOString()
                })
            } catch (error: any) {
                setDebugInfo({
                    error: error.message,
                    timestamp: new Date().toISOString()
                })
            }
        }

        checkAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session?.user?.email)
            checkAuth()
        })

        return () => subscription.unsubscribe()
    }, [])

    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
        return null
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            maxWidth: '300px',
            zIndex: 9999
        }}>
            <h4>Auth Debug</h4>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
    )
}