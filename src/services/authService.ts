import { supabase, isSupabaseConfigured } from './supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | Error | null;
}

export const authService = {
  async signUp(email: string, password: string, displayName?: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured()) {
      return {
        user: null,
        session: null,
        error: new Error('Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'),
      };
    }

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName || email.split('@')[0],
          timezone: browserTz,
        },
      },
    });

    return { user: data.user, session: data.session, error };
  },

  async signInWithPassword(email: string, password: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured()) {
      return {
        user: null,
        session: null,
        error: new Error('Supabase is not configured yet. Operating in Guest Demo mode.'),
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { user: data.user, session: data.session, error };
  },

  async signInWithOtp(email: string): Promise<{ error: AuthError | Error | null }> {
    if (!isSupabaseConfigured()) {
      return {
        error: new Error('Supabase is not configured yet. Add credentials in .env to use Email OTP.'),
      };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
      },
    });

    return { error };
  },

  async verifyOtp(email: string, token: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured()) {
      return {
        user: null,
        session: null,
        error: new Error('Supabase is not configured yet.'),
      };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });

    return { user: data.user, session: data.session, error };
  },

  async signInWithGoogle(): Promise<{ error: AuthError | Error | null }> {
    if (!isSupabaseConfigured()) {
      return {
        error: new Error('Supabase is not configured yet. Add Supabase credentials in .env to use Google OAuth.'),
      };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    return { error };
  },

  async signOut(): Promise<{ error: AuthError | Error | null }> {
    if (!isSupabaseConfigured()) {
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async resetPasswordForEmail(email: string): Promise<{ error: AuthError | Error | null }> {
    if (!isSupabaseConfigured()) {
      return {
        error: new Error('Supabase is not configured yet. Please configure .env to send reset emails.'),
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error };
  },

  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured()) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async getUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) return null;
    const { data } = await supabase.auth.getUser();
    return data.user;
  },

  onAuthStateChange(callback: (session: Session | null, user: User | null) => void) {
    if (!isSupabaseConfigured()) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session, session?.user || null);
    });
  },
};
