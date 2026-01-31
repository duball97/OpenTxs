import Link from 'next/link';
import { Github } from 'lucide-react';

export function Footer() {
    return (
        <footer className="border-t border-white/5 bg-slate-950 text-slate-400 py-16">
            <div className="w-full px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12">

                {/* Brand */}
                <div className="md:col-span-2 space-y-4">
                    <span className="font-bold text-lg text-slate-200 tracking-tight">openTx.</span>
                    <p className="text-sm leading-relaxed max-w-xs text-slate-500">
                        The professional standard for blockchain transaction normalization. Open-source, private, and built for tax compliance.
                    </p>
                </div>

                {/* Project Links */}
                <div className="space-y-4">
                    <h4 className="text-slate-200 font-semibold text-sm uppercase tracking-wider">Project</h4>
                    <div className="flex flex-col gap-2 text-sm">
                        <Link href="https://github.com/duball97/OpenTxs" target="_blank" className="hover:text-blue-400 transition-colors flex items-center gap-2">
                            <Github className="w-4 h-4" /> Source Code
                        </Link>
                        <Link href="https://github.com/duball97/OpenTxs/blob/main/LICENSE" target="_blank" className="hover:text-blue-400 transition-colors">
                            MIT License
                        </Link>
                    </div>
                </div>

                {/* Creator */}
                <div className="space-y-4">
                    <h4 className="text-slate-200 font-semibold text-sm uppercase tracking-wider">Creator</h4>
                    <div className="flex flex-col gap-2 text-sm">
                        <Link href="https://x.com/duball97" target="_blank" className="hover:text-blue-400 transition-colors flex items-center gap-2">
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            @duball97
                        </Link>
                    </div>
                </div>
            </div>

            <div className="w-full px-6 md:px-12 mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-slate-600">
                <p>© {new Date().getFullYear()} OpenTx. All rights reserved.</p>
                <p>Built for Awaken Tax compatibility.</p>
            </div>
        </footer>
    );
}
