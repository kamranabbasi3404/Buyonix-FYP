import React, { useEffect, useState } from 'react';

const DashboardContent: React.FC = () => {
  const [revenue, setRevenue] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to fetch data from available backend endpoints.
    // If endpoints are missing the UI will gracefully show placeholder or hide revenue.
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [txRes, usersRes, productsRes, ordersRes] = await Promise.allSettled([
          fetch('http://localhost:5000/transactions', { credentials: 'include' }),
          fetch('http://localhost:5000/seller/all', { credentials: 'include' }),
          fetch('http://localhost:5000/product', { credentials: 'include' }),
          fetch('http://localhost:5000/order', { credentials: 'include' })
        ]);

        // Transactions -> revenue
        if (txRes.status === 'fulfilled' && txRes.value.ok) {
          try {
            const txData = await txRes.value.json();
            const txs = txData.transactions || txData.data || [];
            if (Array.isArray(txs) && txs.length > 0) {
                const sum = txs.reduce((acc: number, t: { amount?: number | string }) => acc + (Number((t && t.amount) || 0) || 0), 0);
              setRevenue(sum);
            } else {
              setRevenue(null);
            }
            } catch {
              setRevenue(null);
            }
        } else {
          setRevenue(null);
        }

        // Sellers -> users
        if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
          const usersData = await usersRes.value.json();
          const sellers = usersData.sellers || [];
          setTotalUsers(Array.isArray(sellers) ? sellers.length : null);
        }

        // Products
        if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
          const prodData = await productsRes.value.json();
          const prods = prodData.products || [];
          setTotalProducts(Array.isArray(prods) ? prods.length : null);
        }

        // Orders
        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const ordData = await ordersRes.value.json();
          const ords = ordData.orders || [];
          setTotalOrders(Array.isArray(ords) ? ords.length : null);
        }
      } catch (err) {
        console.error('Dashboard fetch error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const metrics = [
    {
      title: 'Platform Revenue',
      icon: '�',
      value: revenue !== null ? `$${revenue.toFixed(2)}` : '—',
      description: revenue !== null ? 'Recorded transactions' : 'No transactions yet',
      valueColor: 'text-teal-500'
    },
    {
      title: 'Total Sellers',
      icon: '�',
      value: totalUsers !== null ? String(totalUsers) : '—',
      description: totalUsers !== null ? 'Active sellers' : '—',
      valueColor: 'text-teal-500'
    },
    {
      title: 'Total Products',
      icon: '�',
      value: totalProducts !== null ? String(totalProducts) : '—',
      description: 'Across all sellers',
      valueColor: 'text-teal-500'
    },
    {
      title: 'Total Orders',
      icon: '📋',
      value: totalOrders !== null ? String(totalOrders) : '—',
      description: 'Customer placed orders',
      valueColor: 'text-teal-500'
    }
  ];

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-8 overflow-y-auto">
      {loading && (
        <div className="mb-4 p-3 bg-white rounded-md border border-gray-100 text-sm text-gray-600">Loading dashboard data…</div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Overview</h1>
        <p className="text-base text-gray-600">Monitor sales and trends across the entire platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl bg-teal-50 p-2 rounded-lg">{metric.icon}</span>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{metric.title}</h3>
            </div>
            <div className={`text-3xl font-bold mb-2 ${metric.valueColor}`}>{metric.value}</div>
            <p className="text-sm text-gray-400">{metric.description}</p>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Sales Trends</h2>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <button className="px-3 py-1 text-xs bg-white rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Week</button>
            <button className="px-3 py-1 text-xs bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">Month</button>
            <button className="px-3 py-1 text-xs bg-white rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Year</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl py-16 px-6 text-center text-gray-400 text-base shadow-lg min-h-[400px] border border-gray-100">
          <div className="mb-4 text-5xl">📊</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Sales Analytics Dashboard</h3>
          <p className="mb-4">Interactive charts and data visualization would appear here</p>
          <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium">View Detailed Report</button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity Feed</h2>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-start gap-4 py-4">
            <div className="w-3 h-3 bg-teal-500 rounded-full flex-shrink-0 mt-1.5"></div>
            <div className="flex-1">
              <div className="text-sm text-gray-800"><span className="font-medium">Recent dashboard loaded</span></div>
              <div className="text-xs text-gray-500 mt-1">Just now</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;

