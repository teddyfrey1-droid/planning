"use client";
import { useEffect, useState } from 'react';

interface Employee { id: number; }
interface Shift { id: number; }
interface Leave { id: number; status: string; }

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ employees: 0, shifts: 0, absences: 0 });
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

  useEffect(() => {
    async function fetchData() {
      try {
        const [empRes, shiftRes, leaveRes] = await Promise.all([
          fetch(`${apiUrl}/employees`),
          fetch(`${apiUrl}/shifts`),
          fetch(`${apiUrl}/leaves`),
        ]);
        const employees: Employee[] = await empRes.json();
        const shifts: Shift[] = await shiftRes.json();
        const leaves: Leave[] = await leaveRes.json();
        setCounts({ employees: employees.length, shifts: shifts.length, absences: leaves.length });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary">Tableau de bord</h2>
      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-secondary text-white rounded shadow">
            <h3 className="text-xl font-semibold">Collaborateurs</h3>
            <p className="text-3xl mt-2">{counts.employees}</p>
          </div>
          <div className="p-4 bg-secondary text-white rounded shadow">
            <h3 className="text-xl font-semibold">Shifts (total)</h3>
            <p className="text-3xl mt-2">{counts.shifts}</p>
          </div>
          <div className="p-4 bg-secondary text-white rounded shadow">
            <h3 className="text-xl font-semibold">Absences</h3>
            <p className="text-3xl mt-2">{counts.absences}</p>
          </div>
        </div>
      )}
    </div>
  );
}