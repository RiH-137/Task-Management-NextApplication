import { SignIn } from "@clerk/nextjs";

const appearance = {
  variables: {
    colorPrimary: "#111111",
    colorBackground: "#f6f6f6",
    colorInputBackground: "#ffffff",
    colorText: "#111111",
    colorNeutral: "#6f6f6f",
    borderRadius: "12px",
  },
  elements: {
    card: "border border-zinc-200 shadow-sm",
    headerTitle: "font-display text-zinc-900",
    headerSubtitle: "text-zinc-500",
  },
};

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <SignIn routing="path" path="/sign-in" appearance={appearance} />
    </div>
  );
}
