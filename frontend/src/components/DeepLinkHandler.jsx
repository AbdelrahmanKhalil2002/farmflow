import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Listens for farmflow:// deep links forwarded by the Electron main process
// and translates them into React Router navigations.
// farmflow://listing/:id  →  /buyer/listings/:id
// farmflow://farm/:id     →  /buyer/farms/:id
// farmflow://order/:id    →  /buyer/orders
export default function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.electron?.onDeepLink) return;

    return window.electron.onDeepLink((linkPath) => {
      const [type, id] = linkPath.split('/').filter(Boolean);
      switch (type) {
        case 'listing': navigate(`/buyer/listings/${id}`); break;
        case 'farm':    navigate(`/buyer/farms/${id}`);    break;
        case 'order':   navigate('/buyer/orders');         break;
        default:        break;
      }
    });
  }, [navigate]);

  return null;
}
