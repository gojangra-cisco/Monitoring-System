import { useState, useEffect } from 'react';
import axios from 'axios';
import ErrorModal from './components/ErrorModal';
import PriorityBadge from './components/PriorityBadge';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState(null);
  const [pods, setPods] = useState([]);
  const [stats, setStats] = useState(null);
  const [recentErrors, setRecentErrors] = useState([]);
  const [selectedPod, setSelectedPod] = useState(null);
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
      const response = await axios.get(`${API_BASE_URL}/api/errors/recent?limit=15`);
      setRecentErrors(response.data);
    } catch (error) {
      console.error('Error fetching recent errors:', error);
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
    setShowErrorModal(true);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getPodStatusInfo = (status) => {
    const errorStatuses = ['Failed', 'CrashLoopBackOff', 'OOMKilled', 'ImagePullBackOff', 'Error', 'Terminated', 'Unknown'];
    const isError = errorStatuses.includes(status);
    
    return {
      isError,
      icon: isError ? (
        <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      borderColor: isError ? 'border-red-500' : 'border-green-500',
      bgGradient: isError ? 'from-red-500/10 to-red-500/5' : 'from-green-500/10 to-green-500/5',
      statusColor: isError ? 'bg-red-500/20 text-red-300 border-red-500' : 'bg-green-500/20 text-green-300 border-green-500'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4 text-lg">Loading Kubernetes Monitoring Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Hero Header */}
      <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-2xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center transform hover:rotate-12 transition-transform">
                <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Kubernetes Monitor</h1>
                <p className="text-blue-100 text-lg">AI-Powered Pod Health & Error Resolution</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white font-medium">Live</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Namespaces */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-6 border border-blue-500/30 hover:border-blue-400 transition-all transform hover:scale-105 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-blue-400">{stats?.total_namespaces || 0}</span>
            </div>
            <p className="text-gray-400 font-medium">Namespaces</p>
          </div>

          {/* Total Pods */}
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-6 border border-purple-500/30 hover:border-purple-400 transition-all transform hover:scale-105 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-purple-400">{stats?.total_pods || 0}</span>
            </div>
            <p className="text-gray-400 font-medium">Total Pods</p>
          </div>

          {/* Running Pods */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-6 border border-green-500/30 hover:border-green-400 transition-all transform hover:scale-105 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-green-400">{stats?.running_pods || 0}</span>
            </div>
            <p className="text-gray-400 font-medium">Healthy Pods</p>
          </div>

          {/* Error Pods */}
          <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl p-6 border border-red-500/30 hover:border-red-400 transition-all transform hover:scale-105 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-red-500/30 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-red-400">{stats?.error_pods || 0}</span>
            </div>
            <p className="text-gray-400 font-medium">Error Pods</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Namespaces */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Namespaces
                </h2>
              </div>
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {namespaces.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No namespaces found</p>
                ) : (
                  namespaces.map((ns) => (
                    <button
                      key={ns.id}
                      onClick={() => setSelectedNamespace(ns)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                        selectedNamespace?.id === ns.id
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
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

            {/* Priority Errors */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Critical Errors
                </h2>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {recentErrors.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-400">No recent errors!</p>
                  </div>
                ) : (
                  recentErrors.map((error) => (
                    <div key={error.id} className="bg-gray-800/50 rounded-lg p-3 border-l-4 border-red-500 hover:bg-gray-800 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-wrap gap-2">
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-mono">
                            {error.error_type}
                          </span>
                          {error.priority && <PriorityBadge priority={error.priority} />}
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">
                        <span className="font-semibold text-white">{error.pod_name}</span>
                        <span className="text-gray-500"> @ {error.namespace_name}</span>
                      </p>
                      <p className="text-xs text-gray-400 truncate mb-2">{error.message}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">{formatTimestamp(error.timestamp)}</p>
                        {error.ai_resolution_status && error.ai_resolution_status !== 'not_started' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                            🤖 AI Active
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Pod Dashboard */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Pods in <span className="ml-2 font-bold">{selectedNamespace?.name || 'Select namespace'}</span>
                </h2>
              </div>
              <div className="p-6">
                {pods.length === 0 ? (
                  <div className="text-center py-16">
                    <svg className="w-20 h-20 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-gray-400 text-lg">No pods found in this namespace</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pods.map((pod) => {
                      const statusInfo = getPodStatusInfo(pod.status);
                      return (
                        <div
                          key={pod.id}
                          onClick={() => handlePodClick(pod)}
                          className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1 bg-gradient-to-br ${statusInfo.bgGradient} ${statusInfo.borderColor}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3 flex-1">
                              {statusInfo.icon}
                              <h3 className="font-bold text-lg text-white">{pod.name}</h3>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusInfo.statusColor}`}>
                              {pod.status.toUpperCase()}
                            </span>
                            {pod.error_count > 0 && (
                              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500 animate-pulse">
                                {pod.error_count} {pod.error_count === 1 ? 'error' : 'errors'}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-400 mt-3">
                            Last check: {formatTimestamp(pod.last_check)}
                          </p>

                          {/* Click hint */}
                          <div className="mt-3 text-xs text-gray-500 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Click for details
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && selectedPod && (
        <ErrorModal
          pod={selectedPod}
          onClose={() => {
            setShowErrorModal(false);
            setSelectedPod(null);
          }}
        />
      )}

      {/* Footer */}
      <footer className="container mx-auto px-6 py-6 mt-8 text-center text-gray-500">
        <p className="text-sm">
          🚀 Kubernetes Monitoring Dashboard with AI-Powered Resolution
        </p>
      </footer>
    </div>
  );
}

export default App;
