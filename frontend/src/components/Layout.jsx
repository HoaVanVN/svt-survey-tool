import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const loc = useLocation()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-900 text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/customers" className="flex items-center gap-2 font-bold text-lg hover:opacity-90">
            <span className="text-2xl">📋</span>
            <span>SVT Survey Tool</span>
          </Link>
          <span className="text-brand-300 text-sm hidden md:block">
            Infrastructure Sizing & Customer Survey Platform
          </span>
        </div>
      </header>
      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 py-3 text-center text-xs text-gray-500">
        SVT Survey Tool v1.0 — Infrastructure Sizing Platform
      </footer>
    </div>
  )
}
