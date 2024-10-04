"use client";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';

export default function AuthUI() {
  return (
    <div className="w-full max-w-md mx-auto mt-10">
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#ee5622',
                brandAccent: '#eca72c',
                brandButtonText: 'white',
                defaultButtonBackground: '#f5f5f5',
                defaultButtonBackgroundHover: '#e0e0e0',
                inputBackground: 'white',
                inputBorder: '#d1d5db',
                inputBorderHover: '#9ca3af',
                inputBorderFocus: '#ee5622',
              },
            },
          },
          style: {
            button: {
              borderRadius: '0.5rem',
              fontSize: '1rem',
              padding: '0.75rem 1rem',
            },
            input: {
              borderRadius: '0.5rem',
              fontSize: '1rem',
              padding: '0.75rem 1rem',
            },
          },
        }}
        providers={[]}
        redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
      />
    </div>
  );
}