import { Suspense } from "react";
import SignInForm from "./_components/SignInForm"; // Crearemos este componente

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      {/* Envuelve el componente cliente que usa useSearchParams en Suspense */}
      <SignInForm />
    </Suspense>
  );
}
