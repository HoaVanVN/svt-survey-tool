import React from 'react'
import { Outlet, Link, NavLink } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-900 text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/customers" className="flex items-center gap-2 font-bold text-lg hover:opacity-90">
            <span className="text-2xl">📋</span>
            <span>SVT Survey Tool</span>
          </Link>
          <span className="text-brand-300 text-sm hidden md:block flex-1">
            Infrastructure Sizing & Customer Survey Platform
          </span>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `text-sm px-3 py-1.5 rounded transition-colors ${
                isActive ? 'bg-white/20 text-white' : 'text-brand-200 hover:text-white hover:bg-white/10'
              }`
            }
          >
            ⚙️ Settings
          </NavLink>
        </div>
      </header>
      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 py-3 text-center text-xs text-gray-500">
        SVT Survey Tool v2.2.3.2 — Infrastructure Sizing &amp; Inventory Platform &nbsp;·&nbsp; Author: <span className="font-medium">Van Thanh Hoa</span>
      </footer>
    </div>
  )
}
