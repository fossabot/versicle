import { useLocation, useNavigate } from 'react-router-dom';

type SidebarType = 'none' | 'toc' | 'annotations' | 'search';

export function useSidebarState() {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active sidebar from location state
  const activeSidebar: SidebarType = (location.state as { sidebar?: SidebarType })?.sidebar || 'none';

  const setSidebar = (sidebar: SidebarType) => {
    if (sidebar === activeSidebar) return;

    if (sidebar === 'none') {
      // Closing: Go back in history
      navigate(-1);
    } else {
      if (activeSidebar === 'none') {
        // Opening: Push new state
        navigate('.', { state: { ...location.state, sidebar }, replace: false });
      } else {
        // Switching: Replace current sidebar state
        navigate('.', { state: { ...location.state, sidebar }, replace: true });
      }
    }
  };

  return { activeSidebar, setSidebar };
}
