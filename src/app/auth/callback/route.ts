import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const error = requestUrl.searchParams.get('error')

    if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=${error}`)
    }

    if (code) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)

            if (error) {
                console.error('Error exchanging code for session:', error)
                return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_error`)
            }

            if (data.session) {
                console.log('Auth callback successful, redirecting to home page')
                // Add a small delay to ensure session is properly set
                const response = NextResponse.redirect(`${requestUrl.origin}/`)
                // Set cache headers to prevent caching of redirect
                response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
                response.headers.set('Pragma', 'no-cache')
                response.headers.set('Expires', '0')
                return response
            }
        } catch (error) {
            console.error('Auth callback exception:', error)
            return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_error`)
        }
    }

    // Fallback redirect
    return NextResponse.redirect(`${requestUrl.origin}/login`)
}