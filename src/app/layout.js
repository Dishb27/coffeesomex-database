import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";

export const metadata = {
  title: "CoffeeSomEx",
  description: "Coffea arabica genome database",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
