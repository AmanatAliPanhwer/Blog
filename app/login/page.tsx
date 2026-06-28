"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      username: (form.elements.namedItem("username") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      remember: (form.elements.namedItem("remember") as HTMLInputElement).checked,
    };

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      localStorage.setItem("isLoggedIn", "true");
      router.push("/");
      router.refresh();
    } else {
      const err = await res.json();
      setError(err.error || "Invalid credentials");
    }
  };

  return (
    <div className="login-container" style={{
      backgroundColor: "#333", padding: 20, borderRadius: 10,
      boxShadow: "0px 0px 10px rgba(255, 255, 255, 0.2)", width: 300,
      textAlign: "center", position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)"
    }}>
      <h2 style={{ marginBottom: 20 }}>Admin Login</h2>
      {error && <p style={{ color: "red", marginBottom: 10 }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: "block", textAlign: "left", fontSize: 14 }}>Username:</label>
          <input type="text" name="username" required style={{ width: "100%", padding: 8, borderRadius: 5, fontSize: 16 }} />
        </div>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: "block", textAlign: "left", fontSize: 14 }}>Password:</label>
          <input type="password" name="password" required style={{ width: "100%", padding: 8, borderRadius: 5, fontSize: 16 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 15 }}>
          <input type="checkbox" name="remember" id="remember" style={{ width: "auto", marginRight: 10 }} />
          <label htmlFor="remember" style={{ margin: 0 }}>Remember Me</label>
        </div>
        <button type="submit" className="login-btn" style={{
          backgroundColor: "#007bff", color: "white", border: "none",
          padding: 10, width: "100%", borderRadius: 5, cursor: "pointer", fontSize: 16
        }}>Login</button>
      </form>
    </div>
  );
}
