import React, { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { PlusIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PlaidLinkButton = ({ onSuccess, children, disabled = false, className = "" }) => {
  const { supabase } = useAuth();
  const [isCreatingLinkToken, setIsCreatingLinkToken] = useState(false);
  const [linkToken, setLinkToken] = useState(null);

  // Create link token when component mounts or when triggered
  const createLinkToken = useCallback(async () => {
    if (linkToken || isCreatingLinkToken) return;
    
    setIsCreatingLinkToken(true);
    try {
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to connect a bank account');
        return;
      }

      const response = await api.plaid.createLinkToken();
      if (response.success) {
        setLinkToken(response.data.link_token);
      } else {
        toast.error(response.error || 'Failed to initialize bank connection');
      }
    } catch (error) {
      console.error('Error creating link token:', error);
      toast.error('Failed to initialize bank connection');
    } finally {
      setIsCreatingLinkToken(false);
    }
  }, [linkToken, isCreatingLinkToken, supabase]);

  // Handle successful link
  const onPlaidSuccess = useCallback(async (public_token, metadata) => {
    try {
      toast.loading('Connecting your bank account...');
      
      // Get the user's session token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to connect a bank account');
        return;
      }

      const response = await api.plaid.exchangeToken({
        publicToken: public_token,
        metadata: metadata
      });

      if (response.success) {
        toast.dismiss();
        toast.success('Bank account connected successfully!');
        onSuccess && onSuccess(response.data.accounts);
      } else {
        toast.dismiss();
        toast.error(response.error || 'Failed to connect bank account');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error exchanging token:', error);
      toast.error('Failed to connect bank account');
    }
  }, [onSuccess, supabase]);

  // Handle Plaid errors
  const onPlaidExit = useCallback((err, metadata) => {
    if (err) {
      console.error('Plaid Link error:', err);
      if (err.error_code !== 'USER_EXIT') {
        toast.error('Failed to connect bank account');
      }
    }
  }, []);

  // Initialize Plaid Link
  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
    onEvent: (eventName, metadata) => {
      console.log('Plaid event:', eventName, metadata);
    },
    env: process.env.REACT_APP_PLAID_ENV || 'sandbox',
  };

  const { open, ready } = usePlaidLink(config);

  // Handle button click
  const handleClick = useCallback(async () => {
    if (!linkToken) {
      await createLinkToken();
      return;
    }
    
    if (ready) {
      open();
    } else {
      toast.error('Bank connection is not ready yet. Please try again.');
    }
  }, [linkToken, ready, open, createLinkToken]);

  const isLoading = isCreatingLinkToken || (!ready && linkToken);
  const isDisabled = disabled || isLoading;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <LoadingSpinner size="sm" className="mr-2" />
      ) : (
        children || (
          <>
            <PlusIcon className="h-4 w-4 mr-2" />
            Connect Bank Account
          </>
        )
      )}
    </button>
  );
};

export default PlaidLinkButton; 