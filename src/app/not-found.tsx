import { ActionLink } from "@/components/action-link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-start justify-center px-6 py-16">
      <p className="chip">404</p>
      <h1 className="mt-3">This page is not here.</h1>
      <p className="mt-4 text-slate-600">
        The link may have changed. Head back to the start.
      </p>
      <div className="mt-8">
        <ActionLink href="/">Go home</ActionLink>
      </div>
    </main>
  );
}
