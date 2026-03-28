import { useNavigate, useLocation } from "react-router-dom";
import { 
  FiUsers, 
  FiClock, 
  FiDollarSign, 
  FiBarChart2, 
  FiGrid, 
  FiPlusCircle 
} from "react-icons/fi";

const VendorHeader = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        {
            id: "manage",
            label: "Manage Vendors",
            path: "/admin/vendors/manage-vendors",
            icon: FiUsers
        },
        {
            id: "register",
            label: "Register New",
            path: "/admin/vendors/register",
            icon: FiPlusCircle
        },
        {
            id: "pending",
            label: "Pending Approvals",
            path: "/admin/vendors/pending-approvals",
            icon: FiClock
        },
        {
            id: "commission",
            label: "Commissions",
            path: "/admin/vendors/commission-rates",
            icon: FiDollarSign
        },
        {
            id: "analytics",
            label: "Analytics",
            path: "/admin/vendors/vendor-analytics",
            icon: FiBarChart2
        },
        {
            id: "explorer",
            label: "Explorer",
            path: "/admin/vendors/explorer",
            icon: FiGrid
        }
    ];

    return (
        <div className="space-y-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                        Vendor Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage, register, and analyze vendors on the platform
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = location.pathname === tab.path;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            className={`
                                flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap
                                ${isActive 
                                    ? "bg-white text-primary-600 shadow-sm" 
                                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                }
                            `}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default VendorHeader;
