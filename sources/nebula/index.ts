/**
 * Nebula networking module exports
 * Provides peer-to-peer mesh networking to replace cloud dependencies
 */

// Core Nebula components
export { NebulaManager } from './NebulaManager';
export { LocalRelay } from './LocalRelay';
export { nebulaSocket } from './NebulaSocket';

// Authentication
export { NebulaAuth } from './NebulaAuth';

// Communication systems
export { LocalNotifications } from './LocalNotifications';
export { NebulaVoice } from './NebulaVoice';

// Type exports
export type { NebulaConfig, NebulaStatus } from './NebulaManager';
export type { RelayMessage, ConnectedPeer } from './LocalRelay';
export type { NebulaAuthQRData, PairingResult } from './NebulaAuth';
export type { LocalNotification, NotificationPermissions } from './LocalNotifications';
export type { VoiceSession, AudioMessage } from './NebulaVoice';