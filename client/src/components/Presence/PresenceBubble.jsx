const STATUS_CONFIG = {
  ONLINE:  { color: 'bg-green-500',  label: 'Online',  pulse: true  },
  AWAY:    { color: 'bg-yellow-400', label: 'Ausente', pulse: false },
  OFFLINE: { color: 'bg-gray-400',   label: 'Offline', pulse: false },
};

export default function PresenceBubble({ status = 'OFFLINE', size = 'sm' }) {
  const { color, label, pulse } = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
  const dim = size === 'lg' ? 'w-4 h-4' : 'w-2.5 h-2.5';

  return (
    <span
      className={`relative inline-flex shrink-0 ${dim} rounded-full ${color}`}
      title={label}
    >
      {pulse && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      )}
    </span>
  );
}
