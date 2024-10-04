"use client";

import React from 'react';

const EnvDisplay: React.FC = () => {
  return (
    <div>
      <h2>Environment Variables:</h2>
      <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
      <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}</p>
    </div>
  );
};

export default EnvDisplay;