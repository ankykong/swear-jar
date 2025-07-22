import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  PlusIcon, 
  CurrencyDollarIcon, 
  UsersIcon, 
  ArrowTrendingUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import api from '../services/api';

const DashboardPage = () => {
  const { user } = useAuth();
  const [swearJars, setSwearJars] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalJars: 0,
    totalTransactions: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load swear jars
      const jarsResponse = await api.swearJars.getAll();
      if (jarsResponse.success) {
        setSwearJars(jarsResponse.data.swearJars || []);
        
        // Calculate stats
        const totalBalance = jarsResponse.data.swearJars?.reduce((sum, jar) => sum + jar.balance, 0) || 0;
        const totalJars = jarsResponse.data.swearJars?.length || 0;
        
        setStats(prev => ({
          ...prev,
          totalBalance,
          totalJars,
        }));
      }

      // Load recent transactions
      const transactionsResponse = await api.transactions.getAll({ limit: 5 });
      if (transactionsResponse.success) {
        setRecentTransactions(transactionsResponse.data.transactions || []);
        setStats(prev => ({
          ...prev,
          totalTransactions: transactionsResponse.data.pagination?.total || 0,
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your swear jars
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="stats-card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {api.formatCurrency(stats.totalBalance)}
                </p>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Jars</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalJars}</p>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="h-6 w-6 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Swear Jars */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Your Swear Jars</h2>
                <Link
                  to="/swear-jars"
                  className="btn-primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Jar
                </Link>
              </div>

              <div className="space-y-4">
                {swearJars.length === 0 ? (
                  <div className="text-center py-8">
                    <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No swear jars yet</h3>
                    <p className="text-gray-600 mb-4">
                      Create your first swear jar to start collecting money for bad habits
                    </p>
                    <Link to="/swear-jars" className="btn-primary">
                      Create Your First Jar
                    </Link>
                  </div>
                ) : (
                  swearJars.slice(0, 3).map((jar) => (
                    <Link
                      key={jar._id}
                      to={`/swear-jars/${jar._id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{jar.name}</h3>
                          <p className="text-sm text-gray-600">{jar.description}</p>
                          <div className="flex items-center mt-2">
                            <span className="badge-primary mr-2">{jar.userRole}</span>
                            <span className="text-xs text-gray-500">
                              {jar.members?.length} member(s)
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {api.formatCurrency(jar.balance)}
                          </p>
                          <p className="text-xs text-gray-500">{jar.currency}</p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}

                {swearJars.length > 3 && (
                  <Link
                    to="/swear-jars"
                    className="block text-center py-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View all {swearJars.length} jars →
                  </Link>
                )}
              </div>
            </div>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <Link
                  to="/transactions"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View all
                </Link>
              </div>

              <div className="space-y-4">
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                    <p className="text-gray-600">
                      Your transaction history will appear here
                    </p>
                  </div>
                ) : (
                  recentTransactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg">
                            {transaction.type === 'deposit' ? '↗️' : 
                             transaction.type === 'withdrawal' ? '↙️' :
                             transaction.type === 'penalty' ? '😬' : '💰'}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-600">
                            {transaction.swearJar?.name} • {api.formatRelativeTime(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.type === 'deposit' || transaction.type === 'penalty' 
                            ? 'text-success-600' 
                            : 'text-danger-600'
                        }`}>
                          {transaction.type === 'deposit' || transaction.type === 'penalty' ? '+' : '-'}
                          {api.formatCurrency(transaction.amount)}
                        </p>
                        <span className={`badge-${
                          transaction.status === 'completed' ? 'success' :
                          transaction.status === 'pending' ? 'warning' :
                          transaction.status === 'failed' ? 'danger' : 'gray'
                        }`}>
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 