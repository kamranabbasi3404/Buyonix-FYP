import React, { useEffect, useState } from 'react';

interface TicketMessage {
  sender: 'customer' | 'agent';
  text: string;
  time: string;
}

interface Ticket {
  id: string;
  issue: string;
  customer: string;
  email?: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved';
  date: string;
  messages: TicketMessage[];
}

const CustomerSupport: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('http://localhost:5000/support/queries', { credentials: 'include' });
      if (!res.ok) {
        // If endpoint not available yet, show empty
        setTickets([]);
        return;
      }
      const data = await res.json();
      if (data && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      } else {
        // try alternate keys
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Support fetch error', err);
      setError('Unable to fetch support queries');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedTicketData = tickets.find(ticket => ticket.id === selectedTicket);

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-600';
      case 'Medium':
        return 'bg-orange-100 text-orange-600';
      case 'Low':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-gray-100 text-gray-600';
      case 'In Progress':
        return 'bg-gray-800 text-white';
      case 'Resolved':
        return 'bg-teal-100 text-teal-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Support</h1>
        <p className="text-base text-gray-600">
          Manage support tickets escalated from the chatbot
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel: Support Tickets */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden lg:col-span-2 flex flex-col h-[500px] border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-gray-50 rounded-t-2xl">
            <h2 className="text-lg font-bold text-gray-900">Support Tickets</h2>
          </div>
          <div className="overflow-y-auto divide-y divide-gray-100 flex-1">
            {loading ? (
              <div className="p-6 text-center text-gray-600">Loading tickets...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-600">{error}</div>
            ) : tickets.length === 0 ? (
              <div className="p-6 text-center text-gray-600">No support queries found.</div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket.id)}
                  className={`p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 ${
                    selectedTicket === ticket.id ? 'bg-teal-50 border-r-4 border-teal-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">{ticket.id}</h3>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityBadgeClass(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mb-2">{ticket.issue}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{ticket.customer}</p>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{ticket.date}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Ticket Conversation */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden lg:col-span-3 flex flex-col h-[500px] border border-gray-100">
          {selectedTicketData ? (
            <>
              <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-gray-50 rounded-t-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Ticket: {selectedTicketData.id} • {selectedTicketData.customer}
                  </h2>
                  <div className="flex gap-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityBadgeClass(selectedTicketData.priority)}`}>
                      {selectedTicketData.priority}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClass(selectedTicketData.status)}`}>
                      {selectedTicketData.status}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{selectedTicketData.date}</div>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto bg-gray-50">
                {selectedTicketData.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex mb-4 ${
                      message.sender === 'customer' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.sender === 'customer'
                          ? 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
                          : 'bg-teal-500 text-white rounded-tr-none'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'customer' ? 'text-gray-500' : 'text-teal-100'
                      }`}>
                        {message.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-2xl">
                <div className="flex gap-2 mb-3">
                  <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Attach File
                  </button>
                  <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Add Note
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                  <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm flex items-center gap-1">
                    <span>Send</span>
                    <span>➤</span>
                  </button>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Close Ticket
                  </button>
                  <button className="px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm">
                    Escalate
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                <h2 className="text-xl font-bold text-gray-900">Select a ticket</h2>
              </div>
              <div className="flex items-center justify-center h-full bg-gray-50 rounded-b-2xl">
                <div className="text-center p-8">
                  <div className="text-5xl mb-4">💬</div>
                  <p className="text-gray-600 text-center mb-4">
                    Select a ticket to view conversation
                  </p>
                  <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm">
                    View All Tickets
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;

