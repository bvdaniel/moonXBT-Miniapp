"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <div>
      <h1>Iniciar Sesión</h1>

      {/* Botón para iniciar sesión con Farcaster */}
      <button onClick={() => signIn("farcaster", { callbackUrl })}>
        Sign In with Farcaster
      </button>

      {/* Botón para iniciar sesión con Twitter */}
      <button onClick={() => signIn("twitter", { callbackUrl })}>
        Sign In with Twitter
      </button>

      {/* ... otros elementos de tu UI de inicio de sesión */}
    </div>
  );
}
