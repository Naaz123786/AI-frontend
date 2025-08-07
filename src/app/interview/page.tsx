"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

function InterviewPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [recognitionRef, setRecognitionRef] = useState<any>(null);
  const [wsRef, setWsRef] = useState<WebSocket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMode, setInputMode] = useState<'none' | 'voice' | 'type'>('none');
  const router = useRouter();

  // Initialize WebSocket for real-time communication with retry logic
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:8000/ws');

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsRef(ws);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'answer') {
          typeWriter(data.answer, () => {
            speak(data.answer);
          });
          setLoading(false);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected');
        setWsRef(null);
        // Don't retry automatically to avoid infinite loops
      };

      ws.onerror = (error) => {
        console.warn('WebSocket error, falling back to HTTP requests');
        setWsRef(null);
      };

      return ws;
    } catch (error) {
      console.warn('Failed to create WebSocket, using HTTP fallback');
      return null;
    }
  }, []);

  useEffect(() => {
    const ws = connectWebSocket();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setQuestion(transcript);

        // Auto-submit in live mode
        if (liveMode && transcript.trim()) {
          setTimeout(() => {
            askAI(transcript);
          }, 1000);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setListening(false);
        setInputMode('none');
        // Don't restart automatically on error to avoid infinite loops
      };

      recognition.onend = () => {
        if (liveMode) {
          setTimeout(() => {
            recognition.start();
          }, 1000);
        } else {
          setListening(false);
        }
      };

      setRecognitionRef(recognition);
    }
  }, [liveMode]);

  // Toggle live mode
  const toggleLiveMode = () => {
    setLiveMode(!liveMode);
    if (!liveMode) {
      startListening();
    } else {
      stopListening();
    }
  };

  // Start listening
  const startListening = () => {
    if (recognitionRef) {
      recognitionRef.start();
      setListening(true);
      setInputMode('voice');
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef) {
      recognitionRef.stop();
      setListening(false);
      setInputMode('none');
    }
  };

  // Typewriter effect for answer
  const typeWriter = (text: string, callback?: () => void) => {
    setIsTyping(true);
    setAnswer("");
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setAnswer(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
        if (callback) callback();
      }
    }, 30);
  };

  // Text-to-speech
  const speak = (text: string) => {
    if (!audioEnabled) {
      console.log('Audio disabled, skipping speech');
      return;
    }
    console.log('Speaking:', text.substring(0, 50) + '...');
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.pitch = 1;
    synth.speak(utter);
  };

  // Send question to backend
  const askAI = async (customQuestion?: string) => {
    const currentQuestion = customQuestion || question;
    if (!currentQuestion.trim()) return;

    setLoading(true);
    setAnswer("");

    try {
      if (wsRef && wsRef.readyState === WebSocket.OPEN) {
        // Use WebSocket for real-time communication
        wsRef.send(JSON.stringify({
          type: 'question',
          question: currentQuestion
        }));
      } else {
        // Fallback to HTTP request
        const res = await fetch("http://localhost:8000/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: currentQuestion }),
        });
        const data = await res.json();

        typeWriter(data.answer, () => {
          speak(data.answer);
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('Error calling AI:', error);
      setAnswer("Sorry, there was an error getting the answer. Please try again.");
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
    if (wsRef) {
      wsRef.close();
    }
    router.push('/');
  };

  // Format answer with bullet points
  const formatAnswer = (text: string) => {
    return text.split('\n').map((line, index) => (
      <p key={index}>{line}</p>
    ));
  };

  return (
    <div className="interview-page">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <button onClick={goHome} className="home-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>

          <div className="brand">
            <div className="brand-icon">AI</div>
            <div className="brand-text">
              <h1>Interview Assistant</h1>
              <p>AI-powered interview companion</p>
            </div>
          </div>

          <div className="header-controls">
            <button
              onClick={toggleLiveMode}
              className={`live-btn ${liveMode ? 'active' : ''}`}
            >
              <div className={`live-dot ${liveMode ? 'active' : ''}`}></div>
              {liveMode ? 'Stop Live' : 'Go Live'}
            </button>

            <button
              onClick={() => {
                const newAudioState = !audioEnabled;
                setAudioEnabled(newAudioState);
                console.log('Audio toggled:', newAudioState);
              }}
              className={`audio-btn ${audioEnabled ? 'active' : ''}`}
              title={audioEnabled ? 'Disable Audio' : 'Enable Audio'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                {audioEnabled ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M6 10l.01.01M13 5l.01.01M6 14l.01.01M13 19l.01.01M8 12a1 1 0 100-2 1 1 0 000 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 5.586a2 2 0 112.828 2.828L21 21M1 1l4.586 4.586M12 1a3 3 0 00-3 3v8a3 3 0 01-3 3M8 17.086A7.001 7.001 0 0018 12.93" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Status Bar */}
      <div className="status-bar">
        {liveMode && (
          <div className="status-item live">
            <div className="status-dot"></div>
            Live Mode
          </div>
        )}
        {listening && (
          <div className="status-item listening">
            <div className="status-dot"></div>
            Listening
          </div>
        )}
        {wsRef && wsRef.readyState === WebSocket.OPEN && (
          <div className="status-item connected">
            <div className="status-dot"></div>
            Connected
          </div>
        )}
        <div className={`status-item audio ${audioEnabled ? 'active' : 'inactive'}`}>
          <div className="status-dot"></div>
          {audioEnabled ? 'Audio On' : 'Audio Off'}
        </div>
      </div>

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
              ? "Speak naturally and get instant answers. Perfect for live interviews!"
              : "Ask any interview question and get structured, professional answers instantly."
            }
          </p>
        </div>

        {/* Input Section */}
        <div className="input-section">
          <div className="input-container">
            {inputMode === 'type' && (
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                placeholder={liveMode ? "Type your question (works in live mode too)..." : "Type your interview question here..."}
                className="question-input"
                rows={3}
              />
            )}

            {listening && (
              <div className="listening-indicator">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            )}
          </div>

          {/* Combined Input Controls */}
          <div className="input-controls-container">
            <div className="input-controls">
              <button
                onClick={() => {
                  if (inputMode === 'voice') {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                disabled={loading}
                className={`control-btn voice-btn ${inputMode === 'voice' ? 'active' : ''}`}
                title="Voice Input"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                </svg>
                {inputMode === 'voice' ? 'Stop' : 'Voice'}
              </button>

              <button
                onClick={() => {
                  if (inputMode === 'type') {
                    if (question.trim()) {
                      askAI();
                    } else {
                      setInputMode('none');
                    }
                  } else {
                    setInputMode('type');
                  }
                }}
                disabled={loading}
                className={`control-btn type-btn ${inputMode === 'type' ? 'active' : ''}`}
                title={inputMode === 'type' ? (question.trim() ? 'Send Message' : 'Close Input') : 'Text Input'}
              >
                {loading ? (
                  <div className="spinner-small"></div>
                ) : inputMode === 'type' ? (
                  question.trim() ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  )
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                )
                {inputMode === 'type' ? (question.trim() ? 'Send' : 'Close') : 'Type'}
              </button>
            </div>
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
                {formatAnswer(answer)}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <p>
                  {liveMode
                    ? "Ready to assist! Start speaking your question..."
                    : "Ask your interview question to get started!"
                  }
                </p>
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
              <p>Use Live Mode for real-time interview assistance</p>
            </div>
            <div className="tip-item">
              <div className="tip-dot"></div>
              <p>Enable audio for hands-free operation</p>
            </div>
            <div className="tip-item">
              <div className="tip-dot"></div>
              <p>Perfect for mobile use during laptop interviews</p>
            </div>
            <div className="tip-item">
              <div className="tip-dot"></div>
              <p>Press Enter to submit, Shift+Enter for new line</p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .interview-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .interview-page::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(120, 119, 198, 0.2) 0%, transparent 50%);
          z-index: 1;
        }

        .header {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 4rem;
          position: relative;
          z-index: 2;
        }

        .home-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }

        .home-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .brand-icon {
          width: 2.5rem;
          height: 2.5rem;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.1rem;
        }

        .brand-text h1 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
        }

        .brand-text p {
          margin: 0;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .live-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }

        .live-btn.active {
          background: #dc2626;
          color: white;
          border-color: #dc2626;
        }

        .live-dot {
          width: 0.5rem;
          height: 0.5rem;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
        }

        .live-dot.active {
          background: white;
          animation: pulse 1s infinite;
        }

        .audio-btn {
          padding: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }

        .audio-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .audio-btn.active {
          background: #10b981;
          color: white;
          border-color: #10b981;
        }

        .audio-btn:not(.active) {
          background: #dc2626;
          color: white;
          border-color: #dc2626;
        }

        .status-bar {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
          align-items: center;
        }

        @media (min-width: 768px) {
          .status-bar {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-item.live {
          background: #fef2f2;
          color: #dc2626;
        }

        .status-item.listening {
          background: #f0fdf4;
          color: #16a34a;
        }

        .status-item.connected {
          background: #eff6ff;
          color: #2563eb;
        }

        .status-item.audio.active {
          background: #f0fdf4;
          color: #16a34a;
        }

        .status-item.audio.inactive {
          background: #fef2f2;
          color: #dc2626;
        }

        .status-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 2s infinite;
        }

        .main-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
          position: relative;
          z-index: 2;
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
          color: rgba(255, 255, 255, 0.8);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .input-section {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 1rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(25px);
        }

        .input-container {
          position: relative;
          margin-bottom: 0.5rem;
        }

        .question-input {
          width: 100%;
          padding: 1rem;
          padding-right: 8rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.75rem;
          font-size: 1rem;
          line-height: 1.5;
          resize: vertical;
          outline: none;
          transition: all 0.2s;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          backdrop-filter: blur(10px);
          min-height: 100px;
        }

        .question-input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .question-input:focus {
          border-color: rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
        }

        .listening-indicator {
          position: absolute;
          top: 1rem;
          right: 1rem;
          display: flex;
          gap: 0.25rem;
        }

        .wave {
          width: 0.25rem;
          height: 1.5rem;
          background: #3b82f6;
          border-radius: 9999px;
          animation: wave 1s ease-in-out infinite;
        }

        .wave:nth-child(2) {
          animation-delay: 0.2s;
        }

        .wave:nth-child(3) {
          animation-delay: 0.4s;
        }

        .inline-buttons {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          display: flex;
          gap: 0.5rem;
          z-index: 10;
        }

        .inline-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          width: 3rem;
          height: 3rem;
          border: none;
          border-radius: 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }

        .voice-btn {
          background: rgba(59, 130, 246, 0.9);
          color: white;
          border: 1px solid rgba(59, 130, 246, 0.4);
        }

        .voice-btn:hover {
          background: rgba(59, 130, 246, 1);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }

        .voice-btn.active {
          background: rgba(29, 78, 216, 1);
          animation: pulse 1s infinite;
        }

        .type-btn {
          background: rgba(16, 185, 129, 0.9);
          color: white;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }

        .type-btn:hover {
          background: rgba(16, 185, 129, 1);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .input-controls-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 0.5rem 0;
        }

        .input-controls {
          display: flex;
          flex-direction: row;
          gap: 0.5rem;
          align-items: center;
          justify-content: center;
        }

        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
          font-size: 0.8rem;
          min-width: 80px;
          white-space: nowrap;
        }

        .control-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .control-btn.active {
          animation: pulse 1s infinite;
        }

        .inline-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .spinner-small {
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .input-helper-text {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
          text-align: center;
          margin: 0;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mic-btn {
          background: #3b82f6;
          color: white;
        }

        .mic-btn:hover {
          background: #2563eb;
        }

        .mic-btn.active {
          background: #1d4ed8;
        }

        .send-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .send-btn:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .answer-section {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 1rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(25px);
        }

        .answer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .answer-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
        }

        .typing-indicator {
          display: flex;
          gap: 0.25rem;
        }

        .dot {
          width: 0.5rem;
          height: 0.5rem;
          background: #3b82f6;
          border-radius: 50%;
          animation: bounce 1s infinite;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        .answer-content {
          min-height: 12rem;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 8rem;
          gap: 1rem;
          color: white;
        }

        .spinner {
          width: 2rem;
          height: 2rem;
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

        .answer-display {
          space-y: 1rem;
        }

        .answer-point {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-left: 4px solid #3b82f6;
          border-radius: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .point-number {
          width: 1.5rem;
          height: 1.5rem;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .point-text {
          flex: 1;
          font-weight: 500;
          color: #1e293b;
          line-height: 1.6;
          text-align: left;
        }

        .answer-text {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin-bottom: 0.75rem;
        }

        .tips-section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 1.5rem;
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

        @keyframes wave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.5); }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-0.5rem); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .header-content {
            padding: 0 0.5rem;
          }

          .brand-text h1 {
            font-size: 1.125rem;
          }

          .brand-text p {
            display: none;
          }

          .welcome-title {
            font-size: 2rem;
          }

          .welcome-subtitle {
            font-size: 1rem;
          }

          .main-content {
            padding: 1rem 0.5rem;
          }

          .input-section, .answer-section {
            padding: 1rem;
          }

          .question-input {
            padding-right: 7rem;
          }

          .inline-buttons {
            bottom: 0.75rem;
            right: 0.75rem;
            gap: 0.25rem;
          }

          .inline-btn {
            width: 2.5rem;
            height: 2.5rem;
            font-size: 0.7rem;
          }

          .action-buttons {
            flex-direction: column;
          }

          .tips-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .header-content {
            height: 3.5rem;
          }

          .home-btn span {
            display: none;
          }

          .live-btn span {
            display: none;
          }

          .welcome-title {
            font-size: 1.5rem;
          }

          .brand-icon {
            width: 2rem;
            height: 2rem;
            font-size: 1rem;
          }

          .brand-text h1 {
            font-size: 1rem;
          }

          .question-input {
            padding-right: 6rem;
            min-height: 80px;
          }

          .inline-buttons {
            bottom: 0.5rem;
            right: 0.5rem;
            gap: 0.25rem;
          }

          .inline-btn {
            width: 2rem;
            height: 2rem;
            font-size: 0.6rem;
          }
        }
      `}</style>
    </div>
  );
}

export default InterviewPage;
