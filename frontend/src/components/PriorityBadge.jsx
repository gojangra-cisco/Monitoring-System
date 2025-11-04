const PriorityBadge = ({ priority }) => {
  const getBadgeStyle = () => {
    switch (priority) {
      case 'P0':
        return 'bg-red-900/50 text-red-300 border-red-700/50 font-semibold';
      case 'P1':
        return 'bg-orange-900/50 text-orange-300 border-orange-700/50';
      case 'P2':
        return 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50';
      case 'P3':
        return 'bg-blue-900/50 text-blue-300 border-blue-700/50';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border ${getBadgeStyle()}`}>
      {priority}
    </span>
  );
};export default PriorityBadge;
