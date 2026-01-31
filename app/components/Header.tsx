import Link from 'next/link';
import { Github } from 'lucide-react';

export function Header() {
    return (
        <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
            <div className="w-full px-6 md:px-12 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Logo - Text Only, Professional Font */}
                    <Link href="/" className="group">
                        <span className="font-sans font-bold text-2xl tracking-tighter text-slate-100 group-hover:text-blue-400 transition-colors">
                            openTx
                            <span className="text-blue-500">.</span>
                        </span>
                    </Link>
                </div>

                <nav className="flex items-center gap-6">
                    <Link
                        href="https://github.com/duball97/OpenTxs"
                        target="_blank"
                        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        <Github className="w-5 h-5" />
                        <span className="hidden sm:inline">GitHub</span>
                    </Link>
                </nav>
            </div>
        </header>
    );
}
