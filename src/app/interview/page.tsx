"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionHistory } from '@/hooks/useQuestionHistory';

export default function InterviewPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [inputMode, setInputMode] = useState<'none' | 'voice' | 'type'>('none');
  const [isTyping, setIsTyping] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [ambientListening, setAmbientListening] = useState(false);
  const [detectedQuestion, setDetectedQuestion] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Refs for current state values to avoid closure issues
  const liveModeRef = useRef(false);
  const loadingRef = useRef(false);
  const autoSubmitRef = useRef(true);
  const audioEnabledRef = useRef(true);
  const lastQuestionRef = useRef('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const ambientRecognitionRef = useRef<SpeechRecognition | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { addQuestion } = useQuestionHistory(user?.id || null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (mobileMenuOpen && !target.closest('.header') && !target.closest('.mobile-dropdown')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Initialize WebSocket connection with better error handling
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      console.log('Attempting to connect to WebSocket...');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ai-backend-aeve.onrender.com';
      const wsUrl = apiUrl.replace('http', 'ws').replace('https', 'wss');
      const ws = new WebSocket(`${wsUrl}/ws`);

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setWsConnected(true);
        wsRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'answer') {
            if (question.trim()) {
              addQuestion(question, data.answer);
            }

            typeWriter(data.answer, () => {
              if (audioEnabledRef.current) {
                speak(data.answer);
              } else {
                if (liveMode) {
                  console.log('🧹 WebSocket: Audio disabled - clearing question immediately');
                  setQuestion('');
                  setDetectedQuestion(false);
                }
              }
            });
            setLoading(false);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected. Using HTTP fallback.');
        setWsConnected(false);
        wsRef.current = null;
      };

      ws.onerror = (error) => {
        console.log('⚠️ WebSocket connection failed. Using HTTP fallback.');
        setWsConnected(false);
        wsRef.current = null;
      };

    } catch (error) {
      console.log('❌ WebSocket not available. Using HTTP fallback.');
      setWsConnected(false);
    }
  }, [audioEnabled]);

  // Sync refs with state values to avoid closure issues
  useEffect(() => {
    liveModeRef.current = liveMode;
  }, [liveMode]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    autoSubmitRef.current = true;
  }, []);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  // Initialize WebSocket (disabled for now to prevent errors)
  useEffect(() => {
    setWsConnected(false);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Format AI response with proper bullet points
  const formatResponse = (text: string) => {
    let formatted = text.replace(/(\d+\.)\s*/g, '\n• ');
    formatted = formatted.replace(/^\s*[-*]\s+/gm, '• ');
    formatted = formatted.replace(/^\s*•\s*/gm, '• ');
    formatted = formatted.replace(/\n\s*\n/g, '\n');
    formatted = formatted.trim();
    formatted = formatted.replace(/\. (\d+\.|•)/g, '.\n$1');
    return formatted;
  };

  // Typewriter effect
  const typeWriter = (text: string, callback?: () => void) => {
    setIsTyping(true);
    setAnswer("");

    const formattedText = formatResponse(text);

    let i = 0;
    const timer = setInterval(() => {
      if (i < formattedText.length) {
        setAnswer(formattedText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
        if (callback) callback();
      }
    }, 30);
  };

  // Speech synthesis ref to control audio
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpokenTextRef = useRef<string>("");

  // Text-to-speech with real-time audio control
  const speak = (text: string) => {
    if (!audioEnabledRef.current) {
      console.log('🔇 Audio is disabled, skipping speech synthesis');
      return;
    }

    window.speechSynthesis.cancel();
    lastSpokenTextRef.current = text;

    const synth = window.speechSynthesis;
    const cleanText = text
      .replace(/^\s*•\s*/gm, '')
      .replace(/^\s*\d+\.\s*/gm, '')
      .replace(/\n/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    speechSynthRef.current = utterance;

    utterance.onend = () => {
      speechSynthRef.current = null;
      console.log('🔊 Speech completed');
      setQuestion('');
      setDetectedQuestion(false);
      lastQuestionRef.current = '';
    };

    utterance.onerror = (error) => {
      speechSynthRef.current = null;
      console.log('Speech error:', error);
    };

    synth.speak(utterance);
  };

  // Stop speech function immediately and prevent restart
  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    speechSynthRef.current = null;
  };

  // Send question to backend
  const askAI = async (customQuestion?: string) => {
    const currentQuestion = customQuestion || question;
    console.log('🚀 askAI called with question:', currentQuestion);

    if (!currentQuestion.trim()) {
      console.log('⚠️ Empty question, returning');
      return;
    }

    if (window.speechSynthesis.speaking) {
      stopSpeech();
    }

    console.log('✅ Starting AI request...');
    setLoading(true);
    setAnswer("");
    setDetectedQuestion(false);

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'question',
          question: currentQuestion
        }));
      } else {
        console.log('🌐 Making HTTP request to backend...');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ai-backend-aeve.onrender.com';
        const res = await fetch(`${apiUrl}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: currentQuestion }),
        });
        const data = await res.json();
        console.log('✅ Received response from backend:', data);

        addQuestion(currentQuestion, data.answer);

        console.log('📝 Starting typewriter effect...');
        typeWriter(data.answer, () => {
          if (audioEnabledRef.current) {
            console.log('🔊 Starting speech synthesis if audio is enabled...');
            speak(data.answer);
          }
        });
        setLoading(false);
        console.log('✅ AI request completed successfully');
      }
    } catch (error) {
      console.error('❌ Error calling AI:', error);
      setAnswer(error.message.includes('failed') ? "Connection failed. Please ensure the server is running." : "Error occurred. Please retry.");
      setLoading(false);
    }
  };

  // Handle key press for Enter to submit
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      askAI();
    }
  };

  // Go back to home
  const goHome = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    router.push('/');
  };

  return (
    <div className="interview-page">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <button onClick={goHome} className="home-btn">
            🏠 Home
          </button>
          <div className="brand">
            <h1>🤖 Interview Assistant</h1>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          {/* Desktop Controls */}
          <div className="header-controls desktop-controls">
            <button
              onClick={() => setLiveMode(!liveMode)}
              className={`live-btn ${liveMode ? 'active' : ''}`}
              title={liveMode ? 'End Live Mode' : 'Start Live Mode'}
            >
              <div className={`live-dot ${liveMode ? 'active' : ''}`}></div>
              {liveMode ? 'End Live' : 'Go Live'}
            </button>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`audio-btn ${audioEnabled ? 'active' : ''}`}
              title={audioEnabled ? 'Disable Audio' : 'Enable Audio'}
            >
              {audioEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="mobile-dropdown open">
            <div className="mobile-menu-content">
              <button
                onClick={() => {
                  setLiveMode(!liveMode);
                  setMobileMenuOpen(false);
                }}
                className={`mobile-menu-item ${liveMode ? 'active' : ''}`}
              >
                <div className={`live-dot ${liveMode ? 'active' : ''}`}></div>
                <span>{liveMode ? '🔴 End Live Mode' : '🟢 Start Live Mode'}</span>
              </button>

              <button
                onClick={() => {
                  setAudioEnabled(!audioEnabled);
                  setMobileMenuOpen(false);
                }}
                className={`mobile-menu-item ${audioEnabled ? 'active' : ''}`}
              >
                <span>{audioEnabled ? '🔊 Audio On' : '🔇 Audio Off'}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h2 className="welcome-title">
            {liveMode ? (
              <>🔴 Live Interview Mode</>
            ) : (
              <>🤖 AI Interview Assistant</>
            )}
          </h2>
          <p className="welcome-subtitle">
            {liveMode
              ? "Live mode ready for interview questions!"
              : "Ask any interview question and get structured, professional answers instantly."
            }
          </p>
        </div>

        {/* Input Section */}
        <div className="input-section">
          <div className="input-container">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              placeholder="Type your interview question here..."
              className="question-input"
              rows={3}
            />
          </div>

          <div className="input-controls">
            <button
              onClick={() => askAI()}
              disabled={loading || !question.trim()}
              className="submit-btn"
            >
              {loading ? 'Generating...' : 'Ask AI'}
            </button>
          </div>
        </div>

        {/* Answer Section */}
        <div className="answer-section">
          <div className="answer-header">
            <h3>🤖 AI Response</h3>
            {isTyping && (
              <div className="typing-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
          </div>

          <div className="answer-content">
            {loading ? (
              <div className="loading-state">
                <div className="spinner large"></div>
                <p>Generating your answer...</p>
              </div>
            ) : answer ? (
              <div className="answer-display">
                <div className="answer-text">
                  {answer.split('\n').map((line, index) => (
                    <div key={index} className="answer-line">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <p>Ask your interview question to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="tips-section">
          <h4>💡 Quick Tips</h4>
          <div className="tips-grid">
            <div className="tip-item">
              <div className="tip-dot"></div>
              <p>Live Mode for continuous listening</p>
            </div>
            <div className="tip-item">
              <div className="tip-dot"></div>
              <p>Audio responses for hands-free operation</p>
            </div>
            <div className="tip-item">
              <div className="tip-dot"></div>
              <p>Mobile responsive for phone use</p>
            </div>
            <div className="tip-item">
              <div className="tip-dot"></div>
              <p>Press Enter to submit questions</p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .interview-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .header {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1rem 0;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 100;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }

        .mobile-menu-btn {
          display: none;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          padding: 0.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          z-index: 101;
        }

        .hamburger {
          display: flex;
          flex-direction: column;
          width: 20px;
          height: 16px;
          position: relative;
        }

        .hamburger span {
          display: block;
          height: 2px;
          width: 100%;
          background: white;
          border-radius: 1px;
          transition: all 0.3s ease;
          position: absolute;
        }

        .hamburger span:nth-child(1) {
          top: 0;
        }

        .hamburger span:nth-child(2) {
          top: 7px;
        }

        .hamburger span:nth-child(3) {
          top: 14px;
        }

        .mobile-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transform: translateY(-100%);
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          z-index: 99;
          display: none;
        }

        .mobile-dropdown.open {
          transform: translateY(0);
          opacity: 1;
          visibility: visible;
        }

        .mobile-menu-content {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .mobile-menu-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 0.5rem;
          color: white;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          min-height: 48px;
          justify-content: flex-start;
        }
        
        .home-btn {
          padding: 0.6rem 1.2rem;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .home-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .brand {
          flex: 1;
          text-align: center;
          min-width: 0;
        }

        .brand h1 {
          margin: 0;
          color: white;
          font-size: 1.4rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .desktop-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .live-btn, .audio-btn {
          padding: 0.6rem 1rem;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .live-btn:hover, .audio-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .live-btn.active {
          background: rgba(34, 197, 94, 0.3);
          border-color: rgba(34, 197, 94, 0.5);
          color: #22c55e;
        }

        .audio-btn.active {
          background: rgba(34, 197, 94, 0.3);
          border-color: rgba(34, 197, 94, 0.5);
          color: #22c55e;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }

        .live-dot:not(.active) {
          background: rgba(255, 255, 255, 0.5);
          animation: none;
        }
        
        .main-content {
          padding: 2rem;
          padding-top: 120px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .welcome-section {
          text-align: center;
          margin-bottom: 2rem;
        }

        .welcome-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 1rem;
        }

        .welcome-subtitle {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 0;
        }
        
        .input-section {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 1.5rem;
          margin: 0 auto 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          max-width: 650px;
        }
        
        .question-input {
          width: 100%;
          min-height: 80px;
          padding: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-size: 0.95rem;
          resize: vertical;
          margin-bottom: 0.75rem;
          backdrop-filter: blur(10px);
        }
        
        .question-input::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }
        
        .question-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: rgba(255, 255, 255, 0.2);
        }

        .input-controls {
          display: flex;
          justify-content: center;
        }
        
        .submit-btn {
          padding: 0.75rem 1.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .submit-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .answer-section {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 2rem;
          margin: 0 auto;
          max-width: 650px;
          width: 85%;
        }
        
        .answer-section h3 {
          margin: 0 0 1rem 0;
          color: white;
        }

        .answer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .typing-indicator {
          display: flex;
          gap: 0.25rem;
        }

        .typing-indicator .dot {
          width: 0.5rem;
          height: 0.5rem;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: bounce 1.4s infinite;
        }

        .typing-indicator .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        .answer-content {
          min-height: 400px;
        }
        
        .answer-display {
          color: white;
        }
        
        .answer-text {
          line-height: 1.6;
        }
        
        .answer-line {
          margin-bottom: 0.5rem;
          color: white;
          font-size: 1rem;
        }
        
        .answer-line:empty {
          margin-bottom: 0.25rem;
        }
        
        .answer-line:last-child {
          margin-bottom: 0;
        }
        
        .loading-state, .empty-state {
          text-align: center;
          color: rgba(255, 255, 255, 0.8);
          padding: 2rem;
        }

        .spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinner.large {
          width: 3rem;
          height: 3rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .tips-section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 1.5rem;
          margin-top: 2rem;
          backdrop-filter: blur(10px);
        }

        .tips-section h4 {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: white;
        }

        .tips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .tip-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .tip-dot {
          width: 0.5rem;
          height: 0.5rem;
          background: #6366f1;
          border-radius: 50%;
          margin-top: 0.5rem;
          flex-shrink: 0;
        }

        .tip-item p {
          margin: 0;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-0.5rem); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex !important;
          }

          .desktop-controls {
            display: none !important;
          }

          .mobile-dropdown {
            display: block;
          }

          .header-content {
            padding: 0 1rem;
          }

          .brand h1 {
            font-size: 1.1rem;
          }

          .welcome-title {
            font-size: 1.8rem;
          }

          .main-content {
            padding: 1rem;
            padding-top: 100px;
          }

          .tips-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}