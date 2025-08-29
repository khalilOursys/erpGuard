"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

// API function - updated to match DTO
const addUser = async (userData: {
  companyId: number;
  identifier: string;
  displayname?: string;
  email?: string;
  password: string;
  role: string;
}) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create user");
  }

  return response.json();
};

export default function Page() {
  const queryClient = useQueryClient();
  const router = useRouter();

  //get IT from token
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

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setToastOpen(true);
  };

  const addUserMutation = useMutation({
    mutationFn: addUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast("✅ Utilisateur créé avec succès", "success");
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

    if (!password || password.length < 6) {
      showToast(
        "❌ Le mot de passe doit contenir au moins 6 caractères",
        "error"
      );
      setIsSubmitting(false);
      return;
    }

    // Prepare user data according to DTO
    const userData = {
      companyId: Number(companyId),
      identifier,
      displayname: displayname || undefined,
      email: email || undefined,
      password,
      role,
    };

    addUserMutation.mutate(userData);
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
                          Ajouter un utilisateur
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
                              onValueChange={(value) => setRole(value)}
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
                            <Label htmlFor="password" className="required">
                              Mot de passe*
                            </Label>
                            <Input
                              id="password"
                              value={password}
                              placeholder="Mot de passe (min 6 caractères)"
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

                        <div className="flex justify-end pt-4">
                          <Button
                            type="submit"
                            variant="default"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                Enregistrement...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-save mr-2"></i>
                                Enregistrer
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
