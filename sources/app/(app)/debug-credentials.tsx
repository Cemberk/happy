import React from 'react';
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useAuth } from '@/auth/LocalAuthContext';

// Debug page to check credential status
export default function DebugCredentials() {
    const { credentials, isAuthenticated } = useAuth();

    const styles = StyleSheet.create((theme) => ({
        container: {
            flex: 1,
            padding: 20,
            backgroundColor: theme.colors.background,
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 20,
            color: theme.colors.typography,
        },
        section: {
            marginBottom: 20,
            padding: 15,
            backgroundColor: theme.colors.secondary,
            borderRadius: 8,
        },
        label: {
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 5,
            color: theme.colors.typography,
        },
        value: {
            fontSize: 14,
            fontFamily: 'monospace',
            color: theme.colors.typography,
            backgroundColor: theme.colors.background,
            padding: 8,
            borderRadius: 4,
            marginBottom: 10,
        },
        status: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.primary,
        },
    }));

    // Check localStorage directly
    const checkLocalStorage = () => {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('auth_credentials');
            return stored ? JSON.parse(stored) : null;
        }
        return null;
    };

    // Test credential validation
    const isValidCredentials = (localCredentials: any) => {
        return localCredentials && 
            localCredentials.secret && 
            localCredentials.token &&
            localCredentials.secret.length < 60 && // Reject the old 64-char hex format
            !localCredentials.secret.match(/^[0-9a-f]{64}$/i) && // Reject pure hex strings
            localCredentials.token === 'nebula-network-token' && // Nebula network token
            !localCredentials.token.startsWith('privacy-local-token-'); // Reject old token format
    };

    const storedCreds = checkLocalStorage();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Credential Debug Information</Text>
            
            <View style={styles.section}>
                <Text style={styles.label}>Authentication Status:</Text>
                <Text style={styles.status}>{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Current Credentials (from useAuth):</Text>
                <Text style={styles.value}>Token: {credentials?.token || 'null'}</Text>
                <Text style={styles.value}>Secret Length: {credentials?.secret?.length || 'null'}</Text>
                <Text style={styles.value}>Secret Preview: {credentials?.secret?.substring(0, 20) || 'null'}...</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Stored Credentials (from localStorage):</Text>
                <Text style={styles.value}>Token: {storedCreds?.token || 'null'}</Text>
                <Text style={styles.value}>Secret Length: {storedCreds?.secret?.length || 'null'}</Text>
                <Text style={styles.value}>Secret Preview: {storedCreds?.secret?.substring(0, 20) || 'null'}...</Text>
                <Text style={styles.value}>Is Valid: {isValidCredentials(storedCreds) ? 'Yes' : 'No'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Expected Format:</Text>
                <Text style={styles.value}>Token: nebula-network-token</Text>
                <Text style={styles.value}>Secret: Base64 string, length &lt; 60</Text>
                <Text style={styles.value}>Secret should not be pure hex (64 chars)</Text>
                <Text style={styles.value}>Token should not start with 'privacy-local-token-'</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Next Steps:</Text>
                <Text style={styles.value}>
                    1. If credentials are invalid, clear localStorage
                    {'\n'}2. If credentials are valid, check sync initialization
                    {'\n'}3. If sync fails, check parseToken function
                    {'\n'}4. If parseToken works, check WebSocket connection
                </Text>
            </View>
        </View>
    );
}