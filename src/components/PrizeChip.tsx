interface PrizeChipProps {
  id: string;
  name: string;
  points: number;
  selected?: boolean;
  unaffordable?: boolean;
  index?: number;
  onClick: () => void;
}

function getTier(pts: number): number {
  if (pts < 100) return 0;
  if (pts < 300) return 1;
  if (pts < 700) return 2;
  return 3;
}

const tierStyles = [
  // 0-99: 青绿
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'text-emerald-500' },
  // 100-299: 蓝
  { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400', label: 'text-blue-500' },
  // 300-699: 橙
  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-400', label: 'text-orange-500' },
  // 700+: 紫
  { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-400', label: 'text-purple-500' },
];

export default function PrizeChip({ id, name, points, selected, unaffordable, index = 0, onClick }: PrizeChipProps) {
  const tier = tierStyles[getTier(points)];

  return (
    <button
      onClick={onClick}
      disabled={unaffordable}
      style={{ animation: `chipEnter 0.4s ease both ${index * 0.05}s` }}
      className={`relative p-3.5 rounded-2xl text-center transition-all duration-300 cursor-pointer
        ${unaffordable ? 'grayscale-[0.8] opacity-40 pointer-events-none bg-gray-100 border-gray-200' : ''}
        ${selected
          ? 'ring-2 ring-[#FF4081] ring-offset-2 shadow-[0_0_24px_rgba(255,64,129,0.35)] scale-[1.03]'
          : `${tier.bg} border-2 ${tier.border} hover:-translate-y-1 hover:shadow-lg`
        }`}
    >
      {selected && (
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#FF4081] text-white flex items-center justify-center text-xs font-extrabold shadow-md">✓</span>
      )}
      <div className="font-semibold text-sm leading-tight text-gray-800">{name}</div>
      <div className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-extrabold ${tier.bg} ${tier.label}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
        {points}分
      </div>
      {unaffordable && <div className="text-[0.65rem] text-[#EF4444] mt-1 font-semibold">积分不足</div>}
    </button>
  );
}
