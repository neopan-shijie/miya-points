interface PlayerChipProps {
  id: string;
  name: string;
  points: number;
  selected?: boolean;
  index?: number;
  onClick: () => void;
}

export default function PlayerChip({ name, points, selected, index = 0, onClick }: PlayerChipProps) {
  return (
    <button
      onClick={onClick}
      className={`relative p-3.5 rounded-2xl text-center transition-all duration-300 cursor-pointer
        ${selected
          ? 'ring-2 ring-[#FF4081] ring-offset-2 shadow-[0_0_24px_rgba(255,64,129,0.35)] scale-[1.03]'
          : 'border-2 border-gray-200 bg-white hover:-translate-y-1 hover:shadow-lg'
        }`}
      style={{ animation: `chipEnter 0.4s ease both ${index * 0.05}s` }}
    >
      {selected && (
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#FF4081] text-white flex items-center justify-center text-xs font-extrabold shadow-md">✓</span>
      )}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF4081] text-white flex items-center justify-center font-extrabold text-base mx-auto mb-2 shadow-[0_2px_8px_rgba(255,107,53,0.3)]">
        {name[0]}
      </div>
      <div className="font-semibold text-sm text-gray-800">{name}</div>
      <div className={`text-xs font-bold mt-1 ${points > 0 ? 'text-[#FF6B35]' : 'text-gray-400'}`}>{points.toFixed(0)}分</div>
    </button>
  );
}
