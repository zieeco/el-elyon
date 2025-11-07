export default function LogDetailModal({ log, onClose }: { log: any; onClose: () => void }) {
  // Parse the log content if it's a JSON string
  let parsedContent: any = {};
  let parseError = false;
  try {
    parsedContent = JSON.parse(log.content);
    console.log('Parsed log content:', parsedContent);
  } catch (e) {
    // If parsing fails, treat it as plain text
    parsedContent = { 'Raw Content': log.content };
    parseError = true;
    console.log('Failed to parse log content, showing raw:', log.content);
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold">Care Log Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Resident</label>
              <p className="text-lg font-semibold text-gray-900">{log.residentName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Location</label>
              <p className="text-gray-900">{log.residentLocation}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Template</label>
                <p className="text-gray-900">{log.template}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Version</label>
                <p className="text-gray-900">v{log.version}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Author</label>
              <p className="text-gray-900">{log.authorName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date & Time</label>
              <p className="text-gray-900">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-2">Log Details</label>
              <div className="mt-2 space-y-3">
                {Object.entries(parsedContent).map(([key, value]) => (
                  <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                      {key.replace(/_/g, ' ')}
                    </label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {value === '' || value === null || value === undefined ? (
                        <span className="text-gray-400 italic">Not specified</span>
                      ) : typeof value === 'object' ? (
                        JSON.stringify(value, null, 2)
                      ) : (
                        String(value)
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
