import { Link } from 'react-router-dom';
import {
  GraduationCap,
  FilePlus2,
  DoorOpen,
  Luggage,
  Stethoscope,
  UtensilsCrossed,
  FileSpreadsheet,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import Button from '../components/common/Button';
import { staggerStyle } from '../utils/stagger';

const FEATURES = [
  {
    icon: FilePlus2,
    title: 'Enregistrement des DUT1',
    description: "Saisie en deux phases, recherche par nom dans la liste des admis pour pré-remplir un dossier.",
  },
  {
    icon: DoorOpen,
    title: 'Attribution des chambres',
    description: "Assignation automatique par genre, comptage des matelas indépendant de la capacité déclarée.",
  },
  {
    icon: Luggage,
    title: 'Suivi des bagages',
    description: "Photo de chaque bagage, signalement des objets sensibles, historique par agent.",
  },
  {
    icon: Stethoscope,
    title: 'Suivi santé',
    description: "Allergies avec niveau de sévérité, restrictions d'aptitude liées aux activités du programme.",
  },
  {
    icon: UtensilsCrossed,
    title: 'Menu & allergènes',
    description: "Plats du jour croisés avec les allergies déclarées pour repérer les DUT1 à risque.",
  },
  {
    icon: FileSpreadsheet,
    title: 'Import Excel',
    description: "Listes d'admis et de chambres importées depuis un fichier, avec relecture avant confirmation.",
  },
];

const ROLES = [
  { icon: FilePlus2, label: 'Agent enregistreur', description: "Enregistre les DUT1 et complète leur dossier." },
  { icon: Luggage, label: 'Commission Orga', description: "Gère les chambres et les bagages." },
  { icon: Stethoscope, label: 'Commission Santé', description: "Suit les allergies et les restrictions d'aptitude." },
  { icon: UtensilsCrossed, label: 'Commission Cuisine', description: "Planifie les menus et leurs allergènes." },
  { icon: ShieldCheck, label: 'Administrateur', description: "Vue d'ensemble, comptes, imports et validations." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          Intégration DUT1
        </div>
        <Link to="/login">
          <Button variant="secondary">Se connecter</Button>
        </Link>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">
            La coordination de la semaine d'intégration, en un seul endroit.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-blue-100 sm:text-lg">
            Enregistrement des DUT1, logement, bagages, santé et cuisine — chaque commission a sa page,
            tout le monde travaille sur les mêmes données, en temps réel.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/login">
              <Button className="bg-white text-blue-900 hover:bg-blue-50">
                Se connecter <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-eyebrow mb-2 text-center text-role-accent">Fonctionnalités</p>
        <h2 className="text-h1 mb-10 text-center text-foreground">Une plateforme, cinq commissions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="animate-fade-in-up rounded-xl border border-border bg-card p-5 shadow-soft"
              style={staggerStyle(i)}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-role-accent-soft text-role-accent">
                <f.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-semibold text-foreground">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-eyebrow mb-2 text-center text-role-accent">Rôles</p>
          <h2 className="text-h1 mb-10 text-center text-foreground">Différents rôles, différentes fonctionnalités</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ROLES.map((r, i) => (
              <div
                key={r.label}
                className="animate-fade-in-up rounded-xl border border-border bg-card p-5 text-center shadow-soft"
                style={staggerStyle(i)}
              >
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-role-accent-soft text-role-accent">
                  <r.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-semibold text-foreground">{r.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-h1 text-foreground">Prêt à commencer ?</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Connecte-toi avec le compte de ta commission pour accéder à ton espace de travail.
        </p>
        <div className="mt-6 flex justify-center">
          <Link to="/login">
            <Button>
              Se connecter <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        ESP Dakar — Intégration DUT1
      </footer>
    </div>
  );
}
