import { useState, useEffect } from 'react';
import { ArrowDown, Sparkles, Compass } from 'lucide-react';

interface HeroSectionProps {
  onExploreClick: () => void;
  onBrandClick: () => void;
}

export function HeroSection({ onExploreClick, onBrandClick }: HeroSectionProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Array<{ id: number; left: number; top: number; size: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    // Generate subtle gold ambient particles
    const generated = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 4,
    }));
    setParticles(generated);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    const x = ((clientX - left) / width - 0.5) * 20; // max 20px tilt
    const y = ((clientY - top) / height - 0.5) * 20;
    setMousePos({ x, y });
  };

  return (
    <section 
      onMouseMove={handleMouseMove}
      className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden bg-[#080808] px-4 sm:px-6 lg:px-8 py-12 lg:py-0 select-none"
    >
      {/* Background Cinematic Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Deep ambient radial gradient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[550px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D4AF37]/12 via-[#161616]/30 to-transparent blur-3xl opacity-80" />
        
        {/* Subtle grid texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px] opacity-15" />

        {/* Floating golden particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-[#D4AF37] opacity-40 animate-pulse"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              boxShadow: '0 0 8px #D4AF37',
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10">
        
        {/* Left Column: Brand Copy & Actions */}
        <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards">
          
          {/* Subtle Tagline / Kicker */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D4AF37]/25 bg-[#121214]/80 backdrop-blur-md">
            <Sparkles size={12} className="text-[#D4AF37]" />
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] font-cinzel text-[#D4AF37] font-semibold">
              MEMORARE · PERFUMES EXCLUSIVOS
            </span>
          </div>

          {/* Main Title */}
          <div className="space-y-2">
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-light text-white tracking-tight leading-[1.08]">
              A Arte da <br />
              <span className="font-serif italic font-normal text-gold-gradient">
                Fragrância
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-gray-300 text-base sm:text-lg font-light leading-relaxed max-w-xl">
            Perfumes exclusivos criados para pessoas que deixam sua marca por onde passam.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto pt-2">
            {/* Primary Button */}
            <button
              onClick={onExploreClick}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#080808] bg-[#D4AF37] hover:bg-[#E5C358] rounded-full transition-all duration-300 shadow-[0_0_25px_rgba(212,175,55,0.35)] hover:shadow-[0_0_35px_rgba(212,175,55,0.6)] hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Explorar Coleção</span>
              <ArrowDown size={14} className="ml-2.5 transition-transform duration-300 group-hover:translate-y-0.5" />
            </button>

            {/* Secondary Button */}
            <button
              onClick={onBrandClick}
              className="inline-flex items-center justify-center px-8 py-4 text-xs font-medium uppercase tracking-[0.25em] text-gray-300 hover:text-white bg-[#121214]/70 hover:bg-[#18181b] border border-[#27272a] hover:border-[#D4AF37]/50 rounded-full transition-all duration-300 backdrop-blur-sm"
            >
              <Compass size={14} className="mr-2 text-[#D4AF37]" />
              <span>Conhecer a Marca</span>
            </button>
          </div>

          {/* Minimalist Micro Badges */}
          <div className="pt-4 flex items-center gap-8 text-xs text-gray-400 font-light border-t border-[#1f1f23] w-full max-w-lg">
            <div>
              <span className="block font-cinzel text-sm sm:text-base font-semibold text-white tracking-widest">ALTA</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Fixação & Projeção</span>
            </div>
            <div className="w-[1px] h-8 bg-[#27272a]" />
            <div>
              <span className="block font-cinzel text-sm sm:text-base font-semibold text-white tracking-widest">MÁXIMA</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Fidelidade Olfativa</span>
            </div>
            <div className="w-[1px] h-8 bg-[#27272a]" />
            <div>
              <span className="block font-cinzel text-sm sm:text-base font-semibold text-white tracking-widest">PREMIUM</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Essências Nobres</span>
            </div>
          </div>
        </div>

        {/* Right Column: Premium Visual Composition */}
        <div className="lg:col-span-5 relative flex items-center justify-center py-6 sm:py-12">
          {/* Glowing Aura Behind Showcase */}
          <div 
            className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-[#D4AF37]/20 via-[#B8860B]/10 to-transparent blur-3xl pointer-events-none transition-transform duration-700 ease-out"
            style={{
              transform: `translate3d(${-mousePos.x * 0.8}px, ${-mousePos.y * 0.8}px, 0)`,
            }}
          />

          {/* Floating Luxury Composition Container */}
          <div 
            className="relative flex flex-col items-center animate-float-slow transition-transform duration-500 ease-out"
            style={{
              transform: `perspective(1000px) rotateY(${mousePos.x * 0.7}deg) rotateX(${-mousePos.y * 0.7}deg)`,
            }}
          >
            {/* Top Tag badge */}
            <div className="absolute -top-6 z-20 px-4 py-1.5 rounded-full bg-[#121214]/90 border border-[#D4AF37]/40 backdrop-blur-md shadow-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping" />
              <span className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
                L’Élixir Signé Memorare
              </span>
            </div>

            {/* Luxury Flacon Vessel Art */}
            <div className="relative w-64 sm:w-72 h-[380px] sm:h-[420px] flex flex-col items-center justify-center">
              
              {/* Heavy Faceted Crystal Stopper (Cap) */}
              <div className="relative z-10 w-24 h-20 rounded-t-md bg-gradient-to-b from-[#2a2a2e] via-[#151518] to-[#0a0a0c] border border-[#3f3f46] shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex flex-col items-center justify-between p-2">
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
                <span className="font-cinzel text-[8px] tracking-[0.3em] text-[#D4AF37]/80 uppercase">MEMORARE</span>
                <div className="w-full h-1.5 bg-gradient-to-r from-[#8C6D1F] via-[#F3E5AB] to-[#8C6D1F] rounded-xs shadow-xs" />
              </div>

              {/* Polished Gold Spray Collar */}
              <div className="w-12 h-4 bg-gradient-to-r from-[#997B20] via-[#FFF0CA] to-[#997B20] border-x border-[#59440D] relative z-0" />

              {/* Main Crystal Bottle Body */}
              <div className="relative w-56 sm:w-64 h-64 sm:h-72 rounded-b-2xl rounded-t-sm bg-gradient-to-b from-[#1c1c20]/95 via-[#101012]/95 to-[#080808] border border-[#3f3f46]/90 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col items-center justify-center p-6 overflow-hidden backdrop-blur-xl group cursor-pointer">
                
                {/* Diagonal Crystal Caustics & Reflection */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/8 to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />

                {/* Amber/Gold Internal Perfume Liquid Glow */}
                <div className="absolute bottom-3 inset-x-4 h-44 rounded-b-xl bg-gradient-to-t from-[#D4AF37]/35 via-[#997B20]/15 to-transparent blur-md pointer-events-none animate-pulse-glow" />

                {/* Iconic Luxury Front Label */}
                <div className="relative z-10 w-full max-w-[190px] py-4 px-3 border border-[#D4AF37]/45 bg-[#0a0a0c]/85 rounded-sm shadow-[0_4px_25px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col items-center text-center space-y-1">
                  <span className="font-cinzel text-[9px] uppercase tracking-[0.35em] text-[#D4AF37] font-semibold">
                    MEMORARE
                  </span>
                  <div className="w-8 h-[1px] bg-[#D4AF37]/40 my-1" />
                  <span className="font-serif text-sm tracking-wider text-white font-medium">
                    L'ÉLIXIR ROYAL
                  </span>
                  <span className="text-[8px] uppercase tracking-[0.25em] text-gray-400">
                    EXTRAIT DE PARFUM
                  </span>
                  <span className="text-[7px] text-[#D4AF37]/70 tracking-widest pt-1">
                    100 ML · 3.4 FL.OZ
                  </span>
                </div>
              </div>

              {/* Soft Pedestal Shadow & Golden Reflection */}
              <div className="w-48 h-4 rounded-full bg-black/90 blur-md mt-2" />
              <div className="w-36 h-1 rounded-full bg-[#D4AF37]/20 blur-sm" />
            </div>

            {/* Floating Editorial Note Pill */}
            <div 
              className="absolute -bottom-4 right-0 sm:-right-4 px-4 py-2 rounded-xl bg-[#121214]/90 border border-[#27272a] shadow-xl backdrop-blur-md flex items-center gap-3 transition-transform duration-500 hover:scale-105"
            >
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-semibold font-cinzel">Acordes Nobres</span>
                <span className="text-xs text-gray-200 font-serif">Bergamota · Oud · Âmbar Negro</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

