import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const error = requestUrl.searchParams.get('error')

    console.log('🔄 Auth callback triggered:', { code: !!code, error })

    if (error) {
        console.error('❌ Auth callback error:', error)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=${error}`)
    }

    if (code) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        try {
            console.log('🔄 Exchanging code for session...')
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)

            if (error) {
                console.error('❌ Error exchanging code for session:', error)
                return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_error`)
            }

            if (data.session) {
                console.log('✅ Google OAuth successful! User:', data.user?.email)
                console.log('🎉 Redirecting to redirect page...')

                // Use redirect page for better control
                const response = NextResponse.redirect(`${requestUrl.origin}/auth/redirect`)

                // Set session cookies for better client-side sync
                if (data.session.access_token) {
                    response.cookies.set('sb-access-token', data.session.access_token, {
                        httpOnly: false,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        maxAge: 60 * 60 * 24 * 7 // 7 days
                    })
                }

                if (data.session.refresh_token) {
                    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
                        httpOnly: false,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        maxAge: 60 * 60 * 24 * 30 // 30 days
                    })
                }

                // Set additional headers to ensure proper redirect
                response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
                response.headers.set('Pragma', 'no-cache')
                response.headers.set('Expires', '0')
                response.headers.set('Location', `${requestUrl.origin}/`)

                return response
            } else {
                console.log('⚠️ No session data received')
                return NextResponse.redirect(`${requestUrl.origin}/login?error=no_session`)
            }
        } catch (error) {
            console.error('❌ Auth callback exception:', error)
            return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_error`)
        }
    }

    console.log('⚠️ No code parameter, redirecting to login')
    return NextResponse.redirect(`${requestUrl.origin}/login`)
}