import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Employee } from '../../types';
import { Info, Pencil } from 'lucide-react';
import PaginatedTable from '../../components/ui/PaginatedTable';

const AllEmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'employees'));
        console.log(`📦 Read from collection: 'employees' | Total documents fetched: ${snapshot.size}`);

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
        <PaginatedTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'phone', label: 'Phone' },
            { key: 'status', label: 'Status' },
            { key: 'joinedOn', label: 'Joined On' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={employees}
          rowsPerPage={5}
          renderRow={(emp) => (
            <>
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
            </>
          )}
        />
      )}
    </div>
  );
};

export default AllEmployeesPage;
