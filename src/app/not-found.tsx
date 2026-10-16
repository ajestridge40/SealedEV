import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <Link href="/" className="mt-2 inline-block underline">
        Back to the Value Finder
      </Link>
    </div>
  );
}
