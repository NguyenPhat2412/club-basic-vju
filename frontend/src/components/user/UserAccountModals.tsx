"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Plus, Trash2, UserPlus } from "lucide-react";
import { apiModel, Club, Role, User } from "@/lib/api";
import { ModalShell } from "@/components/shared/Overlays";
import { EMPTY_ROLE_DRAFT, RoleDraft, RolePicker, toAssignment } from "@/components/shared/RolePicker";
import { describeError } from "@/components/shared/ListPage";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { CreateUserFormValues, EMPTY_CREATE_USER_FORM } from "@/forms/user/user-form";

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function CreateUserModal({
  open,
  onClose,
  canAssign,
  roles,
  clubs,
  googleDomains,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  canAssign: boolean;
  roles: Role[];
  clubs: Club[];
  googleDomains: string[];
  onSuccess: (user: User, forceChange: boolean) => void;
}) {
  const [form, setForm] = useState<CreateUserFormValues>(EMPTY_CREATE_USER_FORM);
  const [forceChange, setForceChange] = useState(true);
  const [roleDrafts, setRoleDrafts] = useState<RoleDraft[]>(canAssign ? [EMPTY_ROLE_DRAFT] : []);

  const isGoogleEmail = (email: string) =>
    googleDomains.some((d) => email.trim().toLowerCase().endsWith(`@${d.toLowerCase()}`));
  const googleAccount = isGoogleEmail(form.email);
  const studentNeedsSchoolEmail =
    googleDomains.length > 0 && !!form.studentCode.trim() && !!form.email && !googleAccount;

  const pendingRoles = roleDrafts.map((d) => toAssignment(d, roles));
  const rolesIncomplete = pendingRoles.some((r) => r === null);

  const create = useMutation({
    mutationFn: () =>
      apiModel.createUser({
        email: form.email,
        fullName: form.fullName,
        password: googleAccount ? undefined : form.password,
        studentCode: form.studentCode || undefined,
        phone: form.phone || undefined,
        requiresPasswordChange: googleAccount ? false : forceChange,
        roles: pendingRoles.filter((r) => r !== null),
      }),
    onSuccess: (user) => {
      onSuccess(user, forceChange);
      setForm(EMPTY_CREATE_USER_FORM);
      setRoleDrafts(canAssign ? [EMPTY_ROLE_DRAFT] : []);
      setForceChange(true);
      onClose();
    },
  });

  const set = (key: keyof CreateUserFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Tạo tài khoản mới"
      icon={<UserPlus />}
      onSubmit={() => create.mutate()}
      submitLabel="Tạo tài khoản"
      submitLoading={create.isPending}
      submitDisabled={
        !form.email ||
        !form.fullName ||
        (!googleAccount && form.password.length < 8) ||
        studentNeedsSchoolEmail ||
        rolesIncomplete
      }
    >
      <FormField label="Email" required>
        <Input
          type="email"
          autoComplete="off"
          value={form.email}
          onChange={set("email")}
          placeholder={googleDomains[0] ? `masv@${googleDomains[0]}` : "sinhvien@vju.ac.vn"}
        />
      </FormField>
      <FormField label="Họ và tên" required>
        <Input value={form.fullName} onChange={set("fullName")} placeholder="Nguyễn Văn A" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Mã sinh viên">
          <Input value={form.studentCode} onChange={set("studentCode")} placeholder="22110001" />
        </FormField>
        <FormField label="Điện thoại">
          <Input value={form.phone} onChange={set("phone")} placeholder="0901234567" />
        </FormField>
      </div>
      {studentNeedsSchoolEmail && (
        <p className="text-xs text-destructive">
          Tài khoản sinh viên (có mã sinh viên) phải dùng email @{googleDomains[0]}.
        </p>
      )}
      {googleAccount ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-5">
          Sinh viên này sẽ đăng nhập bằng <b>tài khoản Google của trường</b> ({form.email.trim()}), không
          cần mật khẩu. Chỉ cần báo cho sinh viên vào trang đăng nhập và bấm &quot;Đăng nhập bằng
          Google&quot;.
        </p>
      ) : (
        <>
          <FormField
            label="Mật khẩu ban đầu"
            required
            hint="Tối thiểu 8 ký tự. Gửi cho người dùng qua kênh riêng."
          >
            <Input type="text" autoComplete="new-password" value={form.password} onChange={set("password")} />
          </FormField>
          <Checkbox
            checked={forceChange}
            onChange={setForceChange}
            label="Bắt buộc người dùng đổi mật khẩu ở lần đăng nhập đầu (khuyến nghị)"
          />
        </>
      )}
      {canAssign && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Vai trò & Phạm vi</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRoleDrafts((d) => [...d, EMPTY_ROLE_DRAFT])}
            >
              <Plus size={14} /> Thêm vai trò
            </Button>
          </div>
          {roleDrafts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Chưa gán vai trò: tài khoản sẽ là tài khoản sinh viên mặc định cho tới khi được bổ nhiệm.
            </p>
          )}
          {roleDrafts.map((draft, index) => (
            <RolePicker
              key={index}
              value={draft}
              roles={roles}
              clubs={clubs}
              onChange={(value) => setRoleDrafts((d) => d.map((x, i) => (i === index ? value : x)))}
              onRemove={() => setRoleDrafts((d) => d.filter((_, i) => i !== index))}
            />
          ))}
          <p className="text-xs text-muted-foreground">
            Bạn chỉ gán được vai trò gồm các quyền mà chính bạn đang có.
          </p>
        </div>
      )}
      {create.error && <p className="text-xs text-destructive">{describeError(create.error)}</p>}
    </ModalShell>
  );
}

export function ResetUserPasswordModal({
  user,
  onClose,
  onSuccess,
}: {
  user: User | null;
  onClose: () => void;
  onSuccess: (user: User) => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [resetForceChange, setResetForceChange] = useState(true);

  const reset = useMutation({
    mutationFn: () => apiModel.resetPassword(user!.id, newPassword, resetForceChange),
    onSuccess: () => {
      if (user) onSuccess(user);
      setNewPassword("");
      setResetForceChange(true);
      onClose();
    },
  });

  return (
    <ModalShell
      open={!!user}
      onClose={onClose}
      title="Đặt lại mật khẩu"
      icon={<KeyRound />}
      size="sm"
      onSubmit={() => reset.mutate()}
      submitLabel="Đặt lại"
      submitLoading={reset.isPending}
      submitDisabled={newPassword.length < 8}
    >
      <p className="text-sm">
        Tài khoản: <b>{user?.email}</b>
      </p>
      <FormField label="Mật khẩu mới" required hint="Mọi phiên đăng nhập hiện có của người này sẽ bị đăng xuất.">
        <Input
          type="text"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </FormField>
      <Checkbox
        checked={resetForceChange}
        onChange={setResetForceChange}
        label="Bắt buộc đổi lại mật khẩu ở lần đăng nhập tiếp theo"
      />
      {reset.error && <p className="text-xs text-destructive">{describeError(reset.error)}</p>}
    </ModalShell>
  );
}

export function DeleteUserAccountModal({
  user,
  onClose,
  onSuccess,
}: {
  user: User | null;
  onClose: () => void;
  onSuccess: (user: User) => void;
}) {
  const [forceAnonymize, setForceAnonymize] = useState(false);

  const deleteAccount = useMutation({
    mutationFn: ({ target, anonymize }: { target: User; anonymize?: boolean }) =>
      apiModel.deleteUser(target.id, anonymize),
    onSuccess: (_, { target }) => {
      setForceAnonymize(false);
      onSuccess(target);
      onClose();
    },
  });

  return (
    <ModalShell
      open={!!user}
      onClose={onClose}
      title="Xoá hoặc Ẩn danh dữ liệu tài khoản (PB-38)"
      icon={<Trash2 />}
      size="sm"
      submitDanger
      submitLabel="Xác nhận thực hiện"
      submitLoading={deleteAccount.isPending}
      onSubmit={() =>
        user && deleteAccount.mutate({ target: user, anonymize: forceAnonymize ? true : undefined })
      }
    >
      {user && (
        <div className="space-y-3 text-sm">
          <p>
            Tài khoản mục tiêu: <b>{user.fullName || user.email}</b> ({user.email})
          </p>
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
            <p className="font-semibold text-foreground">Chính sách bảo toàn lịch sử hệ thống:</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>
                Nếu tài khoản <b>chưa phát sinh dữ liệu nghiệp vụ</b>, hệ thống xoá vật lý hoàn toàn bản ghi.
              </li>
              <li>
                Nếu tài khoản <b>đã có lịch sử</b> (đơn tuyển, thành viên, sự kiện, điểm danh, công việc, tài liệu hoặc audit), hệ thống tự động <b>ẩn danh PII</b>, thu hồi quyền/phiên đăng nhập và giữ nguyên 100% lịch sử CLB.
              </li>
            </ul>
          </div>
          <Checkbox
            checked={forceAnonymize}
            onChange={setForceAnonymize}
            label="Buộc ẩn danh PII thay vì xoá vật lý ngay cả khi tài khoản chưa phát sinh lịch sử"
          />
          {deleteAccount.error && <p className="text-xs text-destructive">{describeError(deleteAccount.error)}</p>}
        </div>
      )}
    </ModalShell>
  );
}
