"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
}
interface LeaveType {
  id: number;
  code: string;
  name: string;
}

export default function NewAbsencePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [form, setForm] = useState({
    employeeId: '',
    typeId: '',
    startDate: '',
    endDate: '',
    comment: '',
  });
  const [loading, setLoading] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

  useEffect(() => {
    async function fetchData() {
      const [empRes, typeRes] = await Promise.all([
        fetch(`${apiUrl}/employees`),
        fetch(`${apiUrl}/leaves/types/list`),
      ]);
      setEmployees(await empRes.json());
      setTypes(await typeRes.json());
    }
    fetchData();
  }, [apiUrl]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: Number(form.employeeId),
          typeId: Number(form.typeId),
          startDate: form.startDate,
          endDate: form.endDate,
          comment: form.comment,
        }),
      });
      if (!res.ok) throw new Error('Échec de la création');
      router.push('/absences');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold text-primary mb-4">Nouvelle demande d'absence</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm">Collaborateur</label>
          <select
            name="employeeId"
            required
            value={form.employeeId}
            onChange={handleChange}
            className="border px-3 py-2 w-full rounded"
          >
            <option value="">Sélectionner…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Type d'absence</label>
          <select
            name="typeId"
            required
            value={form.typeId}
            onChange={handleChange}
            className="border px-3 py-2 w-full rounded"
          >
            <option value="">Sélectionner…</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Date de début</label>
          <input
            type="date"
            name="startDate"
            required
            value={form.startDate}
            onChange={handleChange}
            className="border px-3 py-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block text-sm">Date de fin</label>
          <input
            type="date"
            name="endDate"
            required
            value={form.endDate}
            onChange={handleChange}
            className="border px-3 py-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block text-sm">Commentaire (facultatif)</label>
          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            className="border px-3 py-2 w-full rounded"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-white px-4 py-2 rounded hover:bg-red-500"
        >
          {loading ? 'Enregistrement…' : 'Créer'}
        </button>
      </form>
    </div>
  );
}