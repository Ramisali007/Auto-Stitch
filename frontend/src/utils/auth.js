export const handleProtectedAction = (user, navigate, action, message = 'Please login to continue') => {
  if (!user) {
    navigate('/login');
    return false;
  }
  if (action && typeof action === 'function') {
    action();
  }
  return true;
};
