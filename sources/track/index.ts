import { tracking } from './tracking';

// Re-export tracking for direct access
export { tracking } from './tracking';

/**
 * Initialize tracking with an anonymous user ID.
 * Should be called once during auth initialization.
 */
export function initializeTracking(anonymousUserId: string) {
    tracking?.identify(anonymousUserId, { name: anonymousUserId });
}

/**
 * Auth events
 */
export function trackAccountCreated() {
    // Privacy mode: No account creation - local only
    console.log('🔒 Privacy mode: Local session started');
}

export function trackAccountRestored() {
    // Privacy mode: No account restoration - local only  
    console.log('🔒 Privacy mode: Local session restored');
}

export function trackLogout() {
    tracking?.reset();
}

/**
 * Core user interactions
 */
export function trackConnectAttempt() {
    tracking?.capture('connect_attempt');
}

export function trackMessageSent() {
    tracking?.capture('message_sent');
}

export function trackVoiceRecording(action: 'start' | 'stop') {
    tracking?.capture('voice_recording', { action });
}

export function trackPermissionResponse(allowed: boolean) {
    tracking?.capture('permission_response', { allowed });
}

/**
 * Paywall events - Privacy mode: No paywalls in local-only operation
 */
export function trackPaywallButtonClicked() {
    console.log('🔒 Privacy mode: No paywall - all features free locally');
}

export function trackPaywallPresented() {
    console.log('🔒 Privacy mode: No paywall - all features free locally');
}

export function trackPaywallPurchased() {
    console.log('🔒 Privacy mode: No paywall - all features free locally');
}

export function trackPaywallCancelled() {
    console.log('🔒 Privacy mode: No paywall - all features free locally');
}

export function trackPaywallRestored() {
    console.log('🔒 Privacy mode: No paywall - all features free locally');
}

export function trackPaywallError(error: string) {
    console.log('🔒 Privacy mode: No paywall - all features free locally');
}

/**
 * Review request events
 */
export function trackReviewPromptShown() {
    tracking?.capture('review_prompt_shown');
}

export function trackReviewPromptResponse(likesApp: boolean) {
    tracking?.capture('review_prompt_response', { likes_app: likesApp });
}

export function trackReviewStoreShown() {
    tracking?.capture('review_store_shown');
}

export function trackReviewRetryScheduled(daysUntilRetry: number) {
    tracking?.capture('review_retry_scheduled', { days_until_retry: daysUntilRetry });
}

