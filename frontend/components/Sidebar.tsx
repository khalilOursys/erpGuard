"use client";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Settings,
  Users,
  Package,
  DollarSign,
  BarChart,
  FileText,
  HelpCircle,
  LogOut,
  Wrench,
  UserCircle,
  ClipboardList,
  Target,
  Building,
  FileCheck,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out");
    window.location.replace("/login");
  };

  return (
    <aside
      className={`border-r bg-card transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      } p-4 flex flex-col`}
    >
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="space-y-2 flex-1">
        {/* <Link href="/">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {!collapsed && "Dashboard"}
          </Button>
        </Link> */}

        {/* Attendance Section */}
        <Link href="/attendance">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <Target className="mr-2 h-4 w-4" />
            {!collapsed && "Attendance"}
          </Button>
        </Link>

        {/* Clients Section */}
        <Link href="/clients">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <Building className="mr-2 h-4 w-4" />
            {!collapsed && "Clients"}
          </Button>
        </Link>

        {/* Contracts Section */}
        <Link href="/contracts">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <FileCheck className="mr-2 h-4 w-4" />
            {!collapsed && "Contracts"}
          </Button>
        </Link>
        
        <Link href="/personnel">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <UserCircle className="mr-2 h-4 w-4" />
            {!collapsed && "Personnel"}
          </Button>
        </Link>

        <Link href="/services">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <Wrench className="mr-2 h-4 w-4" />
            {!collapsed && "Services"}
          </Button>
        </Link>

        <Link href="/invoices">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            {!collapsed && "Invoices"}
          </Button>
        </Link>

        <Link href="/users">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <Users className="mr-2 h-4 w-4" />
            {!collapsed && "Users"}
          </Button>
        </Link>

        <Link href="/company">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <Settings className="mr-2 h-4 w-4" />
            {!collapsed && "Company settings"}
          </Button>
        </Link>
        
        <Button
          variant="ghost"
          className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          {!collapsed && "Help"}
        </Button>
      </nav>
      <div className="mt-auto">
        <Button
          variant="ghost"
          className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Logout"}
        </Button>
      </div>
    </aside>
  );
}
