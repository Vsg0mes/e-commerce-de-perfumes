import { ArrowRight, Sparkles } from 'lucide-react';

interface CtaSectionProps {
  onShopClick: () => void;
}

export function CtaSection({ onShopClick }: CtaSectionProps) {
  return (
    <section className="relative py-28 sm:py-36 bg-[#060607] overflow-hidden select-none border-t border-[#1c1c20]">
      {/* Cinematic Golden Vignette Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D4AF37]/15 via-[#1a1812]/20 to-transparent blur-3xl opacity-75" />
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:28px_28px] opacity-10" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        
        {/* Subtle Brand Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D4AF37]/25 bg-[#121214]/80 backdrop-blur-md mb-6">
          <Sparkles size={12} className="text-[#D4AF37]" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-cinzel text-[#D4AF37] font-semibold">
            Sua Nova Assinatura Olfativa
          </span>
        </div>

        {/* Title */}
        <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-light text-white tracking-tight leading-tight mb-6">
          Descubra sua próxima <br />
          <span className="italic text-gold-gradient font-normal">
            fragrância favorita
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-gray-300 text-sm sm:text-base font-light max-w-xl mx-auto leading-relaxed mb-10">
          Deixe sua presença ser gravada na memória de quem cruzar seu caminho. Uma seleção sob medida para elevar todos os momentos.
        </p>

        {/* Action Button */}
        <div>
          <button
            onClick={onShopClick}
            className="group relative inline-flex items-center justify-center px-10 py-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#080808] bg-[#D4AF37] hover:bg-[#E5C358] rounded-full transition-all duration-300 shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_45px_rgba(212,175,55,0.7)] hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Comprar Agora</span>
            <ArrowRight size={15} className="ml-2.5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>



      </div>
    </section>
  );
}

