import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { User, UserRole } from '../../types';
import EditEntityModal from '../../components/ui/EditEntityModal';
import { useAuth } from '../../contexts/AuthContext';
import { Trash2, UserCog } from 'lucide-react';
import PaginatedTable from '../../components/ui/PaginatedTable';
import { PlatformAuditLog } from '../../utils/auditLogger';
import Button from '../../components/ui/Button';

const PlatformUserManagementPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentUser } = useAuth();

  // Redirect protection: Ensure admin has proper role
  if (!currentUser || (currentUser.role !== UserRole.SuperAdmin && currentUser.role !== UserRole.Admin)) {
    console.error('Unauthorized access: User lacks admin privileges', { currentUser });
    // Avoid redirect here; handle in router or AuthContext
    return <div>Unauthorized: Admin access required</div>;
  }

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || undefined,
      })) as User[];
      setUsers(data);
      console.log('Users fetched successfully:', data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSave = async (updatedData: Partial<User>) => {
    const currentTime = Timestamp.fromDate(new Date());

    if (!selectedUser) {
      // Add new user
      try {
        const { email, password, name, phone, role } = updatedData;
        if (!email || !password) {
          throw new Error('Email and password are required for new users');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        console.log('Creating user in Firebase Auth:', { email });

        // Create user in Firebase Authentication (does not log them in)
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        console.log('User created in Firebase Auth:', { uid: newUser.uid, email });

        // Update display name in Firebase Auth
        if (name) {
          await updateProfile(newUser, { displayName: name });
          console.log('Display name updated:', { name });
        }

        // Store user details in Firestore, excluding password
        const firestoreData = {
          id: newUser.uid,
          name,
          email,
          phone,
          role: role || UserRole.Employee,
          createdAt: currentTime,
        };

        console.log('Attempting to store user in Firestore:', firestoreData);
        const newUserRef = await addDoc(collection(db, 'users'), firestoreData);
        console.log('User stored in Firestore:', { docId: newUserRef.id });

        // Send password reset email to enforce manual login
        await sendPasswordResetEmail(auth, email, {
          url: 'https://your-app.com/login', // Replace with your login page URL
          handleCodeInApp: true,
        });
        console.log('Password reset email sent to:', email);
        alert(`User created successfully! A password reset email has been sent to ${email}.`);

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
          console.log('Audit log created successfully');
        }

        // Verify admin session remains intact
        console.log('Current user after creation:', { uid: auth.currentUser?.uid, email: auth.currentUser?.email });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error creating user:', error);
        alert(`Failed to create user: ${errorMessage}`);
        return;
      }
    } else {
      // Update existing user
      try {
        const userRef = doc(db, 'users', selectedUser.id);

        const changes = Object.keys(updatedData).reduce((acc, key) => {
          const prevVal = selectedUser[key as keyof User];
          const newVal = updatedData[key as keyof User];
          if (prevVal !== newVal && key !== 'password') {
            acc[key] = { from: prevVal, to: newVal };
          }
          return acc;
        }, {} as Record<string, { from: any; to: any }>);

        // Update Firestore document, excluding password
        const { password, ...firestoreData } = updatedData;
        console.log('Updating user in Firestore:', { id: selectedUser.id, data: firestoreData });
        await updateDoc(userRef, firestoreData);

        // Update Firebase Auth profile if name changed
        if (updatedData.name && selectedUser.name !== updatedData.name) {
          const firebaseUser = auth.currentUser;
          if (firebaseUser) {
            await updateProfile(firebaseUser, { displayName: updatedData.name });
            console.log('Firebase Auth profile updated:', { name: updatedData.name });
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error updating user:', error);
        alert(`Failed to update user: ${errorMessage}`);
        return;
      }
    }

    await fetchUsers();
    setIsModalOpen(false);
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error deleting user:', error);
        alert(`Failed to delete user: ${errorMessage}`);
        return;
      }

      await fetchUsers();
    }
  };

  const tableData = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || 'N/A',
    role: user.role,
    createdAt: user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A',
    actions: user,
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Platform User Management</h1>
        <Button
          onClick={() => {
            setSelectedUser(null);
            setIsModalOpen(true);
          }}
          className="text-white"
        >
          + Add User
        </Button>
      </div>

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
        rowsPerPage={10}
        renderRow={(user) => (
          <>
            <td className="px-6 py-3 text-sm whitespace-nowrap">{user.name || 'Unknown'}</td>
            <td className="px-6 py-3 text-sm whitespace-nowrap">{user.email || 'N/A'}</td>
            <td className="px-6 py-3 text-sm whitespace-nowrap">{user.phone}</td>
            <td className="px-6 py-3 text-sm whitespace-nowrap">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  user.role === UserRole.SuperAdmin
                    ? 'bg-purple-100 text-purple-800'
                    : user.role === UserRole.Admin
                    ? 'bg-blue-100 text-blue-800'
                    : user.role === UserRole.Sales
                    ? 'bg-orange-100 text-orange-800'
                    : user.role === UserRole.Operations
                    ? 'bg-green-100 text-green-800'
                    : user.role === UserRole.Finance
                    ? 'bg-yellow-100 text-yellow-800'
                    : user.role === UserRole.Employee
                    ? 'bg-gray-100 text-gray-800'
                    : ''
                }`}
              >
                {user.role || 'N/A'}
              </span>
            </td>
            <td className="px-6 py-3 text-sm whitespace-nowrap">{user.createdAt}</td>
            <td className="px-6 py-3 text-sm text-right whitespace-nowrap">
              <button
                onClick={() => handleEdit(user.actions)}
                className="text-blue-600 hover:text-blue-800 p-1 mr-2"
                aria-label="Edit User"
              >
                <UserCog size={18} />
              </button>
              <button
                onClick={() => handleDelete(user.actions.id)}
                className="text-red-600 hover:text-red-800 p-1"
                aria-label="Delete User"
              >
                <Trash2 size={18} />
              </button>
            </td>
          </>
        )}
      />

      {isModalOpen && (
        <EditEntityModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          entityType="user"
          entityId={selectedUser?.id || ''}
          entityData={
            selectedUser || {
              name: '',
              email: '',
              phone: '',
              password: '',
              role: UserRole.Employee,
              createdAt: undefined,
            }
          }
          editableFields={selectedUser ? ['name', 'phone', 'role'] : ['name', 'email', 'phone', 'password', 'role']}
          currentUser={currentUser}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default PlatformUserManagementPage;