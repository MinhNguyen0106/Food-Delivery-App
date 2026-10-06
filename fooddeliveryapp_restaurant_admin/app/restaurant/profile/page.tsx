"use client";

import { useEffect, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { authService } from "@/services/auth.service";
import { imageService } from "@/services/image.service";
import {
  restaurantInfoService,
  type RestaurantProfileUpdate,
} from "@/services/restaurant/info.service";
import type { RestaurantRecord } from "@/types/service-api";

const RestaurantLocationPicker = dynamic(
  () => import("@/components/restaurant/RestaurantLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-1.5 flex h-80 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        Đang tải bản đồ...
      </div>
    ),
  },
);

type ProfileForm = {
  name: string;
  address: string;
  phone: string;
  description: string;
  latitude: string;
  longitude: string;
  opening_time: string;
  closing_time: string;
};

const emptyForm: ProfileForm = {
  name: "",
  address: "",
  phone: "",
  description: "",
  latitude: "",
  longitude: "",
  opening_time: "",
  closing_time: "",
};

function toForm(profile: RestaurantRecord): ProfileForm {
  return {
    name: profile.name,
    address: profile.address,
    phone: profile.phone,
    description: profile.description ?? "",
    latitude: String(profile.latitude),
    longitude: String(profile.longitude),
    opening_time: profile.opening_time?.slice(0, 5) ?? "",
    closing_time: profile.closing_time?.slice(0, 5) ?? "",
  };
}

export default function RestaurantProfilePage() {
  const [profile, setProfile] = useState<RestaurantRecord | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationResolving, setLocationResolving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      restaurantInfoService.getMyProfile(),
      authService.getProfile(),
    ]).then(([restaurant, account]) => {
      if (!active) return;
      setProfile(restaurant);
      setForm(toForm(restaurant));
      setEmail(account.email);
    }).catch((cause: unknown) => {
      if (active) {
        setError(cause instanceof Error ? cause.message : "Không thể tải hồ sơ nhà hàng.");
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function updateField<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setNotice("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locationResolving) {
      setError("Vui lòng chờ OpenStreetMap xác định địa chỉ trước khi lưu.");
      return;
    }
    if (form.address.trim().length > 255) {
      setError("Địa chỉ không được dài quá 255 ký tự. Vui lòng rút gọn địa chỉ.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload: RestaurantProfileUpdate = {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        description: form.description.trim() || null,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        opening_time: form.opening_time ? `${form.opening_time}:00` : null,
        closing_time: form.closing_time ? `${form.closing_time}:00` : null,
      };
      const updated = await restaurantInfoService.updateMyProfile(payload);
      setProfile(updated);
      setForm(toForm(updated));
      setNotice("Đã lưu thông tin cửa hàng.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu hồ sơ nhà hàng.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await authService.updateRestaurantEmail(email.trim());
      setEmail(updated.email);
      setNotice("Đã cập nhật email đăng nhập.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật email.");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword.length < 8 || newPassword.length > 72) {
      setError("Mật khẩu mới phải có từ 8 đến 72 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Đã đổi mật khẩu.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đổi mật khẩu.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage() {
    if (!profile || !imageFile) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await imageService.uploadRestaurantImage(
        profile.restaurant_id,
        imageFile,
      );
      setProfile({ ...profile, image: result.image });
      setImageFile(null);
      setNotice("Đã cập nhật ảnh nhà hàng.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải ảnh nhà hàng.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteImage() {
    if (!profile) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await imageService.deleteRestaurantImage(profile.restaurant_id);
      setProfile({ ...profile, image: null });
      setImageFile(null);
      setNotice("Đã xóa ảnh nhà hàng.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa ảnh nhà hàng.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500" role="status">Đang tải hồ sơ nhà hàng...</p>;
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-7">
        <p className="text-sm font-medium text-orange-600">Cửa hàng</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Hồ sơ nhà hàng</h1>
        <p className="mt-2 text-sm text-slate-600">Cập nhật thông tin hiển thị và thông tin đăng nhập của cửa hàng.</p>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

      {!profile ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Không tải được hồ sơ cửa hàng.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Tải lại trang</button>
        </div>
      ) : (
        <div className="space-y-6">
          <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold">Thông tin cửa hàng</h2>
              <p className="mt-1 text-sm text-slate-500">Mã nhà hàng: {profile.restaurant_id} · Trạng thái: {profile.status}</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Tên nhà hàng
                <input required maxLength={150} value={form.name} onChange={(event) => updateField("name", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" />
              </label>
              <label className="text-sm font-medium text-slate-700">Số điện thoại
                <input required type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" />
              </label>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">Địa chỉ
                <input required disabled={locationResolving} value={form.address} onChange={(event) => updateField("address", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10 disabled:bg-slate-100" />
              </label>
              <div className="text-sm font-medium text-slate-700 md:col-span-2">
                Vị trí nhà hàng
                <RestaurantLocationPicker
                  latitude={form.latitude.trim() && Number.isFinite(Number(form.latitude)) ? Number(form.latitude) : profile.latitude}
                  longitude={form.longitude.trim() && Number.isFinite(Number(form.longitude)) ? Number(form.longitude) : profile.longitude}
                  address={form.address}
                  onLocationChange={(location) => {
                    setForm((current) => ({
                      ...current,
                      address: location.address,
                      latitude: String(location.latitude),
                      longitude: String(location.longitude),
                    }));
                    setError("");
                    setNotice("");
                  }}
                  onResolvingChange={setLocationResolving}
                />
              </div>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">Mô tả
                <textarea rows={4} maxLength={2000} value={form.description} onChange={(event) => updateField("description", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" />
              </label>
              <label className="text-sm font-medium text-slate-700">Giờ mở cửa
                <input type="time" value={form.opening_time} onChange={(event) => updateField("opening_time", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" />
              </label>
              <label className="text-sm font-medium text-slate-700">Giờ đóng cửa
                <input type="time" value={form.closing_time} onChange={(event) => updateField("closing_time", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" />
              </label>
            </div>
            <div className="mt-6 flex justify-end">
              <button disabled={saving || locationResolving} className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? "Đang lưu..." : locationResolving ? "Đang xác định địa chỉ..." : "Lưu thông tin"}</button>
            </div>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
            <h2 className="text-lg font-semibold">Ảnh nhà hàng</h2>
            <p className="mt-1 text-sm text-slate-500">{profile.image ? `Ảnh hiện tại: ${profile.image}` : "Chưa có ảnh được tải lên."}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm font-medium text-slate-700">Chọn ảnh
                <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="mt-1.5 block w-full rounded-lg border border-slate-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-medium file:text-orange-700" />
              </label>
              <button type="button" onClick={() => void uploadImage()} disabled={saving || !imageFile} className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Tải ảnh lên</button>
              {profile.image && <button type="button" onClick={() => void deleteImage()} disabled={saving} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50">Xóa ảnh</button>}
            </div>
            {imageFile && <p className="mt-2 text-xs text-slate-500">Đã chọn: {imageFile.name}</p>}
          </section>

          <form onSubmit={saveEmail} className="rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
            <h2 className="text-lg font-semibold">Email đăng nhập</h2>
            <p className="mt-1 text-sm text-slate-500">Email được dùng để đăng nhập vào portal nhà hàng.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 flex-1 rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-700" />
              <button disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Cập nhật email</button>
            </div>
          </form>

          <form onSubmit={savePassword} className="rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
            <h2 className="text-lg font-semibold">Đổi mật khẩu</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">Mật khẩu hiện tại
                <input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3" />
              </label>
              <label className="text-sm font-medium text-slate-700">Mật khẩu mới
                <input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3" />
              </label>
              <label className="text-sm font-medium text-slate-700">Xác nhận mật khẩu mới
                <input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3" />
              </label>
            </div>
            <div className="mt-5 flex justify-end">
              <button disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Đổi mật khẩu</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
