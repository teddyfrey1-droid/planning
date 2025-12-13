"use client";
import { useEffect, useState } from 'react';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
}

interface Shift {
  id: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  tag: string;
  employee?: Employee;
}

const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function getWeekDates(date = new Date()) {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  monday.setDate(monday.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function ShiftsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  const weekDates = getWeekDates();

  useEffect(() => {
    async function fetchData() {
      try {
        const [empRes, shiftRes] = await Promise.all([
          fetch(`${apiUrl}/employees`),
          fetch(`${apiUrl}/shifts`),
        ]);
        const employeesData = await empRes.json();
        const shiftsData = await shiftRes.json();
        setEmployees(employeesData);
        setShifts(shiftsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [apiUrl]);

  function formatTime(str: string) {
    const date = new Date(str);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  // Regrouper les shifts par employé et par jour
  const shiftsByEmployee: Record<number, Record<string, Shift[]>> = {};
  employees.forEach((emp) => {
    shiftsByEmployee[emp.id] = {};
    weekDates.forEach((date) => {
      const key = date.toDateString();
      shiftsByEmployee[emp.id][key] = [];
    });
  });
  shifts.forEach((shift) => {
    if (!shift.employee) return;
    const empId = shift.employee.id;
    const dateKey = new Date(shift.startTime).toDateString();
    if (!shiftsByEmployee[empId]) return;
    if (!shiftsByEmployee[empId][dateKey]) shiftsByEmployee[empId][dateKey] = [];
    shiftsByEmployee[empId][dateKey].push(shift);
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary">Planning hebdomadaire</h2>
      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full border rounded text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border-r">Collaborateur</th>
                {weekDates.map((date, idx) => (
                  <th key={idx} className="px-4 py-2 border-r whitespace-nowrap">
                    {weekdays[idx]}<br />
                    {date.toLocaleDateString('fr-FR')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-t">
                  <td className="px-4 py-2 font-semibold border-r whitespace-nowrap">
                    {emp.firstName} {emp.lastName}
                  </td>
                  {weekDates.map((date) => {
                    const key = date.toDateString();
                    const shiftsDay = shiftsByEmployee[emp.id][key] || [];
                    return (
                      <td key={key} className="px-2 py-2 border-r align-top min-w-[120px]">
                        {shiftsDay.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="space-y-1">
                            {shiftsDay.map((shift) => (
                              <div
                                key={shift.id}
                                className="p-1 rounded bg-secondary text-white text-xs"
                              >
                                {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                                {shift.tag ? ` (${shift.tag})` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}