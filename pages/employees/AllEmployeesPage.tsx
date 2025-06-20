import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Employee } from '../../types';
import { Info, Pencil } from 'lucide-react';

const AllEmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'employees'));
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Employee[];
        setEmployees(data);
      } catch (err) {
        console.error('Error fetching employees:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">All Employees</h1>

      {loading ? (
        <p className="text-gray-500">Loading employees...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-slate-800 rounded-md shadow">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-700 text-left text-sm text-gray-600 dark:text-gray-300">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined On</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b dark:border-slate-700 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    {emp.avatarUrl ? (
                      <img src={emp.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-slate-600" />
                    )}
                    {emp.name}
                  </td>
                  <td className="px-4 py-3">{emp.email}</td>
                  <td className="px-4 py-3">{emp.role}</td>
                  <td className="px-4 py-3">{emp.department ?? '-'}</td>
                  <td className="px-4 py-3">{emp.phone ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        emp.employmentStatus === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : emp.employmentStatus === 'On Leave'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {emp.employmentStatus ?? 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{emp.joinedOn ?? '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => console.log('Info', emp)}
                      className="text-blue-500 hover:text-blue-700"
                      title="Info"
                    >
                      <Info size={18} />
                    </button>
                    <button
                      onClick={() => console.log('Edit', emp)}
                      className="text-yellow-500 hover:text-yellow-600"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-gray-500 py-6">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllEmployeesPage;
