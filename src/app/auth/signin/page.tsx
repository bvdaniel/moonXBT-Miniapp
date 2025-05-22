"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Optional: You can handle errors here if needed
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      console.error("Error during sign-in:", error);
      // You can display an error message to the user here
    }
  }, [error]);

  return (
    <div>
      <h1>Sign In</h1>
      {error && (
        <p style={{ color: "red" }}>
          An error occurred while trying to sign in.
        </p>
      )}
      <button onClick={() => signIn("farcaster", { callbackUrl })}>
        Sign in with Farcaster
      </button>
      <br />
      <button onClick={() => signIn("twitter", { callbackUrl })}>
        Sign in with Twitter
      </button>
      {/* Add more buttons if you have other providers */}
    </div>
  );
}
