/**
 * Nebula-based voice communication system
 * Replaces cloud-dependent WebRTC signaling with direct peer-to-peer audio streaming
 */
import { Platform } from 'react-native';
import { LocalRelay } from './LocalRelay';
import { NebulaManager } from './NebulaManager';

export interface VoiceSession {
    sessionId: string;
    participants: string[];
    status: 'idle' | 'connecting' | 'connected' | 'error';
    isRecording: boolean;
    isMuted: boolean;
}

export interface AudioMessage {
    type: 'audio-data' | 'voice-command' | 'transcription';
    sessionId: string;
    data: string; // Base64 encoded audio or text
    timestamp: number;
    from: string;
}

export type VoiceStatusListener = (session: VoiceSession) => void;

class NebulaVoiceImpl {
    private currentSession: VoiceSession | null = null;
    private statusListeners: Set<VoiceStatusListener> = new Set();
    private audioContext: any = null; // Will hold Web Audio API context
    private mediaRecorder: any = null; // Will hold MediaRecorder instance
    private isInitialized = false;

    /**
     * Initialize the Nebula voice system
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Set up audio permissions and context
            await this.setupAudioContext();
            
            // Set up message handlers for voice communication
            this.setupMessageHandlers();
            
            this.isInitialized = true;
            console.log('Nebula voice system initialized');

        } catch (error) {
            console.error('Failed to initialize Nebula voice:', error);
            throw error;
        }
    }

    /**
     * Start a voice session with the specified session ID
     */
    async startVoiceSession(sessionId: string): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.currentSession && this.currentSession.status === 'connected') {
            throw new Error('Voice session already active');
        }

        try {
            this.currentSession = {
                sessionId,
                participants: [this.getLocalNodeId()],
                status: 'connecting',
                isRecording: false,
                isMuted: false
            };

            this.notifyStatusChange();

            // Notify peers about voice session start
            await LocalRelay.sendMessage('voice-session-start', {
                sessionId,
                initiator: this.getLocalNodeId(),
                timestamp: Date.now()
            });

            // Start audio capture if supported
            await this.startAudioCapture();

            this.currentSession.status = 'connected';
            this.notifyStatusChange();

            console.log(`Voice session started for session: ${sessionId}`);

        } catch (error) {
            console.error('Failed to start voice session:', error);
            if (this.currentSession) {
                this.currentSession.status = 'error';
                this.notifyStatusChange();
            }
            throw error;
        }
    }

    /**
     * End the current voice session
     */
    async endVoiceSession(): Promise<void> {
        if (!this.currentSession) {
            return;
        }

        try {
            // Stop audio capture
            await this.stopAudioCapture();

            // Notify peers about session end
            await LocalRelay.sendMessage('voice-session-end', {
                sessionId: this.currentSession.sessionId,
                timestamp: Date.now()
            });

            this.currentSession = null;
            this.notifyStatusChange();

            console.log('Voice session ended');

        } catch (error) {
            console.error('Failed to end voice session:', error);
        }
    }

    /**
     * Send a text message during voice session (for when STT is processed locally)
     */
    sendTextMessage(text: string): void {
        if (!this.currentSession) {
            console.warn('No active voice session');
            return;
        }

        const message: AudioMessage = {
            type: 'voice-command',
            sessionId: this.currentSession.sessionId,
            data: text,
            timestamp: Date.now(),
            from: this.getLocalNodeId()
        };

        LocalRelay.sendMessage('voice-message', message);
        console.log(`Sent voice command: ${text}`);
    }

    /**
     * Send contextual update during voice session
     */
    sendContextualUpdate(update: string): void {
        if (!this.currentSession) {
            console.warn('No active voice session');
            return;
        }

        const message: AudioMessage = {
            type: 'transcription',
            sessionId: this.currentSession.sessionId,
            data: update,
            timestamp: Date.now(),
            from: this.getLocalNodeId()
        };

        LocalRelay.sendMessage('voice-message', message);
        console.log(`Sent contextual update: ${update}`);
    }

    /**
     * Toggle recording state
     */
    async toggleRecording(): Promise<boolean> {
        if (!this.currentSession) {
            return false;
        }

        if (this.currentSession.isRecording) {
            await this.stopAudioCapture();
            this.currentSession.isRecording = false;
        } else {
            await this.startAudioCapture();
            this.currentSession.isRecording = true;
        }

        this.notifyStatusChange();
        return this.currentSession.isRecording;
    }

    /**
     * Toggle mute state
     */
    toggleMute(): boolean {
        if (!this.currentSession) {
            return false;
        }

        this.currentSession.isMuted = !this.currentSession.isMuted;
        this.notifyStatusChange();
        
        console.log(`Voice ${this.currentSession.isMuted ? 'muted' : 'unmuted'}`);
        return this.currentSession.isMuted;
    }

    /**
     * Get current voice session status
     */
    getCurrentSession(): VoiceSession | null {
        return this.currentSession;
    }

    /**
     * Listen for voice session status changes
     */
    onStatusChange(listener: VoiceStatusListener): () => void {
        this.statusListeners.add(listener);
        if (this.currentSession) {
            listener(this.currentSession);
        }
        return () => this.statusListeners.delete(listener);
    }

    /**
     * Get voice system status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasActiveSession: !!this.currentSession,
            sessionId: this.currentSession?.sessionId,
            isRecording: this.currentSession?.isRecording || false,
            isMuted: this.currentSession?.isMuted || false,
            participantCount: this.currentSession?.participants.length || 0
        };
    }

    // Private methods

    private async setupAudioContext(): Promise<void> {
        if (Platform.OS === 'web') {
            // Set up Web Audio API
            if (typeof window !== 'undefined' && (window as any).AudioContext) {
                this.audioContext = new (window as any).AudioContext();
            }
        } else {
            // For mobile, we would use react-native-audio-api or similar
            console.log('Mobile audio setup - would use react-native-audio-api');
        }
    }

    private setupMessageHandlers(): void {
        // Handle voice session messages from peers
        LocalRelay.onMessage('voice-session-start', (message, fromPeer) => {
            this.handleVoiceSessionStart(message.data, fromPeer);
        });

        LocalRelay.onMessage('voice-session-end', (message, fromPeer) => {
            this.handleVoiceSessionEnd(message.data, fromPeer);
        });

        LocalRelay.onMessage('voice-message', (message, fromPeer) => {
            this.handleVoiceMessage(message.data, fromPeer);
        });

        LocalRelay.onMessage('audio-data', (message, fromPeer) => {
            this.handleAudioData(message.data, fromPeer);
        });
    }

    private async startAudioCapture(): Promise<void> {
        if (Platform.OS === 'web') {
            await this.startWebAudioCapture();
        } else {
            await this.startMobileAudioCapture();
        }
    }

    private async startWebAudioCapture(): Promise<void> {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
            throw new Error('Media devices not supported');
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Set up MediaRecorder for audio streaming
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.mediaRecorder.ondataavailable = (event: any) => {
                if (event.data.size > 0 && this.currentSession && !this.currentSession.isMuted) {
                    this.sendAudioData(event.data);
                }
            };

            this.mediaRecorder.start(100); // Collect data every 100ms
            console.log('Web audio capture started');

        } catch (error) {
            console.error('Failed to start web audio capture:', error);
            throw error;
        }
    }

    private async startMobileAudioCapture(): Promise<void> {
        // For mobile, we would use expo-audio or react-native-audio-api
        console.log('Mobile audio capture started (would use expo-audio)');
    }

    private async stopAudioCapture(): Promise<void> {
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.mediaRecorder = null;
        }
        console.log('Audio capture stopped');
    }

    private async sendAudioData(audioData: any): Promise<void> {
        if (!this.currentSession) return;

        // Convert audio data to base64
        const reader = new FileReader();
        reader.onload = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            
            const message: AudioMessage = {
                type: 'audio-data',
                sessionId: this.currentSession!.sessionId,
                data: base64Data,
                timestamp: Date.now(),
                from: this.getLocalNodeId()
            };

            await LocalRelay.sendMessage('audio-data', message);
        };
        
        if (audioData instanceof Blob) {
            reader.readAsDataURL(audioData);
        }
    }

    private handleVoiceSessionStart(data: any, fromPeer: string): void {
        console.log(`Voice session started by peer ${fromPeer} for session ${data.sessionId}`);
        
        // Join the session if we're part of the same session
        if (this.shouldJoinSession(data.sessionId)) {
            this.joinVoiceSession(data.sessionId, fromPeer);
        }
    }

    private handleVoiceSessionEnd(data: any, fromPeer: string): void {
        console.log(`Voice session ended by peer ${fromPeer}`);
        
        if (this.currentSession && this.currentSession.sessionId === data.sessionId) {
            this.endVoiceSession();
        }
    }

    private handleVoiceMessage(message: AudioMessage, fromPeer: string): void {
        console.log(`Voice message from ${fromPeer}: ${message.type} - ${message.data.substring(0, 50)}...`);
        
        // Here we would process the voice command or transcription
        // For now, just log it
    }

    private handleAudioData(message: AudioMessage, fromPeer: string): void {
        // Decode and play audio data from peer
        if (this.audioContext && message.data) {
            this.playAudioData(message.data);
        }
    }

    private async playAudioData(base64Data: string): Promise<void> {
        if (!this.audioContext) return;

        try {
            // Decode base64 audio data
            const binaryData = atob(base64Data);
            const arrayBuffer = new ArrayBuffer(binaryData.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            
            for (let i = 0; i < binaryData.length; i++) {
                uint8Array[i] = binaryData.charCodeAt(i);
            }

            // Decode audio and play
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            source.start();

        } catch (error) {
            console.error('Failed to play audio data:', error);
        }
    }

    private shouldJoinSession(sessionId: string): boolean {
        // Logic to determine if we should join this voice session
        // For now, join any session
        return true;
    }

    private async joinVoiceSession(sessionId: string, initiatorPeer: string): Promise<void> {
        if (this.currentSession) {
            console.warn('Already in a voice session');
            return;
        }

        this.currentSession = {
            sessionId,
            participants: [this.getLocalNodeId(), initiatorPeer],
            status: 'connected',
            isRecording: false,
            isMuted: false
        };

        this.notifyStatusChange();
        console.log(`Joined voice session: ${sessionId}`);
    }

    private getLocalNodeId(): string {
        return NebulaManager.getStatus().nodeIP || Platform.OS;
    }

    private notifyStatusChange(): void {
        if (this.currentSession) {
            this.statusListeners.forEach(listener => listener(this.currentSession!));
        }
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        await this.endVoiceSession();
        this.statusListeners.clear();
        this.isInitialized = false;
    }
}

export const NebulaVoice = new NebulaVoiceImpl();