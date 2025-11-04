import { useState, useEffect } from 'react';
import AIResolutionPanel from './AIResolutionPanel';
import PriorityBadge from './PriorityBadge';

const ErrorModal = ({ pod, onClose }) => {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchErrors();
  }, [pod]);

  const fetchErrors = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/pods/${pod.id}/errors`);
      const data = await response.json();
      setErrors(data);
    } catch (error) {
      console.error('Error fetching pod errors:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-slate-600">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white flex items-center">
                <svg className="w-7 h-7 mr-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                {pod.name}
              </h2>
              <p className="text-slate-400 text-base mt-1">
                Detailed Error Analysis & AI Resolution
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] bg-slate-800">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-indigo-500"></div>
            </div>
          ) : errors.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-emerald-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-300 text-lg">No errors detected - Pod is running healthy!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Show AI Resolution for dashboard */}
              {pod.name === 'dashboard' && (
                <AIResolutionPanel error={errors[0]} podName={pod.name} />
              )}

              {/* Show AI Resolution for postgres */}
              {pod.name === 'postgres' && (
                <AIResolutionPanel error={errors[0]} podName={pod.name} />
              )}

              {/* Error List */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Error Details
                  <span className="ml-3 text-base text-slate-400">({errors.length} total)</span>
                </h3>

                <div className="space-y-3">
                  {errors.map((error) => (
                    <div
                      key={error.id}
                      className="bg-slate-700 rounded-lg p-5 border-l-4 border-red-500 hover:shadow-lg hover:shadow-red-500/10 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm bg-red-900/50 text-red-300 px-3 py-1 rounded font-mono border border-red-700/50">
                            {error.error_type}
                          </span>
                          {error.priority && <PriorityBadge priority={error.priority} />}
                        </div>
                        <span className="text-sm text-slate-400">
                          {new Date(error.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-300 text-base font-mono">{error.message}</p>

                      {error.ai_resolution_status && error.ai_resolution_status !== 'not_started' && (
                        <div className="mt-3 flex items-center space-x-2">
                          <span className="text-sm text-slate-400">AI Status:</span>
                          <span className={`text-sm px-3 py-1 rounded border ${
                            error.ai_resolution_status === 'resolved' ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50' :
                            error.ai_resolution_status === 'analyzing' ? 'bg-blue-900/50 text-blue-300 border-blue-700/50' :
                            error.ai_resolution_status === 'resolving' ? 'bg-amber-900/50 text-amber-300 border-amber-700/50' :
                            error.ai_resolution_status === 'manual_required' ? 'bg-red-900/50 text-red-300 border-red-700/50' :
                            'bg-slate-700 text-slate-300 border-slate-600'
                          }`}>
                            {error.ai_resolution_status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
