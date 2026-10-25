import { supabase } from "../lib/supabase";

const authService = {
  // Get logged-in user
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    return user;
  },

  // Get current session
  async getSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    return session;
  },

  // Get user profile
  async getProfile() {
    const user = await this.getCurrentUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    return data;
  },

  // Sign out
  async logout() {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  },
};

export default authService;