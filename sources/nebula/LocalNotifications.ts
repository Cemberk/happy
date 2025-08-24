/**
 * Local peer-to-peer notification system
 * Replaces cloud-based push notifications with direct device-to-device messaging
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { LocalRelay } from './LocalRelay';
import { NebulaManager } from './NebulaManager';

export interface LocalNotification {
    id: string;
    title: string;
    body: string;
    data?: any;
    sound?: boolean;
    badge?: number;
    priority?: 'default' | 'high' | 'max';
    targetPeer?: string; // If specified, send only to this peer
    timestamp: number;
}

export interface NotificationPermissions {
    granted: boolean;
    canAskAgain: boolean;
}

class LocalNotificationsImpl {
    private isInitialized = false;
    private permissionsGranted = false;

    /**
     * Initialize the local notification system
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Request notification permissions
            await this.requestPermissions();

            // Set up notification handling configuration
            await Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                }),
            });

            // Set up message handlers for incoming peer notifications
            this.setupMessageHandlers();

            this.isInitialized = true;
            console.log('Local notifications initialized');

        } catch (error) {
            console.error('Failed to initialize local notifications:', error);
            throw error;
        }
    }

    /**
     * Request notification permissions from the user
     */
    async requestPermissions(): Promise<NotificationPermissions> {
        if (Platform.OS === 'web') {
            // Web doesn't need explicit permission request for local notifications
            this.permissionsGranted = true;
            return { granted: true, canAskAgain: true };
        }

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            this.permissionsGranted = finalStatus === 'granted';
            
            return {
                granted: this.permissionsGranted,
                canAskAgain: finalStatus !== 'denied'
            };

        } catch (error) {
            console.error('Failed to request notification permissions:', error);
            return { granted: false, canAskAgain: false };
        }
    }

    /**
     * Send notification to a specific peer or all peers
     */
    async sendNotification(notification: Omit<LocalNotification, 'id' | 'timestamp'>): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const fullNotification: LocalNotification = {
            ...notification,
            id: `notif-${Date.now()}-${Math.random()}`,
            timestamp: Date.now()
        };

        // Send via local relay to peer(s)
        await LocalRelay.sendMessage('peer-notification', fullNotification, notification.targetPeer);
        console.log(`Sent notification "${notification.title}" to ${notification.targetPeer || 'all peers'}`);
    }

    /**
     * Send notification when Claude needs attention
     */
    async notifyClaudeNeedsInput(sessionId: string, message: string): Promise<void> {
        await this.sendNotification({
            title: 'Claude needs your input',
            body: message,
            data: { sessionId, type: 'claude-input-required' },
            priority: 'high',
            sound: true
        });
    }

    /**
     * Send notification when a task is completed
     */
    async notifyTaskCompleted(sessionId: string, taskDescription: string): Promise<void> {
        await this.sendNotification({
            title: 'Task completed',
            body: taskDescription,
            data: { sessionId, type: 'task-completed' },
            priority: 'default',
            sound: true
        });
    }

    /**
     * Send notification when permission is requested
     */
    async notifyPermissionRequested(sessionId: string, tool: string, description: string): Promise<void> {
        await this.sendNotification({
            title: 'Permission requested',
            body: `Claude wants to use ${tool}: ${description}`,
            data: { sessionId, tool, type: 'permission-requested' },
            priority: 'high',
            sound: true
        });
    }

    /**
     * Send notification for session activity
     */
    async notifySessionActivity(sessionId: string, activity: string): Promise<void> {
        await this.sendNotification({
            title: 'Session activity',
            body: activity,
            data: { sessionId, type: 'session-activity' },
            priority: 'default',
            sound: false
        });
    }

    /**
     * Check current notification permissions
     */
    async getPermissions(): Promise<NotificationPermissions> {
        if (Platform.OS === 'web') {
            return { granted: true, canAskAgain: true };
        }

        try {
            const { status } = await Notifications.getPermissionsAsync();
            return {
                granted: status === 'granted',
                canAskAgain: status !== 'denied'
            };
        } catch (error) {
            console.error('Failed to get notification permissions:', error);
            return { granted: false, canAskAgain: false };
        }
    }

    /**
     * Clear all notifications (local device only)
     */
    async clearAll(): Promise<void> {
        if (Platform.OS !== 'web') {
            try {
                await Notifications.dismissAllNotificationsAsync();
            } catch (error) {
                console.error('Failed to clear notifications:', error);
            }
        }
    }

    /**
     * Get notification system status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            permissionsGranted: this.permissionsGranted,
            nebulaConnected: NebulaManager.getStatus().status === 'connected',
            peerCount: LocalRelay.getPeers().length
        };
    }

    // Private methods

    private setupMessageHandlers(): void {
        // Handle incoming peer notifications
        LocalRelay.onMessage('peer-notification', (message, fromPeer) => {
            this.handleIncomingNotification(message.data, fromPeer);
        });
    }

    private async handleIncomingNotification(notification: LocalNotification, fromPeer: string): Promise<void> {
        if (!this.permissionsGranted) {
            console.log('Received notification but permissions not granted:', notification.title);
            return;
        }

        try {
            // Show local notification
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: notification.title,
                    body: notification.body,
                    data: {
                        ...notification.data,
                        fromPeer,
                        notificationId: notification.id
                    },
                    sound: notification.sound !== false,
                    priority: this.mapPriority(notification.priority)
                },
                trigger: null, // Show immediately
            });

            console.log(`Displayed notification from ${fromPeer}: "${notification.title}"`);

        } catch (error) {
            console.error('Failed to display notification:', error);
        }
    }

    private mapPriority(priority?: 'default' | 'high' | 'max'): Notifications.AndroidNotificationPriority {
        switch (priority) {
            case 'high':
                return Notifications.AndroidNotificationPriority.HIGH;
            case 'max':
                return Notifications.AndroidNotificationPriority.MAX;
            default:
                return Notifications.AndroidNotificationPriority.DEFAULT;
        }
    }

    /**
     * Test notification system by sending a test notification
     */
    async sendTestNotification(): Promise<void> {
        await this.sendNotification({
            title: 'Test Notification',
            body: 'This is a test of the local peer-to-peer notification system.',
            data: { type: 'test' },
            priority: 'default',
            sound: true
        });
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        this.isInitialized = false;
        this.permissionsGranted = false;
        await this.clearAll();
    }
}

export const LocalNotifications = new LocalNotificationsImpl();