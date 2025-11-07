import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import CareShiftWorkspace from "./CareShiftWorkspace";
import CareResidentsWorkspace from "./CareResidentsWorkspace";
import CareLogsWorkspace from "./CareLogsWorkspace";
import CareProfileWorkspace from "./CareProfileWorkspace";
import SupervisorTeamWorkspace from "./SupervisorTeamWorkspace";
import SupervisorComplianceWorkspace from "./SupervisorComplianceWorkspace";

export default function CarePortal() {
  const [activeView, setActiveView] = useState("shift");
  const sessionInfo = useQuery(api.access.getSessionInfo);
  const logActivity = useMutation(api.access.logSessionActivity);
  const currentShift = useQuery(api.care.getCurrentShift);

  const isSupervisor = sessionInfo?.role === "supervisor";
  const isClockedIn = !!currentShift;

  const navigationItems = [
    { id: "shift", label: "Shift", icon: "⏰", description: "Clock in/out" },
    { id: "residents", label: "Residents", icon: "🏠", description: "Location-scoped list" },
    { id: "logs", label: "Logs", icon: "📝", description: "Create & view logs" },
    { id: "profile", label: "My Profile", icon: "👤", description: "Credentials & acknowledgments" },
  ];

  const supervisorItems = [
    { id: "team", label: "Team", icon: "👥", description: "Time exceptions" },
    { id: "compliance", label: "Compliance", icon: "📋", description: "ISPs author/publish" },
  ];

  const handleNavigation = (viewId: string) => {
    setActiveView(viewId);
    logActivity({
      activity: "navigate_care_portal",
      details: `view=${viewId}`,
    });
  };

  const renderContent = () => {
    // If not clocked in, always show shift workspace
    if (!isClockedIn) {
      return <CareShiftWorkspace />;
    }
    switch (activeView) {
      case "shift":
        return <CareShiftWorkspace />;
      case "residents":
        return <CareResidentsWorkspace />;
      case "logs":
        return <CareLogsWorkspace />;
      case "profile":
        return <CareProfileWorkspace />;
      case "team":
        return isSupervisor ? <SupervisorTeamWorkspace /> : <div>Access denied</div>;
      case "compliance":
        return isSupervisor ? <SupervisorComplianceWorkspace /> : <div>Access denied</div>;
      default:
        return <CareShiftWorkspace />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-64 bg-[#002a52] shadow-sm border-r border-[#003d73] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#003d73]">
          <h1 className="text-xl font-bold text-white">Care Portal</h1>
          {sessionInfo?.user && (
            <div className="mt-2 text-sm text-gray-300">
              {sessionInfo.user.name}
              {sessionInfo.role && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                  {sessionInfo.role.charAt(0).toUpperCase() + sessionInfo.role.slice(1)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors ${activeView === item.id
                  ? "bg-blue-600 text-white border border-blue-500"
                  : "text-gray-300 hover:bg-[#003d73]"
                } ${!isClockedIn && item.id !== "shift" ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={!isClockedIn && item.id !== "shift"}
              >
                <span className="text-lg mr-3" role="img" aria-label={item.label}>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.label}</div>
                  <div className={`text-xs truncate ${activeView === item.id ? "text-blue-100" : "text-gray-400"}`}>{item.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Supervisor Tools */}
          {isSupervisor && (
            <div className="pt-4 border-t border-[#003d73]">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Supervisor Tools
              </div>
              <div className="space-y-1">
                {supervisorItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors ${activeView === item.id
                      ? "bg-purple-600 text-white border border-purple-500"
                      : "text-gray-300 hover:bg-[#003d73]"
                    } ${!isClockedIn ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={!isClockedIn}
                  >
                    <span className="text-lg mr-3" role="img" aria-label={item.label}>
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.label}</div>
                      <div className={`text-xs truncate ${activeView === item.id ? "text-purple-100" : "text-gray-400"}`}>{item.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#003d73]">
          <SignOutButton />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {!isClockedIn && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-center font-medium">
              You must clock in to access the rest of the Care Portal.
            </div>
          )}
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
