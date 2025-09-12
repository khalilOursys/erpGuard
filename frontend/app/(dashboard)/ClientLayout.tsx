"use client";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

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
  );
}