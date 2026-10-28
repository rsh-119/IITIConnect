type GoogleWorkspaceUser = {
  email?: string;
  email_confirmed_at?: string;
  identities?: {
    provider: string;
    identity_data?: {
      email?: unknown;
      email_verified?: unknown;
      hd?: unknown;
      custom_claims?: { hd?: unknown };
    };
  }[];
};

export function isAllowedGoogleWorkspaceUser(
  user: GoogleWorkspaceUser | null,
  domain = "iiti.ac.in",
) {
  if (!user?.email_confirmed_at) return false;
  const email = user.email?.trim().toLowerCase();
  if (!email || !email.endsWith(`@${domain}`)) return false;
  return Boolean(
    user.identities?.some((identity) => {
      const data = identity.identity_data;
      // Supabase stores Google's hosted-domain claim under custom_claims.
      const hd = data?.custom_claims?.hd ?? data?.hd;
      return (
        identity.provider === "google" &&
        typeof data?.email === "string" &&
        data.email.toLowerCase() === email &&
        data.email_verified === true &&
        typeof hd === "string" &&
        hd.toLowerCase() === domain
      );
    }),
  );
}
