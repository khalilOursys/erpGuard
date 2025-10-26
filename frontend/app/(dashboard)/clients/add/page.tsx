"use client";

import { useRouter } from "next/navigation";
import ClientForm from "@/components/ClientForm";
import { toast } from "sonner";

export default function AddClientPage() {
  const router = useRouter();

  const handleSuccess = () => {
    toast.success("Client added successfully");
    router.push("/clients");
  };

  const handleCancel = () => {
    router.push("/clients");
  };

  return (
    // Changed to min-h-screen for full expansion; no overflow to let body scroll
    <div className="min-h-screen w-full bg-background p-6">
      <div className="max-w-2xl mx-auto bg-card rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Add Client</h1>
        <ClientForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}