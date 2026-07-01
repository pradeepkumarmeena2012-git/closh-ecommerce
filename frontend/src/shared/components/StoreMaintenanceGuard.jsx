import { Outlet } from "react-router-dom";
import { useSettingsStore } from "../store/settingsStore";
import StoreClosedPage from "./StoreClosedPage";

const StoreMaintenanceGuard = () => {
  const { settings, isLoading } = useSettingsStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (settings?.general?.storeClosed) {
    return <StoreClosedPage message={settings?.general?.storeClosedMessage} />;
  }

  return <Outlet />;
};

export default StoreMaintenanceGuard;
