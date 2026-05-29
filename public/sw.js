self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            
            const title = data.title || 'Verihub';
            const options = {
                body: data.body || 'You have a new notification.',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                data: data.data || { route: '/' },
                requireInteraction: true
            };

            event.waitUntil(self.registration.showNotification(title, options));
        } catch (err) {
            console.error('Error parsing push data', err);
            // Fallback for plain text
            event.waitUntil(self.registration.showNotification('Verihub', {
                body: event.data.text(),
                icon: '/icons/icon-192x192.png',
            }));
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const route = event.notification.data && event.notification.data.route ? event.notification.data.route : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                // Focus existing client and navigate
                if (client.url && 'focus' in client) {
                    client.focus();
                    return client.navigate(route);
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(route);
            }
        })
    );
});
