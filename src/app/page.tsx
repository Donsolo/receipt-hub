import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    const user = await verifyToken(token);
    if (user) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-4">
        Receipt Hub
      </h1>
      <p className="text-xl sm:text-2xl text-gray-600 max-w-2xl mb-10">
        Generate professional receipts or securely upload receipt images.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link
          href="/login"
          className="px-8 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors w-full sm:w-48"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-8 py-3 rounded-md bg-[#1F2937] border border-[#2D3748] text-gray-100 font-medium hover:bg-[#243043] transition-colors w-full sm:w-48"
        >
          Register
        </Link>
      </div>

      <div className="mt-16 text-gray-400 text-sm">
        <p>Simple. Fast. Secure.</p>
      </div>
    </div>
  );
}
