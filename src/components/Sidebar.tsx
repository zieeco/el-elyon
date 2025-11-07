import React from "react";
import { SignOutButton } from "../SignOutButton";

const NAV_SECTIONS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "🏠"
  },
  {
    key: "compliance",
    label: "Compliance",
    icon: "✅"
  },
  {
    key: "people",
    label: "People",
    icon: "👤"
  },
  {
    key: "locations",
    label: "Locations",
    icon: "📍"
  },
  {
    key: "guardian-checklists",
    label: "Guardian Checklists",
    icon: "📋"
  },
  {
    key: "data-cleanup",
    label: "Data Cleanup",
    icon: "🧹"
  },
  {
    key: "settings",
    label: "Settings",
    icon: "🔐"
  }
];

export default function Sidebar({
  user,
  selected,
  setSelected,
}: {
  user: any;
  selected: string;
  setSelected: (key: string) => void;
}) {
  return (
    <aside className="w-64 bg-[#001f3f] border-r border-[#003366] min-h-screen flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-[#003366] px-4">
        <span className="text-2xl font-bold text-white">Admin Portal</span>
      </div>
      <nav className="flex-1 py-4" role="navigation" aria-label="Main navigation">
        <ul className="flex flex-col">
          {NAV_SECTIONS.map((section) => {
            const isActive = selected === section.key;
            return (
              <li key={section.key} className="mb-1">
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mx-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#001f3f] ${isActive ? "bg-blue-600 text-white font-semibold shadow-sm" : "hover:bg-[#003366] text-gray-300"}`}
                  onClick={() => setSelected(section.key)}
                >
                  <span className="text-lg" aria-hidden="true">{section.icon}</span>
                  <span className="font-medium">{section.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-[#003366] p-4 flex flex-col gap-3">
        {user && (
          <div className="text-sm text-gray-200 bg-[#003366] rounded-lg p-3">
            <div className="font-medium truncate" title={user.email ?? "User"}>
              {user.email ?? "User"}
            </div>
            <div className="text-xs text-gray-400 capitalize mt-1">
              {user.role ?? "No role assigned"}
            </div>
          </div>
        )}
        <SignOutButton />
      </div>
    </aside>
  );
}
