import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// Check for browser support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VoiceInput = ({ onTranscript, disabled = false }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef(null);

    useEffect(() => {
        // Check if SpeechRecognition is supported
        if (SpeechRecognition) {
            setIsSupported(true);
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptPart = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcriptPart;
                    } else {
                        interimTranscript += transcriptPart;
                    }
                }

                setTranscript(finalTranscript || interimTranscript);

                // Send final transcript to parent
                if (finalTranscript && onTranscript) {
                    onTranscript(finalTranscript);
                    setTranscript('');
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onTranscript]);

    const toggleListening = () => {
        if (!isSupported || disabled) return;

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    if (!isSupported) {
        return (
            <Button
                variant="ghost"
                size="icon"
                disabled
                title="Voice input not supported in this browser"
                className="text-muted-foreground"
            >
                <MicOff size={18} />
            </Button>
        );
    }

    return (
        <div className="relative">
            <Button
                type="button"
                variant={isListening ? 'default' : 'ghost'}
                size="icon"
                onClick={toggleListening}
                disabled={disabled}
                className={`relative ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
            >
                <AnimatePresence mode="wait">
                    {isListening ? (
                        <motion.div
                            key="listening"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                        >
                            <Mic size={18} className="animate-pulse" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                        >
                            <Mic size={18} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Pulsing ring when listening */}
                {isListening && (
                    <motion.div
                        className="absolute inset-0 rounded-md border-2 border-red-400"
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                )}
            </Button>

            {/* Live transcript preview */}
            <AnimatePresence>
                {isListening && transcript && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full mb-2 right-0 bg-background border border-border rounded-lg p-2 shadow-lg text-xs max-w-48 truncate"
                    >
                        {transcript}...
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VoiceInput;
