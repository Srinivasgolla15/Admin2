// src/components/ui/PaginatedTable.tsx
import React, { useState } from 'react';

type PaginatedTableProps<T> = {
  columns: { key: string; label: string }[];
  data: T[];
  rowsPerPage?: number;
  renderRow: (item: T) => React.ReactNode;
};

const PaginatedTable = <T,>({
  columns,
  data,
  rowsPerPage = 10,
  renderRow,
}: PaginatedTableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIdx = currentPage * rowsPerPage;
  const paginatedData = data.slice(startIdx, startIdx + rowsPerPage);

  const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 0));
  const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white dark:bg-slate-800 text-sm">
          <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2 text-left">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, idx) => (
              <tr
                key={(item as any).id || idx}
                className="border-b dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {renderRow(item)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700 dark:text-slate-300">
          Page {currentPage + 1} of {totalPages}
        </span>
        <div className="space-x-2">
          <button
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages - 1}
            className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaginatedTable;
