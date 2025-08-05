import React from 'react';

type PaginatedTableProps<T> = {
  columns?: { key: string; label: string }[];
  data: T[];
  currentPage?: number;
  onPageChange?: (newPage: number) => void;
  hasMore?: boolean;
  renderRow: (item: T) => React.ReactNode;
  containerClassName?: string; // for grid/flex layouts
  renderContainer?: (children: React.ReactNode) => React.ReactNode; // advanced custom wrapper
};

const PaginatedTable = <T,>({
  columns,
  data,
  currentPage = 0,
  onPageChange,
  hasMore = true,
  renderRow,
  containerClassName,
  renderContainer,
}: PaginatedTableProps<T>) => {
  const handlePrev = () => {
    if (currentPage > 0) {
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (hasMore) {
      onPageChange?.(currentPage + 1);
    }
  };

  let content;
  if (columns && columns.length > 0) {
    content = (
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white dark:bg-slate-800 text-sm">
          <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left font-semibold tracking-wide whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr
                key={(item as any).id || idx}
                className={`border-b dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition duration-150 ${
                  idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-700'
                }`}
              >
                {renderRow(item)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else if (renderContainer) {
    content = renderContainer(data.map((item, idx) => <React.Fragment key={(item as any).id || idx}>{renderRow(item)}</React.Fragment>));
  } else {
    content = (
      <div className={containerClassName || ''}>
        {data.map((item, idx) => (
          <React.Fragment key={(item as any).id || idx}>{renderRow(item)}</React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {content}
      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700 dark:text-slate-300">Page {currentPage + 1}</span>
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
            disabled={!hasMore}
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
