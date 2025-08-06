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
  // Auto mode is always enabled in live mode - manual mode removed
  const [detectedQuestion, setDetectedQuestion] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Initialize WebSocket connection with better error handling
  const connectWebSocket = useCallback(() => {
    // Only try to connect if not already connected
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
            // Add question and answer to history for WebSocket responses
            if (question.trim()) {
              addQuestion(question, data.answer);
            }

            typeWriter(data.answer, () => {
              if (audioEnabledRef.current) {
                speak(data.answer);
              } else {
                // If audio is disabled, clear question immediately after typing
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
        // Don't retry automatically to prevent infinite loops
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

  // Initialize Ambient Speech Recognition for Live Mode
  const initializeAmbientRecognition = useCallback(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition && !ambientRecognitionRef.current) {
        const ambientRecognition = new SpeechRecognition();
        ambientRecognition.continuous = true;
        ambientRecognition.interimResults = true;
        ambientRecognition.lang = 'en-US';
        ambientRecognition.maxAlternatives = 3; // Increase alternatives for better detection

        // Enhanced settings for better ambient detection
        try {
          // Set longer timeout for better ambient listening
          Object.defineProperty(ambientRecognition, 'timeout', { value: 15000, writable: true });
          Object.defineProperty(ambientRecognition, 'interimTimeout', { value: 3000, writable: true });
        } catch (e) {
          console.log('Could not set recognition timeouts:', e);
        }

        ambientRecognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          // Process all results including interim
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          // Use final transcript, or interim if no final available
          const currentTranscript = finalTranscript || interimTranscript;

          if (currentTranscript.trim()) {

            // Enhanced interview question detection
            const interviewKeywords = [
              // Question starters
              'what', 'how', 'why', 'when', 'where', 'which', 'who',
              'tell me', 'describe', 'explain', 'share', 'discuss',
              'walk me through', 'talk about', 'give me an example',

              // Interview specific terms
              'experience', 'project', 'challenge', 'strength', 'weakness',
              'salary', 'team', 'work', 'company', 'role', 'position',
              'skills', 'background', 'qualifications', 'achievement',
              'responsibility', 'accomplishment', 'goal', 'motivation',
              'leadership', 'conflict', 'problem', 'solution', 'decision',

              // Common interview phrases
              'previous job', 'current role', 'time when', 'situation where',
              'example of', 'instance where', 'tell us about', 'can you',
              'would you', 'have you', 'do you have'
            ];

            const transcript = currentTranscript.toLowerCase();
            const hasInterviewKeyword = interviewKeywords.some(keyword =>
              transcript.includes(keyword)
            );

            // More flexible detection - shorter questions also count
            const isQuestionFormat = transcript.includes('?') ||
              transcript.match(/^(what|how|why|when|where|which|who|tell|describe|explain|can you|would you|have you|do you)/i);

            // If it sounds like an interview question
            if ((hasInterviewKeyword || isQuestionFormat) && currentTranscript.trim().length > 10) {

              // Prevent duplicate processing of the same question
              const trimmedTranscript = currentTranscript.trim().toLowerCase();
              const lastQuestion = lastQuestionRef.current.toLowerCase();

              // Improved duplicate detection - only skip if questions are exactly the same
              // or if the new question is meaningfully shorter than the previous one
              if (trimmedTranscript === lastQuestion) {
                console.log('🚫 Exact duplicate question detected, skipping:', trimmedTranscript);
                return;
              }

              // Allow longer questions even if they contain previous shorter ones
              // Only skip if the current question is significantly shorter and contained in the last one
              if (lastQuestion && lastQuestion.includes(trimmedTranscript) &&
                trimmedTranscript.length < lastQuestion.length * 0.7) {
                console.log('🚫 Shorter duplicate question detected, skipping:', trimmedTranscript);
                return;
              }

              // Clear any existing debounce timeout
              if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
              }

              console.log('✅ Interview question detected:', currentTranscript);
              setQuestion(currentTranscript.trim());
              setDetectedQuestion(true);
              lastQuestionRef.current = currentTranscript.trim();

              // Process transcripts for submission (both final and interim if complete-looking)
              if (autoSubmitRef.current) { // Always true in auto mode
                // For final transcripts, submit after a short delay to ensure completeness
                if (finalTranscript) {
                  console.log('🚀 Auto-submitting final transcript in live mode...');
                  console.log('🔍 Conditions check:', { liveMode, loading, finalTranscript: finalTranscript.trim() });

                  // Auto-submit after a brief delay to allow for any additional speech
                  setTimeout(() => {
                    const currentLiveMode = liveModeRef.current;
                    const currentLoading = loadingRef.current;
                    const currentAutoSubmit = autoSubmitRef.current;

                    console.log('⏰ Auto-submit timeout executed');
                    console.log('🔍 Checking conditions:', {
                      currentLiveMode,
                      currentLoading,
                      currentAutoSubmit,
                      transcript: finalTranscript.trim()
                    });

                    if (currentLiveMode && !currentLoading && currentAutoSubmit && finalTranscript.trim()) {
                      console.log('🎯 Auto-submitting question:', finalTranscript.trim());
                      askAI(finalTranscript.trim());
                      // Don't reset detectedQuestion here - let speech completion handle it
                    } else {
                      console.log('❌ Auto-submit cancelled - conditions not met');
                    }
                  }, 1200); // Increased delay to capture full questions
                } else if (interimTranscript && currentTranscript.length > 20 && !loading) {
                  // For longer interim results that seem complete, auto-submit with longer delay
                  console.log('🟡 Auto-submitting interim transcript (seems complete)...');
                  setTimeout(() => {
                    const currentLiveMode = liveModeRef.current;
                    const currentLoading = loadingRef.current;
                    const currentAutoSubmit = autoSubmitRef.current;

                    // Only submit if no final transcript came through and conditions are still met
                    if (currentLiveMode && !currentLoading && currentAutoSubmit && currentTranscript.trim()) {
                      console.log('🎯 Calling askAI with interim:', currentTranscript.trim());
                      askAI(currentTranscript.trim());
                      // Don't reset detectedQuestion here - let speech completion handle it
                    }
                  }, 2500); // Increased delay for interim results
                }

                // Fallback: If we detected a question but no submission happened, force submit
                setTimeout(() => {
                  const currentLiveMode = liveModeRef.current;
                  const currentLoading = loadingRef.current;
                  const currentAutoSubmit = autoSubmitRef.current;
                  if (currentLiveMode && currentAutoSubmit && !currentLoading && currentTranscript.trim() && currentTranscript.length > 10) {
                    console.log('🔄 Fallback auto-submission triggered after 4 seconds');
                    askAI(currentTranscript.trim());
                    // Don't reset detectedQuestion here - let speech completion handle it
                  }
                }, 4000); // Increased fallback delay
              }

              // In manual mode, ensure the flag is set for Send button display
              if (!autoSubmitRef.current) {
                console.log('🔴 Manual mode: Setting detected question flag for Send button');
                setDetectedQuestion(true);
              } else {
                console.log('🤖 Auto mode: Detection handled by auto-submit logic above');
              }
            }
          }
        };

        ambientRecognition.onerror = (event) => {
          console.log('⚠️ Ambient recognition error:', event.error);

          // Handle different error types
          switch (event.error) {
            case 'aborted':
              console.log('🔄 Recognition was aborted, this is normal during restart');
              break;
            case 'no-speech':
              console.log('😴 No speech detected in ambient mode');
              break;
            case 'audio-capture':
              console.log('🎤 Audio capture error in ambient mode');
              break;
            case 'not-allowed':
              console.log('❌ Microphone not allowed for ambient mode');
              setAmbientListening(false);
              break;
            default:
              console.log('⚠️ Other ambient error:', event.error);
          }
        };

        ambientRecognition.onend = () => {
          console.log('🔄 Ambient recognition ended, restarting...');

          // Use refs for current state values to avoid closure issues
          const currentLiveMode = liveModeRef.current;
          const currentLoading = loadingRef.current;
          const currentAutoSubmit = autoSubmitRef.current;

          console.log('🔍 Ambient onend - Current states:', {
            currentLiveMode,
            currentLoading,
            currentAutoSubmit,
            hasAmbientRef: !!ambientRecognitionRef.current
          });

          // Always restart if in live mode with auto submit, regardless of loading state
          // This ensures continuous operation even during API calls
          if (currentLiveMode && currentAutoSubmit && ambientRecognitionRef.current) {
            // Shorter delay for immediate restart
            setTimeout(() => {
              try {
                // Double check refs again
                const stillLiveMode = liveModeRef.current;
                const stillAutoSubmit = autoSubmitRef.current;

                if (ambientRecognitionRef.current && stillLiveMode && stillAutoSubmit) {
                  ambientRecognitionRef.current.start();
                  setAmbientListening(true);
                  console.log('✅ Ambient recognition restarted successfully - ready for next question');
                } else {
                  console.log('❌ Conditions changed, not restarting:', { stillLiveMode, stillAutoSubmit });
                }
              } catch (e) {
                if (e.name === 'InvalidStateError') {
                  console.log('⚠️ Recognition already running, skipping restart');
                } else {
                  console.log('⚠️ Ambient recognition restart failed:', e);
                  // Always retry in live auto mode - this is critical for continuous operation
                  setTimeout(() => {
                    try {
                      const finalLiveMode = liveModeRef.current;
                      const finalAutoSubmit = autoSubmitRef.current;

                      if (ambientRecognitionRef.current && finalLiveMode && finalAutoSubmit) {
                        ambientRecognitionRef.current.start();
                        setAmbientListening(true);
                        console.log('✅ Ambient recognition retry successful - continuous mode active');
                      }
                    } catch (retryError) {
                      console.log('❌ Final restart attempt failed:', retryError);
                      // Don't give up - keep trying every 3 seconds in live auto mode
                      if (liveModeRef.current && autoSubmitRef.current) {
                        setTimeout(() => {
                          if (liveModeRef.current && autoSubmitRef.current) {
                            console.log('🔄 Persistent retry - attempting to restart ambient recognition');
                            try {
                              initializeAmbientRecognition();
                              startAmbientRecognition();
                            } catch (persistentError) {
                              console.log('❌ Persistent retry failed:', persistentError);
                            }
                          }
                        }, 3000);
                      }
                    }
                  }, 1000);
                }
              }
            }, 300); // Faster restart for better responsiveness
          } else {
            console.log('❌ Not restarting ambient recognition - not in live auto mode');
            setAmbientListening(false);
          }
        };

        ambientRecognitionRef.current = ambientRecognition;
      }
    }
  }, [liveMode, loading]); // autoSubmitInLiveMode removed - always true

  // Initialize Speech Recognition
  useEffect(() => {

    // Cleanup previous recognition if exists
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
      } catch (e) {
      }
      recognitionRef.current = null;
    }

    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;


      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Set to true for better speech detection
        recognition.interimResults = true; // Enable interim results for better responsiveness
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        // Fix common Chrome speech recognition issues
        try {
          // Override default timeout - Chrome default is too short
          Object.defineProperty(recognition, 'timeout', { value: 30000, writable: true });
          Object.defineProperty(recognition, 'interimTimeout', { value: 5000, writable: true });
        } catch (e) {
          console.log('Timeout override not supported:', e);
        }


        recognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';


          // Process all speech results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence;


            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          // Update question with final or interim transcript
          const currentTranscript = finalTranscript || interimTranscript;

          if (currentTranscript.trim()) {
            setQuestion(prev => {
              const newQuestion = currentTranscript.trim();
              return newQuestion;
            });

            // Auto-submit in live mode only for final results
            if (liveMode && finalTranscript.trim() && !loading) {
              console.log('🔴 Live mode: Submitting question:', finalTranscript.trim());
              setTimeout(() => {
                askAI(finalTranscript.trim());
              }, 500);
            }

            // Stop listening after final result in normal mode
            if (!liveMode && finalTranscript.trim()) {
              setTimeout(() => {
                if (recognitionRef.current) {
                  recognitionRef.current.stop();
                }
              }, 1000);
            }
          }
        };

        recognition.onerror = (event) => {
          // Handle different error types
          switch (event.error) {
            case 'no-speech':
              // FORCE switch to type mode - no conditions
              setIsListening(false);
              setInputMode('type');


              // Force focus on textarea
              setTimeout(() => {
                const textarea = document.querySelector('.question-input') as HTMLTextAreaElement;
                if (textarea) {
                  textarea.focus();
                  textarea.placeholder = 'Voice didn\'t work - Type your interview question here!';
                } else {
                  // Try again after a longer delay
                  setTimeout(() => {
                    const textarea2 = document.querySelector('.question-input') as HTMLTextAreaElement;
                    if (textarea2) {
                      textarea2.focus();
                    }
                  }, 2000);
                }
              }, 1500);
              break;
            case 'audio-capture':
              // Microphone not available
              setIsListening(false);
              setInputMode('none');
              setLiveMode(false);
              break;
            case 'not-allowed':
              // Microphone access denied
              setIsListening(false);
              setInputMode('none');
              setLiveMode(false);
              break;
            case 'network':
              // Network error occurred during speech recognition
              break;
            default:
            // Speech recognition error occurred
          }
        };

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onend = () => {
          // Always update listening state when recognition ends
          setIsListening(false);

          // In live mode, automatically restart
          if (liveMode) {
            setTimeout(() => {
              if (recognitionRef.current && liveMode) {
                try {
                  recognitionRef.current.start();
                  setIsListening(true);
                } catch (e) {
                  setLiveMode(false);
                  setInputMode('none');
                }
              }
            }, 500);
          } else {
            // In manual mode, stop recognition but keep input mode to show Send button
            // Don't set inputMode to 'none' - keep current mode so Send button appears
          }
        };

        recognitionRef.current = recognition;
      } else {
        // Speech recognition not supported in this browser
      }
    } else {
      // Window object not available (SSR mode)
    }

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onstart = null;
          recognitionRef.current.onend = null;
        } catch (e) {
          console.log('Final cleanup error:', e);
        }
        recognitionRef.current = null;
      }
    };
  }, []); // Remove dependencies to prevent re-initialization

  // Sync refs with state values to avoid closure issues
  useEffect(() => {
    liveModeRef.current = liveMode;
  }, [liveMode]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    autoSubmitRef.current = true; // Always auto mode
  }, []);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  // Initialize WebSocket (disabled for now to prevent errors)
  useEffect(() => {
    // WebSocket connection disabled - using HTTP fallback only
    setWsConnected(false);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Cleanup speech synthesis on component unmount or page refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Stop any ongoing speech synthesis
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function for component unmount
    return () => {
      // Stop speech synthesis
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      // Remove event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Clean up speech reference
      speechSynthRef.current = null;
    };
  }, []);

  // Format AI response with proper bullet points
  const formatResponse = (text: string) => {
    // Handle numbered points (1., 2., 3., etc.)
    let formatted = text.replace(/(\d+\.)\s*/g, '\n• ');

    // Handle dash points (-, *, etc.)
    formatted = formatted.replace(/^\s*[-*]\s+/gm, '• ');

    // Handle existing bullet points
    formatted = formatted.replace(/^\s*•\s*/gm, '• ');

    // Clean up extra spaces and ensure proper line breaks
    formatted = formatted.replace(/\n\s*\n/g, '\n');
    formatted = formatted.trim();

    // Ensure each bullet point is on a new line
    formatted = formatted.replace(/\. (\d+\.|•)/g, '.\n$1');

    return formatted;
  };

  // Typewriter effect
  const typeWriter = (text: string, callback?: () => void) => {
    setIsTyping(true);
    setAnswer("");

    // Format the text before typing
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
    // Always check current audio state before speaking using ref to avoid closure issues
    if (!audioEnabledRef.current) {
      console.log('🔇 Audio is disabled, skipping speech synthesis');

      // Even without speech, we need to trigger the cleanup logic
      setTimeout(() => {
        console.log('🧹 Audio disabled - clearing question and restarting recognition');
        setQuestion('');
        setDetectedQuestion(false);
        lastQuestionRef.current = '';

        // Restart recognition based on mode
        if (liveMode) { // Always auto mode
          setTimeout(() => {
            if (liveModeRef.current && autoSubmitRef.current && ambientRecognitionRef.current) {
              try {
                ambientRecognitionRef.current.start();
                setAmbientListening(true);
                console.log('✅ Ambient recognition restarted after audio-disabled answer');
              } catch (e) {
                console.log('Could not restart ambient after audio-disabled answer:', e);
              }
            }
          }, 500);
        }
      }, 1000); // Give time for typewriter to complete

      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    // Store the text for re-speaking when audio is toggled
    lastSpokenTextRef.current = text;

    const synth = window.speechSynthesis;

    // Clean text for better speech (remove bullet points and numbers)
    const cleanText = text
      .replace(/^\s*•\s*/gm, '')
      .replace(/^\s*\d+\.\s*/gm, '')
      .replace(/\n/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    // Store reference for stopping
    speechSynthRef.current = utterance;

    // Clear reference when speech ends and clear question
    utterance.onend = () => {
      speechSynthRef.current = null;
      console.log('🔊 Speech completed');

      // Clear question after answer is spoken and restart listening (both auto and manual modes)
      console.log('🧹 Clearing question for next detection');
      setQuestion('');
      setDetectedQuestion(false);
      lastQuestionRef.current = ''; // Clear last question to allow new questions

      if (liveMode) { // Always auto mode
        // Auto mode: restart ambient recognition
        console.log('🔄 Auto mode - forcing ambient recognition restart');
        setTimeout(() => {
          if (liveModeRef.current && autoSubmitRef.current && ambientRecognitionRef.current) {
            try {
              // Stop any existing recognition first
              ambientRecognitionRef.current.stop();

              // Start fresh recognition after a short delay
              setTimeout(() => {
                if (liveModeRef.current && autoSubmitRef.current && ambientRecognitionRef.current) {
                  ambientRecognitionRef.current.start();
                  setAmbientListening(true);
                  console.log('✅ Ambient recognition force-restarted after speech completion');
                }
              }, 300);
            } catch (e) {
              console.log('Could not force restart ambient recognition:', e);
              // If restart fails, try to reinitialize completely
              setTimeout(() => {
                if (liveModeRef.current && autoSubmitRef.current) {
                  console.log('🔄 Reinitializing ambient recognition after restart failure');
                  initializeAmbientRecognition();
                  startAmbientRecognition();
                }
              }, 1000);
            }
          }
        }, 500);

        // Additional feedback for continuous mode
        setTimeout(() => {
          if (audioEnabledRef.current && liveModeRef.current) {
            const readyUtterance = new SpeechSynthesisUtterance("Ready for next question");
            readyUtterance.rate = 1.2;
            readyUtterance.volume = 0.4;
            window.speechSynthesis.speak(readyUtterance);
          }
        }, 1500);
      } else {
        // Manual mode: start voice recognition for next question
        console.log('🔄 Manual mode - starting voice recognition for next question');
        setTimeout(() => {
          if (!liveModeRef.current && recognitionRef.current) {
            try {
              setInputMode('voice');
              recognitionRef.current.start();
              console.log('✅ Voice recognition started for next question in manual mode');
            } catch (e) {
              console.log('Could not start voice recognition in manual mode:', e);
              setInputMode('none');
              setIsListening(false);
            }
          }
        }, 500);
      }
    };

    utterance.onerror = (error) => {
      speechSynthRef.current = null;
      console.log('Speech error:', error);

      // Handle speech error gracefully - continue with next question logic
      if (error.error === 'interrupted') {
        console.log('🔊 Speech was interrupted (normal in live mode)');
      }

      // Ensure we continue with the flow even on speech error
      setTimeout(() => {
        console.log('🧹 Clearing question after speech error');
        setQuestion('');
        setDetectedQuestion(false);
        lastQuestionRef.current = ''; // Clear last question to allow new questions

        // Restart recognition based on mode
        if (liveMode) {
          console.log('🔄 Speech error - restarting ambient recognition');
          if (liveModeRef.current && ambientRecognitionRef.current) {
            try {
              ambientRecognitionRef.current.start();
              setAmbientListening(true);
            } catch (e) {
              console.log('Could not restart ambient after speech error:', e);
            }
          }
        }
      }, 500);
    };

    synth.speak(utterance);
  };

  // Stop speech function immediately and prevent restart
  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    speechSynthRef.current = null;
  };

  // Prevent unnecessary speech announcements if audio is disabled
  const speakIfEnabled = (text: string) => {
    if (audioEnabledRef.current) {
      speak(text); // Use the main speak function for proper handling
    }
  };

  // Send question to backend
  const askAI = async (customQuestion?: string) => {
    const currentQuestion = customQuestion || question;
    console.log('🚀 askAI called with question:', currentQuestion);

    if (!currentQuestion.trim()) {
      console.log('⚠️ Empty question, returning');
      return;
    }

    // Stop any ongoing speech before starting new AI request
    if (window.speechSynthesis.speaking) {
      stopSpeech(); // Ensure no ongoing speech when asking new question
    }

    console.log('✅ Starting AI request...');
    setLoading(true);
    setAnswer("");
    setDetectedQuestion(false); // Reset detected question flag

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Use WebSocket for real-time communication
        wsRef.current.send(JSON.stringify({
          type: 'question',
          question: currentQuestion
        }));
      } else {
        // Fallback to HTTP request
        console.log('🌐 Making HTTP request to backend...');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ai-backend-aeve.onrender.com';
        const res = await fetch(`${apiUrl}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: currentQuestion }),
        });
        const data = await res.json();
        console.log('✅ Received response from backend:', data);

        // Add question and answer to history
        addQuestion(currentQuestion, data.answer);

        console.log('📝 Starting typewriter effect...');
        typeWriter(data.answer, () => {
          if (audioEnabledRef.current) {
            console.log('🔊 Starting speech synthesis if audio is enabled...');
            speakIfEnabled(data.answer);
          } else {
            console.log('🔇 Audio disabled - skipping speech and handling next question setup');
            // If audio is disabled, clear question immediately after typing
            console.log('🧹 Audio disabled - clearing question immediately');
            setQuestion('');
            setDetectedQuestion(false);
            lastQuestionRef.current = ''; // Clear last question to allow new questions

            // Handle next question setup based on mode
            if (liveMode) {
              // Live mode with audio disabled - restart ambient recognition
              console.log('🔄 Live mode audio disabled - forcing ambient recognition restart');
              setTimeout(() => {
                if (liveModeRef.current && ambientRecognitionRef.current) {
                  try {
                    // Stop and restart for clean state
                    ambientRecognitionRef.current.stop();
                    setTimeout(() => {
                      if (liveModeRef.current && ambientRecognitionRef.current) {
                        ambientRecognitionRef.current.start();
                        setAmbientListening(true);
                        console.log('✅ Ambient recognition force-restarted (audio disabled mode)');
                      }
                    }, 300);
                  } catch (e) {
                    console.log('Could not force restart ambient recognition (audio disabled):', e);
                  }
                }
              }, 300);
            } else {
              // Manual mode with audio disabled - restart voice recognition
              console.log('🔄 Manual mode audio disabled - starting voice recognition for next question');
              setTimeout(() => {
                if (!liveModeRef.current && recognitionRef.current) {
                  try {
                    setInputMode('voice');
                    recognitionRef.current.start();
                    console.log('✅ Voice recognition started for next question (audio disabled mode)');
                  } catch (e) {
                    console.log('Could not start voice recognition (audio disabled):', e);
                    setInputMode('none');
                  }
                }
              }, 500);
            }

            // Visual feedback for ready state
            setTimeout(() => {
              console.log('✅ Ready for next question - audio disabled mode');
            }, 800);
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

  // Start listening
  const startListening = () => {

    if (recognitionRef.current) {
      try {

        // Update recognition settings based on mode
        recognitionRef.current.continuous = true; // Always true for better detection
        recognitionRef.current.interimResults = true;

        recognitionRef.current.start();
        setIsListening(true);
        setInputMode('voice');
      } catch (error) {
        console.error('❌ Error starting speech recognition:', error);
        console.error('Speech recognition error:', error.message);

        // If already running, stop and restart
        try {
          console.log('🔄 Attempting to stop and restart...');
          recognitionRef.current.stop();
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.start();
              setIsListening(true);
              setInputMode('voice');
            }
          }, 100);
        } catch (e) {
          console.error('Could not restart recognition:', e);
          console.error('Could not restart recognition');
        }
      }
    } else {
      console.error('❌ Speech recognition not initialized');
      console.error('Speech recognition not initialized');
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        setInputMode('none');
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        setIsListening(false);
        setInputMode('none');
      }
    }
  };

  // Enhanced microphone access for better same-device detection
  const requestEnhancedMicrophoneAccess = async () => {
    try {
      // Request with enhanced settings for better ambient detection
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,    // Disable to hear laptop speakers
          noiseSuppression: false,    // Disable to catch all ambient sounds
          autoGainControl: false,     // Disable to maintain consistent volume
          sampleRate: 48000,          // Higher sample rate for better quality
          channelCount: 2,            // Stereo for better sound detection
          latency: 0,                 // Low latency for real-time detection
          volume: 1.0                 // Maximum sensitivity
        }
      });

      // Clean up immediately - we just need permission
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Enhanced microphone access granted');
      return true;
    } catch (error) {
      console.log('⚠️ Enhanced microphone access failed:', error);
      // Fallback to basic microphone access
      try {
        const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        basicStream.getTracks().forEach(track => track.stop());
        return true;
      } catch (basicError) {
        console.error('❌ All microphone access failed:', basicError);
        return false;
      }
    }
  };

  // Start ambient recognition for live mode
  const startAmbientRecognition = async () => {
    console.log('🎧 Starting ambient recognition...');
    console.log('🔍 Current mode states:', {
      liveMode: liveModeRef.current,
      autoSubmit: autoSubmitRef.current,
      audioEnabled: audioEnabledRef.current
    });

    // First ensure we have proper microphone access
    const microphoneAccess = await requestEnhancedMicrophoneAccess();

    if (!microphoneAccess) {
      console.log('⚠️ Microphone access required for Live Mode');
      return;
    }

    // Always reinitialize to ensure fresh state
    initializeAmbientRecognition();

    if (ambientRecognitionRef.current) {
      try {
        console.log('🚀 Attempting to start ambient recognition...');
        ambientRecognitionRef.current.start();
        setAmbientListening(true);
        console.log('✅ Ambient recognition started successfully');
      } catch (e) {
        console.log('❌ Could not start ambient recognition:', e);
        // Retry after a short delay with complete reinitialization
        setTimeout(() => {
          console.log('🔄 Retrying ambient recognition with reinitialization...');
          try {
            // Clean up existing reference
            if (ambientRecognitionRef.current) {
              ambientRecognitionRef.current = null;
            }
            // Reinitialize and try again
            initializeAmbientRecognition();
            if (ambientRecognitionRef.current) {
              ambientRecognitionRef.current.start();
              setAmbientListening(true);
              console.log('✅ Ambient recognition retry successful');
            }
          } catch (retryError) {
            console.log('❌ Retry also failed:', retryError);
          }
        }, 1000);
      }
    } else {
      console.log('❌ Ambient recognition not initialized');
    }
  };

  // Stop ambient recognition
  const stopAmbientRecognition = () => {
    console.log('🛑 Stopping ambient recognition...');
    setAmbientListening(false); // Set flag first to prevent restarts

    if (ambientRecognitionRef.current) {
      try {
        ambientRecognitionRef.current.onresult = null;
        ambientRecognitionRef.current.onerror = null;
        ambientRecognitionRef.current.onend = null;
        ambientRecognitionRef.current.stop();
        console.log('✅ Ambient recognition stopped and cleaned up');
      } catch (e) {
        console.log('⚠️ Error stopping ambient recognition:', e);
      }
      ambientRecognitionRef.current = null;
    }
  };

  // Refs are updated in the hooks above

  // Toggle live mode
  const toggleLiveMode = () => {
    const newLiveMode = !liveMode;
    setLiveMode(newLiveMode);

    if (newLiveMode) {
      // Starting live mode
      console.log('🔴 Starting Live Mode - Continuous Listening');

      // Stop any regular recognition first to prevent conflicts
      if (isListening || inputMode === 'voice') {
        stopListening();
      }

      setQuestion(''); // Clear previous question
      setAnswer(''); // Clear previous answer
      setDetectedQuestion(false); // Reset detection flag

      // Audio feedback for live mode start
      speakIfEnabled("Live mode activated. Continuous listening ready for interview questions.");

      // Start ambient listening for interviewer questions (always auto mode)
      console.log('🤖 Auto mode - will start ambient recognition');
      setTimeout(() => {
        console.log('🎧 Initializing continuous ambient recognition...');
        console.log('🔍 Current states:', {
          liveMode: liveModeRef.current,
          autoSubmit: autoSubmitRef.current,
          audioEnabled: audioEnabledRef.current
        });
        startAmbientRecognition();
      }, audioEnabledRef.current ? 2500 : 200);

    } else {
      // Stopping live mode
      console.log('⚪ Stopping Live Mode - Ending Continuous Listening');
      stopListening();
      stopSpeech();
      stopAmbientRecognition();
      setDetectedQuestion(false); // Reset flag
      setQuestion(''); // Clear any current question
      setAnswer(''); // Clear any current answer

      // Audio feedback for live mode stop
      if (audioEnabledRef.current) {
        const utterance = new SpeechSynthesisUtterance("Live mode deactivated. Continuous listening stopped.");
        utterance.rate = 1;
        utterance.volume = 0.6;
        window.speechSynthesis.speak(utterance);
      }
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
              onClick={toggleLiveMode}
              className={`live-btn ${liveMode ? 'active' : ''}`}
              title={liveMode ? 'End Live Mode' : 'Start Live Mode'}
            >
              <div className={`live-dot ${liveMode ? 'active' : ''}`}></div>
              {liveMode ? 'End Live' : 'Go Live'}
            </button>
            <button
              onClick={() => {
                //const wasEnabled = audioEnabled;
                if (audioEnabled) {
                  // Immediately stop any ongoing speech when disabling audio
                  stopSpeech();
                  setAudioEnabled(false);

                  // Clear question in live mode since speech won't complete
                  if (liveMode && speechSynthRef.current) {
                    setQuestion('');
                    setDetectedQuestion(false);

                    // Ensure ambient recognition continues for next question
                    setTimeout(() => {
                      if (liveMode && !ambientListening && ambientRecognitionRef.current) {
                        try {
                          ambientRecognitionRef.current.start();
                          setAmbientListening(true);
                        } catch (e) {
                          // Could not restart ambient recognition
                        }
                      }
                    }, 500);
                  }
                } else {
                  console.log('audio enabled in else')
                  setAudioEnabled(true);
                }
              }}
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

      {/* Status Bar */}
      <div className="status-bar">
        {liveMode && (
          <div className="status-item live">
            <div className="status-dot"></div>
            Live Mode Active
          </div>
        )}
        {isListening && (
          <div className="status-item listening">
            <div className="status-dot"></div>
            Listening...
          </div>
        )}
        {ambientListening && (
          <div className="status-item ambient">
            <div className="status-dot"></div>
            Smart Listening (Auto Mode)
          </div>
        )}
        {wsConnected && (
          <div className="status-item connected">
            <div className="status-dot"></div>
            WebSocket Connected
          </div>
        )}

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
              ? (ambientListening
                ? "🎧 Continuously listening for interview questions... After each answer, I'll automatically clear and listen for the next question!"
                : "Smart Interview Mode: Enhanced detection for same-device interviews! I can hear questions from laptop speakers/mic and provide instant answers. Continuous mode ready!")
              : "Ask any interview question and get structured, professional answers instantly."
            }
          </p>
          {liveMode && question.trim() && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '0.5rem',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <p style={{ margin: '0', color: '#10b981', fontWeight: '600' }}>🎯 Detected Question:</p>
              <p style={{ margin: '0.5rem 0 0 0', color: 'white', fontSize: '1.1rem' }}>
                "{question}"
              </p>
            </div>
          )}
        </div>

        {/* Input Controls - Always Visible */}
        <div className="input-controls-container">
          <div className={`input-controls-box ${inputMode !== 'none' ? 'expanded' : ''}`}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // Handle Send action - same as type button logic
                if (inputMode === 'voice' && question.trim() && !isListening) {
                  askAI();
                  return;
                }

                if (inputMode === 'voice' || isListening) {
                  stopListening();
                } else {
                  // In live mode auto mode, suggest using type instead of voice
                  if (liveMode && !detectedQuestion) {
                    console.log('🟠 Auto mode - ambient listening active, switching to type mode');
                    setInputMode('type');
                    return;
                  }

                  if (!recognitionRef.current) {
                    console.error('❌ Recognition not available');
                    console.log('⚠️ Browser not supported for speech recognition');
                    return;
                  }

                  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    // Simplified approach - just get permission and start
                    navigator.mediaDevices.getUserMedia({ audio: true })
                      .then((stream) => {
                        // Clean up stream immediately
                        stream.getTracks().forEach(track => track.stop());

                        // Start immediately
                        startListening();

                      })
                      .catch((err) => {
                        console.error('❌ Microphone permission denied:', err);
                        console.error('Microphone access denied');
                        startListening();
                      });
                  } else {
                    startListening();
                  }
                }
              }}
              disabled={loading}
              className={`pill-btn voice-btn ${inputMode === 'voice' ? 'active' : ''} ${liveMode ? 'live-mode' : ''}`}
              title={inputMode === 'voice' && question.trim() && !isListening ? 'Click to send your question' :
                liveMode ? 'Auto mode active - Click to switch to typing' :
                  'Click to start voice recording'}>
              <span className="btn-icon">🎤</span>
              <span className="btn-text">
                {/* Same logic as type button - if voice mode and has question, show Send */}
                {inputMode === 'voice' && question.trim() && !isListening ? 'Send' :
                  /* In auto live mode, suggest Type */
                  liveMode ? 'Type' : 'Voice'}
              </span>
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
              className={`pill-btn type-btn ${inputMode === 'type' ? 'active' : ''}`}>
              <span className="btn-icon">✏️</span>
              <span className="btn-text">{inputMode === 'type' && question.trim() ? 'Send' : 'Type'}</span>
            </button>
          </div>

        </div >

        {/* Input Section - Shows only when expanded */}
        < div className={`input-section ${inputMode !== 'none' ? 'expanded' : ''}`}>
          <div className="input-container">
            {/* Show textarea for both type and voice modes */}
            {(inputMode === 'type' || inputMode === 'voice') && (
              <>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading || isListening}
                  placeholder={
                    inputMode === 'voice'
                      ? (isListening
                        ? "Listening... Speak your question now"
                        : "Voice input active - Click Voice button to start speaking or type here"
                      )
                      : (liveMode
                        ? "Type your question (works in live mode too)..."
                        : "Type your interview question here..."
                      )
                  }
                  className={`question-input ${inputMode === 'voice' ? 'voice-mode' : ''}`}
                  rows={3}
                />

                {/* Clear Question Button for Manual Mode - Only show when not in live mode and has question */}
                {!liveMode && question.trim() && !loading && (
                  <div className="clear-question-container">
                    <button
                      onClick={() => {

                        // Clear question and answer
                        setQuestion('');
                        setAnswer('');
                        setDetectedQuestion(false);

                        // Stop any current listening
                        if (isListening && recognitionRef.current) {
                          try {
                            recognitionRef.current.stop();
                            setIsListening(false);
                          } catch (e) {
                            console.log('Error stopping recognition during clear:', e);
                          }
                        }

                        // Restart voice recognition for next question in manual mode
                        setTimeout(() => {
                          if (!liveMode && recognitionRef.current) {
                            try {
                              setInputMode('voice');
                              recognitionRef.current.start();
                              console.log('✅ Voice recognition restarted after manual clear');
                            } catch (e) {
                              console.log('Could not restart voice recognition after clear:', e);
                              setInputMode('none');
                            }
                          }
                        }, 300);

                        console.log('✅ Manual clear completed - voice recognition restarted for new question');
                      }}
                      className="clear-question-btn-large"
                      title="Clear question and answer to start fresh"
                    >
                      <span className="clear-icon">🧹</span>
                      <span>Clear Question</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Show listening indicator when listening */}
            {isListening && (
              <div className="listening-indicator-overlay">
                <div className="listening-text">🎤 Listening...</div>
                <div className="listening-instructions">
                  Speak clearly into your microphone now!
                </div>
                <div className="wave-container">
                  <div className="wave"></div>
                  <div className="wave"></div>
                  <div className="wave"></div>
                </div>
              </div>
            )}
          </div>
        </div >

        {/* Answer Section */}
        < div className="answer-section" >
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
                <p>
                  {liveMode
                    ? "Ready to assist! Start speaking your question..."
                    : "Ask your interview question to get started!"
                  }
                </p>
              </div>
            )}
          </div>
        </div >

        {/* Tips Section */}
        < div className="tips-section" >
          <h4>💡 Quick Tips</h4>
          <div className="tips-grid">
            <div className="tip-item">
              <div className="tip-dot"></div>
              <p>Live Mode continuously listens for questions - after each answer, automatically clears and waits for next question</p>
            </div>
            <div className="tip-item">
              <div className="tip-dot"></div>
              <p>Auto Mode: Instant answers + auto-clear | Manual Mode: Click Send + auto-clear after answer</p>
            </div>
            <div className="tip-item">
              <div className="tip-dot"></div>
              <p>Works on phone OR same laptop (different tab) - Enhanced microphone detection</p>
            </div>
            <div className="tip-item">
              <div className="tip-dot"></div>
              <p>Press Enter to submit, Shift+Enter for new line</p>
            </div>
          </div>
        </div >
      </main >

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

        /* Mobile Menu Button - Hidden by default on desktop */
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

        .mobile-menu-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        /* MOBILE RESPONSIVE - FORCE CLEAN NAVBAR */
        @media screen and (max-width: 768px) {
          /* Nuclear option - completely remove desktop controls */
          .header-controls.desktop-controls,
          .desktop-controls,
          .live-btn,
          .auto-submit-btn,
          .audio-btn,
          .mode-toggle-container {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            position: absolute !important;
            left: -9999px !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            pointer-events: none !important;
          }
          
          /* FORCE show mobile menu button */
          .mobile-menu-btn {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 102 !important;
            background: rgba(255, 255, 255, 0.2) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            border-radius: 8px !important;
            width: 40px !important;
            height: 40px !important;
          }

          /* Clean mobile header layout */
          .header {
            padding: 0.75rem 0 !important;
            background: rgba(255, 255, 255, 0.15) !important;
          }

          .header-content {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
            padding: 0 1rem !important;
            gap: 1rem !important;
          }

          .home-btn {
            flex-shrink: 0 !important;
            order: 1 !important;
            padding: 0.5rem 1rem !important;
            font-size: 0.85rem !important;
            background: rgba(255, 255, 255, 0.2) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            border-radius: 8px !important;
          }

          .brand {
            flex: 1 !important;
            order: 2 !important;
            text-align: center !important;
            min-width: 0 !important;
          }

          .brand h1 {
            font-size: 1rem !important;
            margin: 0 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 150px !important;
            margin: 0 auto !important;
          }

          .mobile-menu-btn {
            flex-shrink: 0 !important;
            order: 3 !important;
          }

          /* Mobile dropdown - FORCE VISIBILITY */
          .mobile-dropdown {
            position: absolute !important;
            top: 100% !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            background: rgba(0, 0, 0, 0.9) !important;
            backdrop-filter: blur(20px) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
            transform: translateY(-100%) !important;
            opacity: 0 !important;
            visibility: hidden !important;
            transition: all 0.3s ease !important;
            z-index: 99 !important;
          }

          .mobile-dropdown.open {
            transform: translateY(0) !important;
            opacity: 1 !important;
            visibility: visible !important;
          }

          .mobile-menu-content {
            padding: 1rem !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0.75rem !important;
          }

          .mobile-menu-item {
            display: flex !important;
            align-items: center !important;
            gap: 0.75rem !important;
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 12px !important;
            padding: 1rem !important;
            margin-bottom: 0.5rem !important;
            color: white !important;
            font-size: 1rem !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            transition: all 0.3s ease !important;
            min-height: 48px !important;
            justify-content: flex-start !important;
          }

          .mobile-menu-item:hover {
            background: rgba(255, 255, 255, 0.2) !important;
            transform: translateY(-1px) !important;
          }

          .mobile-menu-item.active {
            background: rgba(34, 197, 94, 0.2) !important;
            border-color: rgba(34, 197, 94, 0.3) !important;
            color: #22c55e !important;
          }

          .mobile-menu-item .live-dot {
            width: 8px !important;
            height: 8px !important;
            background: #ef4444 !important;
            border-radius: 50% !important;
            animation: pulse 1s infinite !important;
          }

          .mobile-menu-item .live-dot:not(.active) {
            background: rgba(255, 255, 255, 0.5) !important;
            animation: none !important;
          }
        }

        .mobile-menu-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Hamburger Icon */
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

        .hamburger.open span:nth-child(1) {
          transform: rotate(45deg);
          top: 7px;
        }

        .hamburger.open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.open span:nth-child(3) {
          transform: rotate(-45deg);
          top: 7px;
        }

        /* Mobile Dropdown - Hidden on desktop */
        .mobile-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          transform: translateY(-100%);
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          z-index: 99;
          display: none; /* Hidden on desktop by default */
        }

        /* Show mobile dropdown only on mobile devices */
        @media (max-width: 768px) {
          .mobile-dropdown {
            display: block;
          }
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
          max-width: 1200px;
          margin: 0 auto;
        }

        .mobile-menu-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
          font-weight: 500;
          min-height: 48px;
          justify-content: flex-start;
          text-align: left;
        }

        .mobile-menu-item:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .mobile-menu-item.active {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .mobile-menu-item .live-dot {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }

        .mobile-menu-item .live-dot:not(.active) {
          background: rgba(255, 255, 255, 0.5);
          animation: none;
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

        /* Desktop Controls */
        .desktop-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .live-btn, .auto-submit-btn, .audio-btn {
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

        .live-btn:hover, .auto-submit-btn:hover, .audio-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .live-btn.active {
          background: rgba(34, 197, 94, 0.3);
          border-color: rgba(34, 197, 94, 0.5);
          color: #22c55e;
        }

        .auto-submit-btn.active {
          background: rgba(59, 130, 246, 0.3);
          border-color: rgba(59, 130, 246, 0.5);
          color: #3b82f6;
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

        .mode-toggle-container {
          display: flex;
          gap: 0.5rem;
        }
        
        .main-content {
          padding: 2rem;
          padding-top: 120px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .input-section {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 0;
          margin: 0 auto 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          max-width: 50px;
          width: 50px;
          height: 0;
          overflow: hidden;
          opacity: 0;
          transition: all 0.4s ease;
        }
        
        .input-section.expanded {
          padding: 0.75rem;
          max-width: 450px;
          width: 85%;
          height: auto;
          opacity: 1;
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
        
        .question-input.voice-mode {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }
        
        .question-input.voice-mode:focus {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.15);
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
        }
        
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        .mode-toggle-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .mode-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 2px solid;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          font-size: 0.85rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          position: relative;
          overflow: hidden;
        }

        .mode-toggle-btn.auto {
          background: linear-gradient(135deg, #10b981, #059669);
          border-color: #10b981;
          color: white;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
        }

        .mode-toggle-btn.auto:hover {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(16, 185, 129, 0.6);
        }

        .mode-toggle-btn.manual {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-color: #f59e0b;
          color: white;
          box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
        }

        .mode-toggle-btn.manual:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(245, 158, 11, 0.6);
        }

        .mode-icon {
          font-size: 1.1rem;
          display: flex;
          align-items: center;
        }

        .mode-text {
          font-weight: 600;
          letter-spacing: 0.025em;
        }

        .mode-toggle-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .mode-toggle-btn:hover::before {
          left: 100%;
        }

        .live-send {
          animation: pulse-glow 2s infinite;
        }

        .voice-btn.live-mode {
          background: #10b981 !important;
          border-color: #10b981 !important;
        }

        .voice-btn.live-mode:hover {
          background: #059669 !important;
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

        .status-item.ambient {
          background: #fef3c7;
          color: #d97706;
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
          background: currentColor;
          border-radius: 50%;
          animation: pulse 2s infinite;
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

        .input-container {
          position: relative;
          margin-bottom: 1rem;
        }

        /* Hide input areas by default */
        .input-container .question-input,
        .input-container .voice-question-display,
        .input-container .listening-indicator {
          display: none;
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.3s ease;
        }

        /* Show input areas when expanded */
        .input-section.expanded .question-input,
        .input-section.expanded .voice-question-display,
        .input-section.expanded .listening-indicator {
          display: block;
          opacity: 1;
          transform: translateY(0);
        }

        .input-controls-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1rem 0;
          margin-bottom: 1rem;
        }

        .input-controls-box {
          display: flex;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 25px;
          padding: 0.4rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          align-items: center;
          justify-content: center;
          width: fit-content;
          height: fit-content;
          transition: all 0.3s ease;
          position: relative;
        }

        .input-controls-box.expanded {
          min-width: 320px;
          padding: 0.6rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          background: rgba(255, 255, 255, 0.12);
        }

        .close-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.9);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .close-btn:hover {
          background: rgba(239, 68, 68, 1);
          transform: scale(1.1);
        }

        .pill-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 20px;
          background: #3b82f6;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          min-width: 90px;
          justify-content: center;
        }

        .pill-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
        }

        .pill-btn.active {
          background: #1d4ed8;
          color: white;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.5);
        }

        .pill-btn.send-btn {
          background: #10b981;
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .pill-btn.send-btn:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
        }

        .pill-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-icon {
          font-size: 1.1rem;
        }

        .btn-text {
          font-size: 0.95rem;
          font-weight: 500;
        }

        .voice-question-display {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1rem;
          backdrop-filter: blur(10px);
        }

        .question-preview {
          width: 100%;
        }

        .question-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .question-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .clear-question-btn {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.8rem;
        }

        .clear-question-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          transform: scale(1.1);
        }

        .question-text {
          color: white;
          line-height: 1.5;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.5rem;
          border-left: 3px solid #3b82f6;
          word-wrap: break-word;
        }

        .listening-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
        }
        
        .listening-indicator-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(16, 185, 129, 0.1);
          backdrop-filter: blur(2px);
          border-radius: 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          z-index: 10;
        }

        .listening-text {
          color: #3b82f6;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .listening-instructions {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.9rem;
          font-weight: 500;
          text-align: center;
          margin-top: -0.5rem;
        }

        .wave-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.25rem;
        }

        .wave {
          width: 0.5rem;
          height: 2rem;
          background: #3b82f6;
          border-radius: 0.25rem;
          animation: wave 1.5s infinite;
        }

        .wave:nth-child(2) {
          animation-delay: 0.2s;
        }

        .wave:nth-child(3) {
          animation-delay: 0.4s;
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

        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); 
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.8); 
            transform: scale(1.02);
          }
        }

/* Mobile First Responsive Design */
        @media (max-width: 768px) {
          .header {
            padding: 0.75rem 0;
            min-height: 64px;
          }

          .header-content {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            padding: 0 1rem;
            gap: 1rem;
            max-width: 100%;
          }

          /* FORCE show mobile menu button, FORCE hide desktop controls */
          .mobile-menu-btn {
            display: flex !important;
            order: 3;
            visibility: visible !important;
            opacity: 1 !important;
          }

          .desktop-controls {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }

          .home-btn {
            order: 1;
            padding: 0.6rem 1rem;
            font-size: 0.85rem;
            min-height: 44px;
            flex-shrink: 0;
            border-radius: 10px;
          }

          .brand {
            order: 2;
            flex: 1;
            text-align: center;
            min-width: 0;
          }

          .brand h1 {
            font-size: 1.1rem;
            max-width: 160px;
            margin: 0 auto;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Mobile dropdown positioning */
          .mobile-dropdown {
            top: 100%;
            left: 0;
            right: 0;
            width: 100%;
          }

          .home-btn {
            padding: 0.5rem 0.9rem;
            font-size: 0.85rem;
            min-height: 44px;
            border-radius: 12px;
            flex-shrink: 0;
          }

          .brand {
            flex: 1;
            text-align: center;
            min-width: 0;
          }

          .brand h1 {
            font-size: 1.2rem;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .header-controls {
            gap: 0.6rem;
            flex-shrink: 0;
            display: flex;
            align-items: center;
          }

          .live-btn, .auto-submit-btn {
            padding: 0.5rem 0.9rem;
            font-size: 0.85rem;
            min-height: 44px;
            min-width: 85px;
            border-radius: 12px;
          }

          .audio-btn {
            min-width: 44px;
            min-height: 44px;
            padding: 0.5rem;
            border-radius: 12px;
            font-size: 1.1rem;
          }

          .mode-toggle-container {
            display: flex;
            gap: 0.4rem;
          }

          .welcome-title {
            font-size: 1.8rem;
          }

          .welcome-subtitle {
            font-size: 1rem;
          }

          .main-content {
            padding: 1rem;
            padding-top: 100px;
          }

          .input-controls-container {
            flex-direction: column;
            align-items: center;
          }

          .input-controls-box {
            width: 100%;
            max-width: 280px;
            gap: 0.4rem;
            padding: 0.3rem;
          }

          .pill-btn {
            flex: 1;
            justify-content: center;
            min-width: auto;
            padding: 0.5rem 0.8rem;
            font-size: 0.9rem;
          }

          .tips-grid {
            grid-template-columns: 1fr;
          }

          .status-bar {
            padding: 0.5rem 1rem;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 0.5rem 0;
            min-height: 56px;
          }

          .header-content {
            padding: 0 0.75rem;
            gap: 0.5rem;
            flex-wrap: nowrap;
          }

          .home-btn {
            padding: 0.4rem 0.7rem;
            font-size: 0.8rem;
            min-height: 40px;
            border-radius: 10px;
            flex-shrink: 0;
          }

          .brand {
            flex: 1;
            text-align: center;
            min-width: 0;
          }

          .brand h1 {
            font-size: 1.05rem;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 180px;
            margin: 0 auto;
          }

          .header-controls {
            gap: 0.4rem;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            flex-wrap: nowrap;
          }

          .live-btn, .auto-submit-btn {
            padding: 0.4rem 0.7rem;
            font-size: 0.8rem;
            min-height: 40px;
            min-width: 75px;
            border-radius: 10px;
            white-space: nowrap;
          }

          .audio-btn {
            min-width: 40px;
            min-height: 40px;
            padding: 0.4rem;
            border-radius: 10px;
            font-size: 1rem;
          }

          .mode-toggle-container {
            display: flex;
            gap: 0.3rem;
          }

          .live-dot {
            width: 6px;
            height: 6px;
          }

          .welcome-title {
            font-size: 1.5rem;
          }

          .welcome-subtitle {
            font-size: 0.9rem;
          }

          .input-controls-box {
            max-width: 260px;
            gap: 0.3rem;
            padding: 0.25rem;
          }

          .pill-btn {
            padding: 0.45rem 0.7rem;
            font-size: 0.85rem;
          }

          .status-bar {
            padding: 0.4rem 0.75rem;
          }

          .main-content {
            padding: 0.75rem;
            padding-top: 80px;
          }
        }

        /* Extra small screens - 360px and below */
        @media (max-width: 360px) {
          .header {
            padding: 0.4rem 0;
            min-height: 52px;
          }

          .header-content {
            padding: 0 0.5rem;
            gap: 0.3rem;
          }

          .home-btn {
            padding: 0.3rem 0.5rem;
            font-size: 0.75rem;
            min-height: 36px;
            border-radius: 8px;
          }

          .brand h1 {
            font-size: 0.95rem;
            max-width: 140px;
          }

          .header-controls {
            gap: 0.3rem;
          }

          .live-btn, .auto-submit-btn {
            padding: 0.3rem 0.5rem;
            font-size: 0.75rem;
            min-height: 36px;
            min-width: 65px;
            border-radius: 8px;
          }

          .audio-btn {
            min-width: 36px;
            min-height: 36px;
            padding: 0.3rem;
            border-radius: 8px;
            font-size: 0.9rem;
          }

          .main-content {
            padding: 0.5rem;
            padding-top: 70px;
          }
        }
      `}</style>
    </div >
  );
}
