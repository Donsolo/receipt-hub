import Link from 'next/link';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="md:flex md:items-center md:justify-between">
                    <div className="flex justify-center space-x-6 md:order-2">
                        <Link href="/about" className="text-gray-400 hover:text-gray-500 text-xs text-center block w-full md:w-auto">
                            About
                        </Link>
                        <Link href="/privacy" className="text-gray-400 hover:text-gray-500 text-xs text-center block w-full md:w-auto">
                            Privacy
                        </Link>
                        <Link href="/terms" className="text-gray-400 hover:text-gray-500 text-xs text-center block w-full md:w-auto">
                            Terms
                        </Link>
                    </div>
                    <div className="mt-8 md:mt-0 md:order-1">
                        <div className="text-center md:text-left">
                            <p className="text-xs text-gray-500">
                                &copy; {currentYear} Tektriq. All rights reserved.
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Receipt Hub is a product of Tektriq.
                            </p>
                            <p className="mt-1">
                                <a href="https://tektriq.com" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-500">
                                    https://tektriq.com
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
