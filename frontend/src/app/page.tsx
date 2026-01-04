'use client'

import Link from 'next/link'
import { ConnectButton } from '@/components/ConnectButton'
import { useAccount } from 'wagmi'

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <div className="min-h-screen bg-gradient-animated">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#7c3aed]/10 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[400px] h-[400px] bg-[#06b6d4]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-[#8b5cf6]/5 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[--border-subtle] bg-[--bg-primary]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[--text-primary]">AutoStack</span>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[--surface-2] border border-[--border-subtle] mb-8">
              <span className="w-2 h-2 rounded-full bg-[#10b981] pulse-animation" />
              <span className="text-sm text-[--text-secondary]">Live on Base Sepolia</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-[--text-primary]">Automated</span>
              <br />
              <span className="bg-gradient-to-r from-[#7c3aed] via-[#a78bfa] to-[#06b6d4] bg-clip-text text-transparent">
                Dollar Cost Averaging
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-[--text-secondary] max-w-2xl mx-auto mb-12 leading-relaxed">
              Set up recurring crypto purchases that execute automatically.
              Build your portfolio with consistent, scheduled investments on Base.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              {isConnected ? (
                <>
                  <Link href="/create" className="btn-primary text-lg px-8 py-4 inline-flex items-center justify-center gap-2">
                    Create Strategy
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link href="/dashboard" className="btn-secondary text-lg px-8 py-4 inline-flex items-center justify-center gap-2">
                    View Dashboard
                  </Link>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-[--text-tertiary]">Connect your wallet to get started</p>
                  <ConnectButton />
                </div>
              )}
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-[--text-tertiary] text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#10b981]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Non-custodial</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#10b981]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Fully automated</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#10b981]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Low fees</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-card p-8 hover:border-[--border-default] transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7c3aed]/20 to-[#7c3aed]/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[--text-primary] mb-3">Automated Execution</h3>
              <p className="text-[--text-secondary] leading-relaxed">
                Set your strategy once and let it run automatically. Choose daily or weekly frequency to match your investment goals.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-8 hover:border-[--border-default] transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[--text-primary] mb-3">Non-Custodial</h3>
              <p className="text-[--text-secondary] leading-relaxed">
                Your funds stay in your wallet until execution. Approve only what you want to spend. Full control, always.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-8 hover:border-[--border-default] transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#06b6d4]/20 to-[#06b6d4]/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-[#06b6d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[--text-primary] mb-3">Built on Base</h3>
              <p className="text-[--text-secondary] leading-relaxed">
                Enjoy fast transactions and minimal gas fees on Coinbase&apos;s L2 network. DeFi made accessible.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[--text-primary] mb-4">How It Works</h2>
            <p className="text-[--text-secondary]">Three simple steps to start building your portfolio</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div className="hidden md:block flex-1 h-[2px] bg-gradient-to-r from-[#7c3aed]/50 to-transparent" />
              </div>
              <h3 className="text-lg font-semibold text-[--text-primary] mb-2">Configure Strategy</h3>
              <p className="text-[--text-secondary] text-sm">Choose your tokens, amount per execution, and frequency.</p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div className="hidden md:block flex-1 h-[2px] bg-gradient-to-r from-[#7c3aed]/50 to-transparent" />
              </div>
              <h3 className="text-lg font-semibold text-[--text-primary] mb-2">Approve & Deploy</h3>
              <p className="text-[--text-secondary] text-sm">Approve spending and create your strategy on-chain.</p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center text-white font-bold">
                  3
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[--text-primary] mb-2">Sit Back & Stack</h3>
              <p className="text-[--text-secondary] text-sm">Your DCA executes automatically. Track progress on your dashboard.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[--border-subtle] bg-[--bg-primary]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-sm text-[--text-tertiary]">AutoStack DCA</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[--text-tertiary]">
              <span>Built on Base Sepolia</span>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[--text-secondary] transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
