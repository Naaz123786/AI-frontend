"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";

export default function Home() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  // Update time every second - only on client side
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleGetStarted = () => {
    console.log('Get Started clicked, user:', user, 'loading:', loading); // Debug log

    // Don't redirect if still loading
    if (loading) {
      console.log('Still loading auth state, waiting...');
      return;
    }

    if (user) {
      console.log('User is logged in, redirecting to interview');
      // Force redirect with window.location for immediate effect
      window.location.href = '/interview';
    } else {
      console.log('User not logged in, redirecting to login');
      // Force redirect with window.location for immediate effect
      window.location.href = '/login';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="homepage-container">
      {/* Header */}
      <header className="homepage-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="logo-text">Interview <span className="ai-text">AI</span></h1>
          </div>
          <div className="header-right">
            <div className="time-display">
              {currentTime ? currentTime.toLocaleTimeString() : '--:--:--'}
            </div>
            {user ? (
              <UserAvatar />
            ) : (
              <div className="auth-buttons">
                <button onClick={() => router.push("/login")} className="login-btn">
                  Login
                </button>
                <button onClick={() => router.push("/signup")} className="signup-btn">
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="homepage-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h2 className="hero-title">
              Master Your Next Interview with
              <span className="gradient-text"> AI-Powered </span>
              Assistant
            </h2>
            <p className="hero-subtitle">
              Your ultimate companion for interview preparation. Get instant, intelligent answers to any interview question while you're in a live interview session.
            </p>

            {/* Get Started Button */}
            <div className="get-started-container">
              <button
                onClick={handleGetStarted}
                className="get-started-btn"
                disabled={loading}
              >
                <span className="btn-text">
                  {loading ? 'Loading...' : 'Get Started'}
                </span>
                {!loading && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="btn-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </button>
              <p className="get-started-subtitle">
                {loading
                  ? 'Checking authentication status...'
                  : user
                    ? 'Continue to your AI interview assistant'
                    : 'Start practicing with your AI interview assistant'
                }
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="how-it-works-section">
          <div className="how-it-works-container">
            <h3 className="section-title">How Interview AI Works</h3>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Open on Mobile</h4>
                  <p>Access Interview AI on your mobile device during your laptop/desktop interview</p>
                </div>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Listen & Ask</h4>
                  <p>Use voice recognition to input interview questions as you hear them</p>
                </div>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Get Instant Answers</h4>
                  <p>Receive well-structured, contextual answers instantly with audio playback</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="features-container">
            <h3 className="features-title">Perfect for Live Interviews</h3>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4>Mobile Optimized</h4>
                <p>Perfect for using on your phone while interviewing on laptop/desktop</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                  </svg>
                </div>
                <h4>Voice Recognition</h4>
                <p>Simply speak the question you heard - no typing required</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 9h.01m-.01 6h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
                  </svg>
                </div>
                <h4>Audio Answers</h4>
                <p>Listen to answers through earphones while maintaining eye contact</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="homepage-footer">
        <div className="footer-content">
          <p>&copy; 2025 Interview AI. Your secret weapon for interview success.</p>
        </div>
      </footer>
    </div>
  );
}
