import React, { useState } from "react";
import ResidentsWorkspace from "./ResidentsWorkspace";
import GuardiansWorkspace from "./GuardiansWorkspace";
import EmployeeWorkspace from "./EmployeeWorkspace";
import HRFilesWorkspace from "./HRFilesWorkspace";

const PEOPLE_SECTIONS = [
  {
    key: "residents",
    title: "Residents",
    description: "Manage resident profiles and information",
    icon: "🏠",
    color: "bg-blue-50 border-blue-200 text-blue-700"
  },
  {
    key: "guardians",
    title: "Guardians",
    description: "Manage guardian contacts and relationships",
    icon: "👨‍👩‍👧‍👦",
    color: "bg-green-50 border-green-200 text-green-700"
  },
  {
    key: "employees",
    title: "Employees",
    description: "Manage staff and employee information",
    icon: "👥",
    color: "bg-purple-50 border-purple-200 text-purple-700"
  },
  {
    key: "hr-files",
    title: "HR Files",
    description: "Manage employee documents and certifications",
    icon: "📄",
    color: "bg-orange-50 border-orange-200 text-orange-700"
  }
];

export default function PeopleWorkspace() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (activeSection === "residents") {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveSection(null)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to People
          </button>
          <h3 className="text-2xl font-bold text-gray-900">Residents</h3>
        </div>
        <ResidentsWorkspace />
      </div>
    );
  }

  if (activeSection === "guardians") {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveSection(null)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to People
          </button>
          <h3 className="text-2xl font-bold text-gray-900">Guardians</h3>
        </div>
        <GuardiansWorkspace />
      </div>
    );
  }

  if (activeSection === "employees") {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveSection(null)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to People
          </button>
          <h3 className="text-2xl font-bold text-gray-900">Employees</h3>
        </div>
        <EmployeeWorkspace />
      </div>
    );
  }

  if (activeSection === "hr-files") {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveSection(null)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to People
          </button>
          <h3 className="text-2xl font-bold text-gray-900">HR Files</h3>
        </div>
        <HRFilesWorkspace />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PEOPLE_SECTIONS.map((section) => (
          <div
            key={section.key}
            className={section.color + " border-2 rounded-lg p-6 cursor-pointer hover:shadow-md transition-all duration-200"}
            onClick={() => setActiveSection(section.key)}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="text-3xl">{section.icon}</div>
              <div>
                <h3 className="text-lg font-semibold">{section.title}</h3>
              </div>
            </div>
            <p className="text-sm opacity-80 mb-4">{section.description}</p>
            <div className="text-right">
              <span className="text-sm font-medium">Manage →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
