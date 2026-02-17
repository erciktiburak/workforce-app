export default function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 transition-colors">
      <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
      <div className="text-2xl font-semibold mt-2 text-gray-800 dark:text-white">{value}</div>
    </div>
  );
}
