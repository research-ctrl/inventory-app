import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata = { title: "Sign Up | SMLS" };

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Shipyard Material Lifecycle</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create your account</p>
        </div>
        <SignUpForm />
      </div>
    </main>
  );
}
