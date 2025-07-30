import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Employee } from '../../types';
import { Info, Pencil } from 'lucide-react';
import PaginatedTable from '../../components/ui/PaginatedTable';
import Modal from '../../components/ui/Modal';
import EditEntityModal from '../../components/ui/EditEntityModal';
import { doc, updateDoc } from 'firebase/firestore';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

const AllEmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'employees'));
        console.log(`📦 Read from collection: 'employees' | Total documents fetched: ${snapshot.size}`);
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Employee[];
        setEmployees(data);
        setFilteredEmployees(data);
      } catch (err) {
        console.error('Error fetching employees:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEmployees(employees);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredEmployees(
        employees.filter(
          (emp) =>
            emp.name?.toLowerCase().includes(term) ||
            emp.email?.toLowerCase().includes(term)
        )
      );
    }
    setCurrentPage(0);
  }, [searchTerm, employees]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const formatJoinedOn = (joinedOn: any) => {
    if (!joinedOn) return '-';
    let date: Date | null = null;
    if (joinedOn.toDate) {
      date = joinedOn.toDate();
    } else if (typeof joinedOn === 'string') {
      date = parseISO(joinedOn);
    } else if (joinedOn instanceof Date) {
      date = joinedOn;
    }
    if (!date || !isValid(date)) return '-';
    return (
      <span title={format(date, 'dd MMM yyyy HH:mm')} className="text-xs text-gray-500">
        {format(date, 'dd MMM yyyy')} <span className="ml-1 text-slate-400">({formatDistanceToNow(date, { addSuffix: true })})</span>
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">All Employees</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="rowsPerPage" className="text-sm text-gray-700 dark:text-slate-300">
            Rows per page:
          </label>
          <select
            id="rowsPerPage"
            className="border px-2 py-1 rounded text-sm"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(0);
            }}
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          className="w-full max-w-md border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {loading ? (
        <p className="text-gray-500">Loading employees...</p>
      ) : (
        <PaginatedTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'status', label: 'Status' },
            { key: 'joinedOn', label: 'Joined On' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={filteredEmployees.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage)}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          hasMore={filteredEmployees.length > (currentPage + 1) * rowsPerPage}
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
              <td className="px-4 py-3">{formatJoinedOn(emp.joinedOn)}</td>
              <td className="px-4 py-3 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setIsInfoOpen(true);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                  title="Info"
                  aria-label="View Employee Info"
                >
                  <Info size={18} />
                </button>
                <button
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setIsEditOpen(true);
                  }}
                  className="text-yellow-500 hover:text-yellow-600"
                  title="Edit"
                  aria-label="Edit Employee"
                >
                  <Pencil size={18} />
                </button>
              </td>
            </>
          )}
        />
      )}
      <Modal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="Employee Details"
        size="lg"
      >
        {selectedEmployee ? (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <p><strong>Name:</strong> {selectedEmployee.name}</p>
            <p><strong>Email:</strong> {selectedEmployee.email}</p>

            <p><strong>Phone:</strong> {selectedEmployee.phone ?? '-'}</p>
            <p><strong>Status:</strong> {selectedEmployee.employmentStatus ?? 'Unknown'}</p>
            <p><strong>Joined On:</strong> {formatJoinedOn(selectedEmployee.joinedOn)}</p>
            {/* Add more fields if needed */}
          </div>
        ) : (
          <p>No employee selected.</p>
        )}
      </Modal>
      <EditEntityModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        entityType="Employee"
        entityId={selectedEmployee?.id || ''}
        entityData={selectedEmployee || {}}
        editableFields={["name", "email", "phone"]}
        onSave={async (updatedData) => {
          if (!selectedEmployee) return;
          setEditLoading(true);
          try {
            const empRef = doc(db, 'employees', selectedEmployee.id);
            await updateDoc(empRef, {
              name: updatedData.name,
              email: updatedData.email,
              phone: updatedData.phone,
            });
            // Update local state
            setEmployees((prev) => prev.map((emp) => emp.id === selectedEmployee.id ? { ...emp, ...updatedData } : emp));
            setFilteredEmployees((prev) => prev.map((emp) => emp.id === selectedEmployee.id ? { ...emp, ...updatedData } : emp));
            setIsEditOpen(false);
          } catch (err) {
            alert('Failed to update employee.');
            console.error('[EditEmployee] Update failed:', err);
          } finally {
            setEditLoading(false);
          }
        }}
      />
    </div>
  );
};

export default AllEmployeesPage;
