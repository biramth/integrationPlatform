import { Link } from 'react-router-dom';
import {
  GraduationCap,
  FilePlus2,
  DoorOpen,
  Luggage,
  Stethoscope,
  UtensilsCrossed,
  FileSpreadsheet,
  ShieldAlert,
  Contact,
  Palette,
  CalendarDays,
  ArrowRight,
  Lock,
  Users2,
  Repeat,
} from 'lucide-react';
import Button from '../components/common/Button';
import { staggerStyle } from '../utils/stagger';

const FEATURES = [
  {
    icon: FilePlus2,
    title: 'Enregistrement en deux phases',
    description:
      "Infos de base à l'accueil, complément détaillé ensuite — verrouillé et non modifiable une fois enregistré, pour éviter toute correction accidentelle après coup.",
  },
  {
    icon: DoorOpen,
    title: 'Chambres sans doublon',
    description:
      "Attribution automatique par genre, verrouillée contre les attributions simultanées quand plusieurs agents enregistrent en même temps — aucune chambre ne dépasse sa capacité.",
  },
  {
    icon: Luggage,
    title: 'Bagages tracés',
    description: "Photo de chaque bagage, signalement des objets sensibles, historique complet par agent.",
  },
  {
    icon: Stethoscope,
    title: 'Santé & allergies',
    description:
      "Allergies avec niveau de sévérité, restrictions d'aptitude liées aux activités, traitements médicaux en cours — visibles uniquement par qui en a besoin.",
  },
  {
    icon: FileSpreadsheet,
    title: 'Import Excel',
    description: "Listes d'admis et de chambres importées en masse, avec relecture ligne par ligne avant confirmation.",
  },
  {
    icon: Repeat,
    title: 'Transmission entre générations',
    description:
      "En fin d'édition, la commission IT peut réinitialiser la plateforme pour la génération suivante — double confirmation, action irréversible et tracée.",
  },
];

const COMMISSIONS = [
  {
    role: 'orga',
    icon: DoorOpen,
    label: 'Commission Orga',
    description: "Enregistrement, chambres et bagages — le cœur opérationnel de l'accueil des DUT1.",
  },
  {
    role: 'sante',
    icon: Stethoscope,
    label: 'Commission Santé',
    description: "Allergies, restrictions d'aptitude et suivi médical.",
  },
  {
    role: 'cuisine',
    icon: UtensilsCrossed,
    label: 'Commission Cuisine',
    description: 'Menus du jour croisés automatiquement avec les allergies déclarées.',
  },
  {
    role: 'communication',
    icon: Contact,
    label: 'Commission Communication',
    description: 'Annuaire non-médical et planning, pour informer sans jamais voir les données de santé.',
  },
  {
    role: 'culturelle',
    icon: Palette,
    label: 'Commission Culturelle',
    description: "Vue sur le planning de la semaine d'intégration.",
  },
  {
    role: 'presidentielle',
    icon: CalendarDays,
    label: 'Commission Présidentielle',
    description: "Fixe et gère le programme complet des activités.",
  },
  {
    role: 'it',
    icon: ShieldAlert,
    label: 'Commission IT',
    description: "Administration de la plateforme : comptes, statistiques, transmission entre générations.",
  },
];

const PRINCIPLES = [
  {
    icon: Users2,
    title: 'Une commission, ses accès',
    description: "Chaque commission ne voit et ne modifie que ce qui la concerne — un chef peut gérer les comptes de son équipe sans toucher au reste.",
  },
  {
    icon: Lock,
    title: 'Le médical reste médical',
    description: "Allergies, traitements et restrictions ne sont jamais exposés en dehors de la commission Santé et de l'agent qui enregistre.",
  },
  {
    icon: Repeat,
    title: 'Pensé pour durer',
    description: "La plateforme se transmet d'une génération à l'autre sans repartir de zéro : les comptes restent, seules les données de l'édition se réinitialisent.",
  },
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
            Sept commissions, une seule plateforme.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-blue-100 sm:text-lg">
            Enregistrement des DUT1, logement, bagages, santé, cuisine, communication et planning — chaque
            commission a son espace, tout le monde travaille sur les mêmes données, en temps réel.
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
        <h2 className="text-h1 mb-10 text-center text-foreground">Conçue pour le rythme d'une intégration</h2>
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
          <p className="text-eyebrow mb-2 text-center text-role-accent">Commissions</p>
          <h2 className="text-h1 mb-10 text-center text-foreground">Chaque commission, son espace</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COMMISSIONS.map((c, i) => (
              <div key={c.label} data-role={c.role} className="animate-fade-in-up" style={staggerStyle(i)}>
                <div className="h-full rounded-xl border border-border bg-card p-5 text-center shadow-soft">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-role-accent-soft text-role-accent">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 font-semibold text-foreground">{c.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-eyebrow mb-2 text-center text-role-accent">Principes</p>
        <h2 className="text-h1 mb-10 text-center text-foreground">Le bon accès, à la bonne personne</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <div key={p.title} className="animate-fade-in-up text-center" style={staggerStyle(i, 100)}>
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <p.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-semibold text-foreground">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-h1 text-foreground">Prêt à commencer ?</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Le compte de chaque commission donne accès à son espace de travail.
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
