import ClientLayout from "../client-layout";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
} 