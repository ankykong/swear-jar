import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeftIcon,
  CurrencyDollarIcon,
  UsersIcon,
  PlusIcon,
  MinusIcon,
  ChartBarIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import api from '../services/api';
import toast from 'react-hot-toast';

const SwearJarDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [swearJar, setSwearJar] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // const [showDepositModal, setShowDepositModal] = useState(false);
  // const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const loadSwearJarData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.swearJars.getById(id);
      if (response.success) {
        setSwearJar(response.data);
        
        // Load recent transactions for this jar
        const transactionsResponse = await api.transactions.getAll({ 
          swearJarId: id, 
          limit: 10 
        });
        if (transactionsResponse.success) {
          setTransactions(transactionsResponse.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading swear jar:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const handleDeleteJar = async () => {
    if (!window.confirm(`Are you sure you want to delete "${swearJar.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.swearJars.delete(id);
      if (response.success) {
        toast.success('Swear jar deleted successfully');
        // Navigate back to jars list
        window.history.back();
      } else {
        toast.error(response.error || 'Failed to delete swear jar');
      }
    } catch (error) {
      console.error('Error deleting swear jar:', error);
      toast.error('Failed to delete swear jar');
    }
  };

  useEffect(() => {
    if (id) {
      loadSwearJarData();
    }
  }, [id, loadSwearJarData]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!swearJar) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Swear Jar Not Found</h1>
          <Link to="/swear-jars" className="btn-primary">
            Back to Swear Jars
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link
            to="/swear-jars"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Swear Jars
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{swearJar.name}</h1>
              <p className="text-gray-600 mt-2">{swearJar.description}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className={`badge-${swearJar.owner_id === user?.id ? 'primary' : 'gray'}`}>
                  {swearJar.owner_id === user?.id ? 'owner' : 'member'}
                </span>
                <span className="text-sm text-gray-600">
                  Created {api.formatRelativeTime(swearJar.created_at)}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-4 sm:mt-0">
              <button
                onClick={() => console.log('Deposit modal will be implemented')}
                className="btn-success"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Deposit
              </button>
              <button
                onClick={() => console.log('Withdraw modal will be implemented')}
                className="btn-outline"
              >
                <MinusIcon className="h-4 w-4 mr-2" />
                Withdraw
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Balance Card */}
            <motion.div
              className="card text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                {api.formatCurrency(swearJar.balance || 0, swearJar.currency || 'USD')}
              </h2>
              <p className="text-gray-600">Current Balance</p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {api.formatCurrency(swearJar.statistics?.totalDeposits || 0)}
                  </div>
                  <div className="text-xs text-gray-600">Total Deposits</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {api.formatCurrency(swearJar.statistics?.totalWithdrawals || 0)}
                  </div>
                  <div className="text-xs text-gray-600">Total Withdrawals</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {swearJar.statistics?.transactionCount || 0}
                  </div>
                  <div className="text-xs text-gray-600">Transactions</div>
                </div>
              </div>
            </motion.div>

            {/* Recent Transactions */}
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
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
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                    <p className="text-gray-600">
                      Start by making a deposit or applying a penalty
                    </p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="transaction-item"
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
                            {transaction.user?.name} • {api.formatRelativeTime(transaction.createdAt)}
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
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Members */}
            <motion.div
              className="card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Members</h2>
                <UsersIcon className="h-5 w-5 text-gray-400" />
              </div>

              <div className="space-y-3">
                {swearJar.members?.map((member) => (
                  <div key={member._id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-primary-600">
                          {member.user?.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {member.user?.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {member.user?.email}
                        </p>
                      </div>
                    </div>
                    <span className={`badge-${member.role === 'owner' ? 'primary' : 'gray'}`}>
                      {member.role}
                    </span>
                  </div>
                ))}

                {swearJar.owner_id === user?.id && (
                  <button className="w-full btn-outline text-sm py-2 mt-4">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Invite Member
                  </button>
                )}
              </div>
            </motion.div>

            {/* Settings */}
            <motion.div
              className="card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency</span>
                  <span className="font-medium">{swearJar.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min Deposit</span>
                  <span className="font-medium">
                    {api.formatCurrency(swearJar.settings?.minimumDeposit || 0.01)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Deposit</span>
                  <span className="font-medium">
                    {api.formatCurrency(swearJar.settings?.maximumDeposit || 1000)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Approval Required</span>
                  <span className="font-medium">
                    {swearJar.settings?.requireApprovalForWithdrawals ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {swearJar.owner_id === user?.id && (
                <div className="space-y-2 mt-4">
                  <button className="w-full btn-outline text-sm py-2">
                    Manage Settings
                  </button>
                  <button 
                    onClick={handleDeleteJar}
                    className="w-full btn-danger text-sm py-2"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete Jar
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwearJarDetailPage; 