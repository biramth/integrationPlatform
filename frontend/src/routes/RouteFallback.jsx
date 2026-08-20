// Affiché pendant le téléchargement du chunk d'une page chargée à la demande.
export default function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Chargement…
    </div>
  );
}
