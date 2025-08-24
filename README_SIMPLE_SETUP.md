# Happy Coder - Simple 3-Step Setup

> **Control Claude Code from your phone** - Now 100% peer-to-peer, no cloud!

## 🚀 Super Simple Setup

### Step 1: Download App
- **iOS**: [App Store](https://apps.apple.com/app/happy-coder)
- **Android**: [Google Play](https://play.google.com/store/apps/happy-coder)

### Step 2: One-Command Install

```bash
curl -sSL https://raw.githubusercontent.com/slopus/happy/main/setup-complete-system.sh | bash
```

### Step 3: Start Using!

```bash
happy  # Instead of 'claude'
```

**That's it!** Your phone and computer are now securely connected with zero cloud dependencies.

---

## 🎯 What Just Happened?

The one-command installer:
1. ✅ Installs Happy CLI (`npm install -g happy-coder`)
2. ✅ Sets up Nebula mesh networking (secure P2P)
3. ✅ Generates QR codes for your phone
4. ✅ Downloads mobile apps (if available)
5. ✅ Creates helpful shortcuts

## 📱 Connect Your Phone

1. Run `happy` on your computer
2. Open Happy app on your phone  
3. Scan the QR code
4. You're connected!

## 🌟 Why This is Better

| **Before (Cloud)** | **Now (P2P)** |
|---|---|
| Your code goes to servers | Stays on your devices |
| Monthly fees possible | Free forever |
| Internet required | Works offline* |
| Third-party access | Impossible to intercept |
| Slower (cloud hops) | Faster (direct) |

<small>*After initial setup</small>

## 💡 Quick Commands

```bash
happy           # Start Claude Code with mobile control
happy status    # Check connection
happy setup     # Reconfigure network
```

## 🔐 Privacy & Security

- **Zero Cloud Dependencies** - Everything runs locally
- **Double Encryption** - Nebula mesh + Happy's E2E encryption  
- **Certificate Authentication** - Only your devices can connect
- **No Tracking** - No analytics, no telemetry, no data collection
- **Open Source** - Audit the code yourself

## 🆘 Need Help?

### Connection Issues?
```bash
happy status    # Check if Nebula is running
happy setup     # Reconfigure if needed
```

### Mobile App Won't Connect?
1. Make sure both devices are on same WiFi initially
2. Run `happy` and scan the QR code again
3. Check `happy status` shows "Connected"

### Start Fresh?
```bash
curl -sSL https://raw.githubusercontent.com/slopus/happy/main/setup-complete-system.sh | bash -s -- --reinstall
```

## 🏗️ How It Works

```
Your Phone ←→ Nebula Mesh ←→ Your Computer
    ↑            ↑              ↑
Happy App   Encrypted P2P   Claude Code
```

1. **Nebula Mesh VPN** creates secure tunnel between devices
2. **Happy CLI** wraps Claude Code for remote control
3. **Mobile App** provides touch interface and notifications
4. **Everything encrypted** - your code never leaves your control

## 🌍 System Requirements

- **Computer**: macOS, Linux, or Windows with Node.js
- **Phone**: iOS 14+ or Android 8+
- **Network**: WiFi for initial setup (then works offline)

## 🚀 Advanced Usage

### Multiple Devices
```bash
happy setup --add-device  # Add another phone/computer
```

### Custom Network
```bash
NEBULA_NETWORK=10.100.0.0/24 happy setup
```

### Docker Deployment
```bash
docker run -d --name happy-system \
  --cap-add=NET_ADMIN \
  --device=/dev/net/tun \
  -p 4242:4242/udp \
  -p 3001:3001 \
  happy-system:latest
```

## 📂 What Gets Installed

```
~/.happy-system/          # Main installation
├── start-happy.sh        # Quick start script
├── system-info.sh        # System information
├── mobile-setup-qr.txt   # QR code for phones
└── releases/             # Mobile app downloads
    ├── Happy-Android.apk
    └── Happy-iOS.zip

~/.happy-nebula/          # Nebula configuration
├── config/               # Network configuration
├── certs/                # Security certificates
└── bin/                  # Nebula binaries
```

## 🔄 Migration from Cloud Happy

Old Happy users - your setup is preserved! The installer detects and migrates your existing configuration automatically.

## 📖 Learn More

- [Detailed Setup Guide](NEBULA_SETUP.md)
- [Architecture Overview](NEBULA_MIGRATION.md)
- [GitHub Repository](https://github.com/slopus/happy)
- [CLI Documentation](https://github.com/slopus/happy-cli)
- [Server Documentation](https://github.com/slopus/happy-server)

---

**Enjoy coding with complete privacy and control! 🎉**

*No servers. No subscriptions. No tracking. Just you and Claude.*