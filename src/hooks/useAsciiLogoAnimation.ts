import { useEffect, useState } from "react";

export function useAsciiLogoAnimation(asciiLogoLines: string[]): number {
  const [asciiLinesToShow, setAsciiLinesToShow] = useState(0);

  useEffect(() => {
    setAsciiLinesToShow(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setAsciiLinesToShow(i);
      if (i >= asciiLogoLines.length) clearInterval(interval);
    }, 120);
    return () => clearInterval(interval);
  }, [asciiLogoLines]);

  return asciiLinesToShow;
}
