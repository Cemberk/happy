/**
 * Local Analytics Viewer - Privacy-focused analytics dashboard
 * Only shows data stored locally, accessible within Nebula network
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { tracking } from '@/track/tracking';

interface AnalyticsEvent {
    id: string;
    event: string;
    properties?: Record<string, any>;
    timestamp: number;
    deviceId: string;
}

interface AnalyticsSummary {
    totalEvents: number;
    uniqueDays: number;
    mostCommonEvent: string;
    deviceInfo: {
        platform: string;
        version: string;
        deviceId: string;
    };
}

export const LocalAnalyticsView: React.FC = () => {
    const { theme } = useUnistyles();
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        loadAnalytics();
    }, [selectedTimeRange, refreshKey]);

    const loadAnalytics = () => {
        try {
            const allEvents = tracking.getEvents();
            
            // Filter events based on time range
            const now = Date.now();
            const timeRanges = {
                '24h': now - (24 * 60 * 60 * 1000),
                '7d': now - (7 * 24 * 60 * 60 * 1000),
                '30d': now - (30 * 24 * 60 * 60 * 1000),
                'all': 0
            };
            
            const filteredEvents = allEvents.filter(event => 
                event.timestamp >= timeRanges[selectedTimeRange]
            );
            
            setEvents(filteredEvents);
            
            // Calculate summary
            if (filteredEvents.length > 0) {
                const eventCounts = filteredEvents.reduce((acc, event) => {
                    acc[event.event] = (acc[event.event] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                
                const mostCommonEvent = Object.entries(eventCounts)
                    .sort(([,a], [,b]) => b - a)[0][0];
                
                const uniqueDays = new Set(
                    filteredEvents.map(event => 
                        new Date(event.timestamp).toDateString()
                    )
                ).size;
                
                const latestEvent = filteredEvents[filteredEvents.length - 1];
                
                setSummary({
                    totalEvents: filteredEvents.length,
                    uniqueDays,
                    mostCommonEvent,
                    deviceInfo: {
                        platform: latestEvent?.properties?.platform || 'Unknown',
                        version: latestEvent?.properties?.version || 'Unknown',
                        deviceId: latestEvent?.deviceId || 'Unknown'
                    }
                });
            } else {
                setSummary(null);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    };

    const clearAnalytics = () => {
        Alert.alert(
            'Clear Analytics',
            'Are you sure you want to delete all local analytics data? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                        tracking.clearEvents();
                        setRefreshKey(prev => prev + 1);
                        Alert.alert('Success', 'Analytics data cleared');
                    }
                }
            ]
        );
    };

    const exportAnalytics = () => {
        try {
            const exportData = tracking.exportEvents();
            console.log('📊 Analytics Export:\n', exportData);
            Alert.alert(
                'Export Complete', 
                'Analytics data has been logged to console. In a real implementation, this would be saved to file or shared within Nebula network.'
            );
        } catch (error) {
            Alert.alert('Export Failed', 'Could not export analytics data');
        }
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const formatEventProperties = (properties?: Record<string, any>) => {
        if (!properties || Object.keys(properties).length === 0) {
            return 'No properties';
        }
        
        return Object.entries(properties)
            .filter(([key]) => !['platform', 'version'].includes(key))
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ') || 'No custom properties';
    };

    return (
        <ScrollView style={stylesheet.container} contentInsetAdjustmentBehavior="automatic">
            <View style={stylesheet.header}>
                <Text style={stylesheet.title}>📊 Local Analytics</Text>
                <Text style={stylesheet.subtitle}>
                    Privacy-focused analytics • Data stays on device
                </Text>
            </View>

            <View style={stylesheet.privacyNotice}>
                <Text style={stylesheet.privacyText}>
                    🔒 This data never leaves your device or Nebula network. No external services can access this information.
                </Text>
            </View>

            <View style={stylesheet.controls}>
                <Text style={stylesheet.controlLabel}>Time Range:</Text>
                <View style={stylesheet.timeRangeButtons}>
                    {['24h', '7d', '30d', 'all'].map((range) => (
                        <Pressable
                            key={range}
                            style={[
                                stylesheet.timeRangeButton,
                                selectedTimeRange === range && stylesheet.timeRangeButtonActive
                            ]}
                            onPress={() => setSelectedTimeRange(range as any)}
                        >
                            <Text style={[
                                stylesheet.timeRangeButtonText,
                                selectedTimeRange === range && stylesheet.timeRangeButtonTextActive
                            ]}>
                                {range}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {summary && (
                <View style={stylesheet.summary}>
                    <Text style={stylesheet.sectionTitle}>Summary</Text>
                    <View style={stylesheet.summaryGrid}>
                        <View style={stylesheet.summaryItem}>
                            <Text style={stylesheet.summaryValue}>{summary.totalEvents}</Text>
                            <Text style={stylesheet.summaryLabel}>Total Events</Text>
                        </View>
                        <View style={stylesheet.summaryItem}>
                            <Text style={stylesheet.summaryValue}>{summary.uniqueDays}</Text>
                            <Text style={stylesheet.summaryLabel}>Active Days</Text>
                        </View>
                        <View style={stylesheet.summaryItemWide}>
                            <Text style={stylesheet.summaryValue}>{summary.mostCommonEvent}</Text>
                            <Text style={stylesheet.summaryLabel}>Most Common Event</Text>
                        </View>
                    </View>
                    
                    <View style={stylesheet.deviceInfo}>
                        <Text style={stylesheet.deviceInfoTitle}>Device Info</Text>
                        <Text style={stylesheet.deviceInfoText}>Platform: {summary.deviceInfo.platform}</Text>
                        <Text style={stylesheet.deviceInfoText}>Version: {summary.deviceInfo.version}</Text>
                        <Text style={stylesheet.deviceInfoText}>Device ID: {summary.deviceInfo.deviceId.slice(0, 16)}...</Text>
                    </View>
                </View>
            )}

            <View style={stylesheet.eventsList}>
                <Text style={stylesheet.sectionTitle}>Recent Events ({events.length})</Text>
                
                {events.length === 0 ? (
                    <View style={stylesheet.emptyState}>
                        <Text style={stylesheet.emptyStateText}>No analytics data available for this time range</Text>
                    </View>
                ) : (
                    events.slice(-20).reverse().map((event) => (
                        <View key={event.id} style={stylesheet.eventItem}>
                            <View style={stylesheet.eventHeader}>
                                <Text style={stylesheet.eventName}>{event.event}</Text>
                                <Text style={stylesheet.eventTime}>
                                    {formatTimestamp(event.timestamp)}
                                </Text>
                            </View>
                            <Text style={stylesheet.eventProperties}>
                                {formatEventProperties(event.properties)}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            <View style={stylesheet.actions}>
                <Pressable style={stylesheet.actionButton} onPress={() => setRefreshKey(prev => prev + 1)}>
                    <Text style={stylesheet.actionButtonText}>🔄 Refresh</Text>
                </Pressable>
                
                <Pressable style={stylesheet.actionButton} onPress={exportAnalytics}>
                    <Text style={stylesheet.actionButtonText}>📤 Export</Text>
                </Pressable>
                
                <Pressable style={[stylesheet.actionButton, stylesheet.dangerButton]} onPress={clearAnalytics}>
                    <Text style={[stylesheet.actionButtonText, stylesheet.dangerButtonText]}>🗑️ Clear</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    header: {
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    privacyNotice: {
        margin: 16,
        padding: 16,
        backgroundColor: theme.colors.success + '20',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.success,
    },
    privacyText: {
        fontSize: 14,
        color: theme.colors.success,
        textAlign: 'center',
    },
    controls: {
        padding: 16,
    },
    controlLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 12,
    },
    timeRangeButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    timeRangeButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    timeRangeButtonActive: {
        backgroundColor: theme.colors.textLink,
        borderColor: theme.colors.textLink,
    },
    timeRangeButtonText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    timeRangeButtonTextActive: {
        color: theme.colors.surface,
    },
    summary: {
        margin: 16,
        padding: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 16,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
    },
    summaryItem: {
        flex: 1,
        minWidth: 100,
        alignItems: 'center',
        padding: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 6,
    },
    summaryItemWide: {
        flex: 2,
        minWidth: 200,
        alignItems: 'center',
        padding: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 6,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textLink,
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    deviceInfo: {
        padding: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 6,
    },
    deviceInfoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    deviceInfoText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    eventsList: {
        margin: 16,
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    eventItem: {
        padding: 16,
        marginBottom: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.textLink,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    eventName: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
        flex: 1,
    },
    eventTime: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    eventProperties: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
        padding: 16,
        paddingTop: 0,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 16,
        backgroundColor: theme.colors.textLink,
        borderRadius: 6,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.surface,
    },
    dangerButton: {
        backgroundColor: theme.colors.warningCritical,
    },
    dangerButtonText: {
        color: theme.colors.surface,
    },
}));