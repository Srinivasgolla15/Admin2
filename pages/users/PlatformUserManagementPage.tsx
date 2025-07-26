import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { User, UserRole } from '../../types';
import { UserCog, Trash2, Mail, Phone } from 'lucide-react';
import PaginatedTable from '../../components/ui/PaginatedTable';
import Modal from '../../components/ui/Modal';
import { PlatformAuditLog } from '../../utils/auditLogger';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case UserRole.SuperAdmin: return 'bg-purple-100 text-purple-800';
    case UserRole.Admin: return 'bg-blue-100 text-blue-800';
    case UserRole.Sales: return 'bg-orange-100 text-orange-800';
    case UserRole.Operations: return 'bg-green-100 text-green-800';
    case UserRole.Finance: return 'bg-yellow-100 text-yellow-800';
    case UserRole.Employee: return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const PlatformUserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updateFormData, setUpdateFormData] = useState<Partial<User & { password: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [prevCursors, setPrevCursors] = useState<DocumentSnapshot[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const { currentUser, isLoadingAuth } = useAuth();

 
  

  // Redirect protection: Ensure admin has proper role
  if (!currentUser || isLoadingAuth || (currentUser.role !== UserRole.SuperAdmin && currentUser.role !== UserRole.Admin)) {
    console.error('Unauthorized access: User lacks admin privileges', { currentUser });
    return <div>Unauthorized: Admin access required</div>;
  }

  const fetchUsers = async (page: number, direction: 'next' | 'prev' | 'first' = 'first') => {
    console.log(`[DEBUG] PlatformUserManagementPage: Fetching users for page: ${page} | Direction: ${direction}`);
    setLoading(true);
    try {
      let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(rowsPerPage));

      if (direction === 'next' && lastVisible) {
        q = query(q, startAfter(lastVisible));
      } else if (direction === 'prev' && prevCursors[page - 1]) {
        q = query(q, startAfter(prevCursors[page - 1]));
      }

      const snapshot = await getDocs(q);
      console.log(`[DEBUG] PlatformUserManagementPage: Read from 'users' | Total documents: ${snapshot.size}`);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || undefined,
      })) as User[];
      setUsers(data);
      setHasMore(data.length === rowsPerPage);

      const newLastVisible = snapshot.docs[snapshot.docs.length - 1];
      if (direction === 'next' && newLastVisible) {
        setPrevCursors((prev) => [...prev.slice(0, page), lastVisible].filter((cursor): cursor is DocumentSnapshot => cursor !== null));
        setLastVisible(newLastVisible);
      } else if (direction === 'prev') {
        setLastVisible(prevCursors[page - 1] || null);
        setPrevCursors((prev) => prev.slice(0, page - 1));
      } else {
        setLastVisible(newLastVisible || null);
        setPrevCursors([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || isLoadingAuth) return;
    fetchUsers(0, 'first');
  }, [rowsPerPage, currentUser, isLoadingAuth]);

  const handlePageChange = (newPage: number) => {
    const direction = newPage > currentPage ? 'next' : newPage < currentPage ? 'prev' : 'first';
    setCurrentPage(newPage);
    fetchUsers(newPage, direction);
  };

  const handleAdd = () => {
    console.log('[DEBUG] PlatformUserManagementPage: Opening add user modal');
    setSelectedUser(null);
    setUpdateFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: UserRole.Employee,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    console.log('[DEBUG] PlatformUserManagementPage: Opening edit modal for user:', user.id);
    setSelectedUser(user);
    setUpdateFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleUpdateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUpdateFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const currentTime = Timestamp.fromDate(new Date());

    if (!selectedUser) {
      // Add new user
      try {
        const { email, password, name, phone, role } = updateFormData;
        if (!email || !password) {
          setError('Email and password are required for new users');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long');
          setLoading(false);
          return;
        }

        console.log('Creating user in Firebase Auth:', { email });
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        console.log('User created in Firebase Auth:', { uid: newUser.uid, email });
        if (name) {
          await updateProfile(newUser, { displayName: name });
          console.log('Display name updated:', { name });
        }

        const firestoreData = {
          id: newUser.uid,
          name: name || '',
          email: email || '',
          phone: phone || '',
          role: role || UserRole.Employee,
          createdAt: currentTime,
        };

        console.log('Storing user in Firestore:', firestoreData);
        await addDoc(collection(db, 'users'), firestoreData);
        console.log('User stored in Firestore:', { uid: newUser.uid });

        await sendPasswordResetEmail(auth, email, {
          url: 'https://your-app.com/login', // Replace with your login page URL
          handleCodeInApp: true,
        });
        console.log('Password reset email sent to:', email);

        if (currentUser) {
          console.log('Logging audit for user creation:', { actor: currentUser.email, target: email });
          await PlatformAuditLog({
            actionType: 'CREATE_USER',
            actor: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role,
              phone: currentUser.phone || '',
            },
            targetEntityId: newUser.uid,
            targetEntityType: 'user',
            targetEntityDescription: name || email || 'New User',
            actionDescription: `Created user: ${name || email || 'New User'}`,
            timestamp: currentTime,
            details: Object.fromEntries(
              Object.entries(firestoreData).filter(([key, value]) => value !== undefined)
            ),
          });
        }

        await fetchUsers(currentPage, 'first');
        setIsModalOpen(false);
        setSelectedUser(null);
        setUpdateFormData({});
      } catch (error: any) {
        const errorMessage = error.code === 'auth/email-already-in-use'
          ? 'Email is already in use. Please use a different email.'
          : error.code === 'auth/invalid-email'
          ? 'Invalid email format. Please enter a valid email.'
          : error.message || 'Failed to create user';
        console.error('Error creating user:', error);
        setError(errorMessage);
        setLoading(false);
        return;
      }
    } else {
      // Update existing user
      try {
        const userRef = doc(db, 'users', selectedUser.id);
        const changes = Object.keys(updateFormData).reduce((acc, key) => {
          const prevVal = selectedUser[key as keyof User];
          const newVal = updateFormData[key as keyof User];
          if (prevVal !== newVal && key !== 'password' && key !== 'email') {
            acc[key] = { from: prevVal, to: newVal };
          }
          return acc;
        }, {} as Record<string, { from: any; to: any }>);

        const { password, email, ...firestoreData } = updateFormData;
        console.log('Updating user in Firestore:', { id: selectedUser.id, data: firestoreData });
        await updateDoc(userRef, { ...firestoreData, updatedAt: currentTime });

        if (updateFormData.name && selectedUser.name !== updateFormData.name) {
          const firebaseUser = auth.currentUser;
          if (firebaseUser && firebaseUser.uid === selectedUser.id) {
            await updateProfile(firebaseUser, { displayName: updateFormData.name });
            console.log('Firebase Auth profile updated:', { name: updateFormData.name });
          }
        }

        if (currentUser && Object.keys(changes).length > 0) {
          console.log('Logging audit for user update:', { actor: currentUser.email, target: selectedUser.id });
          await PlatformAuditLog({
            actionType: 'UPDATE_USER',
            actor: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role,
              phone: currentUser.phone || '',
            },
            targetEntityId: selectedUser.id,
            targetEntityType: 'user',
            targetEntityDescription: selectedUser.name || selectedUser.email || selectedUser.id,
            actionDescription: `Updated user: ${Object.entries(changes)
              .map(([key, { from, to }]) => `${key} from "${from}" to "${to}"`)
              .join(', ')}`,
            timestamp: currentTime,
            details: changes,
          });
        }

        await fetchUsers(currentPage, 'first');
        setIsModalOpen(false);
        setSelectedUser(null);
        setUpdateFormData({});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
        console.error('Error updating user:', error);
        setError(errorMessage);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setLoading(true);
      try {
        const userToDelete = users.find((user) => user.id === userId);
        const currentTime = Timestamp.fromDate(new Date());

        console.log('Deleting user from Firestore:', { id: userId });
        await deleteDoc(doc(db, 'users', userId));

        if (currentUser && userToDelete) {
          console.log('Logging audit for user deletion:', { actor: currentUser.email, target: userId });
          await PlatformAuditLog({
            actionType: 'DELETE_USER',
            actor: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role,
              phone: currentUser.phone || '',
            },
            targetEntityId: userId,
            targetEntityType: 'user',
            targetEntityDescription: userToDelete.name || userToDelete.email || userId,
            actionDescription: `Deleted user: ${userToDelete.name || userToDelete.email || userId}`,
            timestamp: currentTime,
            details: { id: userId },
          });
        }

        await fetchUsers(currentPage, 'first');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
        console.error('Error deleting user:', error);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const tableData = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || 'N/A',
    role: user.role,
    createdAt: user.createdAt ? format(user.createdAt.toDate(), 'dd MMM yyyy, hh:mm a') : 'N/A',
    actions: user,
  }));

  return (
    <div className="p-6">
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-gray-500 mb-4">Loading...</p>}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Platform User Management</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            + Add User
          </button>
          <div>
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
                setLastVisible(null);
                setPrevCursors([]);
                setHasMore(true);
              }}
              disabled={loading}
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {users.length === 0 && !loading ? (
        <p className="text-gray-500">No users found.</p>
      ) : (
        <PaginatedTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'role', label: 'Role' },
            { key: 'createdAt', label: 'Created At' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={tableData}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          hasMore={hasMore}
          renderRow={(user) => (
            <>
              <td className="px-4 py-3">
                <div className="flex items-center">
                  <span className="text-slate-800 dark:text-white">{user.name || 'Unknown'}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail size={14} />
                  <span>{user.email || 'N/A'}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone size={14} />
                  <span>{user.phone}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                  {user.role || 'N/A'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm w-full">
                  <span className="inline-block min-w-[150px]">{user.createdAt}</span>
                </div>
              </td>
              <td className="px-4 py-3 flex gap-2">
                <button
                  aria-label="Edit User"
                  className="text-blue-600 hover:text-blue-800 transition disabled:opacity-50"
                  onClick={() => handleEdit(user.actions)}
                  disabled={loading}
                >
                  <UserCog size={18} />
                </button>
                <button
                  aria-label="Delete User"
                  className="text-red-600 hover:text-red-800 transition disabled:opacity-50"
                  onClick={() => handleDelete(user.actions.id)}
                  disabled={loading}
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </>
          )}
        />
      )}
      {isModalOpen && (
        <Modal
          key={selectedUser ? `edit-${selectedUser.id}` : 'add'}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
            setUpdateFormData({});
            setError(null);
          }}
          title={selectedUser ? 'Update User' : 'Add New User'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                name="name"
                value={updateFormData.name || ''}
                onChange={handleUpdateFormChange}
                className="w-full p-2 border rounded"
                placeholder="Enter name"
                autoComplete="off"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                name="email"
                value={updateFormData.email || ''}
                onChange={handleUpdateFormChange}
                className="w-full p-2 border rounded"
                placeholder="Enter email"
                autoComplete="off"
                disabled={loading || !!selectedUser}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                type="text"
                name="phone"
                value={updateFormData.phone || ''}
                onChange={handleUpdateFormChange}
                className="w-full p-2 border rounded"
                placeholder="Enter phone number"
                autoComplete="off"
                disabled={loading}
              />
            </div>
            {!selectedUser && (
              <div>
                <label className="text-sm font-medium">Password</label>
                <input
                  type="password"
                  name="password"
                  value={updateFormData.password || ''}
                  onChange={handleUpdateFormChange}
                  className="w-full p-2 border rounded"
                  placeholder="Enter password (min 6 characters)"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                name="role"
                value={updateFormData.role || UserRole.Employee}
                onChange={handleUpdateFormChange}
                className="w-full p-2 border rounded"
                disabled={loading}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedUser(null);
                  setUpdateFormData({});
                  setError(null);
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {selectedUser ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PlatformUserManagementPage;