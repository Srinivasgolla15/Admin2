import React from 'react';

const DashboardPage: React.FC = () => {
  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold">Welcome to the Dashboard!</h1>
      <p className="mt-2 text-gray-300">This is a protected route.</p>
    </div>
  );
};

export default DashboardPage;
