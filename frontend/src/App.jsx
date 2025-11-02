import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState(null);
  const [pods, setPods] = useState([]);
  const [stats, setStats] = useState(null);
  const [recentErrors, setRecentErrors] = useState([]);
  const [selectedPod, setSelectedPod] = useState(null);
  const [podErrors, setPodErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch namespaces
  const fetchNamespaces = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/namespaces`);
      setNamespaces(response.data);
      if (response.data.length > 0 && !selectedNamespace) {
        setSelectedNamespace(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching namespaces:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pods for selected namespace
  const fetchPods = async (namespaceId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/namespaces/${namespaceId}/pods`);
      setPods(response.data);
    } catch (error) {
      console.error('Error fetching pods:', error);
    }
  };

  // Fetch recent errors
  const fetchRecentErrors = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/errors/recent?limit=10`);
      setRecentErrors(response.data);
    } catch (error) {
      console.error('Error fetching recent errors:', error);
    }
  };

  // Fetch errors for a specific pod
  const fetchPodErrors = async (podId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/pods/${podId}/errors?limit=50`);
      setPodErrors(response.data);
    } catch (error) {
      console.error('Error fetching pod errors:', error);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchStats();
    fetchNamespaces();
    fetchRecentErrors();

    // Refresh data every 5 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchNamespaces();
      fetchRecentErrors();
      if (selectedNamespace) {
        fetchPods(selectedNamespace.id);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fetch pods when namespace changes
  useEffect(() => {
    if (selectedNamespace) {
      fetchPods(selectedNamespace.id);
    }
  }, [selectedNamespace]);

  // Handle pod click to show errors
  const handlePodClick = async (pod) => {
    setSelectedPod(pod);
    await fetchPodErrors(pod.id);
    setShowErrorModal(true);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Kubernetes Pod Monitor
              </h1>
              <p className="text-gray-400 text-sm mt-1">Real-time pod monitoring across namespaces</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Dashboard */}
      {stats && (
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Namespaces</p>
                  <p className="text-3xl font-bold mt-1">{stats.total_namespaces || 0}</p>
                </div>
                <div className="bg-blue-500 bg-opacity-20 p-3 rounded-lg">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Running Pods</p>
                  <p className="text-3xl font-bold mt-1 text-green-400">{stats.running_pods || 0}</p>
                </div>
                <div className="bg-green-500 bg-opacity-20 p-3 rounded-lg">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Error Pods</p>
                  <p className="text-3xl font-bold mt-1 text-red-400">{stats.error_pods || 0}</p>
                </div>
                <div className="bg-red-500 bg-opacity-20 p-3 rounded-lg">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Errors Today</p>
                  <p className="text-3xl font-bold mt-1 text-yellow-400">{stats.total_errors_today || 0}</p>
                </div>
                <div className="bg-yellow-500 bg-opacity-20 p-3 rounded-lg">
                  <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Namespace List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold">Namespaces</h2>
              </div>
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {namespaces.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No namespaces found</p>
                ) : (
                  namespaces.map((ns) => (
                    <button
                      key={ns.id}
                      onClick={() => setSelectedNamespace(ns)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                        selectedNamespace?.id === ns.id
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{ns.name}</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Recent Errors */}
            <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 mt-6">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold">Recent Errors</h2>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {recentErrors.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No recent errors</p>
                ) : (
                  recentErrors.map((error) => (
                    <div key={error.id} className="bg-gray-700 rounded-lg p-3 border-l-4 border-red-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs bg-red-500 bg-opacity-20 text-red-400 px-2 py-1 rounded">
                              {error.error_type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mb-1">
                            <span className="font-medium">{error.pod_name}</span>
                            <span className="text-gray-500"> @ {error.namespace_name}</span>
                          </p>
                          <p className="text-xs text-gray-400 truncate">{error.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatTimestamp(error.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Pod Status Dashboard */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold">
                  Pods in {selectedNamespace?.name || 'Select a namespace'}
                </h2>
              </div>
              <div className="p-6">
                {pods.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-gray-400">No pods found in this namespace</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pods.map((pod) => (
                      <div
                        key={pod.id}
                        onClick={() => handlePodClick(pod)}
                        className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
                          pod.status === 'running'
                            ? 'bg-gray-750 border-green-500 hover:border-green-400'
                            : 'bg-gray-750 border-red-500 hover:border-red-400'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {pod.status === 'running' ? (
                                <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              )}
                              <h3 className="font-semibold text-lg">{pod.name}</h3>
                            </div>
                            <div className="flex items-center space-x-3 text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                pod.status === 'running'
                                  ? 'bg-green-500 bg-opacity-20 text-green-300'
                                  : 'bg-red-500 bg-opacity-20 text-red-300'
                              }`}>
                                {pod.status.toUpperCase()}
                              </span>
                              {pod.error_count > 0 && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500 bg-opacity-20 text-yellow-300">
                                  {pod.error_count} errors
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              Last check: {formatTimestamp(pod.last_check)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && selectedPod && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{selectedPod.name}</h3>
                <p className="text-gray-400 text-sm mt-1">Error Logs</p>
              </div>
              <button
                onClick={() => setShowErrorModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {podErrors.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No errors found for this pod</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {podErrors.map((error) => (
                    <div key={error.id} className="bg-gray-900 rounded-lg p-4 border-l-4 border-red-500">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs bg-red-500 bg-opacity-20 text-red-400 px-2 py-1 rounded font-mono">
                          {error.error_type}
                        </span>
                        <span className="text-xs text-gray-500">{formatTimestamp(error.timestamp)}</span>
                      </div>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-950 p-3 rounded mt-2">
                        {error.message}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
