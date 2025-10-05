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
    <div className="max-w-2xl mx-auto p-6 bg-background rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Add Client</h1>
      <ClientForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}