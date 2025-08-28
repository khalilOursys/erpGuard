"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as Toast from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";

// API functions
const fetchUser = async (id: string) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/users/${id}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }
  return response.json();
};

const updateUser = async (userData: {
  id: string;
  companyId: number;
  identifier: string;
  displayname?: string;
  email?: string;
  password?: string;
  role: string;
}) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/users/${userData.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update user");
  }

  return response.json();
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: PageProps) {
  // Use React.use() to handle the params promise
  const { id } = React.use(params) as { id: string };
  const queryClient = useQueryClient();
  const router = useRouter();

  // State for form fields
  const [companyId, setCompanyId] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [displayname, setDisplayname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("MANAGER");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast states
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Fetch user data
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
    enabled: !!id,
  });

  // Populate form when user data is loaded
  useEffect(() => {
    if (user) {
      console.log(user);
      setCompanyId(user.companyId || 1);
      setIdentifier(user.identifier || "");
      setDisplayname(user.displayname || "");
      setEmail(user.email || "");
      setRole(user.role);
    }
  }, [user]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setToastOpen(true);
  };

  console.log(email);
  const updateUserMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      showToast("✅ Utilisateur modifié avec succès", "success");
      setTimeout(() => {
        router.push("/admin/users");
      }, 1500);
    },
    onError: (error: Error) => {
      showToast(`❌ ${error.message || "Une erreur s'est produite"}`, "error");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    // Validation based on DTO
    if (!companyId || !Number.isInteger(Number(companyId))) {
      showToast("❌ Veuillez entrer un ID de compagnie valide", "error");
      setIsSubmitting(false);
      return;
    }

    if (!identifier) {
      showToast("❌ L'identifiant est requis", "error");
      setIsSubmitting(false);
      return;
    }

    // Password is optional for update, but if provided, must be at least 6 characters
    if (password && password.length < 6) {
      showToast(
        "❌ Le mot de passe doit contenir au moins 6 caractères",
        "error"
      );
      setIsSubmitting(false);
      return;
    }

    // Prepare user data according to DTO
    const userData = {
      id,
      companyId: Number(companyId),
      identifier,
      displayname: displayname || undefined,
      email: email || undefined,
      role,
      // Only include password if it was changed
      ...(password && { password }),
    };

    updateUserMutation.mutate(userData);
  };

  const validateEmail = (email: string) => {
    if (!email) return true; // Email is optional in DTO
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const userList = () => {
    router.push("/admin/users");
  };

  const roleOptions: string[] = [
    "MANAGER",
    "ADMIN",
    "COMMERCIAL",
    "ACCOUNTANT",
    "GUARD",
  ];

  if (isLoading) {
    return (
      <div className="wrapper">
        <div className="main-panel">
          <div className="content">
            <div className="w-full px-4">
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrapper">
        <div className="main-panel">
          <div className="content">
            <div className="w-full px-4">
              <div className="text-center text-destructive">
                Erreur lors du chargement de l'utilisateur
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Toast.Provider swipeDirection="right">
      <div className="wrapper">
        <div className="main-panel">
          <div className="content">
            <div className="w-full px-4">
              <div className="section-image">
                <div className="w-full">
                  <div className="mb-4">
                    <Button onClick={userList} variant="secondary">
                      <i className="fas fa-list mr-2"></i> Retour à la liste
                    </Button>
                  </div>

                  <form onSubmit={submitForm}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-2xl font-bold">
                          Modifier l'utilisateur
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="identifier" className="required">
                              Identifiant*
                            </Label>
                            <Input
                              id="identifier"
                              value={identifier}
                              placeholder="Identifiant unique"
                              onChange={(e) => setIdentifier(e.target.value)}
                              className={cn(
                                !identifier && "border-destructive"
                              )}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="role">Rôle</Label>
                            <Select
                              value={role}
                              onValueChange={(value) => {
                                if (value !== "") setRole(value);
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Sélectionner un rôle" />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map((roleValue) => (
                                  <SelectItem key={roleValue} value={roleValue}>
                                    {roleValue}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="displayname">Nom d'affichage</Label>
                            <Input
                              id="displayname"
                              value={displayname}
                              placeholder="Nom d'affichage"
                              onChange={(e) => setDisplayname(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              value={email}
                              placeholder="Adresse e-mail (optionnel)"
                              type="email"
                              onChange={(e) => setEmail(e.target.value)}
                              className={cn(
                                email &&
                                  !validateEmail(email) &&
                                  "border-destructive"
                              )}
                            />
                            {email && !validateEmail(email) && (
                              <p className="text-sm text-destructive">
                                Format d'email invalide
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="password">
                              Nouveau mot de passe
                            </Label>
                            <Input
                              id="password"
                              value={password}
                              placeholder="Laisser vide pour ne pas modifier"
                              type="password"
                              onChange={(e) => setPassword(e.target.value)}
                              minLength={6}
                              className={cn(
                                password.length > 0 &&
                                  password.length < 6 &&
                                  "border-destructive"
                              )}
                            />
                            {password.length > 0 && password.length < 6 && (
                              <p className="text-sm text-destructive">
                                Le mot de passe doit contenir au moins 6
                                caractères
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end pt-4 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={userList}
                          >
                            Annuler
                          </Button>
                          <Button
                            type="submit"
                            variant="default"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                Modification...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-save mr-2"></i>
                                Modifier
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Toast UI */}
          <Toast.Root
            open={toastOpen}
            onOpenChange={setToastOpen}
            className={cn(
              "fixed top-4 right-4 w-80 rounded-md p-4 shadow-lg",
              toastType === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            )}
            duration={3000}
          >
            <Toast.Title className="font-bold text-sm">{toastMsg}</Toast.Title>
          </Toast.Root>
          <Toast.Viewport className="fixed bottom-4 right-4 w-80 max-w-full outline-none" />
        </div>
      </div>
    </Toast.Provider>
  );
}
