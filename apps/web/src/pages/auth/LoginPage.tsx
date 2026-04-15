// apps/web/src/pages/auth/LoginPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, type LoginInput } from "@aidflow/shared";
import { useAuthStore } from "@stores/auth.store";
import { apiClient } from "@lib/api-client";

interface Props {
  mode?: "login" | "register";
}

export default function LoginPage({ mode = "login" }: Props) {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    try {
      const res = await apiClient.post("/auth/login", data);
      const { accessToken, user } = res.data.data;
      setSession(user, accessToken);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(
        msg === "Account awaiting activation"
          ? "Your account is pending admin activation. Please contact your administrator."
          : (msg ?? "Login failed. Please try again."),
      );
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-background-tertiary)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "2rem",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              margin: "0 0 4px",
            }}
          >
            AidFlow
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            {mode === "login" ? "Sign in to your account" : "Create an account"}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "var(--color-background-danger)",
              border: "0.5px solid var(--color-border-danger)",
              borderRadius: "var(--border-radius-md)",
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "var(--color-text-danger)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="you@organisation.org"
              style={{ width: "100%" }}
            />
            {errors.email && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--color-text-danger)",
                  marginTop: 4,
                }}
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              autoComplete="current-password"
            />
            {errors.password && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--color-text-danger)",
                  marginTop: 4,
                }}
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              background: "var(--color-text-primary)",
              color: "var(--color-background-primary)",
              border: "none",
              borderRadius: "var(--border-radius-md)",
              padding: "10px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
