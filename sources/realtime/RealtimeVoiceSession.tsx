import React, { useEffect, useRef } from 'react';
import { registerVoiceSession } from './RealtimeSession';
import { storage } from '@/sync/storage';
import { realtimeClientTools } from './realtimeClientTools';
import { LocalVoiceService } from './LocalVoiceService';
import type { VoiceSession, VoiceSessionConfig } from './types';

// Global voice session implementation using local voice service
class RealtimeVoiceSessionImpl implements VoiceSession {
    private isActive = false;
    private currentSessionId: string | null = null;
    
    async startSession(config: VoiceSessionConfig): Promise<void> {
        try {
            storage.getState().setRealtimeStatus('connecting');
            this.currentSessionId = config.sessionId;
            
            // Initialize local voice service
            await LocalVoiceService.initialize();
            
            // Start local voice session
            await LocalVoiceService.startSession({
                sessionId: config.sessionId,
                initialContext: config.initialContext || '',
                language: 'en-US',
                voiceRate: 0.5,
                voicePitch: 1.0
            });

            // Set up voice recognition callbacks
            LocalVoiceService.onTranscript((result) => {
                if (result.isFinal && result.transcript.trim()) {
                    console.log('📝 Voice transcript:', result.transcript);
                    // Process voice command locally
                    this.processVoiceInput(result.transcript, config.sessionId);
                }
            });

            // Set up status callbacks
            LocalVoiceService.onStatusChange((status) => {
                console.log('🎤 Voice status:', status.status);
                if (status.status === 'error') {
                    console.error('Voice error:', status.error);
                    storage.getState().setRealtimeStatus('error');
                } else if (status.status === 'connected') {
                    storage.getState().setRealtimeStatus('connected');
                }
            });

            this.isActive = true;
            storage.getState().setRealtimeStatus('connected');
            
            console.log('✅ Local voice session started for session:', config.sessionId);
            
        } catch (error) {
            console.error('Failed to start local voice session:', error);
            storage.getState().setRealtimeStatus('error');
        }
    }

    async endSession(): Promise<void> {
        if (!this.isActive) {
            return;
        }

        try {
            // Stop voice services
            await LocalVoiceService.stopListening();
            await LocalVoiceService.stopSpeaking();
            
            this.isActive = false;
            this.currentSessionId = null;
            storage.getState().setRealtimeStatus('disconnected');
            
            console.log('✅ Local voice session ended');
        } catch (error) {
            console.error('Failed to end local voice session:', error);
        }
    }

    sendTextMessage(message: string): void {
        if (!this.isActive || !this.currentSessionId) {
            console.warn('Local voice session not active');
            return;
        }

        try {
            // Process text message through local voice system
            this.processVoiceInput(message, this.currentSessionId);
        } catch (error) {
            console.error('Failed to send text message to local voice:', error);
        }
    }

    sendContextualUpdate(update: string): void {
        if (!this.isActive) {
            console.warn('Local voice session not active');
            return;
        }

        try {
            // For contextual updates, we can speak them out locally if needed
            console.log('📄 Contextual update:', update);
            // Optionally speak the update
            // LocalVoiceService.speak(update);
        } catch (error) {
            console.error('Failed to send contextual update:', error);
        }
    }

    /**
     * Process voice input locally and handle commands
     */
    private async processVoiceInput(transcript: string, sessionId: string): Promise<void> {
        try {
            console.log('🎯 Processing voice input:', transcript);
            
            // Check for voice commands
            if (this.isVoiceCommand(transcript)) {
                await this.handleVoiceCommand(transcript, sessionId);
                return;
            }

            // Send to AI agent through normal message flow
            // This is the only external call we allow - to the AI agent
            const syncState = storage.getState();
            const session = syncState.sessions.find(s => s.id === sessionId);
            
            if (session) {
                // Add voice message to session
                const message = {
                    id: `voice_${Date.now()}`,
                    role: 'user' as const,
                    content: transcript,
                    timestamp: Date.now(),
                    isVoiceMessage: true
                };

                // Update session with voice input
                syncState.addMessage(sessionId, message);
                
                // Let the AI agent respond (this goes through existing AI API)
                console.log('📤 Sending voice input to AI agent:', transcript);
            }
            
        } catch (error) {
            console.error('Failed to process voice input:', error);
        }
    }

    /**
     * Check if input is a voice command vs regular message
     */
    private isVoiceCommand(transcript: string): boolean {
        const lowerTranscript = transcript.toLowerCase().trim();
        const voiceCommands = [
            'start listening',
            'stop listening',
            'mute',
            'unmute',
            'repeat that',
            'clear screen',
            'end session'
        ];
        
        return voiceCommands.some(command => lowerTranscript.includes(command));
    }

    /**
     * Handle local voice commands without external services
     */
    private async handleVoiceCommand(transcript: string, sessionId: string): Promise<void> {
        const lowerTranscript = transcript.toLowerCase().trim();
        
        try {
            if (lowerTranscript.includes('start listening')) {
                await LocalVoiceService.startListening();
                await LocalVoiceService.speak('Voice recognition started');
                
            } else if (lowerTranscript.includes('stop listening')) {
                await LocalVoiceService.stopListening();
                await LocalVoiceService.speak('Voice recognition stopped');
                
            } else if (lowerTranscript.includes('mute')) {
                await LocalVoiceService.stopSpeaking();
                console.log('🔇 Voice muted');
                
            } else if (lowerTranscript.includes('end session')) {
                await LocalVoiceService.speak('Ending voice session');
                setTimeout(() => this.endSession(), 1000);
                
            } else if (lowerTranscript.includes('repeat that')) {
                // Get last message from session and speak it
                const syncState = storage.getState();
                const session = syncState.sessions.find(s => s.id === sessionId);
                if (session && session.messages.length > 0) {
                    const lastMessage = session.messages[session.messages.length - 1];
                    if (lastMessage.role === 'assistant') {
                        await LocalVoiceService.speak(lastMessage.content);
                    }
                }
            }
            
        } catch (error) {
            console.error('Failed to handle voice command:', error);
            await LocalVoiceService.speak('Sorry, I could not process that command');
        }
    }

    /**
     * Start voice listening
     */
    async startListening(): Promise<void> {
        if (this.isActive) {
            await LocalVoiceService.startListening();
        }
    }

    /**
     * Stop voice listening
     */
    async stopListening(): Promise<void> {
        if (this.isActive) {
            await LocalVoiceService.stopListening();
        }
    }

    /**
     * Speak text using local TTS
     */
    async speak(text: string): Promise<void> {
        if (this.isActive) {
            await LocalVoiceService.speak(text);
        }
    }
}

// Create singleton instance
export const realtimeVoiceSession = new RealtimeVoiceSessionImpl();

// React component to initialize voice session
export const VoiceSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            // Register the local voice session
            registerVoiceSession(realtimeVoiceSession);
            initialized.current = true;
            
            console.log('✅ Local Voice Session Provider initialized');
        }

        return () => {
            // Cleanup on unmount
            if (initialized.current) {
                realtimeVoiceSession.endSession();
            }
        };
    }, []);

    return <>{children}</>;
};

// Export for backwards compatibility
export default VoiceSessionProvider;