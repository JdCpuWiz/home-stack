export default function KioskLayout({ children }: { children: React.ReactNode }) {
  // No Shell, Header, or SideNav — full-screen kiosk surface
  return <>{children}</>;
}
