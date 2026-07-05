"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuth({ requireAdmin = false } = {}) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        if (!data.user) {
          router.push("/login");
        } else if (requireAdmin && data.user.role !== "admin") {
          router.push("/dashboard");
        } else {
          setUser(data.user);
        }
      })
      .catch(() => {
        if (!cancelled) router.push("/login");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return user;
}
