import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Trash2,
  Save,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  fmtDate,
  useAdminData,
} from "@/lib/super-admin";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute(
  "/_authenticated/super-admin/users",
)({
  component: UsersPage,
});

const ROLE: Record<string, string> = {
  owner: "Proprietario",
  client: "Cliente",
  super_admin: "Super Admin",
};

function UsersPage() {
  const queryClient = useQueryClient();

  const { users, salons } = useAdminData();

  const [q, setQ] = useState("");

  const [editingUserId, setEditingUserId] =
    useState<string | null>(null);

  const [selectedRole, setSelectedRole] =
    useState<string>("");

  const [savingRole, setSavingRole] =
    useState(false);

  const [deletingUserId, setDeletingUserId] =
    useState<string | null>(null);

  const rows = (users.data ?? []).filter((u) =>
    `${u.email} ${u.full_name}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  function startEditRole(user: any) {
    setEditingUserId(user.id);
    setSelectedRole(user.roles?.[0] ?? "client");
  }

  function cancelEdit() {
    setEditingUserId(null);
    setSelectedRole("");
  }

  async function saveRole(userId: string) {
    if (!selectedRole) {
      alert("Seleziona un ruolo.");
      return;
    }

    setSavingRole(true);

    try {
      const { data, error } =
        await supabase.functions.invoke(
          "admin-manage-user",
          {
            body: {
              action: "update_role",
              user_id: userId,
              role: selectedRole,
            },
          },
        );

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      await queryClient.invalidateQueries({
        queryKey: ["sa", "users"],
      });

      cancelEdit();

      alert("Ruolo aggiornato correttamente.");
    } catch (error: any) {
      alert(
        error?.message ??
          "Errore durante l'aggiornamento del ruolo.",
      );
    } finally {
      setSavingRole(false);
    }
  }

  async function deleteUser(user: any) {
    if (user.roles?.includes("super_admin")) {
      alert(
        "Un Super Admin non può essere eliminato da questa schermata.",
      );
      return;
    }

    const confirmed = confirm(
      `Vuoi davvero eliminare l'utente "${user.email}"?\n\nL'account verrà eliminato definitivamente.`,
    );

    if (!confirmed) return;

    setDeletingUserId(user.id);

    try {
      const { data, error } =
        await supabase.functions.invoke(
          "admin-manage-user",
          {
            body: {
              action: "delete",
              user_id: user.id,
            },
          },
        );

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      await queryClient.invalidateQueries({
        queryKey: ["sa", "users"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["sa", "salons"],
      });

      alert("Utente eliminato correttamente.");
    } catch (error: any) {
      alert(
        error?.message ??
          "Errore durante l'eliminazione dell'utente.",
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Utenti
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Gestisci gli account e i ruoli della piattaforma.
        </p>
      </div>

      {users.isError && (
        <p className="text-sm text-destructive">
          Impossibile caricare gli utenti.
        </p>
      )}

      <Input
        placeholder="Cerca per email o nome…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-xs"
      />

      <div className="surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              {[
                "Email",
                "Nome",
                "Ruolo",
                "Punto vendita",
                "Registrato",
                "Ultimo aggiornamento",
                "Azioni",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {rows.map((u) => {
              const salon = (salons.data ?? []).find(
                (s) => s.owner_id === u.id,
              );

              const isSuperAdmin =
                u.roles?.includes("super_admin");

              const isEditing =
                editingUserId === u.id;

              return (
                <tr
                  key={u.id}
                  className="align-top"
                >
                  <td className="px-4 py-3">
                    {u.email}
                  </td>

                  <td className="px-4 py-3">
                    {u.full_name || "—"}
                  </td>

                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedRole}
                          onChange={(e) =>
                            setSelectedRole(
                              e.target.value,
                            )
                          }
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="owner">
                            Proprietario
                          </option>

                          <option value="client">
                            Cliente
                          </option>

                          <option value="super_admin">
                            Super Admin
                          </option>
                        </select>

                        <Button
                          size="icon"
                          variant="ghost"
                          title="Salva ruolo"
                          disabled={savingRole}
                          onClick={() =>
                            saveRole(u.id)
                          }
                        >
                          <Save className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          title="Annulla"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge
                            key={r}
                            variant="outline"
                          >
                            {ROLE[r] ?? r}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {salon?.name ?? "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {fmtDate(u.created_at)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {fmtDate(u.updated_at)}
                  </td>

                  <td className="px-4 py-3">
                    {!isSuperAdmin && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Modifica ruolo"
                          onClick={() =>
                            startEditRole(u)
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          title="Elimina utente"
                          disabled={
                            deletingUserId === u.id
                          }
                          onClick={() =>
                            deleteUser(u)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {isSuperAdmin && (
                      <span className="text-xs text-muted-foreground">
                        Protetto
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Nessun utente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
