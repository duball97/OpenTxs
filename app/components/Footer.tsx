export function Footer() {
    return (
        <footer className="border-t border-white/5 bg-slate-950 text-slate-400 py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex flex-col items-center md:items-start gap-2">
                    <span className="font-semibold text-slate-200">openTx</span>
                    <p className="text-sm">
                        Open-source blockchain transaction normalizer.
                    </p>
                </div>

                <div className="flex flex-col items-center md:items-end gap-2 text-sm">
                    <p>
                        Built for compatibility with <span className="text-blue-400">Awaken Tax</span>.
                    </p>
                    <div className="flex items-center gap-6 mt-2">
                        <a href="https://github.com/duball/OpenTxs" className="hover:text-blue-400 transition-colors">Source Code</a>
                        <a href="https://github.com/duball/OpenTxs/blob/main/LICENSE" className="hover:text-blue-400 transition-colors">MIT License</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
