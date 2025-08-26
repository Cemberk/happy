// Privacy-first imports - removed all auth-related dependencies
import { ActivityIndicator, Text, View } from "react-native";
import * as React from 'react';
import { useUpdates } from "@/hooks/useUpdates";
import { UpdateBanner } from "@/components/UpdateBanner";
import { SessionsList } from "@/components/SessionsList";
import { router } from "expo-router";
import { useSessionListViewData, useSetting } from "@/sync/storage";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useIsTablet } from "@/utils/responsive";
import { EmptyMainScreen } from "@/components/EmptyMainScreen";
import { FAB } from "@/components/FAB";
import { HomeHeader } from "@/components/HomeHeader";
import { VoiceAssistantStatusBar } from '@/components/VoiceAssistantStatusBar';
import { useRealtimeStatus } from '@/sync/storage';

export default function Home() {
    // Privacy mode: Always authenticated locally, no external accounts
    return <Authenticated />;
}

function Authenticated() {
    const { theme } = useUnistyles();
    let sessionListViewData = useSessionListViewData();
    const { updateAvailable, reloadApp } = useUpdates();
    const isTablet = useIsTablet();
    const isExperimental = useSetting('experiments');
    const realtimeStatus = useRealtimeStatus();

    const handleNewSession = () => {
        router.push('/new-session');
    }

    // Empty state in tabled view
    if (isTablet) {
        return (
            <>
                <View style={{ flex: 1, flexBasis: 0, flexGrow: 1 }}>
                    {sessionListViewData === null && (
                        <View style={{ flex: 1, flexBasis: 0, flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                        </View>
                    )}
                    {sessionListViewData !== null && sessionListViewData.length === 0 && (
                        <EmptyMainScreen />
                    )}
                </View>
            </>
        )
    }
    if (sessionListViewData === null) {
        return (
            <>
                <HomeHeader />
                {!isTablet && realtimeStatus !== 'disconnected' && (
                    <VoiceAssistantStatusBar variant="full" />
                )}
                <View style={styles.loadingContainerWrapper}>
                    <UpdateBanner />
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                    </View>
                </View>
                {isExperimental && (
                    <FAB onPress={handleNewSession} />
                )}
            </>
        )
    }

    const emptyState = (
        <View style={{ flex: 1, flexBasis: 0, flexGrow: 1, flexDirection: 'column', backgroundColor: theme.colors.groupped.background }}>
            <UpdateBanner />
            <View style={{ flex: 1, flexBasis: 0, flexGrow: 1 }}>
                <EmptyMainScreen />
            </View>
        </View>
    );

    // On phones, use the existing navigation pattern
    return (
        <>
            <HomeHeader />
            {!isTablet && realtimeStatus !== 'disconnected' && (
                <VoiceAssistantStatusBar variant="full" />
            )}
            <View style={styles.container}>
                {!sessionListViewData || sessionListViewData.length === 0 ? emptyState : (
                    <SessionsList />
                )}
            </View>
            {isExperimental && (
                <FAB onPress={handleNewSession} />
            )}
        </>
    );
}

// NotAuthenticated component removed for privacy mode
// The app now runs in local-only mode without external accounts

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1
    },
    loadingContainerWrapper: {
        flex: 1,
        flexBasis: 0,
        flexGrow: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 32,
    },
}));