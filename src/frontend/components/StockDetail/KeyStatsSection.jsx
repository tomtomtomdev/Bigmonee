export default function KeyStatsSection({ keystats }) {
  if (!keystats || keystats.length === 0) {
    return <div className="p-4 text-gray-500 text-sm">No keystats available</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {keystats.map((cat) => (
        <div key={cat.category} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 border-b border-gray-800 pb-2">{cat.category}</h4>
          <div className="space-y-1.5">
            {cat.items.map((item) => (
              <div key={item.name} className="flex justify-between text-xs">
                <span className="text-gray-500 truncate mr-2">{item.name}</span>
                <span className="font-mono text-gray-300 whitespace-nowrap">{item.value || '-'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
