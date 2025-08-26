/**
 * RevenueCat Stub - Privacy-first replacement
 * Removed for complete data sovereignty
 */

// Stub types for compatibility
export interface PurchasesEntitlement {
    identifier: string;
    isActive: boolean;
}

export interface PurchasesOffering {
    identifier: string;
    availablePackages: any[];
}

export interface PurchasesCustomerInfo {
    entitlements: { active: Record<string, PurchasesEntitlement> };
}

export interface CustomerInfo {
    entitlements: { active: Record<string, PurchasesEntitlement> };
}

export interface RevenueCatInterface {
    configure(): Promise<void>;
    getCustomerInfo(): Promise<CustomerInfo>;
    getOfferings(): Promise<PurchasesOffering[]>;
    purchasePackage(pkg: any): Promise<void>;
    restorePurchases(): Promise<CustomerInfo>;
    isPremium(): boolean;
    showPaywallIfNeeded(): boolean;
}

class LocalPurchaseManager implements RevenueCatInterface {
    // All purchases disabled for privacy-first approach
    async configure() {
        console.log('💳 Purchase system disabled for privacy - using local-only mode');
    }

    async getCustomerInfo(): Promise<CustomerInfo> {
        // Return empty entitlements - app runs in free mode
        return {
            entitlements: { active: {} }
        };
    }

    async getOfferings(): Promise<PurchasesOffering[]> {
        // No offerings in privacy mode
        return [];
    }

    async purchasePackage() {
        console.log('💳 Purchases disabled in privacy mode');
        throw new Error('Purchases disabled in privacy-first mode');
    }

    async restorePurchases() {
        console.log('💳 Purchase restoration disabled in privacy mode');
        return this.getCustomerInfo();
    }

    isPremium(): boolean {
        // In privacy mode, all features are available locally
        return true;
    }

    showPaywallIfNeeded(): boolean {
        // Never show paywall in privacy mode
        return false;
    }
}

export const revenueCat = new LocalPurchaseManager();

// Export compatibility functions
export const configureRevenueCat = () => revenueCat.configure();
export const getCustomerInfo = () => revenueCat.getCustomerInfo();
export const getOfferings = () => revenueCat.getOfferings();
export const purchasePackage = () => revenueCat.purchasePackage();
export const restorePurchases = () => revenueCat.restorePurchases();
export const isPremium = () => revenueCat.isPremium();
export const showPaywallIfNeeded = () => revenueCat.showPaywallIfNeeded();