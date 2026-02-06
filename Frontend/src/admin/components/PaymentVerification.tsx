import React, { useEffect, useState } from 'react';

interface Payment {
  orderId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  date: string;
}

const PaymentVerification: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:5000/payments', { credentials: 'include' });
        if (!res.ok) {
          setPayments([]);
          return;
        }
        const data = await res.json();
        setPayments(Array.isArray(data.payments) ? data.payments : []);
      } catch (err) {
        console.error('Payments fetch error', err);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const handleViewReceipt = (orderId: string, transactionId: string) => {
    alert(`Viewing receipt for Order ${orderId} (Transaction: ${transactionId})`);
    // In a real application, this would open a modal or navigate to the receipt
  };

  const handleConfirm = (orderId: string, customerName: string) => {
    if (window.confirm(`Confirm payment for order ${orderId} by ${customerName}?`)) {
      alert(`Payment for order ${orderId} has been confirmed.`);
      // In a real application, this would make an API call
    }
  };

  const handleReject = (orderId: string, customerName: string) => {
    if (window.confirm(`Reject payment for order ${orderId} by ${customerName}?`)) {
      alert(`Payment for order ${orderId} has been rejected.`);
      // In a real application, this would make an API call
    }
  };

  const filteredPayments = payments.filter(payment =>
    payment.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.transactionId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 p-6 overflow-y-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Verification</h1>
        <p className="text-base text-gray-600">
          Review and approve customer bank transfer payments
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by Order ID, Customer, or Transaction ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm"
          />
        </div>
      </div>

      {/* Pending Payment Verifications Table */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-gray-900">Pending Payment Verifications</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">
              All
            </button>
            <button className="px-3 py-1 text-xs bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
              Pending
            </button>
            <button className="px-3 py-1 text-xs bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">
              Verified
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="py-12 text-center">
            <div className="text-lg font-medium text-gray-700">Loading payments...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Receipt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredPayments.map((payment, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{payment.orderId}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {payment.customerName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm text-gray-900 font-medium">{payment.customerName}</div>
                        <div className="text-xs text-gray-500">{payment.customerEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">${payment.amount.toFixed(2)}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{payment.transactionId}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{payment.paymentMethod}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{payment.date}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleViewReceipt(payment.orderId, payment.transactionId)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConfirm(payment.orderId, payment.customerName)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        Confirm
                      </button>
                      <button
                        onClick={() => handleReject(payment.orderId, payment.customerName)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">💳</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">No payments match your search criteria.</p>
          </div>
        )}
        
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredPayments.length}</span> of{' '}
            <span className="font-medium">{filteredPayments.length}</span> results
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors">
              Previous
            </button>
            <button className="px-3 py-1 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentVerification;

