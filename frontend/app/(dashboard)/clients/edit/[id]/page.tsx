"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ClientForm from "@/components/ClientForm";
import { toast } from "sonner";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function EditClientPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
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
      <div className="min-h-screen flex justify-center items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!client) {
    return null; // Redirected on error
  }

  return (
    // Same as add: min-h-screen for expansion, no inner overflow
    <div className="min-h-screen w-full bg-background p-6">
      <div className="max-w-2xl mx-auto bg-card rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Client</h1>
        <ClientForm client={client} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}