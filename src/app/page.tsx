import React from "react";
import ClientProvider from "@/components/ClientProvider";
import { HomePage } from "@/components/HomePage";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <ClientProvider>
      <HomePage />
    </ClientProvider>
  );
}
