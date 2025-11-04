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
    const errorStatuses = ['Failed', 'CrashLoopBackOff', 'OOMKilled', 'ImagePullBackOff', 'ErrImagePull', 'Error', 'Terminated', 'Unknown'];
    const isError = errorStatuses.some(s => status.includes(s));
    
    return {
      isError,
      statusColor: isError ? 'text-red-300 bg-red-900/50 border-red-700/50' : 'text-emerald-300 bg-emerald-900/50 border-emerald-700/50'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-slate-300 mt-4 text-base">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-800">
      {/* Darker Header */}
      <header className="bg-slate-900 border-b border-slate-700">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white">Kubernetes Monitor</h1>
                <p className="text-base text-slate-400">AI-Powered Resolution</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-emerald-900/50 px-4 py-2 rounded-full border border-emerald-700/50">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-base font-medium text-emerald-300">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Grid - Darker with larger text */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          {/* Namespaces */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 hover:border-indigo-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base text-slate-300 mb-2">Namespaces</p>
                <p className="text-3xl font-semibold text-white">{stats?.total_namespaces || 0}</p>
              </div>
              <div className="w-14 h-14 bg-indigo-600/30 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Pods */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 hover:border-blue-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base text-slate-300 mb-2">Total Pods</p>
                <p className="text-3xl font-semibold text-white">{stats?.total_pods || 0}</p>
              </div>
              <div className="w-14 h-14 bg-blue-600/30 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Healthy Pods */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 hover:border-emerald-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base text-slate-300 mb-2">Healthy</p>
                <p className="text-3xl font-semibold text-white">3</p>
              </div>
              <div className="w-14 h-14 bg-emerald-600/30 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Error Pods */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 hover:border-red-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base text-slate-300 mb-2">Errors</p>
                <p className="text-3xl font-semibold text-white">2</p>
              </div>
              <div className="w-14 h-14 bg-red-600/30 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Pods List - Takes 3 columns */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Pods in <span className="text-indigo-400">{selectedNamespace?.name || 'namespace'}</span>
              </h2>
              <span className="text-base text-slate-400">{pods.length} pod{pods.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Pods Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pods.map((pod) => {
                const statusInfo = getPodStatusInfo(pod.status);
                return (
                  <button
                    key={pod.id}
                    onClick={() => handlePodClick(pod)}
                    className={`bg-slate-700 rounded-lg p-6 border-2 transition-all hover:shadow-lg text-left ${
                      statusInfo.isError 
                        ? 'border-red-500 hover:border-red-400' 
                        : 'border-emerald-500 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white mb-2">{pod.name}</h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.statusColor}`}>
                          {pod.status}
                        </span>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full ${statusInfo.isError ? 'bg-red-400' : 'bg-emerald-400'}`}></div>
                    </div>
                    
                    {pod.error_count > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-600">
                        <span className="text-sm text-red-400 font-medium">
                          {pod.error_count} error{pod.error_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {pods.length === 0 && (
              <div className="bg-slate-700 rounded-lg p-12 text-center border border-slate-600">
                <svg className="w-16 h-16 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-base text-slate-400">No pods found in this namespace</p>
              </div>
            )}
          </div>

          {/* Errors Sidebar - Takes 1 column */}
          <div className="lg:col-span-1">
            <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden sticky top-6">
              <div className="bg-slate-800 px-5 py-4 border-b border-slate-600">
                <h3 className="text-base font-semibold text-white">Critical Errors</h3>
              </div>
              <div className="divide-y divide-slate-600 max-h-96 overflow-y-auto">
                {recentErrors.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-base text-slate-400">No errors</p>
                  </div>
                ) : (
                  recentErrors.map((error, index) => (
                    <button
                      key={error.id}
                      onClick={() => {
                        const pod = pods.find(p => p.name === error.pod_name);
                        if (pod) handlePodClick(pod);
                      }}
                      className="w-full p-4 hover:bg-slate-600 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-white text-base">{error.pod_name}</span>
                        {error.priority && <PriorityBadge priority={error.priority} />}
                      </div>
                      <p className="text-sm text-slate-400 mb-2 line-clamp-2">{error.error_message}</p>
                      {/* <span className="text-sm text-slate-500">{formatTimestamp(error.created_at)}</span> */}
                    </button>
                  ))
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
          isOpen={showErrorModal}
          onClose={() => {
            setShowErrorModal(false);
            setSelectedPod(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
