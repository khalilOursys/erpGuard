"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ClientForm from "@/components/ClientForm";
import { toast } from "sonner";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function EditClientPage() {
  const router = useRouter();
  const { id } = useParams();
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const data = await api.get(`/clients/${id}?withDeleted=false`);
        setClient(data);
      } catch (err) {
        toast.error("Failed to fetch client");
        router.push("/clients");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchClient();
    }
  }, [id, router]);

  const handleSuccess = () => {
    toast.success("Client updated successfully");
    router.push("/clients");
  };

  const handleCancel = () => {
    router.push("/clients");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!client) {
    return null; // Redirected on error
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-background rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Edit Client</h1>
      <ClientForm
        client={client}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}