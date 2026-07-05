import "./globals.css";

export const metadata = {
  title: "PhishGuard — AI Phishing Detection Platform",
  description: "Scan URLs and emails for phishing risk in real time.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0a0e14] text-[#dbe4ee] antialiased">
        {children}
      </body>
    </html>
  );
}
