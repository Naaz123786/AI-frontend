'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CreateTestUser() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const createTestUser = async () => {
        setLoading(true)
        setMessage('')

        try {
            // Create test user with admin privileges (bypasses email confirmation)
            const { data, error } = await supabase.auth.admin.createUser({
                email: 'test@example.com',
                password: 'password123',
                email_confirm: true, // This bypasses email confirmation
                user_metadata: {
                    full_name: 'Test User'
                }
            })

            if (error) {
                setMessage(`Error: ${error.message}`)
            } else {
                setMessage('✅ Test user created successfully!\n\nEmail: test@example.com\nPassword: password123\n\nYou can now login with these credentials.')
            }
        } catch (err: any) {
            setMessage(`Error: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            padding: '40px',
            maxWidth: '500px',
            margin: '0 auto',
            fontFamily: 'system-ui',
            textAlign: 'center'
        }}>
            <h1>Create Test User</h1>
            <p>This will create a test account that bypasses email verification.</p>

            <button
                onClick={createTestUser}
                disabled={loading}
                style={{
                    padding: '12px 24px',
                    background: loading ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: '20px'
                }}
            >
                {loading ? 'Creating...' : 'Create Test User'}
            </button>

            {message && (
                <div style={{
                    padding: '20px',
                    background: message.includes('Error') ? '#f8d7da' : '#d4edda',
                    color: message.includes('Error') ? '#721c24' : '#155724',
                    borderRadius: '4px',
                    border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
                    whiteSpace: 'pre-line',
                    textAlign: 'left'
                }}>
                    {message}
                </div>
            )}

            <div style={{ marginTop: '30px' }}>
                <a href="/login" style={{ color: '#007bff', textDecoration: 'none' }}>
                    → Go to Login Page
                </a>
            </div>
        </div>
    )
}