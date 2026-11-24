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
      className={`logo-hidup rounded-lg object-contain ${className}`}
    />
  );
}
