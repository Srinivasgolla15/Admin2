import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Employee } from '../../types';
import { UserCircle } from 'lucide-react';

interface EmployeeTypeaheadProps {
  value: null | {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  onChange: (employee: EmployeeTypeaheadProps['value']) => void;
  label?: string;
  favorites?: EmployeeTypeaheadProps['value'][];
  allowUnassign?: boolean;
  currentAssignee?: EmployeeTypeaheadProps['value'];
}

const EmployeeTypeahead: React.FC<EmployeeTypeaheadProps> = ({
  value,
  onChange,
  label = 'Assign Employee',
  favorites = [],
  allowUnassign = true,
  currentAssignee,
}) => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<EmployeeTypeaheadProps['value'][]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [showAll, setShowAll] = useState(false);
  const [allEmployees, setAllEmployees] = useState<EmployeeTypeaheadProps['value'][]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const [isFocused, setIsFocused] = useState(false);

  // Keep input in sync with selected value
  useEffect(() => {
    if (value) {
      setInput(`${value.name} — ${value.email}`);
    } else {
      setInput('');
    }
  }, [value]);

  useEffect(() => {
    if (input.length === 0) {
      setResults([]);
      if (!isFocused) setShowDropdown(false);
      return;
    }
    if (!isFocused) return;
    setLoading(true);
    const timeout = setTimeout(async () => {
      const q = query(
        collection(db, 'employees'),
        orderBy('name'),
        where('name', '>=', input),
        where('name', '<=', input + '\uf8ff'),
        limit(20)
      );
      const snap = await getDocs(q);
      setResults(
        snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.name,
            email: d.email,
            avatarUrl: d.avatarUrl,
          };
        })
      );
      if (isFocused) setShowDropdown(true);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [input, isFocused]);

  const handleSelect = (emp: EmployeeTypeaheadProps['value']) => {
    // If emp is null or undefined, treat it as an unassign
    if (!emp) {
      handleUnassign();
      return;
    }
    
    // Otherwise, update with the selected employee
    onChange(emp);
    setInput(`${emp.name} — ${emp.email}`);
    setShowDropdown(false);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleUnassign = () => {
    // Explicitly set all employee fields to empty strings
    onChange({
      id: '',
      name: '',
      email: '',
      avatarUrl: ''
    });
    setInput('');
    setShowDropdown(false);
  };

  // Browse all logic
  const fetchAllEmployees = async (pageNum: number) => {
    setLoading(true);
    const q = query(
      collection(db, 'employees'),
      orderBy('name'),
      limit(PAGE_SIZE * (pageNum + 1))
    );
    const snap = await getDocs(q);
    setAllEmployees(
      snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          email: d.email,
          avatarUrl: d.avatarUrl,
        };
      })
    );
    setShowAll(true);
    setLoading(false);
  };

  return (
    <div className="relative">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <input
        ref={inputRef}
        aria-label="Search employees"
        type="text"
        className="w-full border px-3 py-2 rounded text-black dark:text-white"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => { setIsFocused(true); setShowDropdown(true); }}
        onBlur={() => { setTimeout(() => { setIsFocused(false); setShowDropdown(false); }, 150); }}
        placeholder="Type to search..."
        autoComplete="off"
      />
      {showDropdown && (results.length > 0 || favorites.length > 0 || allowUnassign || currentAssignee) && (
        <ul
          ref={listRef}
          className="absolute z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full mt-1 rounded shadow max-h-60 overflow-auto"
          tabIndex={-1}
        >
          {currentAssignee && (
            <>
              <li className="px-3 py-2 text-xs text-slate-400">Already Assigned</li>
              <li
                className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(currentAssignee); }}
                aria-label={`Current assignee ${currentAssignee?.name} — ${currentAssignee?.email}`}
              >
                {currentAssignee?.avatarUrl ? (
                  <img src={currentAssignee.avatarUrl} alt="avatar" className="w-6 h-6 rounded-full" />
                ) : (
                  <UserCircle size={20} />
                )}
                <span>{currentAssignee?.name} — {currentAssignee?.email}</span>
              </li>
            </>
          )}
          {allowUnassign && (
            <li
              className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 cursor-pointer"
              onMouseDown={(e) => { e.preventDefault(); handleUnassign(); }}
              aria-label="Unassign employee"
            >
              Unassign
            </li>
          )}
          {favorites.length > 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">Recently Used</li>
          )}
          {favorites.map((emp, idx) => (
            <li
              key={emp?.id || idx}
              className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(emp); }}
              aria-label={`Select ${emp?.name} — ${emp?.email}`}
            >
              {emp?.avatarUrl ? (
                <img src={emp.avatarUrl} alt="avatar" className="w-6 h-6 rounded-full" />
              ) : (
                <UserCircle size={20} />
              )}
              <span>{emp?.name} — {emp?.email}</span>
            </li>
          ))}
          {results.length > 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">Search Results</li>
          )}
          {results.map((emp, idx) => (
            <li
              key={emp?.id || idx}
              className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(emp); }}
              aria-label={`Select ${emp?.name} — ${emp?.email}`}
            >
              {emp?.avatarUrl ? (
                <img src={emp.avatarUrl} alt="avatar" className="w-6 h-6 rounded-full" />
              ) : (
                <UserCircle size={20} />
              )}
              <span>{emp?.name} — {emp?.email}</span>
            </li>
          ))}
          <li
            className="px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer text-center"
            onMouseDown={(e) => { e.preventDefault(); fetchAllEmployees(page); }}
            aria-label="Browse all employees"
          >
            Browse all employees
          </li>
        </ul>
      )}
      {showAll && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md w-full max-w-lg p-6">
            <h3 className="font-bold mb-2">All Employees</h3>
            <ul className="max-h-72 overflow-auto">
              {allEmployees.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((emp, idx) => (
                <li
                  key={emp?.id || idx}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer"
                  onClick={() => { handleSelect(emp); setShowAll(false); }}
                  aria-label={`Select ${emp?.name} — ${emp?.email}`}
                >
                  {emp?.avatarUrl ? (
                    <img src={emp.avatarUrl} alt="avatar" className="w-6 h-6 rounded-full" />
                  ) : (
                    <UserCircle size={20} />
                  )}
                  <span>{emp?.name} — {emp?.email}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center mt-2">
              <button
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => fetchAllEmployees(page + 1)}
              >
                Show more
              </button>
              <button
                className="px-3 py-1 bg-red-200 rounded hover:bg-red-300"
                onClick={() => setShowAll(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {loading && <div className="absolute right-2 top-2"><span className="loader" /></div>}
    </div>
  );
};

export default EmployeeTypeahead;
