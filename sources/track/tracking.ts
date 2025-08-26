import { MMKV } from 'react-native-mmkv';

// Local-only analytics storage within Nebula network
const localAnalytics = new MMKV({ id: 'local-analytics' });

interface AnalyticsEvent {
    id: string;
    event: string;
    properties?: Record<string, any>;
    timestamp: number;
    deviceId: string;
}

class LocalAnalytics {
    private deviceId: string;
    
    constructor() {
        // Generate or retrieve persistent device ID (local only)
        this.deviceId = localAnalytics.getString('device_id') || this.generateDeviceId();
        localAnalytics.set('device_id', this.deviceId);
    }
    
    private generateDeviceId(): string {
        return `local_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
    
    capture(event: string, properties?: Record<string, any>) {
        const analyticsEvent: AnalyticsEvent = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            event,
            properties: {
                ...properties,
                platform: require('react-native').Platform.OS,
                version: require('../../package.json').version,
            },
            timestamp: Date.now(),
            deviceId: this.deviceId
        };
        
        // Store locally only
        this.storeEvent(analyticsEvent);
        
        // Log for development (remove in production)
        console.log('📊 Local Analytics:', event, properties);
    }
    
    private storeEvent(event: AnalyticsEvent) {
        const events = this.getStoredEvents();
        events.push(event);
        
        // Keep only last 1000 events to prevent storage bloat
        const recentEvents = events.slice(-1000);
        localAnalytics.set('events', JSON.stringify(recentEvents));
    }
    
    private getStoredEvents(): AnalyticsEvent[] {
        const eventsJson = localAnalytics.getString('events');
        return eventsJson ? JSON.parse(eventsJson) : [];
    }
    
    // Methods for local analytics viewing within Nebula network
    getEvents(limit?: number): AnalyticsEvent[] {
        const events = this.getStoredEvents();
        return limit ? events.slice(-limit) : events;
    }
    
    getEventsSince(timestamp: number): AnalyticsEvent[] {
        return this.getStoredEvents().filter(event => event.timestamp >= timestamp);
    }
    
    getEventsByType(eventType: string): AnalyticsEvent[] {
        return this.getStoredEvents().filter(event => event.event === eventType);
    }
    
    clearEvents() {
        localAnalytics.delete('events');
    }
    
    // Export for sharing within Nebula network only
    exportEvents(): string {
        return JSON.stringify(this.getStoredEvents(), null, 2);
    }
    
    // Missing methods for compatibility
    identify(userId: string, properties?: Record<string, any>) {
        // Store user identification locally only
        localAnalytics.set('user_id', userId);
        if (properties) {
            localAnalytics.set('user_properties', JSON.stringify(properties));
        }
        console.log('📊 Local User Identified:', userId);
    }
    
    reset() {
        // Clear user identification
        localAnalytics.delete('user_id');
        localAnalytics.delete('user_properties');
        console.log('📊 Local Analytics Reset');
    }
    
    screen(screenName: string, properties?: Record<string, any>) {
        this.capture('screen_view', { screen_name: screenName, ...properties });
    }
    
    optOut() {
        localAnalytics.set('opted_out', 'true');
        console.log('📊 Local Analytics Opted Out');
    }
    
    optIn() {
        localAnalytics.delete('opted_out');
        console.log('📊 Local Analytics Opted In');
    }
    
    isOptedOut(): boolean {
        return localAnalytics.getString('opted_out') === 'true';
    }
}

// Replace external PostHog with local-only analytics
export const tracking = new LocalAnalytics();