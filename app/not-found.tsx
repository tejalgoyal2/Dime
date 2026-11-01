import Link from "next/link";

// A wrong address: a way back instead of Next's default page.
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-oat px-6 text-center">
      <p className="text-[13px] font-semibold text-ink-2">Tom the lizard</p>
      <h1 className="max-w-[420px] text-[24px] font-semibold tracking-[-0.02em] text-ink">Nothing here. Not even a receipt.</h1>
      <Link href="/" className="flex h-10 items-center rounded-[10px] bg-ink px-5 text-[14px] font-semibold text-paper">
        Back to Dime
      </Link>
    </main>
  );
}
