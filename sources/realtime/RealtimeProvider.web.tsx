import React from 'react';
// ElevenLabs removed for privacy - using local voice service  
import { realtimeVoiceSession } from './RealtimeVoiceSession';

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
    // Initialize local voice service in privacy mode
    React.useEffect(() => {
        realtimeVoiceSession.initialize();
    }, []);

    return (
        <>
            {children}
        </>
    );
};