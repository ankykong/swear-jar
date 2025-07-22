import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import api from '../services/api';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, deposit, withdrawal, penalty
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, amount

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await api.transactions.getAll({ limit: 50 });
      if (response.success) {
        setTransactions(response.data.transactions || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = 
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.swearJar?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filter === 'all') return matchesSearch;
      return matchesSearch && transaction.type === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'amount') return b.amount - a.amount;
      return 0;
    });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-2">
            View all your swear jar transaction history
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input min-w-32"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="penalty">Penalties</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input min-w-32"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount">Highest Amount</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchTerm || filter !== 'all' ? 'No matching transactions' : 'No transactions yet'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Your transaction history will appear here as you use your swear jars'
              }
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {filteredTransactions.map((transaction, index) => (
              <motion.div
                key={transaction._id}
                className="card hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">
                        {transaction.type === 'deposit' ? '↗️' : 
                         transaction.type === 'withdrawal' ? '↙️' :
                         transaction.type === 'penalty' ? '😬' : '💰'}
                      </span>
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {transaction.description}
                        </h3>
                        <span className={`badge-${
                          transaction.status === 'completed' ? 'success' :
                          transaction.status === 'pending' ? 'warning' :
                          transaction.status === 'failed' ? 'danger' : 'gray'
                        }`}>
                          {transaction.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{transaction.swearJar?.name}</span>
                        <span>•</span>
                        <span>{api.formatDate(transaction.createdAt)}</span>
                        {transaction.user?.name && (
                          <>
                            <span>•</span>
                            <span>by {transaction.user.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xl font-bold ${
                      transaction.type === 'deposit' || transaction.type === 'penalty' 
                        ? 'text-success-600' 
                        : 'text-danger-600'
                    }`}>
                      {transaction.type === 'deposit' || transaction.type === 'penalty' ? '+' : '-'}
                      {api.formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Balance: {api.formatCurrency(transaction.balanceAfter)}
                    </div>
                  </div>
                </div>

                {transaction.metadata?.swearWord && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Swear word:</span>
                      <span className="ml-2 px-2 py-1 bg-danger-100 text-danger-700 rounded text-xs">
                        {transaction.metadata.swearWord}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Summary Stats */}
        {filteredTransactions.length > 0 && (
          <motion.div
            className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="stats-card">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">
                  {filteredTransactions.length}
                </div>
                <div className="text-sm text-gray-600">Total Transactions</div>
              </div>
            </div>
            
            <div className="stats-card">
              <div className="text-center">
                <div className="text-xl font-bold text-success-600">
                  {api.formatCurrency(
                    filteredTransactions
                      .filter(t => t.type === 'deposit' || t.type === 'penalty')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Deposits</div>
              </div>
            </div>
            
            <div className="stats-card">
              <div className="text-center">
                <div className="text-xl font-bold text-danger-600">
                  {api.formatCurrency(
                    filteredTransactions
                      .filter(t => t.type === 'withdrawal')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Withdrawals</div>
              </div>
            </div>
            
            <div className="stats-card">
              <div className="text-center">
                <div className="text-xl font-bold text-warning-600">
                  {filteredTransactions.filter(t => t.type === 'penalty').length}
                </div>
                <div className="text-sm text-gray-600">Penalties Applied</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage; 