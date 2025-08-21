interface BalanceCardProps {
  isConnected: boolean;
  balance: string | null;
}

export default function BalanceCard({
  isConnected,
  balance,
}: BalanceCardProps) {
  if (!isConnected || balance === null) return null;
  return (
    <div className="w-full flex flex-col items-center my-3">
      <span className="text-blue-100 text-xs tracking-widest mb-1">
        Your $A0X Balance
      </span>
      <span className="text-white font-extrabold text-2xl sm:text-3xl bg-gradient-to-r from-blue-200 via-white to-blue-100 bg-clip-text text-transparent">
        {Number(balance).toLocaleString()}{" "}
        <span className="text-blue-200 text-lg">A0X</span>
      </span>
      <div className="w-1/2 h-px bg-blue-100/30 mt-2" />
    </div>
  );
}
