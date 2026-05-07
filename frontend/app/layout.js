import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Instrument_Serif, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata = {
  title: "Team Task Manager",
  description: "Projects, tasks, and team roles in one clean workspace.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${instrumentSerif.variable} antialiased`}
      >
        <ClerkProvider>
          <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-300 bg-white shadow-sm">
                <span className="font-display text-lg text-zinc-900">T</span>
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-zinc-900">Team Task Manager</p>
                <p className="text-xs text-zinc-500">Admin and member workspaces</p>
              </div>
            </div>
            <nav className="flex items-center gap-2">
              <Show when="signed-out">
                <SignInButton
                  mode="modal"
                  children={
                    <button className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-500 hover:text-zinc-900">
                      Sign in
                    </button>
                  }
                />
                <SignUpButton
                  mode="modal"
                  children={
                    <button className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800">
                      Create account
                    </button>
                  }
                />
              </Show>
              <Show when="signed-in">
                <UserButton afterSignOutUrl="/" />
              </Show>
            </nav>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}