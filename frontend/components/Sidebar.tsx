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
        <Link href="/">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {!collapsed && "Dashboard"}
          </Button>
        </Link>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="inventory">
            <AccordionTrigger
              className={`py-2 ${
                collapsed ? "justify-center px-2" : "justify-start"
              }`}
            >
              <Package className="mr-2 h-4 w-4" />
              {!collapsed && "Inventory"}
            </AccordionTrigger>
            <AccordionContent>
              {!collapsed && (
                <div className="space-y-1 pl-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    Products
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    Stock
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    Suppliers
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="sales">
            <AccordionTrigger
              className={`py-2 ${
                collapsed ? "justify-center px-2" : "justify-start"
              }`}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              {!collapsed && "Sales"}
            </AccordionTrigger>
            <AccordionContent>
              {!collapsed && (
                <div className="space-y-1 pl-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    Orders
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    Invoices
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    Customers
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="analytics">
            <AccordionTrigger
              className={`py-2 ${
                collapsed ? "justify-center px-2" : "justify-start"
              }`}
            >
              <BarChart className="mr-2 h-4 w-4" />
              {!collapsed && "Analytics"}
            </AccordionTrigger>
            <AccordionContent>
              {!collapsed && (
                <div className="space-y-1 pl-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    Reports
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    Forecasts
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Link href="/company">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <Settings className="mr-2 h-4 w-4" />
            {!collapsed && "Settings"}
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
        <Link href="/services">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <Wrench className="mr-2 h-4 w-4" />
            {!collapsed && "Services"}
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
        <Link href="/invoices">
          <Button
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            {!collapsed && "Invoices"}
          </Button>
        </Link>
        <Button
          variant="ghost"
          className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
        >
          <FileText className="mr-2 h-4 w-4" />
          {!collapsed && "Documents"}
        </Button>
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
