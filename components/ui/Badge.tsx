// components/ui/Badge.tsx
const Badge = ({ status }: { status: string }) => {
  const color = {
    verified: 'bg-green-500',
    pending: 'bg-yellow-500',
    rejected: 'bg-red-500',
  }[status] || 'bg-gray-400';

  return <span className={`px-2 py-0.5 rounded text-white text-xs ${color}`}>{status}</span>;
};

export default Badge;
