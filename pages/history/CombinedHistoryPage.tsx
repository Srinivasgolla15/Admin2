import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format, isValid } from 'date-fns';
import { Info } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import PaginatedTable from '../../components/ui/PaginatedTable';

interface AuditLog {
  id: string;
  timestamp: any;
  actionType: string;
  actionDescription?: string;
  targetEntityType?: string;
  targetEntityDescription?: string;
  actor?: { name?: string; email?: string; role?: string };
  actorUserName?: string; // Backward compatibility
  actorUserEmail?: string; // Backward compatibility
  actorUserRole?: string; // Backward compatibility
  source?: string;
  [key: string]: any;
}

const CombinedHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedActor, setSelectedActor] = useState('');

  // Derive unique actions and actors for dropdowns
  const actions = Array.from(new Set(logs.map((log) => log.actionType).filter(Boolean))).sort();
  const actors = Array.from(
    new Set(logs.map((log) => log.actor?.email || log.actorUserEmail).filter(Boolean))
  ).sort();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, 'platformAuditLogs'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        const data: AuditLog[] = snapshot.docs.map((doc) => {
          const docData = doc.data();
          console.log('[DEBUG] CombinedHistoryPage: Fetched log:', docData);
          return {
            id: doc.id,
            timestamp: docData.timestamp,
            actionType: docData.actionType,
            actionDescription: docData.actionDescription,
            targetEntityType: docData.targetEntityType,
            targetEntityDescription: docData.targetEntityDescription,
            actor: docData.actor,
            actorUserName: docData.actorUserName,
            actorUserEmail: docData.actorUserEmail,
            actorUserRole: docData.actorUserRole,
            source: docData.source,
            ...docData,
          };
        });
        console.log('[DEBUG] CombinedHistoryPage: All fetched logs:', data);
        setLogs(data);
        setFilteredLogs(data);
      } catch (err) {
        console.error('[DEBUG] CombinedHistoryPage: Error fetching audit logs:', err);
        setError('Failed to load audit logs. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    const applyFilters = () => {
      const filtered = logs.filter((log) => {
        const logTime = log.timestamp?.toDate?.();
        const matchesSearch = searchTerm
          ? JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
          : true;

        const matchesAction = selectedAction ? log.actionType === selectedAction : true;
        const matchesSource = selectedSource ? log.source === selectedSource : true;
        const matchesActor = selectedActor
          ? log.actor?.email === selectedActor || log.actorUserEmail === selectedActor
          : true;

        const matchesDateRange =
          (!dateFrom || (logTime && new Date(dateFrom) <= logTime)) &&
          (!dateTo || (logTime && logTime <= new Date(dateTo)));

        return matchesSearch && matchesAction && matchesSource && matchesActor && matchesDateRange;
      });
      setFilteredLogs(filtered);
    };
    applyFilters();
  }, [logs, searchTerm, dateFrom, dateTo, selectedAction, selectedSource, selectedActor]);

  const openInfoModal = (log: AuditLog) => {
    console.log('[DEBUG] CombinedHistoryPage: Opening info modal for log:', log.id);
    setSelectedLog(log);
    setIsInfoModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSelectedAction('');
    setSelectedSource('');
    setSelectedActor('');
  };

  const handleExportCSV = () => {
    const headers = [
      'Timestamp',
      'User Name',
      'User Email',
      'User Role',
      'Action',
      'Description',
      'Target Entity',
      'Target Description',
      'Source',
    ];
    const rows = filteredLogs.map((log) => [
      log.timestamp?.toDate?.() ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : '',
      log.actor?.name || log.actorUserName || '',
      log.actor?.email || log.actorUserEmail || '',
      log.actor?.role || log.actorUserRole || 'N/A',
      log.actionType || '',
      log.actionDescription || '',
      log.targetEntityType || '',
      log.targetEntityDescription || '',
      log.source || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString()}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp?.toDate || !isValid(timestamp.toDate())) return 'N/A';
    const date = timestamp.toDate();
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return format(date, 'dd-MM-yyyy HH:mm');
  };

  return (
    <div className="p-6">
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Combined Audit History</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="rowsPerPage" className="text-sm text-gray-700 dark:text-slate-300">
            Rows per page:
          </label>
          <select
            id="rowsPerPage"
            className="border px-2 py-1 rounded text-sm"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            {[5, 10, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <input
          type="text"
          placeholder="🔍 Search logs..."
          className="border rounded px-3 py-2 w-60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-300">Date From</label>
          <input
          aria-label='Select Date From'
            type="date"
            className="border rounded px-3 py-2 text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-300">Date To</label>
          <input
            aria-label='Select Date To'
            type="date"
            className="border rounded px-3 py-2 text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <select
        aria-label='Filter by Action'
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">All Actions</option>
          {actions.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>
        <select
        aria-label='Filter by Source'
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">All Sources</option>
          <option value="Platform Audit">Platform Audit</option>
          <option value="Assignment Log">Assignment Log</option>
        </select>
        <select
        aria-label='Filter by Actor'
          value={selectedActor}
          onChange={(e) => setSelectedActor(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">All Actors</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          onClick={handleClearFilters}
          className="px-4 py-2 border rounded bg-white text-sm hover:bg-gray-50"
        >
          Clear Filters
        </button>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800"
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <p>Loading logs...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <PaginatedTable
          columns={[
            { key: 'timestamp', label: 'When' },
            { key: 'actor', label: 'User' },
            { key: 'actionType', label: 'Action' },
            { key: 'actionDescription', label: 'Description' },
            { key: 'target', label: 'Target' },
            { key: 'source', label: 'Source' },
            { key: 'actions', label: 'Info' },
          ]}
          data={filteredLogs}
          rowsPerPage={rowsPerPage}
          renderRow={(log) => (
            <>
              <td className="px-4 py-2 text-sm">{formatTimeAgo(log.timestamp)}</td>
              <td className="px-4 py-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{log.actor?.name || log.actorUserName || 'Unknown'}</span>
                  {((log.actor?.role || log.actorUserRole) && (log.actor?.role || log.actorUserRole) !== 'N/A') && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                      backgroundColor: '#DCDCDC',
                      color: '#1E40AF',
                    }}>
                      {log.actor?.role || log.actorUserRole}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 block mt-1">{log.actor?.email || log.actorUserEmail || 'N/A'}</span>
              </td>
              <td className="px-4 py-2 text-sm">
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                  {log.actionType || 'Unknown'}
                </span>
              </td>
              <td className="px-4 py-2 text-sm">{log.actionDescription || 'No description provided'}</td>
              <td className="px-4 py-2 text-sm">
                {log.targetEntityType ? `${log.targetEntityType}: ${log.targetEntityDescription}` : 'N/A'}
              </td>
              <td className="px-4 py-2 text-sm">
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {log.source || 'Unknown'}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <button
                  className="text-blue-600 hover:text-blue-800"
                  onClick={() => openInfoModal(log)}
                  title="View Details"
                >
                  <Info size={18} />
                </button>
              </td>
            </>
          )}
        />
      )}

      <Modal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title="Log Details"
        size="lg"
      >
        {selectedLog ? (
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(selectedLog, null, 2)}
          </pre>
        ) : (
          <p>No log selected.</p>
        )}
      </Modal>
    </div>
  );
};

export default CombinedHistoryPage;