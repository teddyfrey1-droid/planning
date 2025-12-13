import '../app/globals.css';
import Link from 'next/link';
import { ReactNode } from 'react';

export const metadata = {
  title: 'RH Planner',
  description: 'Application RH et planification',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-primary text-white p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold">RH&nbsp;Planner</h1>
            <nav className="space-x-4 text-sm">
              <Link href="/">Accueil</Link>
              <Link href="/employees">Collaborateurs</Link>
              <Link href="/shifts">Planning</Link>
              <Link href="/absences">Absences</Link>
              <Link href="/dashboard">Tableau de bord</Link>
            </nav>
          </header>
          <main className="flex-1 p-6">{children}</main>
          <footer className="bg-secondary text-white p-4 text-center text-xs">
            © {new Date().getFullYear()} RH Planner. Tous droits réservés.
          </footer>
        </div>
      </body>
    </html>
  );
}