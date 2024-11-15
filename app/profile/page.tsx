'use client';

import { useUser } from "@/contexts/UserContext";
import AuthUI from "@/components/AuthUI";

export default function ProfilePage() {
  const { user } = useUser();

  if (!user) {
    return <AuthUI />;
  }

  return (
    <div className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="space-y-4">
        <p>Email: {user.email}</p>
        {/* Add more profile information */}
      </div>
    </div>
  );
} 