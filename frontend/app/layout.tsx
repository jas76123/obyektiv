import type { Metadata } from 'next';
import { AppNav } from '@/components/AppNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Объектив',
  description: 'Контроль хода строительства по камерам: сверка наблюдения с графиком',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;700&family=JetBrains+Mono:wght@400;500&family=Literata:opsz,wght@7..72,400;7..72,500&display=swap"
        />
      </head>
      <body>
        <div className="app">
          <div className="appbar">
            <span className="logo">ОБЪ<em>Е</em>КТИВ</span>
            <AppNav />
          </div>
          <div className="screen">{children}</div>
        </div>
      </body>
    </html>
  );
}
