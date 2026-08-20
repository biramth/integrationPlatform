import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import Input from '../common/Input';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { searchAdmittedStudents } from '../../api/admittedStudentsApi';
import { DEPARTMENT_LABELS } from '../../utils/departments';

function formatBirthDate(birthDate) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return birthDate;
  return d.toLocaleDateString('fr-FR');
}

export default function AdmittedStudentLookup({ department, onSelect }) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(() => {
    if (!debounced.trim()) return;
    setLoading(true);
    searchAdmittedStudents({ search: debounced, department: department || undefined })
      .then((data) => setResults(data.students))
      .finally(() => setLoading(false));
  }, [debounced, department]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- requête réseau déclenchée par le debounce, cf. useFetch.js
    runSearch();
  }, [runSearch]);

  function handleSelect(student) {
    onSelect(student);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        icon={Search}
        placeholder="Chercher dans la liste des admis pour pré-remplir…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && query.trim() && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lifted">
          {loading && <p className="p-3 text-sm text-muted-foreground">Recherche…</p>}
          {!loading && results.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Aucun admis trouvé (ou déjà enregistré).</p>
          )}
          {!loading && results.length > 1 && (
            <p className="border-b border-border px-3 py-1.5 text-xs text-warning-soft-foreground">
              Plusieurs résultats — vérifie la date/lieu de naissance avant de choisir.
            </p>
          )}
          {!loading &&
            results.map((s) => {
              const birthDate = formatBirthDate(s.birth_date);
              return (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(s)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium text-foreground">
                    {s.first_name} {s.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {DEPARTMENT_LABELS[s.department] || s.department} ·{' '}
                    {s.list_type === 'principale' ? 'Liste principale' : "Liste d'attente"}
                  </span>
                  {(birthDate || s.birth_place) && (
                    <span className="text-xs text-muted-foreground">
                      {birthDate && <>Né(e) le {birthDate}</>}
                      {birthDate && s.birth_place && ' à '}
                      {s.birth_place}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
