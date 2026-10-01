"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authService } from "@/services/auth.service";

type AccountType = "admin" | "restaurant";

const accountCopy: Record<
  AccountType,
  { title: string; description: string; emailLabel: string; note: string }
> = {
  admin: {
    title: "Chào mừng trở lại",
    description: "Đăng nhập để quản trị toàn bộ nền tảng.",
    emailLabel: "Email quản trị",
    note: "Tài khoản Admin được cấp bởi hệ thống.",
  },
  restaurant: {
    title: "Chào mừng trở lại",
    description: "Đăng nhập để quản lý hoạt động nhà hàng.",
    emailLabel: "Email nhà hàng",
    note: "Sử dụng tài khoản nhà hàng đã được cấp hoặc phê duyệt.",
  },
};

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M7.2 3.8v5.4m3.2-5.4v5.4m-1.6-5.4v16.4M5.6 9.2c0 1.4 1.4 2.5 3.2 2.5S12 10.6 12 9.2M17 3.8v16.4m0-16.4c2.1 1.6 3.2 4 3.2 6.7v1.1H17"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("restaurant");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const copy = accountCopy[accountType];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const result = await authService.login(
        String(form.get("email") ?? ""),
        String(form.get("password") ?? ""),
      );
      const expectedRole = accountType === "admin" ? "ADMIN" : "RESTAURANT";
      if (result.user.role !== expectedRole) {
        window.localStorage.removeItem("accessToken");
        window.localStorage.removeItem("token");
        setMessage(accountType === "admin"
          ? "Tài khoản này không có quyền quản trị Admin."
          : "Tài khoản này không thuộc nhà hàng.");
        return;
      }
      router.replace(accountType === "admin" ? "/admin/dashboard" : "/restaurant/dashboard");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Đăng nhập thất bại.");
    } finally {
      setBusy(false);
    }
  }

  function selectAccountType(type: AccountType) {
    setAccountType(type);
    setMessage("");
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="brand-panel" aria-label="FoodFlow">
          <div className="brand-panel-top">
            <Link className="brand-lockup" href="/" aria-label="FoodFlow — Trang chủ">
              <BrandMark />
              <span>food<span className="brand-name-light">flow</span></span>
            </Link>
            <span className="brand-tag">OPERATIONS</span>
          </div>

          <div className="brand-content">
            <span className="eyebrow"><span className="eyebrow-dot" /> NỀN TẢNG VẬN HÀNH ẨM THỰC</span>
            <h1>
              Một nơi để
              <br />
              mọi thứ <span>vận hành</span>
              <br />
              thật nhịp nhàng.
            </h1>
            <p className="brand-description">
              Kết nối quản trị viên và nhà hàng trên một nền tảng giao đồ ăn
              thống nhất, rõ ràng và dễ sử dụng.
            </p>

            <div className="brand-visual" aria-hidden="true">
              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />
              <div className="visual-center">
                <svg viewBox="0 0 48 48" fill="none">
                  <path
                    d="M15 9v11m6-11v11m-3-11v30m-6-19c0 3 2.7 5.5 6 5.5s6-2.5 6-5.5M31 9v30m0-30c4 3 6 7.5 6 12.5v2h-6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.2"
                  />
                </svg>
              </div>
              <div className="visual-card visual-card-top">
                <span className="visual-card-icon">
                  <svg viewBox="0 0 20 20" fill="none">
                    <path d="M4 5h12M4 10h8M4 15h10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
                  </svg>
                </span>
                <span><strong>Đơn hàng</strong><small>Theo dõi tập trung</small></span>
                <span className="visual-check">✓</span>
              </div>
              <div className="visual-card visual-card-bottom">
                <span className="visual-card-icon menu-icon">
                  <svg viewBox="0 0 20 20" fill="none">
                    <path d="M3.5 6.5h13M3.5 10h13M3.5 13.5h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
                  </svg>
                </span>
                <span><strong>Thực đơn</strong><small>Quản lý thật dễ dàng</small></span>
                <span className="visual-check">✓</span>
              </div>
              <span className="visual-sparkle sparkle-one">✳</span>
              <span className="visual-sparkle sparkle-two">✳</span>
            </div>
          </div>

          <div className="brand-panel-footer">
            <span>Đơn giản hóa vận hành. Tập trung vào món ngon.</span>
            <span className="footer-indicator"><i /> HỆ THỐNG QUẢN LÝ</span>
          </div>
        </section>

        <section className="form-panel" aria-labelledby="login-title">
          <div className="form-topline">
            <span className="secure-label">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 7V5a4 4 0 0 1 8 0v2m-8 0h8a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="8" cy="10.5" r="1" fill="currentColor" />
              </svg>
              ĐĂNG NHẬP BẢO MẬT
            </span>
            <span className="help-caption">Dành cho đội ngũ vận hành</span>
          </div>

          <div className="login-form-content">
            <div className="form-heading">
              <span className="mobile-brand"><BrandMark /> FOODFLOW</span>
              <p className="form-kicker">XIN CHÀO 👋</p>
              <h2 id="login-title">{copy.title}</h2>
              <p>{copy.description}</p>
            </div>

            <div className="role-switch" role="group" aria-label="Chọn loại tài khoản">
              <button
                className={accountType === "restaurant" ? "role-option selected" : "role-option"}
                type="button"
                aria-pressed={accountType === "restaurant"}
                onClick={() => selectAccountType("restaurant")}
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M3 8.5 10 3l7 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-7Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d="M7.5 17v-5h5v5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
                Nhà hàng
              </button>
              <button
                className={accountType === "admin" ? "role-option selected" : "role-option"}
                type="button"
                aria-pressed={accountType === "admin"}
                onClick={() => selectAccountType("admin")}
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 2.5 3.5 5v4.7c0 3.8 2.8 6.8 6.5 7.8 3.7-1 6.5-4 6.5-7.8V5L10 2.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
                  <path d="m7.5 9.8 1.7 1.7 3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
                Admin
              </button>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="field-label" htmlFor="email">{copy.emailLabel}</label>
              <div className="input-wrap">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="2.5" y="4" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m3.5 5.5 6.5 5 6.5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className="password-label-row">
                <label className="field-label" htmlFor="password">Mật khẩu</label>
              </div>
              <div className="input-wrap">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="3" y="8" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M6 8V5.5a4 4 0 0 1 8 0V8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                  <circle cx="10" cy="12.5" r="1" fill="currentColor" />
                </svg>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M3 3 17 17M8.6 8.7a2 2 0 0 0 2.7 2.7M6.2 6.3A9 9 0 0 1 10 5.5c4.5 0 7.5 4.5 7.5 4.5a13 13 0 0 1-2.3 2.8M4.5 7.7A13 13 0 0 0 2.5 10s3 4.5 7.5 4.5c.7 0 1.4-.1 2-.3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M2.5 10S5.5 5.5 10 5.5s7.5 4.5 7.5 4.5-3 4.5-7.5 4.5S2.5 10 2.5 10Z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="form-options">
                <label className="remember-option">
                  <input type="checkbox" name="remember" />
                  <span className="custom-checkbox" aria-hidden="true" />
                  Ghi nhớ đăng nhập
                </label>
              </div>

              <button className="submit-button" type="submit" disabled={busy}>
                {busy ? "Đang xác thực..." : "Đăng nhập"}
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                </svg>
              </button>
              <p className="form-message" role="status" aria-live="polite">{message}</p>
            </form>

            <p className="account-note">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 7.2v3.3M8 5.2v.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
              {copy.note}
            </p>
          </div>

          <footer className="form-footer">
            <span>© 2026 FoodFlow</span>
            <span>Hỗ trợ vận hành nhà hàng & nền tảng</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
