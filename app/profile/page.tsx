'use client';

import { useState, useEffect } from 'react';
import { useUser } from "@/contexts/UserContext";
import { useTheme } from 'next-themes';
import AuthUI from "@/components/AuthUI";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggleMinimal } from "@/components/ui/theme-toggle";
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, logout } = useUser();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('account');
  const [mounted, setMounted] = useState(false);

  // After mounting, we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      // Fetch conversation statistics for this user
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user?.id);

      if (conversationError) {
        console.error('Error fetching conversations:', conversationError);
      } else {
        // Calculate statistics
        const totalConversations = conversationData?.length || 0;
        const goodResponses = conversationData?.filter(c => c.good_response)?.length || 0;
        const badResponses = conversationData?.filter(c => c.bad_response)?.length || 0;
        const neutralResponses = conversationData?.filter(c => c.neutral_response)?.length || 0;
        
        setUserStats({
          totalConversations,
          goodResponses,
          badResponses,
          neutralResponses,
          lastActive: conversationData?.length > 0 
            ? new Date(Math.max(...conversationData.map(c => new Date(c.updated_at).getTime()))).toLocaleDateString()
            : 'Never'
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <AuthUI />;
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const userEmail = user?.email || '';
  const userName = user?.user_metadata?.full_name || userEmail.split('@')[0];
  const userInitials = getInitials(userName);

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        {/* Header with user info */}
        <div className="p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-white dark:border-gray-800 shadow-md">
              {user?.user_metadata?.avatar_url ? (
                <Image 
                  src={user.user_metadata.avatar_url} 
                  alt={userName}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white text-2xl font-semibold">
                  {userInitials}
                </div>
              )}
            </Avatar>
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></div>
          </div>
          
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold">{userName}</h1>
            <p className="text-gray-500 dark:text-gray-400">{userEmail}</p>
            <div className="mt-2 flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                User
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                Joined {new Date(user?.created_at || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="ml-auto mt-4 md:mt-0">
            <Button 
              variant="outline" 
              onClick={() => logout()}
              className="rounded-full px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Sign Out
            </Button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="border-t border-gray-200 dark:border-gray-800">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('account')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'account'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'preferences'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Preferences
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="p-6">
          {activeTab === 'account' && (
            <div className="space-y-6">
              <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-xl">
                <div className="p-6">
                  <h3 className="text-lg font-medium">Account Information</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your account details</p>
                </div>
                <Separator />
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                        value={userEmail}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        User ID
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                        value={user?.id || ''}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-xl">
                <div className="p-6">
                  <h3 className="text-lg font-medium">Subscription</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage your subscription plan</p>
                </div>
                <Separator />
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Free Plan</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Basic access to standards</p>
                    </div>
                    <Button variant="outline" className="rounded-lg">
                      Upgrade
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
          
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-xl">
                <div className="p-6">
                  <h3 className="text-lg font-medium">Conversation Statistics</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your interaction history</p>
                </div>
                <Separator />
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Conversations</h4>
                      <p className="text-2xl font-bold mt-1">{userStats?.totalConversations || 0}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Good Responses</h4>
                      <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{userStats?.goodResponses || 0}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Neutral Responses</h4>
                      <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{userStats?.neutralResponses || 0}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bad Responses</h4>
                      <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{userStats?.badResponses || 0}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Last Active</h4>
                    <p className="text-gray-700 dark:text-gray-300">{userStats?.lastActive || 'Never'}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
          
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-xl">
                <div className="p-6">
                  <h3 className="text-lg font-medium">Appearance</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Customize your interface</p>
                </div>
                <Separator />
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Dark Mode</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Toggle between light and dark themes</p>
                    </div>
                    <ThemeToggleMinimal />
                  </div>
                </div>
              </Card>
              
              <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-xl">
                <div className="p-6">
                  <h3 className="text-lg font-medium">Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage your notification preferences</p>
                </div>
                <Separator />
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates via email</p>
                    </div>
                    <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full">
                      <input
                        type="checkbox"
                        id="email-toggle"
                        className="absolute w-6 h-6 transition duration-200 ease-in-out transform bg-white border rounded-full appearance-none cursor-pointer peer border-gray-300 dark:border-gray-700 checked:right-0 checked:border-blue-600 dark:checked:border-blue-400 checked:bg-blue-600 dark:checked:bg-blue-400"
                        defaultChecked
                      />
                      <label
                        htmlFor="email-toggle"
                        className="block w-full h-full overflow-hidden rounded-full cursor-pointer bg-gray-300 dark:bg-gray-700 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-400"
                      ></label>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 