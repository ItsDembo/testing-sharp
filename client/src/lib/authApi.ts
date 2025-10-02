export async function apiSignUp(email: string, password: string) {
  // DISABLED: This function is disabled to prevent server-side authentication calls
  // All authentication is now handled by Supabase client-side
  throw new Error('Signup API is disabled. Please use the frontend signup form.');
}

export async function apiSignIn(email: string, password: string) {
  // DISABLED: This function is disabled to prevent server-side authentication calls
  // All authentication is now handled by Supabase client-side
  throw new Error('Signin API is disabled. Please use the frontend login form.');
}

export async function apiRequestReset(email: string) {
  // DISABLED: This function is disabled to prevent server-side password reset calls
  // All password reset is now handled by Supabase client-side authentication
  throw new Error('Password reset API is disabled. Please use the frontend forgot password form.');
}

export async function apiUpdatePassword(newPassword: string) {
  // DISABLED: This function is disabled to prevent server-side password reset calls
  // All password reset is now handled by Supabase client-side authentication
  throw new Error('Password update API is disabled. Please use the frontend reset password form.');
}
