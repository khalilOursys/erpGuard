"use client";

import ClientLayout from "./ClientLayout";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Dashboard Layout - Token:", token); // Debug token
    if (!token) {
      router.push("/login");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    console.log("Dashboard Layout - Stored User:", storedUser); // Debug user
    const permissions = storedUser.permissions || [];
    if (!permissions.includes("users.read")) {
      router.push("/");
    }
  }, [router]);

  return <ClientLayout>{children}</ClientLayout>;
}