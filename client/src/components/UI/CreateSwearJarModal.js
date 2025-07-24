import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CreateSwearJarModal = ({ isOpen, onClose, onJarCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currency: 'USD',
    settings: {
      isPublic: false,
      requireApprovalForWithdrawals: true,
      minimumDeposit: 0.01,
      maximumDeposit: 1000,
      swearWords: [],
      autoDeductOnSwear: false
    }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [newSwearWord, setNewSwearWord] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a jar name');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.swearJars.create(formData);
      if (response.success) {
        toast.success('Swear jar created successfully!');
        onJarCreated(response.data);
        onClose();
        // Reset form
        setFormData({
          name: '',
          description: '',
          currency: 'USD',
          settings: {
            isPublic: false,
            requireApprovalForWithdrawals: true,
            minimumDeposit: 0.01,
            maximumDeposit: 1000,
            swearWords: [],
            autoDeductOnSwear: false
          }
        });
      } else {
        toast.error(response.error || 'Failed to create swear jar');
      }
    } catch (error) {
      console.error('Error creating swear jar:', error);
      toast.error('Failed to create swear jar');
    } finally {
      setIsCreating(false);
    }
  };

  const addSwearWord = () => {
    if (newSwearWord.trim() && !formData.settings.swearWords.includes(newSwearWord.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          swearWords: [...prev.settings.swearWords, newSwearWord.trim().toLowerCase()]
        }
      }));
      setNewSwearWord('');
    }
  };

  const removeSwearWord = (word) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        swearWords: prev.settings.swearWords.filter(w => w !== word)
      }
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('settings.')) {
      const settingName = name.replace('settings.', '');
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingName]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <motion.div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Create New Swear Jar
                    </h3>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Jar Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g., Office Swear Jar"
                        className="input"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Optional description for your swear jar"
                        rows={3}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        className="input"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                      </select>
                    </div>

                    {/* Deposit Limits */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Deposit
                        </label>
                        <input
                          type="number"
                          name="settings.minimumDeposit"
                          value={formData.settings.minimumDeposit}
                          onChange={handleInputChange}
                          min="0.01"
                          step="0.01"
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Deposit
                        </label>
                        <input
                          type="number"
                          name="settings.maximumDeposit"
                          value={formData.settings.maximumDeposit}
                          onChange={handleInputChange}
                          min="0.01"
                          step="0.01"
                          className="input"
                        />
                      </div>
                    </div>

                    {/* Swear Words */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Swear Words to Track
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newSwearWord}
                          onChange={(e) => setNewSwearWord(e.target.value)}
                          placeholder="Add a word..."
                          className="input flex-1"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSwearWord())}
                        />
                        <button
                          type="button"
                          onClick={addSwearWord}
                          className="btn-secondary px-4"
                        >
                          Add
                        </button>
                      </div>
                      {formData.settings.swearWords.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.settings.swearWords.map((word, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                            >
                              {word}
                              <button
                                type="button"
                                onClick={() => removeSwearWord(word)}
                                className="ml-1.5 text-red-400 hover:text-red-600"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Settings */}
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="settings.isPublic"
                          id="isPublic"
                          checked={formData.settings.isPublic}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                          Make this jar public (others can find and join)
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="settings.requireApprovalForWithdrawals"
                          id="requireApproval"
                          checked={formData.settings.requireApprovalForWithdrawals}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="requireApproval" className="ml-2 block text-sm text-gray-900">
                          Require approval for withdrawals
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="settings.autoDeductOnSwear"
                          id="autoDeduct"
                          checked={formData.settings.autoDeductOnSwear}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="autoDeduct" className="ml-2 block text-sm text-gray-900">
                          Auto-deduct when swear words are detected
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="btn-primary sm:ml-3 w-full sm:w-auto disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Jar'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-outline mt-3 sm:mt-0 w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateSwearJarModal; 