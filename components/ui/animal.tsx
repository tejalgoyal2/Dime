// Everyone gets a little animal. It's picked from your name so it's the same
// on every device, and you can swap it in the menu. Faces are Microsoft's
// Fluent Emoji (MIT), served as static files, so they cost nothing to render.

export const ANIMALS = ["fox", "cat", "panda", "frog", "koala", "tiger", "rabbit", "bear", "hamster", "dog", "lion", "monkey", "pig", "penguin", "owl", "mouse"] as const;
export type Animal = (typeof ANIMALS)[number];

export function animalFor(name: string, chosen?: string | null): Animal {
  if (chosen && (ANIMALS as readonly string[]).includes(chosen)) return chosen as Animal;
  let h = 0;
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ANIMALS[h % ANIMALS.length];
}

export function AnimalAvatar({ animal, size = 32, className = "" }: { animal: Animal; size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-oat ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs, no optimisation needed */}
      <img src={`/animals/${animal}.svg`} alt="" width={size * 0.72} height={size * 0.72} draggable={false} decoding="async" />
    </span>
  );
}
