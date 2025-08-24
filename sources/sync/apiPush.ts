import { AuthCredentials } from '@/auth/tokenStorage';
import { LocalNotifications } from '@/nebula/LocalNotifications';

/**
 * Register for local peer-to-peer notifications (replaces cloud push tokens)
 */
export async function registerPushToken(credentials: AuthCredentials, token: string): Promise<void> {
    // In the Nebula version, we initialize local notifications instead of registering with a cloud service
    console.log('Initializing local peer-to-peer notifications instead of cloud push');
    await LocalNotifications.initialize();
    
    // Send a test notification to verify the system works
    if (__DEV__) {
        setTimeout(() => {
            LocalNotifications.sendTestNotification();
        }, 2000);
    }
    
    console.log('Local notifications system ready');
}

/**
 * Send notification directly to peers (replaces cloud push notification sending)
 */
export async function sendNotification(type: string, data: any): Promise<void> {
    switch (type) {
        case 'claude-needs-input':
            await LocalNotifications.notifyClaudeNeedsInput(data.sessionId, data.message);
            break;
        case 'task-completed':
            await LocalNotifications.notifyTaskCompleted(data.sessionId, data.description);
            break;
        case 'permission-requested':
            await LocalNotifications.notifyPermissionRequested(data.sessionId, data.tool, data.description);
            break;
        case 'session-activity':
            await LocalNotifications.notifySessionActivity(data.sessionId, data.activity);
            break;
        default:
            console.warn('Unknown notification type:', type);
    }
}