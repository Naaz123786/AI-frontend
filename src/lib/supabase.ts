import { createClient } from '@supabase/supabase-js'

// These are placeholder values - you'll need to replace with your actual Supabase project credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth helper functions
export const authHelpers = {
  // Sign up with email and password
  signUp: async (email: string, password: string) => {
    return await supabase.auth.signUp({
      email,
      password,
    })
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    })
  },

  // Sign in with GitHub
  signInWithGitHub: async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'github',
    })
  },

  // Sign in with Facebook
  signInWithFacebook: async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'facebook',
    })
  },

  // Sign out
  signOut: async () => {
    return await supabase.auth.signOut()
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Get current session
  getCurrentSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }
}
