import { useState, useEffect } from 'react';

const AIResolutionPanel = ({ error, podName }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('analyzing');
  const [commandLines, setCommandLines] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // Dashboard: AI fixes the image pull error with line-by-line commands
  const dashboardSteps = [
    {
      title: 'Analyzing Error',
      description: 'AI Agent detected ImagePullBackOff',
      icon: '🔍',
      duration: 2000
    },
    {
      title: 'Searching Solutions',
      description: 'Querying knowledge base',
      icon: '🔎',
      duration: 2000
    },
    {
      title: 'Generating Fix',
      description: 'Creating solution',
      icon: '⚙️',
      duration: 2000,
      commands: [
        'kubectl get pod dashboard -n hackathon',
        'kubectl describe pod dashboard -n hackathon | grep Image',
        'kubectl set image pod/dashboard dashboard=nginx:latest -n hackathon'
      ]
    },
    {
      title: 'Applying Fix',
      description: 'Executing commands',
      icon: '🚀',
      duration: 3000
    },
    {
      title: 'Verified',
      description: 'Pod is now running successfully',
      icon: '✅',
      duration: 1000
    }
  ];

  // Postgres: AI tries but cannot fix P0 corruption
  const postgresSteps = [
    {
      title: 'Analyzing Critical Error',
      description: 'AI detected P0 data corruption',
      icon: '🔍',
      duration: 2000
    },
    {
      title: 'Assessing Severity',
      description: 'Evaluating recovery options',
      icon: '⚠️',
      duration: 2000
    },
    {
      title: 'Attempting Recovery',
      description: 'Running diagnostic commands',
      icon: '🔧',
      duration: 3000,
      commands: [
        'kubectl logs postgres -n hackathon --tail=50',
        'kubectl exec postgres -n hackathon -- pg_isready',
        'kubectl exec postgres -n hackathon -- pg_resetwal -f /data'
      ]
    },
    {
      title: 'AI Assessment',
      description: 'Auto-recovery failed',
      icon: '🤖',
      duration: 2000
    },
    {
      title: 'Manual Required ⚠️',
      description: 'Escalating to P0 - Human DBA needed',
      icon: '🚨',
      duration: 1000,
      isFailure: true
    }
  ];

  const steps = podName === 'dashboard' ? dashboardSteps : postgresSteps;

  useEffect(() => {
    let stepTimer;
    let commandTimer;
    let commandIndex = 0;

    const runStepSequence = async () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];

        // If this step has commands, show them line by line
        if (step.commands && step.commands.length > 0) {
          setIsExecuting(true);
          setCommandLines([]);

          const showCommands = () => {
            if (commandIndex < step.commands.length) {
              setCommandLines(prev => [...prev, {
                text: step.commands[commandIndex],
                timestamp: new Date().toLocaleTimeString()
              }]);
              commandIndex++;
              
              // Wait 1 second before next command
              commandTimer = setTimeout(showCommands, 1000);
            } else {
              // All commands shown, wait a bit then move to next step
              setIsExecuting(false);
              commandIndex = 0;
              stepTimer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
              }, 1000);
            }
          };

          // Wait 500ms before starting to show commands
          setTimeout(showCommands, 500);
        } else {
          // No commands, just wait the duration then move to next step
          stepTimer = setTimeout(() => {
            setCurrentStep(prev => prev + 1);
          }, step.duration);
        }

        // Update status
        if (step.isFailure) {
          setStatus('manual_required');
        } else if (currentStep === steps.length - 1 && !step.isFailure) {
          setStatus('resolved');
        }
      }
    };

    runStepSequence();

    return () => {
      clearTimeout(stepTimer);
      clearTimeout(commandTimer);
    };
  }, [currentStep, podName]);

  const getStepStatus = (index) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'in-progress';
    return 'pending';
  };

  const getStatusColor = (stepStatus) => {
    switch (stepStatus) {
      case 'completed': return 'text-emerald-400 border-emerald-500 bg-emerald-900/30';
      case 'in-progress': return 'text-indigo-400 border-indigo-500 bg-indigo-900/30';
      case 'pending': return 'text-slate-500 border-slate-600 bg-slate-800';
      default: return 'text-slate-500 border-slate-600 bg-slate-800';
    }
  };

  return (
    <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-lg bg-indigo-600/30 flex items-center justify-center">
            <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">AI Agent Resolution</h3>
            <p className="text-base text-slate-300">Live Command Execution</p>
          </div>
        </div>
        {status === 'manual_required' && (
          <span className="px-4 py-2 bg-red-900/50 text-red-300 rounded-full text-base font-medium border border-red-700/50">
            P0 - Manual Required
          </span>
        )}
        {status === 'resolved' && (
          <span className="px-4 py-2 bg-emerald-900/50 text-emerald-300 rounded-full text-base font-medium border border-emerald-700/50">
            ✓ Resolved
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(index);
          const isActive = index === currentStep;

          return (
            <div
              key={index}
              className={`relative pl-8 pb-4 ${
                index < steps.length - 1 ? 'border-l-2' : ''
              } ${
                stepStatus === 'completed' ? 'border-emerald-400' : 
                stepStatus === 'in-progress' ? 'border-indigo-400' : 
                'border-slate-300'
              } transition-all duration-500`}
            >
              {/* Step Icon */}
              <div className={`absolute left-0 -translate-x-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center text-lg ${
                getStatusColor(stepStatus)
              }`}>
                {step.icon}
              </div>

              {/* Step Content */}
              <div className={`ml-6 ${stepStatus !== 'pending' ? 'opacity-100' : 'opacity-40'} transition-opacity duration-500`}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-base font-semibold text-white">{step.title}</h4>
                  {isActive && stepStatus === 'in-progress' && (
                    <div className="flex space-x-1">
                      <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  )}
                  {stepStatus === 'completed' && (
                    <span className="text-emerald-400 text-base">✓</span>
                  )}
                </div>
                <p className="text-base text-slate-300">{step.description}</p>
                
                {/* Command Terminal - Shows commands line by line */}
                {isActive && step.commands && commandLines.length > 0 && (
                  <div className="mt-3 bg-slate-900 rounded-lg p-4 border border-slate-700 font-mono text-sm">
                    <div className="flex items-center space-x-2 mb-3 text-slate-400">
                      <span className="text-emerald-400">●</span>
                      <span className="text-sm">Terminal - Live Execution</span>
                    </div>
                    {commandLines.map((cmd, idx) => (
                      <div key={idx} className="mb-2 animate-fadeIn">
                        <div className="flex items-center space-x-2 text-slate-500 text-sm mb-1">
                          <span>[{cmd.timestamp}]</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-emerald-400">$</span>
                          <code className="text-blue-300 flex-1">{cmd.text}</code>
                        </div>
                        {idx < commandLines.length - 1 && (
                          <div className="text-slate-500 text-sm ml-4 mt-1">
                            ✓ Executed successfully
                          </div>
                        )}
                        {idx === commandLines.length - 1 && isExecuting && (
                          <div className="text-indigo-400 text-sm ml-4 mt-1 animate-pulse">
                            ⏳ Executing...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Failure Message for Postgres */}
                {step.isFailure && stepStatus === 'in-progress' && (
                  <div className="mt-3 p-4 bg-red-900/50 border border-red-700/50 rounded-lg">
                    <p className="text-base text-red-300">
                      ⚠️ AI cannot safely resolve data corruption without risk of data loss
                    </p>
                    <p className="text-sm text-red-400 mt-2">
                      Recommendation: Contact database administrator immediately
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add fadeIn animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AIResolutionPanel;
