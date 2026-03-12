import SnakeGame from '@/components/SnakeGame';

/**
 * Aditya Snake Game - Main Page
 * 
 * Design: Neon Cyberpunk Arena
 * - Deep navy/black background with neon cyan and magenta accents
 * - Glowing effects and smooth animations
 * - Monospace typography for futuristic feel
 * - Particle effects and grid-based visuals
 */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4">
      <SnakeGame />
    </div>
  );
}
