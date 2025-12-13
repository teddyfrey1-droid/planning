"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Leave {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
  comment?: string;
  employee: { id: number; firstName: string; lastName: string };
  type: { id: number; name: string; code: string };
}

export default function AbsencesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  useEffect(() => {
    async function fetchLeaves() {
      try {
        const res = await fetch(`${apiUrl}/leaves`);
        const data = await res.json();
        setLeaves(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaves();
  }, [apiUrl]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Absences</h2>
        <Link
          href="/absences/new"
          className="bg-accent text-white px-4 py-2 rounded hover:bg-red-500 text-sm"
        >
          Nouvelle demande
        </Link>
      </div>
      {loading ? (
        <p>Chargement…</p>
      ) : (
        <table className="min-w-full border rounded text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border-r">Collaborateur</th>
              <th className="px-4 py-2 border-r">Type</th>
              <th className="px-4 py-2 border-r">Période</th>
              <th className="px-4 py-2 border-r">Statut</th>
              <th className="px-4 py-2">Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((lv) => (
              <tr key={lv.id} className="border-t">
                <td className="px-4 py-2 border-r whitespace-nowrap">
                  {lv.employee.firstName} {lv.employee.lastName}
                </td>
                <td className="px-4 py-2 border-r">{lv.type.name}</td>
                <td className="px-4 py-2 border-r">
                  {lv.startDate} — {lv.endDate}
                </td>
                <td className="px-4 py-2 border-r capitalize">{lv.status}</td>
                <td className="px-4 py-2">{lv.comment || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}