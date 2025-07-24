import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon,
  CreditCardIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import PlaidLinkButton from '../components/UI/PlaidLinkButton';
import api from '../services/api';

const BankAccountsPage = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await api.plaid.getAccounts();
      if (response.success) {
        setBankAccounts(response.data || []);
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountConnected = (newAccounts) => {
    // Refresh the bank accounts list after successful connection
    loadBankAccounts();
  };

  const getAccountIcon = (accountType) => {
    switch (accountType) {
      case 'checking':
      case 'savings':
        return <BanknotesIcon className="h-6 w-6" />;
      case 'credit':
        return <CreditCardIcon className="h-6 w-6" />;
      default:
        return <BanknotesIcon className="h-6 w-6" />;
    }
  };

  // const getStatusColor = (status) => {
  //   switch (status) {
  //     case 'verified':
  //       return 'text-success-600';
  //     case 'pending':
  //       return 'text-warning-600';
  //     case 'failed':
  //       return 'text-danger-600';
  //     default:
  //       return 'text-gray-600';
  //   }
  // };

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
              <p className="text-gray-600 mt-2">
                Connect your bank accounts to easily transfer money to and from your swear jars
              </p>
            </div>
            <PlaidLinkButton
              onSuccess={handleAccountConnected}
              className="btn-primary mt-4 sm:mt-0"
            />
          </div>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Bank-level security with Plaid
              </h3>
              <p className="text-sm text-blue-700">
                Your bank credentials are encrypted and secure. We use Plaid's industry-leading 
                security to protect your financial information and never store your login details.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bank Accounts List */}
        {bankAccounts.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <CreditCardIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No bank accounts connected</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Connect your bank account to easily transfer money to and from your swear jars. 
              Your information is protected by bank-level security.
            </p>
            <PlaidLinkButton
              onSuccess={handleAccountConnected}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Connect Your First Account
            </PlaidLinkButton>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {bankAccounts.map((account, index) => (
              <motion.div
                key={account.id}
                className="card hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
                      {getAccountIcon(account.account_type)}
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium text-gray-900">{account.institution_name}</h3>
                      <p className="text-sm text-gray-600">{account.account_name}</p>
                    </div>
                  </div>
                  <span className={`badge-${
                    account.verification?.status === 'verified' ? 'success' :
                    account.verification?.status === 'pending' ? 'warning' : 'danger'
                  }`}>
                    {account.verification?.status || 'unverified'}
                  </span>
                </div>

                {/* Account Details */}
                                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Account Type</span>
                      <span className="font-medium capitalize">{account.account_type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Account Number</span>
                      <span className="font-medium">****{account.mask}</span>
                    </div>
                    {account.balance && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Available Balance</span>
                        <span className="font-medium">
                          {api.formatCurrency(account.balance.available || account.balance.current || 0)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="font-medium">
                        {account.last_sync_at ? api.formatRelativeTime(account.last_sync_at) : 'Never'}
                      </span>
                    </div>
                  </div>

                {/* Permissions */}
                <div className="mb-4">
                  <div className="text-xs text-gray-600 mb-2">Permissions:</div>
                  <div className="flex gap-2">
                    <span className={`badge-${account.permissions?.canDeposit ? 'success' : 'gray'}`}>
                      {account.permissions?.canDeposit ? 'Can Deposit' : 'No Deposits'}
                    </span>
                    <span className={`badge-${account.permissions?.canWithdraw ? 'success' : 'gray'}`}>
                      {account.permissions?.canWithdraw ? 'Can Withdraw' : 'No Withdrawals'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button className="flex-1 btn-outline text-xs py-2">
                    Update Balance
                  </button>
                  <button className="flex-1 btn-outline text-xs py-2">
                    Settings
                  </button>
                </div>

                {/* Sync Errors */}
                {account.sync_errors && account.sync_errors.length > 0 && (
                  <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-4 w-4 text-warning-600 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs font-medium text-warning-900">Sync Issue</p>
                        <p className="text-xs text-warning-700">
                          {account.sync_errors[0].error || account.sync_errors[0]}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Features */}
        <motion.div
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="h-6 w-6 text-success-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Secure Connection</h3>
            <p className="text-sm text-gray-600">
              Bank-level encryption and security through Plaid's trusted platform
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BanknotesIcon className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Instant Transfers</h3>
            <p className="text-sm text-gray-600">
              Move money quickly between your bank accounts and swear jars
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CreditCardIcon className="h-6 w-6 text-warning-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Multiple Accounts</h3>
            <p className="text-sm text-gray-600">
              Connect checking, savings, and other account types for flexibility
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BankAccountsPage; 