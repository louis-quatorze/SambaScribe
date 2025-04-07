"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";

// Interface for OAuth button props
interface OAuthButtonProps {
  provider: string;
  logo: React.ReactNode;
  text: string;
  bgColor: string;
  hoverBgColor: string;
  textColor: string;
  borderColor: string;
}

// Generic OAuth Button component
const OAuthButton = ({
  provider,
  logo,
  text,
  bgColor,
  hoverBgColor,
  textColor,
  borderColor,
}: OAuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleClick = async () => {
    try {
      setIsLoading(true);
      await signIn(provider, { callbackUrl });
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`group relative flex w-full items-center justify-center gap-3 rounded-lg ${bgColor} px-4 py-3 ${textColor} border ${borderColor} shadow-sm transition-all hover:${hoverBgColor} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-label={`Sign in with ${provider}`}
    >
      {logo}
      {isLoading ? `Connecting to ${provider}...` : text}
    </button>
  );
};

// Google logo SVG
const GoogleLogo = () => (
  <svg
    className="h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Microsoft logo SVG
const MicrosoftLogo = () => (
  <svg
    className="h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 23 23"
    width="23"
    height="23"
  >
    <rect x="1" y="1" width="10" height="10" fill="#f25022" />
    <rect x="12" y="1" width="10" height="10" fill="#00a4ef" />
    <rect x="1" y="12" width="10" height="10" fill="#7fba00" />
    <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
  </svg>
);

// Email logo component
const EmailLogo = () => <Mail className="h-5 w-5" />;

// Google OAuth Button
export const GoogleButton = () => (
  <OAuthButton
    provider="google"
    logo={<GoogleLogo />}
    text="Sign in with Google"
    bgColor="bg-white dark:bg-gray-800"
    hoverBgColor="bg-gray-100 dark:bg-gray-700"
    textColor="text-gray-800 dark:text-white"
    borderColor="border-gray-300 dark:border-gray-600"
  />
);

// Microsoft OAuth Button
export const MicrosoftButton = () => (
  <OAuthButton
    provider="microsoft"
    logo={<MicrosoftLogo />}
    text="Sign in with Microsoft"
    bgColor="bg-white dark:bg-gray-800"
    hoverBgColor="bg-gray-100 dark:bg-gray-700"
    textColor="text-gray-800 dark:text-white"
    borderColor="border-gray-300 dark:border-gray-600"
  />
);

// Email Button
export const EmailButton = ({
  onClick,
  isLoading,
}: {
  onClick: () => void;
  isLoading: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brandBlue-500 to-brandBlue-600 px-4 py-3 text-white shadow-lg shadow-brandBlue-500/20 transition-all hover:from-brandBlue-600 hover:to-brandBlue-700 hover:shadow-xl hover:shadow-brandBlue-500/30 focus:outline-none focus:ring-2 focus:ring-brandBlue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label="Sign in with Email"
  >
    <EmailLogo />
    {isLoading ? "Sending link..." : "Sign in with Email"}
  </button>
);

// OAuth Buttons Container
export const OAuthButtonsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <div className="space-y-3">{children}</div>;
}; 