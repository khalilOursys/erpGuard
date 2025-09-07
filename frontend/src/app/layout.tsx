import "./globals.css";
import AppThemeProvider from "@/components/theme/ThemeProvider";
import Sidebar from "@/components/Sidebar";
import Header from "../components/Header";

export const metadata = {
  title: "ERPGuard",
  description: "ERP system frontend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppThemeProvider>
          <div className="min-h-screen flex bg-[rgb(var(--color-bg))]">
            {/* Sidebar (desktop only) */}
            <aside className="hidden md:block w-72 p-4 border-r border-[rgba(var(--color-border),1)]">
              <Sidebar />
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col">
              <Header />
              <main className="p-6">{children}</main>
            </div>
          </div>
        </AppThemeProvider>
      </body>
    </html>
  );
}
