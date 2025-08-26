# Privacy Policy for Happy Coder

**Last Updated: August 2025**

## Overview

Happy Coder is a privacy-first coding assistant that operates entirely within your private Nebula network. This policy explains our true local-first, data sovereignty architecture.

## Our Privacy Commitment

**Complete Data Sovereignty**: Your data never leaves your devices or private Nebula network. We have built a system that physically cannot access your information.

## What We Collect

### Encrypted Data (Nebula Network Only)
- **Messages and Code**: All your Claude Code conversations and code snippets are end-to-end encrypted and synchronized only between your own devices via Nebula VPN
- **Encryption Keys**: Generated on your devices and shared only between your paired devices through encrypted Nebula tunnels
- **Session Data**: Terminal sessions, file operations, and coding contexts remain within your private network

### Local-Only Analytics
- **Device Analytics**: Usage patterns and app events stored locally on each device
- **Network Analytics**: P2P communication metrics within your Nebula network only
- **No External Transmission**: Analytics data never leaves your devices or network
- **Local Viewing**: Access your analytics through the built-in local dashboard

### Voice Processing (Local Only)
- **Speech Recognition**: Processed entirely on-device using native mobile/desktop speech APIs
- **Text-to-Speech**: Generated locally using system voice synthesis
- **No External AI**: Voice conversations never sent to external services

## What We Don't Collect
- **No External Analytics**: No data sent to PostHog, Google Analytics, or any third-party analytics service
- **No Subscription Tracking**: No RevenueCat or external payment service integration
- **No Cloud Storage**: No Firebase, AWS, or external cloud service usage
- **No Voice Data**: No ElevenLabs or external voice processing services
- **No Location Data**: GPS or location information never collected
- **No Personal Information**: No email addresses, phone numbers, or identities required

## How We Use Data

### Nebula Network Architecture
- **Peer-to-Peer Only**: All communication happens directly between your devices via encrypted Nebula tunnels
- **No Central Servers**: No cloud servers have access to your data
- **Local Storage**: Data stored only on your own devices using encrypted local storage
- **VPN Mesh Network**: Devices communicate through private Nebula VPN mesh

### AI Agent Integration (Only External Service)
- **Limited Scope**: Only AI coding agent conversations sent to external APIs (Claude, GPT, etc.)
- **User Control**: You choose which AI service to use and can opt out entirely
- **Context Isolation**: AI agents only see the specific conversations you share, not your full codebase
- **No Metadata**: AI services don't receive device IDs, analytics, or system information

### Local Push Notifications
Push notifications work entirely within your Nebula network:
- **P2P Notifications**: Notifications sent directly between your paired devices
- **Local Generation**: Notification content generated on the sending device
- **No External Services**: No Expo, Firebase, or external push notification services
- **Network-Only**: Notifications only work when devices are connected to your Nebula network

## Data Security

- **Nebula VPN Encryption**: All network traffic encrypted through Nebula mesh VPN
- **TweetNaCl Encryption**: Additional end-to-end encryption for sensitive data using same library as Signal
- **Certificate-Based Authentication**: Device authentication using Nebula certificates, no passwords or accounts
- **Perfect Forward Secrecy**: Each session uses unique encryption keys
- **Open Source**: All encryption and networking code is publicly auditable
- **No Backdoors**: Architecture makes external access physically impossible
- **Network Isolation**: Traffic blocked from reaching external networks (except AI APIs)

## Data Retention

- **Local Storage Only**: All data stored exclusively on your devices
- **User-Controlled**: You decide what to keep, delete, or sync
- **Automatic Cleanup**: Old sessions and temporary files cleaned up locally
- **No Server Storage**: No cloud servers store any user data
- **Immediate Deletion**: Deleted data removed from local storage immediately

## Your Rights

You have complete control over your data:
- **Full Data Ownership**: All data belongs to you and stays on your devices
- **Local Export**: Export all your data in standard formats
- **Network Analytics**: View usage statistics through local dashboard
- **Open Source Audit**: Review all source code for privacy compliance
- **No Accounts Required**: Use the app without creating any accounts or providing personal information
- **Offline Operation**: Core functionality works without any internet connection

## Data Sharing

**We physically cannot share your data because we never have access to it.**

Your data only exists on your devices and travels through your private Nebula network. The only external service that may receive data is the AI agent APIs you choose to use, and only the specific conversations you send to them.

## Changes to This Policy

We will notify users of any changes through local app notifications and update versioning. Since we have no central server or user accounts, we cannot track who has seen updates, so please check this policy periodically.

## Contact

For privacy concerns or questions:
- GitHub Issues: Open source community support
- Local Network: Contact through your Nebula network administrator

## Compliance

Happy Coder exceeds privacy requirements and complies with:
- **GDPR**: Full compliance through local-only architecture
- **CCPA**: California privacy rights exceeded
- **HIPAA**: Healthcare-grade privacy protection
- **SOX**: Enterprise compliance suitable for regulated industries
- **Privacy by Design**: Built from ground up with privacy as core principle
- **Data Sovereignty**: Complete data residency control

## Technical Architecture Summary

**For Technical Audiences:**

1. **Network Layer**: Private Nebula VPN mesh with certificate-based authentication
2. **Transport Layer**: Encrypted P2P communication via Nebula tunnels
3. **Application Layer**: TweetNaCl end-to-end encryption for sensitive data
4. **Storage Layer**: Local encrypted storage using device security enclaves
5. **Analytics Layer**: Local-only event collection with zero external transmission
6. **Voice Layer**: On-device speech processing using native APIs
7. **AI Layer**: Optional external APIs with user consent and context isolation

**Network Traffic Audit**: The only external network connections are:
- AI Agent APIs (when user initiates conversations)
- Initial Nebula certificate exchange (during setup only)
- Operating system updates (handled by OS, not the app)

---

**Architecture Guarantee**: This application is designed so that even if we wanted to spy on users, the technical architecture makes it impossible. Your data stays on your devices.