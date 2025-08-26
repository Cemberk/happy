import React, { useEffect, useRef } from 'react';
// ElevenLabs removed for privacy - using local voice service
import { registerVoiceSession } from './RealtimeSession';
import { storage } from '@/sync/storage';
import { realtimeClientTools } from './realtimeClientTools';
import type { VoiceSession, VoiceSessionConfig } from './types';

// Local voice service instance for privacy-first operation
let conversationInstance: any = null;

// Global voice session implementation
class RealtimeVoiceSessionImpl implements VoiceSession {
    status: 'idle' | 'listening' | 'speaking' | 'processing' = 'idle';
    
    async initialize(config?: VoiceSessionConfig): Promise<void> {
        console.log('🔒 Privacy mode: Local voice session initialized');
        storage.getState().setRealtimeStatus('local');
    }

    async startListening(): Promise<void> {
        this.status = 'listening';
        console.log('🎤 Local voice: Starting listening (privacy mode)');
        
        // Use browser's native speech recognition API for privacy
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                console.log('🎤 Local voice recognized:', transcript);
                storage.getState().addMessage({
                    role: 'user',
                    content: transcript,
                    timestamp: Date.now()
                });
            };
            
            recognition.start();
        } else {
            console.warn('Speech recognition not supported in this browser');
        }
    }

    async stopListening(): Promise<void> {
        this.status = 'idle';
        console.log('🔇 Local voice: Stopped listening');
    }

    async speak(text: string): Promise<void> {
        this.status = 'speaking';
        console.log('🔊 Local voice: Speaking (privacy mode):', text);
        
        // Use browser's native speech synthesis for privacy
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
        
        this.status = 'idle';
    }

    async disconnect(): Promise<void> {
        this.status = 'idle';
        storage.getState().setRealtimeStatus('disconnected');
        console.log('🔒 Local voice session disconnected');
    }

    async sendMessage(message: string): Promise<void> {
        console.log('📤 Local voice: Sending message:', message);
        storage.getState().addMessage({
            role: 'user', 
            content: message,
            timestamp: Date.now()
        });
    }

    async sendContextualUpdate(context: any): Promise<void> {
        // Web version doesn't have sendContextualUpdate
        console.warn('sendContextualUpdate not fully implemented for web');
    }
}

export const RealtimeVoiceSession: React.FC = () => {
    // Privacy-first local voice service - no external connections
    const hasRegistered = useRef(false);

    useEffect(() => {
        // Initialize local voice service
        storage.getState().setRealtimeStatus('local');
        console.log('🔒 Privacy mode: Using local voice processing');
        
        // Register the voice session once
        if (!hasRegistered.current) {
            try {
                const session = new RealtimeVoiceSessionImpl();
                registerVoiceSession(session);
                hasRegistered.current = true;
            } catch (error) {
                console.error('Failed to register voice session:', error);
            }
        }
        
        return () => {
            storage.getState().setRealtimeStatus('disconnected');
        };
    }, []);

    // This component doesn't render anything visible
    return null;
};

// Export the singleton instance
export const realtimeVoiceSession = new RealtimeVoiceSessionImpl();