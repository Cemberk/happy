/**
 * Local Voice Service - Replace ElevenLabs with on-device TTS/STT
 * Uses React Native Voice and Text-to-Speech libraries for complete privacy
 */
import { Platform } from 'react-native';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';

export interface LocalVoiceConfig {
    sessionId: string;
    initialContext?: string;
    language?: string;
    voiceRate?: number;
    voicePitch?: number;
}

export interface VoiceRecognitionResult {
    transcript: string;
    confidence: number;
    isFinal: boolean;
}

export interface VoiceStatusUpdate {
    status: 'idle' | 'listening' | 'speaking' | 'processing' | 'error';
    error?: string;
}

export type VoiceStatusCallback = (status: VoiceStatusUpdate) => void;
export type TranscriptCallback = (result: VoiceRecognitionResult) => void;

class LocalVoiceServiceImpl {
    private isInitialized = false;
    private isListening = false;
    private isSpeaking = false;
    private statusCallbacks: Set<VoiceStatusCallback> = new Set();
    private transcriptCallbacks: Set<TranscriptCallback> = new Set();
    private currentConfig: LocalVoiceConfig | null = null;

    /**
     * Initialize local voice services
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Initialize Speech Recognition
            if (Platform.OS !== 'web') {
                Voice.onSpeechStart = this.onSpeechStart.bind(this);
                Voice.onSpeechRecognized = this.onSpeechRecognized.bind(this);
                Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
                Voice.onSpeechError = this.onSpeechError.bind(this);
                Voice.onSpeechResults = this.onSpeechResults.bind(this);
                Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
            }

            // Initialize Text-to-Speech
            if (Platform.OS !== 'web') {
                Tts.addEventListener('tts-start', this.onTtsStart.bind(this));
                Tts.addEventListener('tts-finish', this.onTtsFinish.bind(this));
                Tts.addEventListener('tts-cancel', this.onTtsCancel.bind(this));
                Tts.addEventListener('tts-error', this.onTtsError.bind(this));

                // Set default TTS settings
                await Tts.setDefaultRate(0.5);
                await Tts.setDefaultPitch(1.0);
                await Tts.setDefaultLanguage('en-US');
            }

            this.isInitialized = true;
            this.updateStatus({ status: 'idle' });
            console.log('✅ Local Voice Service initialized');

        } catch (error) {
            console.error('❌ Failed to initialize Local Voice Service:', error);
            this.updateStatus({ 
                status: 'error', 
                error: `Initialization failed: ${error.message}` 
            });
            throw error;
        }
    }

    /**
     * Start voice session with configuration
     */
    async startSession(config: LocalVoiceConfig): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        this.currentConfig = config;
        
        // Configure TTS settings based on config
        if (Platform.OS !== 'web') {
            if (config.voiceRate) await Tts.setDefaultRate(config.voiceRate);
            if (config.voicePitch) await Tts.setDefaultPitch(config.voicePitch);
            if (config.language) await Tts.setDefaultLanguage(config.language);
        }

        this.updateStatus({ status: 'idle' });
        console.log('🎤 Voice session started:', config.sessionId);
    }

    /**
     * Start listening for speech input
     */
    async startListening(): Promise<void> {
        if (!this.isInitialized || this.isListening) return;

        try {
            this.updateStatus({ status: 'listening' });
            
            if (Platform.OS === 'web') {
                await this.startWebSpeechRecognition();
            } else {
                await Voice.start(this.currentConfig?.language || 'en-US');
            }
            
            this.isListening = true;
        } catch (error) {
            console.error('❌ Failed to start listening:', error);
            this.updateStatus({ 
                status: 'error', 
                error: `Speech recognition failed: ${error.message}` 
            });
        }
    }

    /**
     * Stop listening for speech input
     */
    async stopListening(): Promise<void> {
        if (!this.isListening) return;

        try {
            if (Platform.OS === 'web') {
                this.stopWebSpeechRecognition();
            } else {
                await Voice.stop();
            }
            
            this.isListening = false;
            this.updateStatus({ status: 'idle' });
        } catch (error) {
            console.error('❌ Failed to stop listening:', error);
        }
    }

    /**
     * Speak text using local TTS
     */
    async speak(text: string): Promise<void> {
        if (!this.isInitialized || this.isSpeaking) return;

        try {
            this.updateStatus({ status: 'speaking' });
            
            if (Platform.OS === 'web') {
                await this.speakWeb(text);
            } else {
                await Tts.speak(text);
            }
            
            this.isSpeaking = true;
        } catch (error) {
            console.error('❌ Failed to speak:', error);
            this.updateStatus({ 
                status: 'error', 
                error: `Text-to-speech failed: ${error.message}` 
            });
        }
    }

    /**
     * Stop current speech
     */
    async stopSpeaking(): Promise<void> {
        if (!this.isSpeaking) return;

        try {
            if (Platform.OS === 'web') {
                speechSynthesis.cancel();
            } else {
                await Tts.stop();
            }
            
            this.isSpeaking = false;
            this.updateStatus({ status: 'idle' });
        } catch (error) {
            console.error('❌ Failed to stop speaking:', error);
        }
    }

    /**
     * Web Speech API implementation for web platform
     */
    private webRecognition: any = null;

    private async startWebSpeechRecognition(): Promise<void> {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            throw new Error('Speech recognition not supported in this browser');
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        this.webRecognition = new SpeechRecognition();
        
        this.webRecognition.continuous = true;
        this.webRecognition.interimResults = true;
        this.webRecognition.lang = this.currentConfig?.language || 'en-US';

        this.webRecognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;
                
                this.transcriptCallbacks.forEach(callback => {
                    callback({
                        transcript,
                        confidence: result[0].confidence || 0.9,
                        isFinal: result.isFinal
                    });
                });
            }
        };

        this.webRecognition.onerror = (event: any) => {
            this.updateStatus({ 
                status: 'error', 
                error: `Speech recognition error: ${event.error}` 
            });
        };

        this.webRecognition.start();
    }

    private stopWebSpeechRecognition(): void {
        if (this.webRecognition) {
            this.webRecognition.stop();
            this.webRecognition = null;
        }
    }

    private async speakWeb(text: string): Promise<void> {
        if (!speechSynthesis) {
            throw new Error('Speech synthesis not supported in this browser');
        }

        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = this.currentConfig?.voiceRate || 0.5;
            utterance.pitch = this.currentConfig?.voicePitch || 1.0;
            utterance.lang = this.currentConfig?.language || 'en-US';
            
            utterance.onend = () => {
                this.isSpeaking = false;
                this.updateStatus({ status: 'idle' });
                resolve();
            };
            
            utterance.onerror = (event) => {
                this.isSpeaking = false;
                reject(new Error(`Speech synthesis error: ${event.error}`));
            };
            
            speechSynthesis.speak(utterance);
        });
    }

    // Event handlers for React Native Voice
    private onSpeechStart(): void {
        console.log('🎤 Speech recognition started');
    }

    private onSpeechRecognized(): void {
        console.log('🎤 Speech recognized');
    }

    private onSpeechEnd(): void {
        this.isListening = false;
        this.updateStatus({ status: 'idle' });
        console.log('🎤 Speech recognition ended');
    }

    private onSpeechError(error: any): void {
        this.isListening = false;
        this.updateStatus({ 
            status: 'error', 
            error: `Speech recognition error: ${error.error?.message || error.error}` 
        });
        console.error('❌ Speech recognition error:', error);
    }

    private onSpeechResults(event: any): void {
        const results = event.value;
        if (results && results.length > 0) {
            this.transcriptCallbacks.forEach(callback => {
                callback({
                    transcript: results[0],
                    confidence: 0.9, // React Native Voice doesn't provide confidence
                    isFinal: true
                });
            });
        }
    }

    private onSpeechPartialResults(event: any): void {
        const results = event.value;
        if (results && results.length > 0) {
            this.transcriptCallbacks.forEach(callback => {
                callback({
                    transcript: results[0],
                    confidence: 0.7,
                    isFinal: false
                });
            });
        }
    }

    // Event handlers for React Native TTS
    private onTtsStart(): void {
        console.log('🔊 Text-to-speech started');
    }

    private onTtsFinish(): void {
        this.isSpeaking = false;
        this.updateStatus({ status: 'idle' });
        console.log('🔊 Text-to-speech finished');
    }

    private onTtsCancel(): void {
        this.isSpeaking = false;
        this.updateStatus({ status: 'idle' });
        console.log('🔊 Text-to-speech cancelled');
    }

    private onTtsError(error: any): void {
        this.isSpeaking = false;
        this.updateStatus({ 
            status: 'error', 
            error: `Text-to-speech error: ${error.message}` 
        });
        console.error('❌ Text-to-speech error:', error);
    }

    // Status and callback management
    private updateStatus(status: VoiceStatusUpdate): void {
        this.statusCallbacks.forEach(callback => callback(status));
    }

    onStatusChange(callback: VoiceStatusCallback): () => void {
        this.statusCallbacks.add(callback);
        return () => this.statusCallbacks.delete(callback);
    }

    onTranscript(callback: TranscriptCallback): () => void {
        this.transcriptCallbacks.add(callback);
        return () => this.transcriptCallbacks.delete(callback);
    }

    /**
     * Cleanup resources
     */
    async destroy(): Promise<void> {
        try {
            if (this.isListening) {
                await this.stopListening();
            }
            
            if (this.isSpeaking) {
                await this.stopSpeaking();
            }

            if (Platform.OS !== 'web') {
                await Voice.destroy();
                Tts.removeAllListeners();
            }

            this.statusCallbacks.clear();
            this.transcriptCallbacks.clear();
            this.isInitialized = false;
            
            console.log('🧹 Local Voice Service destroyed');
        } catch (error) {
            console.error('❌ Failed to destroy voice service:', error);
        }
    }
}

// Export singleton instance
export const LocalVoiceService = new LocalVoiceServiceImpl();