"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";

type PermissionsManagerProps = {
  userId: number;
  onSuccess: () => void;
};

export default function PermissionsManager({ userId, onSuccess }: PermissionsManagerProps) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [newPermission, setNewPermission] = useState("");
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchPermissions();
    fetchAvailablePermissions();
  }, [userId]);

  const fetchPermissions = async () => {
    try {
      const data = await api.get(`/users/${userId}/permissions`);
      setPermissions(data || []);
    } catch (err) {
      toast.error("Failed to fetch permissions");
    }
  };

  const fetchAvailablePermissions = async () => {
    try {
      const data = await api.get("/users/permissions/all");
      setAvailablePermissions(data);
    } catch (err) {
      console.error("Error fetching available permissions:", err);
      toast.error("Failed to fetch available permissions");
      setAvailablePermissions([]); // Fallback to empty list
    }
  };

  const handleGrant = async () => {
    if (!newPermission || permissions.includes(newPermission)) return;
    try {
      await api.post(`/users/${userId}/permissions`, { permissions: [newPermission] });
      toast.success("Permission granted");
      setNewPermission("");
      fetchPermissions();
      onSuccess();
    } catch (err) {
      toast.error("Failed to grant permission");
    }
  };

  const handleRevoke = async (perm: string) => {
    try {
      await api.delete(`/users/${userId}/permissions/${perm}`);
      toast.success("Permission revoked");
      fetchPermissions();
      onSuccess();
    } catch (err) {
      toast.error("Failed to revoke permission");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Manage Permissions</h2>
      <div className="flex space-x-2">
        <Select onValueChange={setNewPermission} value={newPermission}>
          <SelectTrigger>
            <SelectValue placeholder="Select permission" />
          </SelectTrigger>
          <SelectContent>
            {availablePermissions.map((p) => (
              <SelectItem key={p} value={p} disabled={permissions.includes(p)}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleGrant}>Grant</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {permissions.map((p) => (
          <Badge key={p} variant="secondary" className="flex items-center">
            {p}
            <Button variant="ghost" size="sm" onClick={() => handleRevoke(p)} className="ml-2 p-0 h-auto">
              x
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}