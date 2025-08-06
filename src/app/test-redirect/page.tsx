'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TestRedirect() {
    const [message, setMessage] = useState('')
    const router = useRouter()

    const testRedirect1 = () => {
        setMessage('Testing window.location.href...')
        setTimeout(() => {
            window.location.href = '/'
        }, 1000)
    }

    const testRedirect2 = () => {
        setMessage('Testing window.location.replace...')
        setTimeout(() => {
            window.location.replace('/')
        }, 1000)
    }

    const testRedirect3 = () => {
        setMessage('Testing router.push...')
        setTimeout(() => {
            router.push('/')
        }, 1000)
    }

    const testRedirect4 = () => {
        setMessage('Testing immediate redirect...')
        window.location.href = '/'
    }

    return (
        <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
            <h1>🚨 Redirect Test Page</h1>
            <p>Test different redirect methods to see which one works:</p>

            <div style={{ marginBottom: '20px' }}>
                <button onClick={testRedirect1} style={{
                    padding: '10px 20px',
                    margin: '5px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                }}>
                    Test window.location.href (1s delay)
                </button>

                <button onClick={testRedirect2} style={{
                    padding: '10px 20px',
                    margin: '5px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                }}>
                    Test window.location.replace (1s delay)
                </button>

                <button onClick={testRedirect3} style={{
                    padding: '10px 20px',
                    margin: '5px',
                    background: '#ffc107',
                    color: 'black',
                    border: 'none',
                    borderRadius: '4px'
                }}>
                    Test router.push (1s delay)
                </button>

                <button onClick={testRedirect4} style={{
                    padding: '10px 20px',
                    margin: '5px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                }}>
                    Test Immediate Redirect
                </button>
            </div>

            {message && (
                <div style={{
                    padding: '15px',
                    background: '#d4edda',
                    color: '#155724',
                    borderRadius: '4px',
                    marginTop: '20px'
                }}>
                    {message}
                </div>
            )}

            <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '4px' }}>
                <h3>Current URL:</h3>
                <p>{typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>

                <h3>Expected Behavior:</h3>
                <ul>
                    <li>All buttons should redirect to home page (/)</li>
                    <li>If redirect doesn't work, there might be a browser/framework issue</li>
                </ul>
            </div>
        </div>
    )
}