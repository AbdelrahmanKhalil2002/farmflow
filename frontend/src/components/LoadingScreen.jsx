/**
 * Shown while AuthProvider hydrates the session from sessionStorage.
 * Prevents a flash of the login page for authenticated users on refresh.
 */
const LoadingScreen = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <p>Loading...</p>
  </div>
);

export default LoadingScreen;
