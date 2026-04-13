"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Member {
  id: string;
  role: "owner" | "editor" | "viewer";
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface TeamClientProps {
  orgId: string;
  currentRole: "owner" | "editor" | "viewer";
  orgPlan: "free" | "pro";
  members: Member[];
  currentUserId: string;
}

export function TeamClient({
  orgId,
  currentRole,
  orgPlan,
  members,
  currentUserId,
}: TeamClientProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "editor" | "viewer">("viewer");

  const { data: membersData, refetch } = api.teams.members.useQuery(
    { orgId },
    { initialData: members as any }
  );

  const inviteMutation = api.teams.invite.useMutation({
    onSuccess: (data: { message: string }) => {
      toast.success(data.message);
      setIsInviteOpen(false);
      setInviteEmail("");
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const updateRoleMutation = api.teams.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const removeMutation = api.teams.remove.useMutation({
    onSuccess: () => {
      toast.success("Member removed successfully");
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    inviteMutation.mutate({ orgId, email: inviteEmail, role: inviteRole });
  };

  const handleRoleChange = (memberId: string, newRole: "owner" | "editor" | "viewer") => {
    updateRoleMutation.mutate({ orgId, memberId, newRole });
  };

  const handleRemove = (memberId: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      removeMutation.mutate({ orgId, memberId });
    }
  };

  const isOwner = currentRole === "owner";
  const canInvite = isOwner && (orgPlan === "pro" || (membersData?.length || 0) < 3);
  const ownerCount = membersData?.filter((m: any) => m.role === "owner").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">
            Manage your organization members and their roles
          </p>
        </div>
        {canInvite && (
          <div className="flex items-center gap-2">
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-64"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "owner" | "editor" | "viewer")}
              className="border rounded px-2 py-1"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="owner">Owner</option>
            </select>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Inviting..." : "Invite"}
            </Button>
          </div>
        )}
        {!canInvite && isOwner && (
          <div className="text-sm text-muted-foreground">
            Free plan allows 3 members. Upgrade to Pro for more.
          </div>
        )}
      </div>

      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Member</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {membersData?.map((member: any) => (
              <tr key={member.id} className="border-b">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.image || undefined} />
                      <AvatarFallback>
                        {member.name?.charAt(0) || member.email?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.name || "Unknown"}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isOwner && member.userId !== currentUserId ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as "owner" | "editor" | "viewer")}
                      className="border rounded px-2 py-1"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="owner">Owner</option>
                    </select>
                  ) : (
                    <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isOwner && member.userId !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(member.id)}
                      disabled={member.role === "owner" && ownerCount === 1}
                    >
                      Remove
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}