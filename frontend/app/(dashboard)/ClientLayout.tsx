"use client";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // <-- Added import
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"; // <-- Optional: For dev tools

const queryClient = new QueryClient(); // <-- Create a single QueryClient instance

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}> {/* <-- Wrap everything here */}
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex flex-col flex-1">
            <Navbar />
            <main className="flex-1 p-8 overflow-y-auto">{children}</main>
          </div>
        </div>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} /> {/* <-- Optional: Add dev tools */}
    </QueryClientProvider>
  );
}