'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  signOut: () => Promise<any>
  resetPassword: (email: string) => Promise<any>
  updateProfile: (updates: {
    gender?: string
    full_name?: string
    phone_number?: string
    date_of_birth?: string
    location?: string
    occupation?: string
    bio?: string
    linkedin_url?: string
    github_url?: string
  }) => Promise<any>
  updatePassword: (password: string) => Promise<any>
  refreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, 'Session:', !!session, 'User:', session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Force update localStorage to sync state
        if (session) {
          localStorage.setItem('supabase.auth.token', JSON.stringify(session))
        } else {
          localStorage.removeItem('supabase.auth.token')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (result.error) {
        console.error('Sign in error:', result.error)
        throw result.error
      }

      return result
    } catch (error) {
      console.error('Sign in failed:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      const result = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email_confirm: true
          }
        }
      })

      if (result.error) {
        console.error('Sign up error:', result.error)
        throw result.error
      }

      return result
    } catch (error) {
      console.error('Sign up failed:', error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })

      if (error) {
        console.error('Google OAuth error:', error)
        throw error
      }

      return { data, error: null }
    } catch (error) {
      console.error('Google sign in failed:', error)
      throw error
    }
  }


  const signOut = async () => {
    const result = await supabase.auth.signOut()
    return result
  }

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error refreshing session:', error)
        return false
      }
      setSession(session)
      setUser(session?.user ?? null)
      return !!session
    } catch (error) {
      console.error('Session refresh failed:', error)
      return false
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      console.error('Reset password error:', error)
      throw error
    }
    return { success: true }
  }

  const updateProfile = async (updates: {
    gender?: string
    full_name?: string
    phone_number?: string
    date_of_birth?: string
    location?: string
    occupation?: string
    bio?: string
    linkedin_url?: string
    github_url?: string
  }) => {
    const { error } = await supabase.auth.updateUser({
      data: updates
    })
    if (error) {
      console.error('Update profile error:', error)
      throw error
    }
    return { success: true }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    })
    if (error) {
      console.error('Update password error:', error)
      throw error
    }
    return { success: true }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    updatePassword,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
