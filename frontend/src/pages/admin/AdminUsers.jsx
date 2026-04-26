import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllUsers, toggleUserStatus } from '../../services/adminService';

const ROLE_LABELS = { seller: 'Seller', buyer: 'Buyer', admin: 'Admin' };

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [toggling, setToggling] = useState(null); // id of user being toggled

  useEffect(() => {
    getAllUsers()
      .then(({ data }) => setUsers(data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id) => {
    setToggling(id);
    try {
      const { data } = await toggleUserStatus(id);
      setUsers((prev) => prev.map((u) => (u._id === id ? data : u)));
    } catch {
      alert('Failed to update user status.');
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error)   return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Users ({users.length})</h2>
      {users.length === 0 && <p>No users found.</p>}
      {users.length > 0 && <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px 8px 0' }}>Name</th>
            <th style={{ padding: '8px 12px 8px 0' }}>Email</th>
            <th style={{ padding: '8px 12px 8px 0' }}>Role</th>
            <th style={{ padding: '8px 12px 8px 0' }}>Joined</th>
            <th style={{ padding: '8px 12px 8px 0' }}>Status</th>
            <th style={{ padding: '8px 0' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u._id === currentUser?._id;
            return (
              <tr key={u._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 12px 10px 0' }}>{u.name}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>{u.email}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>{ROLE_LABELS[u.role] ?? u.role}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px 12px 10px 0', color: u.isActive ? 'green' : 'red' }}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </td>
                <td style={{ padding: '10px 0' }}>
                  {isSelf ? (
                    <span style={{ color: '#aaa', fontSize: '13px' }}>—</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggle(u._id)}
                      disabled={toggling === u._id}
                    >
                      {toggling === u._id
                        ? '...'
                        : u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>}
    </div>
  );
};

export default AdminUsers;
