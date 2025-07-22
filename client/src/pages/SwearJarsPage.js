import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  CurrencyDollarIcon, 
  UsersIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import api from '../services/api';

const SwearJarsPage = () => {
  const [swearJars, setSwearJars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, owned, member

  useEffect(() => {
    loadSwearJars();
  }, []);

  const loadSwearJars = async () => {
    setIsLoading(true);
    try {
      const response = await api.swearJars.getAll();
      if (response.success) {
        setSwearJars(response.data.swearJars || []);
      }
    } catch (error) {
      console.error('Error loading swear jars:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJars = swearJars.filter(jar => {
    const matchesSearch = jar.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         jar.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'owned') return matchesSearch && jar.userRole === 'owner';
    if (filter === 'member') return matchesSearch && jar.userRole === 'member';
    return matchesSearch;
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Swear Jars</h1>
              <p className="text-gray-600 mt-2">
                Manage your virtual swear jars and track your progress
              </p>
            </div>
            <button className="btn-primary mt-4 sm:mt-0">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Jar
            </button>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search swear jars..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'owned', 'member'].map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === filterOption
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Swear Jars Grid */}
        {filteredJars.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <CurrencyDollarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchTerm ? 'No jars match your search' : 'No swear jars yet'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm 
                ? 'Try adjusting your search terms or filters'
                : 'Create your first swear jar to start tracking penalties for bad language'
              }
            </p>
            {!searchTerm && (
              <button className="btn-primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Jar
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {filteredJars.map((jar, index) => (
              <motion.div
                key={jar._id}
                className="swear-jar-card group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <Link to={`/swear-jars/${jar._id}`} className="block">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {jar.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {jar.description || 'No description'}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className={`badge-${jar.userRole === 'owner' ? 'primary' : 'gray'}`}>
                        {jar.userRole}
                      </span>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {api.formatCurrency(jar.balance, jar.currency)}
                    </div>
                    <div className="text-sm text-gray-600">Current balance</div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <UsersIcon className="h-4 w-4 mr-1" />
                      {jar.members?.length || 0} member(s)
                    </div>
                    <div className="text-xs">
                      Created {api.formatRelativeTime(jar.createdAt)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button className="flex-1 btn-outline text-xs py-2">
                      Quick Deposit
                    </button>
                    {jar.userRole === 'owner' && (
                      <button className="btn-secondary p-2">
                        <Cog6ToothIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Summary Stats */}
        {filteredJars.length > 0 && (
          <motion.div
            className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="stats-card">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {filteredJars.length}
                </div>
                <div className="text-sm text-gray-600">Total Jars</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {api.formatCurrency(filteredJars.reduce((sum, jar) => sum + jar.balance, 0))}
                </div>
                <div className="text-sm text-gray-600">Total Balance</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {filteredJars.filter(jar => jar.userRole === 'owner').length}
                </div>
                <div className="text-sm text-gray-600">Owned by You</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SwearJarsPage; 