import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Load user and session on app start
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN') {
        toast.success('Welcome back!');
      } else if (event === 'SIGNED_OUT') {
        toast.success('Logged out successfully');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (error) {
      const message = error.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      if (data.user && !data.user.email_confirmed_at) {
        toast.success('Please check your email to confirm your account');
      } else {
        toast.success('Account created successfully!');
      }

      return { success: true, user: data.user };
    } catch (error) {
      const message = error.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const message = error.message || 'Logout failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      
      // Update auth user metadata
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: updates
      });

      if (authError) {
        toast.error(authError.message);
        return { success: false, error: authError.message };
      }

      // Update user record in database
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      setUser({ ...user, ...authData.user, ...data });
      toast.success('Profile updated successfully');
      return { success: true, user: data };
    } catch (error) {
      const message = error.message || 'Update failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (newPassword) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const message = error.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, session: data.session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    session,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshSession,
    isAuthenticated: !!session,
    supabase, // Expose supabase client for direct use
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 