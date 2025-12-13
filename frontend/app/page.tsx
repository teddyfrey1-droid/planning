export default function Home() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary">Bienvenue sur RH&nbsp;Planner</h2>
      <p>
        Cette application vous permet de gérer vos collaborateurs, planifier les shifts, suivre les heures,
        gérer les absences et consulter des rapports RH.
      </p>
      <p>
        Utilisez le menu de navigation pour accéder aux différentes fonctionnalités. Les données sont
        stockées dans une base PostgreSQL via une API NestJS et cette interface est développée avec
        Next.js et Tailwind CSS.
      </p>
    </div>
  );
}