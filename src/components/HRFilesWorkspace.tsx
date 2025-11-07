import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function HRFilesWorkspace() {
  const [activeTab, setActiveTab] = useState<"files" | "expiring" | "logs">("files");
  const [selectedEmployee, setSelectedEmployee] = useState<Id<"employees"> | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    employeeId: "" as Id<"employees"> | "",
    fileType: "",
    notes: "",
    expiresAt: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Data queries
  const allHRFiles = useQuery(api.hrFiles.getAllHRFiles) || [];
  const employees = useQuery(api.employees.getAllEmployees) || [];
  const expiringFiles = useQuery(api.hrFiles.getExpiringHRFiles, { daysAhead: 30 }) || [];
  const accessLogs = useQuery(api.hrFiles.getHRFileAccessLogs, {}) || [];
  const fileTypes = useQuery(api.hrFiles.getHRFileTypes) || [];

  // Mutations
  const generateUploadUrl = useMutation(api.hrFiles.generateHRFileUploadUrl);
  const uploadHRFile = useMutation(api.hrFiles.uploadHRFile);
  const archiveHRFile = useMutation(api.hrFiles.archiveHRFile);
  const getDownloadUrl = useMutation(api.hrFiles.getHRFileDownloadUrl);

  const filteredFiles = selectedEmployee 
    ? allHRFiles.filter(file => file.employeeId === selectedEmployee)
    : allHRFiles;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadForm.employeeId || !uploadForm.fileType) {
      toast.error("Please fill in all required fields and select a file");
      return;
    }

    setIsUploading(true);
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file to storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await result.json();

      // Save file metadata
      await uploadHRFile({
        employeeId: uploadForm.employeeId,
        fileStorageId: storageId,
        fileType: uploadForm.fileType,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        contentType: selectedFile.type,
        expiresAt: uploadForm.expiresAt ? new Date(uploadForm.expiresAt).getTime() : undefined,
        notes: uploadForm.notes || undefined,
      });

      toast.success("HR file uploaded successfully!");
      setShowUploadModal(false);
      setUploadForm({ employeeId: "", fileType: "", notes: "", expiresAt: "" });
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload HR file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (hrFileId: Id<"hr_files">, fileName: string) => {
    try {
      const url = await getDownloadUrl({ hrFileId });
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("File download started");
      } else {
        toast.error("Failed to get download URL");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to download file");
    }
  };

  const handleArchive = async (hrFileId: Id<"hr_files">) => {
    if (!confirm("Are you sure you want to archive this HR file? This action cannot be undone.")) {
      return;
    }

    try {
      await archiveHRFile({ hrFileId });
      toast.success("HR file archived successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to archive HR file");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getExpiryStatus = (expiresAt?: number) => {
    if (!expiresAt) return { status: "none", color: "text-gray-500", text: "No expiry" };
    
    const now = Date.now();
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    
    if (daysUntilExpiry < 0) {
      return { status: "expired", color: "text-red-600", text: "Expired" };
    } else if (daysUntilExpiry <= 7) {
      return { status: "critical", color: "text-red-600", text: `${daysUntilExpiry}d left` };
    } else if (daysUntilExpiry <= 30) {
      return { status: "warning", color: "text-yellow-600", text: `${daysUntilExpiry}d left` };
    } else {
      return { status: "good", color: "text-green-600", text: `${daysUntilExpiry}d left` };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">HR Files Management</h2>
          <p className="text-gray-600 mt-1">Manage employee documents and certifications</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Upload HR File
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("files")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "files"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All Files ({allHRFiles.length})
          </button>
          <button
            onClick={() => setActiveTab("expiring")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "expiring"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Expiring Soon ({expiringFiles.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "logs"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Access Logs ({accessLogs.length})
          </button>
        </nav>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto p-6">
            <h3 className="text-lg font-semibold mb-4">Upload HR File</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee *
                </label>
                <select
                  value={uploadForm.employeeId}
                  onChange={(e) => setUploadForm({ ...uploadForm, employeeId: e.target.value as Id<"employees"> })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select employee...</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name} - {employee.workEmail}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Type *
                </label>
                <select
                  value={uploadForm.fileType}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileType: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select file type...</option>
                  {fileTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File *
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG (max 10MB)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={uploadForm.expiresAt}
                  onChange={(e) => setUploadForm({ ...uploadForm, expiresAt: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Additional notes about this file..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadForm({ employeeId: "", fileType: "", notes: "", expiresAt: "" });
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* All Files Tab */}
      {activeTab === "files" && (
        <div className="space-y-4">
          {/* Employee Filter */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Employee:</label>
              <select
                value={selectedEmployee || ""}
                onChange={(e) => setSelectedEmployee(e.target.value as Id<"employees"> || null)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Employees</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name} - {employee.workEmail}
                  </option>
                ))}
              </select>
              {selectedEmployee && (
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>

          {/* Files List */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        No HR files found.
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((file) => {
                      const expiryStatus = getExpiryStatus(file.expiresAt);
                      return (
                        <tr key={file._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{file.employeeName}</div>
                              <div className="text-sm text-gray-500">{file.employeeEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {file.fileType}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{file.fileName}</div>
                            {file.notes && (
                              <div className="text-sm text-gray-500 mt-1">{file.notes}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatFileSize(file.fileSize)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${expiryStatus.color}`}>
                              {expiryStatus.text}
                            </div>
                            {file.expiresAt && (
                              <div className="text-xs text-gray-500">
                                {formatDate(file.expiresAt)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(file.uploadedAt)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleDownload(file._id, file.fileName)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Download
                              </button>
                              <button
                                onClick={() => handleArchive(file._id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Archive
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Files Tab */}
      {activeTab === "expiring" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Files Expiring in Next 30 Days</h3>
              <p className="text-sm text-gray-600 mt-1">
                Monitor and renew expiring employee documents and certifications.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Left
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expiringFiles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No files expiring in the next 30 days.
                      </td>
                    </tr>
                  ) : (
                    expiringFiles.map((file) => (
                      <tr key={file._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{file.employeeName}</div>
                            <div className="text-sm text-gray-500">{file.employeeEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {file.fileType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{file.fileName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(file.expiresAt!)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            file.daysUntilExpiry <= 7 
                              ? "bg-red-100 text-red-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {file.daysUntilExpiry} days
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDownload(file._id, file.fileName)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Access Logs Tab */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">HR File Access Logs</h3>
              <p className="text-sm text-gray-600 mt-1">
                Audit trail of all HR file access and modifications.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accessLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No access logs found.
                      </td>
                    </tr>
                  ) : (
                    accessLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDateTime(log.timestamp)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                            <div className="text-sm text-gray-500">{log.userEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.action === "upload" ? "bg-green-100 text-green-800" :
                            log.action === "download" ? "bg-blue-100 text-blue-800" :
                            log.action === "archive" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{log.fileName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {log.success ? "Success" : "Failed"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
