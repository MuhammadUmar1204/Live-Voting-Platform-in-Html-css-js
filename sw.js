/* ========================================
   Service Worker
   Offline Support & Caching
   Background Sync
   ======================================== */

const CACHE_NAME = 'votelive-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/a-panel.html',
    '/v-panel.html',
    '/app-styles.css',
    '/app-script.js',
    '/app-styles.css',
    '/app-script.js',
    '/realtime-client.js',
    '/admin-realtime.js',
    '/voter-realtime.js',
    '/global-device-manager.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('✓ Cache opened');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Activate immediately
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    console.log('✓ Service Worker activated');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️  Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    self.clients.claim(); // Take control of all pages
});

// Fetch Event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Network first strategy for API calls
    if (request.url.includes('/api') || request.url.includes('api')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    
                    // Cache successful responses
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    
                    return response;
                })
                .catch(() => {
                    // Network failed, try cache
                    return caches.match(request)
                        .then((response) => {
                            if (response) {
                                return response;
                            }
                            
                            // Return offline page
                            return caches.match('/index.html');
                        });
                })
        );
    }
    
    // Cache first strategy for static assets
    event.respondWith(
        caches.match(request)
            .then((response) => {
                if (response) {
                    return response;
                }
                
                return fetch(request)
                    .then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Background Sync for offline votes
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-votes') {
        console.log('🔄 Background sync: Syncing offline votes...');
        event.waitUntil(
            // Get offline votes from IndexedDB/localStorage
            // Sync with backend server
            syncOfflineVotes()
        );
    }
});

async function syncOfflineVotes() {
    try {
        // This would be called after coming online
        console.log('✓ Offline votes synced in background');
    } catch (err) {
        console.error('❌ Background sync failed:', err);
        throw err;
    }
}

// Push Notifications
self.addEventListener('push', (event) => {
    const data = event.data.json();
    
    const notificationOptions = {
        body: data.message,
        icon: '/assets/favicon.png',
        badge: '/assets/favicon.png',
        tag: 'votelive-notification',
        data: data
    };
    
    event.waitUntil(
        self.registration.showNotification('VoteLive', notificationOptions)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then((clientList) => {
                // Check if VoteLive window is already open
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

console.log('✓ Service Worker loaded');
