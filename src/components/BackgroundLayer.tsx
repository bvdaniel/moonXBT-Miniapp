export default function BackgroundLayer() {
  return (
    <>
      <div className="absolute inset-0 z-0 w-full h-full overflow-hidden pointer-events-none">
        <video
          src="/bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-20"
        />
      </div>
      <div className="scanline pointer-events-none absolute inset-0 z-10" />
    </>
  );
}
