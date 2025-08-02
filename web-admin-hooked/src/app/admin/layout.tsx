export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 dark:from-gray-900 dark:to-gray-800">
      {children}
    </div>
  );
} 