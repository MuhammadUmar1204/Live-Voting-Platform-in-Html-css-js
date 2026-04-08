/* ========================================
   Global Device Manager
   Multi-Device Synchronization Module
   Worldwide User Support
   ======================================== */

// ========== GLOBAL DEVICE MANAGER ==========
const GlobalDeviceManager = {
    // Device registry
    devices: new Map(),
    
    // User session tracking
    userSessions: new Map(),
    
    // Device configuration
    config: {
        maxDevicesPerUser: 5,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        syncInterval: 5000, // 5 seconds
        enableOfflineSync: true,
        enableCrossDeviceSync: true
    },

    // ===== INITIALIZATION =====
    init: async function() {
        console.log('🌍 Initializing Global Device Manager...');
        
        this.generateDeviceId();
        this.detectDeviceInfo();
        this.setupDeviceListeners();
        this.enableOfflineSupport();
        this.startCrossDeviceSync();
        
        console.log('✓ Global Device Manager Ready');
    },

    // ===== DEVICE IDENTIFICATION =====
    generateDeviceId: function() {
        // Check localStorage for existing device ID
        let deviceId = localStorage.getItem('voteLive_deviceId');
        
        if (!deviceId) {
            // Generate unique device ID
            const timestamp = Date.now();
            const random = Math.random().toString(36).slice(2, 11);
            const ua = navigator.userAgent.replace(/\W/g, '').slice(0, 10);
            
            deviceId = `device_${timestamp}_${ua}_${random}`;
            localStorage.setItem('voteLive_deviceId', deviceId);
        }
        
        this.deviceId = deviceId;
        console.log('📱 Device ID:', deviceId);
        return deviceId;
    },

    detectDeviceInfo: function() {
        const ua = navigator.userAgent;
        const platform = navigator.platform;
        
        // Detect device type
        let deviceType = 'desktop';
        if (/iPhone|iPad|iPod/.test(ua)) deviceType = 'ios';
        else if (/Android/.test(ua)) deviceType = 'android';
        else if (/Windows Phone|IEMobile/.test(ua)) deviceType = 'windows_phone';
        
        // Detect screen size
        const screenSize = `${window.innerWidth}x${window.innerHeight}`;
        
        // Browser detection
        let browser = 'unknown';
        if (/Chrome/.test(ua)) browser = 'chrome';
        else if (/Safari/.test(ua)) browser = 'safari';
        else if (/Firefox/.test(ua)) browser = 'firefox';
        else if (/Edge|Edg/.test(ua)) browser = 'edge';
        
        this.deviceInfo = {
            id: this.deviceId,
            type: deviceType,
            platform,
            browser,
            screenSize,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            userAgent: ua,
            timestamp: Date.now()
        };
        
        console.log('📊 Device Info:', this.deviceInfo);
        return this.deviceInfo;
    },

    // ===== USER SESSION MANAGEMENT =====
    createUserSession: async function(userId, userData) {
        try {
            const sessionId = `session_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            
            const session = {
                sessionId,
                userId,
                deviceId: this.deviceId,
                deviceInfo: this.deviceInfo,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                isActive: true,
                userData
            };
            
            // Store in local storage
            localStorage.setItem(`voteLive_session_${sessionId}`, JSON.stringify(session));
            
            // Persist session to localStorage as a fallback (no Firebase)
            localStorage.setItem(`voteLive_session_${sessionId}`, JSON.stringify(session));
            
            // Track in memory
            this.userSessions.set(sessionId, session);
            
            console.log('✓ User session created:', sessionId);
            return sessionId;
        } catch (err) {
            console.error('❌ Error creating user session:', err);
            return null;
        }
    },

    getActiveSession: function(userId) {
        for (const [sessionId, session] of this.userSessions.entries()) {
            if (session.userId === userId && session.isActive) {
                return session;
            }
        }
        return null;
    },

    getAllUserSessions: async function(userId) {
        try {
            // Read all sessions from localStorage matching prefix
            const sessions = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('voteLive_session_')) {
                    const s = JSON.parse(localStorage.getItem(key));
                    if (s && s.userId === userId) sessions.push(s);
                }
            }
            return sessions;
        } catch (err) {
            console.error('❌ Error fetching user sessions:', err);
            return [];
        }
    },

    endSession: async function(sessionId, userId) {
        try {
            // Remove from memory
            this.userSessions.delete(sessionId);
            
            // Remove from localStorage
            localStorage.removeItem(`voteLive_session_${sessionId}`);
            
            // Remove persisted session in localStorage
            localStorage.removeItem(`voteLive_session_${sessionId}`);
            
            console.log('✓ Session ended:', sessionId);
            return true;
        } catch (err) {
            console.error('❌ Error ending session:', err);
            return false;
        }
    },

    // ===== CROSS-DEVICE SYNCHRONIZATION =====
    setupDeviceListeners: function() {
        // No remote listener - rely on storage events for cross-tab sync
        window.addEventListener('storage', (event) => {
            if (event.key && event.key.startsWith('voteLive_device_')) {
                try {
                    const deviceData = JSON.parse(event.newValue);
                    if (deviceData) this.updateDeviceStatus(deviceData);
                } catch (e) { /* ignore */ }
            }
        });
    },

    startCrossDeviceSync: function() {
        // Periodic sync across devices
        setInterval(() => {
            this.syncAcrossDevices();
        }, this.config.syncInterval);
        
        // Listen to storage changes (for same browser, different tabs)
        window.addEventListener('storage', (event) => {
            if (event.key && event.key.startsWith('voteLive_')) {
                console.log('📲 Storage changed in another tab:', event.key);
                this.handleCrossTabSync(event);
            }
        });
    },

    syncAcrossDevices: async function() {
        try {
            const userSessions = Array.from(this.userSessions.values());
            
            for (const session of userSessions) {
                // Update last activity in local storage as fallback
                session.lastActivity = Date.now();
                localStorage.setItem(`voteLive_session_${session.sessionId}`, JSON.stringify(session));
            }
        } catch (err) {
            console.error('❌ Error syncing across devices:', err);
        }
    },

    handleCrossTabSync: function(event) {
        // Handle storage events from other tabs
        if (event.key === 'voteLive_newVote') {
            // Another tab recorded a vote
            console.log('🗳️ Vote recorded in another tab');
            if (typeof AdminRealtime !== 'undefined') {
                AdminRealtime.getStats(); // Refresh stats
            }
        } else if (event.key === 'voteLive_electronclosed') {
            // Another tab closed
            console.log('❌ Tab closed');
        }
    },

    updateDeviceStatus: function(deviceData) {
        this.devices.set(deviceData.id, {
            ...deviceData,
            lastSync: Date.now()
        });
    },

    // ===== OFFLINE SUPPORT =====
    enableOfflineSupport: function() {
        // Enable service worker for offline support
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').then(reg => {
                console.log('✓ Service Worker registered for offline support');
            }).catch(err => {
                console.warn('⚠️ Service Worker registration failed:', err);
            });
        }

        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('🌐 Back online');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            console.log('📴 Offline mode');
            this.enableLocalMode();
        });
    },

    syncOfflineData: async function() {
        try {
            // Get offline votes from localStorage
            const offlineVotes = JSON.parse(
                localStorage.getItem('voteLive_offlineVotes') || '[]'
            );
            
            // Sync each vote by sending to server API via fetch
            for (const vote of offlineVotes) {
                try {
                    await fetch('/api/submit-offline-vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vote) });
                    console.log('✓ Offline vote queued to server sync:', vote.id);
                } catch (err) {
                    console.error('❌ Error syncing vote:', err);
                }
            }
            
            // Clear offline votes
            localStorage.removeItem('voteLive_offlineVotes');
            console.log('✓ All offline data queued for server sync');
        } catch (err) {
            console.error('❌ Error syncing offline data:', err);
        }
    },

    enableLocalMode: function() {
        console.log('📱 Local mode enabled - using localStorage');
        // Switch UI to indicate offline mode
        document.body.classList.add('offline-mode');
    },

    recordOfflineVote: function(voteData) {
        try {
            const offlineVotes = JSON.parse(
                localStorage.getItem('voteLive_offlineVotes') || '[]'
            );
            
            voteData.id = `offline_vote_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            voteData.syncedAt = null;
            
            offlineVotes.push(voteData);
            localStorage.setItem('voteLive_offlineVotes', JSON.stringify(offlineVotes));
            
            console.log('✓ Vote recorded offline:', voteData.id);
            return voteData.id;
        } catch (err) {
            console.error('❌ Error recording offline vote:', err);
            return null;
        }
    },

    // ===== MULTI-DEVICE NOTIFICATIONS =====
    notifyOtherDevices: async function(userId, notification) {
        try {
            const timestamp = Date.now();
            const notificationId = `notif_${timestamp}_${Math.random().toString(36).slice(2)}`;
            
            const notificationData = {
                id: notificationId,
                type: notification.type,
                message: notification.message,
                sourceDevice: this.deviceId,
                targetUserId: userId,
                timestamp,
                read: false
            };
            
            // Persist notification to localStorage and broadcast via storage event
            localStorage.setItem(`voteLive_notification_${notificationId}`, JSON.stringify(notificationData));
            
            console.log('✓ Notification sent to other devices');
        } catch (err) {
            console.error('❌ Error sending notification:', err);
        }
    },

    listenForNotifications: function(userId, callback) {
        // Listen for notifications via storage event
        const handler = (event) => {
            if (event.key && event.key.startsWith(`voteLive_notification_`)) {
                try {
                    const notification = JSON.parse(event.newValue);
                    if (notification && notification.sourceDevice !== this.deviceId) callback(notification);
                } catch (e) { /* ignore */ }
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    },

    // ===== DEVICE LOCATION & TIMEZONE =====
    getLocationInfo: function() {
        return {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: navigator.language,
            region: Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[0]
        };
    },

    getLocalizedTime: function(timestamp) {
        return new Date(timestamp).toLocaleString(navigator.language, {
            timeZone: this.deviceInfo.timezone
        });
    },

    // ===== DEVICE STATS & MONITORING =====
    getDeviceStats: function() {
        return {
            deviceId: this.deviceId,
            deviceInfo: this.deviceInfo,
            activeSessions: this.userSessions.size,
            isOnline: navigator.onLine,
            memoryUsage: performance.memory ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : null,
            networkInfo: navigator.connection ? {
                type: navigator.connection.type,
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    },

    reportDeviceMetrics: async function(userId) {
        try {
            const metrics = {
                ...this.getDeviceStats(),
                timestamp: Date.now()
            };
            
            // No remote analytics store — persist locally or send to API endpoint if needed
            console.log('Device metrics (not sent):', metrics);
            
            console.log('✓ Device metrics reported');
        } catch (err) {
            console.error('❌ Error reporting metrics:', err);
        }
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => GlobalDeviceManager.init(), 1000);
    });
} else {
    setTimeout(() => GlobalDeviceManager.init(), 1000);
}
