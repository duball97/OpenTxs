import Link from 'next/link';
import { Github } from 'lucide-react';

export function Header() {
    return (
        <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
                        <div className="relative w-10 h-10 bg-slate-900 ring-1 ring-white/10 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-tr from-blue-400 to-cyan-300">
                                Ox
                            </span>
                        </div>
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-100">
                        openTx
                    </span>
                </div>

                <nav className="flex items-center gap-6">
                    <Link
                        href="https://github.com/duball/OpenTxs"
                        target="_blank"
                        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        <Github className="w-4 h-4" />
                        <span>GitHub</span>
                    </Link>
                </nav>
            </div>
        </header>
    );
}
