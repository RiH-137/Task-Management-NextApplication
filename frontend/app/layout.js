import { Instrument_Serif, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "../components/AuthProvider";
import AuthHeader from "../components/AuthHeader";
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${instrumentSerif.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <AuthHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}