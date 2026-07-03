import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

const RouteWrapper = ({ children }) => {
  const location = useLocation();
  const [catalogTick, setCatalogTick] = useState(0);

  useEffect(() => {
    const onCatalogUpdate = () => {
      console.log('🔄 catalog-cache-updated event received!');
      setCatalogTick((prev) => prev + 1);
    };
    window.addEventListener('catalog-cache-updated', onCatalogUpdate);
    return () => {
      window.removeEventListener('catalog-cache-updated', onCatalogUpdate);
    };
  }, []);
  
  return <div style={{ width: '100%', height: '100%' }}>{children}</div>;
};

export default RouteWrapper;
