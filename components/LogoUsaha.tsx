export default function LogoUsaha({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/api/logo"
      alt="Logo usaha"
      width={size}
      height={size}
      className={`rounded-lg object-contain ${className}`}
    />
  );
}
