// components/ui/Badge.tsx
const Badge = ({ status }: { status: string }) => {
  // Match SubscriptionsPage badge color scheme
  let classes = 'px-2 py-0.5 rounded-full text-xs font-medium ';
  switch (status) {
    case 'pending':
      classes += 'bg-yellow-100 text-yellow-800';
      break;
    case 'verified':
      classes += 'bg-green-100 text-green-800';
      break;
    case 'rejected':
      classes += 'bg-red-100 text-red-800';
      break;
    default:
      classes += 'bg-gray-200 text-gray-800';
  }
  return <span className={classes}>{status}</span>;
};

export default Badge;
