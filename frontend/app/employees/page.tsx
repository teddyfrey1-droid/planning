"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await fetch(`${apiUrl}/employees`);
        const data = await res.json();
        setEmployees(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployees();
  }, [apiUrl]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Collaborateurs</h2>
        <Link
          href="/employees/new"
          className="bg-accent text-white px-4 py-2 rounded hover:bg-red-500 text-sm"
        >
          Nouveau collaborateur
        </Link>
      </div>
      {loading ? (
        <p>Chargement…</p>
      ) : (
        <table className="min-w-full border rounded">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Nom</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Téléphone</th>
              <th className="px-4 py-2 text-left">Rôle</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-t">
                <td className="px-4 py-2">
                  {emp.firstName} {emp.lastName}
                </td>
                <td className="px-4 py-2">{emp.email}</td>
                <td className="px-4 py-2">{emp.phoneNumber || '-'}</td>
                <td className="px-4 py-2 capitalize">{emp.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}