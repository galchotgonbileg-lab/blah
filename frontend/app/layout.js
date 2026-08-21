import './globals.css';

export const metadata = {
  title: 'Амттай - Хоол захиалга',
  description: 'Монгол хэлтэй хоол захиалга, ресторан үнэлгээний Next.js апп'
};

export default function RootLayout({ children }) {
  return (
    <html lang="mn" data-theme="dark" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.dataset.theme=localStorage.getItem('amtai-theme')||'dark';"
          }}
        />
        {children}
      </body>
    </html>
  );
}
