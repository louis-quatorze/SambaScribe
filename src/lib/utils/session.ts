import { getSession, signIn } from "next-auth/react";

export async function refreshSession() {
  // Force a refresh of the session
  const event = new Event("visibilitychange");
  document.dispatchEvent(event);
  
  // Wait for the session to be updated
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  // Get the updated session
  const session = await getSession();
  return session;
} 