interface HeaderSectionProps {
  title?: string;
  subtitle?: string;
  isInMiniApp: boolean | null;
  asciiLogoLines: string[];
  asciiLinesToShow: number;
}

export default function HeaderSection({
  title = "AIRDROP",
  subtitle = "Complete tasks to earn your airdrop!",
  isInMiniApp,
  asciiLogoLines,
  asciiLinesToShow,
}: HeaderSectionProps) {
  return (
    <>
      <div className="relative w-full flex justify-center items-center">
        <pre className="text-white text-[5px] md:text-[7px] leading-none mb-1 select-none text-center drop-shadow-[0_0_2px_white] font-mono tracking-widest overflow-x-auto whitespace-pre max-w-full">
          {asciiLogoLines.slice(0, asciiLinesToShow).join("\n")}
        </pre>
      </div>
      <div className="text-center mb-2">
        <h1 className="text-base sm:text-lg font-bold mb-1 tracking-widest text-white drop-shadow-[0_0_2px_white]">
          {title}
        </h1>
        <p className="text-blue-100 text-[11px] sm:text-xs tracking-wide">
          {subtitle}
        </p>
        {isInMiniApp !== null && (
          <p className="text-blue-200 text-[10px] mt-1">
            {isInMiniApp ? "Running in Mini App" : "Running in Web Browser"}
          </p>
        )}
      </div>
    </>
  );
}
