import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Reads user.role and redirects to the correct section.
 * Adding a new role requires one entry here — no if/else chains anywhere else.
 */
const ROLE_HOME = {
  seller: '/seller',
  buyer:  '/buyer',
  admin:  '/admin',
};

const RoleRouter = () => {
  const { user } = useAuth();
  const destination = ROLE_HOME[user?.role];

  // Unknown role: do NOT navigate to /login — that redirects back to /dashboard
  // because the user IS authenticated, creating an infinite redirect loop.
  if (!destination) {
    return (
      <p style={{ padding: '24px', color: 'red' }}>
        Unknown account role &quot;{user?.role}&quot;. Please contact support.
      </p>
    );
  }

  return <Navigate to={destination} replace />;
};

export default RoleRouter;
