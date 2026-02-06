import React, { useState, useEffect } from 'react';
import logo from '../../assets/logo.png';

interface SidebarProps {
  currentPage: 'dashboard' | 'users' | 'products' | 'orders' | 'support' | 'analytics' | 'pending-sellers' | 'all-sellers' | 'payment-verification' | 'seller-payouts';
  onPageChange: (page: 'dashboard' | 'users' | 'products' | 'orders' | 'support' | 'analytics' | 'pending-sellers' | 'all-sellers' | 'payment-verification' | 'seller-payouts') => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, onLogout }) => {
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    fetchPendingCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [currentPage]); // Refresh when page changes

  const fetchPendingCount = async () => {
    try {
      const response = await fetch('http://localhost:5000/seller/pending', {
        method: 'GET',
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPendingCount(result.sellers.length);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };
  const menuItems = [
    { id: 'dashboard' as const, icon: '📊', label: 'Dashboard' },
    { id: 'users' as const, icon: '👥', label: 'Users' },
    { id: 'products' as const, icon: '📦', label: 'Products' },
    { id: 'orders' as const, icon: '✅', label: 'Orders' },
    { id: 'support' as const, icon: '💬', label: 'Customer Support' }, 
    { id: 'analytics' as const, icon: '📊', label: 'Analytics & Reports' }
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-full flex flex-col shadow-xl relative">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Buyonix Logo" className="w-12 h-12 rounded-lg" />
          <div>
            <div className="text-lg font-bold">Buyonix</div>
            <div className="text-xs text-gray-400">Admin Panel</div>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex items-center px-5 py-3 cursor-pointer transition-all duration-200 gap-3 rounded-r-full mx-2 ${
                isActive
                  ? 'bg-teal-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-lg w-6 flex justify-center">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          );
        })}
        
        <div className="mt-6 px-5">
          <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            SELLER MANAGEMENT
          </div>
          <div
            onClick={() => onPageChange('pending-sellers')}
            className={`flex items-center px-5 py-3 cursor-pointer transition-all duration-200 gap-3 rounded-r-full mx-2 ${
              currentPage === 'pending-sellers'
                ? 'bg-teal-500 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-lg w-6 flex justify-center">🏪</span>
            <span className="text-sm font-medium">Pending Sellers</span>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full ml-auto animate-pulse">
                {pendingCount}
              </span>
            )}
          </div>
          <div
            onClick={() => onPageChange('all-sellers')}
            className={`flex items-center px-5 py-3 cursor-pointer transition-all duration-200 gap-3 rounded-r-full mx-2 ${
              currentPage === 'all-sellers'
                ? 'bg-teal-500 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-lg w-6 flex justify-center">👥</span>
            <span className="text-sm font-medium">All Sellers</span>
          </div>
        </div>
        
        <div className="mt-2 px-5">
          <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            FINANCIALS
          </div>
          <div
            onClick={() => onPageChange('payment-verification')}
            className={`flex items-center px-5 py-3 cursor-pointer transition-all duration-200 gap-3 rounded-r-full mx-2 ${
              currentPage === 'payment-verification'
                ? 'bg-teal-500 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-lg w-6 flex justify-center">💰</span>
            <span className="text-sm font-medium">Payment Verification</span>
          </div>
          <div
            onClick={() => onPageChange('seller-payouts')}
            className={`flex items-center px-5 py-3 cursor-pointer transition-all duration-200 gap-3 rounded-r-full mx-2 ${
              currentPage === 'seller-payouts'
                ? 'bg-teal-500 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-lg w-6 flex justify-center">💰</span>
            <span className="text-sm font-medium">Seller Payouts</span>
          </div>
        </div>
      </nav>
      
      <div className="p-5 border-t border-gray-700 space-y-2">
        <button 
          onClick={() => onLogout?.()}
          className="w-full py-3 bg-red-600 hover:bg-red-700 border border-red-500 rounded-lg text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:border-red-600"
        >
          🚪 Logout
        </button>
        <button className="w-full py-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-300 text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-gray-700 hover:text-white hover:border-gray-500">
          ← Back to Shopping
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

