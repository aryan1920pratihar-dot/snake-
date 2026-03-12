import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface GameState {
  snake: Position[];
  food: Position;
  direction: Position;
  nextDirection: Position;
  score: number;
  gameOver: boolean;
  isPaused: boolean;
  difficulty: number;
}

const GRID_SIZE = 20;
const CELL_SIZE = 25;
const INITIAL_SPEED = 150;

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    snake: [{ x: 10, y: 10 }],
    food: { x: 15, y: 15 },
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    score: 0,
    gameOver: false,
    isPaused: false,
    difficulty: 1,
  });
  const [gameState, setGameState] = useState(gameStateRef.current);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  // Generate random food position
  const generateFood = useCallback((snake: Position[]): Position => {
    let newFood: Position = { x: 0, y: 0 };
    let isValid = false;
    while (!isValid) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      isValid = !snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    return newFood;
  }, []);

  // Play sound effect
  const playSound = useCallback((type: 'eat' | 'collision') => {
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'eat') {
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } else {
      oscillator.frequency.value = 200;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  }, [soundEnabled]);

  // Game loop
  const updateGame = useCallback(() => {
    const state = gameStateRef.current;
    if (state.gameOver || state.isPaused) return;

    // Update direction
    state.direction = state.nextDirection;

    // Calculate new head position
    const head = state.snake[0];
    const newHead: Position = {
      x: (head.x + state.direction.x + GRID_SIZE) % GRID_SIZE,
      y: (head.y + state.direction.y + GRID_SIZE) % GRID_SIZE,
    };

    // Check collision with self
    if (state.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      state.gameOver = true;
      playSound('collision');
      setGameState({ ...state });
      return;
    }

    // Add new head
    state.snake.unshift(newHead);

    // Check if food eaten
    if (newHead.x === state.food.x && newHead.y === state.food.y) {
      state.score += 10 * state.difficulty;
      playSound('eat');
      state.food = generateFood(state.snake);
      
      // Increase difficulty every 5 foods
      if (Math.floor(state.score / (50 * state.difficulty)) > state.difficulty - 1) {
        state.difficulty = Math.min(state.difficulty + 1, 5);
      }
    } else {
      // Remove tail if no food eaten
      state.snake.pop();
    }

    setGameState({ ...state });
  }, [generateFood, playSound]);

  // Setup game loop
  useEffect(() => {
    const speed = Math.max(50, INITIAL_SPEED - (gameState.difficulty - 1) * 20);
    gameLoopRef.current = setInterval(updateGame, speed);
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState.difficulty, updateGame]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      
      switch (e.key) {
        case 'ArrowUp':
          if (state.direction.y === 0) state.nextDirection = { x: 0, y: -1 };
          e.preventDefault();
          break;
        case 'ArrowDown':
          if (state.direction.y === 0) state.nextDirection = { x: 0, y: 1 };
          e.preventDefault();
          break;
        case 'ArrowLeft':
          if (state.direction.x === 0) state.nextDirection = { x: -1, y: 0 };
          e.preventDefault();
          break;
        case 'ArrowRight':
          if (state.direction.x === 0) state.nextDirection = { x: 1, y: 0 };
          e.preventDefault();
          break;
        case ' ':
          state.isPaused = !state.isPaused;
          setGameState({ ...state });
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0A0E27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(canvas.width, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw snake
    gameState.snake.forEach((segment, index) => {
      const x = segment.x * CELL_SIZE;
      const y = segment.y * CELL_SIZE;

      if (index === 0) {
        // Head - bright cyan with glow
        ctx.fillStyle = '#00D9FF';
        ctx.shadowColor = '#00D9FF';
        ctx.shadowBlur = 20;
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        
        // Eyes
        ctx.fillStyle = '#0A0E27';
        const eyeSize = 3;
        if (gameState.direction.x === 1) {
          ctx.fillRect(x + 12, y + 6, eyeSize, eyeSize);
          ctx.fillRect(x + 12, y + 14, eyeSize, eyeSize);
        } else if (gameState.direction.x === -1) {
          ctx.fillRect(x + 10, y + 6, eyeSize, eyeSize);
          ctx.fillRect(x + 10, y + 14, eyeSize, eyeSize);
        } else if (gameState.direction.y === -1) {
          ctx.fillRect(x + 6, y + 10, eyeSize, eyeSize);
          ctx.fillRect(x + 14, y + 10, eyeSize, eyeSize);
        } else {
          ctx.fillRect(x + 6, y + 12, eyeSize, eyeSize);
          ctx.fillRect(x + 14, y + 12, eyeSize, eyeSize);
        }
      } else {
        // Body - gradient from cyan to magenta
        const gradient = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
        gradient.addColorStop(0, '#00D9FF');
        gradient.addColorStop(1, '#FF006E');
        
        ctx.fillStyle = gradient;
        ctx.shadowColor = '#FF006E';
        ctx.shadowBlur = 10;
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    });

    ctx.shadowColor = 'transparent';

    // Draw food - pulsing effect
    const foodX = gameState.food.x * CELL_SIZE;
    const foodY = gameState.food.y * CELL_SIZE;
    const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
    const foodSize = (CELL_SIZE - 4) * pulse;
    const offset = (CELL_SIZE - foodSize) / 2;

    ctx.fillStyle = '#39FF14';
    ctx.shadowColor = '#39FF14';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(foodX + CELL_SIZE / 2, foodY + CELL_SIZE / 2, foodSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw outer ring
    ctx.strokeStyle = '#FF006E';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#FF006E';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(foodX + CELL_SIZE / 2, foodY + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = 'transparent';
  }, [gameState]);

  const resetGame = () => {
    gameStateRef.current = {
      snake: [{ x: 10, y: 10 }],
      food: { x: 15, y: 15 },
      direction: { x: 1, y: 0 },
      nextDirection: { x: 1, y: 0 },
      score: 0,
      gameOver: false,
      isPaused: false,
      difficulty: 1,
    };
    setGameState({ ...gameStateRef.current });
  };

  const togglePause = () => {
    gameStateRef.current.isPaused = !gameStateRef.current.isPaused;
    setGameState({ ...gameStateRef.current });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2 glow-cyan" style={{ fontFamily: 'var(--font-display)' }}>
          ADITYA SNAKE GAME
        </h1>
        <p className="text-sm glow-lime" style={{ fontFamily: 'var(--font-mono)' }}>
          CYBERPUNK ARENA // LEVEL {gameState.difficulty}
        </p>
      </div>

      {/* Game Container */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
        {/* Canvas */}
        <div className="relative">
          <div className="border-2 border-cyan-400 rounded-lg overflow-hidden shadow-lg" style={{ boxShadow: '0 0 20px rgba(0, 217, 255, 0.5)' }}>
            <canvas
              ref={canvasRef}
              width={GRID_SIZE * CELL_SIZE}
              height={GRID_SIZE * CELL_SIZE}
              className="bg-slate-950 block"
            />
          </div>

          {/* Game Over Overlay */}
          {gameState.gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm">
              <div className="text-center">
                <p className="text-2xl font-bold glow-magenta mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                  GAME OVER
                </p>
                <p className="text-lg glow-cyan mb-6" style={{ fontFamily: 'var(--font-mono)' }}>
                  FINAL SCORE: {gameState.score}
                </p>
                <Button
                  onClick={resetGame}
                  className="bg-cyan-400 text-black hover:bg-cyan-300 font-bold"
                >
                  RESTART
                </Button>
              </div>
            </div>
          )}

          {/* Pause Overlay */}
          {gameState.isPaused && !gameState.gameOver && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg backdrop-blur-sm">
              <p className="text-2xl font-bold glow-cyan" style={{ fontFamily: 'var(--font-display)' }}>
                PAUSED
              </p>
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="w-full lg:w-64 space-y-4">
          {/* Score Display */}
          <div className="border-2 border-cyan-400 rounded-lg p-4 bg-slate-900/50" style={{ boxShadow: '0 0 15px rgba(0, 217, 255, 0.3)' }}>
            <p className="text-xs text-cyan-400 mb-2 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
              SCORE
            </p>
            <p className="text-4xl font-bold glow-cyan" style={{ fontFamily: 'var(--font-display)' }}>
              {gameState.score.toString().padStart(5, '0')}
            </p>
          </div>

          {/* Difficulty Display */}
          <div className="border-2 border-magenta-500 rounded-lg p-4 bg-slate-900/50" style={{ boxShadow: '0 0 15px rgba(255, 0, 110, 0.3)' }}>
            <p className="text-xs text-magenta-400 mb-2 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
              DIFFICULTY
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all ${
                    level <= gameState.difficulty
                      ? 'bg-lime-400 text-black glow-lime'
                      : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  {level}
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-2">
            <Button
              onClick={togglePause}
              disabled={gameState.gameOver}
              className="w-full bg-cyan-400 text-black hover:bg-cyan-300 font-bold"
            >
              {gameState.isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" /> RESUME
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" /> PAUSE
                </>
              )}
            </Button>

            <Button
              onClick={resetGame}
              className="w-full bg-magenta-500 text-white hover:bg-magenta-600 font-bold"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> NEW GAME
            </Button>

            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="outline"
              className="w-full border-lime-400 text-lime-400 hover:bg-lime-400/10"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 mr-2" /> SOUND ON
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 mr-2" /> SOUND OFF
                </>
              )}
            </Button>
          </div>

          {/* Instructions */}
          <div className="border-2 border-lime-400 rounded-lg p-4 bg-slate-900/50 text-xs" style={{ boxShadow: '0 0 15px rgba(57, 255, 20, 0.2)' }}>
            <p className="text-lime-400 font-bold mb-2 uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
              CONTROLS
            </p>
            <ul className="space-y-1 text-cyan-300" style={{ fontFamily: 'var(--font-mono)' }}>
              <li>↑ ↓ ← → Move</li>
              <li>SPACE Pause/Resume</li>
              <li>Eat food to grow</li>
              <li>Avoid self collision</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
