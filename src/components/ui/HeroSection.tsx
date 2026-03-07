import FintechBackground from './FintechBackground';
import ReceiptsBackground from './ReceiptsBackground';
import ConnectionsBackground from './ConnectionsBackground';
import MessagesBackground from './MessagesBackground';
import ProfileBackground from './ProfileBackground';
import AboutBackground from './AboutBackground';

interface HeroSectionProps {
    pageKey: string;
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    overlayOpacity?: number;
    blurStrength?: number;
    textAlignment?: 'left' | 'center' | 'right';
    height?: string;
    children?: React.ReactNode;
}

export default function HeroSection({
    pageKey,
    title,
    subtitle,
    imageUrl,
    overlayOpacity,
    blurStrength,
    textAlignment = 'left',
    children
}: HeroSectionProps) {
    // If the parent passes these props, they override the defaults
    const finalTitle = title;
    const finalSubtitle = subtitle;
    const finalImage = imageUrl;
    const finalOpacity = overlayOpacity ?? 0.55;
    const finalBlur = blurStrength ?? 6;

    const alignClass =
        textAlignment === 'center' ? 'items-center text-center' :
            textAlignment === 'right' ? 'items-end text-right' :
                'items-start text-left';

    const isLanding = pageKey === 'landing';
    const useFintech = pageKey === 'landing' || pageKey === 'dashboard' || pageKey === 'reports';
    const useReceiptsLogic = pageKey === 'receipts';
    const useConnectionsLogic = pageKey === 'connections';
    const useMessagesLogic = pageKey === 'messages';
    const useProfileLogic = pageKey === 'profile';
    const useAboutLogic = pageKey === 'about';
    const heightClass = isLanding
        ? 'min-h-[320px] md:min-h-[440px]'
        : 'min-h-[200px] md:min-h-[260px]';

    return (
        <div className={`relative w-full overflow-hidden flex flex-col border-b border-[var(--border)] ${heightClass} isolate`}>
            {/* Background Layer */}
            {useFintech ? (
                <FintechBackground isDashboard={pageKey === 'dashboard'} />
            ) : useReceiptsLogic ? (
                <ReceiptsBackground />
            ) : useConnectionsLogic ? (
                <ConnectionsBackground />
            ) : useMessagesLogic ? (
                <MessagesBackground />
            ) : useProfileLogic ? (
                <ProfileBackground />
            ) : useAboutLogic ? (
                <AboutBackground />
            ) : finalImage ? (
                <div
                    className="absolute inset-x-0 inset-y-0 z-0 bg-cover bg-center bg-no-repeat transform-gpu"
                    style={{
                        backgroundImage: `url('${finalImage}')`,
                        filter: `blur(${finalBlur}px)`,
                        transform: `scale(${finalBlur > 0 ? 1.05 : 1})`
                    }}
                />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#0e1629] to-[var(--bg)] overflow-hidden z-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] sm:w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.15),transparent_70%)] pointer-events-none" />
                </div>
            )}

            {/* Overlay Layer */}
            {!useFintech && !useReceiptsLogic && !useConnectionsLogic && !useMessagesLogic && !useProfileLogic && !useAboutLogic && (
                <div
                    className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                    style={{
                        background: `linear-gradient(to bottom, rgba(0,0,0,${finalOpacity - 0.1}), rgba(0,0,0,${finalOpacity}))`,
                    }}
                />
            )}

            {/* Content Layer */}
            <div className={`relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isLanding ? 'pt-24 pb-12 sm:pt-28 md:pb-16' : 'py-6 sm:py-8 md:py-10'} flex flex-col justify-end flex-1 ${alignClass}`}>
                {children ? children : (
                    <>
                        {finalTitle && (
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 md:mb-2 max-w-3xl drop-shadow-sm">
                                {finalTitle}
                            </h1>
                        )}
                        {finalSubtitle && (
                            <p className="text-sm sm:text-base text-slate-200 max-w-2xl mx-auto drop-shadow-sm">
                                {finalSubtitle}
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
