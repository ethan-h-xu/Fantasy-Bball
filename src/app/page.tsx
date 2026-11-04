import { SignInForm } from "@/components/SignInForm";

// Signed-in users never reach this page: src/proxy.ts sends them to /leagues.
export default function Home() {
  return <SignInForm />;
}
