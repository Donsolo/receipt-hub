"use client";

import { useState, useEffect } from 'react';
import DynamicModal from './DynamicModal';

export default function ModalManager() {
    const [queue, setQueue] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const res = await fetch('/api/announcements/active');
                if (res.ok) {
                    const data = await res.json();

                    // Filter out announcements that the user has already seen
                    const unread = data.filter((ann: any) => {
                        return !localStorage.getItem(`announcement_seen_${ann.id}`);
                    });

                    setQueue(unread);
                }
            } catch (error) {
                console.error("Failed to load announcements");
            } finally {
                setIsLoaded(true);
            }
        };

        fetchAnnouncements();
    }, []);

    if (!isLoaded || queue.length === 0 || currentIndex >= queue.length) return null;

    const currentAnnouncement = queue[currentIndex];

    const handleNext = () => {
        setCurrentIndex((prev) => prev + 1);
    };

    return (
        <DynamicModal
            key={currentAnnouncement.id}
            announcement={currentAnnouncement}
            onClose={handleNext}
        />
    );
}
